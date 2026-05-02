import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, RefreshCw, Users, TrendingUp, MapPinned, ChevronLeft, ChevronRight, Settings, X, GripVertical } from 'lucide-react';
import { getTodayInTimezone } from '../utils/timezone';

const ClientMapInner = lazy(() => import('../components/ClientMapInner'));

const FREQ_ORDER = { 'Weekly': 1, 'Every 2 weeks': 2, 'Monthly': 3 };
const money = (v) => v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const pct = (v) => v == null || isNaN(v) ? '—' : `${Math.round(v)}%`;
const marginTone = (m) => m == null ? 'text-muted'
  : m >= 50 ? 'text-emerald-500'
  : m >= 30 ? 'text-amber-400'
  : m >= 0 ? 'text-orange-500'
  : 'text-red-500';

// Column registry for the recurring-clients tables. Keep '#' implicit/first.
const COL_DEFS = {
  name: {
    label: 'Client', sortField: 'name', align: 'left',
    cell: (j, dim) => <span className={`font-medium ${dim ? '' : 'text-primary'}`}>{j.name}</span>,
  },
  title: {
    label: 'Service', sortField: 'title', align: 'left',
    cell: (j, dim) => (
      <span
        className={`block max-w-[220px] truncate text-xs ${dim ? '' : 'text-secondary'}`}
        title={j.title || ''}
      >
        {j.title || '—'}
      </span>
    ),
  },
  frequency: {
    label: 'Frequency', sortField: 'frequency', align: 'left',
    cell: (j, dim) => <span className={`text-xs ${dim ? '' : 'text-secondary'}`}>{j.frequency}</span>,
  },
  start: {
    label: 'Start', sortField: 'start', align: 'left',
    cell: (j, dim) => <span className={`text-xs whitespace-nowrap ${dim ? '' : 'text-secondary'}`}>{fmtDate(j.startDate) || '—'}</span>,
  },
  end: {
    label: 'End', align: 'left',
    cell: (j, dim) => {
      const end = fmtDate(j.endDate);
      if (end) return <span className={`text-xs whitespace-nowrap ${dim ? '' : 'text-secondary'}`}>{end}</span>;
      return dim ? <span className="text-xs whitespace-nowrap">—</span> : <span className="text-xs whitespace-nowrap text-brand-text font-semibold">Ongoing</span>;
    },
  },
  perVisit: {
    label: 'Per Visit', sortField: 'perVisit', align: 'right',
    cell: (j, dim) => <span className={dim ? '' : 'text-secondary'}>{money(j.perVisit)}</span>,
  },
  monthly: {
    label: 'Monthly', sortField: 'monthly', align: 'right',
    cell: (j, dim) => <span className={`font-semibold ${dim ? '' : 'text-brand-text'}`}>{money(j.monthly)}</span>,
  },
  profitPct: {
    label: 'Profit %', sortField: 'profitPct', align: 'right',
    cell: (j) => {
      if (j.profitLoading) return <span className="text-muted text-xs">…</span>;
      if (j.profitPct == null) return <span className="text-muted">—</span>;
      return <span className={`font-semibold ${marginTone(j.profitPct)}`}>{pct(j.profitPct)}</span>;
    },
  },
};
const DEFAULT_COL_ORDER = ['name', 'title', 'frequency', 'start', 'end', 'perVisit', 'monthly', 'profitPct'];
const COL_ORDER_KEY = 'recurring-clients-col-order';

function loadColOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(COL_ORDER_KEY) || 'null');
    if (Array.isArray(stored) && stored.length === DEFAULT_COL_ORDER.length
        && stored.every(id => DEFAULT_COL_ORDER.includes(id))
        && new Set(stored).size === stored.length) {
      return stored;
    }
  } catch { /* ignore */ }
  return DEFAULT_COL_ORDER;
}

// Aggregate labor visits by Jobber jobId → { rev, labor, expenses, margin }
function buildLaborByJob(daysObj) {
  const map = {};
  for (const day of Object.values(daysObj || {})) {
    for (const v of (day.visits || [])) {
      if (!v.jobId) continue;
      if (!map[v.jobId]) map[v.jobId] = { rev: 0, labor: 0, expenses: 0 };
      map[v.jobId].rev += (v.rawJobTotal ?? v.jobTotal) || 0;
      map[v.jobId].labor += v.labor?.totalCost || 0;
      map[v.jobId].expenses += v.jobExpenses || 0;
    }
  }
  for (const id in map) {
    const m = map[id];
    m.margin = m.rev > 0 ? ((m.rev - m.labor - m.expenses) / m.rev) * 100 : null;
  }
  return map;
}
const REPORTS = [
  { id: 'clients', path: '/insights/clients', label: 'Recurring Clients', description: 'Full roster with frequency, service, dates, and revenue', icon: Users },
  { id: 'leads', path: '/insights/leads', label: 'Leads', description: 'Where your requests come from and how sources perform', icon: MapPinned },
  { id: 'profitability', path: '/insights/profitability-full', label: 'Profitability', description: 'One-off jobs, recurring jobs, labor + contribution margin per job', icon: TrendingUp },
  { id: 'profitability-today', path: '/insights/profitability', label: 'Profitability Today', description: 'Today\'s lawns with labor cost, revenue, and per-crew breakdown', icon: TrendingUp },
];

