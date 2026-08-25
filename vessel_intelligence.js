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
    <div class="panel-head"><div><span class="kicker">Vessels & Shipping Lines</span><h2>السفن والخطوط والخدمات الملاحية</h2></div><span class="pill" id="viUpdated">—</span></div>
    <p class="muted">القائمة مرتبطة مباشرة ببيانات Vessel Intelligence. أي Carrier / Service / Voyage متاح من المصادر المرتبطة يظهر هنا تلقائيًا عند تحديث الملف، بدون إدخال يدوي في الواجهة.</p>
    <div class="cards" id="viCards"></div>
    <div id="viLineSummary" class="quality-list" style="margin:12px 0"></div>
    <input id="viSearch" placeholder="ابحث باسم السفينة أو IMO أو الخط الملاحي أو الخدمة أو الرحلة..." style="width:100%;margin:14px 0;padding:12px;border-radius:10px;border:1px solid rgba(120,150,170,.3);background:transparent;color:inherit">
    <div class="table-wrap"><table><thead><tr><th>السفينة</th><th>IMO</th><th>النوع</th><th>DWT</th><th>TEU</th><th>الخط الملاحي</th><th>الخدمة</th><th>الرحلة</th><th>مصراتة</th><th>بنغازي</th><th>آخر ميناء</th><th>المصادر</th></tr></thead><tbody id="viRows"></tbody></table></div>
  </article>`;
  main.appendChild(s);
  const b=document.createElement('button');
  b.className='nav';b.dataset.view='vessel-intelligence';b.textContent='السفن والخطوط الملاحية';nav.appendChild(b);
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
  const carriers=new Set(),services=new Set(),voyages=new Set();
  DATA.forEach(r=>{if(nonempty(r.Carrier))carriers.add(nonempty(r.Carrier));if(nonempty(r.Service))services.add(nonempty(r.Service));if(nonempty(r.Voyage))voyages.add(nonempty(r.Voyage))});
  return {carriers,services,voyages};
}
function draw(q=''){
  q=String(q||'').toLowerCase();
  const xs=!q?DATA:DATA.filter(r=>[r.Vessel,r.IMO,r.MMSI,r.Carrier,r.Service,r.Voyage,r['Vessel Type'],r['Last Observed Port']].some(v=>String(v||'').toLowerCase().includes(q)));
  document.getElementById('viRows').innerHTML=xs.slice(0,500).map(r=>`<tr>
    <td><strong>${e(r.Vessel||'—')}</strong></td><td>${e(r.IMO||'—')}</td><td>${e(r['Vessel Type']||'—')}</td><td>${f(r.DWT)}</td><td>${f(r['TEU Capacity'])}</td>
    <td>${e(r.Carrier||'—')}</td><td>${e(r.Service||'—')}</td><td>${e(r.Voyage||'—')}</td>
    <td>${f(r['Misurata Calls'])}</td><td>${f(r['Benghazi Calls'])}</td><td>${e(r['Last Observed Port']||'—')}</td><td>${e(r.Sources||'—')}</td>
  </tr>`).join('')||'<tr><td colspan="12">لا توجد نتائج</td></tr>';
}
function renderSummary(s){
  const c=counts();
  document.getElementById('viCards').innerHTML=[
    ['السفن',s.vessels||DATA.length,'IMO'],
    ['الخطوط المعروفة',c.carriers.size,'Carrier'],
    ['الخدمات المعروفة',c.services.size,'Service'],
    ['الرحلات المعروفة',c.voyages.size,'Voyage'],
    ['تغطية DWT',`${s.dwtCoveragePct||0}%`,`${s.dwtKnown||0} سفينة`],
    ['TEU للحاويات',`${s.containerTeuCoveragePct||0}%`,`${s.containerTeuKnown||0}/${s.containerVessels||0}`]
  ].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');
  const carrierRows=[...c.carriers].sort((a,b)=>a.localeCompare(b)).slice(0,30);
  document.getElementById('viLineSummary').innerHTML=carrierRows.length
    ?`<div><b>الخطوط/الناقلون المتوفرون حاليًا (${c.carriers.size})</b><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${carrierRows.map(x=>`<span class="pill">${e(x)}</span>`).join('')}</div></div>`
    :'<div class="muted">لا توجد أسماء خطوط ملاحية مؤكدة في البيانات الحالية بعد؛ ستظهر تلقائيًا عند وصولها من مصادر الإثراء.</div>';
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
