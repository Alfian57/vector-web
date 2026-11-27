"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    const script = process.env.NODE_ENV === "development" ? "/sw-dev.js" : "/sw.js";
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register(script).catch(() => {});
  }, []);

  return null;
}
