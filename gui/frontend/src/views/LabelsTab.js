import { html, useState, useEffect } from "../preact.js";
import { api, apiJSON } from "../api.js";

export function LabelsTab({ id }) {
  const [labels, setLabels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const { ok, body } = await api("/api/notebook/" + id + "/labels");
    if (ok) setLabels(body.labels || []); else { setLabels([]); setErr(body.error || body.detail || "failed"); }
  }
  useEffect(() => { setLabels(null); load(); }, [id]);

  async function autoLabel() {
    setBusy(true); setErr("");
    const { ok, body } = await apiJSON("/api/organize", "POST", { notebook_id: id, action: "auto" });
    if (ok) setLabels(body.labels || []); else setErr(body.error || body.detail || "auto-label failed");
    setBusy(false);
  }

  if (labels === null) return html`<div class="spinner">Loading labels…</div>`;
  return html`
    <div>
      <div class="row addbar">
        <button class="btn primary" disabled=${busy} onClick=${autoLabel}>${busy ? "Labeling…" : "Auto-label"}</button>
        <button class="btn" onClick=${load}>Refresh</button>
        <span class="muted">AI groups sources into themes (needs 5+ sources).</span>
      </div>
      ${err ? html`<div class="banner err">${err}</div>` : ""}
      ${labels.length
        ? html`<div class="chips">${labels.map((l) => {
            const name = l.name || l.title || l.label || "(label)";
            const count = l.source_count ?? (Array.isArray(l.source_ids) ? l.source_ids.length : undefined);
            return html`<span class="chip">${l.emoji || "🏷"} ${name}${count !== undefined ? html` <em>${count}</em>` : ""}</span>`;
          })}</div>`
        : html`<div class="muted pad">No labels yet.</div>`}
    </div>`;
}
