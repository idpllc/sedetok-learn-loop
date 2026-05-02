import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Microsoft Clarity (script tag injection to avoid React duplication)
(function(c: any, l: Document, a: string, r: string, i: string) {
  c[a] = c[a] || function (...args: any[]) { (c[a].q = c[a].q || []).push(args); };
  const t = l.createElement(r) as HTMLScriptElement;
  t.async = true;
  t.src = "https://www.clarity.ms/tag/" + i;
  const y = l.getElementsByTagName(r)[0];
  y.parentNode?.insertBefore(t, y);
})(window, document, "clarity", "script", "wdsodbxujo");

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const clearBrowserCaches = () => {
  if (!("caches" in window)) return;
  caches.keys()
    .then((names) => Promise.all(names.map((name) => caches.delete(name))))
    .catch(() => {});
};

// If a stale Service Worker is controlling this page, it can intercept dynamic
// imports and break the app. Detect that case, fully clean up, and reload once.
const RELOAD_FLAG = "__sw_cleanup_reload__";

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .then(() => clearBrowserCaches())
      .then(() => {
        if (hadController && !sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      })
      .catch(() => {});
  } else {
    const hadController = !!navigator.serviceWorker.controller;
    clearBrowserCaches();
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update().catch(() => {}))
      .then(() => {
        if (hadController && !sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      })
      .catch(() => {});
  }
}

const root = createRoot(document.getElementById("root")!);
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
root.render(app);
