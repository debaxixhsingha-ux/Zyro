/* ============================================================
   Zyro app.js — v3
   Flat module (no IIFE). Matched to app.html.
   ============================================================ */

/* -----------------------------------------------------------
   CONFIG
   ----------------------------------------------------------- */
const WORKER_URL = "https://zyro-ai.debaxixhsingha.workers.dev/";
const SUPABASE_URL = "https://opeyjksuklfmeicmnxsh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LC3DrFcQAsG3HSILCekaFw_SOVVDxjA";

const K = {
  tokens:  "zyro_tokens_v3",
  chats:   "zyro_chats_v3",
  ci:      "zyro_ci_v2",
  gen:     "zyro_gen_v4",
  streak:  "zyro_streak_v3",
  visit:   "zyro_visit_v3",
  ob:      "zyro_ob_draft_v3",
  onboard: "zyro_onboarded_v3",
  theme:   "zyro_theme",
};

const TOKEN_RESET_MS    = 30 * 24 * 60 * 60 * 1000;
const GEN_RESET_MS      = 24 * 60 * 60 * 1000;
const STREAM_TIMEOUT_MS = 120000;
const FIRST_TOKEN_MS    = 45000;
const FILE_CHAR_LIMIT   = 50000;

const DAILY_LIMITS = {
  free: { studykit: 2,  flashcard: 3,  quiz: 3  },
  pro:  { studykit: 10, flashcard: 15, quiz: 50 },
};
const TOKEN_LIMITS = { free: 100000, pro: 750000 };

const SUBJECTS = {
  "General":   { em: "📖", cls: "eng"     },
  "Maths":     { em: "📐", cls: "maths"   },
  "Physics":   { em: "⚛️", cls: "physics" },
  "Chemistry": { em: "⚗️", cls: "chem"    },
  "Biology":   { em: "🧬", cls: "bio"     },
  "English":   { em: "📚", cls: "eng"     },
  "CS":        { em: "💻", cls: "cs"      },
  "Social":    { em: "🌏", cls: "eng"     },
};

const SUBJECT_RX = {
  "Maths":     /\b(algebra|geometry|calculus|trigonometry|equation|integral|derivative|polynomial|triangle|quadratic|maths?|mathemat|matrix|vector|probabilit)\b/i,
  "Physics":   /\b(physics|force|motion|velocity|acceleration|newton|energy|work|power|electric|magnet|circuit|wave|optic|thermodynamic)\b/i,
  "Chemistry": /\b(chemistry|chemical|reaction|acid|base|atom|molecule|element|compound|organic|inorganic|periodic|mole|bond)\b/i,
  "Biology":   /\b(biology|cell|dna|gene|photosynthesis|organism|plant|animal|human|blood|nervous|tissue|enzyme)\b/i,
  "English":   /\b(english|grammar|essay|poem|literature|shakespeare|writing|comprehension|vocabulary)\b/i,
  "CS":        /\b(code|coding|program|python|javascript|java|algorithm|function|variable|html|css|react|compile|debug|software)\b/i,
  "Social":    /\b(history|geography|civics|economics|society|polity|constitution|freedom|revolution|map)\b/i,
};

const LIMITS = {
  free: { images: 5, files: 5,  fileSize: 10e6 },
  pro:  { images: 5, files: 10, fileSize: 10e6 },
};

/* -----------------------------------------------------------
   STATE
   ----------------------------------------------------------- */
let sb = null, sbP = null;
let user = null, pro = false, userProfile = null;
let total = TOKEN_LIMITS.free;
let chats = [], cur = null, curSubject = "General";
let hist = [];
let busy = false, streaming = false, ctrl = null;
let follow = true;
let pending = [], pendingKind = null;
let obData = {}, obStep = 0;
const OB_STEPS = 7;

/* -----------------------------------------------------------
   HELPERS
   ----------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const escA = (s) => esc(s).replace(/"/g, "&quot;");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function showErr(msg) {
  const el = $("jsErr");
  if (!el) return;
  el.style.display = "block";
  el.textContent = "⚠ " + (msg || "Unknown error");
}
window.addEventListener("error", (ev) =>
  showErr((ev.message || "") + " @" + (ev.lineno || "?")));
window.addEventListener("unhandledrejection", (ev) =>
  showErr("Promise: " + (ev.reason && (ev.reason.stack || ev.reason.message || ev.reason) || "")));

function loadJS(url) {
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = url; s.onload = ok; s.onerror = no;
    document.head.appendChild(s);
  });
}

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("on"), 1800);
}
window.toast = toast;

function lsGet(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
  catch (_) { return fb; }
}
function lsSet(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {}
}

/* -----------------------------------------------------------
   SUPABASE + AUTH HEADERS
   ----------------------------------------------------------- */
function sbClient() {
  if (sb) return Promise.resolve(sb);
  if (!sbP) {
    sbP = loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(() => {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return sb;
    });
  }
  return sbP;
}

async function authHeaders() {
  const h = { "Content-Type": "application/json" };
  try {
    const s = await sbClient();
    const { data } = await s.auth.getSession();
    const jwt = data && data.session && data.session.access_token;
    if (jwt) h.Authorization = "Bearer " + jwt;
  } catch (_) {}
  return h;
}

/* -----------------------------------------------------------
   THEME
   ----------------------------------------------------------- */
function setTheme(next) {
  if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try { localStorage.setItem(K.theme, next); } catch (_) {}
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(cur === "dark" ? "light" : "dark");
}

/* -----------------------------------------------------------
   TABS
   ----------------------------------------------------------- */
function switchTab(name) {
  document.querySelectorAll(".tab-screen").forEach((el) =>
    el.classList.toggle("on", el.dataset.tab === name));
  document.querySelectorAll(".tab-btn").forEach((el) =>
    el.classList.toggle("on", el.dataset.tab === name));
  if (name === "account") renderAccount();
  if (name === "subjects") renderSubjects();
}

/* -----------------------------------------------------------
   STREAK
   ----------------------------------------------------------- */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function getStreak() {
  const d = lsGet(K.streak, null);
  return d && typeof d.days === "number" ? d : { days: 0, lastDay: "" };
}
function bumpStreak() {
  const today = todayStr();
  const s = getStreak();
  if (s.lastDay === today) return;
  s.days = s.lastDay === yesterdayStr() ? (s.days || 0) + 1 : 1;
  s.lastDay = today;
  lsSet(K.streak, s);
}
function renderStreak() {
  const pill = $("streakPill"), num = $("streakNum");
  if (!pill || !num) return;
  const s = getStreak();
  if (!s.days) { pill.style.display = "none"; return; }
  pill.style.display = "inline-flex";
  num.textContent = s.days;
  pill.classList.toggle("hot", s.days >= 3);
}

/* -----------------------------------------------------------
   TOKENS
   ----------------------------------------------------------- */
function getTokens() {
  const d = lsGet(K.tokens, null);
  const now = Date.now();
  if (!d || !d.reset || now - d.reset > TOKEN_RESET_MS) {
    const fresh = { used: 0, reset: now };
    lsSet(K.tokens, fresh);
    return fresh;
  }
  return d;
}
function saveTokens(d) { lsSet(K.tokens, d); }
function addTokens(n) {
  const d = getTokens();
  d.used += n;
  saveTokens(d);
  renderTokenUI();
}
function tokensOut() { return getTokens().used >= total; }
function nextResetLabel() {
  const d = getTokens();
  const remain = d.reset + TOKEN_RESET_MS - Date.now();
  if (remain <= 0) return "now";
  const days = Math.floor(remain / 86400000);
  const hrs  = Math.floor((remain % 86400000) / 3600000);
  if (days > 0) return "in " + days + "d " + hrs + "h";
  const mins = Math.floor((remain % 3600000) / 60000);
  if (hrs > 0) return "in " + hrs + "h " + mins + "m";
  return "in " + mins + "m";
}
function renderTokenUI() {
  const d = getTokens();
  const pct = Math.min(100, (d.used / total) * 100);
  const p = pct > 0 && pct < 0.1 ? "<0.1" : pct < 10 ? pct.toFixed(1) : Math.floor(pct);
  const tp = $("acctTokenPct"); if (tp) tp.textContent = p + "%";
  const tf = $("acctTokenFill"); if (tf) tf.style.width = pct + "%";
}
setInterval(renderTokenUI, 30000);

/* -----------------------------------------------------------
   GENERATION COUNTERS
   ----------------------------------------------------------- */
function getGen() {
  const d = lsGet(K.gen, null);
  const now = Date.now();
  if (!d || !d.reset || now - d.reset > GEN_RESET_MS) {
    const fresh = { studykit: 0, flashcard: 0, quiz: 0, reset: now };
    lsSet(K.gen, fresh);
    return fresh;
  }
  return d;
}
function bumpGen(kind) {
  const d = getGen();
  d[kind] = (d[kind] || 0) + 1;
  lsSet(K.gen, d);
}
function genAllowed(kind) {
  const cap = DAILY_LIMITS[pro ? "pro" : "free"][kind] || 0;
  return (getGen()[kind] || 0) < cap;
}
function detectGenIntent(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  if (/\b(?:fl+a+s+h\s*cards?|flashcards?|make\s+(?:me\s+)?(?:a\s+)?(?:some\s+)?flash\s*cards?)\b/.test(s)) return "flashcard";
  if (/\b(?:mock\s*paper|full\s*mock|mock\s*test)\b/.test(s)) return "mock";
  if (/\b(?:viva\s*practice|oral\s*exam)\b/.test(s)) return "viva";
  if (/\b(?:study\s*kit|make\s+(?:me\s+)?(?:a\s+)?study|create\s+(?:me\s+)?(?:a\s+)?study)\b/.test(s)) return "studykit";
  if (/\b(?:quiz\s*me|make\s+(?:a\s+)?quiz|test\s+me\s+on|mcqs?|test\s+me)\b/.test(s)) return "quiz";
  return null;
}
function detectSubject(text) {
  if (!text) return null;
  for (const s in SUBJECT_RX) if (SUBJECT_RX[s].test(text)) return s;
  return null;
}

