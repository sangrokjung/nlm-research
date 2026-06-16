import { html } from "../preact.js";

// Renders streamed progress lines. Pass an array of strings.
export function ProgressLog({ lines }) {
  if (!lines || !lines.length) return null;
  return html`<pre class="log">${lines.join("\n")}</pre>`;
}
