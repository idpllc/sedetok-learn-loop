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

// Remove previously shipped PWA service workers/caches so installed apps always load the latest routes.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.update().catch(() => {})))
    .catch(() => {});
}

const root = createRoot(document.getElementById("root")!);
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
root.render(app);
