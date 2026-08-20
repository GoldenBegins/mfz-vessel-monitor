(() => {
'use strict';

const MOBILE_BP = 760;
const PRIMARY = [
  ['overview','المتابعة','⌂'],
  ['anchorage','المخطاف','⚓'],
  ['map','الخريطة','⌖'],
  ['monthly-port-intelligence','الشهري','▦']
];

function isMobile(){ return window.innerWidth <= MOBILE_BP; }

function activateView(id,label){
  const view=document.getElementById(id);
  if(!view)return;

  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll(`.nav[data-view="${CSS.escape(id)}"]`).forEach(x=>x.classList.add('active'));

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  view.classList.add('active-view');

  const title=document.getElementById('pageTitle');
  if(title)title.textContent=label||document.querySelector(`.nav[data-view="${CSS.escape(id)}"]`)?.textContent?.trim()||'';

  document.querySelectorAll('.mobile-bottom-item').forEach(x=>x.classList.toggle('active',x.dataset.view===id));
  closeDrawer();
  window.scrollTo({top:0,behavior:'smooth'});
}

function buildShell(){
  if(document.getElementById('mobileUxRoot'))return;

  const root=document.createElement('div');
  root.id='mobileUxRoot';
  root.innerHTML=`
    <div class="mobile-topbar">
      <div class="mobile-brand"><span>MFZ</span><strong>Vessel Monitor</strong></div>
      <button type="button" class="mobile-more-btn" aria-label="فتح القائمة">☰</button>
    </div>

    <div class="mobile-drawer-backdrop"></div>
    <aside class="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-head">
        <div><small>MFZ Vessel Monitor</small><strong>جميع الأقسام</strong></div>
        <button type="button" class="mobile-drawer-close" aria-label="إغلاق">×</button>
      </div>
      <div class="mobile-drawer-nav"></div>
    </aside>

    <nav class="mobile-bottom-nav"></nav>
  `;
  document.body.appendChild(root);

  const drawerNav=root.querySelector('.mobile-drawer-nav');
  const source=[...document.querySelectorAll('.sidebar nav .nav[data-view]')];

  source.forEach(b=>{
    const c=document.createElement('button');
    c.type='button';
    c.className='mobile-drawer-item';
    c.dataset.view=b.dataset.view;
    c.textContent=b.textContent.trim();
    c.addEventListener('click',()=>activateView(c.dataset.view,c.textContent.trim()));
    drawerNav.appendChild(c);
  });

  const bottom=root.querySelector('.mobile-bottom-nav');
  PRIMARY.forEach(([id,label,icon])=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='mobile-bottom-item';
    b.dataset.view=id;
    b.innerHTML=`<span class="mobile-nav-icon">${icon}</span><small>${label}</small>`;
    b.addEventListener('click',()=>activateView(id,label));
    bottom.appendChild(b);
  });

  const more=document.createElement('button');
  more.type='button';
  more.className='mobile-bottom-item mobile-bottom-more';
  more.innerHTML='<span class="mobile-nav-icon">•••</span><small>المزيد</small>';
  more.addEventListener('click',openDrawer);
  bottom.appendChild(more);

  root.querySelector('.mobile-more-btn').addEventListener('click',openDrawer);
  root.querySelector('.mobile-drawer-close').addEventListener('click',closeDrawer);
  root.querySelector('.mobile-drawer-backdrop').addEventListener('click',closeDrawer);
}

function openDrawer(){
  const root=document.getElementById('mobileUxRoot');
  if(!root)return;
  root.classList.add('drawer-open');
  root.querySelector('.mobile-drawer')?.setAttribute('aria-hidden','false');
  document.body.classList.add('mobile-drawer-lock');
}
function closeDrawer(){
  const root=document.getElementById('mobileUxRoot');
  if(!root)return;
  root.classList.remove('drawer-open');
  root.querySelector('.mobile-drawer')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('mobile-drawer-lock');
}

function labelTable(table){
  if(!table || table.dataset.mobileLabeled==='1')return;
  const heads=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());
  if(!heads.length)return;
  table.classList.add('mobile-card-table');
  [...table.querySelectorAll('tbody tr')].forEach(tr=>{
    [...tr.children].forEach((td,i)=>{
      if(td.tagName==='TD')td.dataset.label=heads[i]||'';
    });
  });
  table.dataset.mobileLabeled='1';
}

function refreshTables(){
  if(!isMobile())return;
  const selectors=[
    '#overview table','#expected table','#anchorage table','#interport table',
    '#flexport table','#pressure table','#ports table','#cargo table',
    '#review table','#quality table','#monthly-port-intelligence table',
    '#cargo-capacity-intelligence table','#vessel-intelligence table'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(labelTable);
}

function observeTables(){
  const target=document.querySelector('main');
  if(!target)return;
  const mo=new MutationObserver(()=>requestAnimationFrame(refreshTables));
  mo.observe(target,{childList:true,subtree:true});
}

function syncActive(){
  const active=document.querySelector('.view.active-view')?.id;
  if(!active)return;
  document.querySelectorAll('.mobile-bottom-item').forEach(x=>x.classList.toggle('active',x.dataset.view===active));
}

function boot(){
  buildShell();
  refreshTables();
  observeTables();
  syncActive();

  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('.nav[data-view]');
    if(nav)setTimeout(()=>{syncActive();refreshTables()},60);
  });

  window.addEventListener('resize',()=>{
    if(!isMobile())closeDrawer();
    refreshTables();
  });

  window.addEventListener('orientationchange',()=>setTimeout(refreshTables,150));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
