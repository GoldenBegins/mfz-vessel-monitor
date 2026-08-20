(()=>{'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(v)):'—';
function ensure(){
 if(document.getElementById('monthly-port-intelligence'))return;
 const main=document.querySelector('main'),nav=document.querySelector('aside nav');
 if(!main||!nav)return;
 const s=document.createElement('section');s.id='monthly-port-intelligence';s.className='view';
 s.innerHTML=`<article class="panel"><div class="panel-head"><div><span class="kicker">Monthly Port Intelligence</span><h2>الملخص الشهري للميناءين</h2></div><span class="pill" id="mpiUpd">—</span></div>
 <p class="muted">Type Resolution يقيس اكتمال تصنيف الأنواع. Cargo DWT Coverage يقيس DWT داخل السفن المصنفة كبضائع فقط. TEU مؤشر سعة وليس مناولة فعلية، وأطنان General Cargo تقدير تخطيطي.</p>
 <div class="cards" id="mpiCards"></div>
 <div class="table-wrap"><table><thead><tr><th>الشهر</th><th>الميناء</th><th>الزيارات</th><th>Type Resolution</th><th>Cargo DWT</th><th>TEU Coverage</th><th>GC Coverage</th><th>TEU Proxy</th><th>GC Tons</th><th>الثقة</th></tr></thead><tbody id="mpiRows"></tbody></table></div></article>`;
 main.appendChild(s);
 const b=document.createElement('button');b.className='nav';b.dataset.view='monthly-port-intelligence';b.textContent='الملخص الشهري';nav.appendChild(b);
}
async function load(){
 ensure();
 try{
  const d=await fetch(`monthly_port_intelligence.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json());
  document.getElementById('mpiUpd').textContent=d.updatedAt||'—';
  const rows=d.rows||[], latest=rows.map(x=>x.Month).sort().pop(), lr=rows.filter(x=>x.Month===latest);
  document.getElementById('mpiCards').innerHTML=lr.map(x=>`<div class="metric"><div class="label">${E(x.Port)} · ${E(x.Month)}</div><div class="value">${N(x['Port Calls'])} زيارة</div><div class="muted">Type ${E(x['Type Resolution Coverage %'])}% · DWT ${E(x['Cargo DWT Coverage %'])}% · ${E(x['Data Confidence'])}</div></div>`).join('');
  document.getElementById('mpiRows').innerHTML=rows.slice().reverse().map(x=>`<tr><td>${E(x.Month)}</td><td><strong>${E(x.Port)}</strong></td><td>${N(x['Port Calls'])}</td><td>${E(x['Type Resolution Coverage %'])}%</td><td>${E(x['Cargo DWT Coverage %'])}%</td><td>${E(x['Container TEU Coverage %'])}%</td><td>${E(x['General Cargo Estimate Coverage %'])}%</td><td>${N(x['Container TEU Capacity Proxy'])}</td><td>${N(x['General Cargo Estimated Tons'])}</td><td>${E(x['Data Confidence'])}</td></tr>`).join('')||'<tr><td colspan="10">لا توجد بيانات</td></tr>';
 }catch(e){console.error(e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

/* DYNAMIC_NAV_HANDLER_V1 */
document.addEventListener('click',function(e){
  const b=e.target.closest&&e.target.closest('.nav[data-view]');
  if(!b)return;
  const id=b.dataset.view;
  const view=document.getElementById(id);
  if(!view)return;

  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  view.classList.add('active-view');

  const title=document.getElementById('pageTitle');
  if(title)title.textContent=(b.textContent||'').trim();

  if(id==='monthly-port-intelligence'){
    const upd=document.getElementById('mpiUpd');
    const top=document.querySelector('main');
    if(top)top.scrollTo?top.scrollTo({top:0,behavior:'smooth'}):window.scrollTo(0,0);
    if(upd&&upd.textContent==='—'){
      setTimeout(()=>window.dispatchEvent(new Event('monthly-port-refresh')),20);
    }
  }
});