/* -----------------------------------------------------------
   CHAT STORAGE
   ----------------------------------------------------------- */
chats = lsGet(K.chats, []);

function saveChats() {
  chats = [...chats.filter((c) => c.pin), ...chats.filter((c) => !c.pin)].slice(0, 40);
  for (;;) {
    try { localStorage.setItem(K.chats, JSON.stringify(chats)); break; }
    catch (_) { if (chats.length <= 1) break; chats.pop(); }
  }
  cloudSave();
}

async function cloudSave() {
  if (!user || !cur) return;
  try {
    const s = await sbClient();
    const msgs = JSON.parse(JSON.stringify(cur.msgs));
    msgs.forEach((m) => { delete m.imgs; });
    await s.from("chats").upsert(
      {
        id: cur.id, user_id: user.id, title: cur.title, pin: !!cur.pin,
        ts: cur.ts, subject: cur.subject || "General", msgs: msgs.slice(-40),
      },
      { onConflict: "id" }
    );
  } catch (_) {}
}

/* -----------------------------------------------------------
   SUBJECT CHIP + PICKER
   ----------------------------------------------------------- */
function paintSubjectChip() {
  const chip = $("subjectChip"), label = $("subjectChipLabel");
  if (!chip || !label) return;
  const meta = SUBJECTS[curSubject] || SUBJECTS.General;
  const em = chip.querySelector(".em");
  if (em) em.textContent = meta.em;
  label.textContent = curSubject;
}

function openSubjectPicker() {
  const m = $("subjectModal");
  if (!m) return;
  m.querySelectorAll(".modal-subj").forEach((b) => b.classList.toggle("on", b.dataset.s === curSubject));
  m.classList.add("on");
}
function closeSubjectPicker() {
  const m = $("subjectModal");
  if (m) m.classList.remove("on");
}

/* -----------------------------------------------------------
   CHAT SUBJECT GRID
   ----------------------------------------------------------- */
function buildChatSubjectGrid() {
  const g = $("chatSubjectGrid");
  if (!g) return;
  g.innerHTML = "";
  ["Maths", "Physics", "Chemistry", "Biology", "English", "CS"].forEach((name) => {
    const meta = SUBJECTS[name];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chat-subj-card " + meta.cls;
    b.innerHTML = '<span class="em">' + meta.em + '</span><div class="tx"><b>' + name + '</b><span>Tap to start</span></div>';
    b.addEventListener("click", () => {
      curSubject = name;
      paintSubjectChip();
      const t = $("t"); if (t) t.focus();
    });
    g.appendChild(b);
  });
}

/* -----------------------------------------------------------
   MARKDOWN
   ----------------------------------------------------------- */
const MR = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;

function inl(x) {
  const st = [];
  const tk = (h) => "\u0001" + (st.push(h) - 1) + "\u0002";
  x = x.replace(/`([^`]+)`/g, (_, c) => tk('<code class="i">' + esc(c) + "</code>"));
  x = x.replace(MR, (m, a, b, c, d) => {
    if (d !== undefined && !/[\\^_=+\-*\/<>{}()]|^[A-Za-z]$|\d/.test(d)) return m;
    return tk(
      '<span class="mx" data-d="' +
      (a !== undefined || b !== undefined ? 1 : 0) +
      '" data-tex="' +
      escA(a ?? b ?? c ?? d) +
      '">' +
      esc(m) +
      "</span>"
    );
  });
  x = esc(x);
  x = x.replace(/==([^=\n]+)==/g, '<span class="hl">$1</span>');
  x = x.replace(/\*\*([^*]+)\*\*/g, '<span class="term">$1</span>');
  return x.replace(/\u0001(\d+)\u0002/g, (_, i) => st[i]);
}

function txt(p) {
  const lines = p.split("\n");
  let h = "", l = null, pa = [];
  const fp = () => { if (pa.length) { h += "<p>" + inl(pa.join("\n")) + "</p>"; pa = []; } };
  const fl = () => { if (l) { h += "</" + l + ">"; l = null; } };
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i]; let m;
    if ((m = ln.match(/^\s{0,3}(#{1,6})\s+(.*)/))) {
      fp(); fl();
      const n = Math.min(m[1].length + 1, 4);
      h += "<h" + n + ">" + inl(m[2]) + "</h" + n + ">";
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(ln)) {
      fp(); fl(); h += "<hr>";
    } else if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {
      fp();
      if (l !== "ul") { fl(); h += "<ul>"; l = "ul"; }
      h += "<li>" + inl(m[1]) + "</li>";
    } else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) {
      fp();
      if (l !== "ol") { fl(); h += "<ol>"; l = "ol"; }
      h += "<li>" + inl(m[1]) + "</li>";
    } else if (!ln.trim()) {
      fp(); fl();
    } else {
      fl(); pa.push(ln);
    }
    i++;
  }
  fp(); fl();
  return h;
}

function md(src) {
  let h = "";
  src.split(/```/).forEach((p, i) => {
    if (i % 2) {
      const nl = p.indexOf("\n");
      const lang = nl > -1 ? p.slice(0, nl).trim() : "";
      const body = nl > -1 ? p.slice(nl + 1) : p;
      const code = body.replace(/\n$/, "");
      h +=
        '<div class="cb col" data-lang="' + escA(lang) + '">' +
          '<div class="ch"><span>' + esc(lang || "code") + '</span>' +
          '<span><button type="button" data-c>Copy</button></span></div>' +
          "<pre>" + esc(code) + "</pre>" +
        "</div>";
    } else {
      h += txt(p);
    }
  });
  return h;
}

function typeset(root) {
  if (!window.katex || streaming) return;
  root.querySelectorAll(".mx:not([data-k])").forEach((el) => {
    try {
      el.innerHTML = katex.renderToString(el.dataset.tex, {
        displayMode: el.dataset.d === "1",
        throwOnError: false,
      });
      el.dataset.k = 1;
    } catch (_) {}
  });
}
function setH(el, h) { el.innerHTML = h; typeset(el); }
window.typesetAll = () => typeset(document);

/* -----------------------------------------------------------
   MESSAGE DOM
   ----------------------------------------------------------- */
function addUserMsg(text, attNames, imgs) {
  const d = document.createElement("div");
  d.className = "u";
  const b = document.createElement("div");
  b.textContent = text;
  if (imgs && imgs.length) {
    const w = document.createElement("div"); w.className = "th";
    imgs.forEach((im) => {
      const i = document.createElement("img");
      i.alt = "";
      i.src = "data:" + im.mime + ";base64," + im.data;
      w.appendChild(i);
    });
    b.appendChild(w);
  }
  if (attNames && attNames.length) {
    const f = document.createElement("div");
    f.style.cssText = "font-size:11px;opacity:.75;margin-top:6px";
    f.textContent = "📎 " + attNames.join(", ");
    b.appendChild(f);
  }
  d.appendChild(b);
  $("log").appendChild(d);
}

function addAssistantMsg() {
  const d = document.createElement("div");
  d.className = "a";
  const n = Math.floor(Math.random() * 1e6);
  d.innerHTML =
    '<div class="status-chip" role="status">' +
      '<span class="spark">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<defs><linearGradient id="sg' + n + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#c3f53c"/>' +
            '<stop offset=".55" stop-color="#ff6b4a"/>' +
            '<stop offset="1" stop-color="#7c5cff"/>' +
          "</linearGradient></defs>" +
          '<path fill="url(#sg' + n + ')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>' +
        "</svg>" +
      "</span>" +
      '<span class="shimmer status-text">Thinking</span>' +
    "</div>" +
    '<div class="think-live" hidden>' +
      '<button type="button" class="think-live-head" aria-expanded="false">' +
        '<span class="chev">›</span>' +
        '<span class="think-live-dot"></span>' +
        '<span class="think-live-label">Thinking…</span>' +
      "</button>" +
      '<div class="think-live-body"><div class="think-live-inner"></div></div>' +
    "</div>" +
    '<div class="body"></div>';
  $("log").appendChild(d);
  return d;
}

function thinkUpdate(d, text) {
  const el = d.querySelector(".think-live");
  if (!el) return;
  el.hidden = false;
  const inner = el.querySelector(".think-live-inner");
  if (inner) {
    inner.textContent = text;
    inner.scrollTop = inner.scrollHeight;
  }
  down();
}

function thinkFinish(d, seconds, hadText) {
  const el = d.querySelector(".think-live");
  if (!el) return;
  if (!hadText) { el.remove(); return; }
  el.classList.add("done");
  const dot = el.querySelector(".think-live-dot"); if (dot) dot.remove();
  const label = el.querySelector(".think-live-label");
  if (label) label.textContent = "Thought for " + seconds + "s";
  const head = el.querySelector(".think-live-head");
  const panelBody = el.querySelector(".think-live-body");
  if (head) head.setAttribute("aria-expanded", "false");
  if (panelBody) panelBody.classList.remove("open");
  if (head && panelBody && !head.dataset.wired) {
    head.dataset.wired = "1";
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      panelBody.classList.toggle("open", !open);
    });
  }
}

/* -----------------------------------------------------------
   SCROLL
   ----------------------------------------------------------- */
function down(force) {
  const main = $("chatScroll");
  if (!main) return;
  if (force || follow) {
    requestAnimationFrame(() => { main.scrollTop = main.scrollHeight; });
  }
}
function distB() {
  const main = $("chatScroll");
  if (!main) return 0;
  return main.scrollHeight - main.scrollTop - main.clientHeight;
}

function withCaret(h) {
  if (/<\/p>$/.test(h)) return h.replace(/<\/p>$/, '<span class="caret"></span></p>');
  return h + '<span class="caret"></span>';
}

/* -----------------------------------------------------------
   STATUS CHIP
   ----------------------------------------------------------- */
