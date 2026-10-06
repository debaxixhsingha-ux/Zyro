/* ================================================================
   ZYRO v5 — study pipeline + pro tier
   ================================================================ */
(function(){
  // ---- injected study styles (flashcards, quiz, pro badge) ----
  if (document.getElementById("zyro-study-style")) return;
  const s = document.createElement("style");
  s.id = "zyro-study-style";
  s.textContent = `
  /* table */
  .body .table-wrap{overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:12px;background:var(--box)}
  .body table{border-collapse:collapse;width:100%;font-size:14px}
  .body th,.body td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
  .body th{background:var(--box-2);color:var(--ink);font-weight:600;font-size:13px;white-space:nowrap}
  .body tr:last-child td{border-bottom:0}
  .body td{color:var(--ink-2)}
  /* flashcards */
  .fc-trigger{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--acc-line);background:var(--acc-soft);border-radius:12px;padding:10px 14px;margin:12px 0;cursor:pointer;font-size:13.5px;color:var(--ink)}
  .fc-trigger:hover{background:rgba(217,119,87,.16)}
  .fc-trigger b{color:var(--acc);font-weight:600}
  .fc-modal{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:500;padding:20px}
  .fc-modal.on{display:flex}
  .fc-stage{width:100%;max-width:520px;display:flex;flex-direction:column;gap:18px}
  .fc-head{display:flex;align-items:center;justify-content:space-between;color:var(--dim);font-size:13px;font-family:'JetBrains Mono',monospace}
  .fc-head button{background:none;border:0;color:var(--dim);font-size:14px;padding:6px 10px;border-radius:8px;cursor:pointer}
  .fc-head button:hover{background:var(--hover);color:var(--ink)}
  .fc-card{background:var(--bg-2);border:1px solid var(--line-2);border-radius:24px;padding:44px 28px;min-height:280px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:22px;line-height:1.4;cursor:pointer;user-select:none;position:relative;transition:transform .15s}
  .fc-card:active{transform:scale(.98)}
  .fc-card .side{position:absolute;top:16px;left:20px;font:600 10px 'JetBrains Mono',monospace;color:var(--dim);letter-spacing:.15em;text-transform:uppercase}
  .fc-card .hint{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);font-size:11.5px;color:var(--dim-2)}
  .fc-card.back{background:linear-gradient(145deg,rgba(217,119,87,.14),var(--bg-2));border-color:var(--acc-line)}
  .fc-card.back .side{color:var(--acc)}
  .fc-nav{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--dim);font-size:13.5px}
  .fc-nav button{background:var(--box-2);border:1px solid var(--line);color:var(--ink);padding:10px 20px;border-radius:12px;cursor:pointer;font-size:15px}
  .fc-nav button:hover{background:var(--box-2);border-color:var(--line-2)}
  .fc-nav button:disabled{opacity:.35;cursor:not-allowed}
  /* quiz */
  .quiz-trigger{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--line-2);background:var(--box);border-radius:12px;padding:10px 14px;margin:12px 0;cursor:pointer;font-size:13.5px;color:var(--ink)}
  .quiz-trigger:hover{background:var(--box-2)}
  .quiz-trigger b{color:var(--acc)}
  .quiz-modal{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(20px);display:none;align-items:flex-start;justify-content:center;z-index:500;padding:20px;overflow-y:auto}
  .quiz-modal.on{display:flex}
  .quiz-stage{width:100%;max-width:560px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:22px;padding:24px;margin:auto 0;display:flex;flex-direction:column;gap:18px}
  .quiz-head{display:flex;align-items:center;justify-content:space-between;font:600 12px 'JetBrains Mono',monospace;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
  .quiz-head button{background:none;border:0;color:var(--dim);padding:6px 10px;border-radius:8px;cursor:pointer}
  .quiz-head button:hover{background:var(--hover);color:var(--ink)}
  .quiz-q{font-size:17px;line-height:1.55;color:var(--ink)}
  .quiz-opts{display:flex;flex-direction:column;gap:10px}
  .quiz-opt{display:flex;align-items:flex-start;gap:12px;border:1px solid var(--line);background:var(--box);border-radius:14px;padding:13px 16px;cursor:pointer;font-size:15px;color:var(--ink);text-align:left;transition:background .12s,border-color .12s}
  .quiz-opt:hover{background:var(--box-2);border-color:var(--line-2)}
  .quiz-opt.correct{background:rgba(62,207,142,.12);border-color:rgba(62,207,142,.5)}
  .quiz-opt.wrong{background:rgba(229,72,77,.1);border-color:rgba(229,72,77,.5)}
  .quiz-opt .letter{width:24px;height:24px;border-radius:8px;background:var(--box-2);display:grid;place-items:center;font:600 12px 'JetBrains Mono',monospace;color:var(--dim);flex:none}
  .quiz-opt.correct .letter{background:rgba(62,207,142,.2);color:#3ecf8e}
  .quiz-opt.wrong .letter{background:rgba(229,72,77,.2);color:#e5484d}
  .quiz-exp{margin-top:2px;font-size:13px;color:var(--dim);padding:10px 14px;border-left:2px solid var(--acc);background:var(--box);border-radius:0 8px 8px 0}
  .quiz-progress{font:600 12px 'JetBrains Mono',monospace;color:var(--dim);letter-spacing:.06em}
  .quiz-score{text-align:center;padding:30px 20px}
  .quiz-score .big{font-size:56px;font-weight:600;color:var(--ink);letter-spacing:-2px;display:block;margin:12px 0 4px}
  .quiz-score .lbl{font:600 12px 'JetBrains Mono',monospace;color:var(--dim);letter-spacing:.14em;text-transform:uppercase}
  /* fix code button */
  .fix-btn{display:inline-flex;align-items:center;gap:7px;margin-top:6px;border:1px solid var(--acc-line);background:var(--acc-soft);color:var(--acc);border-radius:10px;padding:7px 13px;font-size:13px;cursor:pointer}
  .fix-btn:hover{background:rgba(217,119,87,.18)}
  /* pro badge */
  .pro-badge{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#f0b48a,var(--acc));color:#0a0a0a;font:700 9.5px 'Space Grotesk';letter-spacing:.06em;padding:2px 8px;border-radius:6px;text-transform:uppercase;margin-left:4px}
  .pro-locked{opacity:.5;position:relative;cursor:not-allowed}
  /* upgrade panel */
  .pro-card{background:linear-gradient(160deg,rgba(217,119,87,.15),rgba(217,119,87,.04));border:1px solid var(--acc-line);border-radius:14px;padding:14px;margin:10px 0}
  .pro-card h4{margin:0 0 4px;font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px}
  .pro-card p{margin:0 0 12px;font-size:12.5px;color:var(--dim);line-height:1.5}
  .pro-card .btn-up{width:100%;border:0;background:linear-gradient(135deg,#f0b48a,var(--acc));color:#0a0a0a;font-weight:600;padding:10px;border-radius:10px;cursor:pointer;font-size:14px}
  .pro-card .btn-up:hover{filter:brightness(1.08)}
  .up-modal{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:500;padding:20px}
  .up-modal.on{display:flex}
  .up-box{width:100%;max-width:400px;background:var(--bg-2);border:1px solid var(--acc-line);border-radius:22px;padding:26px 22px}
  .up-box h3{margin:0 0 6px;font-size:20px;color:var(--ink)}
  .up-box .sub{margin:0 0 18px;font-size:13.5px;color:var(--dim)}
  .up-box .price{font-size:34px;font-weight:600;color:var(--ink);letter-spacing:-1px;margin:0 0 4px}
  .up-box .price em{font-style:normal;font-size:14px;font-weight:400;color:var(--dim);letter-spacing:0}
  .up-box ul{margin:14px 0 20px;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
  .up-box li{font-size:13.5px;color:var(--ink-2);display:flex;gap:9px;align-items:flex-start}
  .up-box li svg{width:15px;height:15px;color:var(--acc);flex:none;margin-top:3px}
  .up-box .actions{display:flex;gap:8px}
  .up-box .actions button{flex:1;padding:12px;border-radius:12px;font-weight:600;font-size:14.5px;cursor:pointer;border:1px solid var(--line)}
  .up-box .actions button.primary{background:linear-gradient(135deg,#f0b48a,var(--acc));color:#0a0a0a;border:0}
  .up-box .actions button.ghost{background:none;color:var(--ink)}
  `;
  document.head.appendChild(s);
})();

/* ============ HOISTED HELPERS ============ */
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
let TOTAL=100000;
let sb=null,sbP=null,user=null,pro=false;
let chats=[],cur=null;
let ctrl=null,hist=[],busy=false,streaming=false;
let pending=[];
let sid=0,follow=true,uAcc=0,uT=null,syncT=null;
const LIM=12000;

