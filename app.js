const KEYNAME="zyro_google_key";
const TOKEN_KEY="zyro_tokens";
const FEEDBACK_KEY="zyro_feedback";
const TOTAL=1000000;
const QUOTA={Fast:0.25,Auto:0.15,Thinking:0.60};
const getKey=()=>{try{return localStorage.getItem(KEYNAME)||""}catch(_){return""}};
const setKey=k=>{try{k?localStorage.setItem(KEYNAME,k):localStorage.removeItem(KEYNAME)}catch(_){}};
function askKey(){const k=prompt("Paste your Google AI Studio API key. It is saved only on this device.");if(k&&k.trim()){setKey(k.trim());return true}return false}
const CI="zyro_ci";
const getCI=()=>{try{return localStorage.getItem(CI)||""}catch(_){return""}};
function getTokens(){try{const d=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");const now=Date.now();if(!d||!d.reset||now-d.reset>86400000)return{used:{Fast:0,Auto:0,Thinking:0},reset:now};d.used=d.used||{Fast:0,Auto:0,Thinking:0};return d}catch(_){return{used:{Fast:0,Auto:0,Thinking:0},reset:Date.now()}}}
function saveTokens(d){try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
function addTokens(n,mode){const d=getTokens();d.used[mode]=(d.used[mode]||0)+n;saveTokens(d);updateTokenUI()}
const totalUsed=d=>(d.used.Fast||0)+(d.used.Auto||0)+(d.used.Thinking||0);
function updateTokenUI(){const d=getTokens();
 const set=(m,id,fid)=>{const q=Math.floor(TOTAL*QUOTA[m]);const u=Math.min(q,d.used[m]||0);$(id).textContent=u.toLocaleString()+" / "+q.toLocaleString();$(fid).style.width=Math.min(100,(u/q)*100)+"%"};
 set("Fast","tFast","fFast");set("Auto","tAuto","fAuto");set("Thinking","tThink","fThink")}
function getFeedback(){try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||"[]")}catch(_){return[]}}
function addFeedback(msgId,action){const fb=getFeedback();fb.push({id:msgId,action,time:Date.now()});try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(fb))}catch(_){}}
const MODES={Fast:"Quick short answer, minimal thinking.",Auto:"Balanced speed and depth.",Thinking:"Deep analysis, long detailed answer."};
const SOON=["Add image","Connect GitHub","Voice input"];
const STAGES=["Thinking","Analyzing","Planning"];
let skip=false,ctrl=null,hist=[],busy=false,sample=null;
const $=id=>document.getElementById(id),log=$("log"),t=$("t"),go=$("go"),main=$("main");
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
Object.keys(MODES).forEach(m=>$("mode").add(new Option(m)));
$("mode").value="Auto";
{const b=document.createElement("button");b.id="keyb";b.type="button";b.innerHTML="<span>API key</span><em>"+(getKey()?"Saved":"Add")+"</em>";b.onclick=()=>{if(askKey()){toast("Key saved");b.lastChild.textContent="Saved"}};$("menu").appendChild(b)}
{const b=document.createElement("button");b.id="cib";b.type="button";b.innerHTML="<span>Instructions</span><em>"+(getCI()?"On":"Add")+"</em>";b.onclick=()=>{$("ci").value=getCI();$("modal").classList.add("on")};$("menu").appendChild(b)}
{const b=document.createElement("button");b.type="button";b.innerHTML="<span>Upload file or PDF</span><em>Code, PDF</em>";b.onclick=()=>$("file").click();$("menu").appendChild(b)}
SOON.forEach(s=>{const b=document.createElement("button");b.type="button";b.innerHTML=`<span>${s}</span><em>Soon</em>`;b.onclick=()=>{toast(s+" is coming soon");$("menu").classList.remove("open")};$("menu").appendChild(b)});
$("plus").onclick=e=>{e.stopPropagation();const cb=$("cib");if(cb)cb.lastChild.textContent=getCI()?"On":"Add";const kb=$("keyb");if(kb)kb.lastChild.textContent=getKey()?"Saved":"Add";$("menu").classList.toggle("open")};
document.addEventListener("click",()=>$("menu").classList.remove("open"));
function toast(m){const e=$("toast");e.textContent=m;e.classList.add("on");setTimeout(()=>e.classList.remove("on"),1600)}
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
function typeset(root){if(!window.katex)return;root.querySelectorAll(".mx:not([data-k])").forEach(el=>{try{el.innerHTML=katex.renderToString(el.dataset.tex,{displayMode:el.dataset.d==="1",throwOnError:false});el.dataset.k=1}catch(_){}})}
function setH(el,h){el.innerHTML=h;typeset(el)}
function typesetAll(){typeset(document)}
function md(src){let h="";src.split(/```/).forEach((p,i)=>{if(i%2){const nl=p.indexOf("\n"),l=nl>-1?p.slice(0,nl).trim():"",c=nl>-1?p.slice(nl+1):p;
 h+=`<div class="cb"><div class="ch"><span>${esc(l||"code")}</span><span>${/^html?$/i.test(l)||(!l&&/<!doctype|<html/i.test(c))?'<button type="button" data-p>Preview</button>':''}<button type="button" data-c>Copy</button></span></div><pre>${hl(c.replace(/\n$/,""),l)}</pre></div>`}
 else h+=txt(p)});return h}
function addU(txt,names){const d=document.createElement("div");d.className="u";const b=document.createElement("div");b.textContent=txt;if(names&&names.length){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F4CE} "+names.join(", ");b.appendChild(f)}d.appendChild(b);log.appendChild(d)}
function addA(){const msgId=Date.now().toString(36);const d=document.createElement("div");d.className="a";d.dataset.msgId=msgId;d.innerHTML='<div class="body"></div><div class="status-chip" role="status"></div>';log.appendChild(d);return d}
let follow=true;
const distB=()=>main.scrollHeight-main.scrollTop-main.clientHeight;
const syncPill=()=>$("jump").classList.toggle("on",distB()>140&&busy);
["wheel","touchmove"].forEach(ev=>main.addEventListener(ev,()=>{clearTimeout(main._st);main._st=setTimeout(()=>{follow=distB()<140;syncPill()},80)}));
main.addEventListener("scroll",()=>{if(distB()<140)follow=true;syncPill()});
$("jump").onclick=()=>{follow=true;main.scrollTop=main.scrollHeight};
function down(f){if(f||follow)requestAnimationFrame(()=>{main.scrollTop=main.scrollHeight})}
const withCaret=h=>/<\/p>$/.test(h)?h.replace(/<\/p>$/,'<span class="caret"></span></p>'):h+'<span class="caret"></span>';
let sid=0;
function startChip(chip){let i=0,tm;const n=++sid;
 chip.innerHTML=`<span class="spark"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97757"/><stop offset=".55" stop-color="#f0b48a"/><stop offset="1" stop-color="#d97757"/></linearGradient></defs><path fill="url(#sg${n})" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span><span class="shimmer status-text">Thinking</span>`;
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
 const cb=e.target.closest("[data-c]");if(cb)return copy(cb.closest(".cb").querySelector("pre").textContent,cb);
 const pv=e.target.closest("[data-p]");if(pv){$("pvf").srcdoc=pv.closest(".cb").querySelector("pre").textContent;$("pv").classList.add("on");return}
 if(e.target.closest("[data-regen]"))return regen();
 const lk=e.target.closest("[data-like]");if(lk){addFeedback(lk.closest(".a").dataset.msgId,"like");lk.classList.add("active");lk.parentElement.querySelector("[data-dislike]").classList.remove("active");toast("Thanks for the feedback!");return}
 const dk=e.target.closest("[data-dislike]");if(dk){addFeedback(dk.closest(".a").dataset.msgId,"dislike");dk.classList.add("active");dk.parentElement.querySelector("[data-like]").classList.remove("active");toast("Thanks for the feedback!")}});