const STAGES = ["Thinking", "Analyzing", "Planning steps"];
function startChip(chip) {
  let i = 0, tm;
  const n = Math.floor(Math.random() * 1e6);
  chip.innerHTML =
    '<span class="spark">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="sgc' + n + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#c3f53c"/>' +
          '<stop offset=".55" stop-color="#ff6b4a"/>' +
          '<stop offset="1" stop-color="#7c5cff"/>' +
        "</linearGradient></defs>" +
        '<path fill="url(#sgc' + n + ')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>' +
      "</svg>" +
    "</span>" +
    '<span class="shimmer status-text">Thinking</span>';
  const label = chip.querySelector(".status-text");
  const setL = (x) => { label.style.opacity = 0; clearTimeout(tm); tm = setTimeout(() => { label.textContent = x; label.style.opacity = 1; }, 170); };
  const iv = setInterval(() => { i = (i + 1) % STAGES.length; setL(STAGES[i]); }, 1400);
  return {
    write() { if (chip.dataset.w) return; chip.dataset.w = 1; clearInterval(iv); setL("Writing"); },
    done() {
      clearInterval(iv); clearTimeout(tm);
      label.classList.remove("shimmer");
      label.style.opacity = 1;
      label.textContent = "Done";
      chip.classList.add("done");
      setTimeout(() => chip.classList.add("fade-out"), 900);
      setTimeout(() => chip.remove(), 1500);
    },
    stop() { clearInterval(iv); clearTimeout(tm); chip.remove(); },
  };
}

/* -----------------------------------------------------------
   WORKER STREAM
   ----------------------------------------------------------- */
async function workerStream(messages, onText, signal, onThought, isGen) {
  const headers = await authHeaders();
  let r;
  try {
    r = await fetch(WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, mode: "Auto", isGen: !!isGen }),
      signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") return "";
    throw { code: "net", info: "Can't reach the server" };
  }
  if (!r.ok) {
    let msg = "";
    try { const j = await r.json(); msg = (j.error && j.error.message) || ""; } catch (_) {}
    const code =
      r.status === 401 ? "auth" :
      r.status === 403 ? "pro"  :
      r.status === 429 ? "rate" :
      r.status === 413 ? "big"  : "http";
    throw { code, info: r.status + (msg ? " " + msg.slice(0, 140) : "") };
  }
  if (!r.body) throw { code: "http", info: "Empty response" };

  let full = "", thought = "", used = 0, aborted = false, gotFirst = false;
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  const firstTimer = setTimeout(() => { try { rd.cancel(); } catch (_) {} }, FIRST_TOKEN_MS);

  try {
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const ln of lines) {
        if (!ln.startsWith("data:")) continue;
        const dd = ln.slice(5).trim();
        if (!dd || dd === "[DONE]") continue;
        try {
          const j = JSON.parse(dd);
          const cd = j.candidates && j.candidates[0];
          if (cd && cd.content && cd.content.parts) {
            for (const p of cd.content.parts) {
              if (!p.text) continue;
              if (p.thought) {
                thought += p.text;
                if (onThought) onThought(thought);
              } else {
                if (!gotFirst) { gotFirst = true; clearTimeout(firstTimer); }
                full += p.text;
                onText(full);
              }
            }
          }
          if (j.usageMetadata) used = j.usageMetadata.totalTokenCount || used;
        } catch (_) {}
      }
    }
  } catch (e) {
    if (e && e.name === "AbortError") aborted = true;
    else if (!gotFirst) throw e;
  } finally {
    clearTimeout(firstTimer);
  }

  if (used > 0) addTokens(used);
  else if (full) addTokens(Math.ceil(full.length / 4));

  if (!full && !aborted) {
    if (thought) throw { code: "thoughtonly", info: "Model reasoned but didn't finish" };
    throw { code: "empty" };
  }
  return full;
}

/* -----------------------------------------------------------
   SYSTEM PROMPT
   ----------------------------------------------------------- */
function buildUserContext() {
  if (!userProfile) return "";
  const p = userProfile, parts = [];
  if (p.name) parts.push("Name: " + p.name);
  if (p.class_level) parts.push("Class: " + p.class_level);
  if (p.board) parts.push("Board: " + p.board);
  if (p.preparing_for) parts.push("Preparing for: " + p.preparing_for);
  if (p.target_score) parts.push("Target score: " + p.target_score);
  if (!parts.length) return "";
  return "USER CONTEXT: " + parts.join(" · ") + "\n\n";
}

function buildSystemPrompt(intent) {
  const d = getTokens();
  const planLine = pro ? "Pro" : "Free";
  const limit = pro ? 750000 : 100000;
  let sys = "";
  if (intent === "studykit") {
    sys +=
      "STRUCTURED OUTPUT MODE.\nOutput ONLY these three sections, in this exact order.\n\n" +
      "## 📖 Notes\n[5-8 short paragraphs. Bold key terms with **term**.]\n\n" +
      "## 🎴 Flashcards\n12 cards, each EXACTLY:\nF: <question>\nB: <answer>\n\n" +
      "## 📝 Quiz\n8 MCQs, each EXACTLY:\nQ: <question>\nA) ...\nB) ...\nC) ...\nD) ...\nAns: <A|B|C|D>\nEx: <one line>\n\n";
  } else if (intent === "flashcard") {
    sys +=
      "STRUCTURED OUTPUT MODE.\nOutput ONLY:\n\n## 🎴 Flashcards\n" +
      "12 cards, each EXACTLY:\nF: <question>\nB: <answer>\n\n";
  } else if (intent === "quiz") {
    sys +=
      "STRUCTURED OUTPUT MODE.\nOutput ONLY:\n\n## 📝 Quiz\n" +
      "8 MCQs, each EXACTLY:\nQ: <question>\nA) ...\nB) ...\nC) ...\nD) ...\nAns: <A|B|C|D>\nEx: <one line>\n\n";
  }

  sys +=
    "You are Zyro — an AI study buddy for Indian students. Talk like a smart older brother: casual, warm, direct.\n\n" +
    "RULES:\n- Never say 'Sure!', 'Great question!', 'As an AI', 'I hope this helps'.\n" +
    "- No preambles, no closings, no restating the question.\n- Use contractions. Short sentences.\n- If unsure, say so in one line. Never invent.\n- Under 300 words unless the request needs more.\n\n";

  if (curSubject && curSubject !== "General") {
    sys += "THIS CHAT IS ABOUT: " + curSubject + " ONLY.\n\n";
  }

  sys += buildUserContext();

  sys +=
    "USER: Plan=" + planLine + ", Limit=" + limit + "/month, Used=" + d.used + "\n\n" +
    "FORMAT: Markdown. Code in fenced blocks with language tag. LaTeX as $inline$ or $$display$$.\n\n" +
    "Today: " + new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".";

  return sys;
}

function buildApiMessages(h) {
  const N = 12, MAX = 60000;
  const trimmed = h.filter((m) => m.role === "user" || m.role === "assistant");
  if (!trimmed.length) return [];
  const idxs = [];
  for (let i = Math.max(0, trimmed.length - N); i < trimmed.length; i++) idxs.push(i);
  let totalChars = 0;
  idxs.forEach((i) => (totalChars += (trimmed[i].content || "").length));
  while (idxs.length && totalChars > MAX) {
    const drop = idxs.shift();
    totalChars -= (trimmed[drop].content || "").length;
  }
  const out = [];
  for (const i of idxs) {
    const m = trimmed[i];
    if (m.role === "user") out.push({ role: "user", content: m.show || m.content });
    else out.push({ role: "assistant", content: m.content });
  }
  return out;
}

/* -----------------------------------------------------------
   RUN
   ----------------------------------------------------------- */
function setGo(on) {
  const go = $("go");
  if (!go) return;
  go.classList.toggle("muted", !on);
}
function updateSendState() {
  const t = $("t");
  const has = (t && t.value.trim().length) || pending.length;
  setGo(!!has);
}

const ERR = {
  rate: "Zyro is busy right now. Try again in a minute.",
  origin: "This site isn't allowed to use the server.",
  auth: "Please sign in to continue.",
  pro: "This feature is for Pro users.",
  big: "That message or file is too large.",
  empty: "Zyro sent back nothing. Try rephrasing.",
  thoughtonly: "Zyro reasoned but didn't finish. Try again.",
  net: "Can't reach the server. Check your connection.",
  http: "Something went wrong on the server.",
};

