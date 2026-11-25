const VERSION = "2.0";
const ITEMS = DATA.items;
const DRAFTMAP = Object.fromEntries(DRAFT.items.map(d=>[d.id,d]));
const REQ = {R1:"Human agency and oversight",R2:"Technical robustness and safety",R3:"Privacy and data governance",R4:"Transparency",R5:"Diversity, non-discrimination and fairness",R6:"Societal and environmental well-being",R7:"Accountability"};
const TYPE = {P:"Process · Donabedian process",R:"Risk · A outcome, B process",Q:"Quantitative property · outcome",U:"User-facing · A structure, B outcome",S:"System characteristic · structure"};
const CODE = {C:"AI customer",CS:"AI customer + AI subject",S:"AI subject",Ci:"AI customer (indirect)",X:"Outside both roles"};
/* Stakeholder groups are used only in the release condition (coverage per group >= R_min), not for separate ratings. */
const GROUPS = [
  {k:"authority",name:"Relevant authority",codes:["C","CS","S","Ci","X"]},
  {k:"customer",name:"AI customer",codes:["C","CS","Ci"]},
  {k:"subject",name:"AI subject",codes:["S","CS"]}];
const KINDS = {rule:"Rule-based (knowledge-based)",ml:"Machine learning (trained)",llm:"LLM",other:"Other"};
const ROUNDS = [{k:"R0",name:"R0",t:"Public material only, before any disclosure"},{k:"R1",name:"R1",t:"After a first disclosure"},{k:"R2",name:"R2",t:"After the producer's disclosure"}];
const ADDED = {data:"Data disclosure",model:"Model disclosure",process:"Process disclosure"};
const HOLD = {app:"App side",producer:"Producer",shared:"Shared",each:"Each its own"};
const HOLDHINT = {app:"The app side answers alone. Look at what is observable (O) and the app's own records (C).",producer:"The producer answers without knowing this use. Read its documents (D); ask for what is not there (N).",shared:"Neither side answers alone: the app side brings its use (C), the producer brings the model (N).",each:"Each side answers for its own part: the app side for its use (C), the producer for the model (D)."};
const HOLDCLS = {app:["O","C"],producer:["D","N"],shared:["C","N"],each:["C","D"]};
const holderOf=(q1,q2)=>q1==="yes"&&q2==="no"?"app":q1==="no"&&q2==="yes"?"producer":q1==="no"&&q2==="no"?"shared":q1==="yes"&&q2==="yes"?"each":"";
const ACTN = {ask:"Ask producer",own:"Own task",fix:"Fix before release"};
const LEVELS = [
  {k:"met",name:"Met",col:"--met"},{k:"partly",name:"Partly met",col:"--partly"},
  {k:"notmet",name:"Not met",col:"--notmet"},{k:"cannot",name:"Cannot judge",col:"--cannot"}];
const LNAME = {met:"Met",partly:"Partly met",notmet:"Not met",cannot:"Cannot judge"};
const JUDGED = l=>l==="met"||l==="partly"||l==="notmet";
const SRC = {consequence:"Consequence",practice:"Current practice",obligation:"Obligation"};
const MCH = {A:"Option A",B:"Option B",AB:"Both A and B",other:"Other"};
const KEY = "altai-rating-workbench-v3";
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2,8);

const freshState=()=>({meta:{caseName:"",assessor:"",cutoff:"",example:false,rater:"human"},
  comps:[{k:"c1",name:"Component 1",kind:"rule",producer:"",version:""}],comp:"c1",round:"R0",view:"bench",cur:"A-01",filter:"all",r:{},
  accept:{rows:[],lockedAt:"",model:{}},rmin:{authority:"",customer:"",subject:""},triggers:defaultTriggers(),log:[]});
function defaultTriggers(){return [
  {id:uid(),name:"Lecturers change the AI's proposed level",unit:"% of parts",threshold:"",value:"",links:"A-03, A-23, A-25, A-28"},
  {id:uid(),name:"Appeals upheld against an AI-proposed level",unit:"per term",threshold:"",value:"",links:"A-09, A-47, A-69"},
  {id:uid(),name:"New version of this component",unit:"version change",threshold:"1",value:"",links:"A-22, A-25, A-29, A-39"}];}
let S=freshState();
try{const s=JSON.parse(localStorage.getItem(KEY)||"null"); if(s&&s.r&&s.comps) S=Object.assign(freshState(),s);}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const blankPlan=()=>({applies:"",naReason:"",measure:"",measureOther:"",rationale:"",source:"",threshold:"",q1:"",q2:"",classes:[],registeredAt:"",amendments:[]});
const blankRec=()=>({plan:blankPlan(),level:"",ratedAt:"",judgedIn:"",addedBy:"",evidence:"",argument:"",missing:"",action:"",riskOwner:"",reopened:null,history:[]});
const rec=(id,ck)=>{const k=(ck||S.comp)+":"+id; return S.r[k]||(S.r[k]=blankRec());};
const peek=(id,ck)=>S.r[(ck||S.comp)+":"+id];
const comp=(ck)=>S.comps.find(c=>c.k===(ck||S.comp))||S.comps[0];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const isReg=p=>!!(p&&p.plan&&p.plan.registeredAt);
const isNA=p=>isReg(p)&&p.plan.applies==="no";
const holderRec=p=>p&&p.plan?holderOf(p.plan.q1,p.plan.q2):"";
const pct=x=>(x*100).toFixed(0)+"%";
const num=v=>{const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:null;};

/* action for a rating: Not met -> fix; missing evidence -> ask / own */
function actionOf(r){
  if(!r||!isReg(r)||isNA(r)) return "";
  if(r.level==="notmet") return "fix";
  if(r.level==="partly"||r.level==="cannot") return r.action||(["producer","shared"].includes(holderRec(r))?"ask":"own");
  return "";
}

function counts(ck){
  const by={met:0,partly:0,notmet:0,cannot:0}; let na=0,plans=0,r0=0; const added={data:0,model:0,process:0,none:0};
  const grp={}; GROUPS.forEach(g=>grp[g.k]={total:0,judged:0});
  ITEMS.forEach(i=>{const p=peek(i.id,ck); if(isReg(p)) plans++; if(isNA(p)){na++;return;}
    const l=isReg(p)?p.level:""; if(by[l]!==undefined) by[l]++;
    GROUPS.forEach(g=>{if(g.codes.includes(i.code)){grp[g.k].total++; if(JUDGED(l)) grp[g.k].judged++;}});
    if(JUDGED(l)){ if(p.judgedIn==="R0") r0++; else added[p.addedBy||"none"]++; }});
  const done=by.met+by.partly+by.notmet+by.cannot, total=ITEMS.length-na, judged=by.met+by.partly+by.notmet;
  GROUPS.forEach(g=>grp[g.k].R=grp[g.k].total?grp[g.k].judged/grp[g.k].total:0);
  return {scope:ITEMS.length,na,plans,total,done,left:total-done,by,judged,R:total?judged/total:0,R0:total?r0/total:0,dR:total?(judged-r0)/total:0,added,grp};
}

/* release rule: no Not met, coverage per group >= R_min, every Cannot judge has a named person accepting the risk */
function release(ck){
  const c=counts(ck), notmet=[], unowned=[], owned=[];
  ITEMS.forEach(i=>{const p=peek(i.id,ck); if(!isReg(p)||isNA(p)) return;
    if(p.level==="notmet") notmet.push(i.id);
    if(p.level==="cannot"){ if((p.riskOwner||"").trim()) owned.push({id:i.id,by:p.riskOwner.trim()}); else unowned.push(i.id);} });
  const unrated=ITEMS.filter(i=>{const p=peek(i.id,ck);return !isNA(p)&&!(isReg(p)&&p.level);}).map(i=>i.id);
  const rmin=Object.fromEntries(GROUPS.map(g=>[g.k,num(S.rmin[g.k])]));
  const cov=GROUPS.map(g=>({k:g.k,name:g.name,R:c.grp[g.k].R,min:rmin[g.k],ok:rmin[g.k]==null?null:c.grp[g.k].R*100>=rmin[g.k]-1e-9}));
  const c1=notmet.length===0, c2=cov.every(x=>x.ok===true), c2open=cov.some(x=>x.ok===null), c3=unowned.length===0;
  const anyFail=cov.some(x=>x.ok===false);
  const status=!c1?"no":unrated.length?"open":(anyFail||!c3)?"no":c2?"ok":"open";
  return {c,notmet,unowned,owned,unrated,cov,c1,c2,c2open,c3,status};
}

