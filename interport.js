(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function fmtDate(v){
    if(!v) return '—';
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if(!m) return s;
    return `${m[3]}-${m[2]}-${m[1]}${m[4] ? ` · ${String(m[4]).padStart(2,'0')}:${m[5]}` : ''}`;
  }

  function fmtHours(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return '—';
    if(n < 24) return `${n.toFixed(n < 10 ? 1 : 0)} ساعة`;
    return `${(n/24).toFixed(1)} يوم`;
  }

  function renderInterPort(data){
    const box = data?.interPortVoyages || {};
    const s = box.summary || {};
    const rows = Array.isArray(box.rows) ? box.rows : [];

    const set = (id, value) => {
      const el = document.getElementById(id);
      if(el) el.textContent = value;
    };

    set('m2bConfirmed', s.misurataToBenghaziConfirmed || 0);
    set('b2mConfirmed', s.benghaziToMisurataConfirmed || 0);
    set('interportConfirmedTotal', s.confirmedTotal || 0);
    set('interportCandidateTotal', s.candidateTotal || 0);
    set('m2bCandidates', `${s.misurataToBenghaziCandidates || 0} مرشح`);
    set('b2mCandidates', `${s.benghaziToMisurataCandidates || 0} مرشح`);
    set('interportUpdated', box.updatedAt ? fmtDate(box.updatedAt) : '—');

    const tbody = document.getElementById('interportRows');
    if(!tbody) return;

    if(!rows.length){
      tbody.innerHTML = '<tr><td colspan="8" class="muted">لا توجد رحلات مؤكدة أو مرشحة بعد.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const candidate = r.kind === 'candidate';
      const originAr = r.originPort === 'Misurata' ? 'مصراتة' : 'بنغازي';
      const destAr = r.destinationPort === 'Misurata' ? 'مصراتة' : 'بنغازي';
      const direction = `${originAr} → ${destAr}`;
      const destinationTime = candidate ? (r.destinationAnchorageFirstSeen || '') : (r.destinationFirstSeen || '');
      const gap = Number.isFinite(Number(r.seaTransitCalendarGapDays))
        ? `${Number(r.seaTransitCalendarGapDays)} يوم`
        : '—';
      const status = candidate
        ? '<span class="voyage-status candidate">مرشح · في المخطاف</span>'
        : '<span class="voyage-status confirmed">رحلة مؤكدة</span>';
      const anchorHours = fmtHours(r.destinationAnchorageHours);
      const stayHours = fmtHours(candidate ? r.originStayHours : r.destinationStayHours);

      return `<tr>
        <td><strong>${esc(r.vessel || '—')}</strong><br><small>IMO ${esc(r.imo || '—')}</small></td>
        <td class="voyage-direction">${esc(direction)}</td>
        <td>${status}</td>
        <td>${esc(fmtDate(r.originLastSeen))}</td>
        <td>${esc(fmtDate(destinationTime))}</td>
        <td>${esc(gap)}</td>
        <td>${esc(anchorHours)}</td>
        <td>${esc(stayHours)}</td>
      </tr>`;
    }).join('');
  }

  async function loadInterPort(){
    try{
      const res = await fetch(`data.json?t=${Date.now()}`, {cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      renderInterPort(await res.json());
    }catch(err){
      console.error('Inter-Port dashboard load failed:', err);
      const updated = document.getElementById('interportUpdated');
      if(updated) updated.textContent = 'تعذر تحديث بيانات الرحلات';
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadInterPort, {once:true});
  }else{
    loadInterPort();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('.nav[data-view="interport"]');
    if(b) setTimeout(loadInterPort, 50);
  });
})();
