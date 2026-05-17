// Main app — boots, fetches, renders

let _state = { latest: null, opps: [], allOpps: [], allScans: [], macro: null };
let _filter = 'all';
let _sortCol = 'rank';
let _sortDir = 1;
let _expanded = new Set();

async function boot() {
  const data = await loadDashboardData();
  _state = data;
  document.getElementById('status-bar').innerHTML = renderStatusBar(data.latest);
  document.getElementById('filter').innerHTML = renderMarketFilter(data.opps, _filter);
  document.getElementById('summary').innerHTML = renderAssetSummary(data.opps);
  renderFiltered();
  renderIntelligence();
}

function renderIntelligence() {
  document.getElementById('intel-macro').innerHTML    = renderMacroCard(_state.macro);
  document.getElementById('intel-regime').innerHTML   = renderRegimeDistribution(_state.opps);
  document.getElementById('intel-sessions').innerHTML = renderSessionHistory(_state.allScans);
}

function getFilteredOpps() {
  return _filter === 'all'
    ? _state.opps
    : _state.opps.filter(o => (o.asset_class || '').toLowerCase() === _filter);
}

function sortOpps(opps) {
  return [...opps].sort((a, b) => {
    let va, vb;
    if (_sortCol === 'ai_score') {
      va = a.ai_score ?? (100 - (a.bear_strength ?? 50));
      vb = b.ai_score ?? (100 - (b.bear_strength ?? 50));
    } else if (_sortCol === 'mtf_score') {
      va = a.mtf_alignment ?? 0;
      vb = b.mtf_alignment ?? 0;
    } else if (_sortCol === 'entry') {
      va = a.entry ?? 0;
      vb = b.entry ?? 0;
    } else {
      va = a[_sortCol];
      vb = b[_sortCol];
    }
    if (typeof va === 'string') return _sortDir * (va || '').localeCompare(vb || '');
    return _sortDir * ((va ?? 0) - (vb ?? 0));
  });
}

function isMobile() { return window.innerWidth < 768; }

function renderFiltered() {
  const opps = sortOpps(getFilteredOpps());
  const countEl = document.getElementById('opp-count');
  if (countEl) countEl.textContent = opps.length + ' signals';
  document.getElementById('opportunities').innerHTML =
    isMobile() ? renderOpportunitiesMobile(opps) : renderOpportunitiesTable(opps);
}

function setFilter(cls) {
  _filter = cls;
  document.querySelectorAll('.filter-pill').forEach(el =>
    el.classList.toggle('active', el.dataset.cls === cls)
  );
  renderFiltered();
}

function sortBy(col) {
  if (_sortCol === col) _sortDir *= -1;
  else { _sortCol = col; _sortDir = col === 'rank' ? 1 : -1; }
  renderFiltered();
}

function toggleRow(key) {
  if (_expanded.has(key)) _expanded.delete(key);
  else _expanded.add(key);
  renderFiltered();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `tab-${name}`)
  );
}

let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(renderFiltered, 200);
});

document.addEventListener('DOMContentLoaded', () => {
  boot();
  setInterval(boot, 300_000);
});
