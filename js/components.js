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
  { key: 'rank',        label: '#',        align: 'left',   width: '42px'  },
  { key: 'symbol',      label: 'Symbol',   align: 'left',   width: '160px' },
  { key: 'setup_type',  label: 'Analysis', align: 'left',   width: ''      },
  { key: 'final_score', label: 'Signal',   align: 'center', width: '140px' },
  { key: 'grade',       label: 'Score',    align: 'right',  width: '110px' },
  { key: 'entry',       label: 'Levels',   align: 'right',  width: '220px' },
];

function renderOpportunitiesTable(opps) {
  if (!opps.length) {
    return `<div class="empty-state">
      <div class="icon">◯</div>
      <div>NO SCAN DATA</div>
      <div class="hint">Awaiting next scheduled scan cycle.</div>
    </div>`;
  }

  const NCOLS = OPP_COLS.length;

  const thead = OPP_COLS.map(c => {
    const sortMark = _sortCol === c.key
      ? (_sortDir === 1 ? ' <span class="sort-arrow">▲</span>' : ' <span class="sort-arrow">▼</span>')
      : '';
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
    const verdictCls = (grade === 'A+' || grade === 'A') ? 'verdict-trade' : grade === 'B' ? 'verdict-watch' : 'verdict-skip';
    const verdictLabel = (grade === 'A+' || grade === 'A') ? 'Trade' : grade === 'B' ? 'Watch' : 'Skip';
    const aiScore = o.ai_score ?? (100 - (o.bear_strength ?? 50));
    const hasDetail = o.thesis || o.invalidation || o.bear_case;
    const expandIcon = hasDetail
      ? `<span class="expand-icon">${isExpanded ? '▾' : '▸'}</span>`
      : '<span class="expand-icon-placeholder"></span>';
    const rrVal = o.entry && o.sl && o.tp1 && Math.abs(o.entry - o.sl) > 0
      ? Math.abs(o.tp1 - o.entry) / Math.abs(o.entry - o.sl) : null;

    // ── Symbol cell (2 lines) ──────────────────────────────────
    const symbolCell = `
      <div class="cell-top opp-symbol-lg">${escapeHTML(o.symbol)}</div>
      <div class="cell-bot">
        <span class="opp-class-sm">${escapeHTML((o.asset_class || '').replace(/_/g, ' '))}</span>
        <span class="direction-${direction}"> · ${arrow} ${direction.toUpperCase()}</span>
      </div>`;

    // ── Analysis cell (2 lines) ────────────────────────────────
    const setupText = (o.setup_type || '—').replace(/_/g, ' ');
    const regimeText = (o.regime || '—').replace(/_/g, ' ');
    const mtfText = o.mtf_alignment != null ? fmtNumber(o.mtf_alignment, 2) : '—';
    const analysisCell = `
      <div class="cell-top">${escapeHTML(setupText)}</div>
      <div class="cell-bot">${escapeHTML(regimeText)} <span class="cell-sep">·</span> MTF ${escapeHTML(mtfText)}</div>`;

    // ── Signal cell (verdict + grade, prominent) ──────────────
    const signalCell = `
      <div class="cell-top" style="text-align:center"><span class="verdict verdict-lg ${verdictCls}">${verdictLabel}</span></div>
      <div class="cell-bot" style="text-align:center;margin-top:7px"><span class="grade-badge grade-badge-lg grade-${gradeKey(grade)}">${escapeHTML(grade)}</span></div>`;

    // ── Score cell (number + sub, secondary) ──────────────────
    const scoreCell = `
      <div class="cell-top score-secondary">${fmtNumber(o.final_score)}</div>
      <div class="cell-bot score-detail">
        <span class="sd-item">Q<span class="sd-val">${fmtNumber(o.quant_score, 0)}</span></span>
        <span class="sd-item sd-bear">B<span class="sd-val">${fmtNumber(o.bear_strength, 0)}</span></span>
        <span class="sd-item">AI<span class="sd-val">${fmtNumber(aiScore, 0)}</span></span>
      </div>`;

    // ── Levels cell (2 lines) ──────────────────────────────────
    const entryLine = o.entry ? `<span class="lv-label">Entry</span> ${fmtPrice(o.entry)}` : '—';
    const lvDetail = [
      o.sl   ? `<span class="lv-sl">SL</span> <span class="lv-sl">${fmtPrice(o.sl)}</span>`       : null,
      o.tp1  ? `<span class="lv-tp">TP</span> <span class="lv-tp">${fmtPrice(o.tp1)}</span>`       : null,
      rrVal  ? `<span class="lv-rr">R:R</span> <span class="lv-rr">${fmtNumber(rrVal, 2)}</span>`  : null,
    ].filter(Boolean).join('<span class="cell-sep"> · </span>');
    const levelsCell = `
      <div class="cell-top levels-entry">${entryLine}</div>
      <div class="cell-bot">${lvDetail || '—'}</div>`;

    rows += `
      <tr class="opp-row${isExpanded ? ' is-expanded' : ''}${hasDetail ? ' has-detail' : ''}"
          onclick="${hasDetail ? `toggleRow('${key}')` : ''}">
        <td class="td-rank">${expandIcon}#${o.rank ?? '—'}</td>
        <td>${symbolCell}</td>
        <td>${analysisCell}</td>
        <td class="td-center">${signalCell}</td>
        <td class="td-right">${scoreCell}</td>
        <td class="td-right">${levelsCell}</td>
      </tr>
    `;

    if (isExpanded && hasDetail) {
      const blocks = [
        o.thesis       ? { cls: 'thesis-block',      label: 'Thesis',       text: o.thesis       } : null,
        o.invalidation ? { cls: 'invalidation-block', label: 'Invalidation', text: o.invalidation } : null,
        o.bear_case    ? { cls: 'bear-block',          label: 'Bear Case',    text: o.bear_case    } : null,
      ].filter(Boolean);

      rows += `
        <tr class="expand-row">
          <td colspan="${NCOLS}">
            <div class="expand-grid cols-${blocks.length}">
              ${blocks.map(b => `
                <div class="expand-block ${b.cls}">
                  <div class="expand-label">${b.label}</div>
                  <div class="expand-text">${escapeHTML(b.text)}</div>
                </div>`).join('')}
            </div>
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

function renderOpportunitiesMobile(opps) {
  if (!opps.length) {
    return `<div class="empty-state">
      <div class="icon">◯</div>
      <div>NO SCAN DATA</div>
      <div class="hint">Awaiting next scheduled scan cycle.</div>
    </div>`;
  }

  let html = '<div class="mob-list">';
  for (const o of opps) {
    const key = `${o.scan_id}__${o.symbol}`;
    const isExpanded = _expanded.has(key);
    const grade = o.grade || 'D';
    const direction = (o.direction || 'neutral').toLowerCase();
    const arrow = direction === 'long' ? '▲' : direction === 'short' ? '▼' : '─';
    const verdictCls = (grade === 'A+' || grade === 'A') ? 'verdict-trade' : grade === 'B' ? 'verdict-watch' : 'verdict-skip';
    const verdictLabel = (grade === 'A+' || grade === 'A') ? 'Trade' : grade === 'B' ? 'Watch' : 'Skip';
    const aiScore = o.ai_score ?? (100 - (o.bear_strength ?? 50));
    const setupText = (o.setup_type || '—').replace(/_/g, ' ');
    const regimeText = (o.regime || '—').replace(/_/g, ' ');
    const mtfText = o.mtf_alignment != null ? fmtNumber(o.mtf_alignment, 2) : '—';
    const rrMob = o.entry && o.sl && o.tp1 && Math.abs(o.entry - o.sl) > 0
      ? Math.abs(o.tp1 - o.entry) / Math.abs(o.entry - o.sl) : null;

    const entryLine = o.entry ? fmtPrice(o.entry) : '—';
    const slLine = o.sl   ? `<span class="lv-sl">${fmtPrice(o.sl)}</span>`   : '—';
    const tpLine = o.tp1  ? `<span class="lv-tp">${fmtPrice(o.tp1)}</span>`  : '—';
    const rrLine = rrMob  ? `<span class="lv-rr">${fmtNumber(rrMob, 2)}</span>` : '—';

    const textBlocks = [
      o.thesis       ? `<div class="mob-text-block thesis"><div class="mob-text-label">Thesis</div><div class="mob-text-content">${escapeHTML(o.thesis)}</div></div>` : '',
      o.invalidation ? `<div class="mob-text-block invalidation"><div class="mob-text-label">Invalidation</div><div class="mob-text-content">${escapeHTML(o.invalidation)}</div></div>` : '',
      o.bear_case    ? `<div class="mob-text-block bear"><div class="mob-text-label">Bear Case</div><div class="mob-text-content">${escapeHTML(o.bear_case)}</div></div>` : '',
    ].join('');

    html += `
      <div class="mob-card${isExpanded ? ' is-open' : ''}" onclick="toggleRow('${key}')">
        <div class="mob-card-header">
          <div class="mob-rank">#${o.rank ?? '—'}</div>
          <div>
            <div class="mob-sym-name">${escapeHTML(o.symbol)}</div>
            <div class="mob-sym-sub">
              <span class="opp-class-sm">${escapeHTML((o.asset_class || '').replace(/_/g, ' '))}</span>
              <span class="direction-${direction}"> · ${arrow} ${direction.toUpperCase()}</span>
            </div>
          </div>
          <div class="mob-verdict-col">
            <span class="verdict verdict-mobile ${verdictCls}">${verdictLabel}</span>
            <span class="grade-badge grade-badge-lg grade-${gradeKey(grade)}">${escapeHTML(grade)}</span>
          </div>
          <span class="mob-expand-arrow">▶</span>
        </div>
        <div class="mob-card-body">
          <div class="mob-row">
            <span class="mob-lbl">Score</span>
            <span class="mob-val mob-score-val">${fmtNumber(o.final_score)}</span>
          </div>
          <div class="mob-divider"></div>
          <div class="mob-row"><span class="mob-lbl">Setup</span><span class="mob-val">${escapeHTML(setupText)}</span></div>
          <div class="mob-row"><span class="mob-lbl">Regime</span><span class="mob-val">${escapeHTML(regimeText)}</span></div>
          <div class="mob-row"><span class="mob-lbl">MTF</span><span class="mob-val">${escapeHTML(mtfText)}</span></div>
          <div class="mob-divider"></div>
          <div class="mob-row">
            <span class="mob-lbl">Scores</span>
            <span class="mob-val">
              <span class="sd-item">Quant <span class="sd-val">${fmtNumber(o.quant_score, 0)}</span></span>
              &nbsp;
              <span class="sd-item sd-bear">Bear <span class="sd-val">${fmtNumber(o.bear_strength, 0)}</span></span>
              &nbsp;
              <span class="sd-item">AI <span class="sd-val">${fmtNumber(aiScore, 0)}</span></span>
            </span>
          </div>
          <div class="mob-divider"></div>
          <div class="mob-row"><span class="mob-lbl">Entry</span><span class="mob-val">${entryLine}</span></div>
          <div class="mob-row"><span class="mob-lbl">SL</span><span class="mob-val">${slLine}</span></div>
          <div class="mob-row"><span class="mob-lbl">TP</span><span class="mob-val">${tpLine}</span></div>
          <div class="mob-row"><span class="mob-lbl">R:R</span><span class="mob-val">${rrLine}</span></div>
          ${textBlocks ? `<div class="mob-divider"></div>${textBlocks}` : ''}
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
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
      const dom = o.regime || 'ranging';
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

// ── Intelligence Tab ─────────────────────────────────────────────

function renderMacroCard(macro) {
  if (!macro || !macro.macro_bias) {
    return `<div class="intel-card">
      <div class="panel-header"><h2>Macro Analyst</h2></div>
      <div class="intel-body"><div class="intel-text" style="color:var(--text-muted)">No macro data yet — will appear after next scan cycle.</div></div>
    </div>`;
  }

  const PAIR_ORDER = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD'];
  const biasCls = { bullish: 'bias-bullish', bearish: 'bias-bearish', neutral: 'bias-neutral' };
  const biasLabel = { bullish: '▲ BULLISH', bearish: '▼ BEARISH', neutral: '─ NEUTRAL' };

  const pairsHtml = PAIR_ORDER
    .filter(p => macro.macro_bias[p])
    .map(p => {
      const b = (macro.macro_bias[p] || 'neutral').toLowerCase();
      return `<div class="macro-pair">
        <span class="macro-sym">${escapeHTML(p)}</span>
        <span class="${biasCls[b] || 'bias-neutral'}">${biasLabel[b] || b.toUpperCase()}</span>
      </div>`;
    }).join('');

  const validUntil = macro.valid_until ? new Date(macro.valid_until) : null;
  const validText = validUntil
    ? (validUntil > new Date() ? `Valid ${fmtTime(macro.valid_until)}` : 'Cache expired — refreshing next cycle')
    : '';

  return `<div class="intel-card">
    <div class="panel-header">
      <h2>Macro Analyst</h2>
      <span class="count">${macro.macro_confidence ?? '—'}% confidence</span>
    </div>
    <div class="macro-pairs">${pairsHtml}</div>
    <div class="intel-body">
      <div class="intel-section">
        <div class="intel-label">Primary Driver</div>
        <div class="intel-text">${escapeHTML(macro.primary_driver || '—')}</div>
      </div>
      <div class="intel-section">
        <div class="intel-label">Rate Differential Trend</div>
        <div class="intel-text">${escapeHTML(macro.rate_differential_trend || '—')}</div>
      </div>
      <div class="intel-section">
        <div class="intel-label">Key Risk</div>
        <div class="intel-text">${escapeHTML(macro.key_risk_to_thesis || '—')}</div>
      </div>
    </div>
    ${validText ? `<div class="intel-meta">${escapeHTML(validText)}</div>` : ''}
  </div>`;
}

function renderRegimeDistribution(opps) {
  const REGIMES = [
    { key: 'trending_up',   label: 'Trending Up',   cls: 'rbar-up' },
    { key: 'trending_down', label: 'Trending Down',  cls: 'rbar-down' },
    { key: 'ranging',       label: 'Ranging',        cls: 'rbar-range' },
    { key: 'chop',          label: 'Chop',           cls: 'rbar-chop' },
  ];

  if (!opps.length) {
    return `<div class="intel-card">
      <div class="panel-header"><h2>Regime Distribution</h2></div>
      <div class="intel-body"><div class="intel-text" style="color:var(--text-muted)">No signals in current scan.</div></div>
    </div>`;
  }

  const counts = {};
  for (const o of opps) counts[o.regime] = (counts[o.regime] || 0) + 1;
  const total = opps.length;

  const barsHtml = REGIMES.map(r => {
    const n = counts[r.key] || 0;
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    return `<div class="regime-row">
      <span class="regime-name">${r.label}</span>
      <div class="regime-bar-wrap">
        <div class="regime-bar-fill ${r.cls}" style="width:${pct}%"></div>
      </div>
      <span class="regime-pct">${n > 0 ? n : '─'}</span>
    </div>`;
  }).join('');

  return `<div class="intel-card">
    <div class="panel-header"><h2>Regime Distribution</h2><span class="count">${total} signals</span></div>
    <div class="regime-bars">${barsHtml}</div>
  </div>`;
}

function renderSessionHistory(allScans) {
  if (!allScans || !allScans.length) {
    return `<div class="intel-card">
      <div class="panel-header"><h2>Session History</h2></div>
      <div class="intel-body"><div class="intel-text" style="color:var(--text-muted)">No scan history yet.</div></div>
    </div>`;
  }

  const recent = [...allScans]
    .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))
    .slice(0, 15);

  const sessCls = s => {
    const k = (s || '').toLowerCase().replace(' ', '_');
    return `sess-${['tokyo','london','new_york'].includes(k) ? k : 'other'}`;
  };

  const rows = recent.map(s => {
    const latency = s.total_duration_ms ? Math.round(s.total_duration_ms / 1000) + 's' : '—';
    const sess = (s.session || 'unknown').toUpperCase();
    return `<tr>
      <td>${escapeHTML(fmtTime(s.scanned_at))}</td>
      <td><span class="sess-badge ${sessCls(s.session)}">${escapeHTML(sess)}</span></td>
      <td>${s.total_scanned ?? '—'}</td>
      <td>${s.stage1_passed ?? '—'}</td>
      <td>${s.stage2_passed ?? '—'}</td>
      <td>${latency}</td>
    </tr>`;
  }).join('');

  return `<div class="intel-card">
    <div class="panel-header"><h2>Session History</h2><span class="count">${allScans.length} scans</span></div>
    <table class="session-table">
      <thead><tr><th>Time</th><th>Session</th><th>Scan</th><th>S1✓</th><th>S2✓</th><th>Latency</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