/* registered acceptance criterion: sum p(e,model) w(e) <= sum p(e,lecturers) w(e) */
function acceptance(ck){
  const rows=S.accept.rows, m=(S.accept.model[ck||S.comp]||{});
  let sl=0,sm=0,complete=rows.length>0;
  rows.forEach(r=>{const w=num(r.w),pl=num(r.pl),pm=num(m[r.id]); if(w==null||pl==null){complete=false;return;} sl+=w*pl; if(pm==null) complete=false; else sm+=w*pm;});
  return {rows,sl,sm,complete,ok:complete?sm<=sl+1e-9:null};
}

/* ---------- header ---------- */
function renderHeader(){
  $("compSel").innerHTML=S.comps.map(c=>`<option value="${c.k}"${c.k===S.comp?" selected":""}>${esc(c.name)} · ${esc(KINDS[c.kind]||"")}</option>`).join("");
  $("compSel").onchange=e=>{S.comp=e.target.value;save();renderAll();};
  $("rounds").innerHTML=ROUNDS.map(r=>`<button type="button" data-r="${r.k}" title="${esc(r.t)}" aria-pressed="${S.round===r.k}">${r.name}</button>`).join("");
  $("rounds").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.round=b.dataset.r;save();renderAll();toast(`Round ${S.round}: ${ROUNDS.find(r=>r.k===S.round).t}`);});
  document.querySelectorAll(".tabs button").forEach(b=>{b.setAttribute("aria-selected",S.view===b.dataset.v);b.onclick=()=>{S.view=b.dataset.v;save();renderAll();};});
  const rl=release(); const cn=$("relCnt"); cn.className="cnt "+(rl.status==="ok"?"ok":rl.status==="no"?"bad":""); cn.textContent=rl.status==="ok"?"ready":rl.status==="no"?"not ready":"open";
  $("vBench").hidden=S.view!=="bench"; $("vSetup").hidden=S.view!=="setup"; $("vRelease").hidden=S.view!=="release";
}
const levelOptions=v=>`<option value="">— Rate —</option>`+LEVELS.map(l=>`<option value="${l.k}"${v===l.k?" selected":""}>${l.name}</option>`).join("");
function setLevel(id,v){const r=rec(id); if(!isReg(r)||isNA(r)) return;
  if(r.level&&r.level!==v) r.history.push({at:now(),from:r.level,to:v||null,round:S.round});
  r.level=v; r.ratedAt=v?now():"";
  if(JUDGED(v)){ if(!r.judgedIn) r.judgedIn=S.round; } else { r.judgedIn=""; r.addedBy=""; }
  if(v) r.reopened=null;
  save();renderTally();renderList();renderRate();renderHeader();}

function renderTally(){
  const c=counts();
  $("nTotal").textContent=c.total;$("nPlan").textContent=c.plans;$("nDone").textContent=c.done;$("nLeft").textContent=c.left;
  $("bar").innerHTML=c.total?LEVELS.map(l=>`<i style="width:${c.by[l.k]/c.total*100}%;background:var(${l.col})"></i>`).join(""):"";
  $("legend").innerHTML=LEVELS.map(l=>`<span><i class="dot" style="background:var(${l.col})"></i>${l.name} ${c.by[l.k]}</span>`).join("")+(c.na?`<span><i class="dot" style="background:var(--na)"></i>Not applicable ${c.na}</span>`:"")+`<span title="(Met + Partly met + Not met) / applicable criteria">Coverage R ${pct(c.R)}</span><span title="Coverage added after R0 by disclosure">ΔR ${pct(c.dR)}</span>`;
}

function renderList(){
  let h="";
  Object.keys(REQ).forEach(rq=>{
    const its=ITEMS.filter(i=>i.req===rq).filter(i=>{
      const p=peek(i.id); if(S.filter==="all") return true;
      if(S.filter==="noplan") return !isReg(p); if(S.filter==="open") return isReg(p)&&!isNA(p)&&!p.level; if(S.filter==="done") return isReg(p)&&!isNA(p)&&!!p.level;
      if(S.filter==="ask") return actionOf(p)==="ask"; return true;});
    if(!its.length) return;
    h+=`<div class="grp"><span class="label">${rq} · ${REQ[rq]}</span><span class="c">${ITEMS.filter(i=>i.req===rq).length}</span></div>`;
    its.forEach(i=>{
      const p=peek(i.id), l=(p&&p.level)||"";
      let ctl;
      if(!isReg(p)) ctl=`<span class="pl">plan needed</span>`;
      else if(isNA(p)) ctl=`<span class="pl na">not applicable</span>`;
      else if(p.reopened&&!l) ctl=`<span class="pl ro" title="Reopened by a trigger">reopened</span>`;
      else ctl=`<select aria-label="Rating for ${i.id}" class="${l?"lv-"+l:""}" data-sel="${i.id}">${levelOptions(l)}</select>`;
      h+=`<div class="row${S.cur===i.id?" cur":""}" data-id="${i.id}"><span class="id">${i.id}</span><span class="t" title="${esc(i.criterion)}">${esc(i.criterion)}</span>${ctl}</div>`;});
  });
  $("list").innerHTML=h||`<p class="small" style="padding:14px">Nothing in this view.</p>`;
  $("list").querySelectorAll(".row").forEach(r=>r.onclick=e=>{if(e.target.tagName==="SELECT")return;S.cur=r.dataset.id;save();renderList();renderPlan();renderRate();});
  $("list").querySelectorAll("select").forEach(s=>{s.onclick=e=>e.stopPropagation();s.onchange=()=>setLevel(s.dataset.sel,s.value);});
}

