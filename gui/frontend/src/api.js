// Fetch wrapper + streaming-job helper (ports runJob from the old app.js).

export async function api(path, opts) {
  const res = await fetch(path, opts);
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { ok: res.ok, status: res.status, body };
}

export async function apiJSON(path, method, payload) {
  return api(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Start a streaming job (POST to start, EventSource for progress).
// Resolves with the final result; calls onProgress(msg) per progress event.
export function runJob(stage, payload, onProgress = () => {}) {
  return new Promise(async (resolve, reject) => {
    const { ok, body } = await apiJSON("/api/jobs/" + stage, "POST", payload);
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
