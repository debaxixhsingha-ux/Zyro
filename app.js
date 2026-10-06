/* =========================================================
   ZYRO app.js — v31 (Razorpay lazy-load fix)
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
const TOKEN_KEY="zyro_tokens";
const CI="zyro_ci";
const CK="zyro_chats";
const WAITLIST_KEY="zyro_waitlist";
const WAITLIST_DONE_KEY="zyro_waitlist_done";
const RECENT_OPEN_KEY="zyro_recent_open";
const TOKEN_RESET_MS = 5 * 60 * 60 * 1000;
const STREAM_TIMEOUT_MS = 90000;
const FIRST_TOKEN_MS = 45000;

let TOTAL=100000;
let sb=null,sbP=null,user=null,pro=false;
let chats=[],cur=null;
let ctrl=null,hist=[],busy=false,streaming=false;
let pending=[],pendingKind=null;
let sid=0,follow=true,uAcc=0,uT=null,syncT=null;
let busyWatchdog=null;
const LIM=12000;

const RZP_WORKER_URL = WORKER_URL.replace(/\/$/, "");

/* ---------- RAZORPAY CHECKOUT (lazy-loads checkout.js on first use) ---------- */
async function openRazorpayCheckout(plan){
  // Local fallbacks in case boot() hasn't wired the globals yet
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
      notes: { email: user.email || "", plan: isYearly ? "yearly" : "monthly" }
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
      key: o.key_id,
      amount: o.amount,
      currency: o.currency,
      order_id: o.order_id,
      name: "Zyro",
      description: label,
      prefill: { email: user.email || "" },
      theme: { color: "#d97757" },
      modal: {
        ondismiss: function(){ toast("Payment cancelled"); }
      },
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
            TOTAL = 1000000;
            toast("🎉 Welcome to Zyro Pro!");
            setTimeout(() => location.reload(), 1400);
          } else {
            toast("Verification failed — contact support");
          }
        })
        .catch(() => toast("Verification error"));
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

/* ---------- INJECTED STUDY STYLES ---------- */
(function(){
  if (document.getElementById("zyro-study-style")) return;
  var s = document.createElement("style");
  s.id = "zyro-study-style";
  s.textContent = [
    ".body .table-wrap{overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:12px;background:var(--box)}",
    ".body table{border-collapse:collapse;width:100%;font-size:14px}",
    ".body th,.body td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}",
    ".body th{background:var(--box-2);color:var(--ink);font-weight:600;font-size:13px;white-space:nowrap}",
    ".body tr:last-child td{border-bottom:0}",
    ".body td{color:var(--ink-2)}",
    ".fc-trigger{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--acc-line);background:var(--acc-soft);border-radius:12px;padding:10px 14px;margin:12px 0;cursor:pointer;font-size:13.5px;color:var(--ink)}",
    ".fc-trigger b{color:var(--acc);font-weight:600}",
    ".fc-modal{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:500;padding:20px}",
    ".fc-modal.on{display:flex}",
    ".fc-stage{width:100%;max-width:520px;display:flex;flex-direction:column;gap:18px}",
    ".fc-head{display:flex;align-items:center;justify-content:space-between;color:var(--dim);font-size:13px;font-family:JetBrains Mono,monospace}",
    ".fc-head button{background:none;border:0;color:var(--dim);font-size:14px;padding:6px 10px;border-radius:8px;cursor:pointer}",
    ".fc-card{background:var(--bg-2);border:1px solid var(--line-2);border-radius:24px;padding:44px 28px;min-height:280px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:22px;line-height:1.4;cursor:pointer;user-select:none;position:relative}",
    ".fc-card .side{position:absolute;top:16px;left:20px;font:600 10px JetBrains Mono,monospace;color:var(--dim);letter-spacing:.15em;text-transform:uppercase}",
    ".fc-card .hint{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);font-size:11.5px;color:var(--dim-2)}",
    ".fc-card.back{background:linear-gradient(145deg,rgba(217,119,87,.14),var(--bg-2));border-color:var(--acc-line)}",
    ".fc-card.back .side{color:var(--acc)}",
    ".fc-nav{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--dim);font-size:13.5px}",
    ".fc-nav button{background:var(--box-2);border:1px solid var(--line);color:var(--ink);padding:10px 20px;border-radius:12px;cursor:pointer;font-size:15px}",
    ".fc-nav button:disabled{opacity:.35;cursor:not-allowed}",
    ".quiz-trigger{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--line-2);background:var(--box);border-radius:12px;padding:10px 14px;margin:12px 0;cursor:pointer;font-size:13.5px;color:var(--ink)}",
    ".quiz-trigger b{color:var(--acc)}",
    ".quiz-modal{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(20px);display:none;align-items:flex-start;justify-content:center;z-index:500;padding:20px;overflow-y:auto}",
    ".quiz-modal.on{display:flex}",
    ".quiz-stage{width:100%;max-width:560px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:22px;padding:24px;margin:auto 0;display:flex;flex-direction:column;gap:18px}",
    ".quiz-head{display:flex;align-items:center;justify-content:space-between;font:600 12px JetBrains Mono,monospace;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}",
    ".quiz-head button{background:none;border:0;color:var(--dim);padding:6px 10px;border-radius:8px;cursor:pointer}",
    ".quiz-q{font-size:17px;line-height:1.55;color:var(--ink)}",
    ".quiz-opts{display:flex;flex-direction:column;gap:10px}",
    ".quiz-opt{display:flex;align-items:flex-start;gap:12px;border:1px solid var(--line);background:var(--box);border-radius:14px;padding:13px 16px;cursor:pointer;font-size:15px;color:var(--ink);text-align:left}",
    ".quiz-opt.correct{background:rgba(62,207,142,.12);border-color:rgba(62,207,142,.5)}",
    ".quiz-opt.wrong{background:rgba(229,72,77,.1);border-color:rgba(229,72,77,.5)}",
    ".quiz-opt .letter{width:24px;height:24px;border-radius:8px;background:var(--box-2);display:grid;place-items:center;font:600 12px JetBrains Mono,monospace;color:var(--dim);flex:none}",
    ".quiz-opt.correct .letter{background:rgba(62,207,142,.2);color:#3ecf8e}",
    ".quiz-opt.wrong .letter{background:rgba(229,72,77,.2);color:#e5484d}",
    ".quiz-exp{margin-top:2px;font-size:13px;color:var(--dim);padding:10px 14px;border-left:2px solid var(--acc);background:var(--box);border-radius:0 8px 8px 0}",
    ".quiz-score{text-align:center;padding:30px 20px}",
    ".quiz-score .big{font-size:56px;font-weight:600;color:var(--ink);letter-spacing:-2px;display:block;margin:12px 0 4px}",
    ".quiz-score .lbl{font:600 12px JetBrains Mono,monospace;color:var(--dim);letter-spacing:.14em;text-transform:uppercase}",
    ".fix-btn{display:inline-flex;align-items:center;gap:7px;margin-top:6px;border:1px solid var(--acc-line);background:var(--acc-soft);color:var(--acc);border-radius:10px;padding:7px 13px;font-size:13px;cursor:pointer}",
    ".pro-card{background:linear-gradient(160deg,rgba(217,119,87,.15),rgba(217,119,87,.04));border:1px solid var(--acc-line);border-radius:14px;padding:14px;margin:10px 0}",
    ".pro-card h4{margin:0 0 4px;font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px}",
    ".pro-card p{margin:0 0 12px;font-size:12.5px;color:var(--dim);line-height:1.5}",
    ".pro-card .btn-up{width:100%;border:0;background:linear-gradient(135deg,#f0b48a,var(--acc));color:#0a0a0a;font-weight:600;padding:10px;border-radius:10px;cursor:pointer;font-size:14px}",
    ".up-modal{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:500;padding:20px}",
    ".up-modal.on{display:flex}",
    ".up-box{width:100%;max-width:400px;background:var(--bg-2);border:1px solid var(--acc-line);border-radius:22px;padding:26px 22px}",
    ".up-box h3{margin:0 0 6px;font-size:20px;color:var(--ink)}",
    ".up-box .sub{margin:0 0 18px;font-size:13.5px;color:var(--dim)}",
    ".up-box .price{font-size:34px;font-weight:600;color:var(--ink);letter-spacing:-1px;margin:0 0 4px}",
    ".up-box .price em{font-style:normal;font-size:14px;font-weight:400;color:var(--dim);letter-spacing:0}",
    ".up-box ul{margin:14px 0 20px;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}",
    ".up-box li{font-size:13.5px;color:var(--ink-2);display:flex;gap:9px;align-items:flex-start}",
    ".up-box .actions{display:flex;flex-direction:column;gap:8px}",
    ".up-box .actions button{padding:12px;border-radius:12px;font-weight:600;font-size:14.5px;cursor:pointer;border:1px solid var(--line)}",
    ".up-box .actions button.primary{background:linear-gradient(135deg,#f0b48a,var(--acc));color:#0a0a0a;border:0}",
    ".up-box .actions button.ghost{background:none;color:var(--ink)}"
  ].join("");
  document.head.appendChild(s);
})();