function radios(name,opts,val,dis){return `<span class="seg">${opts.map(([v,t])=>`<label><input type="radio" name="${name}" value="${v}"${val===v?" checked":""}${dis?" disabled":""}>${t}</label>`).join("")}</span>`;}
function planMissing(p){
  const m=[]; if(!p.applies) m.push("Element 1: choose whether the criterion applies");
  if(p.applies==="no"){ if(!p.naReason.trim()) m.push("Element 1: give the reason it does not apply"); return m; }
  if(!p.measure) m.push("Element 2: choose a measure"); if(p.measure==="other"&&!p.measureOther.trim()) m.push("Element 2: describe the other measure");
  if(!p.rationale.trim()) m.push("Element 2: give the rationale for the choice (C2)");
  if(!p.source) m.push("Element 3: name the source of the acceptance criterion"); if(!p.threshold.trim()) m.push("Element 3: state the acceptance criterion");
  if(!p.q1||!p.q2) m.push("Element 4: answer both questions on who holds the evidence");
  if(!p.classes.length) m.push("Element 4: tick at least one evidence class to consult");
  return m;
}
function renderPlan(){
  const i=ITEMS.find(x=>x.id===S.cur), idx=ITEMS.indexOf(i), cp=comp();
  const r=rec(i.id), p=r.plan, lock=isReg(r), na=p.applies==="no", hk=holderOf(p.q1,p.q2), dr=DRAFTMAP[i.id];
  const cls=[["O","observable",i.O],["D","producer documents",i.D],["C","app side's own records",i.C],["N","ask the producer",i.N]];
  const show=(t,v)=>`<div class="val"><i>${t}:</i> ${esc(v)||"—"}</div>`;
  const yn=v=>v==="yes"?"Yes":v==="no"?"No":"—";
  const c1=lock
    ? `<div class="ctl locked"><span class="ttl">Registered for this component</span>${show("Applies",p.applies==="yes"?"Yes":"No")}${na?show("Reason",p.naReason):""}</div>`
    : `<div class="ctl"><span class="ttl">Decide for this component</span>${radios("e1",[["yes","Applies"],["no","Not applicable"]],p.applies)}${na?`<input type="text" id="naReason" placeholder="Why it does not apply" value="${esc(p.naReason)}">`:""}</div>`;
  const c2=na?"":lock
    ? `<div class="ctl locked"><span class="ttl">Registered</span>${show("Measure",MCH[p.measure]+(p.measure==="other"?": "+p.measureOther:""))}${show("Rationale",p.rationale)}</div>`
    : `<div class="ctl"><span class="ttl">Choose for this component</span>${radios("e2",[["A","Option A"],["B","Option B"],["AB","Both"],["other","Other"]],p.measure)}${p.measure==="other"?`<input type="text" id="mOther" placeholder="Describe the measure" value="${esc(p.measureOther)}">`:""}<textarea id="rat" placeholder="Rationale: why this measure fits the decision (C2)">${esc(p.rationale)}</textarea></div>`;
  const c3=na?"":lock
    ? `<div class="ctl locked"><span class="ttl">Registered</span>${show("Source",SRC[p.source])}${show("Acceptance criterion",p.threshold)}</div>`
    : `<div class="ctl"><span class="ttl">Set for this component</span>${radios("e3",Object.entries(SRC),p.source)}<textarea id="thr" placeholder="Acceptance criterion, e.g. a threshold per error type, or point to the registered criterion in Case setup">${esc(p.threshold)}</textarea></div>`;
  const holdBox=hk?`<div><span class="hold">Holder: ${HOLD[hk]}</span> <span class="hint">${HOLDHINT[hk]}</span></div>`:"";
  const c4=na?"":lock
    ? `<div class="ctl locked"><span class="ttl">Registered</span>${show("Q1 App side can answer alone",yn(p.q1))}${show("Q2 Producer can answer without knowing this use",yn(p.q2))}${holdBox}${show("Classes to consult",p.classes.join(", "))}</div>`
    : `<div class="ctl"><span class="ttl">Who holds the evidence for this component</span>
        <div class="q" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>Q1 · Can the app side answer alone?</span>${radios("q1",[["yes","Yes"],["no","No"]],p.q1)}</div>
        <div class="q" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>Q2 · Can the producer answer without knowing this use?</span>${radios("q2",[["yes","Yes"],["no","No"]],p.q2)}</div>
        ${holdBox}
        <span class="small">Classes to consult${hk?` (suggested for ${HOLD[hk]}: ${HOLDCLS[hk].join(" + ")})`:""}</span>
        <span class="seg">${["O","D","C","N"].map(k=>`<label><input type="checkbox" name="e4" value="${k}"${p.classes.includes(k)?" checked":""}>${k}</label>`).join("")}</span>
        ${dr?`<span class="small">Draft for the 326501 grading case: ${HOLD[dr.holder]}, ${dr.classes.join(" + ")}${dr.note?" · "+esc(dr.note):""} <button class="btn" type="button" id="useDraft" style="padding:2px 8px;font-size:12px">Use draft</button></span>`:""}</div>`;
  const miss=!lock?planMissing(p):[];
  const regBox=lock
    ? `<div class="reg done"><div class="line"><span><b>Plan registered</b> · locked</span><span class="stamp">${p.registeredAt.slice(0,16).replace("T"," ")} UTC</span></div>
        ${p.amendments.length?`<span class="small">${p.amendments.length} amendment(s) recorded</span>`:""}
        <div class="line"><input type="text" id="amendWhy" placeholder="Reason for amending (kept in the report)" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:var(--surface)"><button class="btn" type="button" id="amend">Amend plan</button></div>
        <span class="small">Amending unlocks the plan and clears this rating, because a rating must follow the plan it rests on (C1).</span></div>`
    : `<div class="reg"><div class="line"><span><b>Register the plan</b> before looking at the evidence (C1)</span><button class="btn primary" type="button" id="register"${miss.length?" disabled":""}>Register and lock</button></div>${miss.length?`<ul>${miss.map(m=>`<li>${m}</li>`).join("")}</ul>`:`<span class="small">Registration stamps the time and locks elements 1–4.</span>`}</div>`;
  $("plan").innerHTML=`
    <div class="crumbs"><span class="tag mono">${i.id}</span><span>${i.req} · ${REQ[i.req]}</span><span class="tag">Type ${i.type} · ${TYPE[i.type]}</span><span class="tag">${esc(cp.name)} · ${esc(KINDS[cp.kind]||"")}</span></div>
    <h2>${esc(i.criterion)}</h2>
    <div class="who"><span class="for">Counts for</span><span class="pill ${i.code==="X"?"x":"c"}">${CODE[i.code]}</span><span class="draft">in the release check · code ${i.codeRule} (draft: check against the full ALTAI text)</span></div>
    ${r.reopened?`<div class="reopen">Reopened ${r.reopened.at.slice(0,10)} by the trigger “${esc(r.reopened.trigger)}”. Rate it again with the new evidence.</div>`:""}
    <div class="el"><span class="k">1</span><div class="body"><h3>Applicability <small>element 1</small></h3>
      <dl class="kv"><dt>Not applicable when</dt><dd>${esc(i.na)}</dd></dl>${c1}</div></div>
    <div class="el"><span class="k">2</span><div class="body"><h3>Measure <small>element 2 · ISO/IEC/IEEE 15939</small></h3>
      <div class="opts"><div class="opt"><b>Option A · closer to the decision</b>${esc(i.optA)}</div><div class="opt"><b>Option B · more general or documented</b>${esc(i.optB)}</div></div>
      <p class="hint">Choose the measure that fits the decision, not the one with the easiest evidence.</p>${c2}</div></div>
    <div class="el"><span class="k">3</span><div class="body"><h3>Acceptance criterion <small>element 3 · where the threshold comes from</small></h3>
      <dl class="kv"><dt>Consequence</dt><dd>${esc(i.consequence)||"—"}</dd><dt>Current practice</dt><dd>${esc(i.practice)||"—"}</dd><dt>Obligation (examples to check)</dt><dd>${esc(i.obligation)||"—"}</dd></dl>${c3}</div></div>
    <div class="el"><span class="k">4</span><div class="body"><h3>Who holds the evidence, and where to look <small>element 4 · holder and class</small></h3>
      <div class="cls">${cls.map(([k,n,v])=>`<span class="ck" title="${n}">${k}</span><span class="${v?"":"none"}"><i style="font-style:normal;color:var(--muted)">${n}:</i> ${v?esc(v):"no typical source of this class"}</span>`).join("")}</div>${c4}</div></div>
    ${regBox}
    <div class="nav"><button class="btn" type="button" id="prev"${idx===0?" disabled":""}>← Previous</button><span class="small mono">${idx+1} / 69</span><button class="btn" type="button" id="next"${idx===68?" disabled":""}>Next →</button></div>`;
  $("prev").onclick=()=>step(-1);$("next").onclick=()=>step(1);
  const re=()=>{save();renderPlan();};
  document.querySelectorAll('input[name="e1"]').forEach(x=>x.onchange=()=>{p.applies=x.value;re();});
  document.querySelectorAll('input[name="e2"]').forEach(x=>x.onchange=()=>{p.measure=x.value;re();});
  document.querySelectorAll('input[name="e3"]').forEach(x=>x.onchange=()=>{p.source=x.value;re();});
  const setQ=(k,v)=>{const before=holderOf(p.q1,p.q2); p[k]=v; const h=holderOf(p.q1,p.q2); if(h&&h!==before&&(!p.classes.length||(before&&String(p.classes)===String(HOLDCLS[before])))) p.classes=[...HOLDCLS[h]]; re();};
  document.querySelectorAll('input[name="q1"]').forEach(x=>x.onchange=()=>setQ("q1",x.value));
  document.querySelectorAll('input[name="q2"]').forEach(x=>x.onchange=()=>setQ("q2",x.value));
  document.querySelectorAll('input[name="e4"]').forEach(x=>x.onchange=()=>{p.classes=[...document.querySelectorAll('input[name="e4"]:checked')].map(y=>y.value);re();});
  const ud=$("useDraft"); if(ud) ud.onclick=()=>{p.q1=dr.q1;p.q2=dr.q2;p.classes=[...dr.classes];re();};
  const bindTxt=(id,f)=>{const el=$(id); if(!el) return; el.oninput=()=>{p[f]=el.value;save();}; el.onchange=re;};
  bindTxt("naReason","naReason");bindTxt("mOther","measureOther");bindTxt("rat","rationale");bindTxt("thr","threshold");
  const rg=$("register"); if(rg) rg.onclick=()=>{if(planMissing(p).length) return; p.registeredAt=now(); if(p.applies==="no"){r.level="";r.ratedAt="";r.judgedIn="";} save();renderAll();toast("Plan registered and locked");};
  const am=$("amend"); if(am) am.onclick=()=>{const why=$("amendWhy").value.trim(); if(!why){toast("Give a reason for the amendment first.");$("amendWhy").focus();return;}
    const prev=Object.assign({},p); delete prev.amendments; p.amendments.push({at:now(),reason:why,previous:prev,clearedRating:r.level||null});
    p.registeredAt=""; r.level=""; r.ratedAt=""; r.judgedIn=""; r.addedBy=""; save(); renderAll(); toast("Plan unlocked. Register it again before rating.");};
}
function step(d){
  let k=ITEMS.findIndex(x=>x.id===S.cur)+d;
  if(k<0||k>68) return; S.cur=ITEMS[k].id;save();renderList();renderPlan();renderRate();
  const r=document.querySelector(`.row[data-id="${S.cur}"]`); if(r) r.scrollIntoView({block:"nearest"});
}

