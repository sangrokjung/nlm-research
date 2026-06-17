import { html, useState, useEffect } from "../preact.js";
import { api, apiJSON } from "../api.js";

// nlm doesn't return original source URLs, so: use url if present, else a
// YouTube title search (for youtube sources), else open the notebook.
function sourceHref(sc, nbId) {
  if (sc.url) return sc.url;
  if ((sc.type || "").toLowerCase().includes("youtube"))
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(sc.title || "");
  return "https://notebooklm.google.com/notebook/" + nbId;
}

// Real YouTube thumbnail only when a video URL/ID is available (nlm usually
// returns url:null), otherwise a type icon tile.
function ytThumb(url) {
  const m = /(?:youtu\.be\/|[?&]v=)([\w-]{11})/.exec(url || "");
  return m ? "https://img.youtube.com/vi/" + m[1] + "/mqdefault.jpg" : null;
}
function Thumb(sc) {
  const t = ytThumb(sc.url);
  if (t) return html`<img class="src-thumb" src=${t} alt="" loading="lazy" />`;
  const icon = (sc.type || "").toLowerCase().includes("youtube") ? "▶" : "📄";
  return html`<div class="src-thumb ph">${icon}</div>`;
}

export function SourcesTab({ id }) {
  const [sources, setSources] = useState(null);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { ok, body } = await api("/api/notebook/" + id + "/sources");
    setSources(ok ? (body.sources || []) : []);
  }
  useEffect(() => { setSources(null); load(); }, [id]);

  async function add() {
    const urls = adding.split(/\s+/).filter(Boolean);
    if (!urls.length) return;
    setBusy(true); setErr("");
    const { ok, body } = await apiJSON("/api/notebook/" + id + "/sources", "POST", { urls });
    if (!ok) setErr(body.error || body.detail || "add failed");
    setAdding(""); setBusy(false); load();
  }

  if (sources === null) return html`<div class="spinner">Loading sources…</div>`;
  return html`
    <div>
      <div class="row addbar">
        <input class="input" placeholder="Add URL / YouTube link(s), space-separated…"
               value=${adding} onInput=${(e) => setAdding(e.target.value)}
               onKeyDown=${(e) => { if (e.key === "Enter") add(); }} />
        <button class="btn primary" disabled=${busy} onClick=${add}>${busy ? "Adding…" : "+ Add"}</button>
      </div>
      ${err ? html`<div class="banner err">${err}</div>` : ""}
      ${sources.length
        ? html`<ul class="list">${sources.map((sc) => html`
            <li class="list-item">
              ${Thumb(sc)}
              <a class="grow src-link" href=${sourceHref(sc, id)} target="_blank" rel="noopener">${sc.title || sc.name || sc.id || "(source)"}</a>
              <span class="muted">${sc.type || ""}</span>
            </li>`)}</ul>`
        : html`<div class="muted pad">No sources yet.</div>`}
    </div>`;
}
