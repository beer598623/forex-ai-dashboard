// Render components — pure functions returning HTML strings

const ASSET_CLASS_META = {
  all:             { label: 'All' },
  forex:           { label: 'Forex' },
  metals:          { label: 'Metals' },
  large_cap_crypto:{ label: 'Crypto' },
  altcoin:         { label: 'Altcoin' },
  indices:         { label: 'Indices' },
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

function renderMarketFilter(opps, activeFilter) {
  const counts = { all: opps.length, forex: 0, metals: 0, large_cap_crypto: 0, altcoin: 0, indices: 0 };
  for (const o of opps) {
    const cls = (o.asset_class || '').toLowerCase();
    if (counts[cls] !== undefined) counts[cls]++;
  }

  let html = '';
  for (const [key, meta] of Object.entries(ASSET_CLASS_META)) {
    if (key !== 'all' && counts[key] === 0) continue;
    const active = key === activeFilter ? ' active' : '';
    html += `
      <div class="filter-pill${active}" data-cls="${key}" onclick="setFilter('${key}')">
        <span class="filter-label">${escapeHTML(meta.label)}</span>
        <span class="filter-count">${counts[key]}</span>
      </div>
    `;
  }
  return html || `<div class="empty-state"><div class="icon">◇</div><div>No data</div></div>`;
}

function renderOpportunitiesCards(opps) {
  if (!opps.length) {
    return `<div class="empty-state">
      <div class="icon">◯</div>
      <div>NO SCAN DATA</div>
      <div class="hint">Awaiting next scheduled scan cycle.</div>
    </div>`;
  }

  return opps.map(o => {
    const grade = o.grade || 'D';
    const direction = (o.direction || 'neutral').toLowerCase();
    const arrow = direction === 'long' ? '▲' : direction === 'short' ? '▼' : '─';
    const verdict = (grade === 'A+' || grade === 'A') ? 'TRADE' : grade === 'B' ? 'WATCH' : 'SKIP';
    const verdictCls = (grade === 'A+' || grade === 'A') ? 'verdict-trade' : grade === 'B' ? 'verdict-watch' : 'verdict-skip';
    const levels = parseJsonField(o.levels) || {};
    const regime = parseJsonField(o.regime) || {};
    const mtf = parseJsonField(o.mtf_alignment) || {};
    const aiScore = fmtNumber(o.ai_score ?? (100 - (o.bear_strength ?? 50)));

    const levelsHtml = levels.entry ? `
      <div class="opp-levels">
        <span class="level-item"><span class="level-label">Entry</span>${fmtNumber(levels.entry, 4)}</span>
        <span class="level-item"><span class="level-label">SL</span>${fmtNumber(levels.stop_loss, 4)}</span>
        <span class="level-item"><span class="level-label">TP1</span>${fmtNumber(levels.tp1, 4)}</span>
        <span class="level-item"><span class="level-label">R:R</span>${fmtNumber(levels.risk_reward, 2)}</span>
      </div>` : '';

    const thesisHtml = o.thesis
      ? `<div class="opp-thesis"><span class="thesis-label">Thesis</span>${escapeHTML(o.thesis)}</div>` : '';
    const invalidationHtml = o.invalidation
      ? `<div class="opp-thesis opp-invalidation"><span class="thesis-label">Invalidation</span>${escapeHTML(o.invalidation)}</div>` : '';
    const bearHtml = o.bear_case
      ? `<div class="opp-thesis opp-bear"><span class="thesis-label">Bear Case</span>${escapeHTML(o.bear_case)}</div>` : '';

    return `
      <div class="opp-card">
        <div class="opp-card-header">
          <div class="opp-card-left">
            <span class="opp-rank">#${o.rank ?? '—'}</span>
            <div>
              <span class="opp-symbol">${escapeHTML(o.symbol)}</span>
              <span class="opp-class">${escapeHTML((o.asset_class || '').replace(/_/g, ' '))}</span>
            </div>
            <span class="opp-direction direction-${direction}">${arrow} ${direction.toUpperCase()}</span>
          </div>
          <div class="opp-card-right">
            <span class="verdict ${verdictCls}">${verdict}</span>
            <span class="grade-badge grade-${gradeKey(grade)}">${escapeHTML(grade)}</span>
          </div>
        </div>
        <div class="opp-scores">
          <div class="score-chip"><span class="score-lbl">Quant</span><span class="score-val">${fmtNumber(o.quant_score)}</span></div>
          <div class="score-chip"><span class="score-lbl">AI</span><span class="score-val">${aiScore}</span></div>
          <div class="score-chip final"><span class="score-lbl">Final</span><span class="score-val">${fmtNumber(o.final_score)}</span></div>
          <div class="score-chip"><span class="score-lbl">Setup</span><span class="score-val setup-text">${escapeHTML((o.setup_type || '—').replace(/_/g, ' '))}</span></div>
          <div class="score-chip"><span class="score-lbl">Regime</span><span class="score-val">${escapeHTML((regime.dominant_regime || '—').replace(/_/g, ' '))}</span></div>
          <div class="score-chip"><span class="score-lbl">MTF</span><span class="score-val">${fmtNumber(mtf.alignment_score, 2)}</span></div>
        </div>
        ${levelsHtml}
        ${thesisHtml}
        ${invalidationHtml}
        ${bearHtml}
      </div>
    `;
  }).join('');
}

function renderAssetSummary(opps) {
  if (!opps.length) {
    return `<div class="empty-state"><div class="icon">◇</div><div>No data</div></div>`;
  }

  const LABELS = {
    forex: 'Forex', metals: 'Metals',
    large_cap_crypto: 'Large Cap Crypto', altcoin: 'Altcoin', indices: 'Indices',
  };
  const groups = {};
  for (const o of opps) {
    const cls = o.asset_class || 'other';
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push(o);
  }

  return Object.entries(groups).map(([cls, items]) => {
    const avgScore = items.reduce((s, o) => s + (o.final_score || 0), 0) / items.length;
    const grades = {};
    const setups = {};
    const regimes = {};
    for (const o of items) {
      const g = o.grade || 'D';
      grades[g] = (grades[g] || 0) + 1;
      const s = o.setup_type || 'unknown';
      setups[s] = (setups[s] || 0) + 1;
      const r = parseJsonField(o.regime) || {};
      const dom = r.dominant_regime || 'ranging';
      regimes[dom] = (regimes[dom] || 0) + 1;
    }
    const topSetup = Object.entries(setups).sort((a, b) => b[1] - a[1])[0];
    const topRegime = Object.entries(regimes).sort((a, b) => b[1] - a[1])[0];

    const gradeHtml = ['A+', 'A', 'B', 'C', 'D']
      .filter(g => grades[g])
      .map(g => `<span class="grade-badge grade-${gradeKey(g)}" style="font-size:9px;padding:1px 5px">${g}×${grades[g]}</span>`)
      .join(' ');

    return `
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-name">${escapeHTML(LABELS[cls] || cls)}</span>
          <span class="summary-avg">${fmtNumber(avgScore)}</span>
        </div>
        <div class="summary-grades">${gradeHtml}</div>
        <div class="summary-meta">
          <div><span class="summary-lbl">Setup</span>${escapeHTML((topSetup?.[0] || '—').replace(/_/g, ' '))}</div>
          <div><span class="summary-lbl">Regime</span>${escapeHTML((topRegime?.[0] || '—').replace(/_/g, ' '))}</div>
        </div>
      </div>
    `;
  }).join('');
}