function g4Suggest(g){
  if(g.fail==="yes") return "notmet";
  if(g.fail==="no"&&g.shown==="no") return "cannot";
  if(g.fail==="no"&&g.shown==="yes"&&g.all==="yes") return "met";
  if(g.fail==="no"&&g.shown==="yes"&&g.all==="no") return "partly";
  return "";
}
function renderRate(){
  const i=ITEMS.find(x=>x.id===S.cur), cp=comp();
  const head=`<h3>Rating <span class="mono">${i.id} · ${esc(cp.name)} · ${S.round}</span></h3>`;
  const r=rec(i.id);
  if(!isReg(r)){$("ratePanel").innerHTML=head+`<select disabled aria-label="Rating"><option>Register the plan first</option></select><p class="small" style="margin-top:10px">Rating opens once elements 1–4 are registered for this component (C1).</p>`;$("g4").innerHTML="";return;}
  if(isNA(r)){$("ratePanel").innerHTML=head+`<p class="small">Registered as not applicable in element 1 (G1). No rating.</p><p style="font-size:13.5px;margin:6px 0 0">${esc(r.plan.naReason)}</p>`;$("g4").innerHTML="";return;}
  const miss=r.level==="partly"||r.level==="cannot", a=actionOf(r), hk=holderRec(r);
  const addedQ=JUDGED(r.level)&&r.judgedIn&&r.judgedIn!=="R0";
  $("ratePanel").innerHTML=head+`
    <select id="lvl" aria-label="Rating" class="${r.level?"lv-"+r.level:""}">${levelOptions(r.level)}</select>
    ${r.ratedAt?`<p class="small" style="margin:6px 0 0">Rated ${r.ratedAt.slice(0,16).replace("T"," ")} UTC${r.judgedIn?` · first judged in ${r.judgedIn}`:""}</p>`:""}
    ${a?`<p style="margin:8px 0 0"><span class="act ${a}">${ACTN[a]}</span> <span class="small">holder: ${HOLD[hk]||"—"}</span></p>`:""}
    <div class="field"><label for="ev">Evidence · source, class, date</label><textarea id="ev">${esc(r.evidence)}</textarea></div>
    <div class="field"><label for="arg">Argument · how the evidence compares with the acceptance criterion, and why it applies to this component as the app uses it</label><textarea id="arg">${esc(r.argument)}</textarea></div>
    ${addedQ?`<div class="field"><span class="small">Judged after R0. Which disclosure made it possible? (splits ΔR)</span>${radios("added",Object.entries(ADDED),r.addedBy)}</div>`:""}
    ${r.level==="notmet"?`<div class="field"><label for="mis">What must be fixed before release</label><textarea id="mis">${esc(r.missing)}</textarea></div>`:""}
    ${miss?`<div class="field"><label for="mis">What is missing</label><textarea id="mis">${esc(r.missing)}</textarea></div>
      <div class="field"><span class="small">Next step for the missing evidence (G5)</span><div class="seg">
        <label><input type="radio" name="act" value="ask"${a==="ask"?" checked":""}>Ask producer (N)</label>
        <label><input type="radio" name="act" value="own"${a==="own"?" checked":""}>Own task (O, C)</label></div></div>`:""}
    ${r.level==="cannot"?`<div class="field"><label for="own">Risk accepted by · name and role (release condition)</label><input id="own" type="text" value="${esc(r.riskOwner)}" placeholder="e.g. course coordinator" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:var(--surface)"></div>`:""}`;
  $("lvl").onchange=e=>setLevel(i.id,e.target.value);
  [["ev","evidence"],["arg","argument"],["mis","missing"],["own","riskOwner"]].forEach(([id,f])=>{const el=$(id); if(el){el.oninput=()=>{r[f]=el.value;save();}; if(f==="riskOwner") el.onchange=()=>renderHeader();}});
  document.querySelectorAll('input[name="act"]').forEach(x=>x.onchange=()=>{r.action=x.value;save();renderRate();});
  document.querySelectorAll('input[name="added"]').forEach(x=>x.onchange=()=>{r.addedBy=x.value;save();renderTally();});
  const g=r.g4||(r.g4={}), sg=g4Suggest(g);
  const q=(k,t)=>`<div class="q"><span>${t}</span>${radios("g4"+k,[["yes","yes"],["no","no"]],g[k])}</div>`;
  $("g4").innerHTML=`<span class="label">G4 helper · optional</span>
    ${q("fail","Any element shown not met?")}${g.fail==="no"?q("shown","Any element shown met?"):""}${g.fail==="no"&&g.shown==="yes"?q("all","Every element shown met?"):""}
    ${sg?`<div class="sugg">The rule gives <b>${LNAME[sg]}</b>.${r.level===sg?" Matches your rating.":` <button class="btn" type="button" id="useSg">Use it</button>`}</div>`:`<p class="small">Answer the questions to see what G4 gives. The final rating is yours.</p>`}`;
  ["fail","shown","all"].forEach(k=>document.querySelectorAll(`input[name="g4${k}"]`).forEach(x=>x.onchange=()=>{g[k]=x.value;if(k==="fail"){delete g.shown;delete g.all;}if(k==="shown")delete g.all;save();renderRate();}));
  const u=$("useSg"); if(u) u.onclick=()=>setLevel(i.id,sg);
}

