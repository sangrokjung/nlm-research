import { html } from "../preact.js";
import { useStore, nbId } from "../store.js";

export function Sidebar({ route }) {
  const s = useStore();
  const activeId = route.view === "nb" ? route.id : null;
  const notebooks = s.notebooks || [];
  return html`
    <aside class="sidebar">
      <a class="btn-new ${route.view === "new" ? "active" : ""}" href="#/new">+ New research</a>
      <a class="nb-item home-link ${route.view === "home" ? "active" : ""}" href="#/home">🏠 Dashboard</a>
      <div class="side-label">Notebooks</div>
      <nav class="nb-list">
        ${notebooks.map((n) => {
          const id = nbId(n);
          return html`
            <a class="nb-item ${id === activeId ? "active" : ""}" href=${"#/nb/" + id + "/sources"} title=${n.title || id}>
              <div class="nb-title">${n.title || n.name || "(untitled)"}</div>
              <div class="nb-sub">${n.source_count ?? "?"} sources</div>
            </a>`;
        })}
        ${notebooks.length === 0 ? html`<div class="muted pad">No notebooks yet.<br/>Start a new research.</div>` : ""}
      </nav>
    </aside>`;
}
