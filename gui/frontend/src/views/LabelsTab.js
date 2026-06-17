import { html, useState, useEffect } from "../preact.js";
import { api, apiJSON } from "../api.js";

export function LabelsTab({ id }) {
  const [labels, setLabels] = useState(null);
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function loadAll() {
    setErr("");
    const [l, sc] = await Promise.all([
      api("/api/notebook/" + id + "/labels"),
      api("/api/notebook/" + id + "/sources"),
    ]);
    setLabels(l.ok ? (l.body.labels || []) : []);
    if (!l.ok) setErr(l.body.error || l.body.detail || "failed to load labels");
    setSources(sc.ok ? (sc.body.sources || []) : []);
  }
  useEffect(() => { setLabels(null); loadAll(); }, [id]);

  async function autoLabel() {
    setBusy(true); setErr(""); setMsg("");
    const r = await apiJSON("/api/organize", "POST", { notebook_id: id, action: "auto" });
    if (r.ok) await loadAll(); else setErr(r.body.error || r.body.detail || "auto-label failed");
    setBusy(false);
  }

  async function move(sourceId, labelId) {
    setMsg("Assigning…");
    const r = await apiJSON("/api/organize", "POST", { notebook_id: id, action: "move", source_id: sourceId, label_id: labelId });
    setMsg(r.ok ? "Assigned ✓" : "Move failed: " + (r.body.error || r.body.detail || ""));
    loadAll();
  }

  const titleOf = (sid) => { const s = sources.find((x) => x.id === sid); return s ? (s.title || s.id) : sid; };

  if (labels === null) return html`<div class="spinner">Loading labels…</div>`;
  return html`
    <div>
      <div class="row addbar">
        <button class="btn primary" disabled=${busy} onClick=${autoLabel}>${busy ? "Labeling…" : "Auto-label"}</button>
        <button class="btn" onClick=${loadAll}>Refresh</button>
        <span class="muted">Drag a source onto a label to assign it. ${msg}</span>
      </div>
      ${err ? html`<div class="banner err">${err}</div>` : ""}
      ${labels.length === 0
        ? html`<div class="muted pad">No labels yet — Auto-label needs 5+ sources.</div>`
        : html`<div class="label-board">
            <div class="lb-col">
              <h2>Sources</h2>
              ${sources.map((s) => html`
                <div class="src-chip" draggable=${true}
                     onDragStart=${(e) => e.dataTransfer.setData("text/plain", s.id)}>
                  ▶ ${s.title || s.id}
                </div>`)}
              ${sources.length === 0 ? html`<div class="muted">No sources.</div>` : ""}
            </div>
            <div class="lb-col">
              <h2>Labels</h2>
              ${labels.map((l) => {
                const members = (l.source_ids || []).map(titleOf);
                return html`
                  <div class="label-drop"
                       onDragOver=${(e) => { e.preventDefault(); e.currentTarget.classList.add("over"); }}
                       onDragLeave=${(e) => e.currentTarget.classList.remove("over")}
                       onDrop=${(e) => {
                         e.preventDefault();
                         e.currentTarget.classList.remove("over");
                         const sid = e.dataTransfer.getData("text/plain");
                         if (sid && l.id) move(sid, l.id);
                       }}>
                    <div class="label-name">${l.emoji || "🏷"} ${l.name || l.title || "(label)"} <em>${members.length}</em></div>
                    <div class="label-members">${members.map((t) => html`<span class="mini">${t}</span>`)}</div>
                  </div>`;
              })}
            </div>
          </div>`}
    </div>`;
}
