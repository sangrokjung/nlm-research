// Research GUI front-end. No build step — plain ES modules-free JS.
// Pages mirror the /research subcommands (ADR-0012). Search + Dashboard are
// wired to the backend; the rest are placeholders showing the planned command.

const PAGES = [
  "Search", "Collect", "Analyze", "Media", "Organize", "Share", "Dashboard",
];

const state = {
  page: "Search",
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

async function refreshAuth() {
  const pill = document.getElementById("auth-pill");
  const { ok, body } = await api("/api/auth");
  const st = (ok && body.state) || "error";
  pill.className = "pill pill-" + (st === "ok" ? "ok" : st === "stale" ? "stale" : "error");
  pill.textContent = st === "ok" ? "auth ●" : st === "stale" ? "re-login (nlm login)" : "auth error";
  pill.title = body.detail || "";
}

function go(page) {
  state.page = page;
  renderNav();
  const view = document.getElementById("view");
  view.replaceChildren((PAGE_RENDERERS[page] || placeholder)(page));
}

// --- pages -----------------------------------------------------------------
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
    out.replaceChildren(el("div", { class: "spinner" }, "Adding sources… this can take a few minutes (waits for processing)."));
    const { ok, body } = await api("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, topic: topic.value.trim(), notebook_id: nb.value || null }),
    });
    btn.disabled = false;
    if (!ok) { out.replaceChildren(el("div", { class: "banner err" }, body.error || body.detail || "Collect failed")); return; }
    state.notebookId = body.notebook_id;
    state.topic = topic.value.trim();
    out.replaceChildren(
      el("div", { class: "banner info" },
        `${body.created ? "Created notebook" : "Used notebook"} ${body.notebook_id} · sources now: ${body.source_count ?? "?"} (requested ${body.requested}). ${body.add_ok ? "" : "⚠ some sources may have failed."}`),
      el("button", { class: "primary", onclick: () => go("Analyze") }, "Continue → Analyze"));
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
    out.replaceChildren(el("div", { class: "spinner" }, "Generating report + Q&A… this can take a few minutes."));
    const { ok, body } = await api("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notebook_id, topic: state.topic || state.lastQuery || "research",
        report_format: fmt.value, language: lang.value.trim() || "en",
        question: question.value.trim(), download: dl.checked,
      }),
    });
    btn.disabled = false;
    if (!ok) { out.replaceChildren(el("div", { class: "banner err" }, body.error || body.detail || "Analyze failed")); return; }
    const kids = [el("div", { class: "banner info" }, `Report: ${body.report_ok ? "✓ generated" : "✗ failed"}${body.downloaded ? " · saved to " + body.downloaded : ""}`)];
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
  Search: searchPage,
  Collect: collectPage,
  Analyze: analyzePage,
  Dashboard: dashboardPage,
};

// --- boot ------------------------------------------------------------------
renderNav();
refreshAuth();
setInterval(refreshAuth, 60000);
go("Search");
