const KEYNAME="zyro_google_key";
const HFKEY="zyro_hf_key";
const TOKEN_KEY="zyro_tokens";
const FEEDBACK_KEY="zyro_feedback";
const TOTAL=100000;
const getKey=()=>{try{return localStorage.getItem(KEYNAME)||""}catch(_){return""}};
const setKey=k=>{try{k?localStorage.setItem(KEYNAME,k):localStorage.removeItem(KEYNAME)}catch(_){}};
function askKey(){const k=prompt("Paste your Google AI Studio API key. It is saved only on this device.");if(k&&k.trim()){setKey(k.trim());return true}return false}
const getHfKey=()=>{try{return localStorage.getItem(HFKEY)||""}catch(_){return""}};
const setHfKey=k=>{try{k?localStorage.setItem(HFKEY,k):localStorage.removeItem(HFKEY)}catch(_){}};
const CI="zyro_ci";
const getCI=()=>{try{return localStorage.getItem(CI)||""}catch(_){return""}};
function getTokens(){try{const d=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");const now=Date.now();
 if(!d||!d.reset||now-d.reset>86400000)return{used:0,last:0,reset:now};
 if(typeof d.used!=="number"){let s=0;for(const k in d.used)s+=+d.used[k]||0;d.used=s;try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
 return d}catch(_){return{used:0,last:0,reset:Date.now()}}}
function saveTokens(d){try{localStorage.setItem(TOKEN_KEY,JSON.stringify(d))}catch(_){}}
function addTokens(n){const d=getTokens();d.used+=n;d.last=n;saveTokens(d);updateTokenUI()}
const tokensOut=()=>getTokens().used>=TOTAL;
function paintBar(used,last){const pct=Math.min(100,(used/TOTAL)*100);
 $("tPct").textContent=(used>0&&pct<0.1?"<0.1":pct<10?+(pct.toFixed(1)):Math.floor(pct))+"% of 100% used";
 $("fTotal").style.width=pct+"%";
 if(last)$("tLast").textContent="last "+last.toLocaleString()+" · "+(last<2000?"light":last<8000?"medium":"heavy")}
function updateTokenUI(){const d=getTokens();paintBar(d.used,d.last);
 $("tNote").textContent=tokensOut()?"Tokens out — refills tomorrow. Quick chats still work; Thinking, uploads & building are paused.":"Counts your messages + replies · refills daily";
 applyLimits()}
function applyLimits(){const out=tokensOut();
 const th=$("mode").querySelector("option[value=Thinking]");if(th)th.disabled=out;
 const up=$("upb");if(up)up.disabled=out;
 if(out&&$("mode").value==="Thinking")$("mode").value="Fast"}
function getFeedback(){try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||"[]")}catch(_){return[]}}
function addFeedback(msgId,action){const fb=getFeedback();fb.push({id:msgId,action,time:Date.now()});try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(fb))}catch(_){}}
const MODES={Fast:"Quick short answer, minimal thinking.",Auto:"Balanced speed and depth.",Thinking:"Deep analysis, long detailed answer."};
const SOON=["Add image","Connect GitHub","Voice input"];
const STAGES=["Thinking","Analyzing","Planning"];
let skip=false,ctrl=null,hist=[],busy=false,sample=null,streaming=false;
const $=id=>document.getElementById(id),log=$("log"),t=$("t"),go=$("go"),main=$("main");
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
Object.keys(MODES).forEach(m=>$("mode").add(new Option(m)));
$("mode").value="Auto";
{const b=document.createElement("button");b.id="keyb";b.type="button";b.innerHTML="<span>Google key</span><em>"+(getKey()?"Saved":"Add")+"</em>";b.onclick=()=>{if(askKey()){toast("Key saved");b.lastChild.textContent="Saved"}};$("menu").appendChild(b)}
{const b=document.createElement("button");b.id="hfb";b.type="button";b.innerHTML="<span>HuggingFace key</span><em>"+(getHfKey()?"Saved":"Add")+"</em>";b.onclick=()=>{const k=prompt("Paste your Hugging Face token (hf_...). Saved only on this device.");if(k&&k.trim()){setHfKey(k.trim());toast("HF key saved");b.lastChild.textContent="Saved"}};$("menu").appendChild(b)}
{const b=document.createElement("button");b.id="cib";b.type="button";b.innerHTML="<span>Instructions</span><em>"+(getCI()?"On":"Add")+"</em>";b.onclick=()=>{$("ci").value=getCI();$("modal").classList.add("on")};$("menu").appendChild(b)}
{const b=document.createElement("button");b.id="upb";b.type="button";b.innerHTML="<span>Upload file or PDF</span><em>Code, PDF</em>";b.onclick=()=>$("file").click();$("menu").appendChild(b)}
SOON.forEach(s=>{const b=document.createElement("button");b.type="button";b.innerHTML=`<span>${s}</span><em>Soon</em>`;b.onclick=()=>{toast(s+" is coming soon");$("menu").classList.remove("open")};$("menu").appendChild(b)});
$("plus").onclick=e=>{e.stopPropagation();const cb=$("cib");if(cb)cb.lastChild.textContent=getCI()?"On":"Add";const kb=$("keyb");if(kb)kb.lastChild.textContent=getKey()?"Saved":"Add";const hb=$("hfb");if(hb)hb.lastChild.textContent=getHfKey()?"Saved":"Add";$("menu").classList.toggle("open")};
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
function typeset(root){if(!window.katex||streaming)return;root.querySelectorAll(".mx:not([data-k])").forEach(el=>{try{el.innerHTML=katex.renderToString(el.dataset.tex,{displayMode:el.dataset.d==="1",throwOnError:false});el.dataset.k=1}catch(_){}})}
function setH(el,h){el.innerHTML=h;typeset(el)}
function typesetAll(){typeset(document)}
function md(src){let h="";src.split(/```/).forEach((p,i)=>{if(i%2){const nl=p.indexOf("\n"),l=nl>-1?p.slice(0,nl).trim():"",c=nl>-1?p.slice(nl+1):p;
 h+=`<div class="cb"><div class="ch"><span>${esc(l||"code")}</span><span>${/^html?$/i.test(l)||(!l&&/<!doctype|<html/i.test(c))?'<button type="button" data-p>Preview</button>':''}<button type="button" data-c>Copy</button></span></div><pre>${hl(c.replace(/\n$/,""),l)}</pre></div>`}
 else h+=txt(p)});return h}
function liteMd(src){let h="";const parts=src.split(/```/);
 for(let i=0;i<parts.length;i++){const p=parts[i];
  if(i%2){const nl=p.indexOf("\n"),c=nl>-1?p.slice(nl+1):p;h+='<div class="cb"><pre>'+esc(c)+'</pre></div>'}
  else{p.split(/\n{2,}/).forEach(bl=>{const s=bl.trim();if(s)h+='<p>'+esc(s).replace(/\n/g,"<br>")+'</p>'})}}
 return h}
