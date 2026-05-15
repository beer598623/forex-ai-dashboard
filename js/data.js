// Data fetching layer — pulls JSON from data branch via GitHub raw CDN
const DATA_BASE = './data';

async function fetchJSON(name) {
  try {
    const resp = await fetch(`${DATA_BASE}/${name}.json?t=${Date.now()}`, { cache: 'no-cache' });
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    console.error(`Failed to fetch ${name}:`, e);
    return [];
  }
}

async function loadDashboardData() {
  const [scans, opps] = await Promise.all([
    fetchJSON('scan_results'),
    fetchJSON('opportunities'),
  ]);

  if (!scans.length || !opps.length) {
    return { latest: null, opps: [], allScans: scans };
  }

  // Sort scans desc
  scans.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
  const latest = scans[0];

  // Filter opps to latest scan
  const latestOpps = opps
    .filter(o => o.scan_id === latest.scan_id)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));

  return { latest, opps: latestOpps, allScans: scans, allOpps: opps };
}

function gradeKey(grade) {
  if (!grade) return 'D';
  return grade.replace('+', 'plus');
}

function fmtNumber(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';
}

function escapeHTML(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function parseJsonField(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}
