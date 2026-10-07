import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { Operation, OperationResult } from "./operation";

interface Callbacks<O> {
  onSuccess?: (result: { data: O }) => void;
  onError?: (result: { error: Omit<OperationResult<O>, "data"> }) => void;
}

/** Mutation via a router action; the router cancels stale responses and revalidates the loaders. */
export function useOperation<I, O>(command: Operation<I, O>, callbacks: Callbacks<O> = {}) {
  const fetcher = useFetcher<OperationResult<O>>();
  const { submit } = fetcher;
  const callbacksRef = useRef(callbacks);
  const pending = useRef<((result: OperationResult<O>) => void) | undefined>(undefined);
  const previous = useRef(fetcher.data);
  const [input, setInput] = useState<I>();
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    if (fetcher.state === "submitting" || !fetcher.data || fetcher.data === previous.current)
      return;
    previous.current = fetcher.data;
    pending.current?.(fetcher.data);
    pending.current = undefined;
    if (fetcher.data.data !== undefined)
      callbacksRef.current.onSuccess?.({ data: fetcher.data.data });
    else callbacksRef.current.onError?.({ error: fetcher.data });
  }, [fetcher.state, fetcher.data]);
  const executeAsync = useCallback(
    (...args: undefined extends I ? [input?: I] : [input: I]) => {
      pending.current?.({ serverError: "Solicitação substituída." });
      setInput(args[0]);
      const promise = new Promise<OperationResult<O>>((resolve) => {
        pending.current = resolve;
      });
      const payload = JSON.stringify({ input: args[0] });
      if (command.method === "get") {
        void submit({ payload }, { action: command.url, method: "get" });
      } else {
        void submit(payload, {
          action: command.url,
          method: "post",
          encType: "application/json",
        });
      }
      return promise;
    },
    [command.url, command.method, submit],
  );
  const execute = useCallback(
    (...args: undefined extends I ? [input?: I] : [input: I]) => {
      void executeAsync(...args);
    },
    [executeAsync],
  );
  return {
    execute,
    executeAsync,
    input,
    result: fetcher.data ?? {},
    isPending: fetcher.state !== "idle",
  };
}
