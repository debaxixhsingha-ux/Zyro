const WORKER_URL="https://zyro-ai.debaxixhsingha.workers.dev/";
const SUPABASE_URL="https://opeyjksuklfmeicmnxsh.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_LC3DrFcQAsG3HSILCekaFw_SOVVDxjA";
const TOKEN_KEY="zyro_tokens";
const FEEDBACK_KEY="zyro_feedback";
let TOTAL=100000;
let sb=null,sbP=null,user=null,pro=false;
const CI="zyro_ci";
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
function getFeedback(){try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||"[]")}catch(_){return[]}}
function addFeedback(msgId,action){const fb=getFeedback();fb.push({id:msgId,action,time:Date.now()});try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(fb))}catch(_){}}
const MODES={Fast:"Quick short answer, minimal thinking.",Auto:"Balanced speed and depth.",Thinking:"Deep analysis, long detailed answer."};
const SOON=["Connect GitHub","Voice input"];
const STAGES=["Thinking","Analyzing","Planning steps"];
const STUDY={Chat:"",Solver:"STUDY MODE Solver: solve the problem step by step with clear numbered steps, show the formulas you use, put the final answer in bold, and finish with one line naming the key concept.",Socratic:"STUDY MODE Socratic tutor: do NOT give the final answer straight away. Guide the student with one short question or hint at a time, check their reasoning, and reveal the answer only if they ask for it or are stuck twice.",Exam:"STUDY MODE Exam prep: ask ONE question at a time on the topic the student names (a mix of multiple-choice and short answer), wait for their answer, mark it correct or incorrect with a brief explanation, then ask the next one. After 5 questions give the score and the weak topics."};
const QUICK=[["Explain this code","Explain this code step by step:\n\n","Chat"],["Fix my error","Fix this error and explain what caused it:\n\n","Chat"],["Solve a problem","","Solver"],["Quiz me","Quiz me on ","Exam"],["Teach me step by step","Teach me ","Socratic"],["Notes from my PDF","Make short revision notes from the attached PDF.","Chat",1],["Viva questions","Give me 10 viva questions with short answers on ","Chat"],["Build a web page","Build a web page for ","Chat"]];
let skip=false,ctrl=null,hist=[],busy=false,sample=null,streaming=false;
const $=id=>document.getElementById(id),log=$("log"),t=$("t"),go=$("go"),main=$("main");
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
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
SOON.forEach(s=>{const b=document.createElement("button");b.type="button";b.innerHTML=`<span>${s}</span><em>Soon</em>`;b.onclick=()=>{toast(s+" is coming soon");$("menu").classList.remove("open")};$("menu").appendChild(b)});
$("plus").onclick=e=>{e.stopPropagation();const cb=$("cib");if(cb)cb.lastChild.textContent=getCI()?"On":"Add";$("menu").classList.toggle("open")};
document.addEventListener("click",()=>$("menu").classList.remove("open"));
function toast(m){const e=$("toast");e.textContent=m;e.classList.add("on");setTimeout(()=>e.classList.remove("on"),1600)}