function boot(){
  const $=id=>document.getElementById(id);
  const log=$("log"),t=$("t"),go=$("go"),main=$("main");
  if(!log||!t||!go||!main){showErr("Core elements missing from app.html");return;}

  const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const escA=s=>esc(s).replace(/"/g,"&quot;");
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const getCI=()=>{try{return localStorage.getItem(CI)||""}catch(_){return""}};

  /* ============ TOKENS ============ */
  function getTokens(){try{const d=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");const now=Date.now();
    if(!d||!d.reset||now-d.reset>86400000)return{used:0,last:0,reset:now};
    if(typeof d.used!=="number"){let s=0;for(const k in d.used)s+=+d.used[k]||0;d.used=s;try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
    return d}catch(_){return{used:0,last:0,reset:Date.now()}}}
  function saveTokens(d){try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
  function addTokens(n){const d=getTokens();d.used+=n;d.last=n;saveTokens(d);updateTokenUI();cloudUsage(n)}
  const tokensOut=()=>getTokens().used>=TOTAL;
  function paintBar(used,last){const pct=Math.min(100,(used/TOTAL)*100);
    const p=used>0&&pct<0.1?"<0.1":pct<10?pct.toFixed(1):Math.floor(pct);
    const tp=$("tPct"); if(tp) tp.textContent=p+"% of 100% used";
    const f=$("fTotal");
    if(f){f.style.width=pct+"%";f.className="token-fill"+(pct>=95?" danger":pct>=80?" warn":"")}
    const tl=$("tLast");
    if(tl && last) tl.textContent="last "+last.toLocaleString()}
  function updateTokenUI(){const d=getTokens();paintBar(d.used,d.last);
    const tn=$("tNote");
    if(tn) tn.textContent=pro?"PRO · 1M tokens / day":"Free · 100k tokens / day · refills at midnight";
    applyLimits()}
  function applyLimits(){const out=tokensOut();
    if(!pro){
      const up=$("upb"); if(up) up.disabled=out;
      const ib=$("imb"); if(ib) ib.disabled=out;
      const fb=$("fileBtn"); if(fb) fb.disabled=out;
      const ibtn=$("imgBtn"); if(ibtn) ibtn.disabled=out;
    }
    const mb=$("mode");
    if(mb){
      const th=mb.querySelector('option[value="Thinking"]');
      if(th) th.disabled=out&&!pro;
      if(out&&!pro&&mb.value==="Thinking") setMode("Fast");
    }
  }

  function toast(m){const e=$("toast");if(!e)return;e.textContent=m;e.classList.add("on");setTimeout(()=>e.classList.remove("on"),1600)}

  /* ============ MODES + STUDY ============ */
  const MODES={Fast:"Quick short answer, minimal thinking.",Auto:"Balanced speed and depth.",Thinking:"Deep analysis, long detailed answer."};
  const STAGES=["Thinking","Analyzing","Planning steps"];
  const STUDY={
    Chat:"",
    Solver:"Study mode: solve step by step with clear numbered steps, show formulas, put the final answer in bold, end with one line naming the key concept.",
    Socratic:"Study mode: do NOT give the final answer immediately. Guide with one short question or hint at a time, check reasoning, reveal the answer only if they ask or are stuck twice.",
    Exam:"EXAM MODE. When the user asks a question, answer in strict exam format:\n- Start with the marks breakdown. E.g. **For 5 marks:** then numbered points. If the user specified marks (2, 5, 10), respect that.\n- Use crisp, examiner-friendly language. No filler.\n- End with a short **Key terms to mention:** list (4-6 terms).\n- If the question could also appear as a 2-mark or 10-mark, add a one-line note: *For 2 marks, shorten to: …*"
  };
  const QUICK=[
    ["Explain this code","Explain this code step by step:\n\n","Chat"],
    ["Fix my error","Fix this error and explain what caused it:\n\n","Chat"],
    ["Solve a problem","","Solver"],
    ["Quiz me","Quiz me on ","Exam"],
    ["Exam answer","Give me a proper exam answer (5 marks) for: ","Exam"],
    ["Teach me step by step","Teach me ","Socratic"],
    ["📚 Notes → Flashcards → Quiz","","Chat",1,"notes"],
    ["Notes from my PDF","Make short revision notes from the attached PDF.","Chat",1],
    ["Viva questions","Give me 10 viva questions with short answers on ","Chat"],
    ["Build a web page","Build a web page for ","Chat"]
  ];

  const hiddenMode=$("mode");
  if(hiddenMode){
    hiddenMode.innerHTML="";
    Object.keys(MODES).forEach(m=>hiddenMode.add(new Option(m)));
    hiddenMode.value="Auto";
  }
  const hiddenStudy=$("study");
  if(hiddenStudy){
    hiddenStudy.innerHTML="";
    [["Chat","Chat"],["Solver","Solver"],["Socratic","Socratic"],["Exam","Exam prep"]].forEach(([v,l])=>hiddenStudy.add(new Option(l,v)));
  }

  /* ============ MODE DROPDOWN ============ */
  const MODE_ICONS={
    Fast:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    Auto:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>',
    Thinking:'<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6M10 17h4M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z"/></svg>'
  };
  const modeBtn=$("modeBtn"), modeMenu=$("modeMenu"), modeLabel=$("modeLabel"), modeWrap=$("modeWrap");
  function setMode(m){
    if(!MODES[m]) m="Auto";
    if(hiddenMode) hiddenMode.value=m;
    if(modeLabel) modeLabel.textContent=m;
    if(modeBtn){const old=modeBtn.querySelector(".lead"); if(old) old.outerHTML=MODE_ICONS[m];}
    if(modeMenu) modeMenu.querySelectorAll(".mode-opt").forEach(o=>o.classList.toggle("active",o.dataset.mode===m));
  }
  if(modeBtn&&modeMenu){
    modeBtn.addEventListener("click",e=>{e.stopPropagation();modeMenu.classList.toggle("open")});
    modeMenu.querySelectorAll(".mode-opt").forEach(opt=>{
      opt.addEventListener("click",e=>{e.stopPropagation();setMode(opt.dataset.mode);modeMenu.classList.remove("open")});
    });
  }
  setMode("Auto");

  /* ============ STUDY DROPDOWN ============ */
  const studyBtn=$("studyBtn"), studyMenu=$("studyMenu"), studyLabel=$("studyLabel"), studyWrap=$("studyWrap");
  function setStudy(v){
    if(!STUDY.hasOwnProperty(v)) v="Chat";
    if(hiddenStudy) hiddenStudy.value=v;
    if(studyLabel) studyLabel.textContent=(v==="Exam")?"Exam prep":v;
    if(studyMenu) studyMenu.querySelectorAll(".study-opt").forEach(o=>o.classList.toggle("active",o.dataset.study===v));
    try{localStorage.setItem("zyro_study",v)}catch(_){}
  }
  if(studyBtn&&studyMenu){
    studyBtn.addEventListener("click",e=>{e.stopPropagation();studyMenu.classList.toggle("open")});
    studyMenu.querySelectorAll(".study-opt").forEach(opt=>{
      opt.addEventListener("click",e=>{e.stopPropagation();setStudy(opt.dataset.study);studyMenu.classList.remove("open")});
    });
  }
  try{const sv=localStorage.getItem("zyro_study"); if(sv) setStudy(sv); else setStudy("Chat");}catch(_){setStudy("Chat");}

  document.addEventListener("click",e=>{
    if(modeWrap&&!modeWrap.contains(e.target)&&modeMenu) modeMenu.classList.remove("open");
    if(studyWrap&&!studyWrap.contains(e.target)&&studyMenu) studyMenu.classList.remove("open");
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      if(modeMenu) modeMenu.classList.remove("open");
      if(studyMenu) studyMenu.classList.remove("open");
      document.querySelectorAll(".fc-modal.on,.quiz-modal.on,.up-modal.on").forEach(m=>m.classList.remove("on"));
    }
  });

  /* ============ QUICK CHIPS ============ */
  const chipsBox=$("chips");
  if(chipsBox){
    QUICK.forEach(item=>{
      const [label,pre,st,pdf,kind]=item;
      const b=document.createElement("button");
      b.type="button";b.textContent=label;
      if(kind==="notes") b.dataset.kind="notes";
      b.onclick=()=>{
        setStudy(st);
        t.value=pre;t.dispatchEvent(new Event("input"));
        t.focus();
        try{t.setSelectionRange(t.value.length,t.value.length)}catch(_){}
        if(pdf){
          pendingKind = kind || null;
          $("file").click();
        }
      };
      chipsBox.appendChild(b);
    });
  }
  let pendingKind=null;

  /* ============ ATTACH BUTTONS ============ */
  {const ib=$("imgBtn"); if(ib) ib.onclick=()=>$("img").click();}
  {const fb=$("fileBtn"); if(fb) fb.onclick=()=>{$("file").click();};}
  {const mb=$("moreBtn"); if(mb) mb.onclick=()=>toast("More attachments coming soon");}

  /* ============ PASSWORD EYE ============ */
  const EYE_OPEN='<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  {const eye=$("amEye"),icon=$("amEyeIcon"),pw=$("amPw");
   if(eye&&icon&&pw){
     eye.onclick=function(){
       const showing=pw.type==="text";
       pw.type=showing?"password":"text";
       icon.innerHTML=showing?EYE_OPEN:EYE_OFF;
     };
   }}

  /* ============ SUPABASE AUTH ============ */
  function sbClient(){if(!SUPABASE_URL)return Promise.resolve(null);
    if(sb)return Promise.resolve(sb);
    if(!sbP)sbP=loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(()=>{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);return sb});
    return sbP}

  const authsec=document.createElement("div");authsec.id="authsec";authsec.className="authsec";
  const drawerDh=document.querySelector("#drawer .dh");
  if(drawerDh)drawerDh.insertAdjacentElement("afterend",authsec);
  renderAuth();

  /* ============ PRO PANEL INJECTION ============ */
  const proPanel = document.createElement("div");
  proPanel.id = "proPanel";
  proPanel.className = "pro-card";
  proPanel.innerHTML =
    '<h4>'+(pro?'💎 Pro member':'💎 Go Pro')+'</h4>'+
    '<p>'+(pro?'You have unlimited access to all features. Thanks for supporting Zyro!':'Unlock 1M tokens/day, unlimited PDFs, Notes→Flashcards→Quiz, printable notes, and priority speed.')+'</p>'+
    (pro?'':'<button class="btn-up" id="upBtn">Upgrade · ₹199 / mo</button>');
  const tokenSection = document.querySelector(".token-section");
  if(tokenSection) tokenSection.parentNode.insertBefore(proPanel, tokenSection.nextSibling);

  /* ============ UPGRADE MODAL ============ */
  const upModal = document.createElement("div");
  upModal.className = "up-modal";
  upModal.id = "upModal";
  upModal.innerHTML =
    '<div class="up-box">'+
      '<h3>Zyro Pro</h3>'+
      '<p class="sub">Everything free, plus more.</p>'+
      '<p class="price">₹199 <em>/ month</em></p>'+
      '<p class="sub" style="margin:0">or ₹999 / year — save 58%</p>'+
      '<ul>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg><b style="font-weight:500">1M tokens daily</b> — 10× the free limit</li>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>Unlimited PDFs & images per message</li>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg><b style="font-weight:500">Notes → Flashcards → Quiz</b> from any PDF</li>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>Exam-mode answers with mark breakdowns</li>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>Priority model access (Pro model always)</li>'+
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>No ads, ever</li>'+
      '</ul>'+
      '<div class="actions">'+
        '<button class="ghost" id="upCancel">Maybe later</button>'+
        '<button class="primary" id="upGo">Upgrade now</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(upModal);

  document.body.addEventListener("click",e=>{
    if(e.target.id==="upBtn"){ upModal.classList.add("on"); return; }
    if(e.target.id==="upCancel"){ upModal.classList.remove("on"); return; }
    if(e.target.id==="upGo"){
      upModal.classList.remove("on");
      // real integration hook — replace with Razorpay / Stripe
      if(!user){
        toast("Sign in first to upgrade");
        openAuth("signup");
        return;
      }
      toast("Payment coming soon — we'll email you when it's live");
      return;
    }
  });

  /* ============ FLASHCARD + QUIZ MODALS ============ */
  const fcModal = document.createElement("div");
  fcModal.className = "fc-modal"; fcModal.id = "fcModal";
  fcModal.innerHTML = '<div class="fc-stage"><div class="fc-head"><span id="fcCount">1 / 1</span><button id="fcClose">Close ✕</button></div><div class="fc-card" id="fcCard"><span class="side" id="fcSide">Front</span><span id="fcText"></span><span class="hint">Tap to flip</span></div><div class="fc-nav"><button id="fcPrev">←</button><button id="fcFlip">Flip</button><button id="fcNext">→</button></div></div>';
  document.body.appendChild(fcModal);

  const quizModal = document.createElement("div");
  quizModal.className = "quiz-modal"; quizModal.id = "quizModal";
  quizModal.innerHTML = '<div class="quiz-stage"><div class="quiz-head"><span id="qIdx">Q 1 / 1</span><button id="qClose">Close ✕</button></div><div id="qBody"></div></div>';
  document.body.appendChild(quizModal);

  let fcCards=[], fcIdx=0, fcFlipped=false;
  function openFlashcards(cards){
    if(!cards.length) return;
    fcCards=cards; fcIdx=0; fcFlipped=false;
    fcModal.classList.add("on");
    paintCard();
  }
  function paintCard(){
    const c=fcCards[fcIdx];
    const card=$("fcCard"), txt=$("fcText"), side=$("fcSide"), cnt=$("fcCount");
    side.textContent=fcFlipped?"Back":"Front";
    txt.textContent=fcFlipped?c.b:c.a;
    cnt.textContent=(fcIdx+1)+" / "+fcCards.length;
    card.classList.toggle("back",fcFlipped);
    $("fcPrev").disabled = fcIdx===0;
    $("fcNext").disabled = fcIdx===fcCards.length-1;
  }
  document.body.addEventListener("click",e=>{
    if(e.target.id==="fcClose"){ fcModal.classList.remove("on"); return; }
    if(e.target.closest("#fcCard")){ fcFlipped=!fcFlipped; paintCard(); return; }
    if(e.target.id==="fcFlip"){ fcFlipped=!fcFlipped; paintCard(); return; }
    if(e.target.id==="fcPrev"){ if(fcIdx>0){fcIdx--;fcFlipped=false;paintCard()} return; }
    if(e.target.id==="fcNext"){ if(fcIdx<fcCards.length-1){fcIdx++;fcFlipped=false;paintCard()} return; }
    if(e.target.classList.contains("fc-trigger")){
      const idx=+e.target.dataset.idx;
      const cards=window._zyroFCsets && window._zyroFCsets[idx];
      if(cards) openFlashcards(cards);
      return;
    }
  });

  let quizQs=[], quizIdx=0, quizScore=0, quizAnswered=false;
  function openQuiz(qs){
    if(!qs.length) return;
    quizQs=qs; quizIdx=0; quizScore=0; quizAnswered=false;
    quizModal.classList.add("on");
    paintQuiz();
  }
  function paintQuiz(){
    const q=quizQs[quizIdx];
    const body=$("qBody");
    $("qIdx").textContent="Q "+(quizIdx+1)+" / "+quizQs.length+(quizAnswered?" · score "+quizScore:"");
    let h='<div class="quiz-q">'+esc(q.q)+'</div><div class="quiz-opts">';
    q.opts.forEach((opt,i)=>{
      const letter=String.fromCharCode(65+i);
      let cls="quiz-opt";
      if(quizAnswered){
        if(letter===q.ans) cls+=" correct";
        else if(letter===q.picked) cls+=" wrong";
      }
      h+='<button class="'+cls+'" data-letter="'+letter+'"><span class="letter">'+letter+'</span><span>'+esc(opt)+'</span></button>';
    });
    h+='</div>';
    if(quizAnswered && q.ex) h+='<div class="quiz-exp">'+esc(q.ex)+'</div>';
    if(quizAnswered){
      if(quizIdx<quizQs.length-1){
        h+='<div style="margin-top:16px;text-align:right"><button class="quiz-opt" id="qNext" style="display:inline-flex;width:auto;padding:10px 20px">Next →</button></div>';
      }else{
        const pct=Math.round((quizScore/quizQs.length)*100);
        h+='<div class="quiz-score"><span class="lbl">Your score</span><span class="big">'+quizScore+' / '+quizQs.length+'</span><span class="lbl">'+pct+'%</span></div>';
        h+='<div style="text-align:center"><button id="qRestart" style="background:var(--box-2);border:1px solid var(--line);color:var(--ink);padding:10px 22px;border-radius:12px;cursor:pointer;font-size:14px">Try again</button></div>';
      }
    }
    body.innerHTML=h;
  }
  document.body.addEventListener("click",e=>{
    if(e.target.id==="qClose"){ quizModal.classList.remove("on"); return; }
    if(e.target.id==="qRestart"){ quizIdx=0;quizScore=0;quizAnswered=false;paintQuiz(); return; }
    if(e.target.id==="qNext"){ quizIdx++;quizAnswered=false;paintQuiz(); return; }
    const opt=e.target.closest(".quiz-opt");
    if(opt && !quizAnswered && opt.dataset.letter){
      const q=quizQs[quizIdx];
      q.picked=opt.dataset.letter;
      if(opt.dataset.letter===q.ans) quizScore++;
      quizAnswered=true;
      paintQuiz();
      return;
    }
    if(e.target.classList.contains("quiz-trigger")){
      const idx=+e.target.dataset.idx;
      const qs=window._zyroQuizSets && window._zyroQuizSets[idx];
      if(qs) openQuiz(qs);
      return;
    }
  });

  /* ============ MARKDOWN ============ */
  const MR=/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
  const inl=x=>{const st=[],tk=h=>"\u0001"+(st.push(h)-1)+"\u0002";
    x=x.replace(/`([^`]+)`/g,(_,c)=>tk('<code class="i">'+esc(c)+'</code>'));
    x=x.replace(MR,(m,a,b,c,d)=>{if(d!==undefined&&!/[\\^_=+\-*\/<>{}()]|^[A-Za-z]$|\d/.test(d))return m;return tk('<span class="mx" data-d="'+(a!==undefined||b!==undefined?1:0)+'" data-tex="'+escA(a??b??c??d)+'">'+esc(m)+'</span>')});
    return esc(x).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\u0001(\d+)\u0002/g,(_,i)=>st[i])};

  function renderTable(rows){
    if(!rows.length) return "";
    const splitRow=r=>r.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(c=>c.trim());
    const head=splitRow(rows[0]);
    let h='<div class="table-wrap"><table><thead><tr>';
    head.forEach(c=>h+="<th>"+inl(c)+"</th>");
    h+="</tr></thead><tbody>";
    for(let r=1;r<rows.length;r++){
      h+="<tr>";
      splitRow(rows[r]).forEach(c=>h+="<td>"+inl(c)+"</td>");
      h+="</tr>";
    }
    h+="</tbody></table></div>";
    return h;
  }

  function txt(p){
    const lines=p.split("\n");
    let h="",l=null,pa=[];
    const fp=()=>{if(pa.length){h+="<p>"+inl(pa.join("\n"))+"</p>";pa=[]}};
    const fl=()=>{if(l){h+="</"+l+">";l=null}};
    const isTableRow=s=>/^\s*\|.+\|\s*$/.test(s);
    const isTableSep=s=>/^\s*\|[\s\-:|]+\|\s*$/.test(s)&&/-/.test(s);
    let i=0;
    while(i<lines.length){
      const ln=lines[i];let m;
      if(isTableRow(ln)&&i+1<lines.length&&isTableSep(lines[i+1])){
        fp();fl();
        const rows=[ln];i+=2;
        while(i<lines.length&&isTableRow(lines[i])){rows.push(lines[i]);i++}
        h+=renderTable(rows);continue;
      }
      if(m=ln.match(/^\s{0,3}(#{1,6})\s+(.*)/)){fp();fl();const n=Math.min(m[1].length+1,4);h+="<h"+n+">"+inl(m[2])+"</h"+n+">"}
      else if(/^\s*([-*_])\1{2,}\s*$/.test(ln)){fp();fl();h+="<hr>"}
      else if(m=ln.match(/^\s*[-*]\s+(.*)/)){fp();if(l!=="ul"){fl();h+="<ul>";l="ul"}h+="<li>"+inl(m[1])+"</li>"}
      else if(m=ln.match(/^\s*\d+[.)]\s+(.*)/)){fp();if(l!=="ol"){fl();h+="<ol>";l="ol"}h+="<li>"+inl(m[1])+"</li>"}
      else if(!ln.trim()){fp();fl()}
      else{fl();pa.push(ln)}
      i++;
    }
    fp();fl();
    return h;
  }

  const KW=new Set("abstract and as assert async await break case catch class const continue def default del do elif else enum except export extends final finally for from fn func function if implements import in interface is lambda let loop match mod mut namespace new not null None nil of or package pass private protected pub public raise return self static struct super switch this throw throws trait true True false False try type typeof union unsafe use using var void while with yield select insert update delete create table where join group order by limit values SELECT INSERT UPDATE DELETE CREATE TABLE WHERE JOIN GROUP ORDER BY LIMIT VALUES FROM AS AND OR NOT NULL INTO SET".split(" "));
  const HASH=/^(py|python|bash|sh|shell|zsh|ruby|rb|yaml|yml|toml|r|perl|dockerfile|makefile|ini|conf|powershell|ps1)$/i;
  const CM={h:/#[^\n]*/,q:/--[^\n]*|\/\*[\s\S]*?\*\//,s:/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/};
  const REST=/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-f]+\b|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[A-Za-z_]\w*\b)/;
  const RX={};
  function hl(c,l){if(c.length>20000)return esc(c);const k=HASH.test(l)?"h":/^sql$/i.test(l)?"q":"s",re=RX[k]||(RX[k]=new RegExp("("+CM[k].source+")|"+REST.source,"gi"));
    re.lastIndex=0;let o="",last=0,m;
    while((m=re.exec(c))){if(m[0]==="")break;o+=esc(c.slice(last,m.index));last=re.lastIndex;const tx=m[0],q=m[1]?"c":m[2]?"s":m[3]?"n":KW.has(tx)?"k":/^[A-Z][a-z]/.test(tx)?"t":"";
      o+=q?'<span class="h'+q+'">'+esc(tx)+"</span>":esc(tx)}
    return o+esc(c.slice(last))}
  function typeset(root){if(!window.katex||streaming)return;root.querySelectorAll(".mx:not([data-k])").forEach(el=>{try{el.innerHTML=katex.renderToString(el.dataset.tex,{displayMode:el.dataset.d==="1",throwOnError:false});el.dataset.k=1}catch(_){}})}
  function setH(el,h){el.innerHTML=h;typeset(el);enhanceStudy(el)}
  window.typesetAll=function(){typeset(document)};
  function md(src){let h="";src.split(/```/).forEach((p,i)=>{if(i%2){const nl=p.indexOf("\n"),l=nl>-1?p.slice(0,nl).trim():"",c=nl>-1?p.slice(nl+1):p;
    const code=c.replace(/\n$/,""),isH=/^html?$/i.test(l)||(!l&&/<!doctype|<html/i.test(c)),rn=/^(js|javascript|node|mjs)$/i.test(l)?"js":/^(py|python|python3)$/i.test(l)?"py":"";
    h+='<div class="cb col" data-lang="'+escA(l)+'"><div class="ch"><span>'+esc(l||"code")+'</span><span>'+(rn?'<button type="button" data-run="'+rn+'">Run</button>':"")+(isH?'<button type="button" data-p>Preview</button>':"")+'<button type="button" data-c>Copy</button><button type="button" class="more" data-v>\u2922 Expand</button></span></div><pre>'+hl(code,l)+'</pre></div>'}
    else h+=txt(p)});return h}
  function liteMd(src){let h="";const parts=src.split(/```/);
    for(let i=0;i<parts.length;i++){const p=parts[i];
      if(i%2){const nl=p.indexOf("\n"),c=nl>-1?p.slice(nl+1):p;h+='<div class="cb live col"><pre>'+esc(c)+'</pre></div>'}
      else{p.split(/\n{2,}/).forEach(bl=>{const s=bl.trim();if(s)h+='<p>'+esc(s).replace(/\n/g,"<br>")+'</p>'})}}
    return h}

  /* ============ STUDY ENHANCER ============ */
  function enhanceStudy(root){
    if(!root) return;
    // scan for flashcard patterns
    const full=root.textContent||"";
    const fcMatches=[...full.matchAll(/^\s*F:\s*(.+?)\s*\n\s*B:\s*(.+?)(?=\n\s*F:|\n\s*##|\n\s*$)/gims)];
    if(fcMatches.length>=3){
      const cards=fcMatches.map(m=>({a:m[1].trim(),b:m[2].trim()}));
      window._zyroFCsets=window._zyroFCsets||[];
      const idx=window._zyroFCsets.push(cards)-1;
      const trigger=document.createElement("div");
      trigger.className="fc-trigger";
      trigger.dataset.idx=idx;
      trigger.innerHTML='📚 <b>'+cards.length+' flashcards</b> ready · Tap to study';
      // insert after the last heading that mentions Flashcards, else at top
      root.insertBefore(trigger, root.firstChild);
    }
    // scan for quiz patterns
    const quizBlocks=[];
    const quizRe=/^\s*Q:\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Ans:\s*([A-D])\s*(?:\n\s*Ex:\s*(.+?))?(?=\n\s*Q:|\n\s*##|\n\s*$)/gims;
    let m;
    while((m=quizRe.exec(full))){
      quizBlocks.push({
        q:m[1].trim(),
        opts:[m[2].trim(),m[3].trim(),m[4].trim(),m[5].trim()],
        ans:m[6].trim().toUpperCase(),
        ex:(m[7]||"").trim()
      });
    }
    if(quizBlocks.length>=3){
      window._zyroQuizSets=window._zyroQuizSets||[];
      const idx=window._zyroQuizSets.push(quizBlocks)-1;
      const trigger=document.createElement("div");
      trigger.className="quiz-trigger";
      trigger.dataset.idx=idx;
      trigger.innerHTML='📝 <b>'+quizBlocks.length+'-question quiz</b> · Tap to start';
      root.insertBefore(trigger, root.firstChild);
    }
  }

  /* ============ RENDER MESSAGES ============ */
  function fillBubble(b,txt,names,imgs,nimg){b.textContent=txt;
    if(imgs&&imgs.length){const w=document.createElement("div");w.className="th";imgs.forEach(im=>{const i=document.createElement("img");i.alt="attached image";i.src="data:"+im.mime+";base64,"+im.data;w.appendChild(i)});b.appendChild(w)}
    else if(nimg){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F5BC} "+nimg+" image"+(nimg>1?"s":"")+" (not saved)";b.appendChild(f)}
    if(names&&names.length){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F4CE} "+names.join(", ");b.appendChild(f)}}
  function addU(txt,names,imgs,nimg){const d=document.createElement("div");d.className="u";const b=document.createElement("div");fillBubble(b,txt,names,imgs,nimg);d.appendChild(b);log.appendChild(d);return d}

  function addA(){
    const msgId=Date.now().toString(36);
    const d=document.createElement("div");
    d.className="a";
    d.dataset.msgId=msgId;
    d.innerHTML=
      '<div class="status-chip" role="status"></div>'+
      '<div class="think-live" hidden>'+
        '<button type="button" class="think-live-head" aria-expanded="true">'+
          '<span class="chev">›</span>'+
          '<span class="think-live-dot"></span>'+
          '<span class="think-live-label">Thinking…</span>'+
        '</button>'+
        '<div class="think-live-body open"><div class="think-live-inner"></div></div>'+
      '</div>'+
      '<div class="body"></div>';
    log.appendChild(d);
    return d;
  }
  function thinkShow(d,show){const el=d.querySelector(".think-live");if(!el)return null;if(show)el.hidden=false;return el}
  function thinkUpdate(d,text){
    const el=thinkShow(d,true);if(!el)return;
    const inner=el.querySelector(".think-live-inner");
    if(inner){inner.textContent=text;inner.scrollTop=inner.scrollHeight}
    down();
  }
  function thinkFinish(d,seconds,hadText){
    const el=d.querySelector(".think-live");if(!el)return;
    if(!hadText){el.remove();return}
    el.classList.add("done");
    const dot=el.querySelector(".think-live-dot");if(dot)dot.remove();
    const label=el.querySelector(".think-live-label");if(label)label.textContent="Thought for "+seconds+"s";
    const head=el.querySelector(".think-live-head");
    const panelBody=el.querySelector(".think-live-body");
    if(head)head.setAttribute("aria-expanded","false");
    if(panelBody)panelBody.classList.remove("open");
    if(head&&panelBody&&!head.dataset.wired){
      head.dataset.wired="1";
      head.addEventListener("click",()=>{
        const open=head.getAttribute("aria-expanded")==="true";
        head.setAttribute("aria-expanded",String(!open));
        panelBody.classList.toggle("open",!open);
      });
    }
  }

  const distB=()=>main.scrollHeight-main.scrollTop-main.clientHeight;
  const syncPill=()=>{const j=$("jump"); if(j) j.classList.toggle("on",distB()>140)};
  ["wheel","touchmove"].forEach(ev=>main.addEventListener(ev,()=>{clearTimeout(main._st);main._st=setTimeout(()=>{follow=distB()<140;syncPill()},80)}));
  main.addEventListener("scroll",()=>{if(distB()<140)follow=true;syncPill()});
  {const j=$("jump"); if(j) j.onclick=()=>{follow=true;main.scrollTo({top:main.scrollHeight,behavior:"smooth"})};}
  function down(f){if(f||follow)requestAnimationFrame(()=>{main.scrollTop=main.scrollHeight})}
  function withCaret(h){
    if(/<\/p>$/.test(h))return h.replace(/<\/p>$/,'<span class="caret"></span></p>');
    if(/<\/pre><\/div>$/.test(h))return h.replace(/<\/pre><\/div>$/,'<span class="caret"></span></pre></div>');
    return h+'<span class="caret"></span>'}

  function startChip(chip){let i=0,tm;const n=++sid;
    chip.innerHTML='<span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg'+n+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97757"/><stop offset=".55" stop-color="#f0b48a"/><stop offset="1" stop-color="#d97757"/></linearGradient></defs><path fill="url(#sg'+n+')" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span>';
    const label=chip.querySelector(".status-text");
    const setL=x=>{label.style.opacity=0;clearTimeout(tm);tm=setTimeout(()=>{label.textContent=x;label.style.opacity=1},170)};
    const iv=setInterval(()=>{i=(i+1)%STAGES.length;setL(STAGES[i])},1400);
    return{write(){if(chip.dataset.w)return;chip.dataset.w=1;clearInterval(iv);setL("Writing")},
      done(){clearInterval(iv);clearTimeout(tm);label.classList.remove("shimmer");label.style.opacity=1;label.textContent="Done";chip.classList.add("done");setTimeout(()=>chip.classList.add("fade-out"),900);setTimeout(()=>chip.remove(),1500)},
      stop(){clearInterval(iv);clearTimeout(tm);chip.remove()}}}

  function copy(txt,btn){const ok=()=>{btn.textContent="Copied";setTimeout(()=>btn.textContent="Copy",1200)};
    const fb=()=>{const a=document.createElement("textarea");a.value=txt;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();try{document.execCommand("copy");ok()}catch(_){}a.remove()};
    navigator.clipboard?navigator.clipboard.writeText(txt).then(ok).catch(fb):fb()}

  log.addEventListener("click",e=>{
    const vw=e.target.closest("[data-v]");if(vw)return toggleCode(vw.closest(".cb"));
    const rb=e.target.closest("[data-run]");if(rb)return runCode(rb.closest(".cb"),rb.dataset.run,rb);
    const eb=e.target.closest("[data-edit]");if(eb)return startEdit(eb.closest(".u"));
    const cb=e.target.closest("[data-c]");if(cb)return copy(cb.closest(".cb").querySelector("pre").textContent,cb);
    const pv=e.target.closest("[data-p]");if(pv){$("pvf").srcdoc=pv.closest(".cb").querySelector("pre").textContent;$("pv").classList.add("on");return}
    const fx=e.target.closest("[data-fix]");if(fx){
      const cb2=fx.closest(".cb");
      const code=cb2.querySelector("pre").textContent;
      const err=cb2.querySelector(".out") ? cb2.querySelector(".out").textContent : "";
      const msg="Fix this code. It failed.\n\nCode:\n```\n"+code+"\n```\n\nError:\n```\n"+err+"\n```\n\nExplain what caused the error and give the corrected code.";
      t.value=msg; t.dispatchEvent(new Event("input"));
      $("f").requestSubmit();
      return;
    }
    const rg=e.target.closest("[data-regen]");
    if(rg){if(rg.closest(".a")===log.lastElementChild)regen();else toast("Only the last reply can be regenerated");return}
    const lk=e.target.closest("[data-like]");if(lk){lk.classList.add("active");lk.parentElement.querySelector("[data-dislike]").classList.remove("active");toast("Thanks for the feedback!");return}
    const dk=e.target.closest("[data-dislike]");if(dk){dk.classList.add("active");dk.parentElement.querySelector("[data-like]").classList.remove("active");toast("Thanks for the feedback!")}});

  const todayStr=()=>new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const needsSearch=s=>/\b(latest|newest|recent(ly)?|today|tonight|yesterday|tomorrow|this (week|month|year)|news|released?|launch(ed|es)?|new version|prices?|score|weather|who (is|won)|what'?s new|trending|202[4-9]|203\d)\b/i.test(s)||(/\b(claude|chatgpt|gpt-?\d+|openai|anthropic|gemini|grok|deepseek|llama|qwen|mistral|nvidia|iphone|pixel|galaxy|react|next\.?js|python)\b/i.test(s)&&/\b(models?|versions?|releases?|new|newest|latest|vs|versus|compare|comparison|pricing|price|available|exists?|sonnet|opus|haiku|\d+(\.\d+)?)\b/i.test(s));

  /* ============ SYSTEM PROMPT ============ */
  function appFacts(){ return "Today is "+todayStr()+". Your knowledge has a cutoff — if unsure about recent events, say so. Never mention tokens, quotas, or limits unless the user directly asks."; }

  const SYS=()=>"You are Zyro, an AI assistant for anything: code, studies, writing, ideas, math, daily advice.\n\n"+
    "GREETING RULE: if the user's message is only a greeting (hi, hey, hello, yo, good morning, how are you, etc), reply with ONE short friendly sentence as Zyro. Never list features or abilities.\n\n"+
    "STYLE:\n"+
    "- Clear, concise, markdown. No filler.\n"+
    "- Code in fenced blocks with language tags.\n"+
    "- Math in LaTeX: $inline$ or $$display$$.\n"+
    "- Admit uncertainty. Search results win when provided. Never claim to be another company's assistant.\n\n"+
    "CREATOR (only when the user asks who made/created/built/developed you): Debasish Singha. If asked more: 17 years old, student at Reliance Senior Secondary School in Assam, India. Never bring him up unprompted.\n\n"+
    "BUILD WEBSITES: when the user asks to build/create/make a website, webpage, landing page, UI, dashboard, portfolio, store or form:\n"+
    "- Output ONE complete self-contained HTML file in a single ```html code block.\n"+
    "- All CSS inside <style>, all JS inside <script>. No external files.\n"+
    "- REALISTIC content only. NEVER use Lorem ipsum, 'placeholder', 'TODO', or '...' abbreviations.\n"+
    "- Photos: use https://picsum.photos/seed/UNIQUEWORD/600/800 with a DIFFERENT word per image.\n"+
    "- Responsive, at least 150 lines, write the FULL file every time.\n\n"+
    "NOTES PIPELINE: when the user says 'notes pipeline', 'notes → flashcards', 'make notes flashcards quiz', or similar, produce EXACTLY these three sections in order:\n"+
    "## 📖 Notes\n"+
    "[Short revision notes with key terms bolded. 5-8 paragraphs max.]\n\n"+
    "## 🎴 Flashcards\n"+
    "Output 12 flashcards. Each flashcard EXACTLY in this format on its own lines:\n"+
    "F: [front — a question or a term]\n"+
    "B: [back — the answer or definition, one short line]\n\n"+
    "## 📝 Quiz\n"+
    "Output 5 MCQs. Each one EXACTLY in this format:\n"+
    "Q: [question]\n"+
    "A) [option]\n"+
    "B) [option]\n"+
    "C) [option]\n"+
    "D) [option]\n"+
    "Ans: [A/B/C/D]\n"+
    "Ex: [one-line explanation of the correct answer]\n\n"+
    (STUDY[$("study").value]||"")+
    (getCI()?"\n\nUser's custom instructions: "+getCI().slice(0,800):"")+
    "\n\n"+appFacts();

  function addGround(d,src,sep){const ok=(src||[]).filter(x=>x&&/^https?:\/\//i.test(x.uri));if(!ok.length&&!sep)return;
    const w=document.createElement("div");w.className="ground";
    if(ok.length){const s=document.createElement("div");s.className="srcs";const l=document.createElement("span");l.textContent="Sources";s.appendChild(l);
      ok.slice(0,6).forEach(x=>{const a=document.createElement("a");a.href=x.uri;a.target="_blank";a.rel="noopener noreferrer";a.textContent=(x.title||x.uri).slice(0,40);s.appendChild(a)});w.appendChild(s)}
    if(sep){const f=document.createElement("iframe");f.className="sep";f.setAttribute("sandbox","allow-popups allow-popups-to-escape-sandbox");f.title="Google Search suggestions";f.srcdoc=sep;w.appendChild(f)}
    d.appendChild(w)}

  const ARROW=go.innerHTML,STOPI='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
  function setGo(on){
    if(on){go.innerHTML=STOPI;go.classList.add("on");go.setAttribute("aria-label","Stop")}
    else{go.innerHTML=ARROW;go.classList.remove("on");go.setAttribute("aria-label","Send")}
  }

  async function workerStream(messages,onText,signal,fast,onThought,search,meta){
    let r;
    try{r=await fetch(WORKER_URL,{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,mode:$("mode").value,fast,search:!!search})})}
    catch(e){if(e&&e.name==="AbortError")return"";throw{code:"net",info:"can't reach the server"}}
    if(!r.ok){let m="";try{const j=await r.json();m=(j.error&&j.error.message)||""}catch(_){}
      throw{code:r.status===429?"rate":r.status===403?"origin":r.status===413?"big":"http",info:r.status+(m?" "+m.slice(0,100):"")}}
    if(!r.body)throw{code:"http",info:"empty response"};
    let full="",th="",used=0,aborted=false;const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
    try{for(;;){const{done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});
      const lines=buf.split("\n");buf=lines.pop();
      for(const ln of lines){if(!ln.startsWith("data:"))continue;const dd=ln.slice(5).trim();
        try{const j=JSON.parse(dd),cd=j.candidates&&j.candidates[0];
          if(cd&&cd.content&&cd.content.parts){for(const p of cd.content.parts){if(!p.text)continue;
            if(p.thought){th+=p.text;if(onThought)onThought(th)}else{full+=p.text;onText(full)}}}
          if(cd&&cd.groundingMetadata&&meta){const g=cd.groundingMetadata;
            (g.groundingChunks||[]).forEach(c=>{const w=c&&c.web;if(w&&w.uri&&!meta.src.some(x=>x.uri===w.uri))meta.src.push({uri:w.uri,title:w.title||""})});
            if(g.searchEntryPoint&&g.searchEntryPoint.renderedContent)meta.sep=g.searchEntryPoint.renderedContent}
          if(j.usageMetadata){used=j.usageMetadata.totalTokenCount||used}}catch(_){}}}}
    catch(e){if(e&&e.name==="AbortError")aborted=true;else throw e}
    if(used>0)addTokens(used);else if(full)addTokens(Math.ceil(full.length/4));
    if(!full&&!aborted)throw{code:"empty"};
    return full}

  /* ============ BETTER LONG-CHAT MEMORY ============ */
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
      idxs.forEach(i => { if (essential.has(i)){ kept.push(i); sz += (h[i].content || "").length } });
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
      const copy = { role: m.role, content: m.content };
      if (m.imgs && m.imgs.length && imgBudget > 0){ copy.images = m.imgs; imgBudget -= m.imgs.length; }
      out.unshift(copy);
    }
    return out;
  };

  function send(text){
    const items=pending.slice();
    if(busy||(!text.trim()&&!items.length))return;
    const files=items.filter(f=>!f.img),imgs=items.filter(f=>f.img).map(f=>f.img);

    // Notes pipeline intent
    if(pendingKind==="notes" && (files.length||imgs.length)){
      const base="I uploaded a file. Follow the NOTES PIPELINE format exactly: ## 📖 Notes, ## 🎴 Flashcards (F:/B: format), ## 📝 Quiz (Q:/A)/B)/C)/D)/Ans:/Ex: format). Make it exam-relevant.";
      const full=base+files.map(f=>"\n\n--- "+f.name+" ---\n"+f.text).join("");
      pending=[];pendingKind=null;renderAtts();
      return run("Notes → Flashcards → Quiz from "+files[0].name, full, files.map(f=>f.name), imgs);
    }

    const out=tokensOut();
    if(out&&!pro&&items.length){toast("Uploads paused — try again tomorrow");pending=[];renderAtts();t.value=text;t.dispatchEvent(new Event("input"));return}
    applyLimits();
    const show=text.trim()||(imgs.length&&!files.length?"Describe this image.":imgs.length?"Review the attached files.":"Review the attached file.");
    if(out&&!pro&&/\b(make|build|create|design|generate|develop)\b/i.test(show)){
      $("hero").classList.add("hide");log.classList.add("on");addU(show);
      const d=addA();
      const sc=d.querySelector(".status-chip");if(sc)sc.remove();
      const tl=d.querySelector(".think-live");if(tl)tl.remove();
      setH(d.querySelector(".body"),md("Building is paused right now. Try a shorter question, or come back tomorrow."));
      return}
    const full=show+files.map(f=>"\n\n--- "+f.name+" ---\n"+f.text).join("");
    pending=[];pendingKind=null;renderAtts();
    return run(show,full,files.map(f=>f.name),imgs);
  }

  function actsHTML(noRegen){return '<button type="button" data-like title="Helpful"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button><button type="button" data-dislike title="Not helpful"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>'+(noRegen?'':'<button type="button" data-regen>\u21bb Regenerate</button>')}

  const ERR={
    nowork:"The server address isn't set.",
    rate:"Zyro is busy right now. Try again in a minute.",
    origin:"This site isn't allowed to use the server.",
    big:"That message or file is too large. Try a smaller one.",
    empty:"Zyro sent back nothing. Try rephrasing.",
    net:"Can't reach the server. Check your connection and retry."};

  async function run(show,full,names,imgs){
    imgs=imgs||[];if(busy)return;
    busy=true;streaming=true;
    ctrl=new AbortController();
    setGo(true);
    log.querySelectorAll("[data-regen]").forEach(x=>x.remove());
    $("hero").classList.add("hide");
    log.classList.add("on");
    log.querySelectorAll(".ed").forEach(x=>x.remove());
    const ub=addU(show,names,imgs);
    const t0=Date.now();
    const cheap=full.trim().length<60||tokensOut();
    const baseUsed=getTokens().used;

    const d=addA();
    const body=d.querySelector(".body");
    const chip=d.querySelector(".status-chip");
    const c=startChip(chip);
    down(1);

    let hadThought=false;
    const onThought=th=>{hadThought=true;thinkUpdate(d,th)};

    const search=needsSearch(show)&&!tokensOut(),meta={src:[],sep:""};

    let lastRender=0;
    const emit = x => {
      c.write();
      const now = performance.now();
      if (now - lastRender > 80){
        lastRender = now;
        setH(body, withCaret(liteMd(x)));
        down();
      }
      paintBar(baseUsed + Math.round(x.length/4), 0);
    };

    try{
      let out;
      if(!WORKER_URL)throw{code:"nowork"};
      const msgs=[{role:"system",content:SYS()},...api(hist,imgs.length===0),imgs.length?{role:"user",content:full,images:imgs}:{role:"user",content:full}];
      try{out=await workerStream(msgs,emit,ctrl.signal,cheap||$("mode").value==="Fast",onThought,search,meta)}
      catch(e1){
        if(e1&&e1.code==="empty"&&!ctrl.signal.aborted){
          toast("Retrying…");
          out=await workerStream(msgs,emit,ctrl.signal,cheap||$("mode").value==="Fast",onThought,search,meta);
        } else throw e1;
      }
      out=out||"(empty response)";
      streaming=false;
      setH(body, md(out));
      addGround(d,meta.src,meta.sep.length<=6000?meta.sep:"");
      const secs=((Date.now()-t0)/1000).toFixed(1);
      thinkFinish(d,secs,hadThought);

      const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML(false);d.appendChild(acts);
      const rt=document.createElement("div");rt.className="rt";rt.textContent="responded in "+secs+"s";d.appendChild(rt);
      addEdit(ub);
      if(!cur){cur={id:Date.now().toString(36),title:(show||names[0]).replace(/\s+/g," ").slice(0,40),msgs:hist,ts:Date.now()};chats.unshift(cur)}
      cur.ts=Date.now();
      hist.push({role:"user",content:full,show,att:names,imgs:imgs.length?imgs:undefined},{role:"assistant",content:out,src:meta.src,sep:meta.sep.length<=6000?meta.sep:""});
      if(hist.length>60)hist.splice(0,hist.length-60);
      chats=[cur,...chats.filter(x=>x!==cur)];
      save();
      c.done();
    }catch(e){
      streaming=false;c.stop();
      if(e&&e.name==="AbortError"){body.innerHTML='<span style="color:#e5484d">(stopped)</span>'}
      else{
        if(e&&e.code!=="na"){t.value=show;t.dispatchEvent(new Event("input"))}
        const msg=(e&&ERR[e.code])||("Failed: "+(e&&e.info||e&&e.message||"network problem")+". Your message is back in the box.");
        body.innerHTML='<span style="color:#e5484d"></span>';body.firstChild.textContent=msg;
      }
      thinkFinish(d,"0",hadThought);
    }
    busy=false;ctrl=null;setGo(false);syncPill();down();
  }

  $("f").onsubmit=e=>{
    e.preventDefault();
    if(busy){if(ctrl)ctrl.abort();return}
    const v=t.value;
    t.value="";t.style.height="auto";updateSendState();
    send(v);
  };

  /* ============ CHATS ============ */
  try{chats=JSON.parse(localStorage.getItem(CK)||"[]")}catch(_){chats=[]}
  function save(){
    chats=[...chats.filter(c=>c.pin),...chats.filter(c=>!c.pin)].slice(0,40);
    chats.forEach(c=>{let seen=false;for(let i=c.msgs.length-1;i>=0;i--){const m=c.msgs[i];if(m.imgs&&m.imgs.length){if(seen){m.nimg=m.imgs.length;delete m.imgs}else seen=true}}});
    for(;;){try{localStorage.setItem(CK,JSON.stringify(chats));break}catch(_){if(chats.length<=1)break;chats.pop()}}
    cloudSave();
  }
  function fmtDate(ts){if(!ts)return"";const d=new Date(ts),now=new Date();
    const hms=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
    if(d.toDateString()===now.toDateString())return"Today "+hms;
    if(d.toDateString()===new Date(now-86400000).toDateString())return"Yesterday "+hms;
    return d.getDate()+" "+d.toLocaleString("en",{month:"short"})+" "+hms}
  function renChat(id){const c=chats.find(x=>x.id===id);if(!c)return;const n=prompt("Rename chat:",c.title);if(n&&n.trim()){c.title=n.trim().slice(0,40);save();renderList()}}
  const openD=()=>{renderList();markTh();updateTokenUI();$("drawer").classList.add("on");$("scrim").classList.add("on")};
  const closeD=()=>{$("drawer").classList.remove("on");$("scrim").classList.remove("on")};
  function newChat(){
    if(busy){toast("Wait for the reply");return}
    cur=null;hist=[];log.innerHTML="";log.classList.remove("on");
    $("hero").classList.remove("hide");
    closeD();t.focus();
  }
  function openChat(id){
    if(busy){toast("Wait for the reply");return}
    const c=chats.find(x=>x.id===id);if(!c)return;
    cur=c;hist=c.msgs;log.innerHTML="";
    $("hero").classList.add("hide");log.classList.add("on");
    c.msgs.forEach((m,i)=>{
      if(m.role==="user"){addU(m.show??m.content,m.att,m.imgs,m.nimg)}
      else{
        const d=addA();
        const sc=d.querySelector(".status-chip");if(sc)sc.remove();
        const tl=d.querySelector(".think-live");if(tl)tl.remove();
        setH(d.querySelector(".body"),md(m.content));
        addGround(d,m.src,m.sep);
        const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML(i!==c.msgs.length-1);d.appendChild(acts);
      }
    });
    const us=log.querySelectorAll(".u");
    if(c.msgs.length>=2&&c.msgs[c.msgs.length-1].role==="assistant"&&us.length)addEdit(us[us.length-1]);
    closeD();down(1);
  }
  function delChat(id){if(busy){toast("Wait for the reply");return}if(!confirm("Delete this chat?"))return;const c=chats.find(x=>x.id===id);chats=chats.filter(x=>x.id!==id);save();cloudDelete(id);if(c===cur){cur=null;hist=[];log.innerHTML="";log.classList.remove("on");$("hero").classList.remove("hide")}renderList()}
  function renderList(){
    const l=$("list");if(!l)return;l.innerHTML="";
    const q=(($("q")&&$("q").value)||"").trim().toLowerCase();
    let arr=chats.filter(c=>!q||c.title.toLowerCase().includes(q)||c.msgs.some(m=>(m.show||m.content||"").toLowerCase().includes(q)));
    arr=[...arr.filter(c=>c.pin),...arr.filter(c=>!c.pin)];
    if(!arr.length){l.innerHTML='<div class="empty-l">'+(q?"No chats match":"No chats yet")+'</div>';return}
    arr.forEach(c=>{const d=document.createElement("div");d.className="it"+(c===cur?" on":"");
      const meta=document.createElement("div");meta.className="meta";
      const sp=document.createElement("span");sp.textContent=c.title;
      const sm=document.createElement("small");sm.textContent=fmtDate(c.ts);
      meta.append(sp,sm);meta.onclick=()=>openChat(c.id);
      const pn=document.createElement("button");pn.type="button";pn.className="icon pin"+(c.pin?" on":"");pn.textContent=c.pin?"\u2605":"\u2606";pn.onclick=()=>{c.pin=!c.pin;save();renderList()};
      const rn=document.createElement("button");rn.type="button";rn.className="icon";rn.textContent="\u270E";rn.onclick=()=>renChat(c.id);
      const x=document.createElement("button");x.type="button";x.className="icon";x.textContent="\u2715";x.onclick=()=>delChat(c.id);
      d.append(meta,pn,rn,x);l.appendChild(d)})}
  function regen(){if(busy||hist.length<2)return;const m=hist[hist.length-2],k=log.children;k[k.length-1].remove();k[k.length-1].remove();hist.splice(-2);run(m.show??m.content,m.content,m.att||[],m.imgs||[])}

  /* ============ OVERLAYS ============ */
  const closePV=()=>{$("pv").classList.remove("on");$("pvf").srcdoc=""};
  {const pvx=$("pvx");if(pvx)pvx.onclick=closePV;}
  {const cvx=$("cvx");if(cvx)cvx.onclick=()=>$("cv").classList.remove("on");}
  {const cvc=$("cvc");if(cvc)cvc.onclick=()=>copy($("cvp").textContent,cvc);}
  {const ciSave=$("ciSave");if(ciSave)ciSave.onclick=()=>{try{localStorage.setItem(CI,$("ci").value.trim())}catch(_){}$("modal").classList.remove("on");toast("Instructions saved")};}
  {const ciCancel=$("ciCancel");if(ciCancel)ciCancel.onclick=()=>$("modal").classList.remove("on");}

  /* ============ ATTACHMENTS ============ */
  function renderAtts(){
    const a=$("atts");if(!a)return;a.innerHTML="";
    pending.forEach((f,i)=>{
      const c=document.createElement("span");c.className="att";
      if(f.img){const im=document.createElement("img");im.alt="";im.src="data:"+f.img.mime+";base64,"+f.img.data;c.appendChild(im)}
      const n=document.createElement("span");n.textContent=f.name;c.appendChild(n);
      const x=document.createElement("button");x.type="button";x.textContent="\u2715";x.onclick=()=>{pending.splice(i,1);renderAtts();updateSendState()};c.appendChild(x);
      a.appendChild(c)
    });
  }
  async function readAny(f){
    if(/\.pdf$/i.test(f.name)||f.type==="application/pdf"){
      if(!window.pdfjsLib){await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"}
      const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer(),isEvalSupported:false}).promise;let o="";
      for(let i=1;i<=Math.min(pdf.numPages,40)&&o.length<LIM;i++){const tc=await(await pdf.getPage(i)).getTextContent();o+=tc.items.map(x=>x.str).join(" ")+"\n"}
      return o}
    return await f.text();
  }
  $("file").onchange=async e=>{
    const fs=[...e.target.files];e.target.value="";
    for(const f of fs){
      if(tokensOut()&&!pro){toast("Uploads paused — try again tomorrow");break}
      if(pending.length>=3){toast("Max 3 files");break}
      if(f.size>8e6){toast(f.name+" is too big (max 8 MB)");continue}
      try{
        let x=(await readAny(f)).replace(/\r/g,"");
        if(x.includes("\u0000")){toast("Can't read "+f.name);continue}
        if(!x.trim()){toast("No text found in "+f.name+" (scanned PDF?)");continue}
        if(x.length>LIM){x=x.slice(0,LIM)+"\n[...trimmed]";toast(f.name+" trimmed to fit")}
        pending.push({name:f.name,text:x})
      }catch(_){toast("Couldn't read "+f.name)}
    }
    renderAtts();updateSendState();
    // Auto-submit notes pipeline
    if(pendingKind==="notes" && pending.length){
      setTimeout(()=>{send("");}, 100);
    }
  };
  function readImg(f){return new Promise((ok,no)=>{const url=URL.createObjectURL(f),im=new Image();
    im.onload=()=>{try{const M=1024,k=Math.min(1,M/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),c=document.createElement("canvas");c.width=w;c.height=h;
      const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);const d=c.toDataURL("image/jpeg",.8);URL.revokeObjectURL(url);ok({mime:"image/jpeg",data:d.split(",")[1]})}catch(e){no(e)}};
    im.onerror=()=>{URL.revokeObjectURL(url);no(new Error("bad image"))};im.src=url})}
  $("img").onchange=async e=>{
    const fs=[...e.target.files];e.target.value="";
    for(const f of fs){
      if(tokensOut()&&!pro){toast("Uploads paused — try again tomorrow");break}
      if(pending.length>=3){toast("Max 3 attachments");break}
      if(!/^image\//.test(f.type)){toast("That isn't an image");continue}
      try{const im=await readImg(f);if(im.data.length>1100000){toast("Image is too large");continue}pending.push({name:f.name||"image",img:im})}catch(_){toast("Couldn't read "+(f.name||"image"))}
    }
    renderAtts();updateSendState();
  };

  /* ============ THEME ============ */
  function curTheme(){return document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark")}
  function markTh(){document.querySelectorAll("[data-th]").forEach(b=>b.classList.toggle("on",b.dataset.th===curTheme()))}
  document.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{document.documentElement.setAttribute("data-theme",b.dataset.th);try{localStorage.setItem("zyro_theme",b.dataset.th)}catch(_){}markTh()});
  markTh();

  /* ============ EDIT MESSAGES ============ */
  function addEdit(u){if(!u||u.querySelector(".ed"))return;const e=document.createElement("button");e.type="button";e.className="ed";e.setAttribute("data-edit","");e.textContent="\u270E";u.insertBefore(e,u.firstChild)}
  function startEdit(u){
    if(busy){toast("Wait for the reply");return}
    const m=hist[hist.length-2];if(!m||m.role!=="user")return;
    const b=u.querySelector(":scope>div"),old=m.show??m.content;u.classList.add("editing");b.textContent="";
    const ta=document.createElement("textarea");ta.className="ei";ta.value=old;ta.rows=3;
    const bar=document.createElement("div");bar.className="eb";
    const cn=document.createElement("button");cn.type="button";cn.textContent="Cancel";cn.onclick=()=>{u.classList.remove("editing");fillBubble(b,old,m.att,m.imgs,m.nimg)};
    const sv=document.createElement("button");sv.type="button";sv.className="go2";sv.textContent="Send";sv.onclick=()=>{const v=ta.value.trim();if(v)editLast(v)};
    bar.append(cn,sv);b.append(ta,bar);ta.focus();
  }
  function editLast(v){if(busy||hist.length<2)return;const m=hist[hist.length-2],k=log.children;k[k.length-1].remove();k[k.length-1].remove();hist.splice(-2);const tail=m.content.slice((m.show||"").length);run(v,v+tail,m.att||[],m.imgs||[])}

  /* ============ CODE TOOLS ============ */
  function toggleCode(box){
    if(box.classList.contains("expanded")){box.classList.remove("expanded");box.querySelector(".more").textContent="\u2922 Expand"}
    else{box.classList.add("expanded");box.querySelector(".more").textContent="\u2923 Collapse"}
  }
  const RUN_JS="const AF=Object.getPrototypeOf(async function(){}).constructor;\nconst fmt=a=>a.map(x=>typeof x===\"string\"?x:(()=>{try{return JSON.stringify(x,null,1)}catch(_){return String(x)}})()).join(\" \");\nonmessage=async e=>{console.log=(...a)=>postMessage({t:\"o\",s:fmt(a)});console.info=console.log;console.warn=(...a)=>postMessage({t:\"e\",s:fmt(a)});console.error=console.warn;\n for(const k of [\"fetch\",\"XMLHttpRequest\",\"WebSocket\",\"EventSource\",\"importScripts\",\"indexedDB\"]){try{self[k]=undefined}catch(_){}}\n try{const r=await new AF(e.data.code)();if(r!==undefined)postMessage({t:\"o\",s:\"\\u2192 \"+fmt([r])})}catch(err){postMessage({t:\"e\",s:String(err&&err.stack||err)})}\n postMessage({t:\"d\"})}";
  const RUN_PY="let py=null;\nonmessage=async e=>{try{\n if(!py){postMessage({t:\"s\",s:\"Loading Python (one-time download, about 10 MB)...\"});\n  importScripts(\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js\");\n  py=await loadPyodide({indexURL:\"https://cdn.jsdelivr.net/pyodide/v0.29.4/full/\"})}\n py.setStdout({batched:s=>postMessage({t:\"o\",s})});py.setStderr({batched:s=>postMessage({t:\"e\",s})});\n postMessage({t:\"r\"});\n try{await py.loadPackagesFromImports(e.data.code)}catch(_){}\n const r=await py.runPythonAsync(e.data.code);if(r!==undefined&&r!==null)postMessage({t:\"o\",s:\"\\u2192 \"+String(r)})\n }catch(err){postMessage({t:\"e\",s:String(err&&err.message||err)})}\n postMessage({t:\"d\"})}";
  let pyW=null;
  const mkW=src=>new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"})));
  function runCode(box,kind,btn){
    if(box._stop){box._stop();return}
    let out=box.querySelector(".out");if(!out){out=document.createElement("div");out.className="out";box.appendChild(out)}
    out.textContent="";const code=box.querySelector("pre").textContent;
    let size=0,w,tm,done=false,hadErr=false;
    const add=(cls,s)=>{size+=s.length;const sp=document.createElement("div");sp.className=cls;sp.textContent=s;out.appendChild(sp);out.scrollTop=out.scrollHeight};
    const end=note=>{
      if(done)return;done=true;clearTimeout(tm);if(note)add("o-s",note);
      btn.textContent="Run";box._stop=null;
      if(kind==="js"&&w){try{w.terminate()}catch(_){}}
      // show fix button if there was an error
      if(hadErr){
        const fx=document.createElement("button");
        fx.type="button";
        fx.className="fix-btn";
        fx.setAttribute("data-fix","");
        fx.innerHTML="🔧 Fix with Zyro";
        if(!box.querySelector("[data-fix]")) out.appendChild(fx);
      }
    };
    const kill=note=>{try{w&&w.terminate()}catch(_){}if(kind==="py")pyW=null;end(note)};
    const arm=ms=>{clearTimeout(tm);tm=setTimeout(()=>kill("Stopped after "+Math.round(ms/1000)+" s."),ms)};
    btn.textContent="Stop";box._stop=()=>kill("Stopped.");
    if(kind==="py"){if(!pyW)pyW=mkW(RUN_PY);w=pyW}else w=mkW(RUN_JS);
    arm(kind==="py"?90000:10000);
    w.onmessage=ev=>{if(done)return;const m=ev.data||{};
      if(m.t==="s")add("o-s",m.s);
      else if(m.t==="r")arm(15000);
      else if(m.t==="o"){if(size>20000){kill("Output limit reached.");return}add("o-o",m.s)}
      else if(m.t==="e"){hadErr=true;let s=m.s;if(kind==="py"&&/importScripts|Failed to fetch|NetworkError|Failed to load/i.test(s))s="Couldn't load Python. It needs an internet connection the first time.";add("o-e",s)}
      else if(m.t==="d")end(out.childNodes.length?"":"(no output)")};
    w.onerror=()=>{hadErr=true;kill("Couldn't start the runner"+(kind==="py"?" (Python needs internet the first time).":"."))};
    w.postMessage({code});
  }

  /* ============ SEND BUTTON STATE ============ */
  function updateSendState(){
    const has=t.value.trim().length>0||pending.length>0;
    go.classList.toggle("on",has);
  }

  /* ============ WIRING ============ */
  {const b=$("burger");if(b)b.onclick=openD;}
  {const s=$("scrim");if(s)s.onclick=closeD;}
  {const c=$("closeD");if(c)c.onclick=closeD;}
  {const n1=$("newc");if(n1)n1.onclick=newChat;}
  {const n2=$("new");if(n2)n2.onclick=newChat;}
  {const q=$("q");if(q)q.oninput=()=>renderList();}

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closeD();closePV();$("cv").classList.remove("on");$("modal").classList.remove("on");closeAuth()}
  });

  t.addEventListener("input",()=>{
    t.style.height="auto";
    t.style.height=Math.min(t.scrollHeight,160)+"px";
    updateSendState();
  });
  t.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&matchMedia("(hover:hover)").matches){
      e.preventDefault();
      if(!busy)$("f").requestSubmit();
    }
  });

  updateSendState();
  updateTokenUI();

  if(new URLSearchParams(location.search).get("auth")){
    openAuth("signin");
    history.replaceState(null,"",location.pathname);
  }
}

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot);}else{boot();}