const SYS=()=>`You are Zyro, a friendly expert AI assistant for ANY topic: coding, AI/ML, B.Tech subjects, writing, ideas, studies, plans, daily advice, fun. Mode: ${$("mode").value}. ${MODES[$("mode").value]} Put all code in fenced blocks with a language tag. Write math in LaTeX using $...$ inline and $$...$$ for display. For any web page or UI request, give one complete self-contained HTML file with inline CSS and JS in a single html code block. For product, fashion, food or storefront websites, use real photos (https://images.unsplash.com/ image URLs or https://picsum.photos/seed/name/600/800) inside clean cards with names and prices — never represent products with abstract 3D shapes or colored boxes.${getCI()?" The user's custom instructions: "+getCI().slice(0,1500):""}`;
const ARROW=go.innerHTML,STOPI='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
function setGo(on){go.innerHTML=on?STOPI:ARROW;go.setAttribute("aria-label",on?"Stop":"Send")}
async function geminiStream(messages,onText,signal){
 const mode=$("mode").value;
 const LIST=mode==="Fast"?["gemini-2.5-flash-lite","gemini-3-flash-preview","gemini-3-pro-preview"]:["gemini-3-flash-preview","gemini-2.5-flash-lite","gemini-3-pro-preview","gemini-2.5-flash"];
 let pref="";try{pref=localStorage.getItem("zyro_model")||""}catch(_){}
 let start=LIST.indexOf(pref);if(start<0)start=0;
 for(let k=0;k<LIST.length;k++){
  const model=LIST[(start+k)%LIST.length];
  const is3=model.indexOf("gemini-3")===0;
  const gc={maxOutputTokens:mode==="Thinking"?8192:mode==="Fast"?1024:4096,
   thinkingConfig:is3?{thinkingLevel:mode==="Thinking"?"HIGH":mode==="Fast"?"MINIMAL":"MEDIUM"}:{thinkingBudget:mode==="Thinking"?10000:mode==="Fast"?0:2048}};
  if(!is3)gc.temperature=mode==="Thinking"?0.7:mode==="Fast"?0.2:0.5;
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":streamGenerateContent?alt=sse&key="+getKey();
  const body={contents:messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]})),generationConfig:gc,safetySettings:[{category:"HARM_CATEGORY_HARASSMENT",threshold:"BLOCK_NONE"},{category:"HARM_CATEGORY_HATE_SPEECH",threshold:"BLOCK_NONE"},{category:"HARM_CATEGORY_SEXUALLY_EXPLICIT",threshold:"BLOCK_NONE"},{category:"HARM_CATEGORY_DANGEROUS_CONTENT",threshold:"BLOCK_NONE"}]};
  let r;
  try{r=await fetch(url,{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})}
  catch(e){if(e&&e.name==="AbortError")return"";throw e}
  if(r.status===404){try{await r.text()}catch(_){}continue}
  if(!r.ok||!r.body){let msg="";try{msg=(await r.text()).slice(0,120)}catch(_){}throw{code:r.status===429?"rate":r.status===401||r.status===403?"key":"http",info:r.status+" "+msg}}
  try{localStorage.setItem("zyro_model",model)}catch(_){}
  let full="",used=0;const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
  for(;;){const{done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});
   const lines=buf.split("\n");buf=lines.pop();
   for(const ln of lines){if(!ln.startsWith("data:"))continue;const d=ln.slice(5).trim();
    try{const j=JSON.parse(d);if(j.candidates&&j.candidates[0]){const c=j.candidates[0].content&&j.candidates[0].content.parts&&j.candidates[0].content.parts[0];if(c&&c.text){full+=c.text;onText(full)}}
     if(j.usageMetadata){used=j.usageMetadata.totalTokenCount||used}}catch(_){}}}
  if(used>0)addTokens(used,mode);
  return full}
 throw{code:"http",info:"404 on all models — open AI Studio and tell me which models it shows"};
}
function typer(body){let target="",shown=0,tm=0,fin=false,res=null;
 const mode=$("mode").value,fast=mode==="Fast";
 const draw=()=>{setH(body,withCaret(md(target.slice(0,shown))));down()};
 function tick(){tm=0;const back=target.length-shown;
  if(back<=0){if(fin&&res)res();return}
  if(skip){shown=target.length;draw();if(fin&&res)res();return}
  let n;
  if(fast)n=Math.max(6,Math.ceil(back/6));
  else n=back>400?Math.ceil(back/12):back>120?4:back>30?2:1;
  if(fin)n=Math.max(n,Math.ceil(back/5));
  shown=Math.min(target.length,shown+n);let ch=target[shown-1];
  if(/[\uD800-\uDBFF]/.test(ch)&&shown<target.length){shown++;ch=target[shown-1]}
  draw();
  let d=fast?6+Math.random()*10:14+Math.random()*26;
  if(!fast&&back<=30&&!fin){if(",;:".includes(ch))d+=90;else if(".!?\n".includes(ch))d+=160}
  tm=setTimeout(tick,d)}
 return{set(x){target=x;if(!tm)tm=setTimeout(tick,0)},
  finish(x){target=x;fin=true;return new Promise(r=>{res=r;if(!tm)tm=setTimeout(tick,0)})},
  kill(){clearTimeout(tm);tm=0}}}
