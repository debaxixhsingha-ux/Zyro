/* ============================================================
   Zyro app.js — v3 (Subjects-first, tokens, walkthroughs)
   ============================================================ */

const WORKER_URL = "https://zyro-ai.debaxixhsingha.workers.dev/";
const SUPABASE_URL = "https://opeyjksuklfmeicmnxsh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LC3DrFcQAsG3HSILCekaFw_SOVVDxjA";

const K = {
  theme: "zyro_theme",
  obDraft: "zyro_ob_draft_v4",
  onboard: "zyro_onboarded_v4",
};

const SOURCE_COSTS = { pdf: 5000, youtube: 8000 };
const CHAT_MIN = 500;
const FILE_CHAR_LIMIT = 60000;
const STREAM_TIMEOUT_MS = 120000;
const FIRST_TOKEN_MS = 45000;

const SUBJECT_META = {
  "Maths":     { em: "📐" },
  "Physics":   { em: "⚛️" },
  "Chemistry": { em: "⚗️" },
  "Biology":   { em: "🧬" },
  "English":   { em: "📚" },
  "CS":        { em: "💻" },
  "Social":    { em: "🌏" },
  "Hindi":     { em: "📖" },
};

/* -----------------------------------------------------------
   STATE
   ----------------------------------------------------------- */
let sb = null, sbP = null;
let user = null, pro = false, profile = null;
let usage = { limit: 25000, used: 0, remaining: 25000, reset_at: 0, is_pro: false };
let subjects = [];
let setsCache = {};   // subject → [study_sets]
let currentSubject = null;
let currentSet = null;
let walkStep = "notes";
let walkStats = { cardsGot: 0, cardsReview: 0, cardsTotal: 0, quizCorrect: 0, quizTotal: 0 };
let pendingImg = null;
let busy = false, ctrl = null;
let follow = true;
let tokenTick = null;
let authMode = "signin";
let obStep = 0, obData = { name: "", dob: "", subjects: [], board: "", email: "", pw: "" };
const OB_STEPS = 4;

/* -----------------------------------------------------------
   HELPERS
   ----------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s || "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const escA = (s) => esc(s).replace(/"/g, "&quot;");

function showErr(msg) {
  const el = $("jsErr");
  if (!el) return;
  el.style.display = "block";
  el.textContent = "⚠ " + (msg || "Unknown error");
}
window.addEventListener("error", e => showErr((e.message || "") + " @" + (e.lineno || "?")));
window.addEventListener("unhandledrejection", e => showErr("Promise: " + (e.reason && (e.reason.stack || e.reason.message || e.reason) || "")));

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("on"), 2200);
}
window.toast = toast;

function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(_) { return fb; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} }

function loadJS(url) {
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = url; s.onload = ok; s.onerror = no;
    document.head.appendChild(s);
  });
}

function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
}

function humanize(ms) {
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

function countdown(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

/* -----------------------------------------------------------
   SUPABASE
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
  const icon = $("topThemeIcon");
  if (icon) {
    icon.innerHTML = next === "dark"
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
      : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  }
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(cur === "dark" ? "light" : "dark");
}

/* -----------------------------------------------------------
   TABS
   ----------------------------------------------------------- */
function switchTab(name) {
  document.querySelectorAll(".tab-screen").forEach(el =>
    el.classList.toggle("on", el.dataset.tab === name));
  document.querySelectorAll(".tab-btn").forEach(el =>
    el.classList.toggle("on", el.dataset.tab === name));
  if (name === "account") renderAccount();
  if (name === "subjects") renderSubjects();
}

/* -----------------------------------------------------------
   USAGE / TOKENS
   ----------------------------------------------------------- */
async function loadUsage() {
  if (!user) {
    usage = { limit: 25000, used: 0, remaining: 25000, reset_at: 0, is_pro: false };
    renderTokenPill(); renderAccount();
    return;
  }
  try {
    const headers = await authHeaders();
    const r = await fetch(WORKER_URL.replace(/\/$/, "") + "/usage", { headers });
    if (r.ok) {
      usage = await r.json();
      renderTokenPill(); renderAccount();
    }
  } catch (_) {}
}

function renderTokenPill() {
  const pill = $("tokenPill"), num = $("tokenPillNum");
  if (!pill || !num) return;
  const rem = usage.remaining || 0;
  num.textContent = fmtNum(rem);
  pill.classList.remove("warn", "out");
  if (rem === 0) pill.classList.add("out");
  else if (rem < usage.limit * 0.25) pill.classList.add("warn");
}

function renderAccount() {
  const ava = $("acctAvaLg"), email = $("acctEmailLg"), meta = $("acctMetaSm");
  if (ava) ava.textContent = user ? (user.email || "Z").toUpperCase()[0] : "?";
  if (email) email.textContent = user ? user.email : "Not signed in";
  if (meta) meta.textContent = user ? ("Signed in" + (pro ? " · Pro" : " · Free")) : "Sign in to save progress";

  const pct = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const tp = $("acctTokenPct"); if (tp) tp.textContent = pct + "%";
  const tf = $("acctTokenFill"); if (tf) tf.style.width = pct + "%";
  const resetEl = $("acctResetIn");
  if (resetEl) resetEl.textContent = usage.reset_at ? humanize(usage.reset_at - Date.now()) : "—";
  const planEl = $("acctPlan"); if (planEl) planEl.textContent = pro ? "Pro" : "Free";

  const proCard = $("acctProCard");
  if (proCard) proCard.style.display = pro ? "none" : "";
}

function showTokenModal(title, sub, resetAt) {
  const modal = $("tokenModal");
  if (!modal) return;
  $("tokenModalTitle").textContent = title || "You're out of tokens";
  $("tokenModalSub").textContent = sub || "Your tokens refill automatically.";
  const cd = $("tokenCountdown");
  clearInterval(tokenTick);
  const update = () => {
    if (!resetAt) { cd.textContent = "--:--:--"; return; }
    cd.textContent = countdown(resetAt - Date.now());
  };
  update();
  tokenTick = setInterval(update, 1000);
  modal.classList.add("on");
}
function hideTokenModal() {
  const modal = $("tokenModal");
  if (modal) modal.classList.remove("on");
  clearInterval(tokenTick);
}

async function checkTokens(cost) {
  await loadUsage();
  if (usage.remaining < cost) {
    showTokenModal("Not enough tokens", "You need " + fmtNum(cost) + " tokens. Resets soon.", usage.reset_at);
    return false;
  }
  return true;
}

/* -----------------------------------------------------------
   ONBOARDING
   ----------------------------------------------------------- */
function obRender() {
  document.querySelectorAll(".ob-step").forEach(el => {
    el.classList.toggle("on", Number(el.dataset.step) === obStep);
  });
  const pct = ((obStep + 1) / OB_STEPS) * 100;
  const pf = $("obProgress"); if (pf) pf.style.width = pct + "%";
  const cnt = $("obCount"); if (cnt) cnt.textContent = (obStep + 1) + "/" + OB_STEPS;
  const back = $("obBack"); if (back) back.disabled = obStep === 0;
  const nextLbl = $("obNextLabel");
  if (nextLbl) nextLbl.textContent = obStep === OB_STEPS - 1 ? "Create account" : "Continue";
  obUpdateNext();
}