/* =========================================================
   BOOT
   ========================================================= */
function boot(){
  const $ = id => document.getElementById(id);
  const log = $("log"), t = $("t"), go = $("go"), main = $("main");
  if (!log || !t || !go || !main){ showErr("Core elements missing from app.html"); return; }

  const esc = s => s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const escA = s => esc(s).replace(/"/g,"&quot;");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getCI = () => { try { return localStorage.getItem(CI) || ""; } catch(_) { return ""; } };

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
    }, STREAM_TIMEOUT_MS + 15000);
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

  function nextRefillTime(){
    const d = getTokens();
    const dt = new Date(d.reset + TOKEN_RESET_MS);
    return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
  }

  function paintBar(used, last){
    const pct = Math.min(100, (used/TOTAL) * 100);
    const p = used > 0 && pct < 0.1 ? "<0.1" : pct < 10 ? pct.toFixed(1) : Math.floor(pct);
    const tp = $("tPct"); if (tp) tp.textContent = p + "% used";
    const f = $("fTotal");
    if (f){ f.style.width = pct + "%"; f.className = "token-fill" + (pct >= 95 ? " danger" : pct >= 80 ? " warn" : ""); }
    const tl = $("tLast");
    if (tl){ tl.textContent = "refills at " + nextRefillTime(); tl.className = "token-refill"; }
  }

  function updateTokenUI(){
    const d = getTokens(); paintBar(d.used, d.last);
    applyLimits();
  }

  function applyLimits(){
    const out = tokensOut();
    if (!pro){
      ["imb","fileBtn","imgBtn"].forEach(id => { const el = $(id); if (el) el.disabled = out; });
    }
    const mb = $("mode");
    if (mb){
      const th = mb.querySelector('option[value="Thinking"]');
      if (th) th.disabled = out && !pro;
      if (out && !pro && mb.value === "Thinking") setMode("Fast");
    }
  }

  setInterval(updateTokenUI, 30000);

  function toast(m){ const e = $("toast"); if (!e) return; e.textContent = m; e.classList.add("on"); setTimeout(() => e.classList.remove("on"), 1600); }

  /* ---------- MODES + STUDY ---------- */
  const MODES = { Fast:"Quick short answer, minimal thinking.", Auto:"Balanced speed and depth.", Thinking:"Deep analysis, long detailed answer." };
  const STAGES = ["Thinking","Analyzing","Planning steps"];
  const STUDY = {
    Chat:"",
    Solver:"Study mode: solve step by step with clear numbered steps, show formulas, put the final answer in bold, end with one line naming the key concept.",
    Socratic:"Study mode: do NOT give the final answer immediately. Guide with one short question or hint at a time, check reasoning, reveal the answer only if they ask or are stuck twice.",
    Exam:"EXAM MODE. Answer in strict exam format. Start with the marks breakdown (**For 5 marks:** ...), then numbered points, then a **Key terms to mention:** list (4-6 terms). If the question could also appear as a 2-mark or 10-mark, add a one-line note: *For 2 marks, shorten to: ...*"
  };

  const QUICK = [
    ["Explain this code","Explain this code step by step:\n\n","Chat"],
    ["Solve a problem","","Solver"],
    ["Exam answer","Give me a proper exam answer (5 marks) for: ","Exam"],
    ["📚 Notes → Flashcards → Quiz","","Chat",1,"notes"],
    ["Build a web page","Build a web page for ","Chat"]
  ];

  const hiddenMode = $("mode");
  if (hiddenMode){
    hiddenMode.innerHTML = "";
    Object.keys(MODES).forEach(m => hiddenMode.add(new Option(m)));
    hiddenMode.value = "Auto";
  }
  const hiddenStudy = $("study");
  if (hiddenStudy){
    hiddenStudy.innerHTML = "";
    [["Chat","Chat"],["Solver","Solver"],["Socratic","Socratic"],["Exam","Exam prep"]].forEach(([v,l]) => hiddenStudy.add(new Option(l,v)));
  }

  /* ---------- MODE DROPDOWN ---------- */
  const MODE_ICONS = {
    Fast:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    Auto:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>',
    Thinking:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6M10 17h4M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z"/></svg>'
  };
  const modeBtn=$("modeBtn"), modeMenu=$("modeMenu"), modeLabel=$("modeLabel"), modeWrap=$("modeWrap");
  function setMode(m){
    if (!MODES[m]) m = "Auto";
    if (hiddenMode) hiddenMode.value = m;
    if (modeLabel) modeLabel.textContent = m;
    if (modeBtn){ const old = modeBtn.querySelector(".lead"); if (old) old.outerHTML = MODE_ICONS[m]; }
    if (modeMenu) modeMenu.querySelectorAll(".mode-opt").forEach(o => o.classList.toggle("active", o.dataset.mode === m));
  }
  if (modeBtn && modeMenu){
    modeBtn.addEventListener("click", e => { e.stopPropagation(); modeMenu.classList.toggle("open"); });
    modeMenu.querySelectorAll(".mode-opt").forEach(opt => {
      opt.addEventListener("click", e => {
        e.stopPropagation();
        setMode(opt.dataset.mode);
        modeMenu.classList.remove("open");
      });
    });
  }
  setMode("Auto");

  /* ---------- STUDY DROPDOWN ---------- */
  const studyBtn=$("studyBtn"), studyMenu=$("studyMenu"), studyLabel=$("studyLabel"), studyWrap=$("studyWrap");
  function setStudy(v){
    if (!STUDY.hasOwnProperty(v)) v = "Chat";
    if (hiddenStudy) hiddenStudy.value = v;
    if (studyLabel) studyLabel.textContent = (v === "Exam") ? "Exam prep" : v;
    if (studyMenu) studyMenu.querySelectorAll(".study-opt").forEach(o => o.classList.toggle("active", o.dataset.study === v));
    try { localStorage.setItem("zyro_study", v); } catch(_) {}
  }
  if (studyBtn && studyMenu){
    studyBtn.addEventListener("click", e => { e.stopPropagation(); studyMenu.classList.toggle("open"); });
    studyMenu.querySelectorAll(".study-opt").forEach(opt => {
      opt.addEventListener("click", e => {
        e.stopPropagation();
        setStudy(opt.dataset.study);
        studyMenu.classList.remove("open");
      });
    });
  }
  try { const sv = localStorage.getItem("zyro_study"); if (sv) setStudy(sv); else setStudy("Chat"); } catch(_) { setStudy("Chat"); }

  document.addEventListener("click", e => {
    if (modeWrap && !modeWrap.contains(e.target) && modeMenu) modeMenu.classList.remove("open");
    if (studyWrap && !studyWrap.contains(e.target) && studyMenu) studyMenu.classList.remove("open");
    const drop = $("acctDrop");
    const authBtnEl = $("authBtn");
    if (drop && drop.classList.contains("open")){
      if (!drop.contains(e.target) && (!authBtnEl || !authBtnEl.contains(e.target))) drop.classList.remove("open");
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape"){
      if (modeMenu) modeMenu.classList.remove("open");
      if (studyMenu) studyMenu.classList.remove("open");
      const drop = $("acctDrop"); if (drop) drop.classList.remove("open");
      document.querySelectorAll(".fc-modal.on,.quiz-modal.on,.up-modal.on").forEach(m => m.classList.remove("on"));
    }
  });

  /* ---------- QUICK CHIPS ---------- */
  const chipsBox = $("chips");
  if (chipsBox){
    chipsBox.innerHTML = "";
    QUICK.forEach(item => {
      const [label, pre, st, pdf, kind] = item;
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.onclick = () => {
        setStudy(st);
        t.value = pre;
        t.dispatchEvent(new Event("input"));
        t.focus();
        try { t.setSelectionRange(t.value.length, t.value.length); } catch(_) {}
        if (pdf){ pendingKind = kind || null; $("file").click(); }
      };
      chipsBox.appendChild(b);
    });
  }

  /* ---------- ATTACH BUTTONS ---------- */
  { const ib = $("imgBtn"); if (ib) ib.onclick = () => $("img").click(); }
  { const fb = $("fileBtn"); if (fb) fb.onclick = () => $("file").click(); }
  { const mb = $("moreBtn"); if (mb) mb.onclick = () => toast("More attachments coming soon"); }

  /* ---------- RIGHT-ALIGN SEND GROUP ---------- */
  {
    const row = document.querySelector(".row");
    if (row && go){
      const sp = document.createElement("div");
      sp.style.cssText = "flex:1 1 0;min-width:0;pointer-events:none";
      row.insertBefore(sp, go);
    }
  }

  /* ---------- VOICE INPUT ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null, listening = false;
  if (SR){
    const micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.className = "mic-btn";
    micBtn.title = "Voice input";
    micBtn.setAttribute("aria-label", "Voice input");
    const micSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    micSvg.setAttribute("viewBox", "0 0 24 24");
    micSvg.setAttribute("fill", "none");
    micSvg.setAttribute("stroke", "currentColor");
    micSvg.setAttribute("stroke-width", "1.8");
    micSvg.setAttribute("stroke-linecap", "round");
    micSvg.setAttribute("stroke-linejoin", "round");
    const r1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r1.setAttribute("x","9"); r1.setAttribute("y","2"); r1.setAttribute("width","6"); r1.setAttribute("height","12"); r1.setAttribute("rx","3");
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p1.setAttribute("d","M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8");
    micSvg.appendChild(r1); micSvg.appendChild(p1);
    micBtn.appendChild(micSvg);
    const row = document.querySelector(".row");
    if (row && go) row.insertBefore(micBtn, go);
    micBtn.onclick = () => {
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
    };
  }

  /* ---------- PASSWORD EYE ---------- */
  const EYE_OPEN = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  { const eye = $("amEye"), icon = $("amEyeIcon"), pw = $("amPw");
    if (eye && icon && pw){
      eye.onclick = function(){
        const showing = pw.type === "text";
        pw.type = showing ? "password" : "text";
        icon.innerHTML = showing ? EYE_OPEN : EYE_OFF;
      };
    }
  }

  /* ---------- SUPABASE ---------- */
  function sbClient(){
    if (!SUPABASE_URL) return Promise.resolve(null);
    if (sb) return Promise.resolve(sb);
    if (!sbP) sbP = loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(() => {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return sb;
    });
    return sbP;
  }

  /* ---------- WAITLIST ---------- */
  const waitlistSlot = $("waitlistSlot");
  const waitlistCard = document.createElement("div");
  waitlistCard.className = "waitlist-card";
  waitlistCard.id = "waitlistCard";
  waitlistCard.innerHTML =
    '<h4>Get notified when Pro launches</h4>' +
    '<p>We\'ll email you when Zyro Pro is live. No spam, ever.</p>' +
    '<div class="wl-row"><input type="email" id="wlEmail" placeholder="you@example.com" autocomplete="email"><button id="wlGo">Notify me</button></div>' +
    '<div class="ok" id="wlOk">✅ You\'re on the list!</div>';
  if (waitlistSlot) waitlistSlot.appendChild(waitlistCard);

  function waitlistAlreadyDone(){
    try { return localStorage.getItem(WAITLIST_DONE_KEY) === "1"; } catch(_) { return false; }
  }
  function restoreWaitlistState(){
    if (!waitlistCard) return;
    if (waitlistAlreadyDone()){
      waitlistCard.classList.add("done");
      const em = (function(){ try { const arr = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]"); return arr[arr.length-1] || ""; } catch(_) { return ""; } })();
      const wlOk = $("wlOk");
      if (wlOk) wlOk.textContent = em ? ("✅ On the list — " + em) : "✅ You're on the list!";
    }
  }
  restoreWaitlistState();

  { const wlGo = waitlistCard.querySelector("#wlGo");
    const wlEmail = waitlistCard.querySelector("#wlEmail");
    const wlOk = waitlistCard.querySelector("#wlOk");
    if (wlGo){
      wlGo.onclick = async () => {
        const em = (wlEmail.value || "").trim().toLowerCase();
        if (!em || !/^\S+@\S+\.\S+$/.test(em)){ toast("Enter a valid email"); return; }
        wlGo.disabled = true; wlGo.textContent = "…";
        try {
          const arr = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
          if (!arr.includes(em)) arr.push(em);
          localStorage.setItem(WAITLIST_KEY, JSON.stringify(arr));
          localStorage.setItem(WAITLIST_DONE_KEY, "1");
        } catch(_) {}
        try {
          const s = await sbClient();
          if (s) await s.from("waitlist").insert({ email: em });
        } catch(_) {}
        waitlistCard.classList.add("done");
        wlOk.textContent = "✅ You're on the list! We'll email " + em + ".";
        toast("You're on the waitlist 🎉");
      };
    }
  }

  /* ---------- ACCOUNT DROPDOWN ---------- */
  const acctDrop = $("acctDrop");
  function renderAcct(){
    if (!acctDrop) return;
    const initial = user ? esc((user.email || "Z").toUpperCase()[0]) : "?";
    const emailLine = user ? esc(user.email || "") : "Not signed in";
    const metaLine = user ? ("Signed in · " + (pro ? "Pro" : "Free")) : "Tap to sign in or create account";
    const created = user && user.created_at ? new Date(user.created_at).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" }) : "";
    const d = getTokens();
    const pct = Math.min(100, (d.used/TOTAL) * 100);
    const p = d.used > 0 && pct < 0.1 ? "<0.1" : pct < 10 ? pct.toFixed(1) : Math.floor(pct);

    acctDrop.innerHTML =
      '<div class="acct-head">' +
        '<span class="ava">' + initial + '</span>' +
        '<div class="info">' +
          '<div class="em">' + emailLine + '</div>' +
          '<div class="meta">' + metaLine + '</div>' +
        '</div>' +
        (pro ? '<em class="pro-pill">PRO</em>' : '') +
      '</div>' +

      '<div class="token-section">' +
        '<div class="tl" style="margin:0 0 8px">Tokens</div>' +
        '<div class="token-bar">' +
          '<div class="token-info"><span>' + p + '% used</span><span>refills ' + nextRefillTime() + '</span></div>' +
          '<div class="token-progress"><div class="token-fill' + (pct >= 95 ? ' danger' : pct >= 80 ? ' warn' : '') + '" style="width:' + pct + '%"></div></div>' +
          '<div class="tn">' + (pro ? 'PRO · 1M tokens / 5 hours' : 'Free · 100k tokens / 5 hours') + '</div>' +
        '</div>' +
      '</div>' +

      (user && created ? '<div class="tl" style="margin:0">Account created ' + created + '</div>' : '') +

      '<div class="acct-actions">' +
        (user
          ? (pro
              ? '<button type="button" id="acctSignOut">Sign out</button>'
              : '<button type="button" class="primary" id="acctUpgrade">Upgrade to Pro · ₹349/mo</button><button type="button" id="acctSignOut">Sign out</button>')
          : '<button type="button" class="primary" id="acctSignIn">Sign in / Sign up</button>'
        ) +
      '</div>';
  }

  { const ab = $("authBtn"); if (ab){
      ab.onclick = e => {
        e.stopPropagation();
        if (user){ renderAcct(); acctDrop.classList.toggle("open"); }
        else openAuth("signin");
      };
    }
  }

  document.addEventListener("click", e => {
    if (e.target.id === "acctSignIn"){ const d = $("acctDrop"); if (d) d.classList.remove("open"); openAuth("signin"); return; }
    if (e.target.id === "acctUpgrade"){ const d = $("acctDrop"); if (d) d.classList.remove("open"); openRazorpayCheckout("monthly"); return; }
    if (e.target.id === "acctSignOut"){
      (async () => {
        const s = await sbClient();
        if (s){ try { await s.auth.signOut(); } catch(_) {} }
        user = null; pro = false; TOTAL = 100000;
        renderAcct(); renderAuth(); updateTokenUI();
        const d = $("acctDrop"); if (d) d.classList.remove("open");
        toast("Signed out");
      })();
      return;
    }
  });

  /* ---------- AUTH MODAL ---------- */
  function renderAuth(){
    const ab = $("authBtn");
    if (ab){
      if (user){
        const initial = esc((user.email || "Z").toUpperCase()[0]);
        ab.innerHTML = '<span style="font-weight:600;font-size:14px">' + initial + '</span>';
        ab.title = user.email || "Account";
      } else {
        ab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
        ab.title = "Sign in";
      }
    }
  }

  let authMode = "signin";
  function setAuthMode(m){
    authMode = m;
    const amTitle = $("amTitle"), amSub = $("amSub"), amGo = $("amGo"), amSwitch = $("amSwitch");
    if (!amTitle) return;
    if (m === "signup"){
      amTitle.textContent = "Create your account";
      amSub.textContent = "Sync chats across devices. Free.";
      amGo.textContent = "Create account";
      amSwitch.previousSibling.textContent = "Already have an account? ";
      amSwitch.textContent = "Sign in";
    } else {
      amTitle.textContent = "Sign in";
      amSub.textContent = "Sync your chats across devices.";
      amGo.textContent = "Sign in";
      amSwitch.previousSibling.textContent = "No account? ";
      amSwitch.textContent = "Create one";
    }
    $("amMsg").textContent = "";
  }
  function openAuth(m){ setAuthMode(m || "signin"); $("authModal").classList.add("on"); setTimeout(() => $("amEmail").focus(), 60); }
  function closeAuth(){ const am = $("authModal"); if (am) am.classList.remove("on"); if ($("amPw")) $("amPw").value = ""; if ($("amMsg")) $("amMsg").textContent = ""; }

  { const c = $("amCancel"); if (c) c.onclick = closeAuth; }
  { const s = $("amSwitch"); if (s) s.onclick = e => { e.preventDefault(); setAuthMode(authMode === "signin" ? "signup" : "signin"); }; }
  { const g = $("amGo"); if (g) g.onclick = async () => {
      const em = $("amEmail").value.trim().toLowerCase(), pw = $("amPw").value, msg = $("amMsg"), btn = $("amGo");
      if (!em || pw.length < 6){ msg.style.color = "#e5484d"; msg.textContent = "Enter an email and a password with 6+ characters."; return; }
      msg.style.color = "var(--dim)"; msg.textContent = "Working…"; btn.disabled = true;
      const s = await sbClient();
      if (!s){ btn.disabled = false; msg.style.color = "#e5484d"; msg.textContent = "Supabase isn't configured."; return; }
      const r = authMode === "signup"
        ? await s.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })
        : await s.auth.signInWithPassword({ email: em, password: pw });
      btn.disabled = false;
      if (r.error){ msg.style.color = "#e5484d"; msg.textContent = r.error.message; return; }
      if (authMode === "signup" && r.data && !r.data.session){
        msg.style.color = "#3ecf8e"; msg.textContent = "✅ Check your email to confirm, then sign in."; return;
      }
      closeAuth();
      toast(authMode === "signup" ? "Account created 🎉" : "Signed in");
    };
  }

  async function loadProfile(){
    try {
      const s = await sbClient();
      const { data } = await s.from("profiles").select("pro").eq("id", user.id).maybeSingle();
      pro = !!(data && data.pro);
      TOTAL = pro ? 1000000 : 100000;
      updateTokenUI(); renderAcct();
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
        await s.from("chats").upsert({ id: cur.id, user_id: user.id, title: cur.title, pin: !!cur.pin, ts: cur.ts, msgs: msgs.slice(-40) }, { onConflict: "id" });
      } catch(_) {}
    }, 1200);
  }
  function cloudDelete(id){
    if (!user) return;
    sbClient().then(s => { if (s) s.from("chats").delete().eq("id", id).then(() => {}).catch(() => {}); });
  }
  async function pullCloud(){
    try {
      const s = await sbClient(); if (!s) return;
      const { data } = await s.from("chats").select("*").order("ts", { ascending: false }).limit(100);
      if (!data) return;
      let changed = false;
      for (const r of data){
        const ex = chats.find(c => c.id === r.id);
        if (!ex){ chats.push({ id: r.id, title: r.title, pin: r.pin, ts: r.ts, msgs: r.msgs }); changed = true; }
        else if ((r.ts || 0) > (ex.ts || 0)){ ex.title = r.title; ex.pin = r.pin; ex.ts = r.ts; ex.msgs = r.msgs; changed = true; }
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
    renderAuth(); renderAcct();
    await loadProfile();
    await pullCloud();
    await syncUsageFromCloud();
    renderAuth(); renderAcct();
  }
  (async () => {
    let s;
    try { s = await sbClient(); } catch(_) {}
    if (!s){ renderAuth(); renderAcct(); return; }
    try {
      const { data } = await s.auth.getSession();
      user = (data && data.session && data.session.user) || null;
    } catch(_) {}
    s.auth.onAuthStateChange((_e, ses) => {
      user = (ses && ses.user) || null;
      if (!user){ pro = false; TOTAL = 100000; renderAuth(); renderAcct(); updateTokenUI(); }
      else afterSignIn();
    });
    if (user) await afterSignIn();
    else { renderAuth(); renderAcct(); }
  })();

  /* ---------- RECENT TOGGLE ---------- */
  const recentToggle = $("recentToggle");
  const listEl = $("list");
  function setRecentOpen(open){
    if (!recentToggle || !listEl) return;
    recentToggle.classList.toggle("open", open);
    listEl.classList.toggle("open", open);
    try { localStorage.setItem(RECENT_OPEN_KEY, open ? "1" : "0"); } catch(_) {}
  }
  if (recentToggle && listEl){
    const saved = (function(){ try { return localStorage.getItem(RECENT_OPEN_KEY); } catch(_) { return null; } })();
    setRecentOpen(saved === null ? true : saved === "1");
    recentToggle.onclick = () => {
      setRecentOpen(!recentToggle.classList.contains("open"));
      if (listEl.classList.contains("open")) renderList();
    };
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
    return esc(x).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\u0001(\d+)\u0002/g, (_, i) => st[i]);
  };
  function renderTable(rows){
    if (!rows.length) return "";
    const splitRow = r => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
    const head = splitRow(rows[0]);
    let h = '<div class="table-wrap"><table><thead><tr>';
    head.forEach(c => h += "<th>" + inl(c) + "</th>");
    h += "</tr></thead><tbody>";
    for (let r = 1; r < rows.length; r++){
      h += "<tr>";
      splitRow(rows[r]).forEach(c => h += "<td>" + inl(c) + "</td>");
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

  const KW = new Set("abstract and as assert async await break case catch class const continue def default del do elif else enum except export extends final finally for from fn func function if implements import in interface is lambda let loop match mod mut namespace new not null None nil of or package pass private protected pub public raise return self static struct super switch this throw throws trait true True false False try type typeof union unsafe use using var void while with yield select insert update delete create table where join group order by limit values SELECT INSERT UPDATE DELETE CREATE TABLE WHERE JOIN GROUP ORDER BY LIMIT VALUES FROM AS AND OR NOT NULL INTO SET".split(" "));
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
      o += q ? '<span class="h' + q + '">' + esc(tx) + "</span>" : esc(tx);
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
  function setH(el, h){ el.innerHTML = h; typeset(el); enhanceStudy(el); }
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

  /* ---------- STUDY ENHANCER ---------- */
  function enhanceStudy(root){
    if (!root) return;
    const full = root.textContent || "";
    if (full.length < 50) return;
    if (!/\bF:\s/.test(full) && !/\bQ:\s/.test(full)) return;

    const fcMatches = [...full.matchAll(/^\s*F:\s*(.+?)\s*\n\s*B:\s*(.+?)(?=\n\s*F:|\n\s*##|\n\s*$)/gims)];
    if (fcMatches.length >= 3 && !root.querySelector(".fc-trigger")){
      const cards = fcMatches.map(m => ({ a: m[1].trim(), b: m[2].trim() }));
      window._zyroFCsets = window._zyroFCsets || [];
      const idx = window._zyroFCsets.push(cards) - 1;
      const trigger = document.createElement("div");
      trigger.className = "fc-trigger";
      trigger.dataset.idx = idx;
      trigger.innerHTML = '📚 <b>' + cards.length + ' flashcards</b> ready · Tap to study';
      root.insertBefore(trigger, root.firstChild);
    }

    const quizBlocks = [];
    const quizRe = /^\s*Q:\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Ans:\s*([A-D])\s*(?:\n\s*Ex:\s*(.+?))?(?=\n\s*Q:|\n\s*##|\n\s*$)/gims;
    let m;
    while ((m = quizRe.exec(full))){
      quizBlocks.push({ q: m[1].trim(), opts: [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()], ans: m[6].trim().toUpperCase(), ex: (m[7] || "").trim() });
    }
    if (quizBlocks.length >= 3 && !root.querySelector(".quiz-trigger")){
      window._zyroQuizSets = window._zyroQuizSets || [];
      const idx = window._zyroQuizSets.push(quizBlocks) - 1;
      const trigger = document.createElement("div");
      trigger.className = "quiz-trigger";
      trigger.dataset.idx = idx;
      trigger.innerHTML = '📝 <b>' + quizBlocks.length + '-question quiz</b> · Tap to start';
      root.insertBefore(trigger, root.firstChild);
    }
  }

  /* ---------- MESSAGES ---------- */
  function fillBubble(b, txt, names, imgs, nimg){
    b.textContent = txt;
    if (imgs && imgs.length){
      const w = document.createElement("div"); w.className = "th";
      imgs.forEach(im => {
        const i = document.createElement("img");
        i.alt = "";
        i.src = "data:" + im.mime + ";base64," + im.data;
        i.style.cssText = "width:84px;height:84px;object-fit:cover;border-radius:10px;display:block;max-width:84px;max-height:84px;";
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
  function addU(txt, names, imgs, nimg){
    const d = document.createElement("div"); d.className = "u";
    const b = document.createElement("div"); fillBubble(b, txt, names, imgs, nimg);
    d.appendChild(b); log.appendChild(d); return d;
  }
  function addA(){
    const msgId = Date.now().toString(36);
    const d = document.createElement("div");
    d.className = "a";
    d.dataset.msgId = msgId;
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
    chip.innerHTML = '<span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg' + n + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97757"/><stop offset=".55" stop-color="#f0b48a"/><stop offset="1" stop-color="#d97757"/></linearGradient></defs><path fill="url(#sg' + n + ')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span>';
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

  function copy(txt, btn){
    const ok = () => { const prev = btn.innerHTML; btn.innerHTML = "✓"; setTimeout(() => btn.innerHTML = prev, 1200); };
    const fb = () => {
      const a = document.createElement("textarea");
      a.value = txt; a.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(a); a.select();
      try { document.execCommand("copy"); ok(); } catch(_) {}
      a.remove();
    };
    navigator.clipboard ? navigator.clipboard.writeText(txt).then(ok).catch(fb) : fb();
  }

  const SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const SVG_LIKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  const SVG_DISLIKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>';
  const SVG_REGEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>';
  const SVG_CONT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  log.addEventListener("click", e => {
    const vw = e.target.closest("[data-v]"); if (vw) return toggleCode(vw.closest(".cb"));
    const rb = e.target.closest("[data-run]"); if (rb) return runCode(rb.closest(".cb"), rb.dataset.run, rb);
    const eb = e.target.closest("[data-edit]"); if (eb) return startEdit(eb.closest(".u"));
    const cb = e.target.closest("[data-c]"); if (cb) return copy(cb.closest(".cb").querySelector("pre").textContent, cb);
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
    const cont = e.target.closest("[data-cont]");
    if (cont){
      const a = cont.closest(".a");
      if (a && a === log.lastElementChild) continueReply(a);
      return;
    }
    const fx = e.target.closest("[data-fix]");
    if (fx){
      const cb2 = fx.closest(".cb");
      const code = cb2.querySelector("pre").textContent;
      const err = cb2.querySelector(".out") ? cb2.querySelector(".out").textContent : "";
      const msg = "Fix this code. It failed.\n\nCode:\n```\n" + code + "\n```\n\nError:\n```\n" + err + "\n```\n\nExplain what caused the error and give the corrected code.";
      t.value = msg; t.dispatchEvent(new Event("input"));
      $("f").requestSubmit();
      return;
    }
    const rg = e.target.closest("[data-regen]");
    if (rg){ if (rg.closest(".a") === log.lastElementChild) regen(); else toast("Only the last reply can be regenerated"); return; }
    const lk = e.target.closest("[data-like]");
    if (lk){ lk.classList.add("active"); const d = lk.parentElement.querySelector("[data-dislike]"); if (d) d.classList.remove("active"); toast("Thanks!"); return; }
    const dk = e.target.closest("[data-dislike]");
    if (dk){ dk.classList.add("active"); const l = dk.parentElement.querySelector("[data-like]"); if (l) l.classList.remove("active"); toast("Thanks!"); }
  });

  const todayStr = () => new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const needsSearch = s => /\b(latest|newest|recent(ly)?|today|tonight|yesterday|tomorrow|this (week|month|year)|news|released?|launch(ed|es)?|new version|prices?|score|weather|who (is|won)|what'?s new|trending|202[4-9]|203\d)\b/i.test(s) || (/\b(claude|chatgpt|gpt-?\d+|openai|anthropic|gemini|grok|deepseek|llama|qwen|mistral|nvidia|iphone|pixel|galaxy|react|next\.?js|python)\b/i.test(s) && /\b(models?|versions?|releases?|new|newest|latest|vs|versus|compare|comparison|pricing|price|available|exists?|sonnet|opus|haiku|\d+(\.\d+)?)\b/i.test(s));

  function appFacts(){ return "Today is " + todayStr() + ". Your knowledge has a cutoff — if unsure about recent events, say so. Never mention tokens, quotas, or limits unless the user directly asks."; }

  const SYS = () =>
    "You are Zyro, an AI assistant for anything: code, studies, writing, ideas, math, daily advice.\n\n" +
    "GREETING RULE: if the user's message is only a greeting (hi, hey, hello, yo, good morning, how are you, etc), reply with ONE short friendly sentence as Zyro. Never list features or abilities.\n\n" +
    "STYLE:\n- Clear, concise, markdown. No filler.\n- Code in fenced blocks with language tags. ALWAYS close the code fence.\n- Math in LaTeX: $inline$ or $$display$$.\n- Admit uncertainty. Search results win when provided. Never claim to be another company's assistant.\n\n" +
    "CREATOR (only when the user asks who made/created/built/developed you): Debasish Singha. If asked more: 17 years old, student at Reliance Senior Secondary School in Assam, India. Never bring him up unprompted.\n\n" +
    "BUILD WEBSITES: when the user asks to build/create/make a website, webpage, landing page, UI, dashboard, portfolio, store or form:\n- Output ONE complete self-contained HTML file in a single ```html code block.\n- All CSS inside <style>, all JS inside <script>. No external files.\n- REALISTIC content only. NEVER use Lorem ipsum, 'placeholder', 'TODO', or '...' abbreviations.\n- Photos: use https://picsum.photos/seed/UNIQUEWORD/600/800 with a DIFFERENT word per image.\n- Responsive, at least 150 lines, write the FULL file every time.\n- Always close the ```html fence at the end.\n\n" +
    "NOTES PIPELINE: when the user says 'notes pipeline', 'notes flashcards', 'notes → flashcards', or similar, produce EXACTLY these three sections in order:\n## 📖 Notes\n[Short revision notes with key terms bolded. 5-8 paragraphs max.]\n\n## 🎴 Flashcards\nOutput 12 flashcards. Each flashcard EXACTLY in this format on its own lines:\nF: [front]\nB: [back]\n\n## 📝 Quiz\nOutput 5 MCQs. Each one EXACTLY in this format:\nQ: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nAns: [A/B/C/D]\nEx: [one-line explanation]\n\n" +
    (STUDY[$("study").value] || "") +
    (getCI() ? "\n\nUser's custom instructions: " + getCI().slice(0, 800) : "") +
    "\n\n" + appFacts();

  function addGround(d, src, sep){
    const ok = (src || []).filter(x => x && /^https?:\/\//i.test(x.uri));
    if (!ok.length && !sep) return;
    const w = document.createElement("div"); w.className = "ground";
    if (ok.length){
      const s = document.createElement("div"); s.className = "srcs";
      const l = document.createElement("span"); l.textContent = "Sources"; s.appendChild(l);
      ok.slice(0, 6).forEach(x => { const a = document.createElement("a"); a.href = x.uri; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = (x.title || x.uri).slice(0, 40); s.appendChild(a); });
      w.appendChild(s);
    }
    if (sep){
      const f = document.createElement("iframe");
      f.className = "sep";
      f.setAttribute("sandbox", "allow-popups allow-popups-to-escape-sandbox");
      f.title = "Search";
      f.srcdoc = sep;
      w.appendChild(f);
    }
    d.appendChild(w);
  }

  const ARROW = go.innerHTML;
  const STOPI = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
  function setGo(on){
    if (on){ go.innerHTML = STOPI; go.classList.add("on"); go.setAttribute("aria-label", "Stop"); }
    else { go.innerHTML = ARROW; go.classList.remove("on"); go.setAttribute("aria-label", "Send"); }
  }

  /* ---------- WORKER STREAM ---------- */
  async function workerStream(messages, onText, signal, fast, onThought, search, meta, allowContinue){
    let r;
    try {
      r = await fetch(WORKER_URL, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, mode: $("mode").value, fast, search: !!search })
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

    try {
      for (;;){
        const { done, value } = await rd.read();
        if (done) break;
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
            if (cd && cd.groundingMetadata && meta){
              const g = cd.groundingMetadata;
              (g.groundingChunks || []).forEach(c => {
                const w = c && c.web;
                if (w && w.uri && !meta.src.some(x => x.uri === w.uri)) meta.src.push({ uri: w.uri, title: w.title || "" });
              });
              if (g.searchEntryPoint && g.searchEntryPoint.renderedContent) meta.sep = g.searchEntryPoint.renderedContent;
            }
            if (j.usageMetadata){ used = j.usageMetadata.totalTokenCount || used; }
          } catch(_) {}
        }
      }
    } catch(e){
      if (e && e.name === "AbortError") aborted = true;
      else if (gotFirst) { /* partial */ }
      else throw e;
    } finally {
      clearTimeout(firstTokenTimer);
    }

    const fenceCount = (full.match(/```/g) || []).length;
    const hasOpenFence = fenceCount % 2 === 1;

    if (allowContinue && hasOpenFence && full.length > 100 && !aborted){
      try {
        const contMsgs = [
          ...messages,
          { role: "assistant", content: full },
          { role: "user", content: "Continue the code block exactly from where it stopped. Do NOT repeat any line. Do NOT start with ``` again. Just output the remaining code, then close with ```." }
        ];
        const r2 = await fetch(WORKER_URL, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: contMsgs, mode: $("mode").value, fast, search: false }) });
        if (r2.ok && r2.body){
          const rd2 = r2.body.getReader(); let buf2 = "";
          let extra = "";
          for (;;){
            const { done, value } = await rd2.read();
            if (done) break;
            buf2 += dec.decode(value, { stream: true });
            const lines2 = buf2.split("\n"); buf2 = lines2.pop();
            for (const ln of lines2){
              if (!ln.startsWith("data:")) continue;
              const dd = ln.slice(5).trim();
              if (!dd || dd === "[DONE]") continue;
              try {
                const j = JSON.parse(dd);
                const cd = j.candidates && j.candidates[0];
                if (cd && cd.content && cd.content.parts){
                  for (const p of cd.content.parts){
                    if (p.text){ extra += p.text; onText(full + extra); }
                  }
                }
              } catch(_) {}
            }
          }
          full += extra;
        }
      } catch(_) {}
    }

    if (used > 0) addTokens(used);
    else if (full) addTokens(Math.ceil(full.length / 4));
    if (!full && !aborted){
      if (th) throw { code: "thoughtonly", info: "model returned reasoning but no answer" };
      throw { code: "empty" };
    }
    return full;
  }

  const api = (h, keep) => {
    if (!h.length) return [];
    const N = 15, MAX = 30000;
    const keepIdx = new Set();
    const firstUser = h.findIndex(m => m.role === "user");
    if (firstUser >= 0) keepIdx.add(firstUser);
    for (let i = Math.max(0, h.length - N); i < h.length; i++) keepIdx.add(i);
    h.forEach((m, i) => { if (m.imgs && m.imgs.length) keepIdx.add(i); });
    let idxs = Array.from(keepIdx).sort((a, b) => a - b);
    let total = 0;
    idxs.forEach(i => total += (h[i].content || "").length);
    if (total > MAX){
      const essential = new Set();
      if (firstUser >= 0) essential.add(firstUser);
      h.forEach((m, i) => { if (m.imgs && m.imgs.length) essential.add(i); });
      const kept = []; let sz = 0;
      idxs.forEach(i => { if (essential.has(i)){ kept.push(i); sz += (h[i].content || "").length; } });
      for (let k = idxs.length - 1; k >= 0; k--){
        const i = idxs[k];
        if (essential.has(i)) continue;
        const len = (h[i].content || "").length;
        if (sz + len > MAX) continue;
        kept.push(i); sz += len;
      }
      idxs = kept.sort((a, b) => a - b);
    }
    while (idxs.length && h[idxs[0]].role !== "user") idxs.shift();
    let imgBudget = keep === false ? 0 : 4;
    const out = [];
    for (let k = idxs.length - 1; k >= 0; k--){
      const m = h[idxs[k]];
      const c2 = { role: m.role, content: m.content };
      if (m.imgs && m.imgs.length && imgBudget > 0){ c2.images = m.imgs; imgBudget -= m.imgs.length; }
      out.unshift(c2);
    }
    return out;
  };

  function send(text){
    const items = pending.slice();
    if (busy || (!text.trim() && !items.length)) return;
    const files = items.filter(f => !f.img);
    const imgs = items.filter(f => f.img).map(f => f.img);

    if (pendingKind === "notes" && (files.length || imgs.length)){
      const base = "I uploaded a file. Follow the NOTES PIPELINE format exactly: ## 📖 Notes, ## 🎴 Flashcards (F:/B: format), ## 📝 Quiz (Q:/A)/B)/C)/D)/Ans:/Ex: format). Make it exam-relevant.";
      const full = base + files.map(f => "\n\n--- " + f.name + " ---\n" + f.text).join("");
      pending = []; pendingKind = null; renderAtts();
      return run("Notes → Flashcards → Quiz from " + files[0].name, full, files.map(f => f.name), imgs);
    }

    const out = tokensOut();
    if (out && !pro && items.length){
      toast("Uploads paused — refills at " + nextRefillTime());
      pending = []; renderAtts();
      t.value = text; t.dispatchEvent(new Event("input"));
      return;
    }
    applyLimits();
    const show = text.trim() || (imgs.length && !files.length ? "Describe this image." : imgs.length ? "Review the attached files." : "Review the attached file.");
    if (out && !pro && /\b(make|build|create|design|generate|develop)\b/i.test(show)){
      $("hero").classList.add("hide"); log.classList.add("on");
      addU(show);
      const d = addA();
      const sc = d.querySelector(".status-chip"); if (sc) sc.remove();
      const tl = d.querySelector(".think-live"); if (tl) tl.remove();
      setH(d.querySelector(".body"), md("Building is paused right now. Refills at " + nextRefillTime() + "."));
      return;
    }
    const full = show + files.map(f => "\n\n--- " + f.name + " ---\n" + f.text).join("");
    pending = []; pendingKind = null; renderAtts();
    return run(show, full, files.map(f => f.name), imgs);
  }

  function actsHTML(noRegen, allowContinue){
    return '<button type="button" data-like title="Helpful">' + SVG_LIKE + '</button>' +
      '<button type="button" data-dislike title="Not helpful">' + SVG_DISLIKE + '</button>' +
      '<button type="button" data-copywhole title="Copy reply">' + SVG_COPY + '</button>' +
      (allowContinue ? '<button type="button" data-cont title="Continue">' + SVG_CONT + ' Continue</button>' : '') +
      (noRegen ? '' : '<button type="button" data-regen>' + SVG_REGEN + ' Regenerate</button>');
  }

  const ERR = {
    nowork: "The server address isn't set.",
    rate: "Zyro is busy right now. Try again in a minute.",
    origin: "This site isn't allowed to use the server.",
    big: "That message or file is too large. Try a smaller one.",
    empty: "Zyro sent back nothing. Try rephrasing.",
    thoughtonly: "Zyro reasoned but didn't finish. Try again or switch to Auto mode.",
    net: "Can't reach the server. Check your connection and retry."
  };

  async function autoTitle(chatId, firstUser, firstAI){
    if (!firstUser || !firstAI) return;
    try {
      const prompt = "Give a 3-4 word title for a chat that starts with this message. Return ONLY the title, no quotes, no period.\n\nMessage: " + firstUser.slice(0, 300);
      const msgs = [{ role: "user", content: prompt }];
      const chunks = [];
      await workerStream(msgs, x => chunks.push(x), null, true, null, false, { src: [], sep: "" }, false);
      const title = (chunks[chunks.length - 1] || "").split("\n")[0].replace(/^["']|["']$/g, "").trim().slice(0, 40);
      if (!title || title.length < 2) return;
      const c = chats.find(x => x.id === chatId);
      if (c && c.title.length >= 20){
        c.title = title;
        save(); renderList();
      }
    } catch(_) {}
  }

  async function continueReply(aEl){
    if (busy) return;
    const body = aEl.querySelector(".body");
    if (!body) return;
    const prev = body.innerText || "";
    if (!prev.trim()) return;
    toast("Continuing…");
    hist.push({ role: "assistant", content: prev });
    t.value = "Continue from where you stopped. Do not repeat anything. Just keep going.";
    $("f").requestSubmit();
  }

  async function run(show, full, names, imgs){
    imgs = imgs || [];
    if (busy) return;
    busy = true; streaming = true;
    armBusyWatchdog();
    ctrl = new AbortController();
    setGo(true);
    log.querySelectorAll("[data-regen]").forEach(x => x.remove());
    $("hero").classList.add("hide");
    log.classList.add("on");
    log.querySelectorAll(".ed").forEach(x => x.remove());
    const ub = addU(show, names, imgs);
    const t0 = Date.now();
    const cheap = full.trim().length < 60 || tokensOut();
    const baseUsed = getTokens().used;

    const d = addA();
    const body = d.querySelector(".body");
    const chip = d.querySelector(".status-chip");
    const c = startChip(chip);
    down(1);

    let hadThought = false;
    const onThought = th => { hadThought = true; thinkUpdate(d, th); };

    const search = needsSearch(show) && !tokensOut();
    const meta = { src: [], sep: "" };

    let lastRender = 0;
    const emit = x => {
      c.write();
      const now = performance.now();
      if (now - lastRender > 80){
        lastRender = now;
        setH(body, withCaret(liteMd(x)));
        down();
      }
      paintBar(baseUsed + Math.round(x.length / 4), 0);
    };

    const runTimeout = setTimeout(() => {
      if (ctrl && !ctrl.signal.aborted){ try { ctrl.abort(); } catch(_) {} }
    }, STREAM_TIMEOUT_MS);

    try {
      let out;
      if (!WORKER_URL) throw { code: "nowork" };
      const msgs = [{ role: "system", content: SYS() }, ...api(hist, imgs.length === 0), imgs.length ? { role: "user", content: full, images: imgs } : { role: "user", content: full }];

      try {
        out = await workerStream(msgs, emit, ctrl.signal, cheap || $("mode").value === "Fast", onThought, search, meta, true);
      } catch(e1){
        if (e1 && e1.code === "empty" && !ctrl.signal.aborted){
          toast("Retrying…");
          out = await workerStream(msgs, emit, ctrl.signal, cheap || $("mode").value === "Fast", onThought, search, meta, true);
        } else throw e1;
      }
      clearTimeout(runTimeout);
      out = out || "(empty response)";
      streaming = false;
      setH(body, md(out));
      addGround(d, meta.src, meta.sep.length <= 6000 ? meta.sep : "");
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      thinkFinish(d, secs, hadThought);

      const trimmed = out.trim();
      const looksCut = trimmed.length > 200 && !/[.!?)\]}"'`]\s*$/.test(trimmed) && !/```\s*$/.test(trimmed);

      const acts = document.createElement("div");
      acts.className = "acts";
      acts.innerHTML = actsHTML(false, looksCut);
      d.appendChild(acts);

      const rt = document.createElement("div");
      rt.className = "rt"; rt.textContent = "responded in " + secs + "s";
      d.appendChild(rt);

      addEdit(ub);

      if (!cur){ cur = { id: Date.now().toString(36), title: (show || names[0]).replace(/\s+/g, " ").slice(0, 40), msgs: hist, ts: Date.now() }; chats.unshift(cur); }
      cur.ts = Date.now();
      hist.push(
        { role: "user", content: full, show, att: names, imgs: imgs.length ? imgs : undefined },
        { role: "assistant", content: out, src: meta.src, sep: meta.sep.length <= 6000 ? meta.sep : "" }
      );
      if (hist.length > 60) hist.splice(0, hist.length - 60);
      chats = [cur, ...chats.filter(x => x !== cur)];
      save();
      c.done();

      if (hist.length === 2){ autoTitle(cur.id, show, out); }
    } catch(e){
      clearTimeout(runTimeout);
      streaming = false; c.stop();
      if (e && e.name === "AbortError"){
        const wasTimeout = (Date.now() - t0) >= STREAM_TIMEOUT_MS - 500;
        if (wasTimeout){ body.innerHTML = '<span style="color:#e5484d">(timed out — try again or rephrase)</span>'; }
        else { body.innerHTML = '<span style="color:#e5484d">(stopped)</span>'; }
      } else {
        if (e && e.code !== "na"){ t.value = show; t.dispatchEvent(new Event("input")); }
        const msg = (e && ERR[e.code]) || ("Failed: " + (e && e.info || e && e.message || "network problem") + ". Your message is back in the box.");
        body.innerHTML = '<span style="color:#e5484d"></span>';
        body.firstChild.textContent = msg;
      }
      thinkFinish(d, "0", hadThought);
    }
    busy = false; ctrl = null; clearBusyWatchdog(); setGo(false); syncPill(); down();
  }

  $("f").onsubmit = e => {
    e.preventDefault();
    if (busy){ if (ctrl) ctrl.abort(); return; }
    const v = t.value;
    t.value = ""; t.style.height = "auto"; updateSendState();
    send(v);
  };

  /* ---------- CHATS ---------- */
  try { chats = JSON.parse(localStorage.getItem(CK) || "[]"); } catch(_) { chats = []; }
  function save(){
    chats = [...chats.filter(c => c.pin), ...chats.filter(c => !c.pin)].slice(0, 40);
    chats.forEach(c => {
      let seen = false;
      for (let i = c.msgs.length - 1; i >= 0; i--){
        const m = c.msgs[i];
        if (m.imgs && m.imgs.length){
          if (seen){ m.nimg = m.imgs.length; delete m.imgs; } else seen = true;
        }
      }
    });
    for (;;){
      try { localStorage.setItem(CK, JSON.stringify(chats)); break; }
      catch(_) { if (chats.length <= 1) break; chats.pop(); }
    }
    cloudSave();
  }
  function fmtDate(ts){
    if (!ts) return "";
    const d = new Date(ts), now = new Date();
    const hms = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (d.toDateString() === now.toDateString()) return "Today " + hms;
    if (d.toDateString() === new Date(now - 86400000).toDateString()) return "Yesterday " + hms;
    return d.getDate() + " " + d.toLocaleString("en", { month: "short" }) + " " + hms;
  }
  function renChat(id){
    const c = chats.find(x => x.id === id); if (!c) return;
    const n = prompt("Rename chat:", c.title);
    if (n && n.trim()){ c.title = n.trim().slice(0, 40); save(); renderList(); }
  }
  const openD = () => { renderList(); markTh(); updateTokenUI(); $("drawer").classList.add("on"); $("scrim").classList.add("on"); };
  const closeD = () => { $("drawer").classList.remove("on"); $("scrim").classList.remove("on"); };
  function newChat(){
    try { if (ctrl) ctrl.abort(); } catch(_) {}
    busy = false; streaming = false; setGo(false); clearBusyWatchdog();
    cur = null; hist = []; log.innerHTML = ""; log.classList.remove("on");
    $("hero").classList.remove("hide");
    closeD();
    try { t.focus(); } catch(_) {}
  }
  function openChat(id){
    try { if (ctrl) ctrl.abort(); } catch(_) {}
    busy = false; streaming = false; setGo(false); clearBusyWatchdog();
    const c = chats.find(x => x.id === id); if (!c) return;
    cur = c; hist = c.msgs; log.innerHTML = "";
    $("hero").classList.add("hide"); log.classList.add("on");
    c.msgs.forEach((m, i) => {
      if (m.role === "user"){ addU(m.show ?? m.content, m.att, m.imgs, m.nimg); }
      else {
        const d = addA();
        const sc = d.querySelector(".status-chip"); if (sc) sc.remove();
        const tl = d.querySelector(".think-live"); if (tl) tl.remove();
        setH(d.querySelector(".body"), md(m.content));
        addGround(d, m.src, m.sep);
        const acts = document.createElement("div");
        acts.className = "acts";
        acts.innerHTML = actsHTML(i !== c.msgs.length - 1, false);
        d.appendChild(acts);
      }
    });
    const us = log.querySelectorAll(".u");
    if (c.msgs.length >= 2 && c.msgs[c.msgs.length - 1].role === "assistant" && us.length) addEdit(us[us.length - 1]);
    closeD(); down(1);
  }
  function delChat(id){
    try { if (ctrl) ctrl.abort(); } catch(_) {}
    busy = false; streaming = false; setGo(false); clearBusyWatchdog();
    if (!confirm("Delete this chat?")) return;
    const c = chats.find(x => x.id === id);
    chats = chats.filter(x => x.id !== id);
    save(); cloudDelete(id);
    if (c === cur){ cur = null; hist = []; log.innerHTML = ""; log.classList.remove("on"); $("hero").classList.remove("hide"); }
    renderList();
  }
  function renderList(){
    const l = $("list"); if (!l) return;
    l.innerHTML = "";
    const arr = [...chats.filter(c => c.pin), ...chats.filter(c => !c.pin)];
    if (!arr.length){ l.innerHTML = '<div class="empty-l">No chats yet</div>'; return; }
    arr.forEach(c => {
      const d = document.createElement("div");
      d.className = "it" + (c === cur ? " on" : "");
      const meta = document.createElement("div"); meta.className = "meta";
      const sp = document.createElement("span"); sp.textContent = c.title;
      const sm = document.createElement("small"); sm.textContent = fmtDate(c.ts);
      meta.append(sp, sm);
      meta.onclick = () => openChat(c.id);
      const pn = document.createElement("button"); pn.type = "button"; pn.className = "icon pin" + (c.pin ? " on" : ""); pn.textContent = c.pin ? "★" : "☆";
      pn.onclick = () => { c.pin = !c.pin; save(); renderList(); };
      const rn = document.createElement("button"); rn.type = "button"; rn.className = "icon"; rn.textContent = "✎";
      rn.onclick = () => renChat(c.id);
      const x = document.createElement("button"); x.type = "button"; x.className = "icon"; x.textContent = "✕";
      x.onclick = () => delChat(c.id);
      d.append(meta, pn, rn, x);
      l.appendChild(d);
    });
  }
  function regen(){
    if (busy || hist.length < 2) return;
    const m = hist[hist.length - 2], k = log.children;
    k[k.length - 1].remove(); k[k.length - 1].remove();
    hist.splice(-2);
    run(m.show ?? m.content, m.content, m.att || [], m.imgs || []);
  }

  /* ---------- OVERLAYS ---------- */
  const closePV = () => { $("pv").classList.remove("on"); $("pvf").srcdoc = ""; };
  { const pvx = $("pvx"); if (pvx) pvx.onclick = closePV; }
  { const cvx = $("cvx"); if (cvx) cvx.onclick = () => $("cv").classList.remove("on"); }
  { const cvc = $("cvc"); if (cvc) cvc.onclick = () => copy($("cvp").textContent, cvc); }
  { const ciSave = $("ciSave"); if (ciSave) ciSave.onclick = () => { try { localStorage.setItem(CI, $("ci").value.trim()); } catch(_) {} $("modal").classList.remove("on"); toast("Instructions saved"); }; }
  { const ciCancel = $("ciCancel"); if (ciCancel) ciCancel.onclick = () => $("modal").classList.remove("on"); }

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
      x.onclick = () => { pending.splice(i, 1); renderAtts(); updateSendState(); };
      c.appendChild(x);
      a.appendChild(c);
    });
  }
  async function readAny(f){
    if (/\.pdf$/i.test(f.name) || f.type === "application/pdf"){
      if (!window.pdfjsLib){
        await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
      let o = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 40) && o.length < LIM; i++){
        const tc = await (await pdf.getPage(i)).getTextContent();
        o += tc.items.map(x => x.str).join(" ") + "\n";
      }
      return o;
    }
    return await f.text();
  }
  $("file").onchange = async e => {
    const fs = [...e.target.files]; e.target.value = "";
    for (const f of fs){
      if (tokensOut() && !pro){ toast("Uploads paused — refills at " + nextRefillTime()); break; }
      if (pending.length >= 3){ toast("Max 3 files"); break; }
      if (f.size > 8e6){ toast(f.name + " is too big (max 8 MB)"); continue; }
      try {
        let x = (await readAny(f)).replace(/\r/g, "");
        if (x.includes("\u0000")){ toast("Can't read " + f.name); continue; }
        if (!x.trim()){ toast("No text found in " + f.name); continue; }
        if (x.length > LIM){ x = x.slice(0, LIM) + "\n[...trimmed]"; toast(f.name + " trimmed"); }
        pending.push({ name: f.name, text: x });
      } catch(_) { toast("Couldn't read " + f.name); }
    }
    renderAtts(); updateSendState();
    if (pendingKind === "notes" && pending.length){ setTimeout(() => send(""), 100); }
  };
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
  $("img").onchange = async e => {
    const fs = [...e.target.files]; e.target.value = "";
    for (const f of fs){
      if (tokensOut() && !pro){ toast("Uploads paused — refills at " + nextRefillTime()); break; }
      if (pending.length >= 3){ toast("Max 3 attachments"); break; }
      if (!/^image\//.test(f.type)){ toast("Not an image"); continue; }
      if (f.size > 8e6){ toast(f.name + " is too big (max 8 MB)"); continue; }
      try {
        const im = await readImg(f);
        if (im.data.length > 1100000){ toast("Image too large"); continue; }
        pending.push({ name: f.name || "image", img: im });
      } catch(_) {
        const ext = (f.name || "").split(".").pop().toLowerCase();
        if (ext === "heic" || ext === "heif") toast("HEIC not supported — try a JPG/PNG");
        else toast("Couldn't read " + (f.name || "image"));
      }
    }
    renderAtts(); updateSendState();
  };

  /* ---------- THEME ---------- */
  function curTheme(){ return document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme:light)").matches ? "light" : "dark"); }
  function markTh(){ document.querySelectorAll("[data-th]").forEach(b => b.classList.toggle("on", b.dataset.th === curTheme())); }
  document.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { document.documentElement.setAttribute("data-theme", b.dataset.th); try { localStorage.setItem("zyro_theme", b.dataset.th); } catch(_) {} markTh(); });
  markTh();

  /* ---------- EDIT ---------- */
  function addEdit(u){
    if (!u || u.querySelector(".ed")) return;
    const e = document.createElement("button");
    e.type = "button"; e.className = "ed"; e.setAttribute("data-edit", ""); e.textContent = "✎";
    u.insertBefore(e, u.firstChild);
  }
  function startEdit(u){
    if (busy){ toast("Wait for the reply"); return; }
    const m = hist[hist.length - 2];
    if (!m || m.role !== "user") return;
    const b = u.querySelector(":scope>div"), old = m.show ?? m.content;
    u.classList.add("editing"); b.textContent = "";
    const ta = document.createElement("textarea"); ta.className = "ei"; ta.value = old; ta.rows = 3;
    const bar = document.createElement("div"); bar.className = "eb";
    const cn = document.createElement("button"); cn.type = "button"; cn.textContent = "Cancel";
    cn.onclick = () => { u.classList.remove("editing"); fillBubble(b, old, m.att, m.imgs, m.nimg); };
    const sv = document.createElement("button"); sv.type = "button"; sv.className = "go2"; sv.textContent = "Send";
    sv.onclick = () => { const v = ta.value.trim(); if (v) editLast(v); };
    bar.append(cn, sv); b.append(ta, bar); ta.focus();
  }
  function editLast(v){
    if (busy || hist.length < 2) return;
    const m = hist[hist.length - 2], k = log.children;
    k[k.length - 1].remove(); k[k.length - 1].remove();
    hist.splice(-2);
    const tail = m.content.slice((m.show || "").length);
    run(v, v + tail, m.att || [], m.imgs || []);
  }

  /* ---------- CODE TOOLS ---------- */
  function toggleCode(box){
    if (box.classList.contains("expanded")){ box.classList.remove("expanded"); box.querySelector(".more").textContent = "⤢ Expand"; }
    else { box.classList.add("expanded"); box.querySelector(".more").textContent = "⤡ Collapse"; }
  }
  const RUN_JS = "const AF=Object.getPrototypeOf(async function(){}).constructor;\nconst fmt=a=>a.map(x=>typeof x===\"string\"?x:(()=>{try{return JSON.stringify(x,null,1)}catch(_){return String(x)}})()).join(\" \");\nonmessage=async e=>{console.log=(...a)=>postMessage({t:\"o\",s:fmt(a)});console.info=console.log;console.warn=(...a)=>postMessage({t:\"e\",s:fmt(a)});console.error=console.warn;\n for(const k of [\"fetch\",\"XMLHttpRequest\",\"WebSocket\",\"EventSource\",\"importScripts\",\"indexedDB\"]){try{self[k]=undefined}catch(_){}}\n try{const r=await new AF(e.data.code)();if(r!==undefined)postMessage({t:\"o\",s:\"\\u2192 \"+fmt([r])})}catch(err){postMessage({t:\"e\",s:String(err&&err.stack||err)})}\n postMessage({t:\"d\"})}";
  const RUN_PY = "let py=null;\nonmessage=async e=>{try{\n if(!py){postMessage({t:\"s\",s:\"Loading Python (one-time download, about 10 MB)...\"});\n  importScripts(\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js\");\n  py=await loadPyodide({indexURL:\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/\"})}\n py.setStdout({batched:s=>postMessage({t:\"o\",s})});py.setStderr({batched:s=>postMessage({t:\"e\",s})});\n postMessage({t:\"r\"});\n try{await py.loadPackagesFromImports(e.data.code)}catch(_){}\n const r=await py.runPythonAsync(e.data.code);if(r!==undefined&&r!==null)postMessage({t:\"o\",s:\"\\u2192 \"+String(r)})\n }catch(err){postMessage({t:\"e\",s:String(err&&err.message||err)})}\n postMessage({t:\"d\"})}";
  let pyW = null;
  const mkW = src => new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  function runCode(box, kind, btn){
    if (box._stop){ box._stop(); return; }
    let out = box.querySelector(".out");
    if (!out){ out = document.createElement("div"); out.className = "out"; box.appendChild(out); }
    out.textContent = "";
    const code = box.querySelector("pre").textContent;
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
        fx.type = "button"; fx.className = "fix-btn"; fx.setAttribute("data-fix", "");
        fx.innerHTML = "🔧 Fix with Zyro";
        if (!box.querySelector("[data-fix]")) out.appendChild(fx);
      }
    };
    const kill = note => { try { w && w.terminate(); } catch(_) {} if (kind === "py") pyW = null; end(note); };
    const arm = ms => { clearTimeout(tm); tm = setTimeout(() => kill("Stopped after " + Math.round(ms / 1000) + " s."), ms); };
    btn.textContent = "Stop"; box._stop = () => kill("Stopped.");
    if (kind === "py"){ if (!pyW) pyW = mkW(RUN_PY); w = pyW; } else w = mkW(RUN_JS);
    arm(kind === "py" ? 90000 : 10000);
    w.onmessage = ev => {
      if (done) return;
      const m = ev.data || {};
      if (m.t === "s") add("o-s", m.s);
      else if (m.t === "r") arm(15000);
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
  }

  /* ---------- WIRING ---------- */
  { const b = $("burger"); if (b) b.onclick = openD; }
  { const s = $("scrim"); if (s) s.onclick = closeD; }
  { const c = $("closeD"); if (c) c.onclick = closeD; }
  { const n1 = $("newc"); if (n1) n1.onclick = newChat; }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape"){ closeD(); closePV(); $("cv").classList.remove("on"); $("modal").classList.remove("on"); closeAuth(); const d = $("acctDrop"); if (d) d.classList.remove("open"); }
  });
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

  updateSendState();
  updateTokenUI();

  if (new URLSearchParams(location.search).get("auth")){
    openAuth("signin");
    history.replaceState(null, "", location.pathname);
  }

  // ---------- EXPOSE HELPERS FOR TOP-LEVEL openRazorpayCheckout ----------
  window.toast = toast;
  window.openAuth = openAuth;
}

if (document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", boot); }
else { boot(); }