const api=h=>h.slice(-20).map(m=>({role:m.role,content:m.content}));
function send(text){const files=pending.slice();if(busy||(!text.trim()&&!files.length))return;
 const mode=$("mode").value,d=getTokens();
 if(totalUsed(d)>=TOTAL){toast("All tokens used — refills tomorrow");return}
 if((d.used[mode]||0)>=Math.floor(TOTAL*QUOTA[mode])){toast(mode+" mode tokens used up for today — switch mode");return}
 const show=text.trim()||"Review the attached file.",full=show+files.map(f=>"\n\n--- "+f.name+" ---\n"+f.text).join("");
 pending=[];renderAtts();return run(show,full,files.map(f=>f.name))}
function actsHTML(){return '<button type="button" data-like title="Helpful">'+THUMB_UP+'</button><button type="button" data-dislike title="Not helpful">'+THUMB_DOWN+'</button><button type="button" data-regen>\u21bb Regenerate</button>'}
async function run(show,full,names){if(busy)return;busy=true;skip=false;ctrl=new AbortController();setGo(1);log.querySelectorAll(".acts").forEach(x=>x.remove());
 $("hero").style.display="none";addU(show,names);
 const d=addA(),body=d.firstChild,c=startChip(d.lastChild);down(1);
const tw=typer(body);try{let out;const emit=x=>{c.write();tw.set(x)};
  if(typeof claude==="undefined"){if(!getKey()&&!askKey())throw{code:"nokey"};out=await geminiStream([{role:"system",content:SYS()},...api(hist),{role:"user",content:full}],emit,ctrl.signal)}
  else{if(!sample)sample=await claude.use("sample").catch(()=>null);
   if(!sample)throw{code:"na"};
   const r=await sample([...api(hist),{role:"user",content:"["+SYS()+"]\n\n"+full}],{cache:false,modelTier:"default",onText:({text})=>emit(text)});out=r.text}
  out=out||"(empty response)";await tw.finish(out);setH(body,md(out));
  const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML();d.appendChild(acts);
  if(!cur){cur={id:Date.now().toString(36),title:(show||names[0]).replace(/\s+/g," ").slice(0,40),msgs:hist};chats.unshift(cur)}hist.push({role:"user",content:full,show,att:names},{role:"assistant",content:out});if(hist.length>60)hist.splice(0,hist.length-60);chats=[cur,...chats.filter(x=>x!==cur)];save();c.done()}
 catch(e){tw.kill();c.stop();if(e&&e.code==="key")setKey("");const na=e&&e.code==="na";if(!na){t.value=show;t.dispatchEvent(new Event("input"))}
  body.innerHTML=`<span class="err">${na?"AI is unavailable here. Open this page inside Claude.":e&&e.code==="nokey"?"Add your Google AI Studio key to start. Tap + then API key.":e&&e.code==="key"?"That key was rejected. Tap + then API key and paste a new one.":e&&e.code==="rate"?"Rate limit hit. Wait a minute, then retry.":"Failed: "+(e&&e.info||e&&e.message||"network problem")+". Your message is back in the box."}</span>`}
 busy=false;ctrl=null;setGo(0);$("jump").classList.remove("on");down()}
