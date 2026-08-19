const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const fmt=n=>new Intl.NumberFormat('en-US').format(n??0);const badge=c=>`<span class="badge ${String(c).toLowerCase().replace(/\s+/g,'')}">${c}</span>`;const valueOrDash=(v,status)=>status==='Verified Actual'?fmt(v):'—';async function load(){const d=await fetch(`data.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json());render(d)}function renderExpected(d){const expected=d.expectedArrivals||[];const statusOf=r=>String(r.status||'').toLowerCase();const isPlanned=r=>statusOf(r).includes('planned');const isArrived=r=>statusOf(r).includes('arrived');const isOverdue=r=>statusOf(r).includes('overdue');const active=r=>!statusOf(r).includes('archived');const misAll=expected.filter(r=>r.port==='Misurata'&&active(r));const benAll=expected.filter(r=>r.port==='Benghazi'&&active(r));const misPlanned=misAll.filter(isPlanned);const benPlanned=benAll.filter(isPlanned);const arrived=expected.filter(isArrived);const overdue=expected.filter(isOverdue);const mstCount=expected.filter(r=>String(r.source||'').includes('MyShipTracking')).length;const flexCount=expected.filter(r=>String(r.source||'').includes('Flexport Atlas')).length;$('#expectedCards').innerHTML=[['متوقع ميناء المنطقة الحرة بمصراتة',misPlanned.length,'Combined sources'],['متوقع ميناء بنغازي',benPlanned.length,'Combined sources'],['وصلت بالفعل',arrived.length,'Matched with live monitoring'],['متأخرة ولم تؤكد',overdue.length,'Overdue / Not Confirmed'],['MyShipTracking',mstCount,'Source coverage'],['Flexport Atlas',flexCount,'Source coverage']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');$('#misExpectedCount').textContent=`Expected ${misPlanned.length}`;$('#benExpectedCount').textContent=`Expected ${benPlanned.length}`;const row=r=>`<tr><td>${r.vessel||'—'}</td><td>${r.imo||'—'}</td><td>${r.type||'—'}</td><td>${r.dwt?fmt(r.dwt):'—'}</td><td>${r.eta||'—'}</td><td>${r.source||'—'}</td><td>${r.status||'—'}</td></tr>`;$('#misExpectedRows').innerHTML=misAll.map(row).join('')||'<tr><td colspan="7">لا توجد سفن متوقعة حاليًا</td></tr>';$('#benExpectedRows').innerHTML=benAll.map(row).join('')||'<tr><td colspan="7">لا توجد سفن متوقعة حاليًا</td></tr>'}function renderFlexport(d){const ports=d.flexportPorts||[];const vessels=d.flexportVessels||[];const verified=vessels.filter(r=>String(r.status||'').startsWith('Verified by exact IMO'));const failed=vessels.filter(r=>String(r.status||'').startsWith('Not found'));const other=vessels.length-verified.length-failed.length;const mis=ports.find(r=>r.port==='Misurata')||{};const ben=ports.find(r=>r.port==='Benghazi')||{};$('#flexportCards').innerHTML=[['خدمات مصراتة',mis.services||0,'Ocean services'],['خدمات بنغازي',ben.services||0,'Ocean services'],['رحلات مجدولة مصراتة',mis.scheduledCalls||0,'Scheduled vessel calls'],['رحلات مجدولة بنغازي',ben.scheduledCalls||0,'Scheduled vessel calls'],['سفن موثقة من Flexport',verified.length,'Verified vessel profiles'],['غير متاحة حاليًا',failed.length+Math.max(0,other),'محفوظة في الخلفية ولا تظهر في الجدول']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');const summary=r=>r&&r.port?`<div class="quality-item"><strong>${r.unlocode||'—'}</strong><span>${fmt(r.services||0)} خدمات بحرية · ${fmt(r.scheduledCalls||0)} رحلات سفن مجدولة · ${fmt(r.terminals||0)} محطة</span></div><div class="quality-item"><strong>الخدمات</strong><span>${r.servicesText||'لا توجد تفاصيل متاحة'}</span></div>`:'<p class="muted">لا توجد بيانات Flexport متاحة حاليًا</p>';$('#flexMisSummary').innerHTML=summary(mis);$('#flexBenSummary').innerHTML=summary(ben);const rows=verified.slice().sort((a,b)=>String(a.destination||'').localeCompare(String(b.destination||''))).map(r=>`<tr><td>${r.vessel||'—'}</td><td>${r.imo||'—'}</td><td>${r.type||'—'}</td><td>${r.dwt?fmt(r.dwt):'—'}</td><td>${r.teu?fmt(r.teu):'—'}</td><td>${r.destination||'—'}</td><td>${r.eta||'—'}</td><td>${r.service||r.carrier||'—'}</td><td>${r.voyage||'—'}</td></tr>`).join('');$('#flexVesselRows').innerHTML=rows||'<tr><td colspan="9">لا توجد سفن موثقة من Flexport حاليًا</td></tr>'}
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
function anchorageDate(value){
  const s=String(value||'').trim();
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if(!m)return s||'—';
  const hh=String(m[4]).padStart(2,'0');
  return `${m[3]}-${m[2]}-${m[1]} · ${hh}:${m[5]}`;
}

function renderCurrentInPort(a){
  const cp=a.currentInPort||{};
  const mis=cp.Misurata||[];
  const ben=cp.Benghazi||[];
  const row=r=>`<tr>
    <td><strong>${r.vessel||'—'}</strong></td>
    <td>${r.imo||r.mmsi||'—'}${r.imo&&r.mmsi?`<small class="cell-sub">MMSI ${r.mmsi}</small>`:''}</td>
    <td>${Number(r.sog||0).toFixed(1)}</td>
    <td>${Number(r.distanceKm||0).toFixed(1)} كم</td>
    <td><span class="dest-chip">${destinationArabic(r.destinationClass)}</span><small class="cell-sub">${r.destination||'—'}</small></td>
    <td>${anchorageDate(r.observedAt||'')}</td>
    <td>${badge(r.confidence||'Medium')}</td>
  </tr>`;
  $('#misInPortCount').textContent=`${mis.length} داخل الميناء`;
  $('#benInPortCount').textContent=`${ben.length} داخل الميناء`;
  $('#misInPortRows').innerHTML=mis.map(row).join('')||'<tr><td colspan="7">لا توجد سفن مؤكدة جغرافيًا داخل الميناء في آخر رصد</td></tr>';
  $('#benInPortRows').innerHTML=ben.map(row).join('')||'<tr><td colspan="7">لا توجد سفن مؤكدة جغرافيًا داخل الميناء في آخر رصد</td></tr>';
}

function renderAnchorage(d){
  const a=d.anchorage||{};
  const sm=a.summary||{};
  const mis=sm.Misurata||{};
  const ben=sm.Benghazi||{};
  const active=a.active||[];
  const misRows=active.filter(r=>r.port==='Misurata');
  const benRows=active.filter(r=>r.port==='Benghazi');
  renderCurrentInPort(a);

  const total=(mis.active||0)+(ben.active||0);
  const allWait=active.map(r=>Number(r.waitingHours||0));
  const longest=allWait.length?Math.max(...allWait):0;

  $('#anchorageCards').innerHTML=[
    ['في المخطاف الآن',total,'إجمالي الميناءين'],
    ['ميناء المنطقة الحرة بمصراتة',mis.active||0,`متوسط الانتظار ${waitText(mis.avgWaitingHours||0)}`],
    ['ميناء بنغازي',ben.active||0,`متوسط الانتظار ${waitText(ben.avgWaitingHours||0)}`],
    ['أطول انتظار حالي',waitText(longest),'زمن رصد تقريبي']
  ].map(x=>`<div class="metric anchor-metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');

  $('#misAnchorageCount').textContent=`${mis.active||0} في المخطاف`;
  $('#benAnchorageCount').textContent=`${ben.active||0} في المخطاف`;

  const stat=s=>[
    ['متوسط الانتظار',waitText(s.avgWaitingHours||0)],
    ['الوسيط',waitText(s.medianWaitingHours||0)],
    ['أطول انتظار',waitText(s.longestWaitingHours||0)],
    ['وجهة مؤكدة',String(s.destinationConfirmed||0)]
  ].map(([label,value])=>`<div class="anchor-stat"><small>${label}</small><b>${value}</b></div>`).join('');

  $('#misAnchorageStats').innerHTML=stat(mis);
  $('#benAnchorageStats').innerHTML=stat(ben);

  const row=r=>`<tr>
    <td><div class="vessel-name">${r.vessel||'—'}</div></td>
    <td><span class="identity-main">${r.imo||'—'}</span><small class="cell-sub">MMSI ${r.mmsi||'—'}</small></td>
    <td><strong>${Number(r.distanceKm||0).toFixed(1)}</strong><small class="cell-sub">كم</small></td>
    <td>${Number(r.sog||0).toFixed(1)}</td>
    <td><span class="dest-chip">${destinationArabic(r.destinationClass)}</span><small class="cell-sub">${r.destination||'—'}</small></td>
    <td><strong class="wait-value">${waitText(r.waitingHours||0)}</strong></td>
    <td><span class="date-cell">${anchorageDate(r.firstSeen)}</span></td>
    <td>${badge(r.confidence||'Low')}</td>
  </tr>`;

  $('#misAnchorageRows').innerHTML=misRows.map(row).join('')||'<tr><td colspan="8" class="empty-anchor">لا توجد سفن مؤكدة في المخطاف حاليًا</td></tr>';
  $('#benAnchorageRows').innerHTML=benRows.map(row).join('')||'<tr><td colspan="8" class="empty-anchor">لا توجد سفن مؤكدة في المخطاف حاليًا</td></tr>';

  document.querySelectorAll('.anchorage-port-panel table').forEach(t=>t.classList.add('anchorage-table'));

  const anchorUpdated=anchorageDate(a.updatedAt||d.anchorageUpdatedAt);
  $('#anchorageUpdated').textContent=`آخر تحديث للمخطاف: ${anchorUpdated}`;

  $('#anchorageHistoryRows').innerHTML=(a.recentHistory||[]).slice(0,25).map(r=>`<tr>
    <td>${r.port==='Misurata'?'مصراتة':'بنغازي'}</td>
    <td><strong>${r.vessel||'—'}</strong></td>
    <td>${waitText(r.waitingHours||0)}</td>
    <td>${destinationArabic(r.destinationClass)}</td>
    <td>${r.status||'—'}</td>
    <td>${anchorageDate(r.enteredPortOn)}</td>
  </tr>`).join('')||'<tr><td colspan="6">سيظهر السجل بعد اكتمال أول فترة انتظار</td></tr>';

  document.body.dataset.anchorageUpdated=anchorUpdated;
  document.body.dataset.generalUpdated=String(d.updatedAt||'—');
}



// INTERACTIVE_VESSEL_MAP_V1
const MFZ_PORT_MAPS={
  Misurata:{id:'misurataMap',countId:'misMapCount',center:[32.35851400332763,15.237024264526326],zoom:13},
  Benghazi:{id:'benghaziMap',countId:'benMapCount',center:[32.09980247175419,20.036639566040094],zoom:13}
};
let __mfzMapData=null;
let __mfzMaps={};

function safeNum(v){const n=Number(v);return Number.isFinite(n)?n:null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function shipSvgIcon(color,cog){
  const angle=Number.isFinite(Number(cog))?Number(cog):0;
  const svg=`<svg width="25" height="56" viewBox="0 0 25 56" style="transform:rotate(${angle}deg)" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 1 L21.5 10 L23 51 L2 51 L3.5 10 Z" fill="${color}" stroke="#dceaf2" stroke-width="1.2"/>
    <circle cx="12.5" cy="43.5" r="2.8" fill="#eef7fb" stroke="#435c6e" stroke-width="1"/>
  </svg>`;
  return L.divIcon({className:'ship-marker',html:svg,iconSize:[25,56],iconAnchor:[12.5,28],popupAnchor:[0,-22]});
}
function featureStyle(feature){
  const p=feature&&feature.properties?feature.properties:{};
  const txt=JSON.stringify(p).toUpperCase();
  const operational=/BERTH|TERMINAL|PIER|HARBOUR/.test(txt);
  return operational
    ?{color:'#63d69b',weight:1.4,fillColor:'#63d69b',fillOpacity:.07}
    :{color:'#f2b84b',weight:1,fillColor:'#f2b84b',fillOpacity:.025,dashArray:'5 5'};
}
function popupHtml(r,stateLabel){
  const id=r.imo?`IMO ${esc(r.imo)}`:(r.mmsi?`MMSI ${esc(r.mmsi)}`:'—');
  const observed=r.observedAt||r.lastSeen||'—';
  return `<div class="vessel-popup">
    <strong>${esc(r.vessel||'—')}</strong>
    <small>${id}${r.imo&&r.mmsi?` · MMSI ${esc(r.mmsi)}`:''}</small>
    <small>SOG: ${safeNum(r.sog)??0} kn · المسافة: ${safeNum(r.distanceKm)?.toFixed(1)??'—'} كم</small>
    <small>الوجهة: ${esc(r.destination||destinationArabic(r.destinationClass)||'—')}</small>
    <small>آخر رصد: ${esc(anchorageDate(observed))}</small>
    <small>الثقة: ${esc(r.confidence||'—')}</small>
    <span class="popup-state">${esc(stateLabel)}</span>
  </div>`;
}
function normalizeGeoJson(value){
  if(!value)return null;
  if(value.type==='FeatureCollection'&&Array.isArray(value.features))return value;
  if(Array.isArray(value))return {type:'FeatureCollection',features:value};
  if(Array.isArray(value.features))return {type:'FeatureCollection',features:value.features};
  return null;
}
function initOnePortMap(port,a){
  const cfg=MFZ_PORT_MAPS[port];
  const el=document.getElementById(cfg.id);
  if(!el||typeof L==='undefined')return;

  if(__mfzMaps[port]){
    __mfzMaps[port].remove();
    delete __mfzMaps[port];
  }

  const map=L.map(cfg.id,{zoomControl:true,preferCanvas:true}).setView(cfg.center,cfg.zoom);
  __mfzMaps[port]=map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);

  const fc=normalizeGeoJson((a.portPolygons||{})[port]);
  if(fc){
    try{L.geoJSON(fc,{style:featureStyle}).addTo(map)}
    catch(e){console.warn('polygon draw',port,e)}
  }

  L.circle(cfg.center,{radius:3200,color:'#44677e',weight:1,fill:false,dashArray:'3 7',opacity:.5}).addTo(map);
  L.circle(cfg.center,{radius:15000,color:'#33536a',weight:1,fill:false,dashArray:'2 9',opacity:.25}).addTo(map);

  const inPort=((a.currentInPort||{})[port]||[]).filter(r=>safeNum(r.lat)!==null&&safeNum(r.lon)!==null);
  const waiting=(a.active||[]).filter(r=>r.port===port&&safeNum(r.lat)!==null&&safeNum(r.lon)!==null);
  const bounds=[];

  inPort.forEach(r=>{
    const lat=safeNum(r.lat),lon=safeNum(r.lon);
    const marker=L.marker([lat,lon],{
      icon:shipSvgIcon('#63d69b',r.cog),
      title:r.vessel||''
    }).addTo(map);
    marker.bindPopup(popupHtml(r,'داخل الميناء'));
    bounds.push([lat,lon]);
  });

  waiting.forEach(r=>{
    const lat=safeNum(r.lat),lon=safeNum(r.lon);
    const marker=L.marker([lat,lon],{
      icon:shipSvgIcon('#45b8ef',r.cog),
      title:r.vessel||''
    }).addTo(map);
    marker.bindPopup(popupHtml(r,'في المخطاف / انتظار'));
    bounds.push([lat,lon]);
  });

  const counter=document.getElementById(cfg.countId);
  if(counter)counter.textContent=`${inPort.length} داخل · ${waiting.length} مخطاف`;

  if(bounds.length){
    try{map.fitBounds(bounds,{padding:[38,38],maxZoom:15})}catch(e){}
  }
  setTimeout(()=>map.invalidateSize(),120);
}
function preparePortMaps(d){__mfzMapData=d}
function openPortMaps(){
  if(!__mfzMapData)return;
  const a=__mfzMapData.anchorage||{};
  initOnePortMap('Misurata',a);
  initOnePortMap('Benghazi',a);
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.nav[data-view="map"]');
  if(b)setTimeout(openPortMaps,80);
});