function addU(txt,names){const d=document.createElement("div");d.className="u";const b=document.createElement("div");b.textContent=txt;if(names&&names.length){const f=document.createElement("div");f.className="fl";f.textContent="\u{1F4CE} "+names.join(", ");b.appendChild(f)}d.appendChild(b);log.appendChild(d)}
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
 done(){clearInterval(iv);clearTimeout(tm);label.classList.remove("shimmer");label.style.opacity=1;label.textContent="Done";chip.classList.add("done");setTimeout(()=>chip.classList.add("fade-out"),900);setTimeout(()=>chip.remove(),1500)},
 stop(){clearInterval(iv);clearTimeout(tm);chip.remove()}}}
function copy(txt,btn){const ok=()=>{btn.textContent="Copied";setTimeout(()=>btn.textContent="Copy",1200)};
 const fb=()=>{const a=document.createElement("textarea");a.value=txt;a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();try{document.execCommand("copy");ok()}catch(_){}a.remove()};
 navigator.clipboard?navigator.clipboard.writeText(txt).then(ok).catch(fb):fb()}
log.addEventListener("click",e=>{
 const cb=e.target.closest("[data-c]");if(cb)return copy(cb.closest(".cb").querySelector("pre").textContent,cb);
 const pv=e.target.closest("[data-p]");if(pv){$("pvf").srcdoc=pv.closest(".cb").querySelector("pre").textContent;$("pv").classList.add("on");return}
 const rg=e.target.closest("[data-regen]");
 if(rg){if(rg.closest(".a")===log.lastElementChild)regen();else toast("Only the last reply can be regenerated");return}
 const lk=e.target.closest("[data-like]");if(lk){addFeedback(lk.closest(".a").dataset.msgId,"like");lk.classList.add("active");lk.parentElement.querySelector("[data-dislike]").classList.remove("active");toast("Thanks for the feedback!");return}
 const dk=e.target.closest("[data-dislike]");if(dk){addFeedback(dk.closest(".a").dataset.msgId,"dislike");dk.classList.add("active");dk.parentElement.querySelector("[data-like]").classList.remove("active");toast("Thanks for the feedback!")}});
