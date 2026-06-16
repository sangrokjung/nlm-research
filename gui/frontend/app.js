// Research GUI front-end. No build step — plain ES modules-free JS.
// Pages mirror the /research subcommands (ADR-0012). Search + Dashboard are
// wired to the backend; the rest are placeholders showing the planned command.

const PAGES = [
  "Run", "Search", "Collect", "Analyze", "Media", "Organize", "Share", "Dashboard",
];

const state = {
  page: "Run",
  lastResults: [],
  lastQuery: "",
  selectedUrls: [],
  topic: "",
  notebookId: "",
};

// --- tiny helpers ----------------------------------------------------------
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids) node.append(kid?.nodeType ? kid : document.createTextNode(kid ?? ""));
  return node;
};

async function api(path, opts) {
  const res = await fetch(path, opts);
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { ok: res.ok, status: res.status, body };
}

// Start a streaming job (POST to start, EventSource for progress). Resolves with
// the final result; calls onProgress(msg) for each progress event.
function runJob(stage, payload, onProgress) {
  return new Promise(async (resolve, reject) => {
    const { ok, body } = await api("/api/jobs/" + stage, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!ok || !body.job_id) { reject(new Error(body.error || body.detail || "could not start job")); return; }
    const es = new EventSource("/api/jobs/" + body.job_id + "/stream");
    es.onmessage = (e) => {
      let ev; try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === "done") { es.close(); resolve(ev.result); }
      else if (ev.type === "error") { es.close(); reject(new Error(ev.error || "job failed")); }
      else if (ev.type === "progress" && ev.msg) onProgress(ev.msg);
    };
    es.onerror = () => { es.close(); reject(new Error("progress stream interrupted")); };
  });
}

// A live progress log: returns { box, push(msg) }.
function progressLog() {
  const box = el("div", { class: "banner info", style: "white-space:pre-wrap" }, "Starting…");
  const lines = [];
  return { box, push: (msg) => { lines.push(msg); box.textContent = lines.join("\n"); } };
}

// One artifact row with a per-artifact Retry (Tier-2 degrade): retry re-runs the
// media job for just that type against the same notebook and updates the row.
function mediaRow(a, notebookId, topic) {
  const status = el("div", { class: "meta" }, `${a.status || "?"}${a.downloaded ? " · saved" : ""}`);
  const right = el("div", { class: "row" }, status);
  const row = el("div", { class: "result" }, el("span", {}, "•"), el("div", { class: "title" }, a.type), right);
  if (!(a.status === "completed" && a.downloaded)) {
    const rb = el("button", { class: "primary" }, "Retry");
    rb.addEventListener("click", async () => {
      rb.disabled = true;
      try {
        const m = await runJob("media", { notebook_id: notebookId, type: a.type, topic, download: true }, (msg) => { status.textContent = msg; });
        const st = m.artifact_status || (m.create_ok ? "started" : "failed");
        status.textContent = `${st}${m.downloaded ? " · saved" : ""}`;
        if (st === "completed" && m.downloaded) rb.remove();
      } catch (e) {
        status.textContent = "failed: " + e.message;
      }
      rb.disabled = false;
    });
    right.append(rb);
  }
  return row;
}

