(() => {
'use strict';

function isMobile(){ return window.innerWidth <= 760; }

function kickMap(){
  if(!isMobile()) return;
  const view=document.getElementById('map');
  if(!view || !view.classList.contains('active-view')) return;

  // Leaflet listens for window resize by default and recalculates map dimensions.
  [40,160,400,900].forEach(ms=>{
    setTimeout(()=>{
      try{
        window.dispatchEvent(new Event('resize'));
      }catch(e){}
    },ms);
  });
}

document.addEventListener('click',e=>{
  const el=e.target.closest?.(
    '.mobile-bottom-item[data-view="map"], .mobile-drawer-item[data-view="map"], .nav[data-view="map"]'
  );
  if(el) kickMap();
});

const mapView=document.getElementById('map');
if(mapView){
  const mo=new MutationObserver(()=>{
    if(mapView.classList.contains('active-view')) kickMap();
  });
  mo.observe(mapView,{attributes:true,attributeFilter:['class']});
}

window.addEventListener('orientationchange',()=>setTimeout(kickMap,250));
window.addEventListener('pageshow',()=>setTimeout(kickMap,250));
})();