\n// INTERPORT_DASHBOARD_V1
function interportEsc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function interportDate(v){
  if(!v)return '—';
  if(typeof anchorageDate==='function')return anchorageDate(v);
  const s=String(v);
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if(!m)return s;
  return `${m[3]}-${m[2]}-${m[1]}${m[4]?` · ${String(m[4]).padStart(2,'0')}:${m[5]}`:''}`;
}
function interportHours(v){
  const n=Number(v);
  if(!Number.isFinite(n))return '—';
  return n<24?`${n.toFixed(n<10?1:0)} س`:`${(n/24).toFixed(1)} يوم`;
}
function renderInterport(d){
  const box=d&&d.interPortVoyages?d.interPortVoyages:{};
  const s=box.summary||{};
  const rows=Array.isArray(box.rows)?box.rows:[];
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set('m2bConfirmed',s.misurataToBenghaziConfirmed||0);
  set('b2mConfirmed',s.benghaziToMisurataConfirmed||0);
  set('interportConfirmedTotal',s.confirmedTotal||0);
  set('interportCandidateTotal',s.candidateTotal||0);
  set('m2bCandidates',`${s.misurataToBenghaziCandidates||0} مرشح`);
  set('b2mCandidates',`${s.benghaziToMisurataCandidates||0} مرشح`);
  set('interportUpdated',box.updatedAt?interportDate(box.updatedAt):'—');
  const tbody=document.getElementById('interportRows');
  if(!tbody)return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="8" class="muted">لا توجد رحلات مؤكدة أو مرشحة بعد.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(r=>{
    const candidate=r.kind==='candidate';
    const direction=`${r.originPort==='Misurata'?'مصراتة':'بنغازي'} → ${r.destinationPort==='Misurata'?'مصراتة':'بنغازي'}`;
    const second=candidate?(r.destinationAnchorageFirstSeen||''):(r.destinationFirstSeen||'');
    const gap=Number.isFinite(Number(r.seaTransitCalendarGapDays))?`${Number(r.seaTransitCalendarGapDays)} يوم`:'—';
    const anchor=interportHours(r.destinationAnchorageHours);
    const stay=interportHours(candidate?r.originStayHours:r.destinationStayHours);
    const status=candidate
      ?'<span class="voyage-status candidate">مرشح · في المخطاف</span>'
      :'<span class="voyage-status confirmed">رحلة مؤكدة</span>';
    return `<tr><td><strong>${interportEsc(r.vessel||'—')}</strong><br><small>IMO ${interportEsc(r.imo||'—')}</small></td><td class="voyage-direction">${interportEsc(direction)}</td><td>${status}</td><td>${interportEsc(interportDate(r.originLastSeen))}</td><td>${interportEsc(interportDate(second))}</td><td>${interportEsc(gap)}</td><td>${interportEsc(anchor)}</td><td>${interportEsc(stay)}</td></tr>`;
  }).join('');
}