const SYS=()=>`You are Zyro, a friendly expert AI assistant for ANY topic: coding, AI/ML, B.Tech subjects, writing, ideas, studies, plans, daily advice, fun. Mode: ${$("mode").value}. ${MODES[$("mode").value]} IMPORTANT: if the user's message is only a greeting (hi, hey, hello, yo, good morning, how are you, etc.), reply with exactly ONE short friendly sentence introducing yourself as Zyro — never list features, subjects or abilities. Put all code in fenced blocks with a language tag. Write math in LaTeX using $...$ inline and $$...$$ for display. For any web page or UI request, give one complete self-contained HTML file with inline CSS and JS in a single html code block. For product, fashion, food or storefront websites, use real photos (https://images.unsplash.com/ image URLs or https://picsum.photos/seed/name/600/800) inside clean cards with names and prices — never represent products with abstract 3D shapes or colored boxes.${getCI()?" The user's custom instructions: "+getCI().slice(0,1500):""}`;
const ARROW=go.innerHTML,STOPI='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
function setGo(on){go.innerHTML=on?STOPI:ARROW;go.setAttribute("aria-label",on?"Stop":"Send")}
const RETRY=[400,404,429,500,502,503,504,524];
async function geminiStream(messages,onText,signal,cheap,onThought){
 const mode=$("mode").value;
 const fast=cheap||mode==="Fast";
 const LIST=fast?["gemini-2.5-flash","gemini-2.0-flash"]:["gemini-2.5-flash","gemini-2.5-pro","gemini-2.0-flash"];
 let pref="";try{pref=localStorage.getItem("zyro_model")||""}catch(_){}
 let start=LIST.indexOf(pref);if(start<0)start=0;
 const sysMsg=messages.find(m=>m.role==="system"),turns=messages.filter(m=>m.role!=="system");
 let lastErr=null;
 for(let k=0;k<LIST.length;k++){
  const model=LIST[(start+k)%LIST.length];
  const is3=model.indexOf("gemini-3")===0,pro=model.indexOf("pro")>-1;
  const lvl=pro?(mode==="Thinking"&&!fast?"HIGH":"LOW"):(fast?"MINIMAL":mode==="Thinking"?"HIGH":"MEDIUM");
  const gc={maxOutputTokens:fast?1024:mode==="Thinking"?8192:4096,
   thinkingConfig:is3?{thinkingLevel:lvl}:{thinkingBudget:fast?0:mode==="Thinking"?10000:2048}};
  if(!is3)gc.temperature=fast?0.2:mode==="Thinking"?0.7:0.5;
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":streamGenerateContent?alt=sse&key="+getKey();
  const body={contents:turns.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]})),generationConfig:gc};
  if(sysMsg)body.systemInstruction={parts:[{text:sysMsg.content}]};
  let r;
  try{r=await fetch(url,{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})}
  catch(e){if(e&&e.name==="AbortError")return"";throw e}
  if(!r.ok){let msg="";try{msg=await r.text()}catch(_){}
   const info=r.status+" "+msg.slice(0,120);
   if(r.status===401||r.status===403||/API key not valid|API_KEY_INVALID/i.test(msg))throw{code:"key",info};
   if(RETRY.indexOf(r.status)>-1){lastErr={code:r.status===429?"rate":"http",info};continue}
   throw{code:"http",info}}
  if(!r.body)throw{code:"http",info:"empty response"};
  try{localStorage.setItem("zyro_model",model)}catch(_){}
  let full="",th="",used=0,aborted=false;const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
  try{for(;;){const{done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});
   const lines=buf.split("\n");buf=lines.pop();
   for(const ln of lines){if(!ln.startsWith("data:"))continue;const d=ln.slice(5).trim();
    try{const j=JSON.parse(d);
     if(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts){
      for(const p of j.candidates[0].content.parts){if(!p.text)continue;
       if(p.thought){th+=p.text;if(onThought)onThought(th)}
       else{full+=p.text;onText(full)}}}
     if(j.usageMetadata){used=j.usageMetadata.totalTokenCount||used}}catch(_){}}}}
  catch(e){if(e&&e.name==="AbortError")aborted=true;else throw e}
  if(used>0)addTokens(used);else if(aborted&&full)addTokens(Math.ceil(full.length/4));
  return full}
 throw lastErr||{code:"http",info:"No model responded"};
}
const HF_LIST=["Qwen/Qwen2.5-7B-Instruct","mistralai/Mistral-7B-Instruct-v0.3","HuggingFaceTB/SmolLM2-1.7B-Instruct","meta-llama/Llama-3.1-8B-Instruct"];
async function hfStream(messages,onText,signal,cheap){
 let pref="";try{pref=localStorage.getItem("zyro_hf_model")||""}catch(_){}
 let start=HF_LIST.indexOf(pref);if(start<0)start=0;
 let lastErr=null;
 for(let k=0;k<HF_LIST.length;k++){
  const model=HF_LIST[(start+k)%HF_LIST.length];
  const url="https://api-inference.huggingface.co/models/"+model+"/v1/chat/completions";
  const body={model,messages,stream:true,max_tokens:cheap?1024:4096,temperature:cheap?0.3:0.6};
  let r;
  try{r=await fetch(url,{method:"POST",signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+getHfKey()},body:JSON.stringify(body)})}
  catch(e){if(e&&e.name==="AbortError")return"";lastErr={code:"http",info:"network/CORS blocked"};continue}
  if(!r.ok){let msg="";try{msg=await r.text()}catch(_){}
   const info=r.status+" "+msg.slice(0,120);
   lastErr={code:r.status===401||r.status===403?"hfkey":"http",info};continue}
  if(!r.body){lastErr={code:"http",info:"empty response"};continue}
  try{localStorage.setItem("zyro_hf_model",model)}catch(_){}
  let full="",aborted=false;const rd=r.body.getReader(),dec=new TextDecoder();let buf="",raw="";
  try{for(;;){const{done,value}=await rd.read();if(done)break;const s=dec.decode(value,{stream:true});raw+=s;buf+=s;
   const lines=buf.split("\n");buf=lines.pop();
   for(const ln of lines){if(!ln.startsWith("data:"))continue;const d=ln.slice(5).trim();if(d==="[DONE]")continue;
    try{const j=JSON.parse(d);const c=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content;if(c){full+=c;onText(full)}}catch(_){}}}}
  catch(e){if(e&&e.name==="AbortError")aborted=true;else throw e}
  if(!full&&!aborted){try{const j=JSON.parse(raw);
   const c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
   const g=Array.isArray(j)?j.map(x=>x.generated_text||"").join(""):null;
   full=c||g||"";if(full)onText(full)}catch(_){}}
  if(full||aborted){if(full)addTokens(Math.ceil(full.length/4));return full}
  lastErr={code:"http",info:"no text from "+model}}
 throw lastErr||{code:"http",info:"HF: no model responded"};
}
const POLL_MODELS=["openai","mistral"];
async function pollStream(messages,onText,signal){
 let lastErr=null;
 for(const model of POLL_MODELS){
  let r;
  try{r=await fetch("https://text.pollinations.ai/openai",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({model,messages})})}
  catch(e){if(e&&e.name==="AbortError")return"";lastErr={code:"http",info:"backup unreachable"};continue}
  if(!r.ok){lastErr={code:"http",info:"backup "+r.status};continue}
  let j;try{j=await r.json()}catch(_){lastErr={code:"http",info:"backup bad json"};continue}
  const full=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||"";
  if(full){onText(full);addTokens(Math.ceil(full.length/4));return full}
  lastErr={code:"http",info:"backup empty"}}
 throw lastErr||{code:"http",info:"backup failed"};
}
function typer(body,cheap){let target="",shown=0,tm=0,fin=false,res=null,lastDraw=0;
 const fast=cheap||$("mode").value==="Fast";
 const draw=force=>{const now=performance.now();if(!force&&now-lastDraw<180)return;lastDraw=now;
  setH(body,withCaret(liteMd(target.slice(0,shown))));down()};
 function tick(){tm=0;const back=target.length-shown;
  if(back<=0){if(fin&&res)res();return}
  if(skip){shown=target.length;draw(true);if(fin&&res)res();return}
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
 const out=tokensOut();
 if(out&&files.length){toast("Tokens are out — uploads are off until tomorrow");pending=[];renderAtts();return}
 applyLimits();
 const show=text.trim()||"Review the attached file.";
 if(out&&/\b(make|build|create|design|generate|develop)\b/i.test(show)){
  $("hero").style.display="none";addU(show);
  const d=addA();d.lastChild.remove();
  setH(d.firstChild,md("I'm sorry, your tokens are out for today ⚡\n\nEverything refills tomorrow at the same time. Until then, quick chats in Fast mode still work — but building, uploads and Thinking mode are paused."));
  return}
 const full=show+files.map(f=>"\n\n--- "+f.name+" ---\n"+f.text).join("");
 pending=[];renderAtts();return run(show,full,files.map(f=>f.name))}
function actsHTML(noRegen){return '<button type="button" data-like title="Helpful">'+THUMB_UP+'</button><button type="button" data-dislike title="Not helpful">'+THUMB_DOWN+'</button>'+(noRegen?'':'<button type="button" data-regen>\u21bb Regenerate</button>')}
async function run(show,full,names){if(busy)return;busy=true;skip=false;streaming=true;ctrl=new AbortController();setGo(1);log.querySelectorAll("[data-regen]").forEach(x=>x.remove());
 $("hero").style.display="none";addU(show,names);
 const t0=Date.now();
 const cheap=full.trim().length<60||tokensOut();
 const baseUsed=getTokens().used;
 const d=addA(),body=d.firstChild,c=startChip(d.lastChild);down(1);
 let thinkEl=null;
 const onThought=th=>{if(!thinkEl){thinkEl=document.createElement("details");thinkEl.className="think";thinkEl.innerHTML='<summary>Thinking…</summary><div class="think-body"></div>';d.insertBefore(thinkEl,body)}
  thinkEl.querySelector(".think-body").textContent=th};
const tw=typer(body,cheap);try{let out;const emit=x=>{c.write();tw.set(x);paintBar(baseUsed+Math.round(x.length/4),0)};
  if(typeof claude==="undefined"){
   const msgs=[{role:"system",content:SYS()},...api(hist),{role:"user",content:full}];
   if(getKey()){
    try{out=await geminiStream(msgs,emit,ctrl.signal,cheap,onThought)}
    catch(e){if(e&&e.name==="AbortError")throw e;
     if(getHfKey()){try{toast("Gemini busy — using Hugging Face");out=await hfStream(msgs,emit,ctrl.signal,cheap)}
      catch(e2){if(e2&&e2.name==="AbortError")throw e2;toast("Using free backup model");out=await pollStream(msgs,emit,ctrl.signal)}}
     else{toast("Using free backup model");out=await pollStream(msgs,emit,ctrl.signal)}}
   }else if(getHfKey()){
    try{out=await hfStream(msgs,emit,ctrl.signal,cheap)}
    catch(e){if(e&&e.name==="AbortError")throw e;toast("Using free backup model");out=await pollStream(msgs,emit,ctrl.signal)}
   }else{out=await pollStream(msgs,emit,ctrl.signal)}
  }
  else{if(!sample)sample=await claude.use("sample").catch(()=>null);
   if(!sample)throw{code:"na"};
   const r=await sample([...api(hist),{role:"user",content:"["+SYS()+"]\n\n"+full}],{cache:false,modelTier:"default",onText:({text})=>emit(text)});out=r.text}
  out=out||(skip?"(stopped)":"(empty response)");streaming=false;await tw.finish(out);setH(body,md(out));
  const secs=((Date.now()-t0)/1000).toFixed(1);
  if(thinkEl)thinkEl.querySelector("summary").textContent="Thought for "+secs+"s";
  const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML(false);d.appendChild(acts);
  const rt=document.createElement("div");rt.className="rt";rt.textContent="responded in "+secs+"s";d.appendChild(rt);
  if(!cur){cur={id:Date.now().toString(36),title:(show||names[0]).replace(/\s+/g," ").slice(0,40),msgs:hist,ts:Date.now()};chats.unshift(cur)}
  cur.ts=Date.now();
  hist.push({role:"user",content:full,show,att:names},{role:"assistant",content:out});if(hist.length>60)hist.splice(0,hist.length-60);chats=[cur,...chats.filter(x=>x!==cur)];save();c.done()}
 catch(e){streaming=false;tw.kill();c.stop();if(e&&e.code==="key")setKey("");if(e&&e.code==="hfkey")setHfKey("");const na=e&&e.code==="na";if(!na){t.value=show;t.dispatchEvent(new Event("input"))}
  body.innerHTML=`<span class="err">${na?"AI is unavailable here. Open this page inside Claude.":e&&e.code==="nokey"?"Add a key to start. Tap + then Google key or HuggingFace key.":e&&e.code==="key"?"Google key rejected. Tap + then Google key.":e&&e.code==="hfkey"?"Hugging Face token rejected. Tap + then HuggingFace key.":e&&e.code==="rate"?"Rate limit hit on every model. Wait a minute, then retry.":"Failed: "+(e&&e.info||e&&e.message||"network problem")+". Your message is back in the box."}</span>`}
 busy=false;ctrl=null;setGo(0);syncPill();down()}
$("f").onsubmit=e=>{e.preventDefault();if(busy){skip=true;if(ctrl)ctrl.abort();return}const v=t.value;t.value="";t.style.height="auto";send(v)};
const CK="zyro_chats";let chats=[],cur=null;
try{chats=JSON.parse(localStorage.getItem(CK)||"[]")}catch(_){chats=[]}
const save=()=>{chats=chats.slice(0,40);for(;;){try{localStorage.setItem(CK,JSON.stringify(chats));return}catch(_){if(chats.length<=1)return;chats.pop()}}};
function fmtDate(ts){if(!ts)return"";const d=new Date(ts),now=new Date();
 const hms=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
 if(d.toDateString()===now.toDateString())return"Today "+hms;
 if(d.toDateString()===new Date(now-86400000).toDateString())return"Yesterday "+hms;
 return d.getDate()+" "+d.toLocaleString("en",{month:"short"})+" "+hms}
function renChat(id){const c=chats.find(x=>x.id===id);if(!c)return;const n=prompt("Rename chat:",c.title);if(n&&n.trim()){c.title=n.trim().slice(0,40);save();renderList()}}
const openD=()=>{renderList();markTh();updateTokenUI();$("drawer").classList.add("on");$("scrim").classList.add("on")};
const closeD=()=>{$("drawer").classList.remove("on");$("scrim").classList.remove("on")};
function newChat(){if(busy){toast("Wait for the reply");return}cur=null;hist=[];log.innerHTML="";$("hero").style.display="";closeD();t.focus()}
function openChat(id){if(busy){toast("Wait for the reply");return}const c=chats.find(x=>x.id===id);if(!c)return;cur=c;hist=c.msgs;log.innerHTML="";$("hero").style.display="none";
 c.msgs.forEach((m,i)=>{if(m.role==="user")addU(m.show??m.content,m.att);else{const d=addA();d.lastChild.remove();setH(d.firstChild,md(m.content));const acts=document.createElement("div");acts.className="acts";acts.innerHTML=actsHTML(i!==c.msgs.length-1);d.appendChild(acts)}});closeD();down(1)}
function delChat(id){if(busy){toast("Wait for the reply");return}if(!confirm("Delete this chat?"))return;const c=chats.find(x=>x.id===id);chats=chats.filter(x=>x.id!==id);save();if(c===cur){cur=null;hist=[];log.innerHTML="";$("hero").style.display=""}renderList()}
function renderList(){const l=$("list");l.innerHTML="";if(!chats.length){l.innerHTML='<div class="empty-l">No chats yet</div>';return}
 chats.forEach(c=>{const d=document.createElement("div");d.className="it"+(c===cur?" on":"");
  const meta=document.createElement("div");meta.className="meta";
  const sp=document.createElement("span");sp.textContent=c.title;
  const sm=document.createElement("small");sm.textContent=fmtDate(c.ts);
  meta.append(sp,sm);meta.onclick=()=>openChat(c.id);
  const rn=document.createElement("button");rn.type="button";rn.className="icon";rn.textContent="\u270E";rn.setAttribute("aria-label","Rename chat");rn.onclick=()=>renChat(c.id);
  const x=document.createElement("button");x.type="button";x.className="icon";x.textContent="\u2715";x.setAttribute("aria-label","Delete chat");x.onclick=()=>delChat(c.id);
  d.append(meta,rn,x);l.appendChild(d)})}
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
 for(const f of fs){if(tokensOut()){toast("Tokens are out — uploads paused until tomorrow");break}
  if(pending.length>=3){toast("Max 3 files");break}
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
