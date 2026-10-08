/* =========================================================
   ZYRO app.js — v56 (subject chats)
   ========================================================= */

/* ---------- TOP HELPERS ---------- */
function loadJS(u){
  return new Promise(function(ok,no){
    var e=document.createElement("script");
    e.src=u; e.onload=ok; e.onerror=no;
    document.head.appendChild(e);
  });
}
function showErr(msg){
  try{
    var el=document.getElementById("jsErr");
    if(!el)return;
    el.style.display="block";
    el.textContent="⚠ "+(msg||"Unknown error")+"\n\nLong-press to copy this and send it to the developer.";
  }catch(_){}
}
window.addEventListener("error",function(ev){
  showErr((ev.message||"")+"\n@"+(ev.filename||"")+":"+(ev.lineno||"?")+":"+(ev.colno||"?")+"\n\n"+((ev.error&&ev.error.stack)||""));
});
window.addEventListener("unhandledrejection",function(ev){
  showErr("Promise rejection: "+(ev.reason&&(ev.reason.stack||ev.reason.message||ev.reason)||String(ev.reason)));
});

const WORKER_URL="https://zyro-ai.debaxixhsingha.workers.dev/";
const SUPABASE_URL="https://opeyjksuklfmeicmnxsh.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_LC3DrFcQAsG3HSILCekaFw_SOVVDxjA";
const TOKEN_KEY="zyro_tokens_v2";
const CI="zyro_ci";
const CK="zyro_chats";
const GEN_KEY="zyro_gen_count_v2";
const STREAK_KEY="zyro_streak_v1";
const GOAL_KEY="zyro_goal_v1";
const VISIT_KEY="zyro_last_visit_v1";
const OB_DRAFT="zyro_ob_draft";
const TOKEN_RESET_MS = 30 * 24 * 60 * 60 * 1000;
const GEN_RESET_MS = 24 * 60 * 60 * 1000;
const STREAM_TIMEOUT_MS = 120000;
const FIRST_TOKEN_MS = 45000;
const FILE_CHAR_LIMIT = 50000;

const DAILY_LIMITS = {
  free: { studykit: 2, flashcard: 3, quiz: 3 },
  pro:  { studykit: 10, flashcard: 15, quiz: 50 }
};

const SUBJECT_ICONS = {
  "General": "📖",
  "Maths": "📐",
  "Physics": "⚛️",
  "Chemistry": "⚗️",
  "Biology": "🧬",
  "English": "📚",
  "Computer Science": "💻",
  "Social Science": "🌏"
};
const SUBJECT_KEYWORDS = {
  "Maths": /\b(algebra|geometry|calculus|trigonometry|equation|integral|derivative|polynomial|triangle|quadratic|maths?|mathemat|matrix|vector|probabilit)\b/i,
  "Physics": /\b(physics|force|motion|velocity|acceleration|newton|energy|work|power|electric|magnet|circuit|wave|optic|thermodynamic)\b/i,
  "Chemistry": /\b(chemistry|chemical|reaction|acid|base|atom|molecule|element|compound|organic|inorganic|periodic|mole|bond)\b/i,
  "Biology": /\b(biology|cell|dna|gene|photosynthesis|organism|plant|animal|human|blood|nervous|tissue|enzyme)\b/i,
  "English": /\b(english|grammar|essay|poem|literature|shakespeare|writing|comprehension|vocabulary)\b/i,
  "Computer Science": /\b(code|coding|program|python|javascript|java|algorithm|function|variable|html|css|react|compile|debug|software)\b/i,
  "Social Science": /\b(history|geography|civics|economics|society|polity|constitution|freedom|revolution|map)\b/i
};

let TOTAL=100000;
let sb=null,sbP=null,user=null,pro=false;
let userProfile=null;
let chats=[],cur=null;
let curSubject="General";
let ctrl=null,hist=[],busy=false,streaming=false;
let pending=[],pendingKind=null;
let sid=0,follow=true,uAcc=0,uT=null,syncT=null;
let busyWatchdog=null;
let lastKit=null;
let stickyIntent=null, stickyIntentAt=0;
const STICKY_MS = 5 * 60 * 1000;

const RZP_WORKER_URL = WORKER_URL.replace(/\/$/, "");

/* ---------- PRO SUCCESS POPUP ---------- */
function showProPopup(paymentId){
  const esc = s => String(s||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const rows = [
    { em:"🚀", b:"Way more power",      s:"100k → 750k tokens / month" },
    { em:"📚", b:"Way more study kits", s:"2/day → 10/day" },
    { em:"🃏", b:"Way more flashcards", s:"3/day → 15/day" },
    { em:"🎯", b:"Way more quizzes",    s:"3/day → 50/day" },
    { em:"📎", b:"More files",          s:"5 files → 10 files per message" },
    { em:"⏱️", b:"Longer code runs",    s:"10s → 60s JS · 60s → 180s Py" },
    { em:"🧪", b:"Full mock tests",     s:"Real exam + marking scheme" }
  ];
  const list = document.getElementById("proPopupList");
  const idEl = document.getElementById("proPopupId");
  const pop = document.getElementById("proPopup");
  if (!list || !pop) return;
  list.innerHTML = rows.map(r =>
    '<div class="pro-popup-row">' +
      '<span class="em">' + r.em + '</span>' +
      '<div class="tx"><b>' + r.b + '</b><span>' + r.s + '</span></div>' +
    '</div>'
  ).join("");
  if (idEl) idEl.textContent = "Payment ID: " + esc(paymentId || "—");
  pop.classList.add("on");
  const startBtn = document.getElementById("proPopupStart");
  if (startBtn) startBtn.onclick = () => { pop.classList.remove("on"); location.reload(); };
  pop.onclick = e => { if (e.target === pop){ pop.classList.remove("on"); location.reload(); } };
}

/* ---------- PRO PAYWALL ---------- */
function openProPaywall(reason, feature){
  const existing = document.getElementById("ppModal");
  if (existing) existing.remove();
  const limits = DAILY_LIMITS[pro ? "pro" : "free"];
  const featNames = { studykit:"study kits", flashcard:"flashcards", quiz:"quizzes" };
  const title = reason === "limit" ? "You've hit today's limit" : "This one's a Pro feature";
  const sub = reason === "limit"
    ? "You've used all " + (limits[feature]||limits.studykit) + " free " + (featNames[feature]||"study kits") + " today. Upgrade for way more."
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
        '<li><b style="color:var(--ink)">Way more power</b> — 750k tokens / month</li>' +
        '<li><b style="color:var(--ink)">10 study kits</b> per day (free: 2)</li>' +
        '<li><b style="color:var(--ink)">15 flashcards</b> + <b style="color:var(--ink)">50 quizzes</b> per day</li>' +
        '<li><b style="color:var(--ink)">10 files</b> per message (free: 5)</li>' +
        '<li><b style="color:var(--ink)">Full mock tests</b> with marking scheme</li>' +
      '</ul>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button id="ppUpgrade" style="padding:12px;border-radius:12px;font-weight:800;font-size:14.5px;cursor:pointer;border:0;background:var(--violet);color:#fff">Go Pro · ₹349/mo</button>' +
        '<button id="ppClose" style="padding:12px;border-radius:12px;font-weight:700;font-size:14.5px;cursor:pointer;border:1px solid var(--line-2);background:none;color:var(--ink)">Maybe later</button>' +
        '<a href="mailto:zyroaisupport@gmail.com?subject=Zyro%20Support" style="text-align:center;font-size:11.5px;color:var(--dim);text-decoration:none;padding:6px;font-weight:600">Questions? zyroaisupport@gmail.com</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.querySelector("#ppUpgrade").onclick = () => {
    modal.remove();
    if (window.openRazorpayCheckout) window.openRazorpayCheckout("monthly");
  };
  modal.querySelector("#ppClose").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

/* ---------- RAZORPAY CHECKOUT ---------- */
async function openRazorpayCheckout(plan){
  const toast = (m) => (window.toast ? window.toast(m) : console.log("[toast]", m));
  const openAuth = (m) => (window.openAuth ? window.openAuth(m) : null);

  if (typeof Razorpay === "undefined"){
    try { await loadJS("https://checkout.razorpay.com/v1/checkout.js"); } catch(_) {}
  }
  if (typeof Razorpay === "undefined"){
    toast("Couldn't load payment library — check your connection");
    return;
  }
  if (!user){
    toast("Sign in first to upgrade");
    openAuth("signup");
    return;
  }
  const isYearly = plan === "yearly";
  const amount = isYearly ? 349900 : 34900;
  const label  = isYearly ? "Zyro Pro — Yearly" : "Zyro Pro — Monthly";

  toast("Creating order…");
  fetch(RZP_WORKER_URL + "/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      plan: isYearly ? "yearly" : "monthly",
      receipt: "zyro_" + Date.now(),
      notes: { email: user.email || "", plan: isYearly ? "yearly" : "monthly", user_id: user.id }
    })
  })
  .then(r => r.json().then(j => ({ ok: r.ok, status: r.status, body: j })))
  .then(res => {
    if (!res.ok){
      const m = (res.body && res.body.error && res.body.error.message) || "Order failed";
      toast(m);
      return;
    }
    const o = res.body;
    const rz = new Razorpay({
      key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id,
      name: "Zyro", description: label,
      prefill: { email: user.email || "" },
      theme: { color: "#7c5cff" },
      modal: { ondismiss: function(){ toast("Payment cancelled"); } },
      handler: function(response){
        toast("Verifying…");
        fetch(RZP_WORKER_URL + "/razorpay/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            user_id: user.id,
            amount: o.amount,
            plan: o.plan
          })
        })
        .then(v => v.json().then(j => ({ ok: v.ok, body: j })))
        .then(v => {
          if (v.ok && v.body && v.body.ok){
            pro = true;
            TOTAL = 750000;
            showProPopup(response.razorpay_payment_id);
          } else {
            toast("Verification failed — email zyroaisupport@gmail.com");
            setTimeout(() => { window.location.href = "mailto:zyroaisupport@gmail.com?subject=Payment%20issue"; }, 2000);
          }
        })
        .catch(() => toast("Verification error — email zyroaisupport@gmail.com"));
      }
    });
    rz.on("payment.failed", function(resp){
      const d = (resp && resp.error && resp.error.description) || "unknown";
      toast("Payment failed: " + d);
    });
    rz.open();
  })
  .catch(() => toast("Could not reach payment server"));
}

/* =========================================================
   BOOT
   ========================================================= */
