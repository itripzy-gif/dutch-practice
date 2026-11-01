// Zeg het maar: she asks for a word, he records it, she replays it.

const cfg = window.APP_CONFIG || {};
const ONLINE = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
const BUCKET = "recordings";

// ---------- Storage: Supabase (online) ----------
async function makeSupabaseStore() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const check = (r) => { if (r.error) throw r.error; return r.data; };
  return {
    async list() {
      return check(await sb.from("phrases").select("*").order("created_at", { ascending: false }));
    },
    async add(text, note) {
      check(await sb.from("phrases").insert({ text, note: note || null }));
    },
    async remove(item) {
      if (item.audio_path) await sb.storage.from(BUCKET).remove([item.audio_path]);
      check(await sb.from("phrases").delete().eq("id", item.id));
    },
    async saveAudio(item, blob, ext) {
      const path = `${item.id}-${Date.now()}.${ext}`;
      check(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true }));
      check(await sb.from("phrases").update({ audio_path: path, recorded_at: new Date().toISOString() }).eq("id", item.id));
      if (item.audio_path && item.audio_path !== path) await sb.storage.from(BUCKET).remove([item.audio_path]);
    },
    audioUrl(item) {
      return sb.storage.from(BUCKET).getPublicUrl(item.audio_path).data.publicUrl;
    },
  };
}

// ---------- Storage: this device only (demo mode) ----------
function makeLocalStore() {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open("zeg-het-maar", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("phrases", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction("phrases", mode);
      const out = fn(t.objectStore("phrases"));
      t.oncomplete = () => res(out && out.result);
      t.onerror = () => rej(t.error);
    });
  };
  const urls = new Map();
  return {
    async list() {
      const all = await tx("readonly", (s) => s.getAll());
      return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async add(text, note) {
      const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
      await tx("readwrite", (s) => s.put({ id, text, note: note || null, created_at: new Date().toISOString(), audio_path: null, recorded_at: null }));
    },
    async remove(item) { await tx("readwrite", (s) => s.delete(item.id)); },
    async saveAudio(item, blob) {
      urls.delete(item.id);
      await tx("readwrite", (s) => s.put({ ...item, audio: blob, audio_path: "local", recorded_at: new Date().toISOString() }));
    },
    audioUrl(item) {
      if (!urls.has(item.id + item.recorded_at)) urls.set(item.id + item.recorded_at, URL.createObjectURL(item.audio));
      return urls.get(item.id + item.recorded_at);
    },
  };
}

// ---------- Recording ----------
function pickMime() {
  const options = [["audio/mp4", "m4a"], ["audio/webm;codecs=opus", "webm"], ["audio/webm", "webm"], ["audio/ogg", "ogg"]];
  if (!window.MediaRecorder) return null;
  for (const [m, ext] of options) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext };
  return { mime: "", ext: "webm" };
}

const recorder = {
  stream: null, mr: null, chunks: [],
  async start() {
    const kind = pickMime();
    if (!kind) throw new Error("This browser can't record audio.");
    this.kind = kind;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mr = new MediaRecorder(this.stream, kind.mime ? { mimeType: kind.mime } : undefined);
    this.chunks = [];
    this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.mr.start();
  },
  stop() {
    return new Promise((res) => {
      this.mr.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        const type = this.mr.mimeType || this.kind.mime || "audio/webm";
        res({ blob: new Blob(this.chunks, { type: type.split(";")[0] }), ext: this.kind.ext });
      };
      this.mr.stop();
    });
  },
};

// ---------- UI ----------
const $ = (s) => document.querySelector(s);
let store, items = [];
let role = localStorage.getItem("role");
let filter = null;
let busy = false; // pause auto-refresh while recording or saving
const player = new Audio();
let loopId = null;

function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

function setRole(r) {
  role = r; localStorage.setItem("role", r);
  filter = r === "learner" ? "done" : "todo";
  showApp();
}

function showApp() {
  if (!role) { $("#rolePicker").hidden = false; $("#app").hidden = true; $("#roleBtn").hidden = true; return; }
  $("#rolePicker").hidden = true; $("#app").hidden = false; $("#roleBtn").hidden = false;
  $("#roleBtn").textContent = role === "learner" ? "🎧 Learner ⇄" : "🎙️ Speaker ⇄";
  $("#addForm").hidden = role !== "learner";
  filter = filter || (role === "learner" ? "done" : "todo");
  render();
}