/* ---------- Supabase auth ---------- */
function sbClient(){if(!SUPABASE_URL)return Promise.resolve(null);
 if(sb)return Promise.resolve(sb);
 if(!sbP)sbP=loadJS("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(()=>{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);return sb});
 return sbP}

const authsec=document.createElement("div");authsec.id="authsec";authsec.className="authsec";
$("drawer").querySelector(".dh").insertAdjacentElement("afterend",authsec);
renderAuth();

function renderAuth(){const d=$("authsec");
 if(user){
  d.innerHTML='<div class="arow"><span class="ava">'+esc((user.email||"Z").toUpperCase()[0])+'</span><span class="amail">'+esc(user.email||"")+'</span>'+(pro?'<em class="pro">PRO</em>':'')+'<button class="icon" id="signout" aria-label="Sign out" title="Sign out">⎋</button></div>';
  $("signout").onclick=async()=>{const s=await sbClient();if(s){await s.auth.signOut()}
   user=null;pro=false;TOTAL=100000;renderAuth();updateTokenUI();toast("Signed out — chats stay on this device")};
  const ab=$("authBtn");if(ab)ab.title="Account";
 }else{
  d.innerHTML="";
  const ab=$("authBtn");if(ab)ab.title="Sign in";
 }}

let authMode="signin";
function setAuthMode(m){
 authMode=m;
 const amTitle=$("amTitle"),amSub=$("amSub"),amGo=$("amGo"),amSwitch=$("amSwitch");
 if(m==="signup"){amTitle.textContent="Create your account";amSub.textContent="Sync chats across devices. Free.";amGo.textContent="Create account";amSwitch.previousSibling.textContent="Already have an account? ";amSwitch.textContent="Sign in"}
 else{amTitle.textContent="Sign in";amSub.textContent="Sync your chats across devices.";amGo.textContent="Sign in";amSwitch.previousSibling.textContent="No account? ";amSwitch.textContent="Create one"}
 $("amMsg").textContent="";
}
function openAuth(m){setAuthMode(m||"signin");$("authModal").classList.add("on");setTimeout(()=>$("amEmail").focus(),60)}
function closeAuth(){$("authModal").classList.remove("on");$("amPw").value="";$("amMsg").textContent=""}
$("authBtn").onclick=()=>openAuth("signin");
$("amCancel").onclick=closeAuth;
$("amSwitch").onclick=e=>{e.preventDefault();setAuthMode(authMode==="signin"?"signup":"signin")};
$("amGo").onclick=async()=>{
 const em=$("amEmail").value.trim(),pw=$("amPw").value,msg=$("amMsg"),btn=$("amGo");
 if(!em||pw.length<6){msg.style.color="#e5484d";msg.textContent="Enter an email and a password with 6+ characters.";return}
 msg.style.color="var(--dim)";msg.textContent="Working…";btn.disabled=true;
 const s=await sbClient();
 if(!s){btn.disabled=false;msg.style.color="#e5484d";msg.textContent="Supabase isn't configured.";return}
 const r=authMode==="signup"?await s.auth.signUp({email:em,password:pw,options:{emailRedirectTo:location.origin+location.pathname}}):await s.auth.signInWithPassword({email:em,password:pw});
 btn.disabled=false;
 if(r.error){msg.style.color="#e5484d";msg.textContent=r.error.message;return}
 if(authMode==="signup"&&r.data&&!r.data.session){
  msg.style.color="#3ecf8e";msg.textContent="✅ Check your email to confirm, then sign in.";
  return;
 }
 closeAuth();
 toast(authMode==="signup"?"Account created 🎉":"Signed in");
};

async function loadProfile(){try{const s=await sbClient();const {data}=await s.from("profiles").select("pro").eq("id",user.id).maybeSingle();
 pro=!!(data&&data.pro);TOTAL=pro?1000000:100000;updateTokenUI()}catch(_){}}
async function syncUsageFromCloud(){if(!user)return;try{const s=await sbClient();if(!s)return;
 const day=new Date().toISOString().slice(0,10);
 const {data}=await s.from("usage").select("total").eq("user_id",user.id).eq("day",day).maybeSingle();
 if(data&&typeof data.total==="number"){const d=getTokens();if(data.total>d.used){d.used=data.total;saveTokens(d);updateTokenUI()}}
}catch(_){}}
let syncT=null;
function cloudSave(){if(!user||!cur)return;clearTimeout(syncT);syncT=setTimeout(async()=>{try{const s=await sbClient();if(!s)return;
 const msgs=JSON.parse(JSON.stringify(cur.msgs));msgs.forEach(m=>{delete m.imgs});
 await s.from("chats").upsert({id:cur.id,user_id:user.id,title:cur.title,pin:!!cur.pin,ts:cur.ts,msgs:msgs.slice(-40)},{onConflict:"id"})}catch(_){}},1200)}
function cloudDelete(id){if(!user)return;sbClient().then(s=>{if(s)s.from("chats").delete().eq("id",id).then(()=>{}).catch(()=>{})})}
async function pullCloud(){try{const s=await sbClient();if(!s)return;const {data}=await s.from("chats").select("*").order("ts",{ascending:false}).limit(100);
 if(!data)return;let changed=false;
 for(const r of data){const ex=chats.find(c=>c.id===r.id);
  if(!ex){chats.push({id:r.id,title:r.title,pin:r.pin,ts:r.ts,msgs:r.msgs});changed=true}
  else if((r.ts||0)>(ex.ts||0)){ex.title=r.title;ex.pin=r.pin;ex.ts=r.ts;ex.msgs=r.msgs;changed=true}}
 if(changed){save();renderList();toast("Chats synced from cloud")}}catch(_){}}
let uAcc=0,uT=null;
function cloudUsage(n){if(!user)return;uAcc+=n;clearTimeout(uT);uT=setTimeout(async()=>{try{const s=await sbClient();if(!s||!uAcc)return;const a=uAcc;uAcc=0;await s.rpc("add_usage",{amt:a})}catch(_){}},15000)}
async function afterSignIn(){renderAuth();await loadProfile();await pullCloud();await syncUsageFromCloud();renderAuth()}
(async()=>{let s;try{s=await sbClient()}catch(_){}if(!s){renderAuth();return}
 try{const {data}=await s.auth.getSession();user=(data&&data.session&&data.session.user)||null}catch(_){}
 s.auth.onAuthStateChange((_e,ses)=>{user=(ses&&ses.user)||null;if(!user){pro=false;TOTAL=100000;renderAuth();updateTokenUI()}else afterSignIn()});
 if(user)await afterSignIn();else renderAuth()})();
/* ---------- end auth ---------- */

const THUMB_UP='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
const THUMB_DOWN='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';
const escA=s=>esc(s).replace(/"/g,"&quot;");
const MR=/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
const inl=x=>{const st=[],tk=h=>"\u0001"+(st.push(h)-1)+"\u0002";
 x=x.replace(/`([^`]+)`/g,(_,c)=>tk('<code class="i">'+esc(c)+'</code>'));
 x=x.replace(MR,(m,a,b,c,d)=>{if(d!==undefined&&!/[\\^_=+\-*\/<>{}()]|^[A-Za-z]$|\d/.test(d))return m;return tk('<span class="mx" data-d="'+(a!==undefined||b!==undefined?1:0)+'" data-tex="'+escA(a??b??c??d)+'">'+esc(m)+'</span>')});
 return esc(x).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\u0001(\d+)\u0002/g,(_,i)=>st[i])};
function txt(p){let h="",l=null,pa=[];const fp=()=>{if(pa.length){h+="<p>"+inl(pa.join("\n"))+"</p>";pa=[]}},fl=()=>{if(l){h+="</"+l+">";l=null}};
for(const ln of p.split("\n")){let m;
if(m=ln.match(/^\s{0,3}(#{1,6})\s+(.*)/)){fp();fl();const n=Math.min(m[1].length+1,4);h+=`<h${n}>${inl(m[2])}</h${n}>`}
else if(/^\s*([-*_])\1{2,}\s*$/.test(ln)){fp();fl();h+="<hr>"}
else if(m=ln.match(/^\s*[-*]\s+(.*)/)){fp();if(l!=="ul"){fl();h+="<ul>";l="ul"}h+="<li>"+inl(m[1])+"</li>"}
else if(m=ln.match(/^\s*\d+[.)]\s+(.*)/)){fp();if(l!=="ol"){fl();h+="<ol>";l="ol"}h+="<li>"+inl(m[1])+"</li>"}
else if(!ln.trim()){fp();fl()}
else{fl();pa.push(ln)}}
fp();fl();return h}
const KW=new Set("abstract and as assert async await break case catch class const continue def default del do elif else enum except export extends final finally for from fn func function if implements import in interface is lambda let loop match mod mut namespace new not null None nil of or package pass private protected pub public raise return self static struct super switch this throw throws trait true True false False try type typeof union unsafe use using var void while with yield select insert update delete create table where join group order by limit values SELECT INSERT UPDATE DELETE CREATE TABLE WHERE JOIN GROUP ORDER BY LIMIT VALUES FROM AS AND OR NOT NULL INTO SET".split(" "));
const HASH=/^(py|python|bash|sh|shell|zsh|ruby|rb|yaml|yml|toml|r|perl|dockerfile|makefile|ini|conf|powershell|ps1)$/i;
const CM={h:/#[^\n]*/,q:/--[^\n]*|\/\*[\s\S]*?\*\//,s:/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/};
const REST=/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-f]+\b|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[A-Za-z_]\w*\b)/;
const RX={};
function hl(c,l){if(c.length>20000)return esc(c);const k=HASH.test(l)?"h":/^sql$/i.test(l)?"q":"s",re=RX[k]||(RX[k]=new RegExp("("+CM[k].source+")|"+REST.source,"gi"));
 re.lastIndex=0;let o="",last=0,m;
 while((m=re.exec(c))){if(m[0]==="")break;o+=esc(c.slice(last,m.index));last=re.lastIndex;const t=m[0],q=m[1]?"c":m[2]?"s":m[3]?"n":KW.has(t)?"k":/^[A-Z][a-z]/.test(t)?"t":"";
  o+=q?'<span class="h'+q+'">'+esc(t)+"</span>":esc(t)}
 return o+esc(c.slice(last))}
function typeset(root){if(!window.katex||streaming)return;root.querySelectorAll(".mx:not([data-k])").forEach(el=>{try{el.innerHTML=katex.renderToString(el.dataset.tex,{displayMode:el.dataset.d==="1",throwOnError:false});el.dataset.k=1}catch(_){}})}
function setH(el,h){el.innerHTML=h;typeset(el)}
function typesetAll(){typeset(document)}
function md(src){let h="";src.split(/```/).forEach((p,i)=>{if(i%2){const nl=p.indexOf("\n"),l=nl>-1?p.slice(0,nl).trim():"",c=nl>-1?p.slice(nl+1):p;
 const code=c.replace(/\n$/,""),isH=/^html?$/i.test(l)||(!l&&/<!doctype|<html/i.test(c)),rn=/^(js|javascript|node|mjs)$/i.test(l)?"js":/^(py|python|python3)$/i.test(l)?"py":"";
 h+=`<div class="cb col" data-lang="${escA(l)}"><div class="ch"><span>${esc(l||"code")}</span><span>${rn?'<button type="button" data-run="'+rn+'">Run</button>':''}${isH?'<button type="button" data-p>Preview</button>':''}<button type="button" data-c>Copy</button><button type="button" class="more" data-v>\u2922 Expand</button></span></div><pre>${hl(code,l)}</pre></div>`}
 else h+=txt(p)});return h}
