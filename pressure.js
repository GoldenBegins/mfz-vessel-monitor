(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arPort=p=>p==='Misurata'?'مصراتة':'بنغازي';
  const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
  const levelAr=v=>v==='High'?'مرتفع':v==='Medium'?'متوسط':v==='Low'?'منخفض':'غير معروف';
  const card=(l,v,s)=>`<div class="pressure-mini"><small>${esc(l)}</small><b>${esc(v)}</b><span>${esc(s||'')}</span></div>`;
  function portPanel(m){
    if(!m)return '';
    const ratio=Number.isFinite(Number(m.anchorageToInPortRatio))?fmt(m.anchorageToInPortRatio,2):'—';
    const stay=Number.isFinite(Number(m.avgPortStayProxyDays))?`${fmt(m.avgPortStayProxyDays,1)} يوم`:'—';
    const wait=Number.isFinite(Number(m.avgAnchorageWaitHours))?`${fmt(m.avgAnchorageWaitHours,1)} ساعة`:'—';
    return `<article class="panel pressure-port"><div class="panel-head"><div><span class="kicker">Port Pressure</span><h2>${arPort(m.port)}</h2></div><span class="pressure-level ${String(m.pressureLevel||'').toLowerCase()}">${levelAr(m.pressureLevel)}</span></div><div class="pressure-metrics">${card('الوصول / يوم',fmt(m.arrivalsPerDay,2),`${m.arrivals||0} زيارة في الفترة`)}${card('المخطاف ÷ داخل الميناء',ratio,`${m.anchorageActive||0} مخطاف / ${m.currentInPort||0} داخل`)}${card('متوسط انتظار المخطاف',wait,'زمن رصد تقريبي')}${card('متوسط البقاء المرصود',stay,'Port Stay Proxy')}${card('زيارات مفتوحة',String(m.openCalls||0),`مغلقة ${m.closedCalls||0}`)}</div><div class="pressure-reason">${esc(m.likelyReason||'')}</div></article>`;
  }
  function render(d){
    const box=d?.portPressure,root=document.getElementById('pressurePanels');
    if(!root)return;
    if(!box||!box.ports){root.innerHTML='<article class="panel"><p class="muted">لم تُحسب مؤشرات الضغط بعد.</p></article>';return}
    root.innerHTML=portPanel(box.ports.Misurata)+portPanel(box.ports.Benghazi);
    const p=document.getElementById('pressurePeriod');if(p)p.textContent=`${box.periodStart||'—'} → ${box.periodEnd||'—'} · ${box.effectiveDays||0} أيام`;
    const n=document.getElementById('pressureMethod');if(n)n.textContent='المؤشرات تشغيلية مبنية على الرصد. مدة البقاء ليست زمن رصيف أو تفريغ رسمي، والسبب المعروض فرضية تحليلية لا حكمًا رسميًا.';
  }
  async function loadPressure(){try{const r=await fetch(`data.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);render(await r.json())}catch(e){console.error('Port pressure load failed:',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPressure,{once:true});else loadPressure();
  document.addEventListener('click',e=>{const b=e.target.closest?.('.nav[data-view="pressure"]');if(b)setTimeout(loadPressure,50)});
})();