async function run(show, full, attNames, imgs, intent) {
  if (intent === undefined) intent = detectGenIntent(show);
  imgs = imgs || [];
  if (busy) return;
  busy = true; streaming = true;
  ctrl = new AbortController();
  setGo(false);

  const hero = $("hero"); if (hero) hero.style.display = "none";
  const logEl = $("log"); if (logEl) logEl.classList.add("on");

  addUserMsg(show, attNames, imgs);
  const d = addAssistantMsg();
  const body = d.querySelector(".body");
  const chip = d.querySelector(".status-chip");
  const c = startChip(chip);
  down(1);

  let hadThought = false;
  const onThought = (th) => { hadThought = true; thinkUpdate(d, th); };
  let lastRender = 0, lastText = "";
  const emit = (x) => {
    c.write();
    if (x === lastText) return;
    const now = performance.now();
    const throttle = x.length > 6000 ? 300 : 140;
    if (now - lastRender > throttle) {
      lastRender = now;
      lastText = x;
      setH(body, withCaret(md(x)));
      down();
    }
  };

  const runTimeout = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, STREAM_TIMEOUT_MS);

  try {
    const isGen = intent === "studykit" || intent === "flashcard" || intent === "quiz";
    const msgs = [
      { role: "system", content: buildSystemPrompt(intent) },
      ...buildApiMessages(hist),
      imgs.length
        ? { role: "user", content: full, images: imgs }
        : { role: "user", content: full },
    ];

    let out;
    try {
      out = await workerStream(msgs, emit, ctrl.signal, onThought, isGen);
    } catch (e1) {
      if (e1 && e1.code === "empty" && !ctrl.signal.aborted) {
        toast("Retrying...");
        out = await workerStream(msgs, emit, ctrl.signal, onThought, isGen);
      } else throw e1;
    }
    clearTimeout(runTimeout);

    out = out || "(empty response)";
    streaming = false;
    setH(body, md(out));
    thinkFinish(d, ((Date.now() - (run._t0 || Date.now())) / 1000).toFixed(1), hadThought);

    const acts = document.createElement("div");
    acts.className = "acts";
    acts.innerHTML =
      '<button type="button" data-like>Helpful</button>' +
      '<button type="button" data-copywhole>Copy</button>' +
      '<button type="button" data-regen>Again</button>';
    d.appendChild(acts);

    const kit = parseStudyKit(out);
    if (kit.notes || kit.cards.length || kit.quiz.length) {
      const ln = document.createElement("div");
      ln.innerHTML = launcherHTML(kit);
      const lc = ln.firstElementChild;
      d.appendChild(lc);
      wireLauncher(lc, kit);
    }

    if (!cur) {
      cur = {
        id: Date.now().toString(36),
        title: (show || attNames[0] || "Chat").replace(/\s+/g, " ").slice(0, 40),
        msgs: hist, ts: Date.now(), subject: curSubject || "General",
      };
      chats.unshift(cur);
    } else {
      cur.subject = curSubject || "General";
    }
    cur.ts = Date.now();
    hist.push(
      { role: "user", content: full, show, att: attNames, imgs: imgs.length ? imgs : undefined },
      { role: "assistant", content: out }
    );
    if (hist.length > 60) hist.splice(0, hist.length - 60);
    chats = [cur, ...chats.filter((x) => x !== cur)];
    saveChats();
    c.done();
    bumpStreak();
    renderStreak();
  } catch (e) {
    clearTimeout(runTimeout);
    streaming = false;
    c.stop();
    if (e && e.name === "AbortError") {
      body.innerHTML = '<span style="color:var(--bad)">(stopped)</span>';
    } else {
      const t = $("t");
      if (t && e && e.code !== "auth" && e.code !== "pro") {
        t.value = show;
        t.dispatchEvent(new Event("input"));
      }
      const msg = (e && ERR[e.code]) || ("Failed: " + ((e && e.info) || (e && e.message) || "network problem"));
      body.innerHTML = '<span style="color:var(--bad)">' + esc(msg) + "</span>";
      if (e && e.code === "pro") openProPaywall("feature");
    }
    thinkFinish(d, "0", hadThought);
  }
  busy = false;
  ctrl = null;
  setGo(true);
  down();
}

/* -----------------------------------------------------------
   SEND
   ----------------------------------------------------------- */
function triggerSend() {
  if (busy) { if (ctrl) ctrl.abort(); return; }
  const t = $("t");
  if (!t) return;
  const v = t.value;
  t.value = "";
  t.style.height = "auto";
  updateSendState();
  send(v);
}

function send(text) {
  const items = pending.slice();
  if (busy || (!text.trim() && !items.length)) return;
  const files = items.filter((f) => !f.img);
  const imgs = items.filter((f) => f.img).map((f) => f.img);

  if (curSubject === "General" && text.trim().length > 3) {
    const guessed = detectSubject(text);
    if (guessed) { curSubject = guessed; paintSubjectChip(); }
  }

  const intent = detectGenIntent(text);

  if (intent && (intent === "mock" || intent === "viva")) {
    pending = []; pendingKind = null; renderAtts();
    if (intent === "viva") { toast("Viva is coming soon"); return; }
    if (!pro) { openProPaywall("feature"); return; }
  }

  if (!pro && (intent === "studykit" || intent === "flashcard" || intent === "quiz")) {
    if (!genAllowed(intent)) {
      pending = []; pendingKind = null; renderAtts();
      openProPaywall("limit", intent);
      return;
    }
    bumpGen(intent);
  }

  const show = text.trim() || (imgs.length ? "Describe this image." : "Review the attached files.");
  const full = show + files.map((f) => "\n\n--- " + f.name + " ---\n" + f.text).join("");
  const names = files.map((f) => f.name);

  pending = []; pendingKind = null; renderAtts();
  run(show, full, names, imgs, intent);
}

/* -----------------------------------------------------------
   ATTACHMENTS
   ----------------------------------------------------------- */
function renderAtts() {
  const a = $("atts");
  if (!a) return;
  a.innerHTML = "";
  pending.forEach((f, i) => {
    const c = document.createElement("span");
    c.className = "att";
    if (f.img) {
      const im = document.createElement("img");
      im.alt = ""; im.src = "data:" + f.img.mime + ";base64," + f.img.data;
      c.appendChild(im);
    }
    const n = document.createElement("span");
    n.textContent = f.name;
    c.appendChild(n);
    const x = document.createElement("button");
    x.type = "button"; x.textContent = "✕";
    x.addEventListener("click", () => { pending.splice(i, 1); renderAtts(); updateSendState(); });
    c.appendChild(x);
    a.appendChild(c);
  });
}

/* -----------------------------------------------------------
   AUTH
   ----------------------------------------------------------- */
let authMode = "signin";

function setAuthMode(m) {
  authMode = m;
  const title = $("amTitle"), sub = $("amSub"), go = $("amGo"), sw = $("amSwitch");
  if (!title) return;
  if (m === "signup") {
    title.textContent = "Create your account";
    sub.textContent = "Sync chats across devices. Free.";
    go.textContent = "Create account";
    sw.textContent = "Sign in";
  } else {
    title.textContent = "Sign in";
    sub.textContent = "Sync your chats across devices.";
    go.textContent = "Sign in";
    sw.textContent = "Create one";
  }
  const msg = $("amMsg"); if (msg) msg.textContent = "";
}

function openAuth(mode) {
  setAuthMode(mode || "signin");
  const m = $("authModal");
  if (m) m.classList.add("on");
  setTimeout(() => { const e = $("amEmail"); if (e) e.focus(); }, 60);
}
function closeAuth() {
  const m = $("authModal");
  if (m) m.classList.remove("on");
  const pw = $("amPw"); if (pw) pw.value = "";
  const msg = $("amMsg"); if (msg) msg.textContent = "";
}
window.openAuth = openAuth;

/* -----------------------------------------------------------
   PROFILE
   ----------------------------------------------------------- */
async function loadProfile() {
  if (!user) return;
  try {
    const s = await sbClient();
    const { data } = await s.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      userProfile = data;
      pro = !!(data.pro && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date()));
      total = pro ? TOKEN_LIMITS.pro : TOKEN_LIMITS.free;
    } else {
      await s.from("profiles").upsert({ id: user.id, pro: false, onboarded: false });
      userProfile = { id: user.id, pro: false, onboarded: false };
      pro = false;
      total = TOKEN_LIMITS.free;
    }
    renderTokenUI();
    renderAccount();
  } catch (_) {}
}

/* -----------------------------------------------------------
   CHAT LIST
   ----------------------------------------------------------- */
function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const hms = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  if (d.toDateString() === now.toDateString()) return "Today " + hms;
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return "Yesterday " + hms;
  return d.getDate() + " " + d.toLocaleString("en", { month: "short" });
}

function renderList() {
  const l = $("chatsList");
  if (!l) return;
  l.innerHTML = "";
  const arr = [...chats.filter((c) => c.pin), ...chats.filter((c) => !c.pin)].slice(0, 30);
  if (!arr.length) {
    l.innerHTML = '<div style="color:var(--dim);font-size:12px;padding:8px 11px">No chats yet</div>';
    return;
  }
  arr.forEach((c) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "chat-item";
    const meta = SUBJECTS[c.subject || "General"] || SUBJECTS.General;
    d.innerHTML = "<b>" + meta.em + " " + esc(c.title || "Untitled") + "</b><small>" + fmtDate(c.ts) + "</small>";
    d.addEventListener("click", () => openChat(c.id));
    l.appendChild(d);
  });
}

function openChat(id) {
  try { if (ctrl) ctrl.abort(); } catch (_) {}
  busy = false; streaming = false; setGo(true);
  const c = chats.find((x) => x.id === id);
  if (!c) return;
  cur = c; hist = c.msgs.slice();
  curSubject = c.subject || "General";
  paintSubjectChip();
  const hero = $("hero"); if (hero) hero.style.display = "none";
  const logEl = $("log");
  logEl.innerHTML = "";
  logEl.classList.add("on");
  c.msgs.forEach((m) => {
    if (m.role === "user") {
      addUserMsg(m.show || m.content, m.att, m.imgs);
    } else {
      const d = addAssistantMsg();
      const sc = d.querySelector(".status-chip"); if (sc) sc.remove();
      const tl = d.querySelector(".think-live"); if (tl) tl.remove();
      setH(d.querySelector(".body"), md(m.content));
      const kit = parseStudyKit(m.content);
      if (kit.notes || kit.cards.length || kit.quiz.length) {
        const ln = document.createElement("div");
        ln.innerHTML = launcherHTML(kit);
        const lc = ln.firstElementChild;
        d.appendChild(lc);
        wireLauncher(lc, kit);
      }
    }
  });
  switchTab("chat");
  down(1);
}

function newChat() {
  try { if (ctrl) ctrl.abort(); } catch (_) {}
  busy = false; streaming = false;
  cur = null; hist = [];
  curSubject = "General";
  paintSubjectChip();
  const logEl = $("log"); logEl.innerHTML = ""; logEl.classList.remove("on");
  const hero = $("hero"); if (hero) hero.style.display = "";
  const t = $("t"); if (t) { t.value = ""; t.focus(); }
  switchTab("chat");
}

/* -----------------------------------------------------------
   ONBOARDING
   ----------------------------------------------------------- */
function getDraft() { return lsGet(K.ob, {}); }
function saveDraft(d) { lsSet(K.ob, d); }
function clearDraft() { try { localStorage.removeItem(K.ob); } catch (_) {} }