const fmtViews = (v) => {
  if (typeof v !== "number") return v ?? "";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
};
const fmtDate = (d) => (d && d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}` : (d || ""));

// --- chrome ----------------------------------------------------------------
function renderNav() {
  const nav = document.getElementById("nav");
  nav.replaceChildren(
    ...PAGES.map((p) =>
      el("button", { class: p === state.page ? "active" : "", onclick: () => go(p) }, p))
  );
}

let authRetryTimer = null;
const AUTH_PILL = {
  ok: "auth ●",
  unverified: "verifying…",
  stale: "re-login (nlm login)",
  error: "auth error",
};

async function refreshAuth() {
  const pill = document.getElementById("auth-pill");
  const { ok, body } = await api("/api/auth");
  const st = (ok && body.state) || "error";
  pill.className = "pill pill-" + (AUTH_PILL[st] ? st : "error");
  pill.textContent = AUTH_PILL[st] || "auth error";
  pill.title = body.detail || "";
  // Transient failure: re-check soon instead of waiting for the 60s interval.
  clearTimeout(authRetryTimer);
  if (st === "unverified") authRetryTimer = setTimeout(refreshAuth, 8000);
}

function go(page) {
  state.page = page;
  renderNav();
  const view = document.getElementById("view");
  view.replaceChildren((PAGE_RENDERERS[page] || placeholder)(page));
}

// --- pages -----------------------------------------------------------------
function runPage() {
  const wrap = el("div", { class: "card" });
  const topic = el("input", { type: "text", placeholder: "Research topic, e.g. AI agent trends 2026", value: state.topic || state.lastQuery || "" });
  const preset = el("select", {}, ...["default", "trend-report", "study-pack", "explainer", "visual-report"].map((p) => el("option", { value: p }, p)));
  const count = el("input", { type: "number", value: "5", min: "1", max: "20", style: "width:70px" });
  const lang = el("input", { type: "text", value: "en", style: "width:70px" });
  const out = el("div", {});

  const PRESET_NOTE = {
    "default": "report + Q&A",
    "trend-report": "report + Q&A (newest-first search)",
    "study-pack": "report + flashcards + mind map",
    "explainer": "report + video overview",
    "visual-report": "report + infographic + mind map + data table",
  };
  const note = el("div", { class: "muted" }, PRESET_NOTE["default"]);
  preset.addEventListener("change", () => { note.textContent = PRESET_NOTE[preset.value] || ""; });

  const btn = el("button", { class: "primary" }, "Run pipeline");
  btn.addEventListener("click", async () => {
    const t = topic.value.trim();
    if (!t) { out.replaceChildren(el("div", { class: "banner err" }, "Enter a topic.")); return; }
    state.topic = t; state.lastQuery = t;
    btn.disabled = true;
    const log = progressLog();
    out.replaceChildren(log.box);
    let body;
    try {
      body = await runJob("run", { topic: t, preset: preset.value, count: Number(count.value) || 5, language: lang.value.trim() || "en" }, log.push);
    } catch (e) {
      out.replaceChildren(el("div", { class: "banner err" }, e.message));
      btn.disabled = false; return;
    }
    btn.disabled = false;
    state.notebookId = body.notebook_id;
    const kids = [el("div", { class: "banner info" },
      `Notebook ${body.notebook_id} · ${body.source_count ?? "?"} sources · report: ${body.report_status || "?"}${body.report_downloaded ? " (saved)" : ""}`)];
    if (body.artifacts && body.artifacts.length) {
      const list = el("div", { class: "results" });
      body.artifacts.forEach((a) => list.append(mediaRow(a, body.notebook_id, t)));
      kids.push(el("h2", { style: "margin-top:14px" }, "Artifacts"), list);
    }
    if (body.answer) kids.push(el("div", { class: "card" }, el("h2", {}, "Q&A"), el("div", { html: body.answer.replace(/\n/g, "<br>") })));
    kids.push(el("button", { class: "primary", onclick: () => go("Dashboard") }, "Open Dashboard"));
    out.replaceChildren(...kids);
  });

  wrap.append(
    el("h1", {}, "Run pipeline"),
    el("p", { class: "sub" }, "One click: search → collect → analyze → preset artifacts. Streams live progress."),
    el("div", { class: "row" }, topic),
    el("div", { class: "row" },
      el("label", {}, "Preset"), preset,
      el("label", {}, "Videos"), count,
      el("label", {}, "Lang"), lang),
    note,
    el("div", { class: "row", style: "margin-top:12px" }, btn),
    out,
  );
  return wrap;
}

function searchPage() {
  const wrap = el("div", { class: "card" });
  const input = el("input", { type: "text", placeholder: "Research topic, e.g. AI agent trends 2026" });
  const num = el("input", { type: "number", value: "10", min: "1", max: "50", style: "width:70px" });
  const newest = el("input", { type: "checkbox" });
  const btn = el("button", { class: "primary" }, "Search");
  const out = el("div", { class: "results" });

  const run = async () => {
    const q = input.value.trim();
    if (!q) return;
    state.lastQuery = q;
    btn.disabled = true;
    out.replaceChildren(el("div", { class: "spinner" }, "Searching YouTube…"));
    const { ok, body } = await api("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, num: Number(num.value) || 10, newest_first: newest.checked }),
    });
    btn.disabled = false;
    if (!ok) { out.replaceChildren(el("div", { class: "banner err" }, body.error || body.detail || "Search failed")); return; }
    state.lastResults = body.results || [];
    renderResults(out);
  };
  btn.addEventListener("click", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });

  wrap.append(
    el("h1", {}, "Search"),
    el("p", { class: "sub" }, "Find source videos. Pick the ones to add to a NotebookLM notebook."),
    el("div", { class: "row" },
      input,
      el("label", { class: "row" }, "results", num),
      el("label", { class: "row" }, newest, "newest first"),
      btn),
    out,
  );
  return wrap;
}

function renderResults(out) {
  const rows = state.lastResults;
  if (!rows.length) { out.replaceChildren(el("div", { class: "banner info" }, "No results.")); return; }
  const list = el("div", { class: "results" });
  rows.forEach((r, i) => {
    list.append(el("div", { class: "result" },
      el("input", { type: "checkbox", checked: i < 5 ? "checked" : null, "data-url": r.url }),
      el("div", {},
        el("div", { class: "title" }, r.title || "(untitled)"),
        el("div", { class: "meta" }, `${r.channel || ""} · ${fmtViews(r.views)} views · ${fmtDate(r.upload_date)}`)),
      el("a", { href: r.url, target: "_blank" }, "open")));
  });
  const collect = el("button", { class: "primary", onclick: () => {
    const checks = [...out.querySelectorAll('input[type="checkbox"][data-url]')];
    state.selectedUrls = checks.filter((c) => c.checked).map((c) => c.getAttribute("data-url"));
    state.topic = state.lastQuery;
    go("Collect");
  } }, "Add selected → Collect");
  out.replaceChildren(
    el("div", { class: "row", style: "justify-content:space-between;margin-bottom:6px" },
      el("h2", {}, `${rows.length} results`), collect),
    list);
}

function dashboardPage() {
  const wrap = el("div", { class: "card" });
  wrap.append(el("h1", {}, "Dashboard"), el("p", { class: "sub" }, "Your NotebookLM notebooks."));
  const body = el("div", {}, el("div", { class: "spinner" }, "Loading notebooks…"));
  wrap.append(body);
  api("/api/notebooks").then(({ ok, body: data }) => {
    if (!ok) { body.replaceChildren(el("div", { class: "banner err" }, data.error || "Could not load notebooks (check auth).")); return; }
    const nbs = data.notebooks || [];
    if (!nbs.length) { body.replaceChildren(el("div", { class: "banner info" }, "No notebooks yet. Start from Search.")); return; }
    const table = el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Title"), el("th", {}, "ID"))));
    const tb = el("tbody", {});
    nbs.forEach((n) => {
      const id = n.id || n.notebook_id || n.notebookId || "";
      const title = n.title || n.name || "(untitled)";
      tb.append(el("tr", {}, el("td", {}, title), el("td", {}, el("code", {}, String(id)))));
    });
    table.append(tb);
    body.replaceChildren(table);
  });
  return wrap;
}

// A <select> of notebooks plus a "new notebook" option, populated async.
function notebookSelect(includeNew = true) {
  const sel = el("select");
  if (includeNew) sel.append(el("option", { value: "" }, "➕ New notebook"));
  sel.append(el("option", { value: "", disabled: "disabled" }, "loading…"));
  api("/api/notebooks").then(({ ok, body }) => {
    [...sel.querySelectorAll("option")].forEach((o, i) => { if (o.textContent === "loading…") o.remove(); });
    if (!ok) return;
    (body.notebooks || []).forEach((n) => {
      const id = n.id || n.notebook_id || n.notebookId || "";
      const title = n.title || n.name || id;
      const opt = el("option", { value: id }, `${title} (${n.source_count ?? "?"} src)`);
      if (id === state.notebookId) opt.selected = true;
      sel.append(opt);
    });
  });
  return sel;
}

const longNote = (txt) => el("div", { class: "banner info" }, txt);

function collectPage() {
  const wrap = el("div", { class: "card" });
  const topic = el("input", { type: "text", value: state.topic || state.lastQuery || "" });
  const nb = notebookSelect(true);
  const out = el("div", {});
  const urls = state.selectedUrls;

  const list = el("div", { class: "results" });
  if (urls.length) urls.forEach((u) => list.append(el("div", { class: "result" },
    el("span", {}, "•"), el("div", { class: "meta" }, u), el("a", { href: u, target: "_blank" }, "open"))));
  else list.append(el("div", { class: "banner info" }, "No videos selected. Go to Search, tick some, then “Add selected → Collect”."));

  const btn = el("button", { class: "primary" }, "Add to NotebookLM");
  btn.disabled = !urls.length;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const log = progressLog();
    out.replaceChildren(log.box);
    try {
      const body = await runJob("collect", { urls, topic: topic.value.trim(), notebook_id: nb.value || null }, log.push);
      state.notebookId = body.notebook_id;
      state.topic = topic.value.trim();
      out.replaceChildren(
        el("div", { class: "banner info" },
          `${body.created ? "Created notebook" : "Used notebook"} ${body.notebook_id} · sources now: ${body.source_count ?? "?"} (requested ${body.requested}). ${body.add_ok ? "" : "⚠ some sources may have failed."}`),
        el("button", { class: "primary", onclick: () => go("Analyze") }, "Continue → Analyze"));
    } catch (e) {
      out.replaceChildren(el("div", { class: "banner err" }, e.message));
    }
    btn.disabled = false;
  });

  wrap.append(
    el("h1", {}, "Collect"),
    el("p", { class: "sub" }, "Add the selected videos to a NotebookLM notebook."),
    el("div", { class: "row" }, el("label", {}, "Topic"), topic),
    el("div", { class: "row" }, el("label", {}, "Notebook"), nb),
    el("h2", { style: "margin-top:14px" }, `${urls.length} selected`),
    list,
    el("div", { class: "row", style: "margin-top:12px" }, btn),
    out,
  );
  return wrap;
}

function analyzePage() {
  const wrap = el("div", { class: "card" });
  const nb = notebookSelect(false);
  const fmt = el("select", {}, ...["Briefing Doc", "Study Guide", "Blog Post"].map((f) => el("option", { value: f }, f)));
  const lang = el("input", { type: "text", value: "en", style: "width:70px" });
  const dl = el("input", { type: "checkbox", checked: "checked" });
  const question = el("input", { type: "text", value: "Summarize the top 5 key insights in a structured format." });
  const out = el("div", {});

  const btn = el("button", { class: "primary" }, "Generate");
  btn.addEventListener("click", async () => {
    const notebook_id = nb.value || state.notebookId;
    if (!notebook_id) { out.replaceChildren(el("div", { class: "banner err" }, "Pick a notebook first (or collect sources).")); return; }
    btn.disabled = true;
    const log = progressLog();
    out.replaceChildren(log.box);
    let body;
    try {
      body = await runJob("analyze", {
        notebook_id, topic: state.topic || state.lastQuery || "research",
        report_format: fmt.value, language: lang.value.trim() || "en",
        question: question.value.trim(), download: dl.checked,
      }, log.push);
    } catch (e) {
      out.replaceChildren(el("div", { class: "banner err" }, e.message));
      btn.disabled = false; return;
    }
    btn.disabled = false;
    const rstat = body.report_status || (body.report_ok ? "started" : "failed");
    const tail = body.downloaded
      ? " · saved to " + body.downloaded
      : (rstat === "timeout" ? " · still generating — check Dashboard shortly" : "");
    const kids = [el("div", { class: "banner info" }, `Report: ${rstat}${tail}`)];
    if (body.answer) kids.push(el("div", { class: "card" }, el("h2", {}, "Q&A"), el("div", { html: body.answer.replace(/\n/g, "<br>") })));
    if (body.answer_error) kids.push(el("div", { class: "banner err" }, "Q&A: " + body.answer_error));
    if (!body.report_ok && body.report_detail) kids.push(el("div", { class: "banner err" }, body.report_detail));
    kids.push(el("button", { class: "primary", onclick: () => go("Dashboard") }, "Open Dashboard"));
    out.replaceChildren(...kids);
  });

  wrap.append(
    el("h1", {}, "Analyze"),
    el("p", { class: "sub" }, "Generate a report and a structured Q&A from the notebook's sources."),
    el("div", { class: "row" }, el("label", {}, "Notebook"), nb),
    el("div", { class: "row" }, el("label", {}, "Format"), fmt, el("label", {}, "Lang"), lang, el("label", { class: "row" }, dl, "download report")),
    el("div", { class: "row" }, el("label", {}, "Q&A"), question),
    el("div", { class: "row", style: "margin-top:12px" }, btn),
    longNote("Report generation runs in NotebookLM Studio; the request stays open until it finishes (streaming is the next iteration)."),
    out,
  );
  return wrap;
}

function mediaPage() {
  const wrap = el("div", { class: "card" });
  const nb = notebookSelect(false);
  const type = el("select", {}, ...["video", "flashcards", "mindmap", "infographic", "datatable"].map((t) => el("option", { value: t }, t)));
  const fmt = el("select", {}, ...["explainer", "brief", "cinematic"].map((f) => el("option", { value: f }, f)));
  const fmtRow = el("label", { class: "row" }, "format", fmt);
  const extra = el("input", { type: "text", placeholder: "focus topic (datatable: table description)" });
  const dl = el("input", { type: "checkbox", checked: "checked" });
  const out = el("div", {});
  const sync = () => { fmtRow.style.display = type.value === "video" ? "" : "none"; };
  type.addEventListener("change", sync);

  const btn = el("button", { class: "primary" }, "Generate");
  btn.addEventListener("click", async () => {
    const notebook_id = nb.value || state.notebookId;
    if (!notebook_id) { out.replaceChildren(el("div", { class: "banner err" }, "Pick a notebook.")); return; }
    btn.disabled = true;
    const log = progressLog();
    out.replaceChildren(log.box);
    const payload = { notebook_id, type: type.value, topic: state.topic || state.lastQuery || "research", download: dl.checked };
    if (type.value === "video") payload.format = fmt.value;
    if (extra.value.trim()) { if (type.value === "datatable") payload.description = extra.value.trim(); else payload.focus = extra.value.trim(); }
    let body;
    try {
      body = await runJob("media", payload, log.push);
    } catch (e) {
      out.replaceChildren(el("div", { class: "banner err" }, e.message));
      btn.disabled = false; return;
    }
    btn.disabled = false;
    const status = body.artifact_status || (body.create_ok ? "started" : "failed");
    const tail = body.downloaded ? " · saved to " + body.downloaded : (status === "timeout" ? " · still generating — check later" : "");
    const kids = [el("div", { class: "banner info" }, `${type.value}: ${status}${tail}`)];
    if (!(status === "completed" && body.downloaded)) {
      kids.push(el("button", { class: "primary", onclick: () => btn.click() }, "Retry"));
    }
    out.replaceChildren(...kids);
  });
  sync();
  wrap.append(
    el("h1", {}, "Media"),
    el("p", { class: "sub" }, "Generate a rich Studio artifact and download it to ~/research-output/."),
    el("div", { class: "row" }, el("label", {}, "Notebook"), nb),
    el("div", { class: "row" }, el("label", {}, "Type"), type, fmtRow, el("label", { class: "row" }, dl, "download")),
    el("div", { class: "row" }, extra),
    el("div", { class: "row", style: "margin-top:12px" }, btn),
    out,
  );
  return wrap;
}

function renderLabels(out, labels) {
  const arr = Array.isArray(labels) ? labels : (labels && labels.labels) || [];
  if (!arr.length) { out.replaceChildren(el("div", { class: "banner info" }, "No labels returned (auto-label needs 5+ sources).")); return; }
  const list = el("div", { class: "results", style: "margin-top:12px" });
  arr.forEach((l) => {
    const name = l.name || l.title || l.label || l.label_name || (typeof l === "string" ? l : JSON.stringify(l));
    const emoji = l.emoji || "🏷";
    const count = l.source_count ?? l.count ?? (Array.isArray(l.source_ids) ? l.source_ids.length : undefined);
    list.append(el("div", { class: "result" }, el("span", {}, emoji), el("div", { class: "title" }, String(name)), el("div", { class: "meta" }, count !== undefined ? count + " sources" : "")));
  });
  out.replaceChildren(list);
}

function organizePage() {
  const wrap = el("div", { class: "card" });
  const nb = notebookSelect(false);
  const out = el("div", {});
  const run = async (action) => {
    const notebook_id = nb.value || state.notebookId;
    if (!notebook_id) { out.replaceChildren(el("div", { class: "banner err" }, "Pick a notebook.")); return; }
    out.replaceChildren(el("div", { class: "spinner" }, action === "auto" ? "Auto-labeling sources…" : "Loading labels…"));
    const { ok, body } = await api("/api/organize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notebook_id, action }) });
    if (!ok) { out.replaceChildren(el("div", { class: "banner err" }, body.error || body.detail || "Organize failed")); return; }
    renderLabels(out, body.labels);
  };
  wrap.append(
    el("h1", {}, "Organize"),
    el("p", { class: "sub" }, "AI-group the notebook's sources into themed labels — inside NotebookLM (needs 5+ sources)."),
    el("div", { class: "row" }, el("label", {}, "Notebook"), nb),
    el("div", { class: "row", style: "margin-top:10px" },
      el("button", { class: "primary", onclick: () => run("auto") }, "Auto-label"),
      el("button", { class: "primary", onclick: () => run("list") }, "List labels")),
    out,
  );
  return wrap;
}

function sharePage() {
  const wrap = el("div", { class: "card" });
  const nb = notebookSelect(false);
  const email = el("input", { type: "text", placeholder: "collaborator@email.com" });
  const out = el("div", {});
  const run = async (action, extra = {}) => {
    const notebook_id = nb.value || state.notebookId;
    if (!notebook_id) { out.replaceChildren(el("div", { class: "banner err" }, "Pick a notebook.")); return; }
    out.replaceChildren(el("div", { class: "spinner" }, `${action}…`));
    const { ok, body } = await api("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notebook_id, action, topic: state.topic || state.lastQuery || "research", ...extra }) });
    if (!ok) { out.replaceChildren(el("div", { class: "banner err" }, body.error || body.detail || "Share failed")); return; }
    out.replaceChildren(
      el("div", { class: body.ok ? "banner info" : "banner err" }, `${action}: ${body.ok ? "ok" : "failed"}`),
      el("div", { class: "muted", style: "margin-top:8px;white-space:pre-wrap" }, body.detail || ""));
  };
  wrap.append(
    el("h1", {}, "Share"),
    el("p", { class: "sub" }, "Publish, invite collaborators, or export to Google Docs/Sheets. ⚠ outbound."),
    el("div", { class: "row" }, el("label", {}, "Notebook"), nb),
    el("div", { class: "row", style: "margin-top:10px" },
      el("button", { class: "primary", onclick: () => run("status") }, "Status"),
      el("button", { class: "primary", onclick: () => run("public") }, "Make public"),
      el("button", { class: "primary", onclick: () => run("private") }, "Make private"),
      el("button", { class: "primary", onclick: () => run("docs") }, "Export → Docs"),
      el("button", { class: "primary", onclick: () => run("sheets") }, "Export → Sheets")),
    el("div", { class: "row", style: "margin-top:10px" }, email,
      el("button", { class: "primary", onclick: () => run("invite", { email: email.value.trim() }) }, "Invite")),
    out,
  );
  return wrap;
}

function placeholder(page) {
  const planned = {
    Media: "POST /api/media → nlm <video|flashcards|mindmap|infographic|data-table> create",
    Organize: "POST /api/organize → nlm label auto <notebook>",
    Share: "POST /api/share → nlm share public|invite / nlm export docs|sheets",
  }[page] || "";
  return el("div", { class: "card" },
    el("h1", {}, page),
    el("p", { class: "sub" }, "Planned page (scaffold). The backend stub returns 501 with the command it will run."),
    el("div", { class: "banner info", html: `Will call: <code>${planned}</code>` }),
    el("p", { class: "muted" }, "Tracked in backlog.md → Epic 6; flows in user-flow.md → §8."));
}

const PAGE_RENDERERS = {
  Run: runPage,
  Search: searchPage,
  Collect: collectPage,
  Analyze: analyzePage,
  Media: mediaPage,
  Organize: organizePage,
  Share: sharePage,
  Dashboard: dashboardPage,
};

// --- boot ------------------------------------------------------------------
renderNav();
refreshAuth();
setInterval(refreshAuth, 60000);
go("Run");