function boot(){
  const $ = id => document.getElementById(id);
  const log = $("log"), t = $("t"), go = $("go"), main = $("main");
  if (!log || !t || !go || !main){ showErr("Core elements missing from app.html"); return; }

  const esc = s => String(s||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const escA = s => esc(s).replace(/"/g,"&quot;");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getCI = () => { try { return localStorage.getItem(CI) || ""; } catch(_) { return ""; } };

  const LIMITS = {
    free: { tokens: 100000, images: 5, files: 5,  fileSize: 10e6, jsTimeout: 10000, pyTimeout: 60000  },
    pro:  { tokens: 750000, images: 5, files: 10, fileSize: 10e6, jsTimeout: 60000, pyTimeout: 180000 }
  };
  const L = () => LIMITS[pro ? "pro" : "free"];

  /* ---------- SUBJECT DETECTION + CHIP ---------- */
  function detectSubjectFromText(text){
    if (!text) return null;
    for (const subj of Object.keys(SUBJECT_KEYWORDS)){
      if (SUBJECT_KEYWORDS[subj].test(text)) return subj;
    }
    return null;
  }
  function paintSubjectChip(){
    const chip = $("subjectChip");
    const label = $("subjectChipLabel");
    if (!chip || !label) return;
    const em = chip.querySelector(".em");
    const subj = curSubject || "General";
    label.textContent = subj;
    if (em) em.textContent = SUBJECT_ICONS[subj] || "📖";
    chip.classList.toggle("empty", subj === "General");
  }

  /* ---------- STREAK ---------- */
  function todayStr(){
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function yesterdayStr(){
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function getStreak(){
    try {
      const d = JSON.parse(localStorage.getItem(STREAK_KEY) || "null");
      if (!d || typeof d.days !== "number") return { days: 0, lastDay: "" };
      return d;
    } catch(_) { return { days: 0, lastDay: "" }; }
  }
  function saveStreak(d){ try { localStorage.setItem(STREAK_KEY, JSON.stringify(d)); } catch(_) {} }
  function bumpStreak(){
    const today = todayStr();
    const s = getStreak();
    if (s.lastDay === today) return s;
    if (s.lastDay === yesterdayStr()){ s.days = (s.days || 0) + 1; }
    else { s.days = 1; }
    s.lastDay = today;
    saveStreak(s);
    return s;
  }
  function renderStreak(){
    const badge = $("streakBadge");
    if (!badge) return;
    const s = getStreak();
    if (!s.days || !s.lastDay){ badge.style.display = "none"; return; }
    badge.style.display = "inline-flex";
    const num = badge.querySelector(".streak-num");
    if (num) num.textContent = s.days;
    if (s.days >= 3) badge.classList.add("hot");
    else badge.classList.remove("hot");
  }

  /* ---------- WEEKLY GOAL ---------- */
  function weekKey(){
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return d.getFullYear() + "-W" + week;
  }
  function getGoal(){
    try {
      const d = JSON.parse(localStorage.getItem(GOAL_KEY) || "null");
      const wk = weekKey();
      if (!d || d.week !== wk){
        const fresh = { target: 10, done: 0, week: wk };
        try { localStorage.setItem(GOAL_KEY, JSON.stringify(fresh)); } catch(_) {}
        return fresh;
      }
      if (typeof d.target !== "number") d.target = 10;
      if (typeof d.done !== "number") d.done = 0;
      return d;
    } catch(_) { return { target: 10, done: 0, week: weekKey() }; }
  }
  function saveGoal(d){ try { localStorage.setItem(GOAL_KEY, JSON.stringify(d)); } catch(_) {} }
  function bumpGoal(){
    const g = getGoal();
    g.done = (g.done || 0) + 1;
    saveGoal(g);
    renderGoal();
  }
  function renderGoal(){
    const card = $("goalCard");
    if (!card) return;
    const g = getGoal();
    card.style.display = "";
    const pct = Math.min(100, (g.done / g.target) * 100);
    const cnt = $("goalCount"); if (cnt) cnt.textContent = g.done + " / " + g.target;
    const fil = $("goalFill"); if (fil) fil.style.width = pct + "%";
    const msg = $("goalMsg");
    if (msg){
      const remaining = Math.max(0, g.target - g.done);
      if (remaining === 0) msg.textContent = "Goal hit 🎉";
      else if (remaining === 1) msg.textContent = "1 more to go";
      else msg.textContent = remaining + " more to go";
    }
  }

  /* ---------- WELCOME CARD ---------- */
  function renderWelcome(){
    const mount = $("welcomeMount");
    if (!mount) return;
    const today = todayStr();
    let lastVisit = "";
    try { lastVisit = localStorage.getItem(VISIT_KEY) || ""; } catch(_) {}
    try { localStorage.setItem(VISIT_KEY, today); } catch(_) {}
    if (!lastVisit || lastVisit === today) return;
    const s = getStreak();
    if (!s.days) return;
    const g = getGoal();
    const pct = Math.min(100, (g.done / g.target) * 100);
    const fireEmoji = s.days >= 3 ? "🔥" : "✨";
    const headline = s.days === 1 ? "Welcome back" : s.days + " days in a row";
    const sub = s.days === 1 ? "Let's pick up where you left off" : "Keep the streak alive";
    mount.innerHTML =
      '<div class="welcome-card" id="welcomeCard">' +
        '<button class="welcome-close" id="welcomeClose" aria-label="Dismiss">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<div class="welcome-row">' +
          '<div class="welcome-fire">' + fireEmoji + '</div>' +
          '<div class="welcome-tx">' +
            '<b>' + headline + ' <em>nice</em></b>' +
            '<span>' + sub + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="welcome-goal">' +
          '<div class="welcome-goal-row">' +
            '<span>Weekly goal</span>' +
            '<span><b>' + g.done + '</b> / ' + g.target + '</span>' +
          '</div>' +
          '<div class="welcome-goal-bar"><div class="welcome-goal-fill" id="welcomeGoalFill" style="width:0%"></div></div>' +
        '</div>' +
      '</div>';
    requestAnimationFrame(() => {
      const fill = $("welcomeGoalFill");
      if (fill) setTimeout(() => { fill.style.width = pct + "%"; }, 200);
    });
    const close = $("welcomeClose");
    if (close) close.addEventListener("click", () => {
      const c = $("welcomeCard");
      if (c){ c.style.opacity = "0"; c.style.transform = "translateY(8px)"; setTimeout(() => c.remove(), 300); }
    });
       }
   /* ---------- DAILY COUNTERS ---------- */
function getGen(){
  try {
    const d = JSON.parse(localStorage.getItem(GEN_KEY) || "null");
    const now = Date.now();
    if (!d || !d.reset || now - d.reset > GEN_RESET_MS){
      const fresh = { studykit:0, flashcard:0, quiz:0, reset:now };
      try { localStorage.setItem(GEN_KEY, JSON.stringify(fresh)); } catch(_) {}
      return fresh;
    }
    d.studykit = d.studykit || 0;
    d.flashcard = d.flashcard || 0;
    d.quiz = d.quiz || 0;
    return d;
  } catch(_) { return { studykit:0, flashcard:0, quiz:0, reset:Date.now() }; }
}
function saveGen(d){ try { localStorage.setItem(GEN_KEY, JSON.stringify(d)); } catch(_) {} }
function bumpGen(kind){
  const d = getGen();
  d[kind] = (d[kind] || 0) + 1;
  saveGen(d);
}
function genAllowed(kind){
  const cap = DAILY_LIMITS[pro ? "pro" : "free"][kind] || 0;
  const d = getGen();
  return (d[kind] || 0) < cap;
}
function nextGenResetLabel(){
  const d = getGen();
  const remain = d.reset + GEN_RESET_MS - Date.now();
  if (remain <= 0) return "now";
  const hrs = Math.floor(remain / 3600000);
  const mins = Math.floor((remain % 3600000) / 60000);
  if (hrs > 0) return "in " + hrs + "h " + mins + "m";
  return "in " + mins + "m";
}

function detectGenIntent(text){
  if (!text) return null;
  const s = String(text).toLowerCase();
  if (/\b(f+la+s+h?\s*cards?|flash\s*cards?|flashcards?e?|cards?\s+for|make\s+(me\s+)?(a\s+)?(some\s+)?flash\s*cards?)\b/.test(s)) return "flashcard";
  if (/\b(mock\s*paper|full\s*mock|mock\s*test)\b/.test(s)) return "mock";
  if (/\b(viva\s*practice|oral\s*exam)\b/.test(s)) return "viva";
  if (/\b(study\s*kit|make\s+(me\s+)?(a\s+)?study|create\s+(me\s+)?(a\s+)?study)\b/.test(s)) return "studykit";
  if (/\b(quiz\s*me|make\s+(a\s+)?quiz|test\s+me\s+on|mcqs?|test\s+me)\b/.test(s)) return "quiz";
  if (/\bnotes?\s*(to|→|->)\s*(flashcards?|quiz|cards)\b/.test(s)) return "studykit";
  return null;
}
function checkGenAllowed(kind){
  if (pro) return true;
  if (genAllowed(kind)) return true;
  openProPaywall("limit", kind);
  return false;
}

/* ---------- BUSY WATCHDOG ---------- */
function armBusyWatchdog(){
  clearTimeout(busyWatchdog);
  busyWatchdog = setTimeout(function(){
    if (busy){
      try { if (ctrl) ctrl.abort(); } catch(_) {}
      busy = false; streaming = false;
      setGo(false);
      toast("Request timed out — try again");
    }
  }, STREAM_TIMEOUT_MS + 20000);
}
function clearBusyWatchdog(){ clearTimeout(busyWatchdog); }

/* ---------- TOKENS ---------- */
function getTokens(){
  try {
    const d = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
    const now = Date.now();
    if (!d || !d.reset || now - d.reset > TOKEN_RESET_MS){
      const fresh = { used:0, last:0, reset:now };
      try { localStorage.setItem(TOKEN_KEY, JSON.stringify(fresh)); } catch(_) {}
      return fresh;
    }
    return d;
  } catch(_) { return { used:0, last:0, reset:Date.now() }; }
}
function saveTokens(d){ try { localStorage.setItem(TOKEN_KEY, JSON.stringify(d)); } catch(_) {} }
function addTokens(n){ const d = getTokens(); d.used += n; d.last = n; saveTokens(d); updateTokenUI(); cloudUsage(n); }
const tokensOut = () => getTokens().used >= TOTAL;

function nextResetLabel(){
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

function paintBar(){
  const d = getTokens();
  const pct = Math.min(100, (d.used/TOTAL) * 100);
  const p = d.used > 0 && pct < 0.1 ? "<0.1" : pct < 10 ? pct.toFixed(1) : Math.floor(pct);
  const tp = $("tPct"); if (tp) tp.textContent = p + "% used";
  const f = $("fTotal");
  if (f){ f.style.width = pct + "%"; f.className = "token-fill" + (pct >= 95 ? " danger" : pct >= 80 ? " warn" : ""); }
  const tl = $("tLast");
  if (tl){ tl.textContent = "resets " + nextResetLabel(); }
  const tp2 = $("tPlan");
  if (tp2) tp2.textContent = pro ? "PRO · 750k / month" : "Free · 100k / month";
  const pp = $("profileTokenPct"); if (pp) pp.textContent = p + "%";
  const pr = $("profileTokenRefill"); if (pr) pr.textContent = "resets " + nextResetLabel();
  const pf = $("profileTokenFill"); if (pf) pf.style.width = pct + "%";
}

function updateTokenUI(){ paintBar(); applyLimits(); }
function applyLimits(){
  const out = tokensOut();
  ["imgBtn","fileBtn"].forEach(id => { const el = $(id); if (el) el.disabled = out; });
}
setInterval(updateTokenUI, 30000);

function toast(m){
  const e = $("toast"); if (!e) return;
  e.textContent = m; e.classList.add("on");
  setTimeout(() => e.classList.remove("on"), 1800);
}

const STAGES = ["Thinking","Analyzing","Planning steps"];
const STUDY = {
  Chat: "",
  Solver:
    "MODE: Solver. Step-by-step solution. " +
    "Under 350 words unless the problem needs more. Number each step. " +
    "Final answer in **bold** on its own line. End with: **Key concept:** [name]. " +
    "No extra examples or side notes.",
  Socratic:
    "MODE: Socratic tutor. Guide, don't lecture. " +
    "Under 80 words per reply. Ask ONE question or give ONE hint. " +
    "If stuck twice, give the smallest possible next step. Warm, encouraging.",
  Exam:
    "MODE: Exam prep. Help an Indian student write exam-ready answers.\n" +
    "If the topic is BROAD (e.g. 'science'), reply with 3-4 likely exam questions and ask them to pick one. Under 80 words.\n" +
    "If SPECIFIC, answer in under 400 words. Format exactly:\n" +
    "**Marks:** [2/5/10 — best guess]\n" +
    "**Answer:** numbered points (3-6)\n" +
    "**Key terms:** 4-6 terms comma-separated\n" +
    "No intro. No conclusion. No filler."
};

const QUICK = [
  { label:"Snap a question", emoji:"📸", kind:"snap" },
  { label:"Study kit", emoji:"📚", kind:"studykit" },
  { label:"Exam answer", emoji:"✍️", kind:"exam" },
  { label:"Mock paper", emoji:"🎯", kind:"mock", pro:true },
  { label:"Viva", emoji:"🎤", kind:"viva", soon:true }
];

const hiddenMode = $("mode");
if (hiddenMode){ hiddenMode.innerHTML = ""; hiddenMode.add(new Option("Auto")); hiddenMode.value = "Auto"; }
const hiddenStudy = $("study");
if (hiddenStudy){
  hiddenStudy.innerHTML = "";
  [["Chat","Chat"],["Solver","Solver"],["Socratic","Socratic"],["Exam","Exam prep"]].forEach(([v,l]) => hiddenStudy.add(new Option(l,v)));
}

const studyBtn=$("studyBtn"), studyMenu=$("studyMenu"), studyLabel=$("studyLabel");
function setStudy(v){
  if (!STUDY.hasOwnProperty(v)) v = "Chat";
  if (hiddenStudy) hiddenStudy.value = v;
  if (studyLabel) studyLabel.textContent = (v === "Exam") ? "Exam" : v;
  if (studyMenu) studyMenu.querySelectorAll("button").forEach(o => o.classList.toggle("active", o.dataset.study === v));
  const menu = $("menu");
  if (menu) menu.querySelectorAll(".mi[data-mode]").forEach(x => x.classList.toggle("active", x.dataset.mode === v));
  try { localStorage.setItem("zyro_study", v); } catch(_) {}
}
if (studyBtn && studyMenu){
  studyBtn.addEventListener("click", e => { e.stopPropagation(); closeAllMenusExcept(studyMenu); studyMenu.classList.toggle("open"); });
  studyMenu.querySelectorAll("button").forEach(opt => {
    opt.addEventListener("click", e => {
      e.stopPropagation();
      setStudy(opt.dataset.study);
      studyMenu.classList.remove("open");
    });
  });
}
try { const sv = localStorage.getItem("zyro_study"); if (sv) setStudy(sv); else setStudy("Exam"); } catch(_) { setStudy("Exam"); }

function closeAllMenusExcept(keep){
  ["studyMenu","actionsMenu"].forEach(id => {
    const el = $(id);
    if (el && el !== keep) el.classList.remove("open");
  });
  const pb = $("plusBtn"); if (pb && keep !== $("actionsMenu")) pb.classList.remove("active");
}

/* ---------- MENU ---------- */
const menu = $("menu"), scrim = $("scrim"), menuBtn = $("menuBtn");
function openMenu(){ menu.classList.add("on"); scrim.classList.add("on"); menuBtn.classList.add("active"); }
function closeMenu(){ menu.classList.remove("on"); scrim.classList.remove("on"); menuBtn.classList.remove("active"); }
if (menuBtn){
  menuBtn.addEventListener("click", e => {
    e.stopPropagation();
    menu.classList.contains("on") ? closeMenu() : openMenu();
  });
}
if (scrim) scrim.addEventListener("click", closeMenu);
if (menu) menu.addEventListener("click", e => { if (e.target === menu) e.stopPropagation(); });

if (menu) menu.querySelectorAll(".mi[data-mode]").forEach(b => {
  b.addEventListener("click", e => {
    e.stopPropagation();
    setStudy(b.dataset.mode);
    closeMenu();
  });
});

if (menu) menu.querySelectorAll(".mi[data-tool]").forEach(b => {
  b.addEventListener("click", e => {
    e.stopPropagation();
    const tool = b.dataset.tool;
    closeMenu();
    handleToolAction(tool);
  });
});

function handleToolAction(tool){
  if (tool === "snap"){ pendingKind = "snap"; $("img").click(); return; }
  if (tool === "photo"){ pendingKind = null; $("img").click(); return; }
  if (tool === "file"){ $("file").click(); return; }
  if (tool === "studykit"){
    if (!checkGenAllowed("studykit")) return;
    setStudy("Chat");
    t.value = "Make me a study kit for: ";
    t.dispatchEvent(new Event("input")); t.focus(); return;
  }
  if (tool === "flashcard"){
    if (!checkGenAllowed("flashcard")) return;
    setStudy("Chat");
    t.value = "Make flashcards for: ";
    t.dispatchEvent(new Event("input")); t.focus(); return;
  }
  if (tool === "quiz"){
    if (!checkGenAllowed("quiz")) return;
    setStudy("Chat");
    t.value = "Quiz me on: ";
    t.dispatchEvent(new Event("input")); t.focus(); return;
  }
  if (tool === "exam"){ setStudy("Exam"); t.value = "Give me a proper exam answer (5 marks) for: "; t.dispatchEvent(new Event("input")); t.focus(); return; }
  if (tool === "mock"){
    if (!pro){ openProPaywall("feature"); return; }
    t.value = "Generate a full mock paper with marking scheme for: ";
    t.dispatchEvent(new Event("input")); t.focus(); return;
  }
  if (tool === "viva"){ toast("Viva practice is coming soon"); return; }
}

const plusBtn = $("plusBtn"), actionsMenu = $("actionsMenu");
if (plusBtn && actionsMenu){
  plusBtn.addEventListener("click", e => {
    e.stopPropagation();
    closeAllMenusExcept(actionsMenu);
    actionsMenu.classList.toggle("open");
    plusBtn.classList.toggle("active");
  });
  actionsMenu.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", e => {
      e.stopPropagation();
      actionsMenu.classList.remove("open");
      plusBtn.classList.remove("active");
      if (b.dataset.soon){ toast("Viva practice is coming soon"); return; }
      handleToolAction(b.dataset.action);
    });
  });
}

/* ---------- GOAL EDIT ---------- */
{ const ge = $("goalEdit"); if (ge) ge.addEventListener("click", e => {
  e.stopPropagation();
  const g = getGoal();
  const v = prompt("Weekly goal (1-50 topics):", String(g.target));
  if (v === null) return;
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 1 || n > 50){ toast("Enter a number between 1 and 50"); return; }
  g.target = n;
  saveGoal(g);
  renderGoal();
}); }

/* ---------- THEME ---------- */
const root = document.documentElement;
const themeToggle = $("themeToggle"), themeLabel = $("themeLabel");
const topTheme = $("topTheme"), topThemeIcon = $("topThemeIcon");
const SUN_ICON = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
const MOON_ICON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

function setTheme(next){
  if (next === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  if (themeLabel) themeLabel.textContent = next === "dark" ? "Light mode" : "Dark mode";
  if (topThemeIcon) topThemeIcon.innerHTML = next === "dark" ? SUN_ICON : MOON_ICON;
  try { localStorage.setItem("zyro_theme", next); } catch(_) {}
}
function toggleTheme(){
  const cur = root.getAttribute("data-theme") || "light";
  setTheme(cur === "dark" ? "light" : "dark");
}
if (themeToggle){ themeToggle.addEventListener("click", e => { e.stopPropagation(); toggleTheme(); }); }
if (topTheme){ topTheme.addEventListener("click", e => { e.stopPropagation(); toggleTheme(); }); }
try {
  const savedT = localStorage.getItem("zyro_theme");
  if (savedT === "dark") setTheme("dark");
  else setTheme("light");
} catch(_) { setTheme("light"); }

/* ---------- SUBJECT CHIP + PICKER ---------- */
function openSubjectPicker(){
  const m = $("subjectModal");
  if (!m) return;
  m.querySelectorAll(".subject-opt").forEach(b => {
    b.classList.toggle("on", b.dataset.subj === curSubject);
  });
  m.classList.add("on");
}
function closeSubjectPicker(){
  const m = $("subjectModal");
  if (m) m.classList.remove("on");
}
{ const chip = $("subjectChip");
  if (chip) chip.addEventListener("click", (e) => { e.stopPropagation(); openSubjectPicker(); });
}
{ const close = $("subjectClose");
  if (close) close.addEventListener("click", closeSubjectPicker);
}
{ const m = $("subjectModal");
  if (m) m.addEventListener("click", (e) => { if (e.target === m) closeSubjectPicker(); });
}
{ const grid = $("subjectGrid");
  if (grid) grid.querySelectorAll(".subject-opt").forEach(b => {
    b.addEventListener("click", () => {
      curSubject = b.dataset.subj || "General";
      paintSubjectChip();
      closeSubjectPicker();
      if (curSubject === "General") toast("Chat unlocked");
      else toast("Locked to " + curSubject);
    });
  });
}

["newcBtn","newChatBtn"].forEach(id => {
  const b = $(id);
  if (b) b.addEventListener("click", newChat);
});

/* ---------- CHIPS ---------- */
const chipsBox = $("chips");
if (chipsBox){
  chipsBox.innerHTML = "";
  QUICK.forEach(item => {
    const b = document.createElement("button");
    b.type = "button";
    let html = '<span class="em">' + item.emoji + '</span>' + item.label;
    if (item.pro) html += ' <span class="mini-pro">PRO</span>';
    if (item.soon) html += ' <span class="mini-soon">SOON</span>';
    b.innerHTML = html;
    if (item.pro) b.dataset.pro = "1";
    if (item.soon) b.dataset.soon = "1";
    b.addEventListener("click", () => {
      if (item.soon){ toast("Viva practice is coming soon"); return; }
      handleToolAction(item.kind);
    });
    chipsBox.appendChild(b);
  });
}

/* ---------- VOICE ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const micBtn = $("micBtn");
let recog = null, listening = false;
if (SR && micBtn){
  micBtn.style.display = "grid";
  micBtn.addEventListener("click", () => {
    if (listening){ try { recog.stop(); } catch(_) {} return; }
    try {
      recog = new SR();
      recog.lang = "en-IN";
      recog.interimResults = true;
      recog.continuous = false;
      let base = t.value ? t.value + " " : "";
      recog.onstart = () => { listening = true; micBtn.classList.add("rec"); };
      recog.onend = () => { listening = false; micBtn.classList.remove("rec"); };
      recog.onerror = () => { listening = false; micBtn.classList.remove("rec"); };
      recog.onresult = e => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++){
          text += e.results[i][0].transcript;
        }
        t.value = base + text;
        t.dispatchEvent(new Event("input"));
      };
      recog.start();
    } catch(_) { toast("Voice not supported here"); }
  });
}

const EYE_OPEN = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
{ const eye = $("amEye"), icon = $("amEyeIcon"), pw = $("amPw");
  if (eye && icon && pw){
    eye.addEventListener("click", function(e){
      e.preventDefault();
      const showing = pw.type === "text";
      pw.type = showing ? "password" : "text";
      icon.innerHTML = showing ? EYE_OPEN : EYE_OFF;
    });
  }
}

function sbClient(){
  if (!SUPABASE_URL) return Promise.resolve(null);
  if (sb) return Promise.resolve(sb);
  if (!sbP) sbP = loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(() => {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
  });
  return sbP;
   }
   function renderAcct(){
  const ava = $("acctAva"), em = $("acctEmail");
  if (ava) ava.textContent = user ? (user.email || "Z").toUpperCase()[0] : "?";
  if (em) em.textContent = user ? (user.email || "").split("@")[0].slice(0, 12) : "Sign in";
  const acctBtn = $("authBtn");
  if (acctBtn){
    let pill = acctBtn.querySelector(".pro-pill");
    if (user && pro && !pill){
      pill = document.createElement("span");
      pill.className = "pro-pill";
      pill.textContent = "PRO";
      acctBtn.appendChild(pill);
    } else if ((!user || !pro) && pill){
      pill.remove();
    }
  }
  const up = $("upgradeCard");
  if (up) up.style.display = (user && pro) ? "none" : "";
  const pUp = $("profileUpgradeCard");
  if (pUp) pUp.style.display = (user && pro) ? "none" : "";
}

function renderProfile(){
  const ava = $("profileAva"), em = $("profileEmail"), meta = $("profileMeta");
  if (ava) ava.textContent = user ? (user.email || "Z").toUpperCase()[0] : "?";
  if (em) em.textContent = user ? (user.email || "") : "Not signed in";
  if (meta) meta.textContent = user ? ("Signed in" + (pro ? " · Pro" : " · Free")) : "Sign in to sync across devices";
  const pn = $("profilePlanName"); if (pn) pn.textContent = pro ? "Pro" : "Free";
  const pl = $("profilePlanLimit"); if (pl) pl.textContent = pro ? "750k tokens / month" : "100k tokens / month";
  paintBar();
}

const authBtn = $("authBtn");
if (authBtn){
  authBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (user) openProfile();
    else openAuth("signin");
  });
}

const acctUpgrade = $("acctUpgrade");
if (acctUpgrade){
  acctUpgrade.addEventListener("click", e => {
    e.stopPropagation();
    closeMenu();
    openRazorpayCheckout("monthly");
  });
}

const profilePanel = $("profilePanel");
function openProfile(){ renderProfile(); if (profilePanel) profilePanel.classList.add("on"); }
function closeProfile(){ if (profilePanel) profilePanel.classList.remove("on"); }
{ const cp = $("closeProfile"); if (cp) cp.addEventListener("click", closeProfile); }
{ const pu = $("profileUpgradeBtn"); if (pu) pu.addEventListener("click", () => { closeProfile(); openRazorpayCheckout("monthly"); }); }
{ const so = $("profileSignOut"); if (so) so.addEventListener("click", async () => {
    const s = await sbClient();
    if (s){ try { await s.auth.signOut(); } catch(_) {} }
    user = null; pro = false; TOTAL = 100000; userProfile = null;
    renderAcct(); renderProfile(); updateTokenUI(); renderList();
    closeProfile(); closeMenu();
    toast("Signed out");
}); }

/* ---------- AUTH ---------- */
let authMode = "signin";
function setAuthMode(m){
  authMode = m;
  const amTitle = $("amTitle"), amSub = $("amSub"), amGo = $("amGo"), amSwitch = $("amSwitch");
  if (!amTitle) return;
  if (m === "signup"){
    amTitle.textContent = "Create your account";
    amSub.textContent = "Sync chats across devices. Free.";
    amGo.textContent = "Create account";
    amSwitch.textContent = "Sign in";
    amSwitch.previousSibling.textContent = "Already have an account? ";
  } else {
    amTitle.textContent = "Sign in";
    amSub.textContent = "Sync your chats across devices.";
    amGo.textContent = "Sign in";
    amSwitch.textContent = "Create one";
    amSwitch.previousSibling.textContent = "No account? ";
  }
  const msg = $("amMsg"); if (msg) msg.textContent = "";
}
function openAuth(m){ setAuthMode(m || "signin"); $("authModal").classList.add("on"); setTimeout(() => $("amEmail").focus(), 60); }
function closeAuth(){ const am = $("authModal"); if (am) am.classList.remove("on"); if ($("amPw")) $("amPw").value = ""; if ($("amMsg")) $("amMsg").textContent = ""; }

{ const c = $("amCancel"); if (c) c.addEventListener("click", closeAuth); }
{ const s = $("amSwitch"); if (s) s.addEventListener("click", e => { e.preventDefault(); setAuthMode(authMode === "signin" ? "signup" : "signin"); }); }
{ const g = $("amGo"); if (g) g.addEventListener("click", async () => {
    const em = $("amEmail").value.trim().toLowerCase(), pw = $("amPw").value, msg = $("amMsg"), btn = $("amGo");
    if (!em || pw.length < 6){ msg.style.color = "#dc2626"; msg.textContent = "Enter an email and a password with 6+ characters."; return; }
    msg.style.color = "var(--dim)"; msg.textContent = "Working..."; btn.disabled = true;
    const s = await sbClient();
    if (!s){ btn.disabled = false; msg.style.color = "#dc2626"; msg.textContent = "Supabase isn't configured."; return; }
    const r = authMode === "signup"
      ? await s.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })
      : await s.auth.signInWithPassword({ email: em, password: pw });
    btn.disabled = false;
    if (r.error){ msg.style.color = "#dc2626"; msg.textContent = r.error.message; return; }
    if (authMode === "signup" && r.data && !r.data.session){
      msg.style.color = "#16a34a"; msg.textContent = "Check your email to confirm, then sign in."; return;
    }
    closeAuth();
    toast(authMode === "signup" ? "Account created" : "Signed in");
    setTimeout(() => { if (window.__zyroSavePendingOnboarding) window.__zyroSavePendingOnboarding(); }, 800);
  });
}

