import { html, useState } from "../preact.js";
import { runJob } from "../api.js";
import { refreshNotebooks } from "../store.js";
import { ProgressLog } from "../components/ProgressLog.js";

const PRESETS = ["default", "trend-report", "study-pack", "explainer", "visual-report"];
const NOTE = {
  "default": "report + Q&A",
  "trend-report": "report + Q&A (newest-first search)",
  "study-pack": "report + flashcards + mind map",
  "explainer": "report + video overview",
  "visual-report": "report + infographic + mind map + data table",
};

export function NewResearch() {
  const [topic, setTopic] = useState("");
  const [preset, setPreset] = useState("default");
  const [count, setCount] = useState(5);
  const [lang, setLang] = useState("en");
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    if (!topic.trim()) { setErr("Enter a topic."); return; }
    setErr(""); setBusy(true); setLines([]);
    try {
      const res = await runJob(
        "run",
        { topic: topic.trim(), preset, count: Number(count) || 5, language: lang.trim() || "en" },
        (msg) => setLines((l) => [...l, msg])
      );
      await refreshNotebooks();
      location.hash = "#/nb/" + res.notebook_id + "/sources";
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return html`
    <div class="view">
      <h1>New research</h1>
      <p class="sub">One run: search → collect → analyze → preset artifacts. Streams live progress.</p>
      <div class="card">
        <input class="input" placeholder="Research topic, e.g. AI agent trends 2026"
               value=${topic} onInput=${(e) => setTopic(e.target.value)}
               onKeyDown=${(e) => { if (e.key === "Enter") run(); }} />
        <div class="row">
          <label>Preset
            <select value=${preset} onChange=${(e) => setPreset(e.target.value)}>
              ${PRESETS.map((p) => html`<option value=${p}>${p}</option>`)}
            </select>
          </label>
          <label>Videos <input class="input sm" type="number" min="1" max="20" value=${count} onInput=${(e) => setCount(e.target.value)} /></label>
          <label>Lang <input class="input sm" value=${lang} onInput=${(e) => setLang(e.target.value)} /></label>
        </div>
        <div class="muted">${NOTE[preset]}</div>
        <button class="btn primary" disabled=${busy} onClick=${run}>${busy ? "Running…" : "Run pipeline"}</button>
      </div>
      ${err ? html`<div class="banner err">${err}</div>` : ""}
      <${ProgressLog} lines=${lines} />
    </div>`;
}