export default function Insights() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Insights</h1>
        <p className="text-sm text-muted mt-1">Pick a report</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => navigate(r.path)}
              className="bg-card rounded-2xl border border-border-subtle p-5 text-left hover:border-brand transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-text" />
                </div>
                <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors mt-1" />
              </div>
              <p className="text-base font-bold text-primary">{r.label}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{r.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RecurringClientsReport() {
  const navigate = useNavigate();
  const [lawnJobs, setLawnJobs] = useState([]);
  const [otherJobs, setOtherJobs] = useState([]);
  const [endedJobs, setEndedJobs] = useState([]);
  const [activeClients, setActiveClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [geocoded, setGeocoded] = useState([]);
  const [showEnded, setShowEnded] = useState(true);
  const [colOrder, setColOrder] = useState(loadColOrder);
  const [showSettings, setShowSettings] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { idx, position: 'before' | 'after' }
  const [laborByJob, setLaborByJob] = useState(null); // null=loading, {}=loaded

  useEffect(() => {
    try { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(colOrder)); } catch { /* ignore */ }
  }, [colOrder]);

  const dropAt = (from, overIdx, position) => {
    if (from == null || overIdx == null) return;
    setColOrder(prev => {
      const without = prev.filter((_, i) => i !== from);
      let insertAt = overIdx;
      if (from < overIdx) insertAt -= 1;
      if (position === 'after') insertAt += 1;
      insertAt = Math.max(0, Math.min(without.length, insertAt));
      const next = [...without];
      next.splice(insertAt, 0, prev[from]);
      return next;
    });
  };
  const resetCols = () => setColOrder(DEFAULT_COL_ORDER);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/jobber-data?action=recurring-summary')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => {
        setLawnJobs(d?.lawnJobs || []);
        setOtherJobs(d?.otherJobs || []);
        setEndedJobs(d?.endedJobs || []);
        setActiveClients(d?.recurringClientList || []);
      })
      .catch(err => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Profitability per job: parallel-fetch labor data for last 90 days, aggregate by Jobber jobId.
  useEffect(() => {
    const today = getTodayInTimezone();
    const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    setLaborByJob(null);
    fetch(`/api/jobber-data?action=labor&start=${start}&end=${today}&skipLineItems=1&skipJobExpenses=1`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setLaborByJob(buildLaborByJob(d)))
      .catch(() => setLaborByJob({})); // failed → mark loaded with empty so column shows "—"
  }, []);

  // Enrich job rows with profitPct from the labor lookup.
  const enrich = useCallback((rows) => {
    if (laborByJob === null) {
      return rows.map(r => ({ ...r, profitLoading: true, profitPct: null }));
    }
    return rows.map(r => {
      const m = laborByJob[r.sourceId];
      return { ...r, profitLoading: false, profitPct: m?.margin ?? null };
    });
  }, [laborByJob]);

  // Pull geocoded client coords from the dominate endpoint (same Jobber data, already geocoded server-side)
  useEffect(() => {
    fetch('/api/commander/dominate')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.clients) setGeocoded(d.clients); })
      .catch(() => {});
  }, []);

  const mappedClients = useMemo(() => {
    if (!geocoded.length || !activeClients.length) return [];
    const byName = new Map(geocoded.filter(g => g.lat && g.lng).map(g => [g.name.toLowerCase().trim(), g]));
    return activeClients.map((c, i) => {
      const g = byName.get(c.name.toLowerCase().trim());
      if (!g) return null;
      return {
        id: `rc-${i}`,
        name: c.name,
        address: [g.street, g.city].filter(Boolean).join(', '),
        monthlyPrice: c.monthly,
        mapCenter: { lat: g.lat, lng: g.lng },
      };
    }).filter(Boolean);
  }, [activeClients, geocoded]);

  const mapCenter = useMemo(() => {
    if (mappedClients.length === 0) return [34.9249, -81.025]; // Rock Hill, SC fallback
    const lat = mappedClients.reduce((s, c) => s + c.mapCenter.lat, 0) / mappedClients.length;
    const lng = mappedClients.reduce((s, c) => s + c.mapCenter.lng, 0) / mappedClients.length;
    return [lat, lng];
  }, [mappedClients]);

  const freqSortVal = (j) => FREQ_ORDER[j.frequency] ?? 10;

  const filterFn = useCallback((list) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(j =>
      j.name.toLowerCase().includes(q) ||
      (j.title || '').toLowerCase().includes(q) ||
      (j.frequency || '').toLowerCase().includes(q)
    );
  }, [search]);

  const sortFn = useCallback((list) => {
    const out = [...list];
    const dir = sortDir === 'asc' ? 1 : -1;
    const startMs = (j) => j.startDate ? new Date(j.startDate).getTime() : Infinity;
    out.sort((a, b) => {
      switch (sortKey) {
        case 'frequency': return (freqSortVal(a) - freqSortVal(b)) * dir;
        case 'perVisit': return ((a.perVisit ?? -Infinity) - (b.perVisit ?? -Infinity)) * dir;
        case 'monthly': return ((a.monthly ?? -Infinity) - (b.monthly ?? -Infinity)) * dir;
        case 'profitPct': return ((a.profitPct ?? -Infinity) - (b.profitPct ?? -Infinity)) * dir;
        case 'start': return (startMs(a) - startMs(b)) * dir;
        case 'title': return (a.title || '').localeCompare(b.title || '') * dir;
        default: return a.name.localeCompare(b.name) * dir;
      }
    });
    return out;
  }, [sortKey, sortDir]);

  const sortedLawn = useMemo(() => sortFn(filterFn(enrich(lawnJobs))), [lawnJobs, enrich, filterFn, sortFn]);
  const sortedOther = useMemo(() => sortFn(filterFn(enrich(otherJobs))), [otherJobs, enrich, filterFn, sortFn]);
  const sortedEnded = useMemo(() => sortFn(filterFn(enrich(endedJobs))), [endedJobs, enrich, filterFn, sortFn]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      const ascByDefault = key === 'name' || key === 'frequency' || key === 'title';
      setSortDir(ascByDefault ? 'asc' : 'desc');
    }
  };

  const sumMonthly = (list) => list.reduce((s, j) => s + (j.monthly || 0), 0);
  const lawnMonthly = sumMonthly(lawnJobs);
  const otherMonthly = sumMonthly(otherJobs);
  const uniqueClientCount = activeClients.length;
  const avgMonthly = uniqueClientCount > 0 ? lawnMonthly / uniqueClientCount : 0;

  const SortHeader = ({ field, align, children }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`pb-2 pr-3 cursor-pointer select-none hover:text-primary transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={10} className={sortKey === field ? 'text-brand-text' : 'opacity-30'} />
      </span>
    </th>
  );

  const JobsTable = ({ rows, dim }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted uppercase tracking-wide">
            <th className="pb-2 pr-3 text-left">#</th>
            {colOrder.map(id => {
              const def = COL_DEFS[id];
              return def.sortField
                ? <SortHeader key={id} field={def.sortField} align={def.align}>{def.label}</SortHeader>
                : <th key={id} className={`pb-2 pr-3 ${def.align === 'right' ? 'text-right' : 'text-left'}`}>{def.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((j, i) => (
            <tr key={`${j.contactId}-${j.title}-${i}`} className={`border-t border-border-subtle/50 align-top ${dim ? 'text-muted' : ''}`}>
              <td className="py-3 pr-3 text-muted text-xs">{i + 1}</td>
              {colOrder.map(id => {
                const def = COL_DEFS[id];
                return (
                  <td key={id} className={`py-3 pr-3 ${def.align === 'right' ? 'text-right' : ''}`}>
                    {def.cell(j, dim)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/insights')}
          className="p-2 rounded-lg hover:bg-surface-alt cursor-pointer"
        >
          <ChevronLeft size={18} className="text-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-primary">Recurring Clients</h1>
          <p className="text-sm text-muted mt-0.5">Roster, revenue, and service breakdown</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border-default bg-card text-secondary text-sm font-semibold hover:bg-surface disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Recurring Clients</p>
          <p className="text-3xl font-black text-brand-text mt-2">{uniqueClientCount || '--'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Monthly Lawn Revenue</p>
          <p className="text-3xl font-black text-primary mt-2">{lawnMonthly > 0 ? money(lawnMonthly) : '--'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Avg / Client</p>
          <p className="text-3xl font-black text-primary mt-2">{avgMonthly > 0 ? money(avgMonthly) : '--'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, service, frequency..."
          className="flex-1 max-w-md bg-surface-alt rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder-muted focus:outline-none focus:ring-1 focus:ring-border-default"
        />
        <button
          onClick={() => setShowSettings(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-card text-secondary text-sm font-semibold hover:bg-surface cursor-pointer"
        >
          <Settings size={14} />
          Columns
        </button>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border-subtle p-5 w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">Reorder Columns</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded hover:bg-surface-alt cursor-pointer"
              >
                <X size={16} className="text-muted" />
              </button>
            </div>
            <p className="text-xs text-muted">Drag to reorder. Saved on this device.</p>
            <div className="relative">
              {colOrder.map((id, idx) => {
                const isDragging = dragIdx === idx;
                const showLineBefore = dropTarget?.idx === idx && dropTarget?.position === 'before' && dragIdx !== idx;
                const showLineAfter = dropTarget?.idx === idx && dropTarget?.position === 'after' && dragIdx !== idx;
                return (
                  <div key={id} className="relative">
                    {showLineBefore && (
                      <div className="absolute -top-0.5 left-0 right-0 h-1 bg-brand-text rounded-full pointer-events-none z-10" />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDragIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                        if (dropTarget?.idx !== idx || dropTarget?.position !== position) {
                          setDropTarget({ idx, position });
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dropTarget) dropAt(dragIdx, dropTarget.idx, dropTarget.position);
                        setDragIdx(null);
                        setDropTarget(null);
                      }}
                      onDragEnd={() => { setDragIdx(null); setDropTarget(null); }}
                      className={`flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-2 my-1 cursor-grab active:cursor-grabbing select-none transition-opacity
                        ${isDragging ? 'opacity-40' : ''}`}
                    >
                      <GripVertical size={14} className="text-muted shrink-0" />
                      <span className="text-sm text-primary">{COL_DEFS[id].label}</span>
                    </div>
                    {showLineAfter && (
                      <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-brand-text rounded-full pointer-events-none z-10" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={resetCols}
                className="text-xs text-muted hover:text-primary cursor-pointer"
              >
                Reset to default
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 rounded-lg bg-brand text-brand-text-on text-sm font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {error && lawnJobs.length === 0 && otherJobs.length === 0 && (
        <p className="text-sm text-red-500 py-8 text-center">{error}</p>
      )}
      {!error && loading && lawnJobs.length === 0 && otherJobs.length === 0 && (
        <p className="text-sm text-muted py-16 text-center">Loading…</p>
      )}

      <div className="bg-card rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-text" />
            <h2 className="text-sm font-bold text-primary">Lawn Maintenance</h2>
            <span className="text-xs text-muted">({sortedLawn.length})</span>
          </div>
          <div className="text-xs text-muted">
            <span className="font-semibold text-brand-text">{money(lawnMonthly)}</span>/mo
          </div>
        </div>
        {sortedLawn.length === 0
          ? <p className="text-sm text-muted py-8 text-center">No active lawn maintenance jobs.</p>
          : <JobsTable rows={sortedLawn} />}
      </div>

      <div className="bg-card rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-text" />
            <h2 className="text-sm font-bold text-primary">Other Recurring Services</h2>
            <span className="text-xs text-muted">({sortedOther.length})</span>
          </div>
          <div className="text-xs text-muted">
            <span className="font-semibold text-brand-text">{money(otherMonthly)}</span>/mo
          </div>
        </div>
        {sortedOther.length === 0
          ? <p className="text-sm text-muted py-8 text-center">No other recurring services.</p>
          : <JobsTable rows={sortedOther} />}
      </div>

      {endedJobs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <button
            onClick={() => setShowEnded(!showEnded)}
            className="flex items-center justify-between w-full mb-4 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted" />
              <h2 className="text-sm font-bold text-secondary">Ended Recurring Services</h2>
              <span className="text-xs text-muted">({sortedEnded.length})</span>
            </div>
            <ChevronRight size={16} className={`text-muted transition-transform ${showEnded ? 'rotate-90' : ''}`} />
          </button>
          {showEnded && <JobsTable rows={sortedEnded} dim />}
        </div>
      )}

      {mappedClients.length > 0 && (
        <div className="bg-card rounded-2xl border border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <MapPinned size={16} className="text-brand-text" />
              <h2 className="text-sm font-bold text-primary">Where they are</h2>
            </div>
            <span className="text-xs text-muted">{mappedClients.length} of {uniqueClientCount} pinned</span>
          </div>
          <div style={{ height: 420 }}>
            <Suspense fallback={<div className="w-full h-full bg-surface-alt flex items-center justify-center text-sm text-muted">Loading map…</div>}>
              <ClientMapInner center={mapCenter} clients={mappedClients} onSelect={() => {}} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
