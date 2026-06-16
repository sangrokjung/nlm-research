// Tiny observable store + a hook. Avoids @preact/signals (which risks a second
// Preact instance over a CDN); a Set of listeners + useState re-render is enough.
import { useState, useEffect } from "./preact.js";
import { api } from "./api.js";

export const state = {
  auth: { state: "unknown", detail: "" },
  notebooks: [],
  theme: document.documentElement.dataset.theme || "light",
};

const listeners = new Set();

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn());
}

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return state;
}

// --- actions ---------------------------------------------------------------

let authTimer = null;

export async function refreshAuth() {
  const { ok, body } = await api("/api/auth");
  const st = (ok && body.state) || "error";
  setState({ auth: { state: st, detail: body.detail || "" } });
  clearTimeout(authTimer);
  if (st === "unverified") authTimer = setTimeout(refreshAuth, 8000);
}

export async function refreshNotebooks() {
  const { ok, body } = await api("/api/notebooks");
  if (ok) setState({ notebooks: body.notebooks || [] });
}

export function toggleTheme() {
  const next = state.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  setState({ theme: next });
}

export const nbId = (n) => n.id || n.notebook_id || n.notebookId || "";
