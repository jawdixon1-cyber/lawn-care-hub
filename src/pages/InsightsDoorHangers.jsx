import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';
import { useAuth } from '../contexts/AuthContext';

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function pathDistance(path) {
  if (!path || path.length < 2) return 0;
  let m = 0;
  for (let i = 1; i < path.length; i++) m += haversine(path[i - 1], path[i]);
  return m;
}
function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
function hangersPerHour(packs, ms) {
  if (!packs || !ms || ms <= 0) return null;
  const hours = ms / 3600000;
  return Math.round(packs / hours);
}
function formatDefaultName(ts) {
  if (!ts) return 'Trip';
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function InsightsDoorHangers() {
  const trips = useAppStore((s) => s.hangerTrips) || [];
  const setTrips = useAppStore((s) => s.setHangerTrips);
  const { ownerMode } = useAuth();
  const [period, setPeriod] = useState('all'); // 'week' | 'month' | 'all'
  const [confirmDelete, setConfirmDelete] = useState(null); // trip pending delete

  const periodStart = (() => {
    if (period === 'all') return 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === 'week') {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
    } else if (period === 'month') {
      d.setDate(1);
    }
    return d.getTime();
  })();
  const tripsInPeriod = trips.filter((t) => (t.endedAt || t.startedAt || 0) >= periodStart);

  const totalPacks = tripsInPeriod.reduce((s, t) => s + (t.packs || 0), 0);
  const totalTrips = tripsInPeriod.length;
  const totalDist = tripsInPeriod.reduce((s, t) => s + pathDistance(t.path || []), 0);
  const totalTime = tripsInPeriod.reduce((s, t) => s + Math.max(0, (t.endedAt || 0) - (t.startedAt || 0)), 0);
  const overallPace = hangersPerHour(totalPacks, totalTime);

  // 12-week histogram of hangers dropped.
  const weeks = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const s = new Date(start);
      s.setDate(s.getDate() - i * 7);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      buckets.push({ start: s.getTime(), end: e.getTime(), packs: 0, trips: 0, label: `${s.getMonth() + 1}/${s.getDate()}` });
    }
    for (const t of trips) {
      const when = t.endedAt || t.startedAt || 0;
      for (const b of buckets) {
        if (when >= b.start && when < b.end) {
          b.packs += t.packs || 0;
          b.trips++;
          break;
        }
      }
    }
    return buckets;
  }, [trips]);
  const weekMax = Math.max(1, ...weeks.map((w) => w.packs));

  // Per-person breakdown.
  const byPerson = useMemo(() => {
    const map = new Map();
    for (const t of tripsInPeriod) {
      const who = t.doneBy || 'Unknown';
      if (!map.has(who)) map.set(who, { name: who, packs: 0, trips: 0, dist: 0, time: 0 });
      const r = map.get(who);
      r.packs += t.packs || 0;
      r.trips++;
      r.dist += pathDistance(t.path || []);
      r.time += Math.max(0, (t.endedAt || 0) - (t.startedAt || 0));
    }
    return [...map.values()].sort((a, b) => b.packs - a.packs);
  }, [tripsInPeriod]);

  const doDelete = (id) => {
    setTrips(trips.filter((t) => t.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 pb-16">
      <Link to="/insights" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary cursor-pointer">
        <ArrowLeft size={16} /> Insights
      </Link>

      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary">Door Hangers</h1>
        <p className="text-sm text-tertiary font-semibold mt-1">Marketing output, pace, and team breakdown.</p>
      </div>

      {/* Period toggle */}
      <div className="inline-flex rounded-2xl border border-card-border bg-card p-1">
        {[
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'all', label: 'All Time' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer ${
              period === p.id ? 'bg-primary text-card' : 'text-tertiary hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Hangers Out" value={totalPacks} />
        <Stat label="Trips" value={totalTrips} />
        <Stat label="Distance" value={`${(totalDist / 1609.34).toFixed(1)} mi`} />
        <Stat label="Time" value={formatDuration(totalTime)} />
        <Stat label="Pace" value={overallPace ? `${overallPace}/hr` : '—'} />
      </div>

      {/* 12-week histogram */}
      <div className="rounded-3xl border border-card-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Hangers per week · last 12 weeks</p>
          <p className="text-xs font-bold text-tertiary">{trips.reduce((s, t) => s + (t.packs || 0), 0)} all-time</p>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeks.map((w, i) => {
            const isCurrent = i === weeks.length - 1;
            const h = Math.max(4, Math.round((w.packs / weekMax) * 120));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className={`text-[10px] font-bold ${w.packs > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} text-tertiary`}>
                  {w.packs}
                </span>
                <div
                  className={`w-full rounded-md ${isCurrent ? 'bg-primary' : 'bg-surface-alt border border-card-border'}`}
                  style={{ height: `${h}px` }}
                  title={`Week of ${w.label}: ${w.packs} hangers · ${w.trips} trip${w.trips === 1 ? '' : 's'}`}
                />
                <span className="text-[9px] font-bold text-tertiary truncate">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-person breakdown */}
      {byPerson.length > 0 && (
        <div className="rounded-3xl border border-card-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">By Person</p>
          </div>
          <ul className="divide-y divide-card-border">
            {byPerson.map((p) => {
              const pace = hangersPerHour(p.packs, p.time);
              return (
                <li key={p.name} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-primary truncate">{p.name}</p>
                    <p className="text-xs font-semibold text-tertiary mt-0.5">
                      {p.trips} trip{p.trips === 1 ? '' : 's'} · {(p.dist / 1609.34).toFixed(1)} mi · {formatDuration(p.time)}
                      {pace ? ` · ${pace}/hr` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-primary tabular-nums leading-none">{p.packs}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-tertiary">hangers</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Trip history */}
      {tripsInPeriod.length > 0 && (
        <section className="rounded-3xl border border-card-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">
              Trips · {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
            </p>
          </div>
          <ul className="divide-y divide-card-border">
            {[...tripsInPeriod].reverse().map((t) => {
              const dur = (t.endedAt || 0) - (t.startedAt || 0);
              const pace = hangersPerHour(t.packs, dur);
              return (
                <li key={t.id} className="py-3 px-5 flex items-center justify-between gap-3 hover:bg-surface-alt">
                  <div className="min-w-0">
                    <p className="font-bold text-primary truncate">{formatDefaultName(t.startedAt)}</p>
                    <p className="text-xs font-semibold text-tertiary">
                      {(pathDistance(t.path || []) / 1609.34).toFixed(2)} mi
                      {' · '}{t.packs || 0} hangers
                      {' · '}{formatDuration(dur)}
                      {pace ? ` · ${pace}/hr` : ''}
                      {t.doneBy ? ` · ${t.doneBy}` : ''}
                    </p>
                  </div>
                  {ownerMode && (
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="text-tertiary hover:text-rose-600 p-2 rounded-lg cursor-pointer shrink-0"
                      title="Delete trip (owner only)"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {trips.length === 0 && (
        <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
          <MapPin size={28} className="text-tertiary mx-auto mb-2" />
          <p className="text-sm font-bold text-primary">No trips yet</p>
          <p className="text-xs text-tertiary mt-1">Start a trip in Print Marketing → Door Hangers to see analytics here.</p>
        </div>
      )}

      {/* Delete-trip confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40" style={{ zIndex: 9999 }} onClick={() => setConfirmDelete(null)}>
          <div className="bg-card rounded-3xl border border-card-border max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 mb-3">
              <AlertTriangle size={22} />
            </div>
            <h2 className="text-xl font-black text-primary mb-2">Delete this trip?</h2>
            <p className="text-sm text-tertiary font-semibold mb-1">
              {formatDefaultName(confirmDelete.startedAt)}
              {' · '}{(pathDistance(confirmDelete.path || []) / 1609.34).toFixed(2)} mi
              {' · '}{confirmDelete.packs || 0} hangers
              {confirmDelete.doneBy ? ` · ${confirmDelete.doneBy}` : ''}
            </p>
            <p className="text-xs text-rose-700 font-bold mt-3 mb-5">This can't be undone.</p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-3 rounded-2xl bg-surface-alt text-secondary font-black cursor-pointer hover:bg-surface-strong"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDelete.id)}
                className="flex-1 px-4 py-3 rounded-2xl bg-rose-600 text-white font-black cursor-pointer hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">{label}</p>
      <p className="text-2xl font-black text-primary mt-1 leading-none">{value}</p>
    </div>
  );
}
