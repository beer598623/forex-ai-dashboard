// Main app — boots, fetches, renders

let _state = { latest: null, opps: [], allOpps: [], allScans: [] };

async function boot() {
  const data = await loadDashboardData();
  _state = data;

  document.getElementById('status-bar').innerHTML = renderStatusBar(data.latest);
  document.getElementById('heatmap').innerHTML = renderHeatmap(data.opps);
  document.getElementById('opportunities').innerHTML = renderOpportunitiesTable(data.opps);
  document.getElementById('regime').innerHTML = renderRegimeOverview(data.opps);
  renderRegimeChart(data.opps);
}

function openDetail(scanId, symbol) {
  const opp = _state.opps.find(o => o.scan_id === scanId && o.symbol === symbol);
  if (!opp) return;
  document.getElementById('modal-content').innerHTML = renderDetail(opp);
  document.getElementById('modal-backdrop').classList.add('open');
}

function closeDetail() {
  document.getElementById('modal-backdrop').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDetail();
});

document.addEventListener('DOMContentLoaded', () => {
  boot();
  // Auto refresh every 5 min
  setInterval(boot, 300_000);
});
