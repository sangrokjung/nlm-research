import { html } from "../preact.js";
import { useStore, nbId } from "../store.js";

const NB_URL = (id) => "https://notebooklm.google.com/notebook/" + id;

export function Dashboard() {
  const s = useStore();
  const nbs = s.notebooks || [];
  const totalSources = nbs.reduce((a, n) => a + (Number(n.source_count) || 0), 0);

  return html`
    <div class="view">
      <div class="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p class="sub">${nbs.length} notebook${nbs.length === 1 ? "" : "s"} · ${totalSources} sources total</p>
        </div>
        <a class="btn primary" href="#/new">+ New research</a>
      </div>
      ${nbs.length
        ? html`<div class="dash-grid">
            ${nbs.map((n) => {
              const id = nbId(n);
              return html`
                <div class="card nb-card">
                  <div class="nb-card-title" title=${n.title || id}>${n.title || n.name || "(untitled)"}</div>
                  <div class="muted">${n.source_count ?? "?"} sources</div>
                  <div class="row" style="margin-top:auto">
                    <a class="btn sm" href=${"#/nb/" + id + "/sources"}>Open</a>
                    <a class="btn sm" href=${NB_URL(id)} target="_blank" rel="noopener">NotebookLM ↗</a>
                  </div>
                </div>`;
            })}
          </div>`
        : html`<div class="card">
            <p class="muted">No notebooks yet.</p>
            <a class="btn primary" href="#/new">Start your first research</a>
          </div>`}
    </div>`;
}
