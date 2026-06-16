import { html, render, useState, useEffect } from "./preact.js";
import { refreshAuth, refreshNotebooks } from "./store.js";
import { Topbar } from "./components/Topbar.js";
import { Sidebar } from "./components/Sidebar.js";
import { NewResearch } from "./views/NewResearch.js";
import { Workspace } from "./views/Workspace.js";

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "nb" && parts[1]) return { view: "nb", id: parts[1], tab: (parts[2] || "sources").toLowerCase() };
  return { view: "new" };
}

function App() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener("hashchange", on);
    refreshAuth();
    refreshNotebooks();
    const t = setInterval(refreshAuth, 60000);
    return () => { removeEventListener("hashchange", on); clearInterval(t); };
  }, []);

  return html`
    <div class="shell">
      <${Topbar} />
      <div class="body">
        <${Sidebar} route=${route} />
        <main class="main">
          ${route.view === "nb"
            ? html`<${Workspace} key=${route.id} id=${route.id} tab=${route.tab} />`
            : html`<${NewResearch} />`}
        </main>
      </div>
    </div>`;
}

render(html`<${App} />`, document.getElementById("app"));
