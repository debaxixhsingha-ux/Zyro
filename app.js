/* ============ HOISTED HELPERS (must be defined before anything uses them) ============ */
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

/* ============ GLOBALS (declared early so nothing is in TDZ) ============ */
const WORKER_URL="https://zyro-ai.debaxixhsingha.workers.dev/";
const SUPABASE_URL="https://opeyjksuklfmeicmnxsh.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_LC3DrFcQAsG3HSILCekaFw_SOVVDxjA";
const TOKEN_KEY="zyro_tokens";
const FEEDBACK_KEY="zyro_feedback";
const CI="zyro_ci";
const CK="zyro_chats";
let TOTAL=100000;
let sb=null,sbP=null,user=null,pro=false;
let chats=[],cur=null;
let skip=false,ctrl=null,hist=[],busy=false,sample=null,streaming=false;
let pending=[];
let sid=0,follow=true,uAcc=0,uT=null,syncT=null;
const LIM=12000;

/* ============ BOOT ============ */
function boot(){
  const $=id=>document.getElementById(id);
  const log=$("log"),t=$("t"),go=$("go"),main=$("main");

  if(!log||!t||!go||!main){showErr("Core elements missing from app.html");return;}

  const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const escA=s=>esc(s).replace(/"/g,"&quot;");
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  /* ---------- tokens ---------- */
  const getCI=()=>{try{return localStorage.getItem(CI)||""}catch(_){return""}};
  function getTokens(){try{const d=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");const now=Date.now();
    if(!d||!d.reset||now-d.reset>86400000)return{used:0,last:0,reset:now};
    if(typeof d.used!=="number"){let s=0;for(const k in d.used)s+=+d.used[k]||0;d.used=s;try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
    return d}catch(_){return{used:0,last:0,reset:Date.now()}}}
  function saveTokens(d){try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
  function addTokens(n){const d=getTokens();d.used+=n;d.last=n;saveTokens(d);updateTokenUI();cloudUsage(n)}
  const tokensOut=()=>getTokens().used>=TOTAL;
  function paintBar(used,last){const pct=Math.min(100,(used/TOTAL)*100);
    const p=used>0&&pct<0.1?"<0.1":pct<10?pct.toFixed(1):Math.floor(pct);
    $("tPct").textContent=p+"% of 100% used";
    const f=$("fTotal");
    if(f){f.style.width=pct+"%";f.className="token-fill"+(pct>=95?" danger":pct>=80?" warn":"")}
    if(last)$("tLast").textContent="last "+last.toLocaleString()+" · "+(last<2000?"light":last<8000?"medium":"heavy")}
  function updateTokenUI(){const d=getTokens();paintBar(d.used,d.last);
    $("tNote").textContent=tokensOut()?"Tokens out — refills tomorrow."+(pro?" Pro members keep Thinking & uploads on.":" Quick chats still work; Thinking, uploads & building are paused."):"Counts your messages + replies · refills daily"+(pro?" · PRO limits active":"");
    applyLimits()}
  function applyLimits(){const out=tokensOut();
    const th=$("mode").querySelector("option[value=Thinking]");if(th)th.disabled=out&&!pro;
    const up=$("upb");if(up)up.disabled=out&&!pro;const ib=$("imb");if(ib)ib.disabled=out&&!pro;
    if(out&&!pro&&$("mode").value==="Thinking")$("mode").value="Fast"}

  /* ---------- toast ---------- */
  function toast(m){const e=$("toast");e.textContent=m;e.classList.add("on");setTimeout(()=>e.classList.remove("on"),1600)}

  /* ---------- modes + study + quick chips ---------- */
  const MODES={Fast:"Quick short answer, minimal thinking.",Auto:"Balanced speed and depth.",Thinking:"Deep analysis, long detailed answer."};
  const SOON=["Connect GitHub","Voice input"];
  const STAGES=["Thinking","Analyzing","Planning steps"];
  const STUDY={Chat:"",Solver:"STUDY MODE Solver: solve the problem step by step with clear numbered steps, show the formulas you use, put the final answer in bold, and finish with one line naming the key concept.",Socratic:"STUDY MODE Socratic tutor: do NOT give the final answer straight away. Guide the student with one short question or hint at a time, check their reasoning, and reveal the answer only if they ask for it or are stuck twice.",Exam:"STUDY MODE Exam prep: ask ONE question at a time on the topic the student names (a mix of multiple-choice and short answer), wait for their answer, mark it correct or incorrect with a brief explanation, then ask the next one. After 5 questions give the score and the weak topics."};
  const QUICK=[["Explain this code","Explain this code step by step:\n\n","Chat"],["Fix my error","Fix this error and explain what caused it:\n\n","Chat"],["Solve a problem","","Solver"],["Quiz me","Quiz me on ","Exam"],["Teach me step by step","Teach me ","Socratic"],["Notes from my PDF","Make short revision notes from the attached PDF.","Chat",1],["Viva questions","Give me 10 viva questions with short answers on ","Chat"],["Build a web page","Build a web page for ","Chat"]];

  Object.keys(MODES).forEach(m=>$("mode").add(new Option(m)));
  $("mode").value="Auto";
  [["Chat","Chat"],["Solver","Solver"],["Socratic","Socratic"],["Exam","Exam prep"]].forEach(([v,l])=>$("study").add(new Option(l,v)));
  try{const sv=localStorage.getItem("zyro_study");if(sv&&STUDY[sv]!==undefined)$("study").value=sv}catch(_){}
  $("study").onchange=()=>{try{localStorage.setItem("zyro_study",$("study").value)}catch(_){}};
  QUICK.forEach(([label,pre,st,pdf])=>{const b=document.createElement("button");b.type="button";b.textContent=label;
    b.onclick=()=>{$("study").value=st;try{localStorage.setItem("zyro_study",st)}catch(_){}t.value=pre;t.dispatchEvent(new Event("input"));t.focus();t.setSelectionRange(t.value.length,t.value.length);if(pdf)$("file").click()};$("chips").appendChild(b)});
  {const b=document.createElement("button");b.id="cib";b.type="button";b.innerHTML="<span>Instructions</span><em>"+(getCI()?"On":"Add")+"</em>";b.onclick=()=>{$("ci").value=getCI();$("modal").classList.add("on")};$("menu").appendChild(b)}
  {const b=document.createElement("button");b.id="upb";b.type="button";b.innerHTML="<span>Upload file or PDF</span><em>Code, PDF</em>";b.onclick=()=>$("file").click();$("menu").appendChild(b)}
  {const b=document.createElement("button");b.id="imb";b.type="button";b.innerHTML="<span>Add image</span><em>Photo</em>";b.onclick=()=>$("img").click();$("menu").appendChild(b)}
  SOON.forEach(s=>{const b=document.createElement("button");b.type="button";b.innerHTML="<span>"+s+"</span><em>Soon</em>";b.onclick=()=>{toast(s+" is coming soon");$("menu").classList.remove("open")};$("menu").appendChild(b)});
  $("plus").onclick=e=>{e.stopPropagation();const cb=$("cib");if(cb)cb.lastChild.textContent=getCI()?"On":"Add";$("menu").classList.toggle("open")};
  document.addEventListener("click",()=>$("menu").classList.remove("open"));

  /* ---------- Supabase ---------- */
  function sbClient(){if(!SUPABASE_URL)return Promise.resolve(null);
    if(sb)return Promise.resolve(sb);
    if(!sbP)sbP=loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(()=>{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);return sb});
    return sbP}

  const authsec=document.createElement("div");authsec.id="authsec";authsec.className="authsec";
  const drawerDh=document.querySelector("#drawer .dh");
  if(drawerDh)drawerDh.insertAdjacentElement("afterend",authsec);
  renderAuth();

  function renderAuth(){
    const d=$("authsec");
    if(!d)return;
    if(user){
      d.innerHTML='<div class="arow"><span class="ava">'+esc((user.email||"Z").toUpperCase()[0])+'</span><span class="amail">'+esc(user.email||"")+'</span>'+(pro?'<em class="pro">PRO</em>':'')+'<button class="icon" id="signout" aria-label="Sign out" title="Sign out">⎋</button></div>';
      const so=$("signout");if(so)so.onclick=async()=>{const s=await sbClient();if(s){try{await s.auth.signOut()}catch(_){}}user=null;pro=false;TOTAL=100000;renderAuth();updateTokenUI();toast("Signed out — chats stay on this device")};
      const ab=$("authBtn");if(ab)ab.title="Account";
    }else{
      d.innerHTML="";
      const ab=$("authBtn");if(ab)ab.title="Sign in";
    }}

  let authMode="signin";
  function setAuthMode(m){
    authMode=m;
    const amTitle=$("amTitle"),amSub=$("amSub"),amGo=$("amGo"),amSwitch=$("amSwitch");
    if(!amTitle)return;
    if(m==="signup"){amTitle.textContent="Create your account";amSub.textContent="Sync chats across devices. Free.";amGo.textContent="Create account";amSwitch.previousSibling.textContent="Already have an account? ";amSwitch.textContent="Sign in"}
    else{amTitle.textContent="Sign in";amSub.textContent="Sync your chats across devices.";amGo.textContent="Sign in";amSwitch.previousSibling.textContent="No account? ";amSwitch.textContent="Create one"}
    $("amMsg").textContent="";
  }
  function openAuth(m){setAuthMode(m||"signin");$("authModal").classList.add("on");setTimeout(()=>$("amEmail").focus(),60)}
  function closeAuth(){$("authModal").classList.remove("on");$("amPw").value="";$("amMsg").textContent=""}
  {const ab=$("authBtn");if(ab)ab.onclick=()=>openAuth("signin");}
  {const c=$("amCancel");if(c)c.onclick=closeAuth;}
  {const s=$("amSwitch");if(s)s.onclick=e=>{e.preventDefault();setAuthMode(authMode==="signin"?"signup":"signin")};}
  {const g=$("amGo");if(g)g.onclick=async()=>{
    const em=$("amEmail").value.trim(),pw=$("amPw").value,msg=$("amMsg"),btn=$("amGo");
    if(!em||pw.length<6){msg.style.color="#e5484d";msg.textContent="Enter an email and a password with 6+ characters.";return}
    msg.style.color="var(--dim)";msg.textContent="Working…";btn.disabled=true;
    const s=await sbClient();
    if(!s){btn.disabled=false;msg.style.color="#e5484d";msg.textContent="
