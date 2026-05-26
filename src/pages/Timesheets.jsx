import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, ExternalLink, Users, RefreshCw, Plug, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CONFIRMED_KEY = 'greenteam-timesheets-confirmed';
const CACHE_KEY = 'greenteam-timesheets-cache'; // { [rangeKey]: { entries, fetchedAt } }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — stale-while-revalidate
const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function readJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }

function startOfWeek(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function fmtTime(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
function fmtDuration(hours) {
  if (!hours) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtLongDate(d) {
  return `${DAY_LABELS_LONG[d.getDay()]} ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtShortDate(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callFn(name, params = {}) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Not signed in');
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    let err; try { err = JSON.parse(body); } catch { err = { error: body }; }
    const e = new Error(err.error || `HTTP ${res.status}`);
    e.status = res.status; throw e;
  }
  return res.json();
}

export default function Timesheets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectStatus] = useState(() => searchParams.get('connect'));
  useEffect(() => {
    if (searchParams.get('connect')) {
      searchParams.delete('connect');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [view, setView] = useState('day'); // 'day' | 'week'
  const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [confirmed, setConfirmed] = useState(() => readJSON(CONFIRMED_KEY, {}));
  const [expanded, setExpanded] = useState({}); // { userId: true } when expanded
  const [connected, setConnected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => writeJSON(CONFIRMED_KEY, confirmed), [confirmed]);

  // Connection check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('jobber_connection').select('*').maybeSingle();
      if (!cancelled) setConnected(!!data);
    })();
    return () => { cancelled = true; };
  }, []);

  // Date range for current view
  const range = useMemo(() => {
    if (view === 'day') return { start: currentDate, end: currentDate };
    const wkStart = startOfWeek(currentDate);
    return { start: wkStart, end: addDays(wkStart, 6) };
  }, [view, currentDate]);

  const rangeKey = `${isoDate(range.start)}_${isoDate(range.end)}`;

  const [fetchedAt, setFetchedAt] = useState(null);

  // Fetch entries (with stale-while-revalidate cache)
  const fetchEntries = async (force = false) => {
    setError('');
    // 1) Try cache first
    const cache = readJSON(CACHE_KEY, {});
    const cached = cache[rangeKey];
    if (cached && !force) {
      setEntries(cached.entries);
      setFetchedAt(cached.fetchedAt);
      // If cache is fresh, no need to refetch
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return;
      }
      // Otherwise fall through and revalidate in background (no loading spinner)
    } else {
      setLoading(true);
    }

    try {
      const { entries: e } = await callFn('jobber-timesheets', {
        start: isoDate(range.start),
        end: isoDate(range.end),
      });
      setEntries(e);
      const now = Date.now();
      setFetchedAt(now);
      const next = readJSON(CACHE_KEY, {});
      next[rangeKey] = { entries: e, fetchedAt: now };
      writeJSON(CACHE_KEY, next);
    } catch (err) {
      if (err.status === 409 || err.message === 'not_connected') setConnected(false);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, rangeKey]);

  // Auto-refresh: on tab focus (immediate) + poll every 30s while page is visible.
  useEffect(() => {
    if (!connected) return;
    const refreshIfReasonable = () => {
      if (document.visibilityState !== 'visible') return;
      if (fetchedAt && Date.now() - fetchedAt < 1_000) return; // 1s debounce on remounts
      fetchEntries(true);
    };
    const onFocus = () => refreshIfReasonable();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchEntries(true);
    }, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, rangeKey, fetchedAt]);

  // "Last updated" ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdatedLabel = useMemo(() => {
    if (!fetchedAt) return null;
    const secs = Math.floor((Date.now() - fetchedAt) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
    // tick re-evaluates the memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedAt, tick]);

  // Group entries by user + run anomaly rules
  const grouped = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.userId]) map[e.userId] = { id: e.userId, name: e.userName, entries: [], total: 0, issues: [] };
      map[e.userId].entries.push(e);
      map[e.userId].total += e.hours || 0;
    }
    for (const g of Object.values(map)) {
      g.entries.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

      // Per-entry rules — attach issues to the entry
      for (let i = 0; i < g.entries.length; i++) {
        const e = g.entries[i];
        e.issues = [];
        const isGeneral = !e.visitTitle;
        // 1) General > 30 min
        if (isGeneral && e.hours && e.hours > 0.5) {
          e.issues.push({ level: 'warn', msg: `General entry of ${fmtDuration(e.hours)} — probably forgot to clock back into a job` });
        }
        // 2) Missing end time
        if (!e.endAt) {
          e.issues.push({ level: 'error', msg: 'No end time — forgot to clock out' });
        }
        // 3) Visit < 5 min
        if (!isGeneral && e.hours !== null && e.hours < (5 / 60)) {
          e.issues.push({ level: 'warn', msg: `Only ${Math.round((e.hours || 0) * 60)}m — accidental clock-in?` });
        }
        // 4) Overlapping entries (more than 60s overlap — sub-minute is just clock-out/in fuzz)
        if (i < g.entries.length - 1 && e.endAt) {
          const next = g.entries[i + 1];
          const overlapMs = new Date(e.endAt) - new Date(next.startAt);
          if (overlapMs > 60_000) {
            const mins = Math.round(overlapMs / 60000);
            const nextLabel = next.visitTitle || 'General';
            const thisLabel = e.visitTitle || 'General';
            e.issues.push({ level: 'error', msg: `Overlaps "${nextLabel}" by ${mins}m — can't be in 2 places at once` });
            next.issues = next.issues || [];
            next.issues.push({ level: 'error', msg: `Overlaps "${thisLabel}" by ${mins}m — starts before previous job ended` });
          }
        }
        if (e.issues.length > 0) g.issues.push(...e.issues.map((iss) => ({ ...iss, entryId: e.id })));
      }

      // Per-day rules — total > 11 hr
      const byDay = {};
      for (const e of g.entries) {
        const k = isoDate(new Date(e.startAt));
        byDay[k] = (byDay[k] || 0) + (e.hours || 0);
      }
      for (const [day, hrs] of Object.entries(byDay)) {
        if (hrs > 11) {
          g.issues.push({ level: 'warn', msg: `${fmtDuration(hrs)} on ${day} — review for double-counting`, entryId: null, dayOnly: true });
        }
      }
    }
    const list = Object.values(map).sort((a, b) => a.name.localeCompare(b.name));

    // 5) Cross-user clock-in sync rule:
    // For each day, take each person's first entry. If two+ people started within 60min of each other
    // (= same crew event) but at different times, flag the ones not at the latest start time.
    // This implements: "all crew should clock in at the same time = the latest arrival".
    const firstByUserByDay = {}; // { [day]: [{user, entry}] }
    for (const g of list) {
      const seenDays = new Set();
      for (const e of g.entries) {
        const day = isoDate(new Date(e.startAt));
        if (seenDays.has(day)) continue;
        seenDays.add(day);
        if (!firstByUserByDay[day]) firstByUserByDay[day] = [];
        firstByUserByDay[day].push({ user: g, entry: e });
      }
    }
    for (const [day, arr] of Object.entries(firstByUserByDay)) {
      if (arr.length < 2) continue;
      // Sort by start time
      arr.sort((a, b) => new Date(a.entry.startAt) - new Date(b.entry.startAt));
      // Find clusters: each item within 60 min of the NEXT item is in the same cluster
      const clusters = [];
      let current = [arr[0]];
      for (let i = 1; i < arr.length; i++) {
        const prev = current[current.length - 1].entry.startAt;
        const cur = arr[i].entry.startAt;
        if ((new Date(cur) - new Date(prev)) <= 60 * 60 * 1000) {
          current.push(arr[i]);
        } else {
          clusters.push(current);
          current = [arr[i]];
        }
      }
      clusters.push(current);
      // For each cluster of 2+, if start times differ, flag everyone NOT at the latest
      for (const cluster of clusters) {
        if (cluster.length < 2) continue;
        const latest = cluster[cluster.length - 1].entry.startAt;
        for (const { user, entry } of cluster) {
          if (entry.startAt !== latest) {
            const minutesOff = Math.round((new Date(latest) - new Date(entry.startAt)) / 60000);
            entry.issues = entry.issues || [];
            entry.issues.push({
              level: 'warn',
              msg: `Clocked in ${minutesOff}m before crew (latest in cluster: ${fmtTime(latest)})`,
            });
            user.issues.push({ level: 'warn', msg: `${minutesOff}m early clock-in vs crew`, entryId: entry.id });
          }
        }
      }
    }

    return list;
  }, [entries]);

  // Total issue count across all crew
  const totalIssues = grouped.reduce((s, g) => s + g.issues.length, 0);

  // Group entries chronologically:
  //  - Visit entries cluster by visit (so crew on the same job = one card)
  //  - But within a visit, split into SESSIONS — entries within 60 min of each other = same session.
  //    This handles the case where someone comes back to the same job hours later (separate session).
  //  - General entries cluster by 5-min start-time window (so the whole crew driving together = one card)
  const groupedByVisit = useMemo(() => {
    const map = {};
    for (const e of entries) {
      let key;
      if (e.visitTitle) {
        // Cluster by title+client so crew on the same job land in one card.
        // (Jobber sometimes assigns different visit IDs to crew on the same job, so visit.id is too granular.)
        // Time-based session splitting (below) handles the case where a person comes back to the same job later.
        key = `visit-${e.visitTitle}-${e.clientName || ''}`;
      } else {
        const startMs = new Date(e.startAt).getTime();
        const bucketMs = Math.floor(startMs / (5 * 60 * 1000)) * (5 * 60 * 1000);
        key = `general-${bucketMs}`;
      }
      if (!map[key]) {
        map[key] = {
          key,
          isGeneral: !e.visitTitle,
          title: e.visitTitle || 'General',
          client: e.clientName || null,
          entries: [],
          sessions: [],
        };
      }
      map[key].entries.push(e);
    }
    const list = Object.values(map);
    for (const v of list) {
      v.entries.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      // Split entries into sessions: each session = entries within 60 min of the session's start
      const SESSION_GAP_MIN = 60;
      v.sessions = [];
      let current = null;
      for (const e of v.entries) {
        if (!current) {
          current = { entries: [e] };
        } else {
          const firstStart = new Date(current.entries[0].startAt).getTime();
          const eStart = new Date(e.startAt).getTime();
          if ((eStart - firstStart) <= SESSION_GAP_MIN * 60 * 1000) {
            current.entries.push(e);
          } else {
            v.sessions.push(current);
            current = { entries: [e] };
          }
        }
      }
      if (current) v.sessions.push(current);
    }
    // Sort cards chronologically by earliest start
    list.sort((a, b) => new Date(a.entries[0].startAt) - new Date(b.entries[0].startAt));
    // Crew sync rule (consensus + 3-minute tolerance):
    //  - Compare times at the minute (display) level so 8:59:30 and 8:59:45 are the same.
    //  - Use the median time as the consensus (robust to outliers).
    //  - An entry is flagged only if it differs from the median by MORE than 3 minutes.
    const TOLERANCE_MIN = 3;
    const minuteKey = (iso) => (iso ? Math.floor(new Date(iso).getTime() / 60000) : null);
    const median = (vals) => {
      const sorted = vals.filter((v) => v != null).sort((a, b) => a - b);
      if (!sorted.length) return null;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };
    for (const v of list) {
      for (const session of v.sessions) {
        if (session.entries.length < 2) {
          for (const e of session.entries) { e._mismatch = null; }
          continue;
        }
        const startMedian = median(session.entries.map((e) => minuteKey(e.startAt)));
        const endMedian = median(session.entries.map((e) => minuteKey(e.endAt)));
        for (const e of session.entries) {
          const sk = minuteKey(e.startAt);
          const ek = minuteKey(e.endAt);
          const startMismatch = sk != null && startMedian != null && Math.abs(sk - startMedian) > TOLERANCE_MIN;
          const endMismatch = ek != null && endMedian != null && Math.abs(ek - endMedian) > TOLERANCE_MIN;
          e._mismatch = (startMismatch || endMismatch) ? { startMismatch, endMismatch } : null;
        }
      }
    }
    return list;
  }, [entries]);

  const weekTotal = grouped.reduce((s, g) => s + g.total, 0);
  const confirmKey = rangeKey;
  const isConfirmed = (uid) => !!((confirmed[confirmKey] || {})[uid]);
  const toggleConfirmed = (uid) => setConfirmed((c) => ({
    ...c, [confirmKey]: { ...(c[confirmKey] || {}), [uid]: !isConfirmed(uid) },
  }));
  const allConfirmed = grouped.length > 0 && grouped.every((g) => isConfirmed(g.id));
  const confirmedCount = grouped.filter((g) => isConfirmed(g.id)).length;

  const prev = () => setCurrentDate((d) => addDays(d, view === 'day' ? -1 : -7));
  const next = () => setCurrentDate((d) => addDays(d, view === 'day' ? 1 : 7));
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); setCurrentDate(d); };

  const dateLabel = view === 'day'
    ? fmtLongDate(currentDate)
    : `${fmtShortDate(range.start)} — ${fmtShortDate(range.end)}`;

  const toggleExpand = (uid) => setExpanded((e) => ({ ...e, [uid]: !e[uid] }));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => { const d = new Date(currentDate); d.setDate(1); return d; });
  useEffect(() => { const d = new Date(currentDate); d.setDate(1); setPickerMonth(d); }, [currentDate]);
  const monthLabel = pickerMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthDays = useMemo(() => {
    const first = new Date(pickerMonth);
    first.setDate(1);
    const firstDayOfWeek = first.getDay();
    const start = addDays(first, -firstDayOfWeek);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [pickerMonth]);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isInWeekOf = (d, anchor) => {
    const ws = startOfWeek(anchor);
    return d >= ws && d <= addDays(ws, 6);
  };

  const connectJobber = async () => {
    try {
      const { authorize_url } = await callFn('jobber-auth-start', { redirect_to: window.location.href });
      window.location.href = authorize_url;
    } catch (err) { setError(err.message); }
  };
  const disconnectJobber = async () => {
    if (!confirm('Disconnect Jobber? You can reconnect any time.')) return;
    await supabase.from('jobber_tokens').delete().eq('user_id', (await supabase.auth.getUser()).data.user.id);
    setConnected(false); setEntries([]);
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary cursor-pointer">
          <ArrowLeft size={16} /> Back
        </Link>
        {connected && (
          <div className="flex items-center gap-2">
            {lastUpdatedLabel && (
              <span className="text-[10px] font-bold text-muted hidden sm:inline">
                Updated {lastUpdatedLabel}
              </span>
            )}
            <button onClick={() => {
              const ethanEntries = entries.filter((e) => e.userName.toLowerCase().includes('ethan'));
              const text = ethanEntries.map((e) => `${e.startAt.slice(11,16)}-${e.endAt?.slice(11,16) || '?'}  ${e.visitTitle || 'General'}  (visit ${e.visitId || '-'})`).join('\n');
              alert(`Ethan's raw entries:\n\n${text}`);
            }} className="text-[10px] font-bold text-muted hover:text-primary px-2 py-1 rounded cursor-pointer">
              Debug
            </button>
            <button onClick={() => fetchEntries(true)} disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted hover:text-primary px-3 py-2 rounded-xl hover:bg-surface-alt cursor-pointer disabled:opacity-40">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={disconnectJobber}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted hover:text-red-400 px-3 py-2 rounded-xl hover:bg-surface-alt cursor-pointer">
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Payroll</p>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-tight mb-2">Timesheets</h1>
      <p className="text-sm text-muted mb-6">Pulled live from Jobber. Click a row to see entries.</p>

      {connectStatus === 'ok' && (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
          Connected to Jobber.
        </div>
      )}

      {connected === false && (
        <div className="rounded-3xl border border-card-border bg-card p-8 text-center mb-6">
          <Plug size={32} className="text-brand mx-auto mb-3" />
          <h2 className="text-xl font-black text-primary mb-1">Connect Jobber</h2>
          <p className="text-sm font-bold text-muted mb-5">Pull this week's timesheets directly. One-time setup.</p>
          <button onClick={connectJobber} className="inline-flex items-center gap-2 bg-brand text-black font-black px-6 py-3 rounded-2xl hover:brightness-110 cursor-pointer">
            <Plug size={16} /> Connect Jobber
          </button>
          {error && <p className="text-xs font-bold text-red-400 mt-3">{error}</p>}
        </div>
      )}

      {connected && (
        <>
          {/* Date nav + view toggle */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-xl border border-card-border hover:bg-surface-alt cursor-pointer text-primary">
                <ChevronLeft size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setPickerOpen((o) => !o)}
                  className="px-4 py-2 rounded-xl border border-card-border bg-card font-black text-primary text-sm min-w-[220px] text-center hover:bg-surface-alt cursor-pointer"
                >
                  {dateLabel}
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-20 rounded-2xl border border-card-border bg-card shadow-xl p-3 w-[320px]">
                      <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setPickerMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-alt text-brand cursor-pointer">
                          <ChevronLeft size={16} />
                        </button>
                        <p className="text-sm font-black text-primary">{monthLabel}</p>
                        <button onClick={() => setPickerMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-alt text-brand cursor-pointer">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAY_LABELS_SHORT.map((d) => (
                          <div key={d} className="text-center text-[10px] font-black uppercase tracking-wider text-muted py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((d, i) => {
                          const inMonth = d.getMonth() === pickerMonth.getMonth();
                          const isSelected = view === 'day' ? isSameDay(d, currentDate) : false;
                          const inSelectedWeek = view === 'week' && isInWeekOf(d, currentDate);
                          const today = new Date(); today.setHours(0,0,0,0);
                          const isToday = isSameDay(d, today);
                          return (
                            <button
                              key={i}
                              onClick={() => { const nd = new Date(d); nd.setHours(0,0,0,0); setCurrentDate(nd); setPickerOpen(false); }}
                              className={`h-9 rounded-lg text-sm cursor-pointer transition-colors relative ${
                                isToday ? 'font-black' : 'font-bold'
                              } ${
                                isSelected ? 'bg-brand text-black' :
                                inSelectedWeek ? 'bg-brand/15 text-primary' :
                                isToday ? 'text-brand ring-1 ring-brand/40 hover:bg-surface-alt' :
                                inMonth ? 'text-primary hover:bg-surface-alt' :
                                'text-muted/40 hover:bg-surface-alt'
                              }`}
                            >
                              {d.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-xl border border-card-border hover:bg-surface-alt cursor-pointer text-primary">
                <ChevronRight size={16} />
              </button>
              <button onClick={today} className="ml-1 px-3 py-2 rounded-xl border border-card-border hover:bg-surface-alt text-xs font-black uppercase tracking-wider text-muted hover:text-primary cursor-pointer">
                Today
              </button>
            </div>
            <div className="flex items-center gap-0 rounded-xl border border-card-border overflow-hidden">
              <button onClick={() => setView('day')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer ${view === 'day' ? 'bg-brand text-black' : 'text-muted hover:text-primary'}`}>
                Day
              </button>
              <button onClick={() => setView('week')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer ${view === 'week' ? 'bg-brand text-black' : 'text-muted hover:text-primary'}`}>
                Week
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 break-all">
              {error}
            </div>
          )}

          {totalIssues > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <p className="text-sm font-bold text-amber-300">
                {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'} flagged. Expand a crew member to review.
              </p>
            </div>
          )}

          {loading && grouped.length === 0 ? (
            <div className="rounded-3xl border border-card-border bg-card p-12 text-center">
              <RefreshCw size={24} className="text-muted mx-auto mb-2 animate-spin" />
              <p className="text-sm font-bold text-muted">Pulling from Jobber...</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-card-border bg-card/40 p-8 text-center">
              <Users size={32} className="text-muted mx-auto mb-2" />
              <p className="text-sm font-bold text-muted">No timesheet entries for this {view}.</p>
            </div>
          ) : view === 'day' ? (
            <div className="space-y-3">
              {groupedByVisit.map((v) => {
                const visitTotal = v.entries.reduce((s, e) => s + (e.hours || 0), 0);
                const entryDate = isoDate(new Date(v.entries[0].startAt));
                const jobberUrl = `https://secure.getjobber.com/timesheets?view=day&date=${entryDate}`;
                const cardHasMismatch = v.entries.some((e) => e._mismatch);
                return (
                  <div key={v.key} className={`rounded-2xl border bg-card overflow-hidden ${cardHasMismatch ? 'border-amber-500/40' : 'border-card-border'}`}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-card-border">
                      <div className="min-w-0">
                        {v.isGeneral ? (
                          <p className="text-sm font-black text-muted uppercase tracking-wider">General</p>
                        ) : (
                          <>
                            <p className="text-base font-black text-primary truncate">{v.title}</p>
                            {v.client && <p className="text-xs text-muted truncate">{v.client}</p>}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cardHasMismatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                            <AlertTriangle size={11} /> Crew times don't match
                          </span>
                        )}
                        <div className="text-right">
                          <p className="text-base font-black text-primary tabular-nums">{fmtDuration(visitTotal)}</p>
                          <p className="text-[10px] font-bold text-muted">{v.entries.length} {v.entries.length === 1 ? 'entry' : 'entries'}</p>
                        </div>
                      </div>
                    </div>
                    {v.sessions.map((session, si) => {
                      const sessionStart = session.entries[0].startAt;
                      return (
                        <div key={si}>
                          {v.sessions.length > 1 && (
                            <div className="px-4 py-1.5 bg-surface-alt/50 border-b border-card-border/40 text-[10px] font-black uppercase tracking-[0.15em] text-muted">
                              Session {si + 1} &middot; starts {fmtTime(sessionStart)}
                            </div>
                          )}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-card-border/40 bg-surface-alt/30">
                                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-4 py-2.5">Crew</th>
                                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-3 py-2.5">Start</th>
                                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-3 py-2.5">End</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-[0.15em] text-muted px-4 py-2.5">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {session.entries.map((e) => {
                                const m = e._mismatch;
                                const hasMismatch = !!m;
                                const issues = e.issues || [];
                                const hasError = issues.some((i) => i.level === 'error');
                                const flagged = hasMismatch || issues.length > 0;
                                return (
                                  <tr key={e.id} className={`border-b border-card-border/20 last:border-b-0 group ${
                                    hasError ? 'bg-red-500/8 hover:bg-red-500/12' :
                                    flagged ? 'bg-amber-500/8 hover:bg-amber-500/12' :
                                    'hover:bg-surface-alt/50'
                                  }`}>
                                    <td className="px-4 py-2.5">
                                      <p className="text-sm font-bold text-primary">{e.userName}</p>
                                      {issues.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {issues.map((iss, idx) => (
                                            <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              iss.level === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                                            }`}>
                                              <AlertTriangle size={9} /> {iss.msg}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2.5 text-sm tabular-nums whitespace-nowrap ${m?.startMismatch ? 'text-amber-300 font-black' : 'text-primary'}`}>{fmtTime(e.startAt)}</td>
                                    <td className={`px-3 py-2.5 text-sm tabular-nums whitespace-nowrap ${m?.endMismatch ? 'text-amber-300 font-black' : 'text-primary'}`}>{e.endAt ? fmtTime(e.endAt) : '—'}</td>
                                    <td className="px-4 py-2.5 text-sm font-black text-primary tabular-nums text-right whitespace-nowrap">
                                      <div className="inline-flex items-center gap-2 justify-end">
                                        <span>{fmtDuration(e.hours)}</span>
                                        <a href={jobberUrl} target="_blank" rel="noopener noreferrer"
                                          onClick={(ev) => ev.stopPropagation()}
                                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider hover:underline transition-opacity ${hasMismatch ? 'opacity-100 text-amber-300' : 'opacity-0 group-hover:opacity-100 text-brand'}`}
                                          title="Edit in Jobber">
                                          <ExternalLink size={11} /> Fix
                                        </a>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {grouped.map((g) => {
                const isOpen = !!expanded[g.id];
                const ok = isConfirmed(g.id);
                return (
                  <div key={g.id} className={`rounded-2xl border ${ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-card-border bg-card'} overflow-hidden`}>
                    {/* Row header */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <button onClick={() => toggleExpand(g.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-alt cursor-pointer text-muted transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown size={16} />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-surface-alt border border-card-border flex items-center justify-center text-xs font-black text-primary shrink-0">
                        {g.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <button onClick={() => toggleExpand(g.id)} className="flex-1 text-left cursor-pointer">
                        <p className={`text-base font-black ${ok ? 'text-muted' : 'text-primary'}`}>{g.name}</p>
                      </button>
                      {g.issues.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider">
                          <AlertTriangle size={11} /> {g.issues.length}
                        </span>
                      )}
                      <p className="text-base font-black text-primary tabular-nums">{fmtDuration(g.total)}</p>
                      <button onClick={() => toggleConfirmed(g.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                          ok ? 'bg-emerald-400 text-emerald-950' : 'border-2 border-card-border bg-surface-alt'
                        }`} title={ok ? 'Confirmed' : 'Mark confirmed'}>
                        {ok && <CheckCircle2 size={14} strokeWidth={3} />}
                      </button>
                    </div>

                    {/* Expanded entries */}
                    {isOpen && (
                      <div className="border-t border-card-border bg-surface-alt/30">
                        {/* Day-level issues at the top */}
                        {g.issues.filter((iss) => iss.dayOnly).map((iss, i) => (
                          <div key={`day-${i}`} className="px-5 py-2.5 border-b border-amber-500/20 bg-amber-500/8 text-xs font-bold text-amber-300 flex items-center gap-2">
                            <AlertTriangle size={12} /> {iss.msg}
                          </div>
                        ))}
                        {g.entries.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-muted">No entries.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-card-border/40">
                                  <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-4 py-2.5">Title</th>
                                  <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-3 py-2.5 hidden sm:table-cell">Notes</th>
                                  <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-3 py-2.5">Start</th>
                                  <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted px-3 py-2.5">End</th>
                                  <th className="text-right text-[10px] font-black uppercase tracking-[0.15em] text-muted px-4 py-2.5">Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.entries.map((e) => {
                                  const isGeneral = !e.visitTitle;
                                  const entryDate = isoDate(new Date(e.startAt));
                                  const jobberUrl = `https://secure.getjobber.com/timesheets?view=day&date=${entryDate}`;
                                  const hasIssue = (e.issues || []).length > 0;
                                  const hasError = (e.issues || []).some((i) => i.level === 'error');
                                  return (
                                    <tr key={e.id} className={`border-b border-card-border/20 last:border-b-0 group ${
                                      hasError ? 'bg-red-500/8 hover:bg-red-500/12' :
                                      hasIssue ? 'bg-amber-500/8 hover:bg-amber-500/12' :
                                      'hover:bg-surface-alt/50'
                                    }`}>
                                      <td className="px-4 py-2.5">
                                        {isGeneral ? (
                                          <span className="text-sm font-bold text-muted">General</span>
                                        ) : (
                                          <div>
                                            <p className="text-sm font-bold text-primary truncate max-w-[260px]">{e.visitTitle}</p>
                                            {e.clientName && <p className="text-xs text-muted truncate max-w-[260px]">{e.clientName}</p>}
                                          </div>
                                        )}
                                        {hasIssue && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {e.issues.map((iss, i) => (
                                              <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                iss.level === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                                              }`}>
                                                <AlertTriangle size={9} /> {iss.msg}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-muted hidden sm:table-cell">{e.note || '—'}</td>
                                      <td className="px-3 py-2.5 text-sm text-primary tabular-nums whitespace-nowrap">{fmtTime(e.startAt)}</td>
                                      <td className="px-3 py-2.5 text-sm text-primary tabular-nums whitespace-nowrap">{e.endAt ? fmtTime(e.endAt) : '—'}</td>
                                      <td className="px-4 py-2.5 text-sm font-black text-primary tabular-nums text-right whitespace-nowrap">
                                        <div className="inline-flex items-center gap-2 justify-end">
                                          <span>{fmtDuration(e.hours)}</span>
                                          <a href={jobberUrl} target="_blank" rel="noopener noreferrer"
                                            onClick={(ev) => ev.stopPropagation()}
                                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider hover:underline transition-opacity ${
                                              hasIssue ? 'opacity-100 text-amber-300' : 'opacity-0 group-hover:opacity-100 text-brand'
                                            }`}
                                            title="Edit this entry in Jobber">
                                            <ExternalLink size={11} /> Fix
                                          </a>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
