// Main app — boots, fetches, renders

let _state = { latest: null, opps: [], allOpps: [], allScans: [] };
let _filter = 'all';

async function boot() {
  const data = await loadDashboardData();
  _state = data;

  document.getElementById('status-bar').innerHTML = renderStatusBar(data.latest);
  document.getElementById('filter').innerHTML = renderMarketFilter(data.opps, _filter);
  document.getElementById('summary').innerHTML = renderAssetSummary(data.opps);
  renderFiltered();
}

function renderFiltered() {
  const opps = _filter === 'all'
    ? _state.opps
    : _state.opps.filter(o => (o.asset_class || '').toLowerCase() === _filter);
  const countEl = document.getElementById('opp-count');
  if (countEl) countEl.textContent = opps.length + ' signals';
  document.getElementById('opportunities').innerHTML = renderOpportunitiesCards(opps);
}

function setFilter(cls) {
  _filter = cls;
  document.querySelectorAll('.filter-pill').forEach(el => {
    el.classList.toggle('active', el.dataset.cls === cls);
  });
  renderFiltered();
}

document.addEventListener('DOMContentLoaded', () => {
  boot();
  setInterval(boot, 300_000);
});
