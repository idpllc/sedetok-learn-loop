const KEY = "sedefy_return_origin";

const toOrigin = (value: string): string | null => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.origin;
  } catch {
    return null;
  }
};

/**
 * Remembers the school website the visitor came from so payments can send
 * them back there. Reads ?return= / ?origin= first, then the referrer.
 */
export const captureReturnOrigin = () => {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("return") || params.get("return_origin") || params.get("origin");
    if (explicit) {
      const origin = toOrigin(explicit);
      if (origin) {
        sessionStorage.setItem(KEY, origin);
        return;
      }
    }
    if (sessionStorage.getItem(KEY)) return;
    if (document.referrer) {
      const origin = toOrigin(document.referrer);
      if (origin && origin !== window.location.origin) {
        sessionStorage.setItem(KEY, origin);
      }
    }
  } catch {
    /* sessionStorage unavailable */
  }
};

/** Origin to return to after checkout (falls back to the current site). */
export const getReturnOrigin = (): string => {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(KEY) || window.location.origin;
  } catch {
    return window.location.origin;
  }
};
