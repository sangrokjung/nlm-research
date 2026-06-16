import { html, useState } from "../preact.js";
import { runJob } from "../api.js";

// studio artifact type -> media job type (for Retry)
const MEDIA_OF = {
  video: "video", flashcards: "flashcards", mind_map: "mindmap",
  infographic: "infographic", data_table: "datatable",
};

export function ArtifactCard({ a, id, onChange }) {
  const [status, setStatus] = useState(a.status || "?");
  const [busy, setBusy] = useState(false);
  const type = a.type || "artifact";

  async function retry() {
    setBusy(true);
    try {
      let m;
      if (type === "report") m = await runJob("analyze", { notebook_id: id, topic: "research", question: "", download: true });
      else m = await runJob("media", { notebook_id: id, type: MEDIA_OF[type] || type, topic: "research", download: true });
      setStatus(m.artifact_status || (m.report_ok || m.create_ok ? "completed" : "failed"));
      onChange && onChange();
    } catch (e) {
      setStatus("failed");
    }
    setBusy(false);
  }

  const ok = status === "completed";
  return html`
    <div class="card art">
      <div class="art-type">${type}</div>
      <span class="badge ${ok ? "ok" : "warn"}">${busy ? "working…" : status}</span>
      ${!ok ? html`<button class="btn sm" disabled=${busy} onClick=${retry}>Retry</button>` : ""}
    </div>`;
}