async function loadProfile(){
  try {
    const s = await sbClient();
    const { data } = await s.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data){
      pro = !!data.pro;
      userProfile = data;
      TOTAL = L().tokens;
      updateTokenUI(); renderAcct(); renderProfile(); renderPersonalizedHero();
    }
  } catch(_) {}
}

async function syncUsageFromCloud(){
  if (!user) return;
  try {
    const s = await sbClient();
    if (!s) return;
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await s.from("usage").select("total").eq("user_id", user.id).eq("day", day).maybeSingle();
    if (data && typeof data.total === "number"){
      const d = getTokens();
      if (data.total > d.used){ d.used = data.total; saveTokens(d); updateTokenUI(); }
    }
  } catch(_) {}
}

function cloudSave(){
  if (!user || !cur) return;
  clearTimeout(syncT);
  syncT = setTimeout(async () => {
    try {
      const s = await sbClient();
      if (!s) return;
      const msgs = JSON.parse(JSON.stringify(cur.msgs));
      msgs.forEach(m => { delete m.imgs; });
      await s.from("chats").upsert({ id: cur.id, user_id: user.id, title: cur.title, pin: !!cur.pin, ts: cur.ts, subject: cur.subject || curSubject || "General", msgs: msgs.slice(-40) }, { onConflict: "id" });
    } catch(_) {}
  }, 1200);
}

async function pullCloud(){
  try {
    const s = await sbClient(); if (!s) return;
    const { data } = await s.from("chats").select("*").order("ts", { ascending: false }).limit(100);
    if (!data) return;
    let changed = false;
    for (const r of data){
      const ex = chats.find(c => c.id === r.id);
      if (!ex){ chats.push({ id: r.id, title: r.title, pin: r.pin, ts: r.ts, msgs: r.msgs, subject: r.subject || "General" }); changed = true; }
      else if ((r.ts || 0) > (ex.ts || 0)){ ex.title = r.title; ex.pin = r.pin; ex.ts = r.ts; ex.msgs = r.msgs; ex.subject = r.subject || "General"; changed = true; }
    }
    if (changed){ save(); renderList(); toast("Chats synced"); }
  } catch(_) {}
}

function cloudUsage(n){
  if (!user) return;
  uAcc += n; clearTimeout(uT);
  uT = setTimeout(async () => {
    try {
      const s = await sbClient(); if (!s || !uAcc) return;
      const a = uAcc; uAcc = 0;
      await s.rpc("add_usage", { amt: a });
    } catch(_) {}
  }, 15000);
}

async function afterSignIn(){
  renderAcct(); renderProfile();
  await loadProfile();
  await pullCloud();
  await syncUsageFromCloud();
  renderAcct(); renderProfile();

  const d = getDraft();
  if (d && d.name){
    obData = d;
    await saveOnboardingToCloud();
    clearDraft();
    try { localStorage.setItem("zyro_onboarded", "1"); } catch(_){}
    renderPersonalizedHero();
  }

  const cloudDone = userProfile && userProfile.onboarded;
  let localDone = false;
  try { localDone = localStorage.getItem("zyro_onboarded") === "1"; } catch(_){}
  if (!cloudDone && !localDone){
    openOnboarding();
  }
}

(async () => {
  let s;
  try { s = await sbClient(); } catch(_) {}
  if (!s){ renderAcct(); renderProfile(); return; }
  try {
    const { data } = await s.auth.getSession();
    user = (data && data.session && data.session.user) || null;
  } catch(_) {}
  s.auth.onAuthStateChange((_e, ses) => {
    user = (ses && ses.user) || null;
    if (!user){ pro = false; TOTAL = 100000; userProfile = null; renderAcct(); renderProfile(); updateTokenUI(); renderList(); }
    else afterSignIn();
  });
  if (user) await afterSignIn();
  else {
    renderAcct(); renderProfile();
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(OB_DRAFT) || "null"); } catch(_) {}
    if (!draft || !draft.name) openOnboarding();
  }
})();

/* ---------- CHAT LIST ---------- */
try { chats = JSON.parse(localStorage.getItem(CK) || "[]"); } catch(_) { chats = []; }