$("f").onsubmit=e=>{e.preventDefault();if(busy){skip=true;if(ctrl)ctrl.abort();return}const v=t.value;t.value="";t.style.height="auto";send(v)};
const CK="zyro_chats";let chats=[],cur=null;
try{chats=JSON.parse(localStorage.getItem(CK)||"[]")}catch(_){chats=[]}
const save=()=>{chats=chats.slice(0,40);for(;;){try{localStorage.setItem(CK,JSON.stringify(chats));return}catch(_){if(chats.length<=1)return;chats.pop()}}};
const openD=()=>{renderList();markTh();updateTokenUI();$("drawer").classList.add("on");$("scrim").classList.add("on")};
const closeD=()=>{$("drawer").classList.remove("on");$("scrim").classList.remove("on")};
function newChat(){if(busy){toast("Wait for the reply");return}cur=null;hist=[];log.innerHTML="";$("hero").style.display="";closeD();t.focus()}
function openChat(id){if(busy){toast("Wait for the reply");return}const c=chats.find(x=>x.id===id);if(!c)return;cur=c;hist=c.msgs;log.innerHTML="";$("hero").style.display="none";
 c.msgs.forEach(m=>{if(m.role==="user")addU(m.show??m.content,m.att);else{const d=addA();d.lastChild.remove();setH(d.firstChild,md(m.content));const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML();d.appendChild(acts)}});closeD();down(1)}