function liteMd(src){let h="";const parts=src.split(/```/);
 for(let i=0;i<parts.length;i++){const p=parts[i];
  if(i%2){const nl=p.indexOf("\n"),c=nl>-1?p.slice(nl+1):p;h+='<div class="cb live col"><pre>'+esc(c)+'</pre></div>'}
  else{p.split(/\n{2,}/).forEach(bl=>{const s=bl.trim();if(s)h+='<p>'+esc(s).replace(/\n/g,"<br>")+'</p>'})}}
 return h}
function fillBubble(b,txt,names,imgs,nimg){b.textContent=txt;
 if(imgs&&imgs.length){const w=document.createElement("div");w.className="th";imgs.forEach(im=>{const i=document.createElement("img");i.alt="attached image";i.src="data:"+im.mime+";base64,"+im.data;w.appendChild(i)});b.appendChild(w)}
 else if(nimg){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F5BC} "+nimg+" image"+(nimg>1?"s":"")+" (not saved)";b.appendChild(f)}
 if(names&&names.length){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F4CE} "+names.join(", ");b.appendChild(f)}}
function addU(txt,names,imgs,nimg){const d=document.createElement("div");d.className="u";const b=document.createElement("div");fillBubble(b,txt,names,imgs,nimg);d.appendChild(b);log.appendChild(d);return d}
function addA(){const msgId=Date.now().toString(36);const d=document.createElement("div");d.className="a";d.dataset.msgId=msgId;d.innerHTML='<div class="body"></div><div class="status-chip" role="status"></div>';log.appendChild(d);return d}
let follow=true;
const distB=()=>main.scrollHeight-main.scrollTop-main.clientHeight;
const syncPill=()=>$("jump").classList.toggle("on",distB()>140);
["wheel","touchmove"].forEach(ev=>main.addEventListener(ev,()=>{clearTimeout(main._st);main._st=setTimeout(()=>{follow=distB()<140;syncPill()},80)}));
main.addEventListener("scroll",()=>{if(distB()<140)follow=true;syncPill()});
$("jump").onclick=()=>{follow=true;main.scrollTo({top:main.scrollHeight,behavior:"smooth"})};
function down(f){if(f||follow)requestAnimationFrame(()=>{main.scrollTop=main.scrollHeight})}
function withCaret(h){
 if(/<\/p>$/.test(h))return h.replace(/<\/p>$/,'<span class="caret"></span></p>');
 if(/<\/pre><\/div>$/.test(h))return h.replace(/<\/pre><\/div>$/,'<span class="caret"></span></pre></div>');
 return h+'<span class="caret"></span>'}
let sid=0;
function startChip(chip){let i=0,tm;const n=++sid;
 chip.innerHTML=`<span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97757"/><stop offset=".55" stop-color="#f0b48a"/><stop offset="1" stop-color="#d97757"/></linearGradient></defs><path fill="url(#sg${n})" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span>`;
 const label=chip.querySelector(".status-text");
 const setL=x=>{label.style.opacity=0;clearTimeout(tm);tm=setTimeout(()=>{label.textContent=x;label.style.opacity=1},170)};
 const iv=setInterval(()=>{i=(i+1)%STAGES.length;setL(STAGES[i])},1400);
 return{write(){if(chip.dataset.w)return;chip.dataset.w=1;clearInterval(iv);setL("Writing")},
  done(){clearInterval(iv);clearTimeout(tm);label.classList.remove("shimmer");label.style.opacity=1;label.innerHTML='<span class="check">✓</span> Done';chip.classList.add("done");setTimeout(()=>chip.classList.add("fade-out"),900);setTimeout(()=>chip.remove(),1500)},
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
 const rg=e.target.closest("[data-regen]");
 if(rg){if(rg.closest(".a")===log.lastElementChild)regen();else toast("Only the last reply can be regenerated");return}
 const lk=e.target.closest("[data-like]");if(lk){addFeedback(lk.closest(".a").dataset.msgId,"like");lk.classList.add("active");lk.parentElement.querySelector("[data-dislike]").classList.remove("active");toast("Thanks for the feedback!");return}
 const dk=e.target.closest("[data-dislike]");if(dk){addFeedback(dk.closest(".a").dataset.msgId,"dislike");dk.classList.add("active");dk.parentElement.querySelector("[data-like]").classList.remove("active");toast("Thanks for the feedback!")}});
const todayStr=()=>new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const needsSearch=s=>/\b(latest|newest|recent(ly)?|today|tonight|yesterday|tomorrow|this (week|month|year)|news|released?|launch(ed|es)?|new version|prices?|score|weather|who (is|won)|what'?s new|trending|202[4-9]|203\d)\b/i.test(s)||(/\b(claude|chatgpt|gpt-?\d+|openai|anthropic|gemini|grok|deepseek|llama|qwen|mistral|nvidia|iphone|pixel|galaxy|react|next\.?js|python)\b/i.test(s)&&/\b(models?|versions?|releases?|new|newest|latest|vs|versus|compare|comparison|pricing|price|available|exists?|sonnet|opus|haiku|\d+(\.\d+)?)\b/i.test(s));
function appFacts(){const d=getTokens(),pct=Math.min(100,Math.round(d.used/TOTAL*100)),out=tokensOut();
 return "Today's date is "+todayStr()+". Your built-in knowledge ends before today, so you may not know newer products, model versions or events: never insist that old information is current, and never say something new doesn't exist just because you don't recognise it. If search results are provided, rely on them; if not and the topic is recent, say you may be out of date. Never claim to be another company's assistant; if asked which model powers you, say you are Zyro and don't know the exact model. About this app (answer how-it-works questions only from these facts, and say you are not sure about anything else): users attach up to 3 files or images per message with the + button (PDF, code or text files up to 8 MB, each trimmed to 12,000 characters; images are JPG, PNG or WebP and are shrunk before sending). A selector next to the mode picker switches study modes: Chat, Solver, Socratic and Exam prep. Python and JavaScript code blocks have a Run button, and code blocks are collapsible with an Expand button. The last message can be edited with the pencil icon, and chats can be searched and pinned in the sidebar. Users can optionally sign in with email to sync chats across devices; anonymous chats stay only on the device. There is a daily token meter (free: 100,000 tokens; Pro: 1,000,000) — used so far today: "+d.used.toLocaleString()+", "+pct+"%. When a free user's meter is full, file uploads, Thinking mode and building web pages are paused until it refills the next day, while short chats in Fast mode still work. Right now uploads are "+(out&&!pro?"PAUSED because the meter is full":"ON")+". If the server is very busy a reply can fail with a 'busy' message and work again after a minute. If the user asks why they can't send a file or message, explain using these facts and do not guess other reasons."+(out&&!pro?" IMPORTANT: The free token meter is FULL right now. You MUST keep every reply to 1-2 short sentences maximum. Do NOT write code. Do NOT write long explanations or essays. Do NOT build web pages. Just answer the question as briefly as possible and remind them their tokens refill tomorrow.":"")}
const SYS=()=>`You are Zyro, a friendly expert AI assistant for ANY topic: coding, AI/ML, B.Tech subjects, writing, ideas, studies, plans, daily advice, fun. Mode: ${$("mode").value}. ${MODES[$("mode").value]} ${appFacts()} ${STUDY[$("study").value]||""} IMPORTANT: if the user's message is only a greeting (hi, hey, hello, yo, good morning, how are you, etc.), reply with exactly ONE short friendly sentence introducing yourself as Zyro — never list features, subjects or abilities. Put all code in fenced blocks with a language tag. Write math in LaTeX using $...$ inline and $$...$$ for display.

WEB / UI / APP BUILDING RULES (follow these strictly whenever the user asks you to build, create, make, design, or generate a website, web page, landing page, app UI, dashboard, portfolio, store, blog, form, or any HTML/CSS/JS output):
1. Output ONE complete, self-contained HTML file inside a single \`\`\`html code block. Nothing outside the block except a 1-line intro.
2. Put ALL CSS inside <style> tags and ALL JS inside <script> tags. No external files, no build tools.
3. Include REALISTIC content — real-looking names, headings, prices, hours, paragraphs, product names. NEVER use "Lorem ipsum", "your text here", "placeholder", "TODO", or lorem-style filler. Write actual text a real business would have.
4. For photos, use https://picsum.photos/seed/UNIQUEWORD/600/800 — every image a DIFFERENT unique word (bakery1, cake2, chef3, etc.). Never repeat the same seed. Never invent other image URLs. Never use abstract 3D shapes or colored boxes in place of product images.
5. Make it visually polished: modern typography, generous spacing, sensible color palette, hover states, clean layout. It should look like a real site, not a mockup.
6. Make it responsive — must look good on mobile AND desktop. Use flexbox/grid, media queries.
7. MINIMUM 150 lines of HTML. Real landing pages should be 250-400+ lines. Do not stop early. Do not abbreviate.
8. Structure: header/nav, hero, main content sections (features/menu/about/gallery), footer with contact info.
9. NEVER write "...", "rest of code here", "// TODO", or "continue like this". Always write the FULL file.
10. When the user says "build a bakery landing page", produce a REAL bakery page with a hero, menu items with prices and photos, about section, hours, location, and a contact form. When they say "portfolio", produce a REAL portfolio with a bio, project cards, skills, and contact. Be specific and complete.

Never invent other image URLs, and never represent products with abstract 3D shapes or colored boxes.${getCI()?" The user's custom instructions: "+getCI().slice(0,1500):""}`;
function addGround(d,src,sep){const ok=(src||[]).filter(x=>x&&/^https?:\/\//i.test(x.uri));if(!ok.length&&!sep)return;
 const w=document.createElement("div");w.className="ground";
 if(ok.length){const s=document.createElement("div");s.className="srcs";const l=document.createElement("span");l.textContent="Sources";s.appendChild(l);
  ok.slice(0,6).forEach(x=>{const a=document.createElement("a");a.href=x.uri;a.target="_blank";a.rel="noopener noreferrer";a.textContent=(x.title||x.uri).slice(0,40);s.appendChild(a)});w.appendChild(s)}
 if(sep){const f=document.createElement("iframe");f.className="sep";f.setAttribute("sandbox","allow-popups allow-popups-to-escape-sandbox");f.title="Google Search suggestions";f.srcdoc=sep;w.appendChild(f)}
 d.appendChild(w)}
const ARROW=go.innerHTML,STOPI='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
function setGo(on){go.innerHTML=on?STOPI:ARROW;go.setAttribute("aria-label",on?"Stop":"Send")}
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
  for(const ln of lines){if(!ln.startsWith("data:"))continue;const d=ln.slice(5).trim();
   try{const j=JSON.parse(d),cd=j.candidates&&j.candidates[0];
    if(cd&&cd.content&&cd.content.parts){
     for(const p of cd.content.parts){if(!p.text)continue;
      if(p.thought){th+=p.text;if(onThought)onThought(th)}
      else{full+=p.text;onText(full)}}}
    if(cd&&cd.groundingMetadata&&meta){const g=cd.groundingMetadata;
     (g.groundingChunks||[]).forEach(c=>{const w=c&&c.web;if(w&&w.uri&&!meta.src.some(x=>x.uri===w.uri))meta.src.push({uri:w.uri,title:w.title||""})});
     if(g.searchEntryPoint&&g.searchEntryPoint.renderedContent)meta.sep=g.searchEntryPoint.renderedContent}
    if(j.usageMetadata){used=j.usageMetadata.totalTokenCount||used}}catch(_){}}}}
 catch(e){if(e&&e.name==="AbortError")aborted=true;else throw e}
 if(used>0)addTokens(used);else if(full)addTokens(Math.ceil(full.length/4));
 if(!full&&!aborted)throw{code:"empty"};
 return full}
