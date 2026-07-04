"use client";

import { useEffect } from "react";

const RELOAD_KEY = "hs-chunk-reload";

function isChunkLoadError(message: string) {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module")
  );
}

/** Auto-reload once when stale dev chunks fail to load after HMR/cache changes. */
export function ChunkErrorHandler() {
  useEffect(() => {
    const tryReload = (message: string) => {
      if (!isChunkLoadError(message)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      tryReload(event.message ?? "");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      tryReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    sessionStorage.removeItem(RELOAD_KEY);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
