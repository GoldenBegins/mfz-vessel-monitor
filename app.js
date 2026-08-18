const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const fmt=n=>new Intl.NumberFormat('en-US').format(n??0);const badge=c=>`<span class="badge ${String(c).toLowerCase().replace(/\s+/g,'')}">${c}</span>`;const valueOrDash=(v,status)=>status==='Verified Actual'?fmt(v):'—';async function load(){const d=await fetch('data.json',{cache:'no-store'}).then(r=>r.json());render(d)}function renderExpected(d){const expected=d.expectedArrivals||[];const statusOf=r=>String(r.status||'').toLowerCase();const isPlanned=r=>statusOf(r).includes('planned');const isArrived=r=>statusOf(r).includes('arrived');const isOverdue=r=>statusOf(r).includes('overdue');const active=r=>!statusOf(r).includes('archived');const misAll=expected.filter(r=>r.port==='Misurata'&&active(r));const benAll=expected.filter(r=>r.port==='Benghazi'&&active(r));const misPlanned=misAll.filter(isPlanned);const benPlanned=benAll.filter(isPlanned);const arrived=expected.filter(isArrived);const overdue=expected.filter(isOverdue);const mstCount=expected.filter(r=>String(r.source||'').includes('MyShipTracking')).length;const flexCount=expected.filter(r=>String(r.source||'').includes('Flexport Atlas')).length;$('#expectedCards').innerHTML=[['متوقع ميناء المنطقة الحرة بمصراتة',misPlanned.length,'Combined sources'],['متوقع ميناء بنغازي',benPlanned.length,'Combined sources'],['وصلت بالفعل',arrived.length,'Matched with live monitoring'],['متأخرة ولم تؤكد',overdue.length,'Overdue / Not Confirmed'],['MyShipTracking',mstCount,'Source coverage'],['Flexport Atlas',flexCount,'Source coverage']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');$('#misExpectedCount').textContent=`Expected ${misPlanned.length}`;$('#benExpectedCount').textContent=`Expected ${benPlanned.length}`;const row=r=>`<tr><td>${r.vessel||'—'}</td><td>${r.imo||'—'}</td><td>${r.type||'—'}</td><td>${r.dwt?fmt(r.dwt):'—'}</td><td>${r.eta||'—'}</td><td>${r.source||'—'}</td><td>${r.status||'—'}</td></tr>`;$('#misExpectedRows').innerHTML=misAll.map(row).join('')||'<tr><td colspan="7">لا توجد سفن متوقعة حاليًا</td></tr>';$('#benExpectedRows').innerHTML=benAll.map(row).join('')||'<tr><td colspan="7">لا توجد سفن متوقعة حاليًا</td></tr>'}function renderFlexport(d){const ports=d.flexportPorts||[];const vessels=d.flexportVessels||[];const verified=vessels.filter(r=>String(r.status||'').startsWith('Verified by exact IMO'));const failed=vessels.filter(r=>String(r.status||'').startsWith('Not found'));const other=vessels.length-verified.length-failed.length;const mis=ports.find(r=>r.port==='Misurata')||{};const ben=ports.find(r=>r.port==='Benghazi')||{};$('#flexportCards').innerHTML=[['خدمات مصراتة',mis.services||0,'Ocean services'],['خدمات بنغازي',ben.services||0,'Ocean services'],['رحلات مجدولة مصراتة',mis.scheduledCalls||0,'Scheduled vessel calls'],['رحلات مجدولة بنغازي',ben.scheduledCalls||0,'Scheduled vessel calls'],['سفن موثقة من Flexport',verified.length,'Verified vessel profiles'],['غير متاحة حاليًا',failed.length+Math.max(0,other),'محفوظة في الخلفية ولا تظهر في الجدول']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');const summary=r=>r&&r.port?`<div class="quality-item"><strong>${r.unlocode||'—'}</strong><span>${fmt(r.services||0)} خدمات بحرية · ${fmt(r.scheduledCalls||0)} رحلات سفن مجدولة · ${fmt(r.terminals||0)} محطة</span></div><div class="quality-item"><strong>الخدمات</strong><span>${r.servicesText||'لا توجد تفاصيل متاحة'}</span></div>`:'<p class="muted">لا توجد بيانات Flexport متاحة حاليًا</p>';$('#flexMisSummary').innerHTML=summary(mis);$('#flexBenSummary').innerHTML=summary(ben);const rows=verified.slice().sort((a,b)=>String(a.destination||'').localeCompare(String(b.destination||''))).map(r=>`<tr><td>${r.vessel||'—'}</td><td>${r.imo||'—'}</td><td>${r.type||'—'}</td><td>${r.dwt?fmt(r.dwt):'—'}</td><td>${r.teu?fmt(r.teu):'—'}</td><td>${r.destination||'—'}</td><td>${r.eta||'—'}</td><td>${r.service||r.carrier||'—'}</td><td>${r.voyage||'—'}</td></tr>`).join('');$('#flexVesselRows').innerHTML=rows||'<tr><td colspan="9">لا توجد سفن موثقة من Flexport حاليًا</td></tr>'}
function waitText(hours){
  const h=Number(hours||0);
  if(h<1)return `${Math.round(h*60)} دقيقة`;
  if(h<24)return `${h.toFixed(h<10?1:0)} ساعة`;
  return `${(h/24).toFixed(1)} يوم`;
}
function destinationArabic(c){
  const s=String(c||'');
  if(s==='To Misurata')return 'إلى مصراتة';
  if(s==='To Benghazi')return 'إلى بنغازي';
  if(s==='Other Port')return 'ميناء آخر';
  return 'الوجهة غير مؤكدة';
}
function renderAnchorage(d){
  const a=d.anchorage||{};
  const sm=a.summary||{};
  const mis=sm.Misurata||{};
  const ben=sm.Benghazi||{};
  const active=a.active||[];
  const misRows=active.filter(r=>r.port==='Misurata');
  const benRows=active.filter(r=>r.port==='Benghazi');

  const total=(mis.active||0)+(ben.active||0);
  const allWait=active.map(r=>Number(r.waitingHours||0));
  const longest=allWait.length?Math.max(...allWait):0;

  $('#anchorageCards').innerHTML=[
    ['في المخطاف الآن',total,'الميناءان'],
    ['مخطاف مصراتة',mis.active||0,`متوسط ${waitText(mis.avgWaitingHours||0)}`],
    ['مخطاف بنغازي',ben.active||0,`متوسط ${waitText(ben.avgWaitingHours||0)}`],
    ['أطول انتظار حالي',waitText(longest),'Observed waiting time']
  ].map(x=>`<div class="metric anchor-metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');

  $('#misAnchorageCount').textContent=`${mis.active||0} في المخطاف`;
  $('#benAnchorageCount').textContent=`${ben.active||0} في المخطاف`;

  const stat=(s)=>`<span><b>${waitText(s.avgWaitingHours||0)}</b><small>متوسط الانتظار</small></span><span><b>${waitText(s.medianWaitingHours||0)}</b><small>الوسيط</small></span><span><b>${waitText(s.longestWaitingHours||0)}</b><small>الأطول</small></span><span><b>${s.destinationConfirmed||0}</b><small>وجهتها مؤكدة للميناء</small></span>`;
  $('#misAnchorageStats').innerHTML=stat(mis);
  $('#benAnchorageStats').innerHTML=stat(ben);

  const row=r=>`<tr>
    <td><strong>${r.vessel||'—'}</strong></td>
    <td>${r.imo||r.mmsi||'—'}${r.imo&&r.mmsi?`<small class="cell-sub">${r.mmsi}</small>`:''}</td>
    <td>${Number(r.distanceKm||0).toFixed(1)} كم</td>
    <td>${Number(r.sog||0).toFixed(1)}</td>
    <td><span class="dest-chip">${destinationArabic(r.destinationClass)}</span><small class="cell-sub">${r.destination||'—'}</small></td>
    <td><strong class="wait-value">${waitText(r.waitingHours||0)}</strong></td>
    <td>${r.firstSeen||'—'}</td>
    <td>${badge(r.confidence||'Low')}</td>
  </tr>`;

  $('#misAnchorageRows').innerHTML=misRows.map(row).join('')||'<tr><td colspan="8">لا توجد سفن مؤكدة في المخطاف حاليًا</td></tr>';
  $('#benAnchorageRows').innerHTML=benRows.map(row).join('')||'<tr><td colspan="8">لا توجد سفن مؤكدة في المخطاف حاليًا</td></tr>';

  $('#anchorageUpdated').textContent=`آخر رصد: ${a.updatedAt||d.anchorageUpdatedAt||'—'}`;
  $('#anchorageHistoryRows').innerHTML=(a.recentHistory||[]).slice(0,25).map(r=>`<tr>
    <td>${r.port==='Misurata'?'مصراتة':'بنغازي'}</td>
    <td>${r.vessel||'—'}</td>
    <td>${waitText(r.waitingHours||0)}</td>
    <td>${destinationArabic(r.destinationClass)}</td>
    <td>${r.status||'—'}</td>
    <td>${r.enteredPortOn||'—'}</td>
  </tr>`).join('')||'<tr><td colspan="6">سيظهر السجل بعد اكتمال أول فترة انتظار</td></tr>';
}

function render(d){$('#updatedAt').textContent=d.updatedAt||'—';const s=d.summary||{};$('#metricCards').innerHTML=[['زيارات مصراتة التجارية',s.misurataCalls,'Commercial calls'],['زيارات بنغازي التجارية',s.benghaziCalls,'Commercial calls'],['مستبعد Fishing/Tug',s.excludedCalls||0,'Raw monitoring retained'],['TEU بنغازي تقديري',fmt(s.estimatedTEU),'Estimated']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');const max=Math.max(s.misurataCalls||0,s.benghaziCalls||0,1);$('#portBars').innerHTML=[['مصراتة',s.misurataCalls],['بنغازي',s.benghaziCalls]].map(([n,v])=>`<div class="bar-item"><span>${n}</span><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><b>${v}</b></div>`).join('');$('#coverageText').textContent=`${s.coverage||0}%`;$('#coverageBar').style.width=`${Math.min(100,s.coverage||0)}%`;$('#confidenceBreakdown').innerHTML=`<span>High/Medium: ${s.historicalHighMediumCalls||0}</span><span>Fallback Low: ${s.fallbackLowCalls||0}</span><span>Unestimated: ${s.unestimatedCalls||0}</span>`;$('#estimateRows').innerHTML=(d.estimates||[]).map(r=>`<tr><td>${r.vessel}</td><td>${r.imo}</td><td>${r.type}</td><td>${r.estimate}</td><td>${badge(r.confidence)}</td><td>${r.method}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد بيانات</td></tr>';renderExpected(d);renderAnchorage(d);renderFlexport(d);$('#comparisonRows').innerHTML=(d.comparison||[]).map(r=>`<tr><td>${r.period||'—'}</td><td>${fmt(r.misurataCalls)}</td><td>${fmt(r.misurataExcludedCalls||0)}</td><td>${fmt(r.benghaziCalls)}</td><td>${fmt(r.benghaziExcludedCalls||0)}</td><td>${valueOrDash(r.misurataActualTEU,r.misurataTEUStatus)}${r.misurataTEUStatus==='Verified Actual'?' <small>Actual</small>':''}</td><td>${fmt(r.estimatedTEU)} <small>Estimated</small></td><td>${valueOrDash(r.misurataActualGeneralCargoTons,r.misurataGeneralCargoStatus)}${r.misurataGeneralCargoStatus==='Verified Actual'?' t <small>Actual</small>':''}</td><td>${fmt(r.estimatedGeneralCargoTons)} t <small>Estimated</small></td><td>${r.coverage||0}%</td></tr>`).join('')||'<tr><td colspan="10">لا توجد بيانات</td></tr>';$('#cargoCards').innerHTML=[['TEU مصراتة فعلي',s.misurataTEUStatus==='Verified Actual'?fmt(s.misurataActualTEU):'—',s.misurataTEUStatus||'Not available'],['بضائع مصراتة الفعلية',s.misurataGeneralCargoStatus==='Verified Actual'?fmt(s.misurataActualGeneralCargoTons)+' t':'—',s.misurataGeneralCargoStatus||'Not available'],['TEU بنغازي تقديري',fmt(s.estimatedTEU),'Estimated'],['بضائع بنغازي تقديرية',fmt(s.estimatedGeneralCargoTons)+' t','Estimated']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');$('#reviewCount').textContent=(d.review||[]).length;$('#reviewRows').innerHTML=(d.review||[]).map(r=>`<tr><td>${r.historicalName}</td><td>${r.currentName||'—'}</td><td>${r.imo}</td><td>${r.masterMmsi||'—'}</td><td>${r.observedMmsi||'—'}</td><td>${badge(r.status)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد حالات معروضة</td></tr>';$('#qualityList').innerHTML=(d.quality||[]).map(q=>`<div class="quality-item"><strong>${q.title}</strong><span>${q.detail}</span></div>`).join('')||'<p class="muted">لا توجد تنبيهات</p>'}$$('.nav').forEach(b=>b.addEventListener('click',()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active-view'));$('#'+b.dataset.view).classList.add('active-view');$('#pageTitle').textContent=b.textContent}));load().catch(e=>{console.error(e);$('#updatedAt').textContent='تعذر تحميل البيانات'})