function save(){
  chats = [...chats.filter(c => c.pin), ...chats.filter(c => !c.pin)].slice(0, 40);
  for (;;){
    try { localStorage.setItem(CK, JSON.stringify(chats)); break; }
    catch(_) { if (chats.length <= 1) break; chats.pop(); }
  }
  cloudSave();
  renderList();
}
function fmtDate(ts){
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const hms = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  if (d.toDateString() === now.toDateString()) return "Today " + hms;
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return "Yesterday " + hms;
  return d.getDate() + " " + d.toLocaleString("en", { month: "short" });
}
function renderList(){
  const l = $("chatsList"); if (!l) return;
  l.innerHTML = "";
  const arr = [...chats.filter(c => c.pin), ...chats.filter(c => !c.pin)].slice(0, 10);
  const countEl = $("chatsCount");
  if (!arr.length){
    l.innerHTML = '<div style="color:var(--dim);font-size:12px;padding:8px 11px;font-weight:500">No chats yet</div>';
    if (countEl) countEl.textContent = "0 chats";
    return;
  }
  if (countEl) countEl.textContent = arr.length + (arr.length === 1 ? " chat" : " chats");
  arr.forEach(c => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "chat-item";
    const subjEm = SUBJECT_ICONS[c.subject || "General"] || "";
    d.innerHTML = '<b>' + (subjEm ? subjEm + " " : "") + esc(c.title || "Untitled") + '</b><small>' + fmtDate(c.ts) + '</small>';
    d.addEventListener("click", e => { e.stopPropagation(); openChat(c.id); closeMenu(); });
    l.appendChild(d);
  });
}
{ const ct = $("chatsToggle"); if (ct) ct.addEventListener("click", e => {
  e.stopPropagation();
  ct.classList.toggle("open");
  const drop = $("chatsDrop"); if (drop) drop.classList.toggle("open");
}); }
{ const del = $("deleteOldChats"); if (del) del.addEventListener("click", async e => {
  e.stopPropagation();
  if (!confirm("Delete chats older than 30 days?")) return;
  const cutoff = Date.now() - 30 * 86400000;
  const toDelete = chats.filter(c => (c.ts || 0) < cutoff);
  if (!toDelete.length){ toast("No old chats to delete"); return; }
  chats = chats.filter(c => (c.ts || 0) >= cutoff);
  try { localStorage.setItem(CK, JSON.stringify(chats)); } catch(_) {}
  if (user){
    try {
      const s = await sbClient();
      if (s){ for (const c of toDelete){ await s.from("chats").delete().eq("id", c.id); } }
    } catch(_) {}
  }
  if (toDelete.find(c => c === cur)){ cur = null; hist = []; log.innerHTML = ""; log.classList.remove("on"); const hero = $("hero"); if (hero) hero.classList.remove("hide"); }
  renderList();
  closeMenu();
  toast("Deleted " + toDelete.length + " old chat" + (toDelete.length > 1 ? "s" : ""));
}); }

function newChat(){
  try { if (ctrl) ctrl.abort(); } catch(_) {}
  busy = false; streaming = false; setGo(false); clearBusyWatchdog();
  cur = null; hist = []; log.innerHTML = ""; log.classList.remove("on");
  const hero = $("hero"); if (hero) hero.classList.remove("hide");
  curSubject = "General";
  paintSubjectChip();
  closeMenu();
  try { t.focus(); } catch(_) {}
}
function openChat(id){
  try { if (ctrl) ctrl.abort(); } catch(_) {}
  busy = false; streaming = false; setGo(false); clearBusyWatchdog();
  const c = chats.find(x => x.id === id); if (!c) return;
  cur = c; hist = c.msgs; log.innerHTML = "";
  curSubject = c.subject || "General";
  paintSubjectChip();
  const hero = $("hero"); if (hero) hero.classList.add("hide");
  log.classList.add("on");
  c.msgs.forEach((m) => {
    if (m.role === "user"){ addU(m.show ?? m.content, m.att, m.imgs, m.nimg); }
    else {
      const d = addA();
      const sc = d.querySelector(".status-chip"); if (sc) sc.remove();
      const tl = d.querySelector(".think-live"); if (tl) tl.remove();
      setH(d.querySelector(".body"), md(m.content));
      const kit = parseStudyKit(m.content);
      if (kit.notes || kit.cards.length || kit.quiz.length){
        const ln = document.createElement("div");
        ln.innerHTML = launcherHTML(kit);
        const lc = ln.firstElementChild;
        d.appendChild(lc);
        wireLauncher(lc, kit);
      }
    }
  });
  closeMenu(); down(1);
}

