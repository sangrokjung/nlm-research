import { html } from "../preact.js";
import { useStore, toggleTheme } from "../store.js";

const PILL = {
  ok: ["pill-ok", "auth ●"],
  unverified: ["pill-unverified", "verifying…"],
  stale: ["pill-stale", "re-login (nlm login)"],
  error: ["pill-error", "auth error"],
};

export function Topbar() {
  const s = useStore();
  const [cls, label] = PILL[s.auth.state] || ["pill-unknown", "checking…"];
  return html`
    <header class="topbar">
      <a class="brand" href="#/home">/research</a>
      <div class="spacer"></div>
      <button class="icon-btn" title="Toggle light/dark" onClick=${toggleTheme}>
        ${s.theme === "dark" ? "☀" : "☾"}
      </button>
      <span class="pill ${cls}" title=${s.auth.detail || ""}>${label}</span>
    </header>`;
}