function renderStep() {
  document.querySelectorAll(".ob-step").forEach((el) => {
    el.classList.toggle("on", Number(el.dataset.step) === obStep);
  });
  const pct = ((obStep + 1) / OB_STEPS) * 100;
  const pf = $("obProgress"); if (pf) pf.style.width = pct + "%";
  const cnt = $("obCount"); if (cnt) cnt.textContent = (obStep + 1) + "/" + OB_STEPS;
  const back = $("obBack"); if (back) back.disabled = obStep === 0;
  const next = $("obNextLabel");
  if (next) next.textContent = obStep === OB_STEPS - 1 ? "Create my account" : "Continue";
}

function canAdvance() {
  if (obStep === 0) return !!(obData.name && obData.name.trim().length >= 1);
  if (obStep === 1) return !!obData.dob;
  if (obStep === 2) return !!obData.class_level;
  if (obStep === 3) return !!obData.board;
  if (obStep === 4) return !!obData.preparing_for;
  if (obStep === 5) return !!obData.target_score;
  return true;
}
function updateNextBtn() {
  const b = $("obNext"); if (b) b.disabled = !canAdvance();
}
function obNext() {
  if (!canAdvance()) return;
  saveDraft(obData);
  if (obStep >= OB_STEPS - 1) { finishOnboarding(); return; }
  obStep++;
  renderStep(); updateNextBtn();
}
function obBack() {
  if (obStep === 0) return;
  obStep--;
  renderStep(); updateNextBtn();
}

function openOnboarding() {
  const ob = $("ob"); if (!ob) return;
  const d = getDraft();
  obData = {
    name: d.name || "", dob: d.dob || "",
    class_level: d.class_level || "", board: d.board || "",
    preparing_for: d.preparing_for || "", target_score: d.target_score || "",
  };
  if ($("obName")) $("obName").value = obData.name;
  if ($("obDob")) $("obDob").value = obData.dob;
  ["obClass", "obBoard", "obPrep", "obTarget"].forEach((gid) => {
    const g = $(gid); if (!g) return;
    const key =
      gid === "obClass" ? "class_level" :
      gid === "obBoard" ? "board" :
      gid === "obPrep" ? "preparing_for" : "target_score";
    g.querySelectorAll(".ob-chip").forEach((c) => c.classList.toggle("on", obData[key] === c.dataset.v));
  });
  obStep = 0;
  renderStep(); updateNextBtn();
  ob.classList.add("on");
}
function closeOnboarding() { const ob = $("ob"); if (ob) ob.classList.remove("on"); }
window.openOnboarding = openOnboarding;

async function finishOnboarding() {
  saveDraft(obData);
  if (user) {
    const ok = await saveOnboardingToCloud();
    if (ok) {
      clearDraft();
      try { localStorage.setItem(K.onboard, "1"); } catch (_) {}
      closeOnboarding();
      if (userProfile) userProfile.onboarded = true;
      toast("Welcome, " + (obData.name || "friend") + "!");
      return;
    }
  }
  closeOnboarding();
  openAuth("signup");
}

async function saveOnboardingToCloud() {
  if (!user) return false;
  try {
    const s = await sbClient();
    const payload = {
      name: obData.name || null, dob: obData.dob || null,
      class_level: obData.class_level || null, board: obData.board || null,
      preparing_for: obData.preparing_for || null, target_score: obData.target_score || null,
      onboarded: true,
    };
    const { error } = await s.from("profiles").upsert({ id: user.id, ...payload });
    if (error) return false;
    userProfile = Object.assign({}, userProfile || {}, payload);
    return true;
  } catch (_) { return false; }
}

window.__zyroSavePendingOnboarding = async () => {
  const d = getDraft();
  if (!d || !d.name || !user) return;
  obData = d;
  const ok = await saveOnboardingToCloud();
  if (ok) {
    clearDraft();
    try { localStorage.setItem(K.onboard, "1"); } catch (_) {}
    toast("Welcome, " + (obData.name || "friend") + "!");
  }
};

/* -----------------------------------------------------------
   ACCOUNT TAB
   ----------------------------------------------------------- */
function renderAccount() {
  const ava = $("acctAvaLg"), email = $("acctEmailLg"), meta = $("acctMetaSm");
  if (ava) ava.textContent = user ? (user.email || "Z").toUpperCase()[0] : "?";
  if (email) email.textContent = user ? (user.email || "") : "Not signed in";
  if (meta) meta.textContent = user ? ("Signed in" + (pro ? " · Pro" : " · Free")) : "Tap below to sign in";

  const gen = getGen();
  const cap = DAILY_LIMITS[pro ? "pro" : "free"];
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set("acctKitToday",  (gen.studykit  || 0) + " / " + cap.studykit);
  set("acctCardToday", (gen.flashcard || 0) + " / " + cap.flashcard);
  set("acctQuizToday", (gen.quiz      || 0) + " / " + cap.quiz);
  renderTokenUI();

  const proCard = $("acctProCard");
  if (proCard) proCard.style.display = pro ? "none" : "";
}

/* -----------------------------------------------------------
   SUBJECTS TAB
   ----------------------------------------------------------- */
function renderSubjects() {
  const list = $("subjectsList");
  if (!list) return;
  list.innerHTML = "";
  const subs = ["General", "Maths", "Physics", "Chemistry", "Biology", "English", "CS", "Social"];
  subs.forEach((name) => {
    const meta = SUBJECTS[name] || SUBJECTS.General;
    const card = document.createElement("div");
    card.className = "subj-progress";
    const count = chats.filter((c) => (c.subject || "General") === name).length;
    card.innerHTML =
      '<div class="row1">' +
        '<span class="em">' + meta.em + '</span>' +
        '<div class="tx"><b>' + name + '</b><span>' + count + ' chat' + (count === 1 ? "" : "s") + '</span></div>' +
      '</div>';
    card.addEventListener("click", () => {
      curSubject = name;
      paintSubjectChip();
      switchTab("chat");
      const t = $("t"); if (t) t.focus();
    });
    list.appendChild(card);
  });
}

/* -----------------------------------------------------------
   STUDY KIT PARSER
   ----------------------------------------------------------- */
