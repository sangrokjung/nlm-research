import { html, useState, useEffect } from "../preact.js";
import { api, runJob } from "../api.js";
import { ArtifactCard } from "../components/ArtifactCard.js";
import { ProgressLog } from "../components/ProgressLog.js";

const GEN = ["report", "video", "flashcards", "mindmap", "infographic", "datatable"];

export function ArtifactsTab({ id }) {
  const [arts, setArts] = useState(null);
  const [type, setType] = useState("report");
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { ok, body } = await api("/api/notebook/" + id + "/artifacts");
    setArts(ok ? (body.artifacts || []) : []);
  }
  useEffect(() => { setArts(null); load(); }, [id]);

  async function gen() {
    setBusy(true); setLines([]);
    try {
      if (type === "report")
        await runJob("analyze", { notebook_id: id, topic: "research", question: "", download: true }, (m) => setLines((l) => [...l, m]));
      else
        await runJob("media", { notebook_id: id, type, topic: "research", download: true }, (m) => setLines((l) => [...l, m]));
    } catch (e) {
      setLines((l) => [...l, "error: " + e.message]);
    }
    setBusy(false); load();
  }

  if (arts === null) return html`<div class="spinner">Loading artifacts…</div>`;
  return html`
    <div>
      <div class="row addbar">
        <select value=${type} onChange=${(e) => setType(e.target.value)}>
          ${GEN.map((t) => html`<option value=${t}>${t}</option>`)}
        </select>
        <button class="btn primary" disabled=${busy} onClick=${gen}>${busy ? "Generating…" : "Generate"}</button>
      </div>
      ${busy ? html`<${ProgressLog} lines=${lines} />` : ""}
      ${arts.length
        ? html`<div class="art-list">${arts.map((a) => html`<${ArtifactCard} a=${a} id=${id} onChange=${load} />`)}</div>`
        : html`<div class="muted pad">No artifacts yet — generate one above.</div>`}
    </div>`;
}
