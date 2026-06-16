import { html, useState, useEffect } from "../preact.js";
import { apiJSON } from "../api.js";

export function ShareTab({ id }) {
  const [detail, setDetail] = useState("Loading…");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(action, extra = {}) {
    setBusy(true);
    const { ok, body } = await apiJSON("/api/share", "POST", { notebook_id: id, action, topic: "research", ...extra });
    setDetail(body.detail || body.error || (ok ? "ok" : "failed"));
    setBusy(false);
  }
  useEffect(() => { act("status"); }, [id]);

  const confirmOutbound = (action, extra) => {
    if (confirm(`This shares the notebook (${action}). Continue?`)) act(action, extra);
  };

  return html`
    <div>
      <div class="row addbar wrap">
        <button class="btn" disabled=${busy} onClick=${() => act("status")}>Status</button>
        <button class="btn" disabled=${busy} onClick=${() => confirmOutbound("public")}>Make public</button>
        <button class="btn" disabled=${busy} onClick=${() => act("private")}>Make private</button>
        <button class="btn" disabled=${busy} onClick=${() => act("docs")}>Export → Docs</button>
        <button class="btn" disabled=${busy} onClick=${() => act("sheets")}>Export → Sheets</button>
      </div>
      <div class="row addbar">
        <input class="input" placeholder="collaborator@email.com" value=${email} onInput=${(e) => setEmail(e.target.value)} />
        <button class="btn" disabled=${busy || !email.trim()} onClick=${() => confirmOutbound("invite", { email: email.trim() })}>Invite</button>
      </div>
      <pre class="log">${detail}</pre>
    </div>`;
}