function obCanAdvance() {
  if (obStep === 0) return obData.name.trim().length >= 1 && !!obData.dob;
  if (obStep === 1) return obData.subjects.length >= 1;
  if (obStep === 2) return !!obData.board;
  if (obStep === 3) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obData.email) && obData.pw.length >= 6;
  return true;
}
function obUpdateNext() {
  const b = $("obNext");
  if (b) b.disabled = !obCanAdvance();
}

async function obNext() {
  if (!obCanAdvance()) return;
  if (obStep < OB_STEPS - 1) {
    obStep++;
    obRender();
    return;
  }
  // Final step: create account
  const msg = $("obMsg");
  const btn = $("obNext");
  if (msg) { msg.style.color = "var(--dim)"; msg.textContent = "Creating your account…"; }
  if (btn) btn.disabled = true;

  try {
    const s = await sbClient();
    const r = await s.auth.signUp({
      email: obData.email.trim().toLowerCase(),
      password: obData.pw,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (r.error) {
      if (msg) { msg.style.color = "var(--bad)"; msg.textContent = r.error.message; }
      if (btn) btn.disabled = false;
      return;
    }
    if (r.data && r.data.session && r.data.user) {
      user = r.data.user;
      await saveOnboardingToCloud();
      lsSet(K.onboard, true);
      closeOnboarding();
      toast("Welcome, " + obData.name + "!");
      switchTab("subjects");
      await afterSignIn();
    } else {
      lsSet(K.obDraft, obData);
      if (msg) { msg.style.color = "var(--good)"; msg.textContent = "Check your email to confirm, then sign in."; }
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    if (msg) { msg.style.color = "var(--bad)"; msg.textContent = "Network error. Try again."; }
    if (btn) btn.disabled = false;
  }
}

function obBack() { if (obStep > 0) { obStep--; obRender(); } }

function openOnboarding() {
  const ob = $("ob"); if (!ob) return;
  const draft = lsGet(K.obDraft, null);
  if (draft) obData = Object.assign(obData, draft);
  if ($("obName")) $("obName").value = obData.name || "";
  if ($("obDob")) $("obDob").value = obData.dob || "";
  if ($("obEmail")) $("obEmail").value = obData.email || "";
  obStep = 0;
  obRender();
  ob.classList.add("on");
}
function closeOnboarding() { const ob = $("ob"); if (ob) ob.classList.remove("on"); }

async function saveOnboardingToCloud() {
  if (!user) return;
  try {
    const s = await sbClient();
    const payload = {
      id: user.id,
      name: obData.name || null,
      dob: obData.dob || null,
      board: obData.board || null,
      subjects: obData.subjects || [],
      onboarded: true,
    };
    await s.from("profiles").upsert(payload, { onConflict: "id" });
    // Also insert into user_subjects
    if (obData.subjects && obData.subjects.length) {
      const rows = obData.subjects.map(sub => ({ user_id: user.id, subject: sub }));
      await s.from("user_subjects").upsert(rows, { onConflict: "user_id,subject" });
    }
    profile = Object.assign(profile || {}, payload);
    subjects = obData.subjects.slice();
  } catch (e) { console.log("saveOnboarding:", e && e.message); }
}

async function maybeSavePendingDraft() {
  const draft = lsGet(K.obDraft, null);
  if (!draft || !user) return;
  obData = Object.assign(obData, draft);
  await saveOnboardingToCloud();
  try { localStorage.removeItem(K.obDraft); } catch (_) {}
  lsSet(K.onboard, true);
}

/* -----------------------------------------------------------
   AUTH MODAL
   ----------------------------------------------------------- */
function setAuthMode(m) {
  authMode = m;
  const t = $("amTitle"), s = $("amSub"), g = $("amGo"), sw = $("amSwitch");
  if (!t) return;
  if (m === "signup") {
    t.textContent = "Create your account";
    s.textContent = "Sync progress across devices.";
    g.textContent = "Create account";
    sw.textContent = "Sign in";
  } else {
    t.textContent = "Sign in";
    s.textContent = "Sync your progress across devices.";
    g.textContent = "Sign in";
    sw.textContent = "Create one";
  }
  const msg = $("amMsg"); if (msg) msg.textContent = "";
}
function openAuth(mode) {
  setAuthMode(mode || "signin");
  const m = $("authModal"); if (m) m.classList.add("on");
  setTimeout(() => { const e = $("amEmail"); if (e) e.focus(); }, 60);
}
function closeAuth() {
  const m = $("authModal"); if (m) m.classList.remove("on");
  const pw = $("amPw"); if (pw) pw.value = "";
  const msg = $("amMsg"); if (msg) msg.textContent = "";
}

/* -----------------------------------------------------------
   MARKDOWN
   ----------------------------------------------------------- */
const MR = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
function inl(x) {
  const st = [];
  const tk = h => "\u0001" + (st.push(h) - 1) + "\u0002";
  x = x.replace(/`([^`]+)`/g, (_, c) => tk('<code class="i">' + esc(c) + "</code>"));
  x = x.replace(MR, (m, a, b, c, d) => {
    if (d !== undefined && !/[\\^_=+\-*\/<>{}()]|^[A-Za-z]$|\d/.test(d)) return m;
    return tk('<span class="mx" data-d="' + (a !== undefined || b !== undefined ? 1 : 0) + '" data-tex="' + escA(a ?? b ?? c ?? d) + '">' + esc(m) + "</span>");
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
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(ln)) { fp(); fl(); h += "<hr>"; }
    else if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {
      fp(); if (l !== "ul") { fl(); h += "<ul>"; l = "ul"; }
      h += "<li>" + inl(m[1]) + "</li>";
    } else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) {
      fp(); if (l !== "ol") { fl(); h += "<ol>"; l = "ol"; }
      h += "<li>" + inl(m[1]) + "</li>";
    } else if (!ln.trim()) { fp(); fl(); }
    else { fl(); pa.push(ln); }
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
      h += '<div class="cb" data-lang="' + escA(lang) + '"><div class="ch"><span>' + esc(lang || "code") + '</span><span><button type="button" data-c>Copy</button></span></div><pre>' + esc(code) + '</pre></div>';
    } else h += txt(p);
  });
  return h;
}
function typeset(root) {
  if (!window.katex || busy) return;
  root.querySelectorAll(".mx:not([data-k])").forEach(el => {
    try {
      el.innerHTML = katex.renderToString(el.dataset.tex, { displayMode: el.dataset.d === "1", throwOnError: false });
      el.dataset.k = 1;
    } catch (_) {}
  });
}
function setH(el, h) { el.innerHTML = h; typeset(el); }

/* -----------------------------------------------------------
   CHAT
   ----------------------------------------------------------- */
function addUserMsg(text, imgs) {
  const d = document.createElement("div");
  d.className = "u";
  const b = document.createElement("div");
  b.textContent = text;
  if (imgs && imgs.length) {
    const w = document.createElement("div"); w.className = "th";
    imgs.forEach(im => {
      const i = document.createElement("img");
      i.alt = ""; i.src = "data:" + im.mime + ";base64," + im.data;
      w.appendChild(i);
    });
    b.appendChild(w);
  }
  d.appendChild(b);
  $("log").appendChild(d);
}

function addAssistantMsg() {
  const d = document.createElement("div");
  d.className = "a";
  const n = Math.floor(Math.random() * 1e6);
  d.innerHTML =
    '<div class="status-chip"><span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg' + n + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3f53c"/><stop offset=".55" stop-color="#ff6b4a"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs><path fill="url(#sg' + n + ')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span></div>' +
    '<div class="think-live" hidden><button type="button" class="think-live-head" aria-expanded="false"><span class="chev">›</span><span class="think-live-dot"></span><span class="think-live-label">Thinking…</span></button><div class="think-live-body"><div class="think-live-inner"></div></div></div>' +
    '<div class="body"></div>';
  $("log").appendChild(d);
  return d;
}

function thinkUpdate(d, text) {
  const el = d.querySelector(".think-live");
  if (!el) return;
  el.hidden = false;
  const inner = el.querySelector(".think-live-inner");
  if (inner) { inner.textContent = text; inner.scrollTop = inner.scrollHeight; }
  down();
}
function thinkFinish(d, hadText, seconds) {
  const el = d.querySelector(".think-live");
  if (!el) return;
  if (!hadText) { el.remove(); return; }
  el.hidden = false;
  el.classList.add("done");
  const dot = el.querySelector(".think-live-dot"); if (dot) dot.remove();
  const label = el.querySelector(".think-live-label");
  if (label) label.textContent = "Thought for " + (seconds || 0) + "s";
  const head = el.querySelector(".think-live-head");
  const body = el.querySelector(".think-live-body");
  if (head) head.setAttribute("aria-expanded", "false");
  if (body) body.classList.remove("open");
  if (head && body && !head.dataset.wired) {
    head.dataset.wired = "1";
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      body.classList.toggle("open", !open);
    });
  }
}

function down(force) {
  const main = $("chatScroll");
  if (!main) return;
  if (force || follow) requestAnimationFrame(() => { main.scrollTop = main.scrollHeight; });
}

function withCaret(h) {
  if (/<\/p>$/.test(h)) return h.replace(/<\/p>$/, '<span class="caret"></span></p>');
  return h + '<span class="caret"></span>';
}

function updateSendState() {
  const t = $("t"), go = $("go");
  if (!t || !go) return;
  const has = t.value.trim().length > 0 || !!pendingImg;
  go.classList.toggle("muted", !has);
}

async function sendChat(text) {
  if (busy) return;
  if (!text.trim() && !pendingImg) return;

  if (!user) { openAuth("signin"); return; }
  if (!(await checkTokens(CHAT_MIN))) return;

  busy = true;
  ctrl = new AbortController();
  const chatScroll = $("chatScroll");
  const hero = $("hero");
  if (hero) hero.style.display = "none";
  const log = $("log"); log.classList.add("on");

  const imgs = pendingImg ? [pendingImg] : [];
  addUserMsg(text, imgs);
  pendingImg = null;
  renderAtts();

  const d = addAssistantMsg();
  const body = d.querySelector(".body");
  const chip = d.querySelector(".status-chip");
  const statusText = chip.querySelector(".status-text");
  let stages = ["Thinking", "Analyzing", "Writing"];
  let stageIdx = 0;
  const stageInterval = setInterval(() => {
    stageIdx = (stageIdx + 1) % stages.length;
    statusText.textContent = stages[stageIdx];
  }, 1400);

  down(1);

  const t0 = Date.now();
  let hadThought = false;
  let lastRender = 0, lastText = "";

  const emit = (x) => {
    if (x === lastText) return;
    const now = performance.now();
    if (now - lastRender > 140) {
      lastRender = now; lastText = x;
      setH(body, withCaret(md(x)));
      down();
    }
  };

  const runTimeout = setTimeout(() => { try { ctrl.abort(); } catch(_) {} }, STREAM_TIMEOUT_MS);

  try {
    const headers = await authHeaders();
    const msgs = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: text || "Describe this image.", ...(imgs.length ? { images: imgs } : {}) },
    ];

    const r = await fetch(WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: msgs, mode: "Auto" }),
      signal: ctrl.signal,
    });

    if (!r.ok) {
      clearTimeout(runTimeout);
      clearInterval(stageInterval);
      let msg = "";
      try { const j = await r.json(); msg = (j.error && j.error.message) || ""; } catch(_) {}
      if (r.status === 401) { body.innerHTML = '<span style="color:var(--bad)">Please sign in again.</span>'; openAuth("signin"); }
      else if (r.status === 429 && /token/i.test(msg)) { body.innerHTML = '<span style="color:var(--bad)">' + esc(msg) + '</span>'; showTokenModal("Out of tokens", msg, usage.reset_at); }
      else body.innerHTML = '<span style="color:var(--bad)">' + esc(msg || "Something went wrong.") + '</span>';
      chip.remove();
      busy = false; ctrl = null;
      return;
    }

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", full = "", thought = "", gotFirst = false;
    const firstTimer = setTimeout(() => { try { reader.cancel(); } catch(_) {} }, FIRST_TOKEN_MS);

    for (;;) {
      const { done, value } = await reader.read();
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
              if (p.thought) { thought += p.text; hadThought = true; thinkUpdate(d, thought); }
              else {
                if (!gotFirst) { gotFirst = true; clearTimeout(firstTimer); }
                full += p.text;
                emit(full);
              }
            }
          }
        } catch (_) {}
      }
    }

    clearTimeout(runTimeout);
    clearInterval(stageInterval);
    clearTimeout(firstTimer);

    setH(body, md(full || "(empty response)"));
    chip.remove();
    thinkFinish(d, hadThought, ((Date.now() - t0) / 1000).toFixed(1));

    const acts = document.createElement("div");
    acts.className = "acts";
    acts.innerHTML = '<button type="button" data-like>Helpful</button><button type="button" data-copy>Copy</button>';
    d.appendChild(acts);

    await loadUsage();
  } catch (e) {
    clearTimeout(runTimeout);
    clearInterval(stageInterval);
    chip.remove();
    if (e && e.name === "AbortError") body.innerHTML = '<span style="color:var(--bad)">(stopped)</span>';
    else body.innerHTML = '<span style="color:var(--bad)">Network error. Try again.</span>';
  }

  busy = false; ctrl = null;
  updateSendState();
  down();
}

function buildSystemPrompt() {
  const parts = [];
  parts.push("You are Zyro — an AI study buddy for Indian students. Talk like a smart older brother: casual, warm, direct.");
  parts.push("RULES:\n- Never say 'Sure!', 'Great question!', 'As an AI', 'I hope this helps'.\n- No preambles, no closings.\n- Use contractions. Short sentences.\n- If unsure, say so in one line.\n- Under 300 words unless the request needs more.");
  if (profile && profile.name) parts.push("Student's name: " + profile.name + ".");
  if (profile && profile.board) parts.push("Board: " + profile.board + ".");
  parts.push("FORMAT: Markdown. LaTeX as $inline$ or $$display$.");
  parts.push("Today: " + new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".");
  return parts.join("\n\n");
}

/* -----------------------------------------------------------
   ATTACHMENTS
   ----------------------------------------------------------- */
function renderAtts() {
  const a = $("atts");
  if (!a) return;
  a.innerHTML = "";
  if (!pendingImg) return;
  const c = document.createElement("span");
  c.className = "att";
  const im = document.createElement("img");
  im.alt = ""; im.src = "data:" + pendingImg.mime + ";base64," + pendingImg.data;
  c.appendChild(im);
  const x = document.createElement("button");
  x.type = "button"; x.textContent = "✕";
  x.addEventListener("click", () => { pendingImg = null; renderAtts(); updateSendState(); });
  c.appendChild(x);
  a.appendChild(c);
}

function readImg(file) {
  return new Promise((ok, no) => {
    if (!/^image\//i.test(file.type)) { no(new Error("not image")); return; }
    const url = URL.createObjectURL(file), im = new Image();
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
   SUBJECTS TAB
   ----------------------------------------------------------- */
async function loadSubjects() {
  if (!user) { subjects = []; renderSubjects(); return; }
  try {
    const s = await sbClient();
    const { data } = await s.from("user_subjects").select("subject").eq("user_id", user.id);
    subjects = (data || []).map(r => r.subject);
    renderSubjects();
  } catch (_) { renderSubjects(); }
}

async function loadSetsForSubject(subject) {
  try {
    const s = await sbClient();
    const { data } = await s.from("study_sets")
      .select("id, subject, title, source_type, source_ref, source_url, tokens_cost, created_at, status")
      .eq("user_id", user.id)
      .eq("subject", subject)
      .order("created_at", { ascending: false });
    setsCache[subject] = data || [];
    return setsCache[subject];
  } catch (_) { setsCache[subject] = []; return []; }
}

async function renderSubjects() {
  const list = $("subjectsList");
  if (!list) return;
  list.innerHTML = "";

  if (!subjects.length) {
    list.innerHTML = '<div class="empty-state"><div class="ic">📚</div><h3>No subjects yet</h3><p>Add a subject and upload a PDF or YouTube link to get started.</p></div>';
    return;
  }

  for (const subject of subjects) {
    const meta = SUBJECT_META[subject] || { em: "📖" };
    const sets = setsCache[subject] || await loadSetsForSubject(subject);

    // Compute progress
    let avgPct = 0;
    if (sets.length) {
      const totals = await Promise.all(sets.map(async (set) => {
        try {
          const s = await sbClient();
          const { data } = await s.from("study_progress").select("*").eq("user_id", user.id).eq("set_id", set.id).maybeSingle();
          if (!data) return 0;
          const notesRead = data.notes_read ? 33 : 0;
          const cardsPct = data.cards_total ? Math.round((data.cards_got / data.cards_total) * 33) : 0;
          const quizPct = data.quiz_total ? Math.round((data.quiz_correct / data.quiz_total) * 34) : 0;
          return Math.min(100, notesRead + cardsPct + quizPct);
        } catch (_) { return 0; }
      }));
      avgPct = Math.round(totals.reduce((a, b) => a + b, 0) / sets.length);
    }

    const card = document.createElement("div");
    card.className = "subj-card";
    card.innerHTML =
      '<div class="row1">' +
        '<span class="em">' + meta.em + '</span>' +
        '<div class="tx"><b>' + esc(subject) + '</b>' +
          (sets.length ? '<span>' + sets.length + ' source' + (sets.length === 1 ? "" : "s") + '</span>' : '<span>No sources yet</span>') +
        '</div>' +
        (sets.length ? '<span class="pct">' + avgPct + '%</span>' : '') +
        '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
      '</div>' +
      (sets.length
        ? '<div class="bar"><div class="fill" style="width:' + avgPct + '%"></div></div>'
        : '<div class="empty-bar">Tap to add a source</div>');
    card.addEventListener("click", () => openSubjectPanel(subject));
    list.appendChild(card);
  }
}

/* -----------------------------------------------------------
   SUBJECT PANEL
   ----------------------------------------------------------- */
async function openSubjectPanel(subject) {
  currentSubject = subject;
  const panel = $("subjectPanel");
  const title = $("subjectPanelTitle");
  const eye = $("subjectEyebrow");
  if (title) title.textContent = subject;
  if (eye) eye.textContent = "Subject";
  if (panel) panel.classList.add("on");

  await refreshSourceList();
}

async function refreshSourceList() {
  const container = $("sourceList");
  if (!container || !currentSubject) return;
  container.innerHTML = '<p style="color:var(--dim);font-size:13px;text-align:center;padding:20px 0">Loading…</p>';

  const sets = await loadSetsForSubject(currentSubject);
  container.innerHTML = "";

  if (!sets.length) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="ic">📄</div>' +
        '<h3>No sources yet</h3>' +
        '<p>Upload a PDF or paste a YouTube link to build a study set.</p>' +
      '</div>';
    return;
  }

  for (const set of sets) {
    const card = document.createElement("div");
    card.className = "source-card";

    const iconSvg = set.source_type === "youtube"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

    const iconClass = set.source_type === "youtube" ? "youtube" : "pdf";
    const subtitle = set.source_type === "youtube" ? "YouTube video" : "PDF";

    card.innerHTML =
      '<div class="source-icon ' + iconClass + '">' + iconSvg + '</div>' +
      '<div class="tx">' +
        '<b>' + esc(set.title || "Untitled") + '</b>' +
        '<span>' + subtitle + ' · ' + (set.cards ? set.cards.length : '?') + ' cards</span>' +
      '</div>' +
      '<div class="progress-mini"><div class="n">—</div><div class="bar"><div class="fill" style="width:0%"></div></div></div>';

    card.addEventListener("click", () => openWalk(set.id));

    // Fetch progress async and update the mini bar
    (async () => {
      try {
        const s = await sbClient();
        const { data } = await s.from("study_progress").select("*").eq("user_id", user.id).eq("set_id", set.id).maybeSingle();
        if (!data) return;
        const notesRead = data.notes_read ? 33 : 0;
        const cardsPct = data.cards_total ? Math.round((data.cards_got / data.cards_total) * 33) : 0;
        const quizPct = data.quiz_total ? Math.round((data.quiz_correct / data.quiz_total) * 34) : 0;
        const pct = Math.min(100, notesRead + cardsPct + quizPct);
        const n = card.querySelector(".progress-mini .n");
        const f = card.querySelector(".progress-mini .fill");
        if (n) n.textContent = pct + "%";
        if (f) f.style.width = pct + "%";
      } catch (_) {}
    })();

    container.appendChild(card);
  }
}

/* -----------------------------------------------------------
   ADD SOURCE FLOW
   ----------------------------------------------------------- */
function openSrcModal() {
  const m = $("srcModal"); if (m) m.classList.add("on");
}
function closeSrcModal() { const m = $("srcModal"); if (m) m.classList.remove("on"); }

async function handlePdfSelect(file) {
  if (!file) return;
  closeSrcModal();
  await checkTokensThenProcess(SOURCE_COSTS.pdf, async () => {
    showProcessing();
    setProcStep(1);
    try {
      const text = await readPdf(file);
      if (!text || text.length < 100) {
        hideProcessing();
        toast("Couldn't read text from that PDF");
        return;
      }
      setProcStep(2);
      await new Promise(r => setTimeout(r, 400));
      setProcStep(3);
      await processSource({
        subject: currentSubject,
        source_type: "pdf",
        title: file.name.replace(/\.pdf$/i, ""),
        pdf_text: text,
      });
    } catch (e) {
      hideProcessing();
      toast("Failed: " + (e.message || "unknown"));
    }
  });
}

async function handleYoutubeSubmit(url) {
  const m = $("ytModal"); if (m) m.classList.remove("on");
  if (!url || !/youtu/.test(url)) { toast("Enter a valid YouTube link"); return; }
  await checkTokensThenProcess(SOURCE_COSTS.youtube, async () => {
    showProcessing();
    setProcStep(1);
    try {
      setProcStep(2);
      await new Promise(r => setTimeout(r, 400));
      setProcStep(3);
      await processSource({
        subject: currentSubject,
        source_type: "youtube",
        title: "YouTube lecture",
        url: url,
      });
    } catch (e) {
      hideProcessing();
      toast("Failed: " + (e.message || "unknown"));
    }
  });
}

async function checkTokensThenProcess(cost, run) {
  if (!(await checkTokens(cost))) return;
  await run();
}

async function processSource(payload) {
  try {
    const headers = await authHeaders();
    const r = await fetch(WORKER_URL.replace(/\/$/, "") + "/process-source", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) {
      hideProcessing();
      if (r.status === 429 && /token/i.test(j.error && j.error.message)) {
        showTokenModal("Not enough tokens", (j.error && j.error.message) || "", usage.reset_at);
      } else {
        toast((j.error && j.error.message) || "Failed to build study set");
      }
      return;
    }
    // Success — open the walkthrough
    hideProcessing();
    await loadUsage();
    await loadSetsForSubject(currentSubject);
    await refreshSourceList();
    openWalk(j.set_id, j);
    toast("Study set ready");
  } catch (e) {
    hideProcessing();
    toast("Network error. Try again.");
  }
}

function readPdf(file) {
  return new Promise(async (ok, no) => {
    try {
      if (!window.pdfjsLib) {
        await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      let text = "";
      const maxPages = Math.min(pdf.numPages, 80);
      for (let i = 1; i <= maxPages && text.length < FILE_CHAR_LIMIT; i++) {
        try {
          const tc = await (await pdf.getPage(i)).getTextContent();
          text += tc.items.map(x => x.str).join(" ") + "\n";
        } catch (_) {}
      }
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean.length < 100) return ok("");
      ok(clean.slice(0, FILE_CHAR_LIMIT));
    } catch (e) { no(e); }
  });
}

/* -----------------------------------------------------------
   PROCESSING OVERLAY
   ----------------------------------------------------------- */
function showProcessing() {
  const p = $("processing");
  if (p) p.classList.add("on");
  ["procStep1", "procStep2", "procStep3"].forEach(id => {
    const el = $(id); if (el) el.classList.remove("active", "done");
  });
  const s1 = $("procStep1"); if (s1) s1.classList.add("active");
}
function hideProcessing() { const p = $("processing"); if (p) p.classList.remove("on"); }
function setProcStep(n) {
  for (let i = 1; i <= 3; i++) {
    const el = $("procStep" + i);
    if (!el) continue;
    el.classList.remove("active", "done");
    if (i < n) el.classList.add("done");
    if (i === n) el.classList.add("active");
  }
}

/* -----------------------------------------------------------
   WALKTHROUGH
   ----------------------------------------------------------- */
async function openWalk(setId, cachedSet) {
  const panel = $("walkPanel");
  const title = $("walkPanelTitle");
  const eyebrow = $("walkEyebrow");
  if (!panel) return;

  let kit = cachedSet;
  if (!kit) {
    try {
      const s = await sbClient();
      const { data } = await s.from("study_sets").select("*").eq("id", setId).maybeSingle();
      kit = data;
    } catch (_) {}
  }
  if (!kit) { toast("Could not load study set"); return; }

  currentSet = kit;
  walkStep = "notes";
  walkStats = {
    cardsGot: 0,
    cardsReview: 0,
    cardsTotal: (kit.cards || []).length,
    quizCorrect: 0,
    quizTotal: (kit.quiz || []).length,
  };

  if (title) title.textContent = (kit.title || "Study set").slice(0, 40);
  if (eyebrow) eyebrow.textContent = "Study set";

  renderWalk();
  panel.classList.add("on");
}

function closeWalk() {
  const p = $("walkPanel"); if (p) p.classList.remove("on");
  currentSet = null;
}

function renderWalk() {
  const body = $("walkBody");
  if (!body || !currentSet) return;

  body.innerHTML = "";

  // Steps indicator
  const steps = document.createElement("div");
  steps.className = "walk-steps";
  ["notes", "cards", "quiz"].forEach(s => {
    const dot = document.createElement("div");
    dot.className = "walk-step-dot";
    if (walkStep === s) dot.classList.add("on");
    if (["notes", "cards", "quiz"].indexOf(s) < ["notes", "cards", "quiz"].indexOf(walkStep)) dot.classList.add("done");
    steps.appendChild(dot);
  });
  body.appendChild(steps);

  if (walkStep === "notes") renderNotesStep(body);
  else if (walkStep === "cards") renderCardsStep(body);
  else if (walkStep === "quiz") renderQuizStep(body);
  else if (walkStep === "complete") renderCompleteStep(body);
}

function renderNotesStep(body) {
  const header = document.createElement("div");
  header.className = "walk-header";
  header.innerHTML = '<div class="eyebrow">Notes</div><h2>Read through <em>once</em></h2><p>Tap next when you\'re ready for flashcards.</p>';
  body.appendChild(header);

  const notesBox = document.createElement("div");
  notesBox.className = "notes-content";
  notesBox.innerHTML = txt(currentSet.notes || "");
  body.appendChild(notesBox);
  typeset(notesBox);

  const nav = document.createElement("div");
  nav.className = "walk-nav";
  nav.innerHTML =
    '<button class="ghost" type="button" id="walkBackBtn">← Back</button>' +
    '<button class="primary" type="button" id="walkNextBtn">Next: Flashcards <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>';
  body.appendChild(nav);

  $("walkBackBtn").addEventListener("click", () => { closeWalk(); });
  $("walkNextBtn").addEventListener("click", async () => {
    await saveProgress({ notes_read: true });
    walkStep = "cards";
    renderWalk();
    body.scrollTop = 0;
  });
}

function renderCardsStep(body) {
  const cards = currentSet.cards || [];
  if (!cards.length) {
    body.innerHTML += '<div class="empty-state"><h3>No flashcards</h3><p>Skip to the quiz.</p></div>';
    const nav = document.createElement("div");
    nav.className = "walk-nav";
    nav.innerHTML = '<button class="primary" type="button" id="skipToQuiz">Go to quiz</button>';
    body.appendChild(nav);
    $("skipToQuiz").addEventListener("click", () => { walkStep = "quiz"; renderWalk(); });
    return;
  }

  const header = document.createElement("div");
  header.className = "walk-header";
  header.innerHTML = '<div class="eyebrow">Flashcards</div><h2>Tap to <em>reveal</em></h2><p>' + cards.length + ' cards. Mark what you got.</p>';
  body.appendChild(header);

  const flipHeader = document.createElement("div");
  flipHeader.className = "flip-header";
  flipHeader.innerHTML = '<span></span><div class="flip-counter"><b class="fnow">1</b> / ' + cards.length + '</div>';
  body.appendChild(flipHeader);

  const stage = document.createElement("div");
  stage.className = "flip-stage";
  body.appendChild(stage);

  const actions = document.createElement("div");
  actions.className = "flip-actions";
  actions.innerHTML =
    '<button class="flip-btn review" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Review</button>' +
    '<button class="flip-btn got" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Got it</button>';
  body.appendChild(actions);

  const dots = document.createElement("div");
  dots.className = "flip-dots";
  body.appendChild(dots);

  let idx = 0;

  function buildDots() {
    dots.innerHTML = "";
    cards.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "fdot";
      if (i === idx) d.classList.add("active");
      d.classList.add("seen");
      dots.appendChild(d);
    });
  }

  function buildCard(card, i) {
    const el = document.createElement("div");
    el.className = "flip-item";
    el.innerHTML =
      '<div class="flip-inner-c">' +
        '<div class="flip-face-c flip-front-c">' +
          '<div class="flip-top"><span class="flip-num">CARD ' + String(i + 1).padStart(2, "0") + '</span><span class="flip-tag">Question</span></div>' +
          '<div class="flip-body-c"><p>' + esc(card.a) + '</p></div>' +
          '<div class="flip-hint">Tap to reveal</div>' +
        '</div>' +
        '<div class="flip-face-c flip-back-c">' +
          '<div class="flip-top"><span class="flip-num">CARD ' + String(i + 1).padStart(2, "0") + '</span><span class="flip-tag">Answer</span></div>' +
          '<div class="flip-body-c"><p>' + esc(card.b) + '</p></div>' +
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
    stage.innerHTML = "";
    if (idx >= cards.length) {
      finishCards();
      return;
    }
    $(".fnow", flipHeader).textContent = idx + 1;
    stage.appendChild(buildCard(cards[idx], idx));
    buildDots();
  }

  function advance(kind) {
    if (kind === "got") walkStats.cardsGot++;
    else walkStats.cardsReview++;
    idx++;
    showCard();
  }

  async function finishCards() {
    await saveProgress({ cards_got: walkStats.cardsGot, cards_review: walkStats.cardsReview, cards_total: cards.length });
    walkStep = "quiz";
    renderWalk();
    body.scrollTop = 0;
  }

  actions.querySelector(".flip-btn.got").addEventListener("click", () => advance("got"));
  actions.querySelector(".flip-btn.review").addEventListener("click", () => advance("review"));

  showCard();
}

function renderQuizStep(body) {
  const quiz = currentSet.quiz || [];
  if (!quiz.length) {
    body.innerHTML += '<div class="empty-state"><h3>No quiz</h3><p>Finish the study set.</p></div>';
    const nav = document.createElement("div");
    nav.className = "walk-nav";
    nav.innerHTML = '<button class="primary" type="button" id="finishBtn">Finish</button>';
    body.appendChild(nav);
    $("finishBtn").addEventListener("click", async () => { await finishQuiz(); });
    return;
  }

  const header = document.createElement("div");
  header.className = "walk-header";
  header.innerHTML = '<div class="eyebrow">Quiz</div><h2>Let\'s <em>test</em> it</h2><p>' + quiz.length + ' questions. Tap an option to check.</p>';
  body.appendChild(header);

  const container = document.createElement("div");
  container.className = "quiz";
  quiz.forEach((q, i) => {
    const item = document.createElement("div");
    item.className = "quiz-item";
    let optsHtml = "";
    ["A", "B", "C", "D"].forEach((L, j) => {
      const isCorrect = L === q.ans;
      optsHtml += '<button class="opt" type="button" data-correct="' + (isCorrect ? "1" : "0") + '"><span class="lt">' + L + '</span>' + esc(q.opts[j]) + '</button>';
    });
    item.innerHTML =
      '<div class="quiz-q"><span class="quiz-n">Q' + (i + 1) + '</span><span class="quiz-q-text">' + esc(q.q) + '</span></div>' +
      '<div class="opts">' + optsHtml + '</div>' +
      (q.ex ? '<div class="quiz-exp">' + esc(q.ex) + '</div>' : '');
    container.appendChild(item);
  });
  body.appendChild(container);

  const scoreEl = document.createElement("div");
  scoreEl.className = "quiz-score";
  scoreEl.innerHTML = '<span>Answered <b>0</b> / ' + quiz.length + '</span><span>Score <b>0</b></span>';
  body.appendChild(scoreEl);

  const st = { answered: 0, correct: 0, total: quiz.length };

  container.querySelectorAll(".quiz-item").forEach(item => {
    const opts = item.querySelectorAll(".opt");
    opts.forEach(o => {
      o.addEventListener("click", () => {
        if (item.classList.contains("revealed")) return;
        item.classList.add("revealed");
        const right = o.dataset.correct === "1";
        opts.forEach(x => {
          if (x.dataset.correct === "1") x.classList.add("correct");
          else if (x === o) x.classList.add("wrong");
        });
        st.answered++;
        if (right) st.correct++;
        const bolds = scoreEl.querySelectorAll("b");
        if (bolds.length >= 2) { bolds[0].textContent = st.answered; bolds[1].textContent = st.correct; }
        walkStats.quizCorrect = st.correct;

        if (st.answered === st.total) {
          const pct = Math.round((st.correct / st.total) * 100);
          scoreEl.classList.add("done");
          scoreEl.innerHTML =
            '<span>Score</span><span><b>' + st.correct + '</b> / ' + st.total + ' · ' + pct + '%</span>' +
            '<div class="quiz-score-msg">' +
              (pct >= 85 ? "🔥 Killing it" : pct >= 65 ? "👍 Solid work" : pct >= 45 ? "Getting there" : "Needs revision") +
            '</div>';
          // Show finish button
          if (!$("finishQuizBtn")) {
            const nav = document.createElement("div");
            nav.className = "walk-nav";
            nav.innerHTML = '<button class="primary" type="button" id="finishQuizBtn">Finish <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></button>';
            body.appendChild(nav);
            $("finishQuizBtn").addEventListener("click", async () => {
              await saveProgress({ quiz_correct: st.correct, quiz_total: st.total, completed_at: new Date().toISOString() });
              walkStep = "complete";
              renderWalk();
              body.scrollTop = 0;
            });
          }
        }
      });
    });
  });
}

async function finishQuiz() {
  await saveProgress({ completed_at: new Date().toISOString() });
  walkStep = "complete";
  renderWalk();
}

function renderCompleteStep(body) {
  const stats = walkStats;
  const pct = stats.cardsTotal ? Math.round((stats.cardsGot / stats.cardsTotal) * 100) : 0;
  body.innerHTML =
    '<div class="complete-screen">' +
      '<div class="complete-em">🎉</div>' +
      '<h2 class="complete-title">Nice work, <em>done</em></h2>' +
      '<p class="complete-sub">Study set complete. Progress saved.</p>' +
      '<div class="complete-stats">' +
        '<div class="complete-stat"><span class="v">' + stats.cardsGot + '</span><span class="l">Cards got</span></div>' +
        '<div class="complete-stat"><span class="v">' + stats.cardsReview + '</span><span class="l">Review</span></div>' +
        '<div class="complete-stat"><span class="v">' + stats.quizCorrect + '</span><span class="l">Quiz right</span></div>' +
      '</div>' +
      '<button class="walk-nav primary" type="button" id="completeDone" style="max-width:280px">Back to subject</button>' +
    '</div>';
  $("completeDone").addEventListener("click", async () => {
    closeWalk();
    await refreshSourceList();
    await renderSubjects();
  });
}

async function saveProgress(patch) {
  if (!currentSet || !user) return;
  try {
    const s = await sbClient();
    await s.from("study_progress").upsert({
      user_id: user.id,
      set_id: currentSet.id,
      updated_at: new Date().toISOString(),
      ...patch,
    }, { onConflict: "user_id,set_id" });
  } catch (_) {}
}

/* -----------------------------------------------------------
   RAZORPAY
   ----------------------------------------------------------- */
async function openRazorpayCheckout(plan) {
  if (typeof Razorpay === "undefined") {
    try { await loadJS("https://checkout.razorpay.com/v1/checkout.js"); } catch (_) {}
  }
  if (typeof Razorpay === "undefined") { toast("Couldn't load payment library"); return; }
  if (!user) { toast("Sign in first"); openAuth("signin"); return; }

  toast("Creating order…");
  let res;
  try {
    const headers = await authHeaders();
    res = await fetch(WORKER_URL.replace(/\/$/, "") + "/razorpay/create-order", {
      method: "POST",
      headers,
      body: JSON.stringify({ plan: plan || "monthly", receipt: "zyro_" + Date.now() }),
    });
  } catch (_) { toast("Could not reach payment server"); return; }

  const order = await res.json();
  if (!res.ok) { toast((order.error && order.error.message) || "Order failed"); return; }

  const rz = new Razorpay({
    key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
    name: "Zyro", description: plan === "yearly" ? "Zyro Pro — Yearly" : "Zyro Pro — Monthly",
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
          pro = true;
          await loadUsage();
          await loadProfile();
          toast("Welcome to Pro! 🎉");
        } else { toast("Verification failed — contact support"); }
      } catch (_) { toast("Verification error — contact support"); }
    },
  });
  rz.on("payment.failed", resp => {
    const d = (resp && resp.error && resp.error.description) || "unknown";
    toast("Payment failed: " + d);
  });
  rz.open();
}

/* -----------------------------------------------------------
   PROFILE
   ----------------------------------------------------------- */
async function loadProfile() {
  if (!user) return;
  try {
    const s = await sbClient();
    const { data } = await s.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      profile = data;
      pro = !!(data.pro && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date()));
      if (Array.isArray(data.subjects)) subjects = data.subjects;
    } else {
      await s.from("profiles").upsert({ id: user.id, pro: false, onboarded: false });
      profile = { id: user.id, pro: false, onboarded: false };
      pro = false;
    }
    renderAccount();
  } catch (_) {}
}

/* -----------------------------------------------------------
   EVENT WIRING
   ----------------------------------------------------------- */
function wireUI() {
  // Theme
  const tt = $("topTheme");
  if (tt) tt.addEventListener("click", toggleTheme);

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });

  // Token pill
  const pill = $("tokenPill");
  if (pill) pill.addEventListener("click", () => {
    showTokenModal(
      usage.remaining > 0 ? "You have " + fmtNum(usage.remaining) + " tokens" : "Out of tokens",
      usage.remaining > 0
        ? "Resets in " + humanize(usage.reset_at - Date.now()) + ". Go Pro for 6× more."
        : "Refills in " + humanize(usage.reset_at - Date.now()) + ".",
      usage.reset_at
    );
  });

  // Token modal
  { const b = $("tokenUpgrade"); if (b) b.addEventListener("click", () => { hideTokenModal(); openRazorpayCheckout("monthly"); }); }
  { const b = $("tokenClose"); if (b) b.addEventListener("click", hideTokenModal); }

  // Chat input
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
        if (!busy) { const v = t.value; t.value = ""; t.style.height = "auto"; updateSendState(); sendChat(v); }
      }
    });
  }
  { const g = $("go");
    if (g) g.addEventListener("click", () => {
      if (busy) { if (ctrl) ctrl.abort(); return; }
      const v = t.value; t.value = ""; t.style.height = "auto"; updateSendState();
      sendChat(v);
    });
  }

  // Plus → image picker
  const plus = $("plusBtn");
  if (plus) plus.addEventListener("click", () => { const i = $("img"); if (i) i.click(); });

  // Image file input
  const img = $("img");
  if (img) img.addEventListener("change", async (e) => {
    const fs = [...e.target.files]; e.target.value = "";
    if (!fs.length) return;
    const f = fs[0];
    if (f.size > 10e6) { toast("Image is too big"); return; }
    try {
      pendingImg = await readImg(f);
      renderAtts(); updateSendState();
    } catch (_) { toast("Couldn't read image"); }
  });

  // PDF file input
  const pdf = $("pdf");
  if (pdf) pdf.addEventListener("change", async (e) => {
    const fs = [...e.target.files]; e.target.value = "";
    if (fs.length) await handlePdfSelect(fs[0]);
  });

  // Log delegation
  const log = $("log");
  if (log) log.addEventListener("click", (e) => {
    const cp = e.target.closest("[data-c]");
    if (cp) {
      const pre = cp.closest(".cb").querySelector("pre");
      if (pre) { navigator.clipboard.writeText(pre.textContent); cp.textContent = "✓"; setTimeout(() => cp.textContent = "Copy", 1000); }
      return;
    }
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const b = copyBtn.closest(".a").querySelector(".body");
      if (b) { navigator.clipboard.writeText(b.innerText); copyBtn.textContent = "✓"; setTimeout(() => copyBtn.textContent = "Copy", 1000); }
      return;
    }
    const like = e.target.closest("[data-like]");
    if (like) { like.classList.add("active"); toast("Thanks!"); return; }
  });

  // Chat scroll follow
  const chatScroll = $("chatScroll");
  if (chatScroll) chatScroll.addEventListener("scroll", () => {
    const dist = chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight;
    if (dist < 140) follow = true;
  });

  // Subject panel close
  { const b = $("closeSubjectPanel"); if (b) b.addEventListener("click", () => { const p = $("subjectPanel"); if (p) p.classList.remove("on"); }); }
  { const b = $("closeWalkPanel"); if (b) b.addEventListener("click", closeWalk); }

  // Add source
  { const b = $("addSourceBtn"); if (b) b.addEventListener("click", openSrcModal); }
  { const b = $("srcCancel"); if (b) b.addEventListener("click", closeSrcModal); }
  { const m = $("srcModal"); if (m) m.addEventListener("click", (e) => { if (e.target === m) closeSrcModal(); }); }
  { const b = $("srcPdfOpt"); if (b) b.addEventListener("click", () => { closeSrcModal(); const p = $("pdf"); if (p) p.click(); }); }
  { const b = $("srcYtOpt"); if (b) b.addEventListener("click", () => {
      closeSrcModal();
      const m = $("ytModal"); if (m) m.classList.add("on");
      setTimeout(() => { const u = $("ytUrl"); if (u) u.focus(); }, 100);
    });
  }

  // YouTube modal
  { const b = $("ytCancel"); if (b) b.addEventListener("click", () => { const m = $("ytModal"); if (m) m.classList.remove("on"); const u = $("ytUrl"); if (u) u.value = ""; }); }
  { const b = $("ytGo"); if (b) b.addEventListener("click", () => { const u = $("ytUrl"); const url = u ? u.value.trim() : ""; if (u) u.value = ""; handleYoutubeSubmit(url); }); }
  { const m = $("ytModal"); if (m) m.addEventListener("click", (e) => { if (e.target === m) { m.classList.remove("on"); const u = $("ytUrl"); if (u) u.value = ""; } }); }
  { const el = $("ytUrl"); if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const b = $("ytGo"); if (b) b.click(); } }); }

  // Add subject
  { const b = $("addSubjectBtn"); if (b) b.addEventListener("click", () => openAddSubjModal()); }
  { const b = $("addSubjCancel"); if (b) b.addEventListener("click", () => { const m = $("addSubjModal"); if (m) m.classList.remove("on"); }); }
  { const b = $("addSubjGo"); if (b) b.addEventListener("click", async () => {
      const picked = [...document.querySelectorAll("#addSubjChips .ob-chip.on")].map(c => c.dataset.v);
      if (!picked.length) { toast("Pick at least one"); return; }
      try {
        const s = await sbClient();
        const rows = picked.map(sub => ({ user_id: user.id, subject: sub }));
        await s.from("user_subjects").upsert(rows, { onConflict: "user_id,subject" });
        // Also update profiles.subjects
        const newSubjects = Array.from(new Set([...subjects, ...picked]));
        await s.from("profiles").update({ subjects: newSubjects }).eq("id", user.id);
        subjects = newSubjects;
        await renderSubjects();
      } catch (_) {}
      const m = $("addSubjModal"); if (m) m.classList.remove("on");
      toast("Added");
    });
  }
  { const m = $("addSubjModal"); if (m) m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("on"); }); }

  // Account
  { const b = $("acctProBtn"); if (b) b.addEventListener("click", () => openRazorpayCheckout("monthly")); }
  { const b = $("acctSignOut"); if (b) b.addEventListener("click", async () => {
      const s = await sbClient();
      try { await s.auth.signOut(); } catch (_) {}
      user = null; pro = false; profile = null; subjects = [];
      await loadUsage();
      renderAccount(); renderSubjects();
      toast("Signed out");
    });
  }

  // Onboarding
  { const b = $("obNext"); if (b) b.addEventListener("click", obNext); }
  { const b = $("obBack"); if (b) b.addEventListener("click", obBack); }
  { const el = $("obName"); if (el) el.addEventListener("input", () => { obData.name = el.value.trim(); obUpdateNext(); }); }
  { const el = $("obDob"); if (el) el.addEventListener("change", () => { obData.dob = el.value; obUpdateNext(); }); }
  { const el = $("obEmail"); if (el) el.addEventListener("input", () => { obData.email = el.value.trim(); obUpdateNext(); }); }
  { const el = $("obPw"); if (el) el.addEventListener("input", () => { obData.pw = el.value; obUpdateNext(); }); }

  // Onboarding subject chips
  const obSubj = $("obSubjects");
  if (obSubj) obSubj.querySelectorAll(".ob-chip").forEach(c => {
    c.addEventListener("click", () => {
      c.classList.toggle("on");
      const v = c.dataset.v;
      const i = obData.subjects.indexOf(v);
      if (i >= 0) obData.subjects.splice(i, 1);
      else obData.subjects.push(v);
      obUpdateNext();
    });
  });
  const obBoard = $("obBoard");
  if (obBoard) obBoard.querySelectorAll(".ob-chip").forEach(c => {
    c.addEventListener("click", () => {
      obBoard.querySelectorAll(".ob-chip").forEach(x => x.classList.remove("on"));
      c.classList.add("on");
      obData.board = c.dataset.v;
      obUpdateNext();
    });
  });
  const addSubjChips = $("addSubjChips");
  if (addSubjChips) addSubjChips.querySelectorAll(".ob-chip").forEach(c => {
    c.addEventListener("click", () => c.classList.toggle("on"));
  });

  // Onboarding eye
  { const eye = $("obEye"), icon = $("obEyeIcon"), pw = $("obPw");
    if (eye && icon && pw) eye.addEventListener("click", () => {
      const showing = pw.type === "text";
      pw.type = showing ? "password" : "text";
      icon.innerHTML = showing
        ? '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    });
  }

  // Auth modal
  { const b = $("amCancel"); if (b) b.addEventListener("click", closeAuth); }
  { const b = $("amSwitch"); if (b) b.addEventListener("click", (e) => { e.preventDefault(); setAuthMode(authMode === "signin" ? "signup" : "signin"); }); }
  { const b = $("amGo"); if (b) b.addEventListener("click", async () => {
      const em = ($("amEmail").value || "").trim().toLowerCase();
      const pw = ($("amPw").value || "");
      const msg = $("amMsg"), btn = $("amGo");
      if (!em || pw.length < 6) { msg.style.color = "var(--bad)"; msg.textContent = "Enter an email and password (6+ chars)."; return; }
      msg.style.color = "var(--dim)"; msg.textContent = "Working…"; btn.disabled = true;
      try {
        const s = await sbClient();
        const r = authMode === "signup"
          ? await s.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })
          : await s.auth.signInWithPassword({ email: em, password: pw });
        if (r.error) { msg.style.color = "var(--bad)"; msg.textContent = r.error.message; }
        else if (authMode === "signup" && r.data && !r.data.session) { msg.style.color = "var(--good)"; msg.textContent = "Check your email to confirm, then sign in."; }
        else { closeAuth(); toast(authMode === "signup" ? "Account created" : "Signed in"); }
      } catch (_) { msg.style.color = "var(--bad)"; msg.textContent = "Network error."; }
      btn.disabled = false;
    });
  }
  { const eye = $("amEye"), icon = $("amEyeIcon"), pw = $("amPw");
    if (eye && icon && pw) eye.addEventListener("click", () => {
      const showing = pw.type === "text";
      pw.type = showing ? "password" : "text";
      icon.innerHTML = showing
        ? '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    });
  }

  // Escape closes overlays
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAuth(); hideTokenModal();
      const sp = $("subjectPanel"); if (sp) sp.classList.remove("on");
      closeWalk();
      const sm = $("srcModal"); if (sm) sm.classList.remove("on");
      const ym = $("ytModal"); if (ym) ym.classList.remove("on");
      const asm = $("addSubjModal"); if (asm) asm.classList.remove("on");
    }
  });
}

function openAddSubjModal() {
  const m = $("addSubjModal"); if (!m) return;
  document.querySelectorAll("#addSubjChips .ob-chip").forEach(c => c.classList.remove("on"));
  m.classList.add("on");
}

/* -----------------------------------------------------------
   BOOT
   ----------------------------------------------------------- */
async function afterSignIn() {
  await loadProfile();
  await loadSubjects();
  await loadUsage();
  renderSubjects();
  // Periodic token refresh
  clearInterval(afterSignIn._t);
  afterSignIn._t = setInterval(() => { loadUsage(); renderAccount(); }, 60000);
}

async function boot() {
  // Restore theme
  const saved = (() => { try { return localStorage.getItem(K.theme); } catch(_) { return null; } })();
  setTheme(saved === "dark" ? "dark" : "light");

  wireUI();
  renderTokenPill();
  renderAccount();

  // Supabase session
  try {
    const s = await sbClient();
    const { data } = await s.auth.getSession();
    user = (data && data.session && data.session.user) || null;

    s.auth.onAuthStateChange(async (_e, ses) => {
      user = (ses && ses.user) || null;
      if (!user) {
        pro = false; profile = null; subjects = [];
        usage = { limit: 25000, used: 0, remaining: 25000, reset_at: 0, is_pro: false };
        renderTokenPill(); renderAccount(); renderSubjects();
      } else {
        await maybeSavePendingDraft();
        await afterSignIn();
      }
    });
  } catch (_) {}

  if (user) {
    await maybeSavePendingDraft();
    await afterSignIn();
  } else {
    // No session — check if onboarding is needed
    let onboarded = false;
    try { onboarded = localStorage.getItem(K.onboard) === "1"; } catch (_) {}
    const draft = lsGet(K.obDraft, null);
    if (!onboarded && (!user || !profile || !profile.onboarded)) {
      // If we have a draft with a name, resume from last step instead of full onboarding
      if (draft && draft.name) {
        obData = Object.assign(obData, draft);
        // If draft has name+dob+subjects+board, jump to signup step
        if (draft.name && draft.dob && draft.subjects && draft.subjects.length && draft.board) {
          obStep = 3;
        }
      }
      openOnboarding();
    }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
