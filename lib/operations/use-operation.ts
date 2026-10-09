import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { Operation, OperationResult } from "./operation";
import { runAndReport } from "@/lib/telemetry.client";

interface Callbacks<O> {
  onSuccess?: (result: { data: O }) => void;
  onError?: (result: { error: Omit<OperationResult<O>, "data"> }) => void;
}

/** Mutation via a router action; the router cancels stale responses and revalidates the loaders. */
export function useOperation<I, O>(command: Operation<I, O>, callbacks: Callbacks<O> = {}) {
  const fetcher = useFetcher<OperationResult<O>>();
  const { submit } = fetcher;
  const callbacksRef = useRef(callbacks);
  const previous = useRef(fetcher.data);
  const [input, setInput] = useState<I>();
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    if (fetcher.state === "submitting" || !fetcher.data || fetcher.data === previous.current)
      return;
    previous.current = fetcher.data;
    if (fetcher.data.data !== undefined) {
      callbacksRef.current.onSuccess?.({ data: fetcher.data.data });
      return;
    }
    callbacksRef.current.onError?.({ error: fetcher.data });
  }, [fetcher.state, fetcher.data]);
  const execute = useCallback(
    (...args: undefined extends I ? [input?: I] : [input: I]) => {
      setInput(args[0]);
      const payload = JSON.stringify({ input: args[0] });
      if (command.method === "get") {
        void runAndReport(() => submit({ payload }, { action: command.url, method: "get" }));
        return;
      }
      void runAndReport(() =>
        submit(payload, {
          action: command.url,
          method: "post",
          encType: "application/json",
        }),
      );
    },
    [command.url, command.method, submit],
  );
  return {
    execute,
    input,
    result: fetcher.data ?? {},
    isPending: fetcher.state !== "idle",
  };
}