function typer(body,cheap){let target="",shown=0,tm=0,fin=false,res=null,lastDraw=0;
 const fast=cheap||$("mode").value==="Fast";
 const draw=force=>{const now=performance.now();if(!force&&now-lastDraw<180)return;lastDraw=now;
  setH(body,withCaret(liteMd(target.slice(0,shown))));body.querySelectorAll(".cb.live pre").forEach(p=>{p.scrollTop=p.scrollHeight});down()};
 function tick(){tm=0;const back=target.length-shown;
  if(back<=0){if(fin&&res)res();return}
  if(skip){shown=target.length;draw(true);if(fin&&res)res();return}
  let n;
  if(fast)n=Math.min(40,Math.max(4,Math.ceil(back/8)));
  else n=back>400?Math.min(30,Math.ceil(back/16)):back>120?4:back>30?2:1;
  if(fin)n=Math.max(n,Math.ceil(back/6));
  shown=Math.min(target.length,shown+n);let ch=target[shown-1];
  if(/[\uD800-\uDBFF]/.test(ch)&&shown<target.length){shown++;ch=target[shown-1]}
  draw();
  let d=fast?8+Math.random()*12:14+Math.random()*26;
  if(!fast&&back<=30&&!fin){if(",;:".includes(ch))d+=90;else if(".!?\n".includes(ch))d+=160}
  tm=setTimeout(tick,d)}
 return{set(x){target=x;if(!tm)tm=setTimeout(tick,0)},
  finish(x){target=x;fin=true;return new Promise(r=>{res=r;if(!tm)tm=setTimeout(tick,0)})},
  kill(){clearTimeout(tm);tm=0}}}