function parseStudyKit(text) {
  const kit = { notes: "", cards: [], quiz: [] };
  if (!text) return kit;
  const notesM = text.match(/(?:^|\n)#{1,3}\s*(?:📖\s*)?Notes\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:🎴|📝|Flashcards|Quiz)|$)/i);
  if (notesM) kit.notes = notesM[1].trim();
  const fcM = text.match(/(?:^|\n)#{1,3}\s*(?:🎴\s*)?(?:Flash\s*cards?|Flashcards?)\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:📖|📝|Notes|Quiz)|$)/i);
  if (fcM) {
    const re = /^\s*F:\s*(.+?)\s*\n\s*B:\s*(.+?)(?=\n\s*F:|\n\s*#{1,3}|\n\s*$)/gims;
    let m;
    while ((m = re.exec(fcM[1]))) kit.cards.push({ a: m[1].trim(), b: m[2].trim() });
  }
  const qM = text.match(/(?:^|\n)#{1,3}\s*(?:📝\s*)?Quiz\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:📖|🎴|Notes|Flashcards)|$)/i);
  if (qM) {
    const re = /^\s*Q:\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Ans:\s*([A-D])\s*(?:\n\s*Ex:\s*(.+?))?(?=\n\s*Q:|\n\s*#{1,3}|\n\s*$)/gims;
    let m;
    while ((m = re.exec(qM[1]))) {
      kit.quiz.push({
        q: m[1].trim(),
        opts: [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()],
        ans: m[6].toUpperCase(),
        ex: (m[7] || "").trim(),
      });
    }
  }
  return kit;
}

function launcherHTML(kit) {
  let parts = "";
  if (kit.notes) parts += '<span class="kpart">Notes</span>';
  if (kit.cards.length) parts += '<span class="kpart">' + kit.cards.length + ' cards</span>';
  if (kit.quiz.length) parts += '<span class="kpart">' + kit.quiz.length + ' quiz</span>';
  let title = "Study Kit";
  if (kit.notes && !kit.cards.length && !kit.quiz.length) title = "Notes Ready";
  else if (kit.cards.length && !kit.notes && !kit.quiz.length) title = "Flashcards Ready";
  else if (kit.quiz.length && !kit.notes && !kit.cards.length) title = "Quiz Ready";
  return (
    '<div class="kit-launcher">' +
      '<div class="kit-launcher-top">' +
        '<span class="kit-launcher-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>' +
        '<div class="kit-launcher-tx"><b>' + title + '</b><span>Open to study</span></div>' +
      '</div>' +
      '<div class="kit-launcher-parts">' + parts + '</div>' +
      '<button class="open-kit" type="button">Open study kit</button>' +
    '</div>'
  );
}

function wireLauncher(el, kit) {
  const b = el.querySelector(".open-kit");
  if (b) b.addEventListener("click", () => openStudyPanel(kit));
}

/* -----------------------------------------------------------
   STUDY PANEL
   ----------------------------------------------------------- */
function emptyPanelHTML(emoji, title, sub) {
  return '<div class="ep-ic">' + emoji + '</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p>';
}

function openStudyPanel(kit) {
  const panel = $("studyPanel"); if (!panel) return;
  const titleEl = $("panelTitle");
  if (titleEl) titleEl.textContent = ((cur && cur.title) || "Study Kit").slice(0, 40);

  const notesEl = panel.querySelector('[data-pcontent="notes"]');
  if (notesEl) {
    if (kit.notes) {
      notesEl.classList.remove("empty-panel");
      notesEl.innerHTML =
        '<p class="p-eyebrow">Revision notes</p>' +
        '<h2 class="p-title">Quick <em>revision</em></h2>' +
        '<p class="p-sub">Everything you need. No fluff.</p>' +
        '<div class="notes">' + txt(kit.notes) + '</div>';
    } else {
      notesEl.classList.add("empty-panel");
      notesEl.innerHTML = emptyPanelHTML("📝", "No notes in this kit", "Ask Zyro for a study kit to get notes + cards + quiz.");
    }
  }

  const cardsEl = panel.querySelector('[data-pcontent="cards"]');
  if (cardsEl) {
    if (kit.cards.length) {
      cardsEl.classList.remove("empty-panel");
      renderFlipCards(cardsEl, kit.cards);
    } else {
      cardsEl.classList.add("empty-panel");
      cardsEl.innerHTML = emptyPanelHTML("🃏", "No flashcards", "Ask Zyro for a study kit to generate flashcards.");
    }
  }

  const quizEl = panel.querySelector('[data-pcontent="quiz"]');
  if (quizEl) {
    if (kit.quiz.length) {
      quizEl.classList.remove("empty-panel");
      renderQuiz(quizEl, kit.quiz);
    } else {
      quizEl.classList.add("empty-panel");
      quizEl.innerHTML = emptyPanelHTML("🎯", "No quiz", "Ask Zyro for a study kit to generate MCQs.");
    }
  }

  let tab = "notes";
  if (!kit.notes && kit.cards.length) tab = "cards";
  if (!kit.notes && !kit.cards.length && kit.quiz.length) tab = "quiz";
  panel.querySelectorAll(".ptab").forEach((t) => t.classList.toggle("active", t.dataset.ptab === tab));
  panel.querySelectorAll(".pcontent").forEach((p) => p.classList.toggle("on", p.dataset.pcontent === tab));
  panel.classList.add("on");
  const body = panel.querySelector(".panel-body"); if (body) body.scrollTop = 0;
  try { typeset(panel); } catch (_) {}
}
window.openStudyPanel = openStudyPanel;

function closeStudyPanel() { const p = $("studyPanel"); if (p) p.classList.remove("on"); }

/* -----------------------------------------------------------
   FLIP CARDS
   ----------------------------------------------------------- */
function renderFlipCards(container, cards) {
  container.innerHTML = "";
  const stage = document.createElement("div");
  stage.className = "flip-stage";
  stage.innerHTML =
    '<div class="flip-header">' +
      '<div class="flip-header-left">' +
        '<span class="flip-eyebrow">Flashcards</span>' +
        '<div class="flip-title">Tap to <em>reveal</em></div>' +
      '</div>' +
      '<div class="flip-counter"><b class="fnow">1</b> / ' + cards.length + '</div>' +
    '</div>' +
    '<div class="flip-stack"></div>' +
    '<div class="flip-actions">' +
      '<button class="flip-btn review" type="button">Review again</button>' +
      '<button class="flip-btn got" type="button">Got it</button>' +
    '</div>' +
    '<div class="flip-dots"></div>' +
    '<div class="flip-complete">' +
      '<div class="em">🎉</div>' +
      '<div class="ttl">Nice work, <em>done</em></div>' +
      '<div class="sub">All cards reviewed</div>' +
      '<div class="flip-stats">' +
        '<div class="flip-stat"><span class="v fgot">0</span><span class="l">Got it</span></div>' +
        '<div class="flip-stat"><span class="v frev">0</span><span class="l">Review</span></div>' +
        '<div class="flip-stat"><span class="v fpct">0%</span><span class="l">Score</span></div>' +
      '</div>' +
      '<button class="flip-retry" type="button">Try again</button>' +
    '</div>';
  container.appendChild(stage);

  const stackEl = stage.querySelector(".flip-stack");
  const dotsEl = stage.querySelector(".flip-dots");
  const actionsEl = stage.querySelector(".flip-actions");
  const completeEl = stage.querySelector(".flip-complete");
  const headerEl = stage.querySelector(".flip-header");
  const counterNow = stage.querySelector(".fnow");
  let idx = 0, gotIt = 0, review = 0, results = [];

  function buildDots() {
    dotsEl.innerHTML = "";
    cards.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "fdot";
      if (results[i] === "got") d.classList.add("correct");
      else if (results[i] === "review") d.classList.add("seen");
      if (i === idx) d.classList.add("active");
      dotsEl.appendChild(d);
    });
  }
  function buildCard(c, i) {
    const el = document.createElement("div");
    el.className = "flip-item";
    el.innerHTML =
      '<div class="flip-inner-c">' +
        '<div class="flip-face-c flip-front-c">' +
          '<div class="flip-top"><span class="flip-num">CARD ' + String(i + 1).padStart(2, "0") + '</span><span class="flip-tag">Question</span></div>' +
          '<div class="flip-body-c"><p>' + esc(c.a) + '</p></div>' +
          '<div class="flip-hint">Tap to reveal answer</div>' +
        '</div>' +
        '<div class="flip-face-c flip-back-c">' +
          '<div class="flip-top"><span class="flip-num">CARD ' + String(i + 1).padStart(2, "0") + '</span><span class="flip-tag">Answer</span></div>' +
          '<div class="flip-body-c"><p>' + esc(c.b) + '</p></div>' +
          '<div class="flip-hint">Got it? Tap below</div>' +
        '</div>' +
      '</div>';
    el.addEventListener("click", () => {
      el.classList.toggle("flipped");
      try { if (navigator.vibrate) navigator.vibrate(10); } catch (_) {}
    });
    return el;
  }
  function showCard() {
    stackEl.innerHTML = "";
    if (idx >= cards.length) { showComplete(); return; }
    completeEl.classList.remove("show");
    headerEl.style.display = "";
    actionsEl.style.display = "flex";
    dotsEl.style.display = "flex";
    counterNow.textContent = idx + 1;
    stackEl.appendChild(buildCard(cards[idx], idx));
    buildDots();
  }
  function advance(kind) {
    results[idx] = kind;
    if (kind === "got") gotIt++; else review++;
    idx++;
    showCard();
  }
  function showComplete() {
    stackEl.innerHTML = "";
    headerEl.style.display = "none";
    actionsEl.style.display = "none";
    dotsEl.style.display = "none";
    completeEl.classList.add("show");
    stage.querySelector(".fgot").textContent = gotIt;
    stage.querySelector(".frev").textContent = review;
    stage.querySelector(".fpct").textContent = Math.round((gotIt / cards.length) * 100) + "%";
  }
  stage.querySelector(".flip-btn.got").addEventListener("click", () => advance("got"));
  stage.querySelector(".flip-btn.review").addEventListener("click", () => advance("review"));
  stage.querySelector(".flip-retry").addEventListener("click", () => {
    idx = 0; gotIt = 0; review = 0; results = [];
    completeEl.classList.remove("show");
    showCard();
  });
  showCard();
}

/* -----------------------------------------------------------
   QUIZ
   ----------------------------------------------------------- */
function renderQuiz(container, quiz) {
  let html =
    '<p class="p-eyebrow">Pop quiz</p>' +
    '<h2 class="p-title">Let\'s <em>test</em> it</h2>' +
    '<p class="p-sub">' + quiz.length + ' questions. Tap an option to check.</p>' +
    '<div class="quiz">';
  quiz.forEach((q, i) => {
    html +=
      '<div class="quiz-item">' +
        '<div class="quiz-q"><span class="quiz-n">Q' + (i + 1) + '</span><span class="quiz-q-text">' + esc(q.q) + '</span></div>' +
        '<div class="opts">';
    ["A", "B", "C", "D"].forEach((L, j) => {
      const isCorrect = L === q.ans;
      html += '<button class="opt" type="button" data-correct="' + (isCorrect ? "1" : "0") + '"><span class="lt">' + L + '</span>' + esc(q.opts[j]) + '</button>';
    });
    html += '</div>';
    if (q.ex) html += '<div class="quiz-exp">' + esc(q.ex) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="quiz-score" id="quizScore"><span>Answered <b>0</b> / ' + quiz.length + '</span><span>Score <b>0</b></span></div>';
  container.innerHTML = html;

  const scoreEl = container.querySelector("#quizScore");
  const st = { answered: 0, correct: 0, total: quiz.length };

  container.querySelectorAll(".quiz-item").forEach((item) => {
    const opts = item.querySelectorAll(".opt");
    opts.forEach((o) => {
      o.addEventListener("click", () => {
        if (item.classList.contains("revealed")) return;
        item.classList.add("revealed");
        const right = o.dataset.correct === "1";
        opts.forEach((x) => {
          if (x.dataset.correct === "1") x.classList.add("correct");
          else if (x === o) x.classList.add("wrong");
        });
        st.answered++;
        if (right) st.correct++;
        const bolds = scoreEl.querySelectorAll("b");
        if (bolds.length >= 2) {
          bolds[0].textContent = st.answered;
          bolds[1].textContent = st.correct;
        }
        if (st.answered === st.total) {
          const pct = Math.round((st.correct / st.total) * 100);
          scoreEl.classList.add("done");
          scoreEl.innerHTML =
            '<span>Score</span><span><b>' + st.correct + '</b> / ' + st.total + ' · ' + pct + '%</span>' +
            '<div class="quiz-score-msg">' +
              (pct >= 85 ? "🔥 Killing it" : pct >= 65 ? "👍 Solid work" : pct >= 45 ? "Getting there" : "Needs revision") +
            '</div>';
        }
      });
    });
  });
}

/* -----------------------------------------------------------
   PRO PAYWALL
   ----------------------------------------------------------- */
function openProPaywall(reason, feature) {
  const existing = document.getElementById("ppModal");
  if (existing) existing.remove();
  const limits = DAILY_LIMITS[pro ? "pro" : "free"];
  const featNames = { studykit: "study kits", flashcard: "flashcards", quiz: "quizzes" };
  const title = reason === "limit" ? "You've hit today's limit" : "This one's a Pro feature";
  const sub = reason === "limit"
    ? "You've used all " + (limits[feature] || limits.studykit) + " free " + (featNames[feature] || "study kits") + " today."
    : "Unlock it with Zyro Pro · ₹349/month";
  const modal = document.createElement("div");
  modal.className = "modal on";
  modal.id = "ppModal";
  modal.style.zIndex = "9999";
  modal.innerHTML =
    '<div class="mb" style="max-width:400px">' +
      '<div style="font-size:40px;text-align:center;margin:4px 0 10px">✨</div>' +
      '<h3 style="margin:0 0 6px;text-align:center">' + title + '</h3>' +
      '<p style="margin:0 0 18px;text-align:center">' + sub + '</p>' +
      '<ul style="margin:0 0 20px;padding:0 0 0 22px;font-size:14px;color:var(--ink-2);line-height:1.9">' +
        '<li><b>750k tokens</b> per month</li>' +
        '<li><b>10 study kits</b>, <b>15 flashcard sets</b>, <b>50 quizzes</b> per day</li>' +
        '<li><b>10 files</b> per message</li>' +
        '<li><b>Full mock tests</b> with marking scheme</li>' +
      '</ul>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button id="ppUpgrade" style="padding:12px;border-radius:12px;font-weight:800;font-size:14.5px;cursor:pointer;border:0;background:var(--violet);color:#fff">Go Pro · ₹349/mo</button>' +
        '<button id="ppClose" style="padding:12px;border-radius:12px;font-weight:700;font-size:14.5px;cursor:pointer;border:1px solid var(--line-2);background:none;color:var(--ink)">Maybe later</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.querySelector("#ppUpgrade").onclick = () => { modal.remove(); openRazorpayCheckout("monthly"); };
  modal.querySelector("#ppClose").onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}
window.openProPaywall = openProPaywall;

/* -----------------------------------------------------------
   RAZORPAY
   ----------------------------------------------------------- */
async function openRazorpayCheckout(plan) {
  if (typeof Razorpay === "undefined") {
    try { await loadJS("https://checkout.razorpay.com/v1/checkout.js"); } catch (_) {}
  }
  if (typeof Razorpay === "undefined") { toast("Couldn't load payment library"); return; }
  if (!user) { toast("Sign in first"); openAuth("signin"); return; }

  const isYearly = plan === "yearly";
  const label = isYearly ? "Zyro Pro — Yearly" : "Zyro Pro — Monthly";

  toast("Creating order…");
  let res;
  try {
    const headers = await authHeaders();
    res = await fetch(WORKER_URL.replace(/\/$/, "") + "/razorpay/create-order", {
      method: "POST",
      headers,
      body: JSON.stringify({
        plan: isYearly ? "yearly" : "monthly",
        receipt: "zyro_" + Date.now(),
      }),
    });
  } catch (_) { toast("Could not reach payment server"); return; }

  const order = await res.json();
  if (!res.ok) { toast((order.error && order.error.message) || "Order failed"); return; }

  const rz = new Razorpay({
    key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
    name: "Zyro", description: label,
    prefill: { email: user.email || "" },
    theme: { color: "#7c5cff" },
    modal: { ondismiss: () => toast("Payment cancelled") },
    handler: async (response) => {
      toast("Verifying…");
      try {
        const vh = await authHeaders();
        const v = await fetch(WORKER_URL.replace(/\/$/, "") + "/razorpay/verify-payment", {
          method: "POST", headers: vh,
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const vj = await v.json();
        if (v.ok && vj.ok) {
          await loadProfile();
          showProPopup(response.razorpay_payment_id);
        } else {
          toast("Verification failed — contact support");
        }
      } catch (_) { toast("Verification error — contact support"); }
    },
  });
  rz.on("payment.failed", (resp) => {
    const d = (resp && resp.error && resp.error.description) || "unknown";
    toast("Payment failed: " + d);
  });
  rz.open();
}
window.openRazorpayCheckout = openRazorpayCheckout;

function showProPopup(paymentId) {
  const rows = [
    { em: "🚀", b: "Way more power",      s: "100k → 750k tokens / month" },
    { em: "📚", b: "Way more study kits", s: "2/day → 10/day" },
    { em: "🃏", b: "Way more flashcards", s: "3/day → 15/day" },
    { em: "🎯", b: "Way more quizzes",    s: "3/day → 50/day" },
    { em: "📎", b: "More files",          s: "5 → 10 per message" },
    { em: "🧪", b: "Full mock tests",     s: "Real exam + marking scheme" },
  ];
  const list = $("proPopupList"), idEl = $("proPopupId"), pop = $("proPopup");
  if (!list || !pop) return;
  list.innerHTML = rows.map((r) =>
    '<div class="pro-popup-row"><span class="em">' + r.em + '</span><div class="tx"><b>' + r.b + '</b><span>' + r.s + '</span></div></div>'
  ).join("");
  if (idEl) idEl.textContent = "Payment ID: " + (paymentId || "—");
  pop.classList.add("on");
  const startBtn = $("proPopupStart");
  if (startBtn) startBtn.onclick = () => { pop.classList.remove("on"); location.reload(); };
  pop.onclick = (e) => { if (e.target === pop) { pop.classList.remove("on"); location.reload(); } };
}
window.zyroShowProPopup = showProPopup;

/* -----------------------------------------------------------
   FILES
   ----------------------------------------------------------- */
async function readAny(f) {
  const isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
  if (isPdf) {
    if (!window.pdfjsLib) {
      await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
    let text = "";
    const maxPages = Math.min(pdf.numPages, 80);
    for (let i = 1; i <= maxPages && text.length < FILE_CHAR_LIMIT; i++) {
      try {
        const tc = await (await pdf.getPage(i)).getTextContent();
        text += tc.items.map((x) => x.str).join(" ") + "\n";
      } catch (_) {}
    }
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length >= 200) return { kind: "text", text: clean };
    return { kind: "error", error: f.name + " — scanned PDF, no text extracted" };
  }
  return { kind: "text", text: await f.text() };
}

function readImg(f) {
  return new Promise((ok, no) => {
    if (!/^image\//i.test(f.type)) { no(new Error("not image")); return; }
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      try {
        const M = 1024, k = Math.min(1, M / Math.max(im.width, im.height));
        const w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
        x.drawImage(im, 0, 0, w, h);
        const d = c.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(url);
        ok({ mime: "image/jpeg", data: d.split(",")[1] });
      } catch (e) { no(e); }
    };
    im.onerror = () => { URL.revokeObjectURL(url); no(new Error("bad image")); };
    im.src = url;
  });
}

/* -----------------------------------------------------------
   BOOT
   ----------------------------------------------------------- */
async function boot() {
  /* Theme */
  const savedTheme = (() => { try { return localStorage.getItem(K.theme); } catch (_) { return null; } })();
  if (savedTheme === "dark") setTheme("dark");

  /* Theme button */
  const topTheme = $("topTheme");
  if (topTheme) topTheme.addEventListener("click", (e) => { e.stopPropagation(); toggleTheme(); });

  /* Tabs */
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab)));

  /* Subject chip + picker */
  const chip = $("subjectChip");
  if (chip) chip.addEventListener("click", (e) => { e.stopPropagation(); openSubjectPicker(); });
  const subjClose = $("subjectClose");
  if (subjClose) subjClose.addEventListener("click", closeSubjectPicker);
  const subjModal = $("subjectModal");
  if (subjModal) subjModal.addEventListener("click", (e) => { if (e.target === subjModal) closeSubjectPicker(); });
  const subjGrid = $("subjectGrid");
  if (subjGrid) subjGrid.querySelectorAll(".modal-subj").forEach((b) => {
    b.addEventListener("click", () => {
      curSubject = b.dataset.s || "General";
      paintSubjectChip();
      closeSubjectPicker();
      toast(curSubject === "General" ? "Unlocked" : "Locked to " + curSubject);
    });
  });

  /* Input + send */
  const t = $("t");
  if (t) {
    t.addEventListener("input", () => {
      t.style.height = "auto";
      t.style.height = Math.min(t.scrollHeight, 160) + "px";
      updateSendState();
    });
    t.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(hover:hover)").matches) {
        e.preventDefault();
        triggerSend();
      }
    });
  }
  const goBtn = $("go");
  if (goBtn) goBtn.addEventListener("click", triggerSend);

  /* Plus / actions menu */
  const pb = $("plusBtn"), am = $("actionsMenu");
  if (pb && am) {
    pb.addEventListener("click", (e) => {
      e.stopPropagation();
      am.classList.toggle("open");
      pb.classList.toggle("active");
    });
    document.addEventListener("click", () => {
      am.classList.remove("open");
      pb.classList.remove("active");
    });
    am.addEventListener("click", (e) => e.stopPropagation());
    am.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        am.classList.remove("open");
        pb.classList.remove("active");
        if (btn.dataset.soon) { toast("Coming soon"); return; }
        handleAction(btn.dataset.action);
      });
    });
  }

  /* Attachments */
  const imgInput = $("img");
  if (imgInput) imgInput.addEventListener("change", async (e) => {
    const fs = [...e.target.files]; e.target.value = "";
    const L = LIMITS[pro ? "pro" : "free"];
    for (const f of fs) {
      const imgCount = pending.filter((x) => x.img).length;
      if (imgCount >= L.images) { toast("Max " + L.images + " images"); break; }
      if (f.size > L.fileSize) { toast(f.name + " is too big"); continue; }
      try {
        const im = await readImg(f);
        pending.push({ name: f.name || "image", img: im });
      } catch (_) { toast("Couldn't read image"); }
    }
    renderAtts(); updateSendState();
    if (pendingKind === "snap" && pending.some((x) => x.img)) setTimeout(() => send(""), 100);
  });
  const fileInput = $("file");
  if (fileInput) fileInput.addEventListener("change", async (e) => {
    const fs = [...e.target.files]; e.target.value = "";
    const L = LIMITS[pro ? "pro" : "free"];
    for (const f of fs) {
      if (f.size > L.fileSize) { toast(f.name + " is too big"); continue; }
      const fileCount = pending.filter((x) => !x.img).length;
      if (fileCount >= L.files) { toast("Max " + L.files + " files"); break; }
      try {
        const r = await readAny(f);
        if (r.kind === "text") {
          let x = r.text.replace(/\r/g, "");
          if (x.length > FILE_CHAR_LIMIT) x = x.slice(0, FILE_CHAR_LIMIT) + "\n[...trimmed]";
          pending.push({ name: f.name, text: x });
        } else {
          toast(r.error || "Couldn't read " + f.name);
        }
      } catch (_) { toast("Couldn't read " + f.name); }
    }
    renderAtts(); updateSendState();
  });

  /* New chat buttons */
  ["newcBtn", "newChatBtn"].forEach((id) => {
    const b = $(id);
    if (b) b.addEventListener("click", newChat);
  });

  /* Auth wiring */
  const amCancel = $("amCancel"); if (amCancel) amCancel.addEventListener("click", closeAuth);
  const amSwitch = $("amSwitch");
  if (amSwitch) amSwitch.addEventListener("click", (e) => {
    e.preventDefault();
    setAuthMode(authMode === "signin" ? "signup" : "signin");
  });
  const amGo = $("amGo");
  if (amGo) amGo.addEventListener("click", async () => {
    const em = ($("amEmail").value || "").trim().toLowerCase();
    const pw = ($("amPw").value || "");
    const msg = $("amMsg"), btn = $("amGo");
    if (!em || pw.length < 6) {
      msg.style.color = "var(--bad)";
      msg.textContent = "Enter an email and password (6+ chars).";
      return;
    }
    msg.style.color = "var(--dim)";
    msg.textContent = "Working...";
    btn.disabled = true;
    try {
      const s = await sbClient();
      const r = authMode === "signup"
        ? await s.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })
        : await s.auth.signInWithPassword({ email: em, password: pw });
      if (r.error) {
        msg.style.color = "var(--bad)";
        msg.textContent = r.error.message;
      } else if (authMode === "signup" && r.data && !r.data.session) {
        msg.style.color = "var(--good)";
        msg.textContent = "Check your email to confirm, then sign in.";
      } else {
        closeAuth();
        toast(authMode === "signup" ? "Account created" : "Signed in");
        setTimeout(() => window.__zyroSavePendingOnboarding && window.__zyroSavePendingOnboarding(), 800);
      }
    } catch (_) {
      msg.style.color = "var(--bad)";
      msg.textContent = "Network error. Try again.";
    }
    btn.disabled = false;
  });
  const amEye = $("amEye"), amEyeIcon = $("amEyeIcon"), amPw = $("amPw");
  if (amEye && amEyeIcon && amPw) {
    amEye.addEventListener("click", (e) => {
      e.preventDefault();
      const showing = amPw.type === "text";
      amPw.type = showing ? "password" : "text";
      const EYE_OPEN = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
      const EYE_OFF = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
      amEyeIcon.innerHTML = showing ? EYE_OPEN : EYE_OFF;
    });
  }

  /* Account tab buttons */
  const acctProBtn = $("acctProBtn");
  if (acctProBtn) acctProBtn.addEventListener("click", () => openRazorpayCheckout("monthly"));
  const acctSignOut = $("acctSignOut");
  if (acctSignOut) acctSignOut.addEventListener("click", async () => {
    const s = await sbClient();
    try { await s.auth.signOut(); } catch (_) {}
    user = null; pro = false; total = TOKEN_LIMITS.free; userProfile = null;
    renderAccount(); renderList();
    toast("Signed out");
  });
  const acctStreakBtn = $("acctStreakBtn");
  if (acctStreakBtn) acctStreakBtn.addEventListener("click", () => {
    const s = getStreak();
    toast("🔥 " + (s.days || 0) + " day streak");
  });

  /* Onboarding wiring */
  const obNextBtn = $("obNext"); if (obNextBtn) obNextBtn.addEventListener("click", obNext);
  const obBackBtn = $("obBack"); if (obBackBtn) obBackBtn.addEventListener("click", obBack);
  const obNameEl = $("obName");
  if (obNameEl) obNameEl.addEventListener("input", () => {
    obData.name = obNameEl.value.trim(); saveDraft(obData); updateNextBtn();
  });
  const obDobEl = $("obDob");
  if (obDobEl) obDobEl.addEventListener("change", () => {
    obData.dob = obDobEl.value; saveDraft(obData); updateNextBtn();
  });
  ["obClass", "obBoard", "obPrep", "obTarget"].forEach((gid) => {
    const g = $(gid); if (!g) return;
    g.querySelectorAll(".ob-chip").forEach((c) => {
      c.addEventListener("click", () => {
        g.querySelectorAll(".ob-chip").forEach((x) => x.classList.remove("on"));
        c.classList.add("on");
        const key =
          gid === "obClass" ? "class_level" :
          gid === "obBoard" ? "board" :
          gid === "obPrep" ? "preparing_for" : "target_score";
        obData[key] = c.dataset.v;
        saveDraft(obData); updateNextBtn();
      });
    });
  });

  /* Study panel tabs + close */
  const sp = $("studyPanel");
  if (sp) {
    sp.querySelectorAll(".ptab").forEach((tab) => tab.addEventListener("click", () => {
      const target = tab.dataset.ptab;
      sp.querySelectorAll(".ptab").forEach((x) => x.classList.toggle("active", x === tab));
      sp.querySelectorAll(".pcontent").forEach((p) => p.classList.toggle("on", p.dataset.pcontent === target));
      const body = sp.querySelector(".panel-body"); if (body) body.scrollTop = 0;
    }));
  }
  const closePanelBtn = $("closePanel");
  if (closePanelBtn) closePanelBtn.addEventListener("click", closeStudyPanel);

  /* Log delegation for copy / like / regen */
  const logEl = $("log");
  if (logEl) logEl.addEventListener("click", (e) => {
    const cb = e.target.closest("[data-c]");
    if (cb) { copy(cb.closest(".cb").querySelector("pre").textContent, cb); return; }
    const cp = e.target.closest("[data-copywhole]");
    if (cp) { const b = cp.closest(".a").querySelector(".body"); if (b) copy(b.innerText, cp); return; }
    const lk = e.target.closest("[data-like]");
    if (lk) { lk.classList.add("active"); toast("Thanks!"); return; }
    const rg = e.target.closest("[data-regen]");
    if (rg) { if (rg.closest(".a") === logEl.lastElementChild) regen(); else toast("Only last reply"); return; }
  });

  /* Escape key closes overlays */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSubjectPicker();
      closeAuth();
      closeStudyPanel();
      const pp = document.getElementById("ppModal"); if (pp) pp.remove();
    }
  });

  /* Scroll tracking */
  if (logEl && logEl.parentElement) {
    logEl.parentElement.addEventListener("scroll", () => { if (distB() < 140) follow = true; });
  }

  /* UI init */
  buildChatSubjectGrid();
  paintSubjectChip();
  renderStreak();
  renderTokenUI();
  renderAccount();
  renderList();
  switchTab("chat");
  bumpStreak();
  renderStreak();

  /* Check for Worker URL */
  if (!WORKER_URL) showErr("WORKER_URL missing");

  /* Supabase session */
  try {
    const s = await sbClient();
    const { data } = await s.auth.getSession();
    user = (data && data.session && data.session.user) || null;
    if (user) await loadProfile();
    s.auth.onAuthStateChange((_e, ses) => {
      user = (ses && ses.user) || null;
      if (!user) { pro = false; total = TOKEN_LIMITS.free; userProfile = null; renderAccount(); }
      else loadProfile();
    });
  } catch (_) {}

  /* Auth query param */
  const qp = new URLSearchParams(location.search);
  if (qp.get("auth")) {
    openAuth("signin");
    history.replaceState(null, "", location.pathname);
  }

  /* Onboarding check */
  try {
    const done = localStorage.getItem(K.onboard) === "1";
    const cloudDone = userProfile && userProfile.onboarded;
    if (!done && !cloudDone) openOnboarding();
  } catch (_) { openOnboarding(); }
}