function render(d){renderInterport(d);preparePortMaps(d);$('#updatedAt').textContent=d.updatedAt||'—';const s=d.summary||{};$('#metricCards').innerHTML=[['زيارات مصراتة التجارية',s.misurataCalls,'Commercial calls'],['زيارات بنغازي التجارية',s.benghaziCalls,'Commercial calls'],['مستبعد Fishing/Tug',s.excludedCalls||0,'Raw monitoring retained'],['TEU بنغازي تقديري',fmt(s.estimatedTEU),'Estimated']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');const max=Math.max(s.misurataCalls||0,s.benghaziCalls||0,1);$('#portBars').innerHTML=[['مصراتة',s.misurataCalls],['بنغازي',s.benghaziCalls]].map(([n,v])=>`<div class="bar-item"><span>${n}</span><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><b>${v}</b></div>`).join('');$('#coverageText').textContent=`${s.coverage||0}%`;$('#coverageBar').style.width=`${Math.min(100,s.coverage||0)}%`;$('#confidenceBreakdown').innerHTML=`<span>High/Medium: ${s.historicalHighMediumCalls||0}</span><span>Fallback Low: ${s.fallbackLowCalls||0}</span><span>Unestimated: ${s.unestimatedCalls||0}</span>`;$('#estimateRows').innerHTML=(d.estimates||[]).map(r=>`<tr><td>${r.vessel}</td><td>${r.imo}</td><td>${r.type}</td><td>${r.estimate}</td><td>${badge(r.confidence)}</td><td>${r.method}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد بيانات</td></tr>';renderExpected(d);renderAnchorage(d);renderFlexport(d);$('#comparisonRows').innerHTML=(d.comparison||[]).map(r=>`<tr><td>${r.period||'—'}</td><td>${fmt(r.misurataCalls)}</td><td>${fmt(r.misurataExcludedCalls||0)}</td><td>${fmt(r.benghaziCalls)}</td><td>${fmt(r.benghaziExcludedCalls||0)}</td><td>${valueOrDash(r.misurataActualTEU,r.misurataTEUStatus)}${r.misurataTEUStatus==='Verified Actual'?' <small>Actual</small>':''}</td><td>${fmt(r.estimatedTEU)} <small>Estimated</small></td><td>${valueOrDash(r.misurataActualGeneralCargoTons,r.misurataGeneralCargoStatus)}${r.misurataGeneralCargoStatus==='Verified Actual'?' t <small>Actual</small>':''}</td><td>${fmt(r.estimatedGeneralCargoTons)} t <small>Estimated</small></td><td>${r.coverage||0}%</td></tr>`).join('')||'<tr><td colspan="10">لا توجد بيانات</td></tr>';$('#cargoCards').innerHTML=[['TEU مصراتة فعلي',s.misurataTEUStatus==='Verified Actual'?fmt(s.misurataActualTEU):'—',s.misurataTEUStatus||'Not available'],['بضائع مصراتة الفعلية',s.misurataGeneralCargoStatus==='Verified Actual'?fmt(s.misurataActualGeneralCargoTons)+' t':'—',s.misurataGeneralCargoStatus||'Not available'],['TEU بنغازي تقديري',fmt(s.estimatedTEU),'Estimated'],['بضائع بنغازي تقديرية',fmt(s.estimatedGeneralCargoTons)+' t','Estimated']].map(x=>`<div class="metric"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');$('#reviewCount').textContent=(d.review||[]).length;$('#reviewRows').innerHTML=(d.review||[]).map(r=>`<tr><td>${r.historicalName}</td><td>${r.currentName||'—'}</td><td>${r.imo}</td><td>${r.masterMmsi||'—'}</td><td>${r.observedMmsi||'—'}</td><td>${badge(r.status)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد حالات معروضة</td></tr>';$('#qualityList').innerHTML=(d.quality||[]).map(q=>`<div class="quality-item"><strong>${q.title}</strong><span>${q.detail}</span></div>`).join('')||'<p class="muted">لا توجد تنبيهات</p>'}$$('.nav').forEach(b=>b.addEventListener('click',()=>{
  $$('.nav').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  $$('.view').forEach(v=>v.classList.remove('active-view'));
  $('#'+b.dataset.view).classList.add('active-view');
  $('#pageTitle').textContent=b.textContent;
  const isAnchorage=b.dataset.view==='anchorage';
  const value=isAnchorage
    ?(document.body.dataset.anchorageUpdated||'—')
    :(document.body.dataset.generalUpdated||'—');
  $('#updatedAt').textContent=value;
}));load().catch(e=>{console.error(e);$('#updatedAt').textContent='تعذر تحميل البيانات'})