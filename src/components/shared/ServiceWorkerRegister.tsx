"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        console.log("✅ Service Worker enregistré :", reg.scope);
      } catch (err) {
        console.error("❌ Erreur Service Worker :", err);
      }
    };

    window.addEventListener("load", registerSW);
    return () => window.removeEventListener("load", registerSW);
  }, []);

  return null;
}