function play(item, rate = 1, loop = false) {
  stopLoop();
  player.src = store.audioUrl(item);
  player.playbackRate = rate;
  player.loop = loop;
  if (loop) loopId = item.id;
  player.play().catch(() => toast("Couldn't play that recording"));
  if (loop) render();
}
function stopLoop() {
  const was = loopId;
  loopId = null; player.loop = false;
  if (was) { player.pause(); render(); }
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

function render() {
  if (!role) return;
  const todo = items.filter((i) => !i.audio_path);
  const done = items.filter((i) => i.audio_path);
  const learner = role === "learner";
  const [todoBtn, doneBtn] = document.querySelectorAll(".tabs button");
  todoBtn.firstChild.textContent = learner ? "Waiting " : "To record ";
  doneBtn.firstChild.textContent = learner ? "Ready to hear " : "Recorded ";
  $("#todoCount").textContent = todo.length ? `(${todo.length})` : "";
  $("#doneCount").textContent = done.length ? `(${done.length})` : "";
  todoBtn.classList.toggle("active", filter === "todo");
  doneBtn.classList.toggle("active", filter === "done");

  const shown = filter === "todo" ? todo : done;
  const list = $("#list");
  list.replaceChildren(...shown.map(renderItem));
  const empty = $("#empty");
  empty.hidden = shown.length > 0;
  empty.textContent = filter === "todo"
    ? (learner ? "Nothing waiting. Ask for a word above!" : "All caught up 🎉 Nothing to record.")
    : (learner ? "No recordings yet. They'll show up here." : "Nothing recorded yet.");
}

function renderItem(item) {
  const learner = role === "learner";
  const del = el("button", { class: "del", title: "Delete", onclick: async () => {
    if (!confirm(`Delete "${item.text}"?`)) return;
    try { await store.remove(item); await refresh(); } catch (e) { toast("Delete failed: " + e.message); }
  } }, "✕");
  const meta = item.audio_path ? `recorded ${timeAgo(item.recorded_at)}` : `asked ${timeAgo(item.created_at)}`;
  const top = el("div", { class: "top" },
    el("div", { class: "text" },
      el("div", { class: "phrase" }, item.text),
      item.note ? el("div", { class: "note" }, item.note) : null,
      el("div", { class: "meta" }, meta)),
    del);
  const li = el("li", { class: "item" }, top);

  if (item.audio_path) {
    const looping = loopId === item.id;
    li.append(el("div", { class: "row" },
      el("button", { class: "btn play", onclick: () => play(item) }, "▶ Play"),
      el("button", { class: "btn", onclick: () => play(item, 0.7) }, "🐢 Slow"),
      el("button", { class: "btn" + (looping ? " on" : ""), onclick: () => (looping ? stopLoop() : play(item, 1, true)) }, looping ? "⏹ Stop" : "🔁 Repeat")));
  } else if (learner) {
    li.append(el("div", { class: "waiting" }, "⏳ Waiting for a recording…"));
  }
  if (!learner) li.append(recordControls(item));
  return li;
}

function recordControls(item) {
  const row = el("div", { class: "row" });
  const idle = () => row.replaceChildren(
    el("button", { class: "btn rec", onclick: startRec }, item.audio_path ? "🎙️ Record again" : "🎙️ Record"));
  async function startRec() {
    stopLoop(); player.pause();
    try { await recorder.start(); } catch (e) {
      toast(e.name === "NotAllowedError" ? "Please allow microphone access" : e.message, 3500); return;
    }
    busy = true;
    const stopBtn = el("button", { class: "btn rec recording", onclick: stopRec }, "⏹ Stop");
    row.replaceChildren(stopBtn);
  }
  async function stopRec() {
    const { blob, ext } = await recorder.stop();
    const url = URL.createObjectURL(blob);
    const listen = el("button", { class: "btn", onclick: () => { player.src = url; player.playbackRate = 1; player.play(); } }, "▶ Listen");
    const redo = el("button", { class: "btn", onclick: () => { URL.revokeObjectURL(url); startRec(); } }, "↺ Redo");
    const save = el("button", { class: "btn play", onclick: async () => {
      save.disabled = true; save.textContent = "Saving…";
      try {
        await store.saveAudio(item, blob, ext);
        busy = false; toast("Saved ✓"); await refresh();
      } catch (e) {
        save.disabled = false; save.textContent = "✓ Save";
        toast("Saving failed: " + e.message, 4000);
      }
    } }, "✓ Save");
    const cancel = el("button", { class: "btn", onclick: () => { busy = false; idle(); } }, "Cancel");
    row.replaceChildren(listen, redo, save, cancel);
  }
  idle();
  return row;
}

async function refresh() {
  try {
    items = await store.list();
    if (!busy) render();
    $("#banner").hidden = ONLINE;
  } catch (e) {
    $("#banner").hidden = false;
    $("#banner").textContent = "Can't reach the server: " + e.message;
  }
}

// ---------- Wire up ----------
document.querySelectorAll("#rolePicker [data-role]").forEach((b) => (b.onclick = () => setRole(b.dataset.role)));
$("#roleBtn").onclick = () => setRole(role === "learner" ? "speaker" : "learner");
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => { filter = b.dataset.filter; render(); }));
$("#addForm").onsubmit = async (e) => {
  e.preventDefault();
  const text = $("#phraseInput").value.trim();
  if (!text) return;
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await store.add(text, $("#noteInput").value.trim());
    $("#phraseInput").value = ""; $("#noteInput").value = "";
    filter = "todo"; toast("Asked ✓");
    await refresh();
  } catch (err) { toast("Couldn't save: " + err.message, 4000); }
  btn.disabled = false;
};
player.onended = () => { if (!player.loop) player.currentTime = 0; };

(async () => {
  $("#banner").hidden = false;
  $("#banner").textContent = ONLINE ? "Connecting…" : "Demo mode: saved on this device only (add Supabase keys in config.js to sync)";
  store = ONLINE ? await makeSupabaseStore() : makeLocalStore();
  showApp();
  await refresh();
  if (!ONLINE) { $("#banner").hidden = false; $("#banner").textContent = "Demo mode: saved on this device only (add Supabase keys in config.js to sync)"; }
  setInterval(() => document.visibilityState === "visible" && refresh(), 15000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refresh());
})();
