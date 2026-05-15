// Render components — pure functions returning HTML strings

const ASSET_GROUPS = {
  'Forex': ['forex'],
  'Metals': ['metals'],
  'Large Cap Crypto': ['large_cap_crypto'],
  'Altcoin': ['altcoin'],
  'Indices': ['indices'],
};

function renderStatusBar(latest) {
  if (!latest) {
    return `
      <span class="pulse offline"></span>
      <span class="brand">FOREX AI · INTELLIGENCE TERMINAL</span>
      <span class="item"><span class="label">Status</span><span class="value">OFFLINE</span></span>
      <span class="item"><span class="label">Last Scan</span><span class="value">—</span></span>
    `;
  }
  return `
    <span class="pulse"></span>
    <span class="brand">FOREX AI · INTELLIGENCE TERMINAL</span>
    <span class="item"><span class="label">Last Scan</span><span class="value">${escapeHTML(fmtTime(latest.scanned_at))}</span></span>
    <span class="item"><span class="label">Session</span><span class="value">${escapeHTML(latest.session || '—')}</span></span>
    <span class="item"><span class="label">Scanned</span><span class="value">${latest.total_scanned ?? '—'}</span></span>
    <span class="item"><span class="label">Stage1 ✓</span><span class="value">${latest.stage1_passed ?? '—'}</span></span>
    <span class="item"><span class="label">Stage2 ✓</span><span class="value">${latest.stage2_passed ?? latest.opportunities_count ?? '—'}</span></span>
    <span class="item"><span class="label">Latency</span><span class="value">${latest.duration_ms ? Math.round(latest.duration_ms / 1000) + 's' : '—'}</span></span>
  `;
}

function renderHeatmap(opps) {
  if (!opps.length) {
    return `<div class="empty-state"><div class="icon">◇</div><div>No assets scanned yet</div></div>`;
  }
  const byClass = {};
  for (const o of opps) {
    const cls = o.asset_class || 'other';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(o);
  }

  let html = '';
  for (const [groupName, classes] of Object.entries(ASSET_GROUPS)) {
    const items = classes.flatMap(c => byClass[c] || []);
    if (!items.length) continue;
    items.sort((a, b) => (b.final_score || b.quant_score || 0) - (a.final_score || a.quant_score || 0));
    html += `<div class="heatmap-group">
      <div class="group-label">${escapeHTML(groupName)} · ${items.length}</div>`;
    for (const o of items) {
      const grade = o.grade || 'D';
      const isHigh = grade === 'A+' || grade === 'A';
      const score = fmtNumber(o.final_score || o.quant_score, 1);
      html += `
        <div class="heatmap-tile ${isHigh ? 'high-conviction' : ''}" onclick="openDetail('${escapeHTML(o.scan_id)}','${escapeHTML(o.symbol)}')">
          <span class="symbol">${escapeHTML(o.symbol)}</span>
          <span class="score mono">${score}</span>
          <span class="grade grade-${gradeKey(grade)}">${escapeHTML(grade)}</span>
        </div>
      `;
    }
    html += `</div>`;
  }
  return html || `<div class="empty-state"><div class="icon">◇</div><div>No assets</div></div>`;
}