/* ---------- case setup ---------- */
function renderSetup(){
  const locked=!!S.accept.lockedAt, ck=S.comp, m=S.accept.model[ck]||(S.accept.model[ck]={}), ac=acceptance();
  const draftable=ITEMS.filter(i=>{const p=peek(i.id);return !isReg(p)&&!(p&&p.plan.q1);}).length;
  $("vSetup").innerHTML=`
  <div class="card wide"><h2>AI components <small>one assessment per component</small></h2>
    <p>List every AI component the app uses. The assessor rates each one separately, because each has its own producer, its own evidence and its own version.</p>
    <div class="scroll"><table class="t"><thead><tr><th>Component</th><th>Kind of AI</th><th>Producer</th><th>Version</th><th class="n">Rated</th><th></th></tr></thead><tbody>
    ${S.comps.map(c=>{const n=counts(c.k);return `<tr data-c="${c.k}"><td><input data-f="name" value="${esc(c.name)}"></td><td><select data-f="kind">${Object.entries(KINDS).map(([k,t])=>`<option value="${k}"${c.kind===k?" selected":""}>${t}</option>`).join("")}</select></td><td><input data-f="producer" value="${esc(c.producer)}" placeholder="who made it"></td><td><input data-f="version" value="${esc(c.version)}" placeholder="e.g. v0.1"></td><td class="n">${n.done}/${n.total}</td><td><button class="btn" type="button" data-open="${c.k}">Rate</button>${S.comps.length>1?` <button class="btn" type="button" data-del="${c.k}" title="Remove component">✕</button>`:""}</td></tr>`;}).join("")}
    </tbody></table></div>
    <div><button class="btn" type="button" id="addComp">Add component</button></div></div>

  <div class="card"><h2>Registered acceptance criterion <small>${locked?"locked "+S.accept.lockedAt.slice(0,16).replace("T"," ")+" UTC":"set before any evidence"}</small></h2>
    <p>For each error type: its weight w(e), set by the doctor-lecturers, and how often it happens between two lecturers grading the same reports (the baseline). The component passes when its weighted error is no larger than the lecturers'.</p>
    <div class="ineq">Σ p(e, model) · w(e) ≤ Σ p(e, lecturers) · w(e)</div>
    <div class="scroll"><table class="t"><thead><tr><th>Error type e</th><th class="n">w(e)</th><th class="n">p lecturers %</th><th class="n">p ${esc(comp().name)} %</th>${locked?"":"<th></th>"}</tr></thead><tbody>
    ${S.accept.rows.map(r=>`<tr data-a="${r.id}"><td>${locked?esc(r.e):`<input data-f="e" value="${esc(r.e)}" placeholder="e.g. level two or more steps off">`}</td><td class="n">${locked?esc(r.w):`<input class="num" data-f="w" value="${esc(r.w)}">`}</td><td class="n">${locked?esc(r.pl):`<input class="num" data-f="pl" value="${esc(r.pl)}">`}</td><td class="n"><input class="num" data-m="${r.id}" value="${esc(m[r.id]??"")}" placeholder="measured"></td>${locked?"":`<td><button class="btn" type="button" data-adel="${r.id}">✕</button></td>`}</tr>`).join("")||`<tr><td colspan="5" class="small">No error types yet.</td></tr>`}
    </tbody></table></div>
    ${locked?"":`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="addErr">Add error type</button><button class="btn primary" type="button" id="lockAcc"${S.accept.rows.length?"":" disabled"}>Register and lock</button></div>`}
    <p class="small">Weights and baseline lock at registration. The model's rates are measured later, for each component.</p>
    <div class="ineq" id="accIneq">${ineqText(ac)}</div></div>

  <div class="card"><h2>Release threshold R<sub>min</sub> <small>coverage each stakeholder group must reach</small></h2>
    <p>Coverage R = (Met + Partly met + Not met) / applicable criteria. Each group counts the criteria coded for it. This is the only place stakeholder groups enter the assessment.</p>
    <table class="t"><thead><tr><th>Stakeholder group</th><th class="n">R<sub>min</sub> %</th><th class="n">Now (${esc(comp().name)})</th></tr></thead><tbody>
    ${GROUPS.map(g=>`<tr><td>${g.name}</td><td class="n"><input class="num" data-rmin="${g.k}" value="${esc(S.rmin[g.k])}" placeholder="set"></td><td class="n">${pct(counts().grp[g.k].R)}</td></tr>`).join("")}
    </tbody></table></div>

  <div class="card"><h2>Holder draft <small>69 criteria, 326501 grading case</small></h2>
    <p>${esc(DRAFT.source)}. Counts: App side ${DRAFT.items.filter(d=>d.holder==="app").length}, Shared ${DRAFT.items.filter(d=>d.holder==="shared").length}, Each its own ${DRAFT.items.filter(d=>d.holder==="each").length}, Producer ${DRAFT.items.filter(d=>d.holder==="producer").length}.</p>
    <p>Filling copies Q1, Q2 and the classes into plans of <b>${esc(comp().name)}</b> that are not registered and have no answers yet. You still check each one before registering.</p>
    <div><button class="btn" type="button" id="fillDraft"${draftable?"":" disabled"}>Fill ${draftable} unregistered plans</button></div></div>

  <div class="card wide"><h2>Re-assessment triggers <small>${esc(comp().name)}</small></h2>
    <p>Each trigger is linked to the criteria it affects. When its value reaches the threshold, reopen those criteria: their plans stay, their ratings clear, and the assessor rates them again with the new evidence.</p>
    <div class="scroll"><table class="t"><thead><tr><th>Trigger</th><th>Unit</th><th class="n">Threshold</th><th class="n">Now</th><th>Linked criteria</th><th></th></tr></thead><tbody>
    ${S.triggers.map(t=>{const hit=num(t.threshold)!=null&&num(t.value)!=null&&num(t.value)>=num(t.threshold);return `<tr data-t="${t.id}"><td><input data-f="name" value="${esc(t.name)}"></td><td><input data-f="unit" value="${esc(t.unit)}"></td><td class="n"><input class="num" data-f="threshold" value="${esc(t.threshold)}"></td><td class="n"><input class="num" data-f="value" value="${esc(t.value)}"></td><td><input data-f="links" value="${esc(t.links)}"></td><td style="white-space:nowrap"><button class="btn${hit?" primary":""}" type="button" data-fire="${t.id}"${hit?"":" disabled"}>Reopen</button> <button class="btn" type="button" data-tdel="${t.id}">✕</button></td></tr>`;}).join("")}
    </tbody></table></div>
    <div><button class="btn" type="button" id="addTrig">Add trigger</button></div>
    ${S.log.length?`<p class="small">${S.log.slice(-3).reverse().map(l=>`${l.at.slice(0,10)} · ${esc(l.text)}`).join("<br>")}</p>`:""}</div>`;
  const V=$("vSetup");
  V.querySelectorAll("tr[data-c]").forEach(tr=>{const c=S.comps.find(x=>x.k===tr.dataset.c);
    tr.querySelectorAll("[data-f]").forEach(el=>{el.oninput=()=>{c[el.dataset.f]=el.value;save();}; el.onchange=()=>{save();renderHeader();};});});
  V.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{S.comp=b.dataset.open;S.view="bench";save();renderAll();});
  V.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const k=b.dataset.del,c=S.comps.find(x=>x.k===k),n=counts(k);
    if((n.plans||n.done)&&!confirm(`Remove ${c.name} and its ${n.plans} registered plans?`)) return;
    S.comps=S.comps.filter(x=>x.k!==k); Object.keys(S.r).forEach(x=>{if(x.startsWith(k+":")) delete S.r[x];}); if(S.comp===k) S.comp=S.comps[0].k; save();renderAll();});
  $("addComp").onclick=()=>{const k="c"+uid();S.comps.push({k,name:"Component "+(S.comps.length+1),kind:"ml",producer:"",version:""});S.comp=k;save();renderAll();};
  const upIneq=()=>{const a=acceptance(),el=$("accIneq"); if(el) el.innerHTML=ineqText(a); const lb=$("lockAcc"); if(lb) lb.disabled=!S.accept.rows.length; renderHeader();};
  V.querySelectorAll("tr[data-a]").forEach(tr=>{const r=S.accept.rows.find(x=>x.id===tr.dataset.a);
    tr.querySelectorAll("[data-f]").forEach(el=>{el.oninput=()=>{r[el.dataset.f]=el.value;save();upIneq();};});});
  V.querySelectorAll("[data-m]").forEach(el=>{el.oninput=()=>{m[el.dataset.m]=el.value;save();upIneq();};});
  V.querySelectorAll("[data-adel]").forEach(b=>b.onclick=()=>{S.accept.rows=S.accept.rows.filter(x=>x.id!==b.dataset.adel);save();renderSetup();});
  const ae=$("addErr"); if(ae) ae.onclick=()=>{S.accept.rows.push({id:uid(),e:"",w:"",pl:""});save();renderSetup();};
  const la=$("lockAcc"); if(la) la.onclick=()=>{const bad=S.accept.rows.filter(r=>!r.e.trim()||num(r.w)==null||num(r.pl)==null); if(bad.length){toast("Give every error type a name, a weight and a baseline first.");return;}
    S.accept.lockedAt=now(); S.log.push({at:now(),text:"Acceptance criterion registered"}); save();renderSetup();toast("Acceptance criterion registered and locked");};
  V.querySelectorAll("[data-rmin]").forEach(el=>{el.oninput=()=>{S.rmin[el.dataset.rmin]=el.value;save();}; el.onchange=()=>{renderHeader();};});
  $("fillDraft").onclick=()=>{let n=0; ITEMS.forEach(i=>{const r=rec(i.id),p=r.plan,d=DRAFTMAP[i.id]; if(!d||isReg(r)||p.q1) return; p.q1=d.q1;p.q2=d.q2;p.classes=[...d.classes];n++;}); save();renderSetup();toast(`Filled ${n} plans from the draft`);};
  V.querySelectorAll("tr[data-t]").forEach(tr=>{const t=S.triggers.find(x=>x.id===tr.dataset.t);
    const fb=tr.querySelector("[data-fire]");
    tr.querySelectorAll("[data-f]").forEach(el=>{el.oninput=()=>{t[el.dataset.f]=el.value;save();const hit=num(t.threshold)!=null&&num(t.value)!=null&&num(t.value)>=num(t.threshold);fb.disabled=!hit;fb.classList.toggle("primary",hit);};});});
  V.querySelectorAll("[data-tdel]").forEach(b=>b.onclick=()=>{S.triggers=S.triggers.filter(x=>x.id!==b.dataset.tdel);save();renderSetup();});
  V.querySelectorAll("[data-fire]").forEach(b=>b.onclick=()=>fireTrigger(S.triggers.find(x=>x.id===b.dataset.fire)));
  $("addTrig").onclick=()=>{S.triggers.push({id:uid(),name:"",unit:"",threshold:"",value:"",links:""});save();renderSetup();};
}
function ineqText(ac){return ac.rows.length?`Model ${ac.sm.toFixed(2)} ${ac.ok===null?"?":ac.ok?"≤":">"} lecturers ${ac.sl.toFixed(2)} · ${ac.ok===null?"not complete yet":ac.ok?"accepted for "+esc(comp().name):"not accepted for "+esc(comp().name)}`:"Add error types to compute the check.";}
function linkIds(s){return String(s||"").split(/[\s,;]+/).map(x=>x.trim().toUpperCase()).filter(Boolean).map(x=>/^A-?\d+$/.test(x)?"A-"+String(parseInt(x.replace(/\D/g,""),10)).padStart(2,"0"):x).filter(x=>ITEMS.some(i=>i.id===x));}
function fireTrigger(t){
  const ids=linkIds(t.links); let n=0;
  ids.forEach(id=>{const r=peek(id); if(!isReg(r)||isNA(r)) return; if(r.level) r.history.push({at:now(),from:r.level,to:null,round:S.round,trigger:t.name});
    r.level="";r.ratedAt="";r.judgedIn="";r.addedBy="";r.reopened={at:now(),trigger:t.name};n++;});
  S.log.push({at:now(),text:`${t.name}: ${t.value} ${t.unit} reached ${t.threshold}; reopened ${n} criteria for ${comp().name} (${ids.join(", ")})`});
  t.value=""; save();renderAll();toast(`Reopened ${n} criteria`);
}