function delChat(id){if(busy){toast("Wait for the reply");return}if(!confirm("Delete this chat?"))return;const c=chats.find(x=>x.id===id);chats=chats.filter(x=>x.id!==id);save();if(c===cur){cur=null;hist=[];log.innerHTML="";$("hero").style.display=""}renderList()}
function renderList(){const l=$("list");l.innerHTML="";if(!chats.length){l.innerHTML='<div class="empty-l">No chats yet</div>';return}
 chats.forEach(c=>{const d=document.createElement("div");d.className="it"+(c===cur?" on":"");const sp=document.createElement("span");sp.textContent=c.title;sp.onclick=()=>openChat(c.id);
  const x=document.createElement("button");x.type="button";x.className="icon";x.textContent="\u2715";x.setAttribute("aria-label","Delete chat");x.onclick=()=>delChat(c.id);d.append(sp,x);l.appendChild(d)})}
function regen(){if(busy||hist.length<2)return;const m=hist[hist.length-2],k=log.children;k[k.length-1].remove();k[k.length-1].remove();hist.splice(-2);run(m.show??m.content,m.content,m.att||[])}
const closePV=()=>{$("pv").classList.remove("on");$("pvf").srcdoc=""};
$("pvx").onclick=closePV;
$("ciSave").onclick=()=>{try{localStorage.setItem(CI,$("ci").value.trim())}catch(_){}$("modal").classList.remove("on");toast("Instructions saved")};
$("ciCancel").onclick=()=>$("modal").classList.remove("on");
let pending=[];const LIM=12000;
function renderAtts(){const a=$("atts");a.innerHTML="";pending.forEach((f,i)=>{const c=document.createElement("span");c.className="att";c.textContent=f.name;const x=document.createElement("button");x.type="button";x.textContent="\u2715";x.setAttribute("aria-label","Remove file");x.onclick=()=>{pending.splice(i,1);renderAtts()};c.appendChild(x);a.appendChild(c)})}
const loadJS=u=>new Promise((ok,no)=>{const e=document.createElement("script");e.src=u;e.onload=ok;e.onerror=no;document.head.appendChild(e)});
async function readAny(f){
 if(/\.pdf$/i.test(f.name)||f.type==="application/pdf"){
  if(!window.pdfjsLib){await loadJS("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"}
  const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer(),isEvalSupported:false}).promise;let o="";
  for(let i=1;i<=Math.min(pdf.numPages,40)&&o.length<LIM;i++){const tc=await(await pdf.getPage(i)).getTextContent();o+=tc.items.map(x=>x.str).join(" ")+"\n"}
  return o}
 return await f.text()}
$("file").onchange=async e=>{const fs=[...e.target.files];e.target.value="";
 for(const f of fs){if(pending.length>=3){toast("Max 3 files");break}
  if(f.size>8e6){toast(f.name+" is too big (max 8 MB)");continue}
  try{let x=(await readAny(f)).replace(/\r/g,"");
   if(x.includes("\u0000")){toast("Can't read "+f.name);continue}
   if(!x.trim()){toast("No text found in "+f.name+" (scanned PDF?)");continue}
   if(x.length>LIM){x=x.slice(0,LIM)+"\n[...trimmed]";toast(f.name+" trimmed to fit")}
   pending.push({name:f.name,text:x})}catch(_){toast("Couldn't read "+f.name)}}
 renderAtts()};
function curTheme(){return document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark")}
function markTh(){document.querySelectorAll("[data-th]").forEach(b=>b.classList.toggle("on",b.dataset.th===curTheme()))}
document.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{document.documentElement.setAttribute("data-theme",b.dataset.th);try{localStorage.setItem("zyro_theme",b.dataset.th)}catch(_){}markTh()});
markTh();updateTokenUI();
$("burger").onclick=openD;$("scrim").onclick=closeD;$("closeD").onclick=closeD;$("newc").onclick=newChat;$("new").onclick=newChat;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeD();closePV();$("modal").classList.remove("on")}});
t.addEventListener("input",()=>{t.style.height="auto";t.style.height=Math.min(t.scrollHeight,170)+"px"});
t.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&matchMedia("(hover:hover)").matches){e.preventDefault();if(!busy)$("f").requestSubmit()}});
