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

const OPP_COLS = [
  { key: 'rank',       label: '#',      align: 'left',   width: '36px' },
  { key: 'symbol',     label: 'Symbol', align: 'left',   width: '140px' },
  { key: 'direction',  label: 'Bias',   align: 'left',   width: '80px' },
  { key: 'setup_type', label: 'Setup',  align: 'left',   width: '' },
  { key: 'quant_score',label: 'Quant',  align: 'right',  width: '58px' },
  { key: 'ai_score',   label: 'AI',     align: 'right',  width: '58px' },
  { key: 'final_score',label: 'Final',  align: 'right',  width: '62px' },
  { key: 'grade',      label: 'Verdict',align: 'center', width: '96px' },
  { key: 'mtf_score',  label: 'MTF',   align: 'right',  width: '52px' },
];

function renderOpportunitiesTable(opps) {
  if (!opps.length) {
    return `<div class="empty-state">
      <div class="icon">◯</div>
      <div>NO SCAN DATA</div>
      <div class="hint">Awaiting next scheduled scan cycle.</div>
    </div>`;
  }

  const thead = OPP_COLS.map(c => {
    const sortMark = _sortCol === c.key ? (_sortDir === 1 ? ' <span class="sort-arrow">▲</span>' : ' <span class="sort-arrow">▼</span>') : '';
    const style = c.width ? ` style="width:${c.width}"` : '';
    return `<th class="th-${c.align} sortable${_sortCol === c.key ? ' active' : ''}"${style} onclick="sortBy('${c.key}')">${c.label}${sortMark}</th>`;
  }).join('');

  let rows = '';
  for (const o of opps) {
    const key = `${o.scan_id}__${o.symbol}`;
    const isExpanded = _expanded.has(key);
    const grade = o.grade || 'D';
    const direction = (o.direction || 'neutral').toLowerCase();
    const arrow = direction === 'long' ? '▲' : direction === 'short' ? '▼' : '─';
    const verdict = (grade === 'A+' || grade === 'A') ? 'TRADE' : grade === 'B' ? 'WATCH' : 'SKIP';
    const verdictCls = (grade === 'A+' || grade === 'A') ? 'verdict-trade' : grade === 'B' ? 'verdict-watch' : 'verdict-skip';
    const mtf = parseJsonField(o.mtf_alignment) || {};
    const aiScore = fmtNumber(o.ai_score ?? (100 - (o.bear_strength ?? 50)));
    const hasDetail = o.thesis || o.invalidation || o.bear_case;
    const expandIcon = hasDetail ? `<span class="expand-icon">${isExpanded ? '▾' : '▸'}</span>` : '';

    rows += `
      <tr class="opp-row${isExpanded ? ' is-expanded' : ''}${hasDetail ? ' has-detail' : ''}" onclick="toggleRow('${key}')">
        <td class="td-rank">${expandIcon}#${o.rank ?? '—'}</td>
        <td>
          <span class="opp-symbol">${escapeHTML(o.symbol)}</span>
          <span class="opp-class">${escapeHTML((o.asset_class || '').replace(/_/g, ' '))}</span>
        </td>
        <td class="direction-${direction} mono">${arrow} ${direction.toUpperCase()}</td>
        <td class="td-setup">${escapeHTML((o.setup_type || '—').replace(/_/g, ' '))}</td>
        <td class="td-num">${fmtNumber(o.quant_score)}</td>
        <td class="td-num">${aiScore}</td>
        <td class="td-num td-final">${fmtNumber(o.final_score)}</td>
        <td class="td-center">
          <span class="verdict ${verdictCls}">${verdict}</span>
          <span class="grade-badge grade-${gradeKey(grade)}">${escapeHTML(grade)}</span>
        </td>
        <td class="td-num">${fmtNumber(mtf.alignment_score, 2)}</td>
      </tr>
    `;

    if (isExpanded && hasDetail) {
      const blocks = [
        o.thesis       ? { cls: 'thesis-block',       label: 'Thesis',       text: o.thesis } : null,
        o.invalidation ? { cls: 'invalidation-block',  label: 'Invalidation', text: o.invalidation } : null,
        o.bear_case    ? { cls: 'bear-block',           label: 'Bear Case',    text: o.bear_case } : null,
      ].filter(Boolean);

      const blocksHtml = blocks.map(b => `
        <div class="expand-block ${b.cls}">
          <div class="expand-label">${b.label}</div>
          <div class="expand-text">${escapeHTML(b.text)}</div>
        </div>
      `).join('');

      rows += `
        <tr class="expand-row">
          <td colspan="9">
            <div class="expand-grid cols-${blocks.length}">${blocksHtml}</div>
          </td>
        </tr>
      `;
    }
  }

  return `
    <div class="opp-table-wrap">
      <table class="opp-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
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