/* ---------- release check and outputs ---------- */
function checkHTML(ok,title,detail){const c=ok===true?"ok":ok===false?"no":"open";return `<div class="check ${c}"><span class="m">${ok===true?"✓":ok===false?"✕":"…"}</span><div><b>${title}</b><div class="d">${detail}</div></div></div>`;}
function relCard(ck){
  const c0=comp(ck), R=release(ck), ac=acceptance(ck);
  const v=R.status==="ok"?`<div class="verdict ok">Ready to release ${esc(c0.name)}</div>`:R.status==="no"?`<div class="verdict no">Not ready: fix or accept before release</div>`:`<div class="verdict open">Not decided yet${R.unrated.length?` · ${R.unrated.length} criteria still to rate`:""}</div>`;
  return `<div class="card"><h2>${esc(c0.name)} <small>${esc(KINDS[c0.kind]||"")}${c0.producer?" · producer "+esc(c0.producer):""}${c0.version?" · "+esc(c0.version):""}</small></h2>${v}
    ${checkHTML(R.c1,"No criterion rated Not met",R.notmet.length?"Fix before release: "+R.notmet.join(", "):"None")}
    ${checkHTML(R.c2open&&R.cov.every(x=>x.ok!==false)?null:R.c2,"Coverage per stakeholder group ≥ R<sub>min</sub>",R.cov.map(x=>`${x.name} ${pct(x.R)}${x.min==null?" (R<sub>min</sub> not set)":" / "+x.min+"%"}`).join(" · "))}
    ${checkHTML(R.c3,"Every Cannot judge has a named person accepting the risk",R.unowned.length?"No owner yet: "+R.unowned.join(", "):R.owned.length?R.owned.map(o=>`${o.id} ${esc(o.by)}`).join(" · "):"None open")}
    <div class="ineq">Acceptance criterion: ${ac.rows.length?(ac.ok===null?"not complete":ac.ok?"met":"not met")+` (model ${ac.sm.toFixed(2)} vs lecturers ${ac.sl.toFixed(2)})`:"not registered"}</div></div>`;
}
function renderRelease(){
  const c=counts(), a=c.added;
  $("vRelease").innerHTML=`${S.comps.map(x=>relCard(x.k)).join("")}
  <div class="card"><h2>Disclosure-added coverage ΔR <small>${esc(comp().name)}</small></h2>
    <p>ΔR = R2 − R0: the coverage the app side gained once the producer disclosed. Criteria first judged after R0 are split by what made them judgeable.</p>
    <table class="t"><tbody><tr><td>R0 · public material only</td><td class="n">${pct(c.R0)}</td></tr><tr><td>Now (${S.round})</td><td class="n">${pct(c.R)}</td></tr><tr><td><b>ΔR</b></td><td class="n"><b>${pct(c.dR)}</b></td></tr>
    ${Object.entries(ADDED).map(([k,t])=>`<tr><td>&nbsp;&nbsp;${t}-added</td><td class="n">${a[k]} · ${c.total?pct(a[k]/c.total):"0%"}</td></tr>`).join("")}
    <tr><td>&nbsp;&nbsp;not split yet</td><td class="n">${a.none}</td></tr></tbody></table></div>
  <div class="card wide"><h2>Outputs <small>three readers, one assessment</small></h2>
    <div class="outs">
      <div class="out"><b>For the producer</b><span>What the app side asks for (Ask producer), the criteria the producer holds or shares, and ΔR so far.</span><div class="row2"><button class="btn primary" type="button" data-pdf="producer">PDF</button><button class="btn" type="button" data-json="producer">JSON</button></div></div>
      <div class="out"><b>For the provider side</b><span>The full assessment: plans, ratings, own tasks, fixes before release, accepted risks and the release check.</span><div class="row2"><button class="btn primary" type="button" data-pdf="provider">PDF</button><button class="btn" type="button" data-json="provider">JSON</button></div></div>
      <div class="out"><b>For the AI users</b><span>For lecturers and TAs: the release decision, what they must know to use the AI, its open limits and what reopens it.</span><div class="row2"><button class="btn primary" type="button" data-pdf="users">PDF</button><button class="btn" type="button" data-json="users">JSON</button></div></div>
      <div class="out"><b>Full record</b><span>Everything, all components. Import it again to continue on another device or to review a second assessor.</span><div class="row2"><button class="btn" type="button" data-json="full">JSON</button></div></div>
    </div></div>`;
  $("vRelease").querySelectorAll("[data-pdf]").forEach(b=>b.onclick=()=>makePDF(b.dataset.pdf));
  $("vRelease").querySelectorAll("[data-json]").forEach(b=>b.onclick=()=>showJSON(b.dataset.json));
}

function renderMeta(){
  [["caseName","caseName"],["assessor","assessor"],["cutoff","cutoff"]].forEach(([id,k])=>{const el=$(id);el.value=S.meta[k]||"";el.oninput=()=>{S.meta[k]=el.value;save();};});
  const tg=S.meta.example?"Example file · fictional case":S.meta.rater==="AI"?"AI rater · plans written after seeing the evidence (C1 not met)":"";
  $("exTag").textContent=tg; $("exTag").hidden=!tg;
}
document.querySelectorAll(".chipbtn").forEach(b=>b.onclick=()=>{S.filter=b.dataset.f;save();renderAll();});
function renderAll(){
  if(!S.comps.find(c=>c.k===S.comp)) S.comp=S.comps[0].k; if(!ITEMS.find(x=>x.id===S.cur)) S.cur="A-01";
  renderHeader();
  if(S.view==="bench"){renderTally();renderList();renderPlan();renderRate();document.querySelectorAll(".chipbtn").forEach(x=>x.setAttribute("aria-pressed",x.dataset.f===S.filter));}
  if(S.view==="setup") renderSetup();
  if(S.view==="release") renderRelease();
}