function renderOpportunitiesTable(opps) {
  if (!opps.length) {
    return `<div class="empty-state">
      <div class="icon">◯</div>
      <div>NO SCAN DATA</div>
      <div class="hint">Awaiting next scheduled scan cycle.</div>
    </div>`;
  }
  let rows = '';
  for (const o of opps) {
    const grade = o.grade || 'D';
    const direction = (o.direction || 'neutral').toLowerCase();
    const arrow = direction === 'long' ? '▲' : direction === 'short' ? '▼' : '─';
    rows += `
      <tr onclick="openDetail('${escapeHTML(o.scan_id)}','${escapeHTML(o.symbol)}')">
        <td class="rank">#${o.rank ?? '—'}</td>
        <td>
          <div class="symbol">${escapeHTML(o.symbol)}</div>
          <div class="asset-class">${escapeHTML((o.asset_class || '').replace('_', ' '))}</div>
        </td>
        <td class="setup">${escapeHTML((o.setup_type || '—').replace(/_/g, ' '))}</td>
        <td class="score-cell">${fmtNumber(o.quant_score)}</td>
        <td class="score-cell">${fmtNumber(o.ai_score ?? (100 - (o.bear_strength ?? 50)))}</td>
        <td class="score-cell"><strong>${fmtNumber(o.final_score)}</strong></td>
        <td class="grade-cell">
          <span class="grade-badge grade-${gradeKey(grade)}">${escapeHTML(grade)}</span>
        </td>
        <td class="direction-${direction}">${arrow} ${escapeHTML(direction.toUpperCase())}</td>
      </tr>
    `;
  }
  return `
    <table class="opp-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Symbol</th>
          <th>Setup</th>
          <th style="text-align:right">Quant</th>
          <th style="text-align:right">AI</th>
          <th style="text-align:right">Final</th>
          <th style="text-align:center">Grade</th>
          <th>Bias</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRegimeOverview(opps) {
  if (!opps.length) {
    return `<div class="empty-state"><div class="icon">◇</div><div>No regime data</div></div>`;
  }
  const counts = { trending_up: 0, trending_down: 0, ranging: 0, chop: 0 };
  for (const o of opps) {
    const r = parseJsonField(o.regime) || {};
    const dom = r.dominant_regime || r.dominant || 'ranging';
    if (counts[dom] !== undefined) counts[dom]++;
    else counts.ranging++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const segs = `
    <div class="regime-bar">
      <div class="seg-up" style="flex:${counts.trending_up}"></div>
      <div class="seg-down" style="flex:${counts.trending_down}"></div>
      <div class="seg-range" style="flex:${counts.ranging}"></div>
      <div class="seg-chop" style="flex:${counts.chop}"></div>
    </div>
  `;

  const rows = [
    { key: 'trending_up', label: 'Trending Up', color: 'var(--regime-up)' },
    { key: 'trending_down', label: 'Trending Down', color: 'var(--regime-down)' },
    { key: 'ranging', label: 'Ranging', color: 'var(--regime-range)' },
    { key: 'chop', label: 'Chop', color: 'var(--regime-chop)' },
  ].map(r => `
    <div class="regime-row">
      <span><span class="dot" style="background:${r.color}"></span>${r.label}</span>
      <span class="count">${counts[r.key]} <span class="dim">/ ${total}</span></span>
    </div>
  `).join('');

  return segs + `<div id="regime-chart"></div>` + rows;
}

function renderRegimeChart(opps) {
  if (!window.echarts || !opps.length) return;
  const counts = { 'Up': 0, 'Down': 0, 'Range': 0, 'Chop': 0 };
  for (const o of opps) {
    const r = parseJsonField(o.regime) || {};
    const dom = r.dominant_regime || r.dominant || 'ranging';
    if (dom === 'trending_up') counts.Up++;
    else if (dom === 'trending_down') counts.Down++;
    else if (dom === 'chop') counts.Chop++;
    else counts.Range++;
  }
  const el = document.getElementById('regime-chart');
  if (!el) return;
  const chart = echarts.init(el, null, { renderer: 'svg' });
  chart.setOption({
    backgroundColor: 'transparent',
    series: [{
      type: 'pie',
      radius: ['50%', '80%'],
      avoidLabelOverlap: false,
      itemStyle: { borderColor: '#0a0d12', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: counts.Up, name: 'Up', itemStyle: { color: '#06d6a0' } },
        { value: counts.Down, name: 'Down', itemStyle: { color: '#e63946' } },
        { value: counts.Range, name: 'Range', itemStyle: { color: '#f4a261' } },
        { value: counts.Chop, name: 'Chop', itemStyle: { color: '#6c7a8a' } },
      ].filter(d => d.value > 0),
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderDetail(opp) {
  if (!opp) return '<div class="empty-state">Not found</div>';
  const grade = opp.grade || 'D';
  const levels = parseJsonField(opp.levels) || {};
  const regime = parseJsonField(opp.regime) || {};
  const mtf = parseJsonField(opp.mtf_alignment) || {};

  const kvs = [
    { label: 'Final Score', value: fmtNumber(opp.final_score) },
    { label: 'Quant Score', value: fmtNumber(opp.quant_score) },
    { label: 'Bear Strength', value: fmtNumber(opp.bear_strength, 0) },
    { label: 'MTF Align', value: fmtNumber(mtf.alignment_score, 2) },
    { label: 'Regime', value: regime.dominant_regime || '—' },
    { label: 'Setup', value: (opp.setup_type || '—').replace(/_/g, ' ') },
    { label: 'Entry', value: levels.entry ? fmtNumber(levels.entry, 4) : '—' },
    { label: 'Stop Loss', value: levels.stop_loss ? fmtNumber(levels.stop_loss, 4) : '—' },
    { label: 'TP1', value: levels.tp1 ? fmtNumber(levels.tp1, 4) : '—' },
    { label: 'R:R', value: levels.risk_reward ? fmtNumber(levels.risk_reward, 2) : '—' },
  ];

  return `
    <div class="modal-header">
      <div>
        <h1>${escapeHTML(opp.symbol)} <span class="grade-badge grade-${gradeKey(grade)}" style="margin-left:8px;font-size:13px;padding:4px 10px">${escapeHTML(grade)}</span></h1>
        <div class="secondary" style="margin-top:6px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">
          ${escapeHTML((opp.asset_class || '').replace('_', ' '))} · ${escapeHTML(opp.direction || 'neutral')}
        </div>
      </div>
      <button class="close" onclick="closeDetail()">✕</button>
    </div>
    <div class="kv-grid">
      ${kvs.map(k => `<div class="kv"><div class="label">${escapeHTML(k.label)}</div><div class="value">${escapeHTML(k.value)}</div></div>`).join('')}
    </div>
    ${opp.thesis ? `<div class="thesis"><div class="label">Thesis</div>${escapeHTML(opp.thesis)}</div>` : ''}
    ${opp.invalidation ? `<div class="thesis"><div class="label">Invalidation</div>${escapeHTML(opp.invalidation)}</div>` : ''}
    ${opp.bear_case ? `<div class="thesis bear"><div class="label">Bear Case</div>${escapeHTML(opp.bear_case)}</div>` : ''}
  `;
}