/* ---------- MARKDOWN ---------- */
const MR = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
const inl = x => {
  const st = [], tk = h => "\u0001" + (st.push(h) - 1) + "\u0002";
  x = x.replace(/`([^`]+)`/g, (_, c) => tk('<code class="i">' + esc(c) + '</code>'));
  x = x.replace(MR, (m, a, b, c, d) => {
    if (d !== undefined && !/[\\^_=+\-*\/<>{}()]|^[A-Za-z]$|\d/.test(d)) return m;
    return tk('<span class="mx" data-d="' + (a !== undefined || b !== undefined ? 1 : 0) + '" data-tex="' + escA(a ?? b ?? c ?? d) + '">' + esc(m) + '</span>');
  });
  x = esc(x);
  x = x.replace(/==([^=\n]+)==/g, '<span class="hl">$1</span>');
  x = x.replace(/\*\*([^*]+)\*\*/g, '<span class="term">$1</span>');
  return x.replace(/\u0001(\d+)\u0002/g, (_, i) => st[i]);
};
function renderTable(rows){
  if (!rows.length) return "";
  const splitRow = r => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
  const head = splitRow(rows[0]);
  let h = '<div style="overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:12px;background:var(--bg-3)"><table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr>';
  head.forEach(c => h += '<th style="padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);background:var(--bg-4);color:var(--ink);font-weight:700;font-size:13px">' + inl(c) + "</th>");
  h += "</tr></thead><tbody>";
  for (let r = 1; r < rows.length; r++){
    h += "<tr>";
    splitRow(rows[r]).forEach(c => h += '<td style="padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);color:var(--ink-2)">' + inl(c) + "</td>");
    h += "</tr>";
  }
  h += "</tbody></table></div>";
  return h;
}
function txt(p){
  const lines = p.split("\n");
  let h = "", l = null, pa = [];
  const fp = () => { if (pa.length){ h += "<p>" + inl(pa.join("\n")) + "</p>"; pa = []; } };
  const fl = () => { if (l){ h += "</" + l + ">"; l = null; } };
  const isTableRow = s => /^\s*\|.+\|\s*$/.test(s);
  const isTableSep = s => /^\s*\|[\s\-:|]+\|\s*$/.test(s) && /-/.test(s);
  let i = 0;
  while (i < lines.length){
    const ln = lines[i];
    let m;
    if (isTableRow(ln) && i + 1 < lines.length && isTableSep(lines[i + 1])){
      fp(); fl();
      const rows = [ln]; i += 2;
      while (i < lines.length && isTableRow(lines[i])){ rows.push(lines[i]); i++; }
      h += renderTable(rows);
      continue;
    }
    if (m = ln.match(/^\s{0,3}(#{1,6})\s+(.*)/)){
      fp(); fl();
      const n = Math.min(m[1].length + 1, 4);
      h += "<h" + n + ">" + inl(m[2]) + "</h" + n + ">";
    }
    else if (/^\s*([-*_])\1{2,}\s*$/.test(ln)){ fp(); fl(); h += "<hr>"; }
    else if (m = ln.match(/^\s*[-*]\s+(.*)/)){
      fp();
      if (l !== "ul"){ fl(); h += "<ul>"; l = "ul"; }
      h += "<li>" + inl(m[1]) + "</li>";
    }
    else if (m = ln.match(/^\s*\d+[.)]\s+(.*)/)){
      fp();
      if (l !== "ol"){ fl(); h += "<ol>"; l = "ol"; }
      h += "<li>" + inl(m[1]) + "</li>";
    }
    else if (!ln.trim()){ fp(); fl(); }
    else { fl(); pa.push(ln); }
    i++;
  }
  fp(); fl();
  return h;
}

const KW = new Set("abstract and as assert async await break case catch class const continue def default del do elif else enum except export extends final finally for from fn func function if implements import in interface is lambda let loop match mod mut namespace new not null None nil of or package pass private protected pub public raise return self static struct super switch this throw throws trait true True false False try type typeof union unsafe use using var void while with yield select insert update delete create table where join group order by limit values".split(" "));
const HASH = /^(py|python|bash|sh|shell|zsh|ruby|rb|yaml|yml|toml|r|perl|dockerfile|makefile|ini|conf|powershell|ps1)$/i;
const CM = { h: /#[^\n]*/, q: /--[^\n]*|\/\*[\s\S]*?\*\//, s: /\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/ };
const REST = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-f]+\b|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[A-Za-z_]\w*\b)/;
const RX = {};
function hl(c, l){
  if (c.length > 20000) return esc(c);
  const k = HASH.test(l) ? "h" : /^sql$/i.test(l) ? "q" : "s";
  const re = RX[k] || (RX[k] = new RegExp("(" + CM[k].source + ")|" + REST.source, "gi"));
  re.lastIndex = 0;
  let o = "", last = 0, m;
  while ((m = re.exec(c))){
    if (m[0] === "") break;
    o += esc(c.slice(last, m.index));
    last = re.lastIndex;
    const tx = m[0];
    const q = m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : KW.has(tx) ? "k" : /^[A-Z][a-z]/.test(tx) ? "t" : "";
    o += q ? '<span style="color:' + (q==="k"?"var(--coral)":q==="s"?"var(--violet)":q==="c"?"var(--dim-2)":"var(--ink-2)") + '">' + esc(tx) + "</span>" : esc(tx);
  }
  return o + esc(c.slice(last));
}
function typeset(root){
  if (!window.katex || streaming) return;
  root.querySelectorAll(".mx:not([data-k])").forEach(el => {
    try {
      el.innerHTML = katex.renderToString(el.dataset.tex, { displayMode: el.dataset.d === "1", throwOnError: false });
      el.dataset.k = 1;
    } catch(_) {}
  });
}
function setH(el, h){ el.innerHTML = h; typeset(el); }
window.typesetAll = function(){ typeset(document); };
function md(src){
  let h = "";
  src.split(/```/).forEach((p, i) => {
    if (i % 2){
      const nl = p.indexOf("\n");
      const l = nl > -1 ? p.slice(0, nl).trim() : "";
      const c = nl > -1 ? p.slice(nl + 1) : p;
      const code = c.replace(/\n$/, "");
      const isH = /^html?$/i.test(l) || (!l && /<!doctype|<html/i.test(c));
      const rn = /^(js|javascript|node|mjs)$/i.test(l) ? "js" : /^(py|python|python3)$/i.test(l) ? "py" : "";
      h += '<div class="cb col" data-lang="' + escA(l) + '"><div class="ch"><span>' + esc(l || "code") + '</span><span>' + (rn ? '<button type="button" data-run="' + rn + '">Run</button>' : "") + (isH ? '<button type="button" data-p>Preview</button>' : "") + '<button type="button" data-c>Copy</button><button type="button" class="more" data-v>⤢ Expand</button></span></div><pre>' + hl(code, l) + '</pre></div>';
    }
    else h += txt(p);
  });
  return h;
}
function liteMd(src){
  let h = "";
  const parts = src.split(/```/);
  for (let i = 0; i < parts.length; i++){
    const p = parts[i];
    if (i % 2){
      const nl = p.indexOf("\n");
      const c = nl > -1 ? p.slice(nl + 1) : p;
      h += '<div class="cb live col"><pre>' + esc(c) + '</pre></div>';
    } else {
      p.split(/\n{2,}/).forEach(bl => {
        const s = bl.trim();
        if (s) h += '<p>' + esc(s).replace(/\n/g, "<br>") + '</p>';
      });
    }
  }
  return h;
}

function fillBubble(b, txt2, names, imgs, nimg){
  b.textContent = txt2;
  if (imgs && imgs.length){
    const w = document.createElement("div"); w.className = "th";
    imgs.forEach(im => {
      const i = document.createElement("img");
      i.alt = "";
      i.src = "data:" + im.mime + ";base64," + im.data;
      w.appendChild(i);
    });
    b.appendChild(w);
  } else if (nimg){
    const f = document.createElement("div"); f.className = "fl"; f.textContent = "🖼 " + nimg + " image" + (nimg > 1 ? "s" : ""); b.appendChild(f);
  }
  if (names && names.length){
    const f = document.createElement("div"); f.className = "fl"; f.textContent = "📎 " + names.join(", "); b.appendChild(f);
  }
}
function addU(txt2, names, imgs, nimg){
  const d = document.createElement("div"); d.className = "u";
  const b = document.createElement("div"); fillBubble(b, txt2, names, imgs, nimg);
  d.appendChild(b); log.appendChild(d); return d;
}
function addA(){
  const d = document.createElement("div");
  d.className = "a";
  d.innerHTML =
    '<div class="status-chip" role="status"></div>' +
    '<div class="think-live" hidden>' +
      '<button type="button" class="think-live-head" aria-expanded="true">' +
        '<span class="chev">›</span>' +
        '<span class="think-live-dot"></span>' +
        '<span class="think-live-label">Thinking…</span>' +
      '</button>' +
      '<div class="think-live-body open"><div class="think-live-inner"></div></div>' +
    '</div>' +
    '<div class="body"></div>';
  log.appendChild(d);
  return d;
}
function thinkShow(d, show){ const el = d.querySelector(".think-live"); if (!el) return null; if (show) el.hidden = false; return el; }
function thinkUpdate(d, text){
  const el = thinkShow(d, true); if (!el) return;
  const inner = el.querySelector(".think-live-inner");
  if (inner){ inner.textContent = text; inner.scrollTop = inner.scrollHeight; }
  down();
}
function thinkFinish(d, seconds, hadText){
  const el = d.querySelector(".think-live"); if (!el) return;
  if (!hadText){ el.remove(); return; }
  el.classList.add("done");
  const dot = el.querySelector(".think-live-dot"); if (dot) dot.remove();
  const label = el.querySelector(".think-live-label"); if (label) label.textContent = "Thought for " + seconds + "s";
  const head = el.querySelector(".think-live-head");
  const panelBody = el.querySelector(".think-live-body");
  if (head) head.setAttribute("aria-expanded", "false");
  if (panelBody) panelBody.classList.remove("open");
  if (head && panelBody && !head.dataset.wired){
    head.dataset.wired = "1";
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      panelBody.classList.toggle("open", !open);
    });
  }
}

const distB = () => main.scrollHeight - main.scrollTop - main.clientHeight;
const syncPill = () => { const j = $("jump"); if (j) j.classList.toggle("on", distB() > 140); };
main.addEventListener("scroll", () => { if (distB() < 140) follow = true; syncPill(); });
{ const j = $("jump"); if (j) j.onclick = () => { follow = true; main.scrollTo({ top: main.scrollHeight, behavior: "smooth" }); }; }
function down(f){ if (f || follow) requestAnimationFrame(() => { main.scrollTop = main.scrollHeight; }); }
function withCaret(h){
  if (/<\/p>$/.test(h)) return h.replace(/<\/p>$/, '<span class="caret"></span></p>');
  if (/<\/pre><\/div>$/.test(h)) return h.replace(/<\/pre><\/div>$/, '<span class="caret"></span></pre></div>');
  return h + '<span class="caret"></span>';
}

function startChip(chip){
  let i = 0, tm;
  const n = ++sid;
  chip.innerHTML = '<span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg' + n + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3f53c"/><stop offset=".55" stop-color="#ff6b4a"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs><path fill="url(#sg' + n + ')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span>';
  const label = chip.querySelector(".status-text");
  const setL = x => { label.style.opacity = 0; clearTimeout(tm); tm = setTimeout(() => { label.textContent = x; label.style.opacity = 1; }, 170); };
  const iv = setInterval(() => { i = (i + 1) % STAGES.length; setL(STAGES[i]); }, 1400);
  return {
    write(){ if (chip.dataset.w) return; chip.dataset.w = 1; clearInterval(iv); setL("Writing"); },
    done(){
      clearInterval(iv); clearTimeout(tm);
      label.classList.remove("shimmer"); label.style.opacity = 1; label.textContent = "Done";
      chip.classList.add("done");
      setTimeout(() => chip.classList.add("fade-out"), 900);
      setTimeout(() => chip.remove(), 1500);
    },
    stop(){ clearInterval(iv); clearTimeout(tm); chip.remove(); }
  };
}

function copy(txt2, btn){
  const ok = () => { const prev = btn.innerHTML; btn.innerHTML = "✓"; setTimeout(() => btn.innerHTML = prev, 1200); };
  const fb = () => {
    const a = document.createElement("textarea");
    a.value = txt2; a.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); ok(); } catch(_) {}
    a.remove();
  };
  navigator.clipboard ? navigator.clipboard.writeText(txt2).then(ok).catch(fb) : fb();
}

/* ---------- STUDY KIT PARSER ---------- */
function parseStudyKit(text){
  const kit = { notes:"", cards:[], quiz:[] };
  if (!text) return kit;
  const notesM = text.match(/(?:^|\n)#{1,3}\s*(?:📖\s*)?Notes\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:🎴|📝|Flashcards|Quiz)|$)/i);
  if (notesM) kit.notes = notesM[1].trim();
  const fcM = text.match(/(?:^|\n)#{1,3}\s*(?:🎴\s*)?(?:Flash\s*cards?|Flashcards?)\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:📖|📝|Notes|Quiz)|$)/i);
  if (fcM){
    const re = /^\s*F:\s*(.+?)\s*\n\s*B:\s*(.+?)(?=\n\s*F:|\n\s*#{1,3}|\n\s*$)/gims;
    let m;
    while ((m = re.exec(fcM[1]))){ kit.cards.push({ a: m[1].trim(), b: m[2].trim() }); }
  }
  const qM = text.match(/(?:^|\n)#{1,3}\s*(?:📝\s*)?Quiz\s*\n([\s\S]*?)(?=\n#{1,3}\s*(?:📖|🎴|Notes|Flashcards)|$)/i);
  if (qM){
    const re = /^\s*Q:\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Ans:\s*([A-D])\s*(?:\n\s*Ex:\s*(.+?))?(?=\n\s*Q:|\n\s*#{1,3}|\n\s*$)/gims;
    let m;
    while ((m = re.exec(qM[1]))){
      kit.quiz.push({ q: m[1].trim(), opts: [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()], ans: m[6].toUpperCase(), ex: (m[7]||"").trim() });
    }
  }
  return kit;
     }
     function launcherHTML(kit){
    let parts = "";
    if (kit.notes) parts += '<span class="kpart">Notes</span>';
    if (kit.cards.length) parts += '<span class="kpart">' + kit.cards.length + ' cards</span>';
    if (kit.quiz.length) parts += '<span class="kpart">' + kit.quiz.length + ' quiz</span>';
    let title = "Study Kit";
    if (kit.notes && !kit.cards.length && !kit.quiz.length) title = "Notes Ready";
    else if (kit.cards.length && !kit.notes && !kit.quiz.length) title = "Flashcards Ready";
    else if (kit.quiz.length && !kit.notes && !kit.cards.length) title = "Quiz Ready";
    return '<div class="kit-launcher">' +
      '<div class="kit-launcher-top">' +
        '<span class="kit-launcher-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>' +
        '<div class="kit-launcher-tx"><b>' + title + '</b><span>Open to study</span></div>' +
      '</div>' +
      '<div class="kit-launcher-parts">' + parts + '</div>' +
      '<button class="open-kit" type="button">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
        'Open study kit' +
      '</button>' +
    '</div>';
  }
  function wireLauncher(el, kit){
    const btn = el.querySelector(".open-kit");
    if (btn) btn.addEventListener("click", () => openStudyPanel(kit));
  }
  function emptyPanelHTML(emoji, title, sub){
    return '<div class="ep-ic">' + emoji + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(sub) + '</p>';
  }

  /* ---------- FLIP CARDS ---------- */
  function renderFlipCards(container, cards){
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
        '<button class="flip-btn review" type="button">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>' +
          'Review again' +
        '</button>' +
        '<button class="flip-btn got" type="button">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          'Got it' +
        '</button>' +
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
        '<button class="flip-retry" type="button">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>' +
          'Try again' +
        '</button>' +
      '</div>';
    container.appendChild(stage);

    const stackEl = stage.querySelector(".flip-stack");
    const dotsEl = stage.querySelector(".flip-dots");
    const actionsEl = stage.querySelector(".flip-actions");
    const completeEl = stage.querySelector(".flip-complete");
    const headerEl = stage.querySelector(".flip-header");
    const counterNowEl = stage.querySelector(".fnow");
    let idx = 0, gotIt = 0, review = 0;
    let results = [];

    function buildDots(){
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
    function buildCard(c, i){
      const el = document.createElement("div");
      el.className = "flip-item";
      const esc2 = s => String(s||"").replace(/[&<>]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[ch]));
      const frontText = esc2(c.a);
      const backText = (typeof c.b === "string" && /[<>&]/.test(c.b) ? c.b : esc2(c.b));
      el.innerHTML =
        '<div class="flip-inner-c">' +
          '<div class="flip-face-c flip-front-c">' +
            '<div class="flip-top">' +
              '<span class="flip-num">CARD ' + String(i+1).padStart(2,"0") + '</span>' +
              '<span class="flip-tag">Question</span>' +
            '</div>' +
            '<div class="flip-body-c"><p>' + frontText + '</p></div>' +
            '<div class="flip-hint">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>' +
              'Tap to reveal answer' +
            '</div>' +
          '</div>' +
          '<div class="flip-face-c flip-back-c">' +
            '<div class="flip-top">' +
              '<span class="flip-num">CARD ' + String(i+1).padStart(2,"0") + '</span>' +
              '<span class="flip-tag">Answer</span>' +
            '</div>' +
            '<div class="flip-body-c"><p>' + backText + '</p></div>' +
            '<div class="flip-hint">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
              'Got it? Tap below' +
            '</div>' +
          '</div>' +
        '</div>';
      el.addEventListener("click", () => {
        el.classList.toggle("flipped");
        if (navigator.vibrate) try { navigator.vibrate(10); } catch(_){}
      });
      return el;
    }
    function showCard(){
      stackEl.innerHTML = "";
      if (idx >= cards.length){ showComplete(); return; }
      completeEl.classList.remove("show");
      headerEl.style.display = "";
      actionsEl.style.display = "flex";
      dotsEl.style.display = "flex";
      counterNowEl.textContent = idx + 1;
      const el = buildCard(cards[idx], idx);
      el.style.opacity = "0";
      el.style.transform = "translateY(14px) scale(.96)";
      stackEl.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transition = "opacity .4s cubic-bezier(.22,.68,.32,1), transform .5s cubic-bezier(.34,1.56,.64,1)";
        el.style.opacity = "1";
        el.style.transform = "translateY(0) scale(1)";
      });
      buildDots();
    }
    function advance(kind){
      const el = stackEl.querySelector(".flip-item");
      if (!el) return;
      results[idx] = kind;
      if (kind === "got") gotIt++; else review++;
      el.classList.add(kind === "got" ? "exit-right" : "exit-left");
      if (navigator.vibrate) try { navigator.vibrate(kind === "got" ? [12,30,12] : 20); } catch(_){}
      setTimeout(() => { idx++; showCard(); }, 380);
    }
    function showComplete(){
      stackEl.innerHTML = "";
      headerEl.style.display = "none";
      actionsEl.style.display = "none";
      dotsEl.style.display = "none";
      completeEl.classList.add("show");
      stage.querySelector(".fgot").textContent = gotIt;
      stage.querySelector(".frev").textContent = review;
      const pct = Math.round((gotIt / cards.length) * 100);
      stage.querySelector(".fpct").textContent = pct + "%";
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

  /* ---------- STUDY PANEL ---------- */
  function openStudyPanel(kit){
    lastKit = kit;
    const panel = $("studyPanel");
    if (!panel) return;
    const titleEl = $("panelTitle");
    if (titleEl){
      const topic = (cur && cur.title) || "Study Kit";
      titleEl.textContent = topic.slice(0, 40);
    }
    const notesEl = panel.querySelector('[data-pcontent="notes"]');
    if (notesEl){
      if (kit.notes){
        notesEl.classList.remove("empty-panel");
        notesEl.innerHTML =
          '<p class="p-eyebrow">Revision notes</p>' +
          '<h2 class="p-title">Quick <em>revision</em></h2>' +
          '<p class="p-sub">Everything you actually need. No fluff.</p>' +
          '<div class="notes">' + txt(kit.notes) + '</div>';
      } else {
        notesEl.classList.add("empty-panel");
        notesEl.innerHTML = emptyPanelHTML("📝", "No notes in this kit", "Ask Zyro to 'make me a study kit' for notes + cards + quiz.");
      }
    }
    const cardsEl = panel.querySelector('[data-pcontent="cards"]');
    if (cardsEl){
      if (kit.cards.length){
        cardsEl.classList.remove("empty-panel");
        renderFlipCards(cardsEl, kit.cards);
      } else {
        cardsEl.classList.add("empty-panel");
        cardsEl.innerHTML = emptyPanelHTML("🃏", "No flashcards", "Ask Zyro for a study kit to generate flashcards from any topic.");
      }
    }
    const quizEl = panel.querySelector('[data-pcontent="quiz"]');
    if (quizEl){
      if (kit.quiz.length){
        quizEl.classList.remove("empty-panel");
        let html = '<p class="p-eyebrow">Pop quiz</p><h2 class="p-title">Let\'s <em>test</em> it</h2><p class="p-sub">' + kit.quiz.length + ' questions. Tap an option to check — score at the bottom.</p><div class="quiz">';
        kit.quiz.forEach((q, i) => {
          const num = "Q" + (i+1);
          html += '<div class="quiz-item">' +
            '<div class="quiz-q"><span class="quiz-n">' + num + '</span><span class="quiz-q-text">' + esc(q.q) + '</span></div>' +
            '<div class="opts">';
          ["A","B","C","D"].forEach((Ltr, j) => {
            const isCorrect = Ltr === q.ans;
            html += '<button class="opt" type="button" data-correct="' + (isCorrect ? '1' : '0') + '"><span class="lt">' + Ltr + '</span>' + esc(q.opts[j]) + '</button>';
          });
          html += '</div>';
          if (q.ex) html += '<div class="quiz-exp">' + esc(q.ex) + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div class="quiz-score" id="quizScore"><span>Answered <b>0</b> / ' + kit.quiz.length + '</span><span>Score <b>0</b></span></div>';
        quizEl.innerHTML = html;
        const scoreEl = quizEl.querySelector("#quizScore");
        const qstate = { answered: 0, correct: 0, total: kit.quiz.length };
        function updateScore(){
          scoreEl.innerHTML = '<span>Answered <b>' + qstate.answered + '</b> / ' + qstate.total + '</span><span>Score <b>' + qstate.correct + '</b></span>';
          if (qstate.answered === qstate.total){
            const pct = Math.round((qstate.correct / qstate.total) * 100);
            let msg = "";
            if (pct >= 85) msg = "🔥 Killing it";
            else if (pct >= 65) msg = "👍 Solid work";
            else if (pct >= 45) msg = "Getting there";
            else msg = "Needs revision";
            scoreEl.classList.add("done");
            scoreEl.innerHTML = '<span>Score</span><span><b>' + qstate.correct + '</b> / ' + qstate.total + ' &middot; ' + pct + '%</span><div class="quiz-score-msg">' + msg + '</div>';
          }
        }
        quizEl.querySelectorAll(".quiz-item").forEach(item => {
          const opts = item.querySelectorAll(".opt");
          opts.forEach(o => {
            o.addEventListener("click", () => {
              if (item.classList.contains("revealed")) return;
              item.classList.add("revealed");
              const isRight = o.dataset.correct === "1";
              opts.forEach(x => {
                if (x.dataset.correct === "1") x.classList.add("correct");
                else if (x === o) x.classList.add("wrong");
              });
              qstate.answered++;
              if (isRight) qstate.correct++;
              updateScore();
            });
          });
        });
      } else {
        quizEl.classList.add("empty-panel");
        quizEl.innerHTML = emptyPanelHTML("🎯", "No quiz", "Ask Zyro for a study kit and it'll generate MCQs with answers.");
      }
    }
    let targetTab = "notes";
    if (!kit.notes && kit.cards.length) targetTab = "cards";
    if (!kit.notes && !kit.cards.length && kit.quiz.length) targetTab = "quiz";
    panel.querySelectorAll(".ptab").forEach(x => x.classList.toggle("active", x.dataset.ptab === targetTab));
    panel.querySelectorAll(".pcontent").forEach(x => x.classList.toggle("on", x.dataset.pcontent === targetTab));
    panel.classList.add("on");
    const body = panel.querySelector(".panel-body"); if (body) body.scrollTop = 0;
    try { typeset(panel); } catch(_) {}
  }

  function closePanel(){
    const p = $("studyPanel"); if (p) p.classList.remove("on");
  }
  const studyPanel = $("studyPanel");
  if (studyPanel){
    studyPanel.querySelectorAll(".ptab").forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.ptab;
        studyPanel.querySelectorAll(".ptab").forEach(x => x.classList.toggle("active", x === tab));
        studyPanel.querySelectorAll(".pcontent").forEach(p => p.classList.toggle("on", p.dataset.pcontent === target));
        const body = studyPanel.querySelector(".panel-body"); if (body) body.scrollTop = 0;
      });
    });
  }
  { const cp = $("closePanel"); if (cp) cp.addEventListener("click", closePanel); }

  /* ---------- WORKER STREAM ---------- */
  async function workerStream(messages, onText, signal, fast, onThought, isGen){
    let r;
    try {
      r = await fetch(WORKER_URL, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, mode: "Auto", fast, isGen: !!isGen })
      });
    } catch(e){
      if (e && e.name === "AbortError") return "";
      throw { code: "net", info: "can't reach the server" };
    }
    if (!r.ok){
      let m = "";
      try { const j = await r.json(); m = (j.error && j.error.message) || ""; } catch(_) {}
      throw { code: r.status === 429 ? "rate" : r.status === 403 ? "origin" : r.status === 413 ? "big" : "http", info: r.status + (m ? " " + m.slice(0, 100) : "") };
    }
    if (!r.body) throw { code: "http", info: "empty response" };
    let full = "", th = "", used = 0, aborted = false, gotFirst = false;
    const rd = r.body.getReader(), dec = new TextDecoder();
    let buf = "";
    let firstTokenTimer = setTimeout(() => { try { rd.cancel(); } catch(_) {} }, FIRST_TOKEN_MS);
    let lastChunkAt = Date.now();
    const stallTimer = setInterval(() => {
      if (!gotFirst) return;
      if (Date.now() - lastChunkAt > 25000 && !aborted){
        try { rd.cancel(); } catch(_) {}
        clearInterval(stallTimer);
      }
    }, 5000);
    try {
      for (;;){
        const { done, value } = await rd.read();
        if (done) break;
        lastChunkAt = Date.now();
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const ln of lines){
          if (!ln.startsWith("data:")) continue;
          const dd = ln.slice(5).trim();
          if (!dd || dd === "[DONE]") continue;
          try {
            const j = JSON.parse(dd);
            const cd = j.candidates && j.candidates[0];
            if (cd && cd.content && cd.content.parts){
              for (const p of cd.content.parts){
                if (!p.text) continue;
                if (p.thought){ th += p.text; if (onThought) onThought(th); }
                else {
                  if (!gotFirst){ gotFirst = true; clearTimeout(firstTokenTimer); }
                  full += p.text; onText(full);
                }
              }
            }
            if (j.usageMetadata){ used = j.usageMetadata.totalTokenCount || used; }
          } catch(_) {}
        }
      }
    } catch(e){
      if (e && e.name === "AbortError") aborted = true;
      else if (gotFirst) {}
      else throw e;
    } finally {
      clearTimeout(firstTokenTimer);
      clearInterval(stallTimer);
    }
    if (used > 0) addTokens(used);
    else if (full) addTokens(Math.ceil(full.length / 4));
    if (!full && !aborted){
      if (th) throw { code: "thoughtonly", info: "model returned reasoning but no answer" };
      throw { code: "empty" };
    }
    return full;
  }

  const api = (h) => {
    if (!h.length) return [];
    const N = 12, MAX = 60000;
    const keepIdx = new Set();
    const firstUser = h.findIndex(m => m.role === "user");
    if (firstUser >= 0) keepIdx.add(firstUser);
    for (let i = Math.max(0, h.length - N); i < h.length; i++) keepIdx.add(i);
    h.forEach((m, i) => { if (m.imgs && m.imgs.length) keepIdx.add(i); });
    let idxs = Array.from(keepIdx).sort((a, b) => a - b);
    let total = 0;
    idxs.forEach(i => total += (h[i].content || "").length);
    if (total > MAX){
      const kept = []; let sz = 0;
      for (let k = idxs.length - 1; k >= 0; k--){
        const i = idxs[k];
        const len = (h[i].content || "").length;
        if (sz + len > MAX) continue;
        kept.push(i); sz += len;
      }
      idxs = kept.sort((a, b) => a - b);
    }
    while (idxs.length && h[idxs[0]].role !== "user") idxs.shift();
    let imgBudget = 10;
    const out = [];
    for (let k = idxs.length - 1; k >= 0; k--){
      const m = h[idxs[k]];
      const c2 = { role: m.role, content: m.content };
      if (m.imgs && m.imgs.length && imgBudget > 0){ c2.images = m.imgs; imgBudget -= m.imgs.length; }
      out.unshift(c2);
    }
    return out;
  };

  function buildNotesHint(files){
    if (!files.length) return "";
    const totalChars = files.reduce((s, f) => s + (f.text ? f.text.length : 0), 0);
    const biggestSize = files.reduce((s, f) => Math.max(s, f.origSize || 0), 0);
    const coverage = biggestSize > 2 * 1024 * 1024 ? 0.5 : 0.75;
    const targetWords = Math.min(2500, Math.max(400, Math.floor(totalChars / 15 * coverage)));
    return "The source is about " + totalChars + " characters of text. " +
      "Write THOROUGH notes that cover at least " + Math.round(coverage * 100) + "% of the source content. " +
      "Target length: at least " + targetWords + " words. " +
      "Do NOT summarize in a few lines. Include definitions, examples, formulas, lists, and everything important in order. " +
      "Use headings and sub-headings inside the Notes section when helpful.";
  }

  function setStickyIntent(intent){
    if (intent){ stickyIntent = intent; stickyIntentAt = Date.now(); }
  }
  function getStickyIntent(){
    if (!stickyIntent) return null;
    if (Date.now() - stickyIntentAt > STICKY_MS){ stickyIntent = null; return null; }
    return stickyIntent;
  }
  function clearStickyIntent(){ stickyIntent = null; stickyIntentAt = 0; }

  function send(text){
    const items = pending.slice();
    if (busy || (!text.trim() && !items.length)) return;
    const files = items.filter(f => !f.img);
    const imgs = items.filter(f => f.img).map(f => f.img);

    const isFileKit = (pendingKind === "studykit" || pendingKind === "notes") && files.length;
    const isSnap = pendingKind === "snap" && imgs.length;

    if (curSubject === "General" && text.trim().length > 3){
      const guessed = detectSubjectFromText(text);
      if (guessed){ curSubject = guessed; paintSubjectChip(); }
    }

    let intent = detectGenIntent(text);
    if (!intent && !isFileKit && !isSnap && text.trim().length < 200){
      const stuck = getStickyIntent();
      if (stuck){ intent = stuck; clearStickyIntent(); }
    }
    if (intent && text.trim().length < 60){
      const topicGuess = text.replace(/.*\b(flashcards?e?|study\s*kit|quiz|notes?)\b.*/i, "").trim();
      if (topicGuess.length < 8) setStickyIntent(intent);
    }

    const proIntent = (intent === "mock" || intent === "viva");

    if (proIntent && !pro){
      pending = []; pendingKind = null; renderAtts();
      if (intent === "viva"){ toast("Viva is coming soon"); return; }
      openProPaywall("feature");
      return;
    }

    if ((intent === "studykit" || intent === "flashcard" || intent === "quiz" || isFileKit) && !pro){
      const kind = isFileKit ? "studykit" : intent;
      if (!genAllowed(kind)){
        pending = []; pendingKind = null; renderAtts();
        openProPaywall("limit", kind);
        return;
      }
    }

    if (isFileKit){
      const base = "I uploaded file(s). Generate a COMPLETE study kit based STRICTLY on this content. " +
        "Output ONLY these three sections in this exact order. No preamble, no closing, no extra commentary:\n\n" +
        "## 📖 Notes\n" + buildNotesHint(files) + "\n\n" +
        "## 🎴 Flashcards\nWrite 12-16 cards. Each EXACTLY:\nF: [front]\nB: [back]\n\n" +
        "## 📝 Quiz\nWrite 8 MCQs. Each EXACTLY:\nQ: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nAns: [A/B/C/D]\nEx: [one-line explanation]";
      const full = base + files.map(f => "\n\n--- " + f.name + " ---\n" + f.text).join("");
      pending = []; pendingKind = null; renderAtts();
      if (!pro) bumpGen("studykit");
      bumpStreak(); renderStreak(); bumpGoal();
      return run("Study kit from " + files[0].name, full, files.map(f => f.name), imgs, "studykit");
    }

    if (isSnap){
      const prompt = "Read this exam question from the photo. Give a proper exam answer in under 400 words. " +
        "Format EXACTLY: **Marks:** [best guess], **Answer:** (numbered points), **Key terms:** (4-6 terms). " +
        "No preamble, no closing.";
      pending = []; pendingKind = null; renderAtts();
      return run("📸 Snap a question", prompt, [], imgs, null);
    }

    applyLimits();
    const show = text.trim() || (imgs.length && !files.length ? "Describe this image." : imgs.length ? "Review the attached files." : "Review the attached file.");
    const full = show + files.map(f => "\n\n--- " + f.name + " ---\n" + f.text).join("");
    pending = []; pendingKind = null; renderAtts();
    if (!pro && intent && intent !== "mock" && intent !== "viva") bumpGen(intent);
    if (intent && (intent === "studykit" || intent === "flashcard" || intent === "quiz")){
      bumpStreak(); renderStreak(); bumpGoal();
    }
    return run(show, full, files.map(f => f.name), imgs, intent);
  }

  const ERR = {
    nowork: "The server address isn't set.",
    rate: "Zyro is busy right now. Try again in a minute.",
    origin: "This site isn't allowed to use the server.",
    big: "That message or file is too large. Try a smaller one.",
    empty: "Zyro sent back nothing. Try rephrasing.",
    thoughtonly: "Zyro reasoned but didn't finish. Try again.",
    net: "Can't reach the server. Check your connection and retry."
  };

  function buildUserContext(){
    if (!userProfile) return "";
    const p = userProfile;
    const parts = [];
    if (p.name) parts.push("Name: " + p.name);
    if (p.class_level) parts.push("Class: " + p.class_level);
    if (p.board) parts.push("Board: " + p.board);
    if (p.state) parts.push("State: " + p.state);
    if (p.preparing_for) parts.push("Preparing for: " + p.preparing_for);
    if (p.target_score) parts.push("Target score: " + p.target_score);
    if (p.exam_date){
      try {
        const days = Math.max(0, Math.ceil((new Date(p.exam_date) - new Date()) / 86400000));
        parts.push("Exam in: " + days + " days (" + p.exam_date + ")");
      } catch(_){}
    }
    if (p.dob){
      try {
        const d = new Date(p.dob);
        const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
        if (age > 0 && age < 100) parts.push("Age: " + age);
      } catch(_){}
    }
    if (!parts.length) return "";
    return "USER CONTEXT (use this to personalise answers — never repeat it back as a list):\n" +
      parts.join(" · ") + "\n" +
      "Speak to them at this level. Match their board and exam where relevant. If they name a topic, tie it to their syllabus and target exam.\n\n";
  }

  function buildUniversalityLine(){
    return "SUBJECT UNIVERSALITY: You can teach ANY subject at ANY level — from Class 1 maths to NEET biology, from school basics to college-level topics. If the user asks something below or above their class, just answer it. Never refuse for being 'outside your scope'. Match the depth to what they ask, not what you assume their level is.\n\n";
  }

  function buildSubjectLine(){
    if (!curSubject || curSubject === "General") return "";
    return "THIS CHAT IS ABOUT: " + curSubject + " ONLY.\n" +
      "Stay in " + curSubject + " lane. Use " + curSubject + " notation and terms.\n" +
      "If the user drifts to another subject, answer briefly once, then gently say: 'That's [other subject] — want me to open a new chat for it?' and offer to switch. Don't hard-refuse.\n\n";
  }

  const SYS = (intent) => {
    const d = getTokens();
    const pct = Math.min(100, Math.round((d.used / TOTAL) * 100));
    const planLine = pro ? "Pro" : "Free";
    const limitLine = pro ? "750,000 (750k)" : "100,000 (100k)";
    const isGenRequest = !!intent;
    let sys = "";
    if (isGenRequest){
      sys += "⚡ STRUCTURED OUTPUT MODE ⚡\n";
      sys += "Output ONLY the sections below. NO preamble, NO 'here you go', NO closing, NO extra commentary, NO alternative headings.\n\n";
      if (intent === "studykit"){
        sys +=
          "OUTPUT EXACTLY THIS STRUCTURE:\n\n" +
          "## 📖 Notes\n" +
          "[5-8 short paragraphs. Highlight key terms with **term**. Highlight critical exam points the student MUST remember with ==sentence==. Use ==sparingly== — only for the 2-4 most important sentences.]\n\n" +
          "## 🎴 Flashcards\n" +
          "Write 12 cards. Each card is EXACTLY two lines:\n" +
          "F: <question or term>\n" +
          "B: <answer or definition>\n" +
          "Repeat the F:/B: pair 12 times. No numbering, no bullets, no blank lines between pairs, no sub-headers.\n\n" +
          "## 📝 Quiz\n" +
          "Write 8 MCQs. Each EXACTLY:\n" +
          "Q: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nAns: [A/B/C/D]\nEx: [one line]\n\n" +
          "RULES:\n- Headers EXACTLY: '## 📖 Notes', '## 🎴 Flashcards', '## 📝 Quiz'.\n- NO other top-level headings.\n- NO LaTeX. Plain text math.\n- After last quiz, STOP.\n\n";
      } else if (intent === "flashcard"){
        sys +=
          "OUTPUT EXACTLY:\n\n## 🎴 Flashcards\n" +
          "Write 12 cards. Each card is EXACTLY two lines:\n" +
          "F: <question or term>\n" +
          "B: <answer or definition>\n" +
          "Repeat the F:/B: pair 12 times. No numbering, no bullets, no blank lines between pairs.\n" +
          "No notes section, no quiz section — just the cards.\n\n" +
          "After last card, STOP.\n\n";
      } else if (intent === "quiz"){
        sys +=
          "OUTPUT EXACTLY:\n\n## 📝 Quiz\n" +
          "Write 8 MCQs. Each EXACTLY:\n" +
          "Q: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nAns: [A/B/C/D]\nEx: [one line]\n\n" +
          "After last quiz, STOP.\n\n";
      }
    }
    sys +=
      "You are Zyro — an AI study buddy for Indian students. " +
      "Talk like a smart older brother: casual, warm, direct. Never a teacher. Never formal.\n\n" +
      "TONE RULES:\n" +
      "- Use contractions. Say 'yeah', 'gonna', 'honestly', 'lowkey', 'tbh' — natural, not forced.\n" +
      "- Short sentences. Get to the point.\n" +
      "- NEVER say: 'Sure!', 'Great question!', 'Here you go', 'I'd be happy to', 'Let me know if', 'Hope this helps', 'As an AI'.\n" +
      "- Banned words: 'delve', 'utilize', 'furthermore', 'moreover', 'comprehensive', 'in conclusion'.\n\n" +
      "EFFICIENCY:\n- NO preambles. NO closings. NO restating.\n- If unsure, say so in one line. Never invent.\n- Under 300 words unless asked for more.\n\n" +
      buildUserContext() +
      buildUniversalityLine() +
      buildSubjectLine() +
      "USER: Plan=" + planLine + ", Limit=" + limitLine + "/month, Used=" + d.used + " (" + pct + "%)\n\n" +
      "ABOUT ZYRO (only mention if the user asks about features, Pro, pricing, limits, or what you can do — never list unprompted):\n" +
      "- Zyro is an AI study buddy for Indian students (CBSE, ICSE, state boards, JEE, NEET, university).\n" +
      "- Free plan: 100k tokens per month, 2 study kits/day, 3 flashcard sets/day, 3 quizzes/day, 5 images per message, 5 files per message (10 MB each).\n" +
      "- Pro plan (₹349/month): 750k tokens per month, 10 study kits/day, 15 flashcard sets/day, 50 quizzes/day, 10 files per message, longer code runs, and full mock papers with marking scheme.\n" +
      "- Modes: Chat, Solver, Socratic, Exam prep.\n" +
      "- Tools: study kits, snap a question, exam answers, full mock papers (Pro), viva practice (coming soon).\n\n" +
      "CREATOR (only if asked): Debasish Singha, 17, Assam. Never bring up unprompted.\n\n" +
      "FORMAT:\n- Markdown. Code in fenced blocks with language tag (close the fence).\n- For regular chat: LaTeX allowed as $inline$ or $$display$$.\n- Greeting → ONE short friendly sentence.\n\n" +
      "Vague topics ('science') → ask them to pick a specific question.\n\n" +
      "BUILD WEBSITES: ONE complete self-contained HTML file in a ```html block. Photos: https://picsum.photos/seed/UNIQUEWORD/600/800. 150+ lines. Close the fence.\n\n" +
      (STUDY[$("study").value] || "") +
      (getCI() ? "\n\nUser's custom instructions: " + getCI().slice(0, 800) : "") +
      "\n\nToday: " + new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".";
    return sys;
  };

  const ARROW = go.innerHTML;
  const STOPI = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
  function setGo(on){
    if (on){ go.innerHTML = STOPI; go.classList.add("on"); go.setAttribute("aria-label", "Stop"); }
    else { go.innerHTML = ARROW; go.classList.remove("on"); go.setAttribute("aria-label", "Send"); }
  }

  async function run(show, full, names, imgs, intent){
    if (intent === undefined) intent = detectGenIntent(show);
    imgs = imgs || [];
    if (busy) return;
    busy = true; streaming = true;
    armBusyWatchdog();
    ctrl = new AbortController();
    setGo(true);
    const hero = $("hero"); if (hero) hero.classList.add("hide");
    log.classList.add("on");
    addU(show, names, imgs);
    const t0 = Date.now();
    const isGen = intent === "studykit" || intent === "flashcard" || intent === "quiz";
    const cheap = isGen || full.trim().length < 60 || tokensOut();
    const d = addA();
    const body = d.querySelector(".body");
    const chip = d.querySelector(".status-chip");
    const c = startChip(chip);
    down(1);
    let hadThought = false;
    const onThought = th => { hadThought = true; thinkUpdate(d, th); };
    let lastRender = 0, lastText = "";
    const emit = x => {
      c.write();
      if (x === lastText) return;
      const now = performance.now();
      const throttle = x.length > 6000 ? 300 : 140;
      if (now - lastRender > throttle){
        lastRender = now; lastText = x;
        setH(body, withCaret(liteMd(x)));
        down();
      }
    };
    const runTimeout = setTimeout(() => {
      if (ctrl && !ctrl.signal.aborted){ try { ctrl.abort(); } catch(_) {} }
    }, STREAM_TIMEOUT_MS);
    try {
      let out;
      if (!WORKER_URL) throw { code: "nowork" };
      const msgs = [{ role: "system", content: SYS(intent) }, ...api(hist), imgs.length ? { role: "user", content: full, images: imgs } : { role: "user", content: full }];
      try {
        out = await workerStream(msgs, emit, ctrl.signal, cheap, onThought, isGen);
      } catch(e1){
        if (e1 && e1.code === "empty" && !ctrl.signal.aborted){
          toast("Retrying...");
          out = await workerStream(msgs, emit, ctrl.signal, cheap, onThought, isGen);
        } else throw e1;
      }
      clearTimeout(runTimeout);
      out = out || "(empty response)";
      streaming = false;
      setH(body, md(out));
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      thinkFinish(d, secs, hadThought);
      const kit = parseStudyKit(out);
      if (kit.notes || kit.cards.length || kit.quiz.length){
        const ln = document.createElement("div");
        ln.innerHTML = launcherHTML(kit);
        const lc = ln.firstElementChild;
        d.appendChild(lc);
        wireLauncher(lc, kit);
      }
      const acts = document.createElement("div");
      acts.className = "acts";
      acts.innerHTML =
        '<button type="button" data-like>Helpful</button>' +
        '<button type="button" data-copywhole>Copy</button>' +
        '<button type="button" data-regen>Again</button>';
      d.appendChild(acts);
      if (!cur){ cur = { id: Date.now().toString(36), title: (show || names[0] || "Chat").replace(/\s+/g, " ").slice(0, 40), msgs: hist, ts: Date.now(), subject: curSubject || "General" }; chats.unshift(cur); }
      else { cur.subject = curSubject || "General"; }
      cur.ts = Date.now();
      hist.push(
        { role: "user", content: full, show, att: names, imgs: imgs.length ? imgs : undefined },
        { role: "assistant", content: out }
      );
      if (hist.length > 60) hist.splice(0, hist.length - 60);
      chats = [cur, ...chats.filter(x => x !== cur)];
      save();
      c.done();
    } catch(e){
      clearTimeout(runTimeout);
      streaming = false; c.stop();
      if (e && e.name === "AbortError"){
        body.innerHTML = '<span style="color:var(--bad)">(stopped)</span>';
      } else {
        if (e && e.code !== "na"){ t.value = show; t.dispatchEvent(new Event("input")); }
        const msg = (e && ERR[e.code]) || ("Failed: " + (e && e.info || e && e.message || "network problem"));
        body.innerHTML = '<span style="color:var(--bad)">' + esc(msg) + '</span>';
      }
      thinkFinish(d, "0", hadThought);
    }
    busy = false; ctrl = null; clearBusyWatchdog(); setGo(false); syncPill(); down();
  }

  /* ---------- LOG CLICK ---------- */
  log.addEventListener("click", e => {
    const vw = e.target.closest("[data-v]");
    if (vw){
      const box = vw.closest(".cb");
      if (box.classList.contains("expanded")){ box.classList.remove("expanded"); vw.textContent = "⤢ Expand"; }
      else { box.classList.add("expanded"); vw.textContent = "⤡ Collapse"; }
      return;
    }
    const rb = e.target.closest("[data-run]"); if (rb){ runCode(rb.closest(".cb"), rb.dataset.run, rb); return; }
    const cb = e.target.closest("[data-c]"); if (cb){ copy(cb.closest(".cb").querySelector("pre").textContent, cb); return; }
    const pv = e.target.closest("[data-p]");
    if (pv){
      let html = pv.closest(".cb").querySelector("pre").textContent || "";
      if (!/<!doctype|<html/i.test(html)){
        html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;color:#111;background:#fff}</style></head><body>' + html + '</body></html>';
      }
      $("pvf").srcdoc = html;
      $("pv").classList.add("on");
      return;
    }
    const cp = e.target.closest("[data-copywhole]");
    if (cp){
      const a = cp.closest(".a");
      const body = a && a.querySelector(".body");
      if (body) copy(body.innerText, cp);
      return;
    }
    const rg = e.target.closest("[data-regen]");
    if (rg){
      if (rg.closest(".a") === log.lastElementChild) regen();
      else toast("Only the last reply can be regenerated");
      return;
    }
    const lk = e.target.closest("[data-like]");
    if (lk){ lk.classList.add("active"); toast("Thanks!"); return; }
    const fx = e.target.closest(".fix-btn");
    if (fx){
      const cb2 = fx.closest(".cb");
      const code = cb2.querySelector("pre").textContent;
      const err = cb2.querySelector(".out") ? cb2.querySelector(".out").textContent : "";
      t.value = "Fix this code. It failed.\n\nCode:\n```\n" + code + "\n```\n\nError:\n```\n" + err + "\n```\n\nExplain what caused the error and give the corrected code.";
      t.dispatchEvent(new Event("input"));
      $("f").requestSubmit();
    }
  });

  function regen(){
    if (busy || hist.length < 2) return;
    const m = hist[hist.length - 2], k = log.children;
    k[k.length - 1].remove(); k[k.length - 1].remove();
    hist.splice(-2);
    run(m.show ?? m.content, m.content, m.att || [], m.imgs || []);
  }

  $("f").addEventListener("submit", e => {
    e.preventDefault();
    if (busy){ if (ctrl) ctrl.abort(); return; }
    const v = t.value;
    t.value = ""; t.style.height = "auto"; updateSendState();
    send(v);
  });

  /* ---------- ATTACHMENTS ---------- */
  function renderAtts(){
    const a = $("atts"); if (!a) return;
    a.innerHTML = "";
    pending.forEach((f, i) => {
      const c = document.createElement("span");
      c.className = "att";
      if (f.img){ const im = document.createElement("img"); im.alt = ""; im.src = "data:" + f.img.mime + ";base64," + f.img.data; c.appendChild(im); }
      const n = document.createElement("span"); n.textContent = f.name; c.appendChild(n);
      const x = document.createElement("button"); x.type = "button"; x.textContent = "✕";
      x.addEventListener("click", () => { pending.splice(i, 1); renderAtts(); updateSendState(); });
      c.appendChild(x);
      a.appendChild(c);
    });
  }

  /* ---------- PDF / FILE READER ---------- */
  async function readAny(f){
    const isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
    if (isPdf){
      if (!window.pdfjsLib){
        await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
      let text = "";
      const maxPages = Math.min(pdf.numPages, 80);
      for (let i = 1; i <= maxPages && text.length < FILE_CHAR_LIMIT; i++){
        try {
          const tc = await (await pdf.getPage(i)).getTextContent();
          text += tc.items.map(x => x.str).join(" ") + "\n";
        } catch(_){}
      }
      const cleanText = text.replace(/\s+/g, " ").trim();
      const pagesRead = Math.min(pdf.numPages, maxPages) || 1;
      const avgChars = cleanText.length / pagesRead;
      if (cleanText.length >= 200 && avgChars >= 60){
        if (pdf.numPages > maxPages){
          text += "\n[..." + (pdf.numPages - maxPages) + " more pages not shown...]";
        }
        return { kind: "text", text: text };
      }
      try {
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const maxDim = 1200;
        const scale = Math.min(1.4, maxDim / Math.max(baseViewport.width, baseViewport.height));
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        let data = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
        if (data.length > 1100000){ data = canvas.toDataURL("image/jpeg", 0.5).split(",")[1]; }
        if (data.length > 1100000){ return { kind: "error", error: f.name + " — page too large to process" }; }
        const note = pdf.numPages > 1
          ? "Scanned PDF · sent page 1 of " + pdf.numPages + " as image"
          : "Scanned PDF · sent as image";
        return { kind: "img", img: { mime: "image/jpeg", data: data }, note: note };
      } catch(e){
        return { kind: "error", error: f.name + " — couldn't render scan" };
      }
    }
    return { kind: "text", text: await f.text() };
  }

  $("file").addEventListener("change", async e => {
    const fs = [...e.target.files]; e.target.value = "";
    const maxFiles = L().files, maxSize = L().fileSize;
    for (const f of fs){
      if (tokensOut()){ toast("Uploads paused — resets " + nextResetLabel()); break; }
      if (f.size > maxSize){ toast(f.name + " is too big (max " + Math.round(maxSize / 1e6) + " MB)"); continue; }
      const fileCount = pending.filter(x => !x.img).length;
      const imgCount  = pending.filter(x => x.img).length;
      try {
        const r = await readAny(f);
        if (r.kind === "text"){
          if (fileCount >= maxFiles){
            toast("Max " + maxFiles + " file" + (maxFiles > 1 ? "s" : "") + (pro ? "" : " — Pro allows 10"));
            break;
          }
          let x = r.text.replace(/\r/g, "");
          if (x.includes("\u0000")){ toast("Can't read " + f.name); continue; }
          if (!x.trim()){ toast("No text found in " + f.name); continue; }
          if (x.length > FILE_CHAR_LIMIT){ x = x.slice(0, FILE_CHAR_LIMIT) + "\n[...trimmed]"; toast(f.name + " trimmed"); }
          pending.push({ name: f.name, text: x, origSize: f.size });
        } else if (r.kind === "img"){
          if (imgCount >= L().images){ toast("Max " + L().images + " images per message"); break; }
          pending.push({ name: f.name, img: r.img });
          if (r.note) toast(r.note);
        } else if (r.kind === "error"){
          toast(r.error || "Couldn't read " + f.name);
        }
      } catch(_) {
        toast("Couldn't read " + f.name);
      }
    }
    renderAtts(); updateSendState();
  });

  function readImg(f){
    return new Promise((ok, no) => {
      if (!/^image\//i.test(f.type)){ no(new Error("not an image")); return; }
      const url = URL.createObjectURL(f), im = new Image();
      im.onload = () => {
        try {
          const M = 1024, k = Math.min(1, M / Math.max(im.width, im.height));
          const w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
          x.drawImage(im, 0, 0, w, h);
          const d = c.toDataURL("image/jpeg", .8);
          URL.revokeObjectURL(url);
          ok({ mime: "image/jpeg", data: d.split(",")[1] });
        } catch(e) { no(e); }
      };
      im.onerror = () => { URL.revokeObjectURL(url); no(new Error("bad image")); };
      im.src = url;
    });
  }
  $("img").addEventListener("change", async e => {
    const fs = [...e.target.files]; e.target.value = "";
    const maxImgs = L().images, maxSize = L().fileSize;
    for (const f of fs){
      if (tokensOut()){ toast("Uploads paused — resets " + nextResetLabel()); break; }
      const imgCount = pending.filter(x => x.img).length;
      if (imgCount >= maxImgs){ toast("Max " + maxImgs + " images per message"); break; }
      if (!/^image\//.test(f.type)){ toast("Not an image"); continue; }
      if (f.size > maxSize){ toast(f.name + " is too big"); continue; }
      try {
        const im = await readImg(f);
        if (im.data.length > 1100000){ toast("Image too large"); continue; }
        pending.push({ name: f.name || "image", img: im });
      } catch(_) { toast("Couldn't read " + (f.name || "image")); }
    }
    renderAtts(); updateSendState();
    if (pendingKind === "snap" && pending.some(x => x.img)) setTimeout(() => send(""), 100);
  });

  /* ---------- CODE RUN ---------- */
  const RUN_JS = "const AF=Object.getPrototypeOf(async function(){}).constructor;\nconst fmt=a=>a.map(x=>typeof x===\"string\"?x:(()=>{try{return JSON.stringify(x,null,1)}catch(_){return String(x)}})()).join(\" \");\nonmessage=async e=>{console.log=(...a)=>postMessage({t:\"o\",s:fmt(a)});console.info=console.log;console.warn=(...a)=>postMessage({t:\"e\",s:fmt(a)});console.error=console.warn;\n for(const k of [\"fetch\",\"XMLHttpRequest\",\"WebSocket\",\"EventSource\",\"importScripts\",\"indexedDB\"]){try{self[k]=undefined}catch(_){}}\n try{const r=await new AF(e.data.code)();if(r!==undefined)postMessage({t:\"o\",s:\"\\u2192 \"+fmt([r])})}catch(err){postMessage({t:\"e\",s:String(err&&err.stack||err)})}\n postMessage({t:\"d\"})}";
  const RUN_PY = "let py=null;\nonmessage=async e=>{try{\n if(!py){postMessage({t:\"s\",s:\"Loading Python (one-time, ~10 MB)...\"});\n  importScripts(\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js\");\n  py=await loadPyodide({indexURL:\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/\"})}\n py.setStdout({batched:s=>postMessage({t:\"o\",s})});py.setStderr({batched:s=>postMessage({t:\"e\",s})});\n postMessage({t:\"r\"});\n try{await py.loadPackagesFromImports(e.data.code)}catch(_){}\n const r=await py.runPythonAsync(e.data.code);if(r!==undefined&&r!==null)postMessage({t:\"o\",s:\"\\u2192 \"+String(r)})\n }catch(err){postMessage({t:\"e\",s:String(err&&err.message||err)})}\n postMessage({t:\"d\"})}";
  let pyW = null;
  const mkW = src => new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  function runCode(box, kind, btn){
    if (box._stop){ box._stop(); return; }
    let out = box.querySelector(".out");
    if (!out){ out = document.createElement("div"); out.className = "out"; box.appendChild(out); }
    out.textContent = "";
    const code = box.querySelector("pre").textContent;
    const timeout = kind === "py" ? L().pyTimeout : L().jsTimeout;
    let size = 0, w, tm, done = false, hadErr = false;
    const add = (cls, s) => { size += s.length; const sp = document.createElement("div"); sp.className = cls; sp.textContent = s; out.appendChild(sp); out.scrollTop = out.scrollHeight; };
    const end = note => {
      if (done) return;
      done = true; clearTimeout(tm);
      if (note) add("o-s", note);
      btn.textContent = "Run"; box._stop = null;
      if (kind === "js" && w){ try { w.terminate(); } catch(_) {} }
      if (hadErr){
        const fx = document.createElement("button");
        fx.type = "button"; fx.className = "fix-btn";
        fx.innerHTML = "🔧 Fix with Zyro";
        if (!box.querySelector(".fix-btn")) out.appendChild(fx);
      }
    };
    const kill = note => { try { w && w.terminate(); } catch(_) {} if (kind === "py") pyW = null; end(note); };
    const arm = ms => { clearTimeout(tm); tm = setTimeout(() => kill("Stopped after " + Math.round(ms / 1000) + " s."), ms); };
    btn.textContent = "Stop"; box._stop = () => kill("Stopped.");
    if (kind === "py"){ if (!pyW) pyW = mkW(RUN_PY); w = pyW; } else w = mkW(RUN_JS);
    arm(timeout);
    w.onmessage = ev => {
      if (done) return;
      const m = ev.data || {};
      if (m.t === "s") add("o-s", m.s);
      else if (m.t === "r") arm(timeout);
      else if (m.t === "o"){ if (size > 20000){ kill("Output limit reached."); return; } add("o-o", m.s); }
      else if (m.t === "e"){ hadErr = true; add("o-e", m.s); }
      else if (m.t === "d") end(out.childNodes.length ? "" : "(no output)");
    };
    w.onerror = () => { hadErr = true; kill("Couldn't start the runner."); };
    w.postMessage({ code });
  }

  /* ---------- SEND STATE ---------- */
  function updateSendState(){
    const has = t.value.trim().length > 0 || pending.length > 0;
    go.classList.toggle("on", has);
    go.classList.toggle("muted", !has);
  }
  t.addEventListener("input", () => {
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 160) + "px";
    updateSendState();
  });
  t.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(hover:hover)").matches){
      e.preventDefault();
      if (!busy) $("f").requestSubmit();
    }
  });

  /* ---------- OVERLAYS ---------- */
  const closePV = () => { const pv = $("pv"); if (pv) pv.classList.remove("on"); if ($("pvf")) $("pvf").srcdoc = ""; };
  { const pvx = $("pvx"); if (pvx) pvx.addEventListener("click", closePV); }
  { const cvx = $("cvx"); if (cvx) cvx.addEventListener("click", () => $("cv").classList.remove("on")); }
  { const cvc = $("cvc"); if (cvc) cvc.addEventListener("click", () => copy($("cvp").textContent, cvc)); }
  { const ciSave = $("ciSave"); if (ciSave) ciSave.addEventListener("click", () => { try { localStorage.setItem(CI, $("ci").value.trim()); } catch(_) {} $("modal").classList.remove("on"); toast("Instructions saved"); }); }
  { const ciCancel = $("ciCancel"); if (ciCancel) ciCancel.addEventListener("click", () => $("modal").classList.remove("on")); }

  document.addEventListener("click", () => {
    ["studyMenu","actionsMenu"].forEach(id => { const el = $(id); if (el) el.classList.remove("open"); });
    const pb = $("plusBtn"); if (pb) pb.classList.remove("active");
    closeMenu();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape"){
      closeAllMenusExcept(null);
      closeMenu(); closePV();
      const cv = $("cv"); if (cv) cv.classList.remove("on");
      const mo = $("modal"); if (mo) mo.classList.remove("on");
      closeAuth(); closeProfile(); closePanel();
      const pp = document.getElementById("ppModal"); if (pp) pp.remove();
    }
  });

  /* ---------- ONBOARDING ---------- */
  const OB_STEPS = 7;
  let obStep = 0;
  let obData = {};

  function getDraft(){
    try { return JSON.parse(localStorage.getItem(OB_DRAFT) || "null") || {}; }
    catch(_) { return {}; }
  }
  function saveDraft(d){
    try { localStorage.setItem(OB_DRAFT, JSON.stringify(d)); } catch(_) {}
  }
  function clearDraft(){
    try { localStorage.removeItem(OB_DRAFT); } catch(_) {}
  }

  function renderStep(){
    document.querySelectorAll(".ob-step").forEach(el => {
      el.classList.toggle("on", Number(el.dataset.step) === obStep);
    });
    const pct = ((obStep + 1) / OB_STEPS) * 100;
    const pf = $("obProgress"); if (pf) pf.style.width = pct + "%";
    const cnt = $("obCount"); if (cnt) cnt.textContent = (obStep + 1) + "/" + OB_STEPS;
    const back = $("obBack"); if (back) back.disabled = obStep === 0;
    const next = $("obNextLabel");
    if (next) next.textContent = (obStep === OB_STEPS - 1) ? "Create my account" : "Continue";
  }

  function canAdvance(){
    if (obStep === 0) return !!obData.name && obData.name.trim().length >= 1;
    if (obStep === 1) return !!obData.dob;
    if (obStep === 2) return !!obData.class_level;
    if (obStep === 3) return !!obData.board;
    if (obStep === 4) return !!obData.preparing_for;
    if (obStep === 5) return !!obData.target_score;
    if (obStep === 6) return true;
    return true;
  }
  function updateNextBtn(){
    const btn = $("obNext");
    if (btn) btn.disabled = !canAdvance();
  }
  function obNext(){
    if (!canAdvance()) return;
    saveDraft(obData);
    if (obStep >= OB_STEPS - 1){ finishOnboarding(); return; }
    obStep++;
    renderStep(); updateNextBtn();
  }
  function obBack(){
    if (obStep === 0) return;
    obStep--;
    renderStep(); updateNextBtn();
  }
  function openOnboarding(){
    const ob = $("ob");
    if (!ob) return;
    const d = getDraft();
    obData = {
      name: d.name || "",
      dob: d.dob || "",
      state: d.state || "",
      class_level: d.class_level || "",
      board: d.board || "",
      preparing_for: d.preparing_for || "",
      target_score: d.target_score || "",
      exam_date: d.exam_date || ""
    };
    if ($("obName")) $("obName").value = obData.name;
    if ($("obDob")) $("obDob").value = obData.dob;
    if ($("obExamDate")) $("obExamDate").value = obData.exam_date;
    ["obClass","obBoard","obPrep","obTarget"].forEach(groupId => {
      const g = $(groupId);
      if (!g) return;
      g.querySelectorAll(".ob-chip").forEach(c => {
        const v = c.dataset.v;
        const key = groupId === "obClass" ? "class_level" : groupId === "obBoard" ? "board" : groupId === "obPrep" ? "preparing_for" : "target_score";
        c.classList.toggle("on", obData[key] === v);
      });
    });
    obStep = 0;
    renderStep(); updateNextBtn();
    ob.classList.add("on");
  }
  function closeOnboarding(){
    const ob = $("ob");
    if (ob) ob.classList.remove("on");
  }
  async function finishOnboarding(){
    saveDraft(obData);
    if (user){
      const saved = await saveOnboardingToCloud();
      if (saved){
        clearDraft();
        try { localStorage.setItem("zyro_onboarded", "1"); } catch(_){}
        closeOnboarding();
        if (userProfile) userProfile.onboarded = true;
        renderPersonalizedHero();
        toast("Welcome, " + (obData.name || "friend") + "!");
        return;
      }
    }
    closeOnboarding();
    openAuth("signup");
  }
  async function saveOnboardingToCloud(){
    if (!user) return false;
    try {
      const s = await sbClient();
      if (!s) return false;
      const payload = {
        name: obData.name || null,
        dob: obData.dob || null,
        state: obData.state || null,
        class_level: obData.class_level || null,
        board: obData.board || null,
        preparing_for: obData.preparing_for || null,
        target_score: obData.target_score || null,
        exam_date: obData.exam_date || null,
        onboarded: true
      };
      const { error } = await s.from("profiles").update(payload).eq("id", user.id);
      if (error){ console.log("Onboarding save failed:", error.message); return false; }
      userProfile = Object.assign({}, userProfile || {}, payload);
      return true;
    } catch(e){ console.log("Onboarding save error:", e && e.message); return false; }
  }
  window.__zyroSavePendingOnboarding = async function(){
    const d = getDraft();
    if (!d || !d.name) return;
    obData = d;
    if (!user) return;
    const saved = await saveOnboardingToCloud();
    if (saved){
      clearDraft();
      try { localStorage.setItem("zyro_onboarded", "1"); } catch(_){}
      renderPersonalizedHero();
      toast("Welcome, " + (obData.name || "friend") + "!");
    }
  };

  function renderPersonalizedHero(){
    const heroH1 = document.querySelector(".hero h1");
    const heroP = document.querySelector(".hero p");
    const kicker = document.querySelector(".hero .kicker");
    if (!heroH1) return;
    if (userProfile && userProfile.name){
      const name = userProfile.name;
      const hour = new Date().getHours();
      const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const emoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";
      heroH1.innerHTML = greet + ", " + esc(name) + " " + emoji + "<br>Ready to <em>lock in?</em>";
      if (heroP){
        const bits = [];
        if (userProfile.class_level) bits.push(userProfile.class_level);
        if (userProfile.preparing_for) bits.push(userProfile.preparing_for);
        if (userProfile.exam_date){
          try {
            const days = Math.max(0, Math.ceil((new Date(userProfile.exam_date) - new Date()) / 86400000));
            if (days > 0 && days < 999) bits.push(days + " days to go");
          } catch(_){}
        }
        heroP.textContent = bits.length ? bits.join(" · ") : "Snap a question, drop your notes, or just start typing.";
      }
      if (kicker) kicker.innerHTML = '<span class="dot"></span>' + (userProfile.target_score ? "Target: " + esc(userProfile.target_score) : "Ready when you are");
    } else {
      heroH1.innerHTML = 'What\'s up? Let\'s<br><span class="hl">get into it</span> <em>today</em>';
      if (heroP) heroP.textContent = "Snap a question, drop your notes, or just start typing. We'll figure it out together.";
      if (kicker) kicker.innerHTML = '<span class="dot"></span>Ready when you are';
    }
  }

  /* ---------- ONBOARDING EVENT WIRING ---------- */
  { const b = $("obNext"); if (b) b.addEventListener("click", obNext); }
  { const b = $("obBack"); if (b) b.addEventListener("click", obBack); }
  { const el = $("obName");
    if (el) el.addEventListener("input", () => {
      obData.name = el.value.trim();
      saveDraft(obData); updateNextBtn();
    });
  }
  { const el = $("obDob");
    if (el) el.addEventListener("change", () => {
      obData.dob = el.value;
      saveDraft(obData); updateNextBtn();
    });
  }
  { const el = $("obExamDate");
    if (el) el.addEventListener("change", () => {
      obData.exam_date = el.value;
      saveDraft(obData);
    });
  }
  ["obClass","obBoard","obPrep","obTarget"].forEach(groupId => {
    const g = $(groupId);
    if (!g) return;
    g.querySelectorAll(".ob-chip").forEach(c => {
      c.addEventListener("click", () => {
        g.querySelectorAll(".ob-chip").forEach(x => x.classList.remove("on"));
        c.classList.add("on");
        const v = c.dataset.v;
        const key = groupId === "obClass" ? "class_level"
                  : groupId === "obBoard" ? "board"
                  : groupId === "obPrep" ? "preparing_for"
                  : "target_score";
        obData[key] = v;
        saveDraft(obData);
        updateNextBtn();
      });
    });
  });
  { const s = $("obSkipDate");
    if (s) s.addEventListener("click", () => {
      obData.exam_date = "";
      saveDraft(obData);
      obNext();
    });
  }

  /* ---------- INIT ---------- */
  paintSubjectChip();
  updateSendState();
  updateTokenUI();
  renderList();
  renderAcct();
  renderProfile();
  bumpStreak();
  renderStreak();
  renderGoal();
  renderWelcome();

  if (new URLSearchParams(location.search).get("auth")){
    openAuth("signin");
    history.replaceState(null, "", location.pathname);
  }

  window.toast = toast;
  window.openAuth = openAuth;
  window.openProPaywall = openProPaywall;
  window.openRazorpayCheckout = openRazorpayCheckout;
  window.zyroOpenStudyPanel = openStudyPanel;
  window.zyroShowProPopup = showProPopup;
}

if (document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", boot); }
else { boot(); }