/* ---------- report data ---------- */
function itemsFor(ck){
  return ITEMS.map(i=>{const r=peek(i.id,ck)||blankRec(),p=r.plan,reg=isReg(r),na=isNA(r),a=actionOf(r),h=holderOf(p.q1,p.q2);
    return {id:i.id,requirement:`${i.req} ${REQ[i.req]}`,criterion:i.criterion,type:i.type,stakeholderCode:i.code,
      plan:{registeredAt:p.registeredAt||null,applies:p.applies==="yes"?true:p.applies==="no"?false:null,notApplicableReason:p.naReason||"",
        measure:p.measure?(p.measure==="A"?"A: "+i.optA:p.measure==="B"?"B: "+i.optB:p.measure==="AB"?"A and B":"Other: "+p.measureOther):"",measureChoice:p.measure||"",
        measureRationale:p.rationale||"",acceptanceCriterionSource:p.source||"",acceptanceCriterion:p.threshold||"",
        q1AppSideAlone:p.q1||"",q2ProducerWithoutUse:p.q2||"",holder:h?HOLD[h]:"",evidenceClasses:p.classes||[],amendments:p.amendments||[]},
      rating:reg&&!na&&r.level?LNAME[r.level]:na?"Not applicable":null,ratedAt:r.ratedAt||null,firstJudgedIn:r.judgedIn||null,addedBy:r.addedBy||null,
      evidence:r.evidence||"",argument:r.argument||"",action:a?ACTN[a]:"",missing:(r.level==="partly"||r.level==="cannot"||r.level==="notmet")?(r.missing||""):"",
      riskAcceptedBy:r.level==="cannot"?(r.riskOwner||""):"",reopened:r.reopened||null,history:r.history||[]};});
}
function compReport(ck){
  const c=counts(ck), R=release(ck), ac=acceptance(ck), items=itemsFor(ck), c0=comp(ck);
  const c1=items.filter(x=>x.ratedAt&&(!x.plan.registeredAt||x.ratedAt<x.plan.registeredAt)).map(x=>x.id);
  return {component:{name:c0.name,kind:KINDS[c0.kind]||c0.kind,producer:c0.producer,version:c0.version},
    summary:{plansRegistered:c.plans,notApplicable:c.na,toRate:c.total,rated:c.done,notYetRated:c.left,met:c.by.met,partlyMet:c.by.partly,notMet:c.by.notmet,cannotJudge:c.by.cannot,
      coverageR:+c.R.toFixed(3),coverageR0:+c.R0.toFixed(3),deltaR:+c.dR.toFixed(3),deltaRSplit:c.added,
      coverageByGroup:Object.fromEntries(GROUPS.map(g=>[g.name,+c.grp[g.k].R.toFixed(3)])),
      coverageDefinition:"(Met + Partly met + Not met) / applicable criteria",c1RatedBeforeRegistration:c1},
    releaseCheck:{status:R.status==="ok"?"Ready to release":R.status==="no"?"Not ready":"Not decided",noNotMet:R.c1,notMet:R.notmet,
      coverageAtLeastRmin:R.cov.map(x=>({group:x.name,R:+x.R.toFixed(3),Rmin:x.min,ok:x.ok})),risksAccepted:R.owned,risksWithoutOwner:R.unowned,stillToRate:R.unrated},
    acceptanceCriterion:{registeredAt:S.accept.lockedAt||null,rule:"sum p(e,model) w(e) <= sum p(e,lecturers) w(e)",
      errorTypes:S.accept.rows.map(r=>({errorType:r.e,weight:num(r.w),pLecturers:num(r.pl),pModel:num((S.accept.model[ck]||{})[r.id])})),weightedModel:ac.sm,weightedLecturers:ac.sl,met:ac.ok},
    askProducer:items.filter(x=>x.action==="Ask producer").map(x=>({id:x.id,criterion:x.criterion,missing:x.missing})),
    ownTasks:items.filter(x=>x.action==="Own task").map(x=>({id:x.id,criterion:x.criterion,missing:x.missing})),
    fixBeforeRelease:items.filter(x=>x.action==="Fix before release").map(x=>({id:x.id,criterion:x.criterion,fix:x.missing})),
    ratings:items};
}
function report(aud){
  const base={tool:"ALTAI Rating Workbench "+VERSION,generated:now(),audience:aud,example:!!S.meta.example,rater:{type:S.meta.rater||"human"},
    case:S.meta.caseName,assessor:S.meta.assessor,evidenceCutoff:S.meta.cutoff,round:S.round,
    plan:{source:DATA.source,stakeholderCodes:DATA.stakeholderCodeStatus,holderDraft:DRAFT.source}};
  if(aud==="full") return Object.assign(base,{components:S.comps.map(c=>compReport(c.k)),Rmin:S.rmin,triggers:S.triggers,log:S.log,
    state:{comps:S.comps,r:S.r,accept:S.accept,rmin:S.rmin,triggers:S.triggers,log:S.log},
    note:"Every rating was assigned by the named assessor for the app side. Stakeholder groups enter only the release check."});
  const cr=compReport(S.comp);
  if(aud==="producer") return Object.assign(base,{component:cr.component,askProducer:cr.askProducer,
    criteriaProducerHoldsOrShares:cr.ratings.filter(x=>["Producer","Shared","Each its own"].includes(x.plan.holder)).map(x=>({id:x.id,criterion:x.criterion,holder:x.plan.holder,rating:x.rating,missing:x.missing})),
    disclosure:{coverageR0:cr.summary.coverageR0,coverageNow:cr.summary.coverageR,deltaR:cr.summary.deltaR,split:cr.summary.deltaRSplit}});
  if(aud==="users") return Object.assign(base,{component:cr.component,releaseDecision:cr.releaseCheck.status,acceptanceCriterion:{met:cr.acceptanceCriterion.met,rule:cr.acceptanceCriterion.rule},
    whatUsersMustKnow:cr.ratings.filter(x=>x.type==="U"&&x.rating&&x.rating!=="Not applicable").map(x=>({id:x.id,criterion:x.criterion,rating:x.rating,argument:x.argument})),
    openLimits:cr.ratings.filter(x=>x.rating==="Cannot judge"||x.rating==="Partly met"||x.rating==="Not met").map(x=>({id:x.id,criterion:x.criterion,rating:x.rating,riskAcceptedBy:x.riskAcceptedBy})),
    reassessmentTriggers:S.triggers.map(t=>({trigger:t.name,threshold:t.threshold+" "+t.unit,reopens:linkIds(t.links)}))});
  return Object.assign(base,cr,{Rmin:S.rmin,triggers:S.triggers.map(t=>Object.assign({},t,{links:linkIds(t.links)})),log:S.log});
}
function fname(aud,ext){return `altai-${aud}-${(S.meta.caseName||"case").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}${aud==="full"?"":"-"+(comp().name||"component").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.${ext}`;}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>el.hidden=true,2600);}
const AUD={producer:"For the producer",provider:"For the provider side",users:"For the AI users",full:"Full record"};
function showJSON(aud){
  const txt=JSON.stringify(report(aud),null,2);
  $("dlg").innerHTML=`<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT"><h2 id="dlgT">${AUD[aud]} · JSON</h2>
    <p class="small">Download saves the file when the app runs from GitHub Pages or a local copy. Inside a preview frame, use Copy.</p>
    <textarea id="jsonTxt" readonly>${esc(txt)}</textarea>
    <div class="row2"><button class="btn" type="button" id="dClose">Close</button><button class="btn" type="button" id="dCopy">Copy</button><button class="btn primary" type="button" id="dSave">Download</button></div></div></div>`;
  $("dlg").hidden=false;
  $("dClose").onclick=()=>{$("dlg").hidden=true;};
  $("dCopy").onclick=()=>{navigator.clipboard.writeText(txt).then(()=>toast("Copied")).catch(()=>{$("jsonTxt").select();toast("Selected. Press Ctrl+C or ⌘C");});};
  $("dSave").onclick=()=>{download(new Blob([txt],{type:"application/json"}),fname(aud,"json"));toast("Download started");};
}
const latin=s=>String(s??"").replace(/[→]/g,"->").replace(/[–—]/g,"-").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/Δ/g,"Delta ").replace(/[≥]/g,">=").replace(/[≤]/g,"<=").replace(/Σ/g,"sum ").replace(/·/g,"-").replace(/[^\x00-\xFF]/g,"?");
function makePDF(aud){
  if(!window.jspdf){toast("PDF library did not load. Check the connection and reload.");return;}
  const R=report(aud==="provider"?"provider":aud), P=report("provider"), {jsPDF}=window.jspdf, d=new jsPDF({unit:"pt",format:"a4"}), W=d.internal.pageSize.getWidth();
  const blue=[29,78,158], st={styles:{fontSize:7.5,cellPadding:3,valign:"top"},headStyles:{fillColor:blue}};
  const H=t=>{let y=d.lastAutoTable.finalY+28; if(y>760){d.addPage();y=52;} d.setFont("helvetica","bold");d.setFontSize(12);d.setTextColor(...blue);d.text(latin(t),40,y);return y+6;};
  const T=(head,body,extra)=>d.autoTable(Object.assign({startY:H.y,head:[head],body:body.length?body.map(r=>r.map(latin)):[[ "-", "None", ...head.slice(2).map(()=>"")].slice(0,head.length)]},st,extra||{}));
  const sec=(t,head,body,extra)=>{H.y=H(t);T(head,body,extra);};
  d.setFont("helvetica","bold");d.setFontSize(17);d.setTextColor(...blue);
  d.text(latin("ALTAI assessment - "+AUD[aud].toLowerCase()+(R.example?" (example, fictional case)":R.rater.type==="AI"?" (AI rater)":"")),40,52);
  const c0=P.component, s=P.summary, rc=P.releaseCheck;
  d.autoTable({startY:64,body:[["Case",R.case||"-"],["AI component",`${c0.name} (${c0.kind})${c0.producer?", producer "+c0.producer:""}${c0.version?", "+c0.version:""}`],["Assessor",R.assessor||"-"],["Evidence cut-off",R.evidenceCutoff||"-"],["Round",R.round],["Release decision",rc.status],["Generated",R.generated.slice(0,16).replace("T"," ")+" UTC"]].map(r=>r.map(latin)),theme:"plain",styles:{fontSize:9.5,cellPadding:2},columnStyles:{0:{fontStyle:"bold",cellWidth:110}}});
  if(aud!=="producer") d.autoTable({startY:d.lastAutoTable.finalY+12,head:[["Plans","To rate","Rated","Met","Partly met","Not met","Cannot judge","Not appl.","Coverage R","R0","Delta R"]],
    body:[[s.plansRegistered,s.toRate,s.rated,s.met,s.partlyMet,s.notMet,s.cannotJudge,s.notApplicable,(s.coverageR*100).toFixed(0)+"%",(s.coverageR0*100).toFixed(0)+"%",(s.deltaR*100).toFixed(0)+"%"]],styles:{fontSize:8.5,halign:"center"},headStyles:{fillColor:blue}});
  if(aud==="producer"){
    sec("What the app side asks you for (Ask producer)",["ID","Criterion","What is missing"],R.askProducer.map(x=>[x.id,x.criterion,x.missing]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:170}}});
    sec("Criteria you hold or share",["ID","Criterion","Holder","Rating","Missing"],R.criteriaProducerHoldsOrShares.map(x=>[x.id,x.criterion,x.holder,x.rating||"not rated",x.missing]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:150},2:{cellWidth:64},3:{cellWidth:60}}});
    const dsc=R.disclosure; sec("Coverage added by your disclosure",["Measure","Value"],[["R0 (public material only)",(dsc.coverageR0*100).toFixed(0)+"%"],["Now",(dsc.coverageNow*100).toFixed(0)+"%"],["Delta R",(dsc.deltaR*100).toFixed(0)+"%"],["Data-added",String(dsc.split.data)],["Model-added",String(dsc.split.model)],["Process-added",String(dsc.split.process)]]);
  }
  if(aud==="provider"){
    sec("Release check",["Condition","Result","Detail"],[["No Not met",rc.noNotMet?"Yes":"No",rc.notMet.join(", ")||"-"],...rc.coverageAtLeastRmin.map(x=>["Coverage "+x.group+" >= Rmin",x.ok===null?"Rmin not set":x.ok?"Yes":"No",(x.R*100).toFixed(0)+"%"+(x.Rmin==null?"":" / "+x.Rmin+"%")]),["Risks accepted",rc.risksWithoutOwner.length?"No":"Yes",rc.risksAccepted.map(o=>o.id+" "+o.by).join("; ")+(rc.risksWithoutOwner.length?" No owner: "+rc.risksWithoutOwner.join(", "):"")],["Acceptance criterion",P.acceptanceCriterion.met===null?"Not complete":P.acceptanceCriterion.met?"Met":"Not met","model "+P.acceptanceCriterion.weightedModel.toFixed(2)+" vs lecturers "+P.acceptanceCriterion.weightedLecturers.toFixed(2)]],{columnStyles:{0:{cellWidth:160},1:{cellWidth:70}}});
    sec("Fix before release",["ID","Criterion","What must be fixed"],R.fixBeforeRelease.map(x=>[x.id,x.criterion,x.fix]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:170}}});
    sec("Own tasks",["ID","Criterion","What is missing"],R.ownTasks.map(x=>[x.id,x.criterion,x.missing]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:170}}});
    sec("Ask producer",["ID","Criterion","What is missing"],R.askProducer.map(x=>[x.id,x.criterion,x.missing]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:170}}});
    const plans=R.ratings.filter(x=>x.plan.registeredAt);
    sec("Registered plans",["ID","Applies","Measure and rationale","Acceptance criterion (source)","Holder, classes","Registered"],plans.map(x=>[x.id,x.plan.applies?"Yes":"No: "+x.plan.notApplicableReason,x.plan.applies?x.plan.measure+"\n"+x.plan.measureRationale:"",x.plan.applies?x.plan.acceptanceCriterion+" ("+(SRC[x.plan.acceptanceCriterionSource]||"")+")":"",x.plan.applies?x.plan.holder+"\n"+x.plan.evidenceClasses.join(", "):"",x.plan.registeredAt.slice(0,16).replace("T"," ")+(x.plan.amendments.length?"\n"+x.plan.amendments.length+" amendment(s)":"")]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:56},4:{cellWidth:62},5:{cellWidth:66}}});
    const rated=R.ratings.filter(x=>x.rating&&x.rating!=="Not applicable");
    sec("Ratings",["ID","Criterion","Rating","Evidence","Argument"],rated.map(x=>[x.id,x.criterion,x.rating+(x.firstJudgedIn?"\n("+x.firstJudgedIn+")":""),x.evidence,x.argument]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:120},2:{cellWidth:56},3:{cellWidth:152},4:{cellWidth:153}}});
    sec("Re-assessment triggers",["Trigger","Threshold","Reopens"],R.triggers.map(t=>[t.name,(t.threshold||"not set")+" "+t.unit,t.links.join(", ")]));
  }
  if(aud==="users"){
    sec("What you need to know to use it",["ID","Criterion","Rating","Why"],R.whatUsersMustKnow.map(x=>[x.id,x.criterion,x.rating,x.argument]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:150},2:{cellWidth:60}}});
    sec("Open limits",["ID","Criterion","Rating","Risk accepted by"],R.openLimits.map(x=>[x.id,x.criterion,x.rating,x.riskAcceptedBy||"-"]),{columnStyles:{0:{cellWidth:34},1:{cellWidth:220},2:{cellWidth:70}}});
    sec("What reopens the assessment",["Trigger","Threshold","Criteria reopened"],R.reassessmentTriggers.map(t=>[t.trigger,t.threshold,t.reopens.join(", ")]));
  }
  const n=d.internal.getNumberOfPages();
  for(let p=1;p<=n;p++){d.setPage(p);d.setFont("helvetica","normal");d.setFontSize(7);d.setTextColor(110);
    d.text(latin((R.example?"EXAMPLE, FICTIONAL CASE. ":R.rater.type==="AI"?"AI RATER: plans written after seeing the evidence (C1 not met); not a human rating. ":"")+"Plan: "+R.plan.source+". Stakeholder codes and holder draft: drafts to be verified. Ratings are the assessor's own."),40,816,{maxWidth:W-110});
    d.text(p+" / "+n,W-40,816,{align:"right"});}
  try{d.save(fname(aud,"pdf"));toast("PDF download started");}catch(e){toast("Downloads are blocked here. Run the app from GitHub Pages.");}
}
function showOutputs(){S.view="release";save();renderAll();window.scrollTo(0,0);}

