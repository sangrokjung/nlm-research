import { html, useState } from "../preact.js";
import { runJob } from "../api.js";

// studio artifact type -> media job type (for Retry)
const MEDIA_OF = {
  video: "video", flashcards: "flashcards", mind_map: "mindmap",
  infographic: "infographic", data_table: "datatable",
};
// types we can stream back to the browser
const DOWNLOADABLE = new Set(["report", "video", "audio", "flashcards", "mind_map", "infographic", "data_table", "quiz", "slide_deck", "slides"]);

export function ArtifactCard({ a, id, onChange }) {
  const [status, setStatus] = useState(a.status || "?");
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [pvBusy, setPvBusy] = useState(false);
  const [pv, setPv] = useState(null); // {kind:'image'|'text', url|txt}
  const [err, setErr] = useState("");
  const type = a.type || "artifact";

  async function preview() {
    if (pv) { if (pv.url) URL.revokeObjectURL(pv.url); setPv(null); return; } // toggle off
    setPvBusy(true); setErr("");
    try {
      const res = await fetch("/api/notebook/" + id + "/download/" + type);
      if (!res.ok) {
        let b = {}; try { b = await res.json(); } catch {}
        throw new Error(b.detail || b.error || ("preview failed (HTTP " + res.status + ")"));
      }
      const ct = res.headers.get("Content-Type") || "";
      if (ct.startsWith("image/")) {
        setPv({ kind: "image", url: URL.createObjectURL(await res.blob()) });
      } else {
        let txt = await res.text();
        if (txt.length > 8000) txt = txt.slice(0, 8000) + "\n…(truncated)";
        setPv({ kind: "text", txt });
      }
    } catch (e) {
      setErr(e.message);
    }
    setPvBusy(false);
  }

  async function retry() {
    setBusy(true); setErr("");
    try {
      let m;
      if (type === "report") m = await runJob("analyze", { notebook_id: id, topic: "research", question: "", download: true });
      else m = await runJob("media", { notebook_id: id, type: MEDIA_OF[type] || type, topic: "research", download: true });
      setStatus(m.artifact_status || (m.report_ok || m.create_ok ? "completed" : "failed"));
      onChange && onChange();
    } catch (e) {
      setStatus("failed"); setErr(e.message);
    }
    setBusy(false);
  }

  async function download() {
    setDlBusy(true); setErr("");
    try {
      const res = await fetch("/api/notebook/" + id + "/download/" + type);
      if (!res.ok) {
        let b = {}; try { b = await res.json(); } catch {}
        throw new Error(b.detail || b.error || ("download failed (HTTP " + res.status + ")"));
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = /filename="?([^"]+)"?/.exec(cd);
      const name = m ? m[1] : type + ".bin";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message);
    }
    setDlBusy(false);
  }

  const ok = status === "completed";
  return html`
    <div class="card art">
      <div class="art-row">
        <div class="art-type">${type}</div>
        <span class="badge ${ok ? "ok" : "warn"}">${busy ? "working…" : status}</span>
        ${ok && DOWNLOADABLE.has(type)
          ? html`<button class="btn sm" disabled=${pvBusy} onClick=${preview}>${pvBusy ? "…" : pv ? "Hide" : "Preview"}</button>`
          : ""}
        ${ok && DOWNLOADABLE.has(type)
          ? html`<button class="btn sm" disabled=${dlBusy} onClick=${download}>${dlBusy ? "…" : "Download"}</button>`
          : ""}
        ${!ok ? html`<button class="btn sm" disabled=${busy} onClick=${retry}>Retry</button>` : ""}
      </div>
      ${err ? html`<div class="art-err">${err}</div>` : ""}
      ${pv ? html`<div class="art-preview">
        ${pv.kind === "image"
          ? html`<img src=${pv.url} alt="preview" />`
          : html`<pre>${pv.txt}</pre>`}
      </div>` : ""}
    </div>`;
}