/* -----------------------------------------------------------
   ACTIONS MENU HANDLER
   ----------------------------------------------------------- */
function handleAction(act) {
  const t = $("t");
  if (act === "photo") { pendingKind = null; const i = $("img"); if (i) i.click(); return; }
  if (act === "file")  { const i = $("file"); if (i) i.click(); return; }
  if (act === "snap")  { pendingKind = "snap"; const i = $("img"); if (i) i.click(); return; }
  if (act === "studykit") { t.value = "Make me a study kit for: "; t.dispatchEvent(new Event("input")); t.focus(); return; }
  if (act === "exam")     { t.value = "Give me a proper exam answer (5 marks) for: "; t.dispatchEvent(new Event("input")); t.focus(); return; }
  if (act === "mock") {
    if (!pro) { openProPaywall("feature"); return; }
    t.value = "Generate a full mock paper with marking scheme for: ";
    t.dispatchEvent(new Event("input")); t.focus(); return;
  }
  if (act === "viva") { toast("Viva is coming soon"); return; }
}

/* -----------------------------------------------------------
   REGENERATE
   ----------------------------------------------------------- */
function regen() {
  if (busy || hist.length < 2) return;
  const m = hist[hist.length - 2];
  const logEl = $("log");
  const k = logEl.children;
  k[k.length - 1].remove();
  k[k.length - 1].remove();
  hist.splice(-2);
  run(m.show ?? m.content, m.content, m.att || [], m.imgs || []);
}

/* -----------------------------------------------------------
   COPY
   ----------------------------------------------------------- */
function copy(text, btn) {
  const ok = () => { const prev = btn.innerHTML; btn.innerHTML = "✓"; setTimeout(() => btn.innerHTML = prev, 1200); };
  const fb = () => {
    const a = document.createElement("textarea");
    a.value = text; a.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); ok(); } catch (_) {}
    a.remove();
  };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok).catch(fb);
  else fb();
}

/* -----------------------------------------------------------
   KICK OFF
   ----------------------------------------------------------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
       }