/* ---------- import ---------- */
function importReport(j){
  if(j&&j.state&&Array.isArray(j.state.comps)){ // v2 full record
    S=Object.assign(freshState(),{meta:{caseName:j.case||"",assessor:j.assessor||"",cutoff:j.evidenceCutoff||"",example:!!j.example,rater:(j.rater&&j.rater.type)||"human"}},j.state);
    S.comp=S.comps[0].k; S.round=j.round||"R0"; save();renderMeta();renderAll();toast(`Imported ${S.comps.length} component(s)`);return;}
  if(!j||!Array.isArray(j.ratings)) throw new Error("bad");
  // v1.x report: one stakeholder view becomes one component
  const back={"Met":"met","Partly met":"partly","Not met":"notmet","Cannot judge":"cannot"};
  const name=(j.component&&j.component.name)||`${(j.case||"Imported").replace(/^EXAMPLE:\s*/,"Example: ")}${j.stakeholder?` (${j.stakeholder} view)`:""}`;
  let c=S.comps.find(x=>x.name===name); if(!c){c={k:"c"+uid(),name,kind:"other",producer:"",version:""}; if(S.comps.length===1&&!counts(S.comps[0].k).plans) S.comps=[c]; else S.comps.push(c);}
  S.comp=c.k;
  S.meta={caseName:j.case||"",assessor:j.assessor||"",cutoff:j.evidenceCutoff||"",example:!!j.example,rater:(j.rater&&j.rater.type)||"human"};
  ITEMS.forEach(i=>{delete S.r[c.k+":"+i.id];});
  const holdBack={"App side":["yes","no"],"Producer":["no","yes"],"Shared":["no","no"],"Each its own":["yes","yes"]};
  j.ratings.forEach(x=>{if(!ITEMS.find(i=>i.id===x.id)) return; const r=rec(x.id), p=r.plan, q=x.plan||{};
    p.applies=q.applies===true?"yes":q.applies===false?"no":""; p.naReason=q.notApplicableReason||""; p.measure=q.measureChoice||""; p.measureOther=p.measure==="other"?String(q.measure||"").replace(/^Other: /,""):"";
    p.rationale=q.measureRationale||""; p.source=q.acceptanceCriterionSource||""; p.threshold=q.acceptanceCriterion||""; p.classes=Array.isArray(q.evidenceClasses)?q.evidenceClasses:[];
    if(q.q1AppSideAlone){p.q1=q.q1AppSideAlone;p.q2=q.q2ProducerWithoutUse||"";} else if(holdBack[q.holder]){[p.q1,p.q2]=holdBack[q.holder];}
    p.registeredAt=q.registeredAt||""; p.amendments=Array.isArray(q.amendments)?q.amendments:[];
    r.level=back[x.rating]||""; r.ratedAt=x.ratedAt||""; r.judgedIn=JUDGED(r.level)?(x.firstJudgedIn||"R0"):""; r.addedBy=x.addedBy||"";
    r.evidence=x.evidence||""; r.argument=x.argument||""; r.missing=x.missing||""; r.riskOwner=x.riskAcceptedBy||"";
    const held=x.missingHeldBy||""; r.action=x.action==="Ask producer"||held==="provider"?"ask":x.action==="Own task"||held==="customer"?"own":"";});
  const first=j.ratings.find(x=>x.plan&&x.plan.registeredAt); if(first) S.cur=first.id;
  S.view="bench"; save();renderMeta();renderAll();
  toast(`Imported ${j.ratings.length} records as “${name}”`+(j.stakeholder?". Old per-stakeholder file: answer Q1 and Q2 by amending a plan if needed.":""));
}
$("exBtn").onclick=()=>importReport(EXAMPLE);
$("outBtn").onclick=showOutputs;
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=e=>{const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{try{importReport(JSON.parse(rd.result));}catch(err){console.error(err);toast("That file is not a report JSON from this app.");}};
  rd.readAsText(f); e.target.value="";};
document.addEventListener("keydown",e=>{if(S.view!=="bench"||e.target.matches("input,textarea,select"))return;if(e.key==="ArrowRight")step(1);if(e.key==="ArrowLeft")step(-1);});
renderMeta();renderAll();
