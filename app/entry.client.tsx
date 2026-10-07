import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { reportBrowserError } from "@/lib/telemetry.client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter onError={reportBrowserError} />
    </StrictMode>,
    {
      onRecoverableError: reportBrowserError,
    },
  );
});
