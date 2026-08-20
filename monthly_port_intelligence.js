(()=>{'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(v)):'—';
function ensure(){
 if(document.getElementById('monthly-port-intelligence'))return;
 const main=document.querySelector('main'),nav=document.querySelector('aside nav');
 if(!main||!nav)return;
 const s=document.createElement('section');s.id='monthly-port-intelligence';s.className='view';
 s.innerHTML=`<article class="panel"><div class="panel-head"><div><span class="kicker">Monthly Port Intelligence</span><h2>الملخص الشهري للميناءين</h2></div><span class="pill" id="mpiUpd">—</span></div><p class="muted">TEU هنا مؤشر سعة سفن الحاويات وليس مناولة فعلية. أطنان البضائع العامة تقدير تخطيطي وليست بيانًا رسميًا.</p><div class="cards" id="mpiCards"></div><div class="table-wrap"><table><thead><tr><th>الشهر</th><th>الميناء</th><th>الزيارات</th><th>حاويات</th><th>TEU Proxy</th><th>بضائع عامة</th><th>طن مقدر</th><th>نطاق التقدير</th><th>DWT coverage</th><th>الثقة</th></tr></thead><tbody id="mpiRows"></tbody></table></div></article>`;
 main.appendChild(s);
 const b=document.createElement('button');b.className='nav';b.dataset.view='monthly-port-intelligence';b.textContent='الملخص الشهري';nav.appendChild(b);
}
async function load(){
 ensure();
 try{
  const d=await fetch(`monthly_port_intelligence.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json());
  document.getElementById('mpiUpd').textContent=d.updatedAt||'—';
  const rows=d.rows||[], latest=rows.map(x=>x.Month).sort().pop(), lr=rows.filter(x=>x.Month===latest);
  document.getElementById('mpiCards').innerHTML=lr.map(x=>`<div class="metric"><div class="label">${E(x.Port)} · ${E(x.Month)}</div><div class="value">${N(x['Port Calls'])} زيارة</div><div class="muted">${N(x['General Cargo Estimated Tons'])} طن GC · ${N(x['Container TEU Capacity Proxy'])} TEU proxy</div></div>`).join('');
  document.getElementById('mpiRows').innerHTML=rows.slice().reverse().map(x=>`<tr><td>${E(x.Month)}</td><td><strong>${E(x.Port)}</strong></td><td>${N(x['Port Calls'])}</td><td>${N(x['Container Calls'])}</td><td>${N(x['Container TEU Capacity Proxy'])}</td><td>${N(x['General Cargo Calls'])}</td><td>${N(x['General Cargo Estimated Tons'])}</td><td>${N(x['General Cargo Low'])}–${N(x['General Cargo High'])}</td><td>${E(x['DWT Coverage %'])}%</td><td>${E(x['Data Confidence'])}</td></tr>`).join('')||'<tr><td colspan="10">لا توجد بيانات</td></tr>';
 }catch(e){console.error(e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