const api=(h,keep)=>{const out=[];let n=0;for(let i=h.length-1;i>=0&&out.length<20;i--){const c=h[i].content||"";if(out.length&&n+c.length>30000)break;n+=c.length;out.unshift({role:h[i].role,content:c,imgs:h[i].imgs})}
 while(out.length&&out[0].role!=="user")out.shift();
 let seen=keep===false;for(let i=out.length-1;i>=0;i--){if(!seen&&out[i].imgs&&out[i].imgs.length)seen=true;else delete out[i].imgs}
 return out.map(m=>m.imgs?{role:m.role,content:m.content,images:m.imgs}:{role:m.role,content:m.content})};
function send(text){const items=pending.slice();if(busy||(!text.trim()&&!items.length))return;
 const files=items.filter(f=>!f.img),imgs=items.filter(f=>f.img).map(f=>f.img);
 const out=tokensOut();
 if(out&&!pro&&items.length){toast("Tokens are out — uploads are off until tomorrow");pending=[];renderAtts();t.value=text;t.dispatchEvent(new Event("input"));return}
 applyLimits();
 const show=text.trim()||(imgs.length&&!files.length?"Describe this image.":imgs.length?"Review the attached files.":"Review the attached file.");
 if(out&&!pro&&/\b(make|build|create|design|generate|develop)\b/i.test(show)){
  $("hero").style.display="none";addU(show);
  const d=addA();d.lastChild.remove();
  setH(d.firstChild,md("I'm sorry, your tokens are out for today ⚡\n\nEverything refills tomorrow at the same time. Until then, quick chats in Fast mode still work — but building, uploads and Thinking mode are paused."));
  return}
 const full=show+files.map(f=>"\n\n--- "+f.name+" ---\n"+f.text).join("");
 pending=[];renderAtts();return run(show,full,files.map(f=>f.name),imgs)}
function actsHTML(noRegen){return '<button type="button" data-like title="Helpful">'+THUMB_UP+'</button><button type="button" data-dislike title="Not helpful">'+THUMB_DOWN+'</button>'+(noRegen?'':'<button type="button" data-regen>\u21bb Regenerate</button>')}
const ERR={
 nowork:"The
