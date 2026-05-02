import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, RefreshCw, Users, TrendingUp, MapPinned, ChevronLeft, ChevronRight } from 'lucide-react';
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
        case 'start': return (startMs(a) - startMs(b)) * dir;
        case 'title': return (a.title || '').localeCompare(b.title || '') * dir;
        default: return a.name.localeCompare(b.name) * dir;
      }
    });
    return out;
  }, [sortKey, sortDir]);

  const sortedLawn = useMemo(() => sortFn(filterFn(lawnJobs)), [lawnJobs, filterFn, sortFn]);
  const sortedOther = useMemo(() => sortFn(filterFn(otherJobs)), [otherJobs, filterFn, sortFn]);
  const sortedEnded = useMemo(() => sortFn(filterFn(endedJobs)), [endedJobs, filterFn, sortFn]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' || key === 'frequency' || key === 'title' ? 'asc' : 'desc'); }
  };

  const sumMonthly = (list) => list.reduce((s, j) => s + (j.monthly || 0), 0);
  const lawnMonthly = sumMonthly(lawnJobs);
  const otherMonthly = sumMonthly(otherJobs);
  const totalMonthly = lawnMonthly + otherMonthly;
  const uniqueClientCount = activeClients.length;
  const avgMonthly = uniqueClientCount > 0 ? totalMonthly / uniqueClientCount : 0;

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
            <SortHeader field="name">Client</SortHeader>
            <SortHeader field="title">Service</SortHeader>
            <SortHeader field="frequency">Frequency</SortHeader>
            <SortHeader field="start">Start</SortHeader>
            <th className="pb-2 pr-3 text-left">End</th>
            <SortHeader field="perVisit" align="right">Per Visit</SortHeader>
            <SortHeader field="monthly" align="right">Monthly</SortHeader>
          </tr>
        </thead>
        <tbody>
          {rows.map((j, i) => {
            const startStr = fmtDate(j.startDate);
            const endStr = fmtDate(j.endDate);
            return (
              <tr key={`${j.contactId}-${j.title}-${i}`} className={`border-t border-border-subtle/50 align-top ${dim ? 'text-muted' : ''}`}>
                <td className="py-3 pr-3 text-muted text-xs">{i + 1}</td>
                <td className={`py-3 pr-3 font-medium ${dim ? '' : 'text-primary'}`}>{j.name}</td>
                <td className={`py-3 pr-3 text-xs ${dim ? '' : 'text-secondary'}`}>{j.title || '—'}</td>
                <td className={`py-3 pr-3 text-xs ${dim ? '' : 'text-secondary'}`}>{j.frequency}</td>
                <td className={`py-3 pr-3 text-xs whitespace-nowrap ${dim ? '' : 'text-secondary'}`}>{startStr || '—'}</td>
                <td className={`py-3 pr-3 text-xs whitespace-nowrap ${dim ? '' : 'text-secondary'}`}>
                  {endStr || (dim ? '—' : <span className="text-brand-text font-semibold">Ongoing</span>)}
                </td>
                <td className={`py-3 pr-3 text-right ${dim ? '' : 'text-secondary'}`}>{money(j.perVisit)}</td>
                <td className={`py-3 text-right font-semibold ${dim ? '' : 'text-brand-text'}`}>{money(j.monthly)}</td>
              </tr>
            );
          })}
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
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Monthly Revenue</p>
          <p className="text-3xl font-black text-primary mt-2">{totalMonthly > 0 ? money(totalMonthly) : '--'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Avg / Client</p>
          <p className="text-3xl font-black text-primary mt-2">{avgMonthly > 0 ? money(avgMonthly) : '--'}</p>
        </div>
      </div>

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

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, service, frequency..."
          className="flex-1 max-w-md bg-surface-alt rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder-muted focus:outline-none focus:ring-1 focus:ring-border-default"
        />
      </div>

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
    </div>
  );
}
