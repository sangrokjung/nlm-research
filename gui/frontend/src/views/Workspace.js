import { html } from "../preact.js";
import { useStore, nbId } from "../store.js";
import { Tabs } from "../components/Tabs.js";
import { SourcesTab } from "./SourcesTab.js";
import { ArtifactsTab } from "./ArtifactsTab.js";
import { LabelsTab } from "./LabelsTab.js";
import { ShareTab } from "./ShareTab.js";

const TABS = ["Sources", "Artifacts", "Labels", "Share"];
const BODIES = { sources: SourcesTab, artifacts: ArtifactsTab, labels: LabelsTab, share: ShareTab };

export function Workspace({ id, tab }) {
  const s = useStore();
  const nb = (s.notebooks || []).find((n) => nbId(n) === id);
  const active = BODIES[tab] ? tab : "sources";
  const Body = BODIES[active];
  return html`
    <div class="view">
      <div class="ws-head">
        <h1>${nb ? (nb.title || nb.name || id) : id}</h1>
        <div class="muted mono">${id}</div>
      </div>
      <${Tabs} tabs=${TABS} active=${active} base=${"#/nb/" + id + "/"} />
      <div class="tab-body">
        <${Body} id=${id} />
      </div>
    </div>`;
}
