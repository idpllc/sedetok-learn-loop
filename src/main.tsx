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

// Keep installability/push support, but remove all SW caching so new routes are never hidden by stale shells.
if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .finally(clearBrowserCaches)
      .catch(() => {});
  } else {
    clearBrowserCaches();
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update().catch(() => {}))
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
