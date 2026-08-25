(() => {'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US').format(Number(v)):'—';
let DATA=[];
let LAST_UPDATED='—';
function ensure(){
  if(document.getElementById('vessel-intelligence'))return;
  const main=document.querySelector('main'),nav=document.querySelector('aside nav');
  if(!main||!nav)return;
  const s=document.createElement('section');
  s.id='vessel-intelligence';
  s.className='view';
  s.innerHTML=`<article class="panel">
    <div class="panel-head"><div><span class="kicker">Vessels · Shipping Lines · Libya Agents</span><h2>السفن والخطوط والوكلاء الملاحيون</h2></div><span class="pill" id="viUpdated">—</span></div>
    <p class="muted">القائمة مرتبطة مباشرة ببيانات Vessel Intelligence. الخط الملاحي والخدمة والرحلة والوكيل الملاحي في ليبيا تظهر فقط عندما تكون لدينا بيانات موثقة مرتبطة بالـIMO، وتتحدث تلقائيًا مع ملف البيانات.</p>
    <div class="cards" id="viCards"></div>
    <div id="viLineSummary" class="quality-list" style="margin:12px 0"></div>
    <input id="viSearch" placeholder="ابحث باسم السفينة أو IMO أو الخط أو الخدمة أو الرحلة أو الوكيل الملاحي..." style="width:100%;margin:14px 0;padding:12px;border-radius:10px;border:1px solid rgba(120,150,170,.3);background:transparent;color:inherit">
    <div class="table-wrap"><table><thead><tr><th>السفينة</th><th>IMO</th><th>النوع</th><th>DWT</th><th>TEU</th><th>الخط الملاحي</th><th>الخدمة</th><th>الرحلة</th><th>الوكيل في ليبيا</th><th>بيانات الوكالة</th><th>مصراتة</th><th>بنغازي</th><th>آخر ميناء</th><th>المصادر</th></tr></thead><tbody id="viRows"></tbody></table></div>
  </article>`;
  main.appendChild(s);
  const b=document.createElement('button');
  b.className='nav';b.dataset.view='vessel-intelligence';b.textContent='السفن والخطوط والوكلاء';nav.appendChild(b);
  b.addEventListener('click',()=>{
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
    s.classList.add('active-view');
    const title=document.getElementById('pageTitle');if(title)title.textContent=b.textContent;
    const updated=document.getElementById('updatedAt');if(updated)updated.textContent=LAST_UPDATED;
  });
}
function nonempty(v){return String(v||'').trim()}
function counts(){
  const carriers=new Set(),services=new Set(),voyages=new Set(),agents=new Set();
  DATA.forEach(r=>{
    if(nonempty(r.Carrier))carriers.add(nonempty(r.Carrier));
    if(nonempty(r.Service))services.add(nonempty(r.Service));
    if(nonempty(r.Voyage))voyages.add(nonempty(r.Voyage));
    if(nonempty(r['Last Known Libya Agent']))agents.add(nonempty(r['Last Known Libya Agent']));
  });
  return {carriers,services,voyages,agents};
}
function agencyMeta(r){
  const parts=[];
  if(nonempty(r['Last Agent Port']))parts.push(r['Last Agent Port']);
  if(nonempty(r['Last Agent Stage']))parts.push(r['Last Agent Stage']);
  const when=nonempty(r['Last Agent Departure'])||nonempty(r['Last Agent Arrival']);
  if(when)parts.push(when);
  const n=Number(r['Agency Records Count']||0);
  if(n>0)parts.push(`${n} سجل`);
  return parts.join(' · ')||'—';
}
function draw(q=''){
  q=String(q||'').toLowerCase();
  const xs=!q?DATA:DATA.filter(r=>[r.Vessel,r.IMO,r.MMSI,r.Carrier,r.Service,r.Voyage,r['Vessel Type'],r['Last Observed Port'],r['Last Known Libya Agent'],r['Last Agent Port'],r['Last Agent Stage'],r['Last Agent Arrival'],r['Last Agent Departure']].some(v=>String(v||'').toLowerCase().includes(q)));
  document.getElementById('viRows').innerHTML=xs.slice(0,500).map(r=>`<tr>
    <td><strong>${e(r.Vessel||'—')}</strong></td><td>${e(r.IMO||'—')}</td><td>${e(r['Vessel Type']||'—')}</td><td>${f(r.DWT)}</td><td>${f(r['TEU Capacity'])}</td>
    <td>${e(r.Carrier||'—')}</td><td>${e(r.Service||'—')}</td><td>${e(r.Voyage||'—')}</td>
    <td><strong>${e(r['Last Known Libya Agent']||'—')}</strong></td><td>${e(agencyMeta(r))}</td>
    <td>${f(r['Misurata Calls'])}</td><td>${f(r['Benghazi Calls'])}</td><td>${e(r['Last Observed Port']||'—')}</td><td>${e(r.Sources||'—')}</td>
  </tr>`).join('')||'<tr><td colspan="14">لا توجد نتائج</td></tr>';
}
function renderSummary(s){
  const c=counts();
  document.getElementById('viCards').innerHTML=[
    ['السفن',s.vessels||DATA.length,'IMO'],
    ['الخطوط المعروفة',c.carriers.size,'Carrier'],
    ['الوكلاء المعروفون',c.agents.size,'Libya Agent'],
    ['الخدمات المعروفة',c.services.size,'Service'],
    ['الرحلات المعروفة',c.voyages.size,'Voyage'],
    ['تغطية DWT',`${s.dwtCoveragePct||0}%`,`${s.dwtKnown||0} سفينة`],
    ['TEU للحاويات',`${s.containerTeuCoveragePct||0}%`,`${s.containerTeuKnown||0}/${s.containerVessels||0}`]
  ].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');
  const carrierRows=[...c.carriers].sort((a,b)=>a.localeCompare(b)).slice(0,20);
  const agentRows=[...c.agents].sort((a,b)=>a.localeCompare(b)).slice(0,20);
  const lineBlock=carrierRows.length?`<div><b>الخطوط/الناقلون (${c.carriers.size})</b><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${carrierRows.map(x=>`<span class="pill">${e(x)}</span>`).join('')}</div></div>`:'<div class="muted">لا توجد خطوط مؤكدة حاليًا.</div>';
  const agentBlock=agentRows.length?`<div style="margin-top:12px"><b>الوكلاء الملاحيون في ليبيا (${c.agents.size})</b><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${agentRows.map(x=>`<span class="pill">${e(x)}</span>`).join('')}</div></div>`:'<div class="muted" style="margin-top:12px">لا توجد بيانات وكالة منشورة في Vessel Intelligence بعد.</div>';
  document.getElementById('viLineSummary').innerHTML=lineBlock+agentBlock;
}
async function load(){
  ensure();
  const d=await fetch(`vessel_intelligence.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`vessel_intelligence.json HTTP ${r.status}`);return r.json()});
  DATA=Array.isArray(d.vessels)?d.vessels:[];
  LAST_UPDATED=d.updatedAt||'—';
  const s=d.summary||{};
  document.getElementById('viUpdated').textContent=`آخر تحديث: ${LAST_UPDATED}`;
  renderSummary(s);
  const i=document.getElementById('viSearch');
  draw(i?i.value:'');
  if(i&&!i.dataset.b){i.dataset.b='1';i.addEventListener('input',()=>draw(i.value))}
}
async function safeReload(){try{await load()}catch(err){console.error('vessel intelligence reload',err)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safeReload,{once:true});else safeReload();
setInterval(()=>{if(!document.hidden)safeReload()},5*60*1000);
})();
