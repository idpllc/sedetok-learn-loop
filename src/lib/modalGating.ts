/**
 * Centralized gating for promotional / informational modals.
 *
 * Rules:
 * 1. Each modal may be shown at most ONCE per browser session (sessionStorage).
 * 2. After being shown, it will not appear again for `weeks` weeks (localStorage timestamp).
 *
 * Components should call `canShowModal(key)` before opening, and `markModalShown(key)`
 * the moment the modal becomes visible (not on dismiss / accept).
 */

const DEFAULT_SUPPRESSION_WEEKS = 4;

const sessionKey = (key: string) => `modal_seen_session__${key}`;
const persistKey = (key: string) => `modal_last_shown__${key}`;

export const canShowModal = (key: string, weeks: number = DEFAULT_SUPPRESSION_WEEKS): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(sessionKey(key))) return false;
    const last = localStorage.getItem(persistKey(key));
    if (last) {
      const lastTs = Number(last);
      if (!Number.isNaN(lastTs)) {
        const elapsed = Date.now() - lastTs;
        const windowMs = weeks * 7 * 24 * 60 * 60 * 1000;
        if (elapsed < windowMs) return false;
      }
    }
  } catch {
    // ignore storage errors
  }
  return true;
};

export const markModalShown = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sessionKey(key), "1");
    localStorage.setItem(persistKey(key), String(Date.now()));
  } catch {
    // ignore storage errors
  }
};
