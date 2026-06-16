import { html } from "../preact.js";

export function Tabs({ tabs, active, base }) {
  return html`
    <div class="tabs">
      ${tabs.map((t) => {
        const key = t.toLowerCase();
        return html`<a class="tab ${key === active ? "active" : ""}" href=${base + key}>${t}</a>`;
      })}
    </div>`;
}
