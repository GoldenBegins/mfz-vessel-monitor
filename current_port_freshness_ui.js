(() => {
'use strict';

const FRESH_HOURS=6;
const STALE_HOURS=12;

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function parseObserved(v){
  const s=String(v||'').trim();
  if(!s)return null;
  let d=new Date(s);
  if(!isNaN(d))return d;
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(!m)return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0));
}
function ageHours(v){
  const d=parseObserved(v);
  if(!d)return null;
  return Math.max(0,(Date.now()-d.getTime())/3600000);
}
function ageText(h){
  if(h==null)return 'وقت الرصد غير متاح';
  if(h<1)return `${Math.max(1,Math.round(h*60))} دقيقة`;
  if(h<24)return `${h.toFixed(h<10?1:0)} ساعة`;
  return `${(h/24).toFixed(1)} يوم`;
}
function destArabic(c){
  const s=String(c||'');
  if(s==='To Misurata')return 'إلى مصراتة';
  if(s==='To Benghazi')return 'إلى بنغازي';
  if(s==='Other Port')return 'ميناء آخر';
  return 'الوجهة غير مؤكدة';
}
function fmtDate(v){
  const d=parseObserved(v);
  if(!d)return esc(v||'—');
  const p=n=>String(n).padStart(2,'0');
  return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function badgeClass(conf){
  return String(conf||'Medium').toLowerCase().replace(/\s+/g,'');
}
function ensureStalePanel(){
  const anch=document.getElementById('anchorage');
  if(!anch)return null;
  let panel=document.getElementById('staleCurrentPortPanel');
  if(panel)return panel;
  const grids=anch.querySelectorAll('.current-port-grid');
  const anchor=grids[grids.length-1];
  panel=document.createElement('article');
  panel.id='staleCurrentPortPanel';
  panel.className='panel stale-current-panel';
  panel.innerHTML=`
    <div class="panel-head">
      <div>
        <span class="kicker">Freshness Control</span>
        <h2>آخر رصد داخل الميناء — يحتاج تحديث</h2>
        <p class="muted">هذه السفن كان آخر رصد موثوق لها داخل الميناء أقدم من ${STALE_HOURS} ساعة. لا نعتبرها داخل الميناء الآن، ولا نعتبرها غادرت حتى يظهر دليل أحدث.</p>
      </div>
      <span class="pill warn" id="staleCurrentCount">0</span>
    </div>
    <div class="table-wrap">
      <table class="freshness-table">
        <thead><tr><th>الميناء</th><th>السفينة</th><th>IMO / MMSI</th><th>آخر رصد</th><th>عمر الرصد</th><th>آخر حالة</th></tr></thead>
        <tbody id="staleCurrentRows"></tbody>
      </table>
    </div>`;
  if(anchor)anchor.insertAdjacentElement('afterend',panel);
  else anch.appendChild(panel);
  return panel;
}
function rowHtml(r,h,warning){
  const warn=warning?`<small class="freshness-warning">الرصد قديم: ${ageText(h)}</small>`:'';
  return `<tr>
    <td><strong>${esc(r.vessel||'—')}</strong>${warn}</td>
    <td>${esc(r.imo||r.mmsi||'—')}${r.imo&&r.mmsi?`<small class="cell-sub">MMSI ${esc(r.mmsi)}</small>`:''}</td>
    <td>${Number(r.sog||0).toFixed(1)}</td>
    <td>${Number(r.distanceKm||0).toFixed(1)} كم</td>
    <td><span class="dest-chip">${esc(destArabic(r.destinationClass))}</span><small class="cell-sub">${esc(r.destination||'—')}</small></td>
    <td>${fmtDate(r.observedAt||'')}</td>
    <td><span class="badge ${badgeClass(r.confidence)}">${esc(r.confidence||'Medium')}</span></td>
  </tr>`;
}
function staleRow(r,h){
  return `<tr>
    <td>${esc(r.port||'—')}</td>
    <td><strong>${esc(r.vessel||'—')}</strong></td>
    <td>${esc(r.imo||r.mmsi||'—')}</td>
    <td>${fmtDate(r.observedAt||'')}</td>
    <td><span class="stale-age">${ageText(h)}</span></td>
    <td>آخر رصد: داخل الميناء</td>
  </tr>`;
}
async function applyFreshness(){
  try{
    const d=await fetch(`data.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json());
    const cp=d?.anchorage?.currentInPort||{};
    const ports=[['Misurata','misInPortRows','misInPortCount'],['Benghazi','benInPortRows','benInPortCount']];
    const stale=[];

    for(const [port,bodyId,countId] of ports){
      const all=Array.isArray(cp[port])?cp[port]:[];
      const fresh=[],warn=[];
      for(const r of all){
        r.port=port;
        const h=ageHours(r.observedAt);
        if(h==null || h>STALE_HOURS) stale.push([r,h]);
        else if(h>FRESH_HOURS) warn.push([r,h]);
        else fresh.push([r,h]);
      }
      const visible=[...fresh,...warn];
      const tb=document.getElementById(bodyId);
      const ct=document.getElementById(countId);
      if(tb){
        tb.innerHTML=visible.map(([r,h])=>rowHtml(r,h,h>FRESH_HOURS)).join('') ||
          '<tr><td colspan="7">لا توجد سفن برصد حديث يؤكد وجودها داخل الميناء الآن</td></tr>';
      }
      if(ct)ct.textContent=`${visible.length} داخل الميناء`;
    }

    const panel=ensureStalePanel();
    if(panel){
      const rows=document.getElementById('staleCurrentRows');
      const count=document.getElementById('staleCurrentCount');
      if(rows)rows.innerHTML=stale.map(([r,h])=>staleRow(r,h)).join('') ||
        '<tr><td colspan="6">لا توجد حالات قديمة حاليًا</td></tr>';
      if(count)count.textContent=`${stale.length} يحتاج تحديث`;
      panel.style.display=stale.length?'block':'none';
    }

    document.body.dataset.currentPortFreshnessUpdated=new Date().toISOString();
  }catch(e){
    console.error('Current Port Freshness V2',e);
  }
}
function style(){
  if(document.getElementById('currentPortFreshnessStyle'))return;
  const s=document.createElement('style');
  s.id='currentPortFreshnessStyle';
  s.textContent=`
    .freshness-warning{display:block;margin-top:5px;color:#f2b84b;font-size:9px}
    .stale-current-panel{border-color:#65522a}
    .stale-age{color:#ffd37a;font-weight:700}
    .freshness-table{min-width:720px}
    @media(max-width:760px){
      .stale-current-panel .table-wrap{overflow:visible!important}
      .stale-current-panel .freshness-table{min-width:0!important}
    }`;
  document.head.appendChild(s);
}
function boot(){
  style();
  setTimeout(applyFreshness,250);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.nav[data-view="anchorage"]') || e.target.closest?.('.mobile-bottom-item[data-view="anchorage"]')){
      setTimeout(applyFreshness,350);
    }
  });
  window.addEventListener('focus',()=>setTimeout(applyFreshness,150));
  setInterval(applyFreshness,10*60*1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
