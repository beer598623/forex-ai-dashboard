// Main app — boots, fetches, renders

let _state = { latest: null, opps: [], allOpps: [], allScans: [] };
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
      va = (parseJsonField(a.mtf_alignment) || {}).alignment_score ?? 0;
      vb = (parseJsonField(b.mtf_alignment) || {}).alignment_score ?? 0;
    } else if (_sortCol === 'entry' || _sortCol === 'sl' || _sortCol === 'tp1' || _sortCol === 'rr') {
      const keyMap = { entry: 'entry', sl: 'stop_loss', tp1: 'tp1', rr: 'risk_reward' };
      va = (parseJsonField(a.levels) || {})[keyMap[_sortCol]] ?? 0;
      vb = (parseJsonField(b.levels) || {})[keyMap[_sortCol]] ?? 0;
    } else {
      va = a[_sortCol];
      vb = b[_sortCol];
    }
    if (typeof va === 'string') return _sortDir * (va || '').localeCompare(vb || '');
    return _sortDir * ((va ?? 0) - (vb ?? 0));
  });
}

function renderFiltered() {
  const opps = sortOpps(getFilteredOpps());
  const countEl = document.getElementById('opp-count');
  if (countEl) countEl.textContent = opps.length + ' signals';
  document.getElementById('opportunities').innerHTML = renderOpportunitiesTable(opps);
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
  document.getElementById('opportunities').innerHTML =
    renderOpportunitiesTable(sortOpps(getFilteredOpps()));
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `tab-${name}`)
  );
}

document.addEventListener('DOMContentLoaded', () => {
  boot();
  setInterval(boot, 300_000);
});
