import { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react';
import { Check, Sun, Moon, Users, DollarSign, RotateCcw, Pencil, Plus, X, ChevronLeft, ChevronRight, Link2, ExternalLink, Briefcase } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';
import { getTodayInTimezone } from '../utils/timezone';
import renderLinkedText from '../utils/renderLinkedText';
import { genId } from '../data';

const ChecklistEditorModal = lazy(() => import('../components/ChecklistEditorModal'));

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isItemForToday = (item) => !item.days || item.days.length === 0 || item.days.includes(DAY_NAMES[new Date().getDay()]);

function useDayReset(items, setItems, key) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    const storageKey = `greenteam-checklist-date-${key}`;
    const reset = () => {
      const saved = localStorage.getItem(storageKey);
      const today = getTodayInTimezone();
      if (saved !== today) {
        const cur = itemsRef.current;
        if (cur.some((i) => i.type !== 'header' && i.done)) setItems(cur.map((i) => ({ ...i, done: false })));
        localStorage.setItem(storageKey, today);
      }
    };
    reset();
    const onVis = () => { if (document.visibilityState === 'visible') reset(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [key, setItems]);
}

const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

// Date helpers — pin to local timezone, Sunday-first
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const isoFromDate = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const dateFromIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const dt = dateFromIso(iso); dt.setDate(dt.getDate() + n); return isoFromDate(dt); };

function dayInfo(iso, todayStr) {
  const dt = dateFromIso(iso);
  return {
    iso,
    dayName: SHORT_DAYS[dt.getDay()],
    dayNum: dt.getDate(),
    monthShort: MONTHS[dt.getMonth()],
    monthLong: MONTHS_LONG[dt.getMonth()],
    year: dt.getFullYear(),
    isToday: iso === todayStr,
  };
}

function weekDatesFromIso(anchorIso, todayStr) {
  const dt = dateFromIso(anchorIso);
  const sunday = new Date(dt);
  sunday.setDate(dt.getDate() - dt.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return dayInfo(isoFromDate(d), todayStr);
  });
}

function monthGridFromIso(anchorIso, todayStr) {
  const dt = dateFromIso(anchorIso);
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // back up to Sunday
  // Always render 6 rows of 7 = 42 cells
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { ...dayInfo(isoFromDate(d), todayStr), inMonth: d.getMonth() === dt.getMonth() };
  });
}

const MINE_ONLY_KEY = 'greenteam-visits-mine-only';

function JobberVisitsForDay({ iso, isToday }) {
  const [state, setState] = useState({ loading: true, visits: [], error: null });
  const [mineOnly, setMineOnlyState] = useState(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem(MINE_ONLY_KEY);
    return v === null ? true : v === '1';
  });
  const toggleMine = () => {
    setMineOnlyState((prev) => {
      const next = !prev;
      try { localStorage.setItem(MINE_ONLY_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const myName = getMyName().toLowerCase();

  useEffect(() => {
    let cancel = false;
    setState({ loading: true, visits: [], error: null });
    // Single attempt — Jobber throttles by per-minute cost budget, and aggressive
    // retries make it strictly worse. The server-side cache (60s TTL) handles
    // legitimate repeats; if we throttle, we surface the message and stop.
    fetch(`/api/jobber-data?action=today-visits&date=${iso}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancel) return;
        if (res.ok) {
          setState({ loading: false, visits: Array.isArray(data?.visits) ? data.visits : [], error: null });
        } else {
          setState({ loading: false, visits: [], error: data?.error || `HTTP ${res.status}` });
        }
      })
      .catch((err) => { if (!cancel) setState({ loading: false, visits: [], error: err.message }); });
    return () => { cancel = true; };
  }, [iso]);

  if (state.loading) {
    return (
      <div className="px-3 sm:px-4 pb-3">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs font-bold text-amber-300/80 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
          Loading visits from Jobber…
        </div>
      </div>
    );
  }

  const filtered = mineOnly
    ? state.visits.filter((v) => (v.assignees || []).some((a) => (a || '').toLowerCase().includes(myName)))
    : state.visits;
  const total = filtered.length;
  const done = filtered.filter((v) => v.completedAt).length;
  const hiddenByFilter = mineOnly ? state.visits.length - filtered.length : 0;

  return (
    <div className="px-3 sm:px-4 pb-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/30 p-3 sm:p-4"
        style={{
          background: 'radial-gradient(120% 120% at 0% 0%, rgba(251,191,36,0.14) 0%, rgba(251,191,36,0.02) 60%, transparent 100%), rgba(255,255,255,0.01)',
        }}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
              <Briefcase size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 truncate">From Jobber · Schedule</div>
              <div className="text-[10px] font-bold text-muted truncate">{isToday ? 'Today' : iso} · {done}/{total} complete</div>
            </div>
          </div>
          <button
            onClick={toggleMine}
            title={mineOnly ? `Showing only visits assigned to "${getMyName()}"` : 'Showing all visits'}
            className={`shrink-0 px-2.5 h-7 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
              mineOnly
                ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                : 'bg-surface-alt text-muted hover:text-primary border border-card-border'
            }`}
          >
            {mineOnly ? 'Mine' : 'All'}
          </button>
        </div>
        <div className="relative space-y-2">
          {state.error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] font-bold text-red-300">
              Couldn't reach Jobber: {state.error}
            </div>
          )}
          {!state.error && total === 0 && hiddenByFilter > 0 && (
            <div className="rounded-xl border border-card-border bg-card/40 px-3 py-3 text-[11px] font-semibold text-muted text-center">
              No visits assigned to {getMyName()} for {isToday ? 'today' : iso}.
              {' '}<button onClick={toggleMine} className="text-amber-300 hover:text-amber-200 cursor-pointer">Show all {hiddenByFilter}</button>
            </div>
          )}
          {!state.error && state.visits.length === 0 && (
            <div className="rounded-xl border border-card-border bg-card/40 px-3 py-3 text-[11px] font-semibold text-muted text-center">
              No visits scheduled in Jobber for {isToday ? 'today' : iso}.
            </div>
          )}
          {filtered.map((v) => <VisitCard key={v.id} visit={v} />)}
        </div>
      </div>
    </div>
  );
}

// Stored once per browser; user's display name as it appears in Jobber's "assigned to".
// Used to filter the visits panel to "mine only".
const ME_KEY = 'greenteam-myJobberName';
const getMyName = () => (typeof window !== 'undefined' ? localStorage.getItem(ME_KEY) || 'Jude' : 'Jude');
const setMyName = (name) => { try { localStorage.setItem(ME_KEY, name); } catch {} };

function VisitCard({ visit }) {
  const start = visit.startAt ? new Date(visit.startAt) : null;
  const time = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  const isDone = !!visit.completedAt;
  return (
    <div className={`flex items-stretch gap-3 p-3 rounded-xl border transition-colors ${
      isDone
        ? 'border-emerald-400/25 bg-emerald-500/5'
        : 'border-card-border bg-card/60 hover:bg-card'
    }`}>
      <div className={`shrink-0 w-16 flex flex-col items-end justify-center pr-2 border-r ${
        isDone ? 'border-emerald-400/20' : 'border-card-border'
      }`}>
        <div className={`text-sm font-black leading-tight ${isDone ? 'text-emerald-400 line-through' : 'text-amber-300'}`}>
          {time || '—'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className={`text-sm font-bold truncate ${isDone ? 'text-muted line-through' : 'text-primary'}`}>
            {visit.clientName || visit.title || 'Untitled visit'}
          </div>
          {isDone && (
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
              Done
            </span>
          )}
        </div>
        {visit.jobNumber && (
          <div className={`text-[11px] font-semibold truncate mt-0.5 ${isDone ? 'text-muted' : 'text-secondary'}`}>
            Job #{visit.jobNumber}
          </div>
        )}
        {visit.assignees && visit.assignees.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {visit.assignees.map((name) => (
              <span key={name} className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                isDone ? 'bg-emerald-400/10 text-emerald-300/70' : 'bg-amber-400/10 text-amber-200 border border-amber-400/20'
              }`}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Planner({ todos, setTodos }) {
  const todayStr = useMemo(() => getTodayInTimezone(), []);
  const [view, setView] = useState('day'); // 'day' | 'week' | 'month'
  const [activeDate, setActiveDate] = useState(todayStr);
  const [draft, setDraft] = useState('');

  // Auto-rollover: any unchecked task with a date earlier than today gets pulled into today.
  // Runs once per day per browser (localStorage key) so we don't fight the user's manual moves.
  const todosRef = useRef(todos);
  todosRef.current = todos;
  useEffect(() => {
    const ROLL_KEY = 'greenteam-todos-rollover-date';
    const lastRolled = localStorage.getItem(ROLL_KEY);
    if (lastRolled === todayStr) return;
    const cur = todosRef.current;
    const stale = cur.filter((t) => !t.done && t.date && t.date < todayStr);
    if (stale.length > 0) {
      setTodos(cur.map((t) => (!t.done && t.date && t.date < todayStr ? { ...t, date: todayStr } : t)));
    }
    localStorage.setItem(ROLL_KEY, todayStr);
  }, [todayStr, setTodos]);

  const week = useMemo(() => weekDatesFromIso(activeDate, todayStr), [activeDate, todayStr]);
  const month = useMemo(() => monthGridFromIso(activeDate, todayStr), [activeDate, todayStr]);
  const active = useMemo(() => dayInfo(activeDate, todayStr), [activeDate, todayStr]);

  const navPrev = () => {
    if (view === 'day') setActiveDate(addDays(activeDate, -1));
    else if (view === 'week') setActiveDate(addDays(activeDate, -7));
    else { const dt = dateFromIso(activeDate); dt.setMonth(dt.getMonth() - 1); setActiveDate(isoFromDate(dt)); }
  };
  const navNext = () => {
    if (view === 'day') setActiveDate(addDays(activeDate, 1));
    else if (view === 'week') setActiveDate(addDays(activeDate, 7));
    else { const dt = dateFromIso(activeDate); dt.setMonth(dt.getMonth() + 1); setActiveDate(isoFromDate(dt)); }
  };
  const isOnToday = activeDate === todayStr || (view === 'week' && week.some((d) => d.isToday)) || (view === 'month' && month.some((d) => d.inMonth && d.isToday));

  const headerLabel = (() => {
    if (view === 'day') {
      if (active.isToday) return 'Today';
      if (activeDate === addDays(todayStr, 1)) return 'Tomorrow';
      if (activeDate === addDays(todayStr, -1)) return 'Yesterday';
      return `${active.dayName} · ${active.monthShort} ${active.dayNum}`;
    }
    if (view === 'week') {
      const first = week[0], last = week[6];
      const containsToday = week.some((d) => d.isToday);
      if (containsToday) return 'This week';
      return `${first.monthShort} ${first.dayNum} – ${last.monthShort} ${last.dayNum}`;
    }
    return `${active.monthLong} ${active.year}`;
  })();

  const dayTodos = todos.filter((t) => t.date === activeDate);
  const dayDoneCount = (iso) => todos.filter((t) => t.date === iso && t.done).length;
  const dayTotalCount = (iso) => todos.filter((t) => t.date === iso).length;

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos([...todos, { id: genId(), date: activeDate, text, done: false }]);
    setDraft('');
  };
  const toggle = (id) => setTodos(todos.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => setTodos(todos.filter((t) => t.id !== id));
  const updateText = (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return remove(id);
    setTodos(todos.map((t) => t.id === id ? { ...t, text: trimmed } : t));
  };
  const updateUrl = (id, url) => {
    const cleaned = (url || '').trim();
    setTodos(todos.map((t) => t.id === id ? { ...t, url: cleaned || null } : t));
  };
  const promptForLink = (t) => {
    const next = window.prompt(t.url ? 'Edit link (clear to remove):' : 'Paste a link URL:', t.url || 'https://');
    if (next === null) return; // cancelled
    let val = next.trim();
    if (val && !/^https?:\/\//i.test(val)) val = 'https://' + val;
    updateUrl(t.id, val);
  };

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const startEdit = (t) => { setEditingId(t.id); setEditDraft(t.text); };
  const commitEdit = () => { if (editingId) updateText(editingId, editDraft); setEditingId(null); };

  // Drag-and-drop between days
  const [dragId, setDragId] = useState(null);
  const [dragOverIso, setDragOverIso] = useState(null);
  const onDragStart = (e, id) => {
    setDragId(id);
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const onDragOverDay = (e, iso) => { e.preventDefault(); if (dragOverIso !== iso) setDragOverIso(iso); };
  const onDragLeaveDay = (iso) => { if (dragOverIso === iso) setDragOverIso(null); };
  const onDropDay = (e, iso) => {
    e.preventDefault();
    if (!dragId) return;
    setTodos(todos.map((t) => t.id === dragId ? { ...t, date: iso } : t));
    setDragId(null);
    setDragOverIso(null);
  };
  const onDragEnd = () => { setDragId(null); setDragOverIso(null); };

  return (
    <div className="rounded-3xl border border-card-border bg-card overflow-hidden"
      style={{ background: 'radial-gradient(120% 110% at 50% 0%, rgba(190,242,100,0.06) 0%, transparent 60%), var(--card-bg, rgb(13,13,13))' }}>
      <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight truncate">Plan</h2>
          <p className="text-xs font-bold text-secondary mt-0.5 truncate">{headerLabel}</p>
        </div>
        <div className="shrink-0 flex items-center gap-1 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-surface-alt rounded-xl p-1">
            {['day', 'week', 'month'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 h-7 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                  view === v ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary'
                }`}>
                {v}
              </button>
            ))}
          </div>
          {/* Nav */}
          <button onClick={navPrev} title="Previous"
            className="w-9 h-9 rounded-xl bg-surface-alt hover:bg-card-border text-secondary hover:text-primary cursor-pointer flex items-center justify-center transition-colors">
            <ChevronLeft size={18} />
          </button>
          {!isOnToday && (
            <button onClick={() => setActiveDate(todayStr)} title="Jump to today"
              className="px-3 h-9 rounded-xl bg-surface-alt hover:bg-card-border text-xs font-black text-secondary hover:text-primary cursor-pointer">
              Today
            </button>
          )}
          <button onClick={navNext} title="Next"
            className="w-9 h-9 rounded-xl bg-surface-alt hover:bg-card-border text-secondary hover:text-primary cursor-pointer flex items-center justify-center transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day view: compact drag strip so you can reschedule without switching views */}
      {view === 'day' && (
        <div className="px-3 sm:px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {week.map((d) => {
            const total = dayTotalCount(d.iso);
            const done = dayDoneCount(d.iso);
            const allDone = total > 0 && done === total;
            const isActive = d.iso === activeDate;
            const isDropTarget = dragOverIso === d.iso;
            return (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                onDragOver={(e) => onDragOverDay(e, d.iso)}
                onDragLeave={() => onDragLeaveDay(d.iso)}
                onDrop={(e) => onDropDay(e, d.iso)}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[54px] py-2 rounded-xl border transition-all cursor-pointer ${
                  isDropTarget
                    ? 'bg-brand/30 border-brand scale-110 shadow-[0_0_24px_rgba(190,242,100,0.55)]'
                    : isActive
                      ? 'bg-brand text-on-brand border-brand shadow-[0_0_18px_rgba(190,242,100,0.35)]'
                      : d.isToday
                        ? 'border-brand/40 bg-brand/8 text-primary hover:bg-brand/12'
                        : 'border-card-border bg-surface-alt/60 text-secondary hover:bg-surface-alt'
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isActive ? '' : d.isToday ? 'text-brand' : 'text-muted'}`}>
                  {d.dayName}
                </span>
                <span className="text-lg font-black leading-none mt-0.5">{d.dayNum}</span>
                {total > 0 && (
                  <span className={`mt-0.5 text-[9px] font-bold ${isActive ? 'opacity-80' : allDone ? 'text-emerald-400' : 'text-muted'}`}>
                    {done}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Week view: 7-column kanban with tasks visible per day. Drag tasks between columns. */}
      {view === 'week' && (
        <div className="px-3 sm:px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {week.map((d) => {
            const colTodos = todos.filter((t) => t.date === d.iso);
            const total = colTodos.length;
            const done = colTodos.filter((t) => t.done).length;
            const allDone = total > 0 && done === total;
            const isDropTarget = dragOverIso === d.iso;
            return (
              <div
                key={d.iso}
                onDragOver={(e) => onDragOverDay(e, d.iso)}
                onDragLeave={() => onDragLeaveDay(d.iso)}
                onDrop={(e) => onDropDay(e, d.iso)}
                className={`shrink-0 w-[200px] sm:w-[210px] rounded-2xl border transition-all flex flex-col ${
                  isDropTarget
                    ? 'border-brand bg-brand/15 shadow-[0_0_28px_rgba(190,242,100,0.45)]'
                    : d.isToday
                      ? 'border-brand/40 bg-brand/5'
                      : 'border-card-border bg-surface-alt/30'
                }`}
              >
                <button
                  onClick={() => { setActiveDate(d.iso); setView('day'); }}
                  className="px-3 pt-3 pb-2 flex items-center justify-between cursor-pointer hover:bg-surface-alt/40 rounded-t-2xl"
                  title="Open this day"
                >
                  <div className="text-left">
                    <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${d.isToday ? 'text-brand' : 'text-muted'}`}>
                      {d.dayName}
                    </div>
                    <div className={`text-xl font-black leading-none mt-0.5 ${d.isToday ? 'text-brand' : 'text-primary'}`}>{d.dayNum}</div>
                  </div>
                  {total > 0 && (
                    <div className={`text-[10px] font-black ${allDone ? 'text-emerald-400' : 'text-muted'}`}>
                      {done}/{total}
                    </div>
                  )}
                </button>
                <div className="px-2 pb-2 space-y-1.5 min-h-[120px]">
                  {colTodos.length === 0 && (
                    <div className="text-[11px] text-muted text-center py-4 italic">Drop here</div>
                  )}
                  {colTodos.map((t) => {
                    const isDragging = dragId === t.id;
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, t.id)}
                        onDragEnd={onDragEnd}
                        className={`group flex items-start gap-2 rounded-xl px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        } ${t.done ? 'bg-emerald-500/10' : 'bg-card hover:bg-surface-alt border border-card-border'}`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer ${
                            t.done ? 'bg-emerald-400 text-emerald-950' : 'border-2 border-card-border bg-surface-alt'
                          }`}
                        >
                          {t.done && <Check size={10} strokeWidth={4} />}
                        </button>
                        <span className={`flex-1 text-xs font-bold leading-snug break-words ${t.done ? 'text-muted line-through' : 'text-primary'}`}>
                          {t.text}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 cursor-pointer shrink-0"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month view: calendar grid with task chips you can drag between days */}
      {view === 'month' && (
        <div className="px-3 sm:px-4 pb-4">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {SHORT_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-wider text-muted py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {month.map((d) => {
              const cellTodos = todos.filter((t) => t.date === d.iso);
              const total = cellTodos.length;
              const done = cellTodos.filter((t) => t.done).length;
              const allDone = total > 0 && done === total;
              const isDropTarget = dragOverIso === d.iso;
              const visibleChips = cellTodos.slice(0, 3);
              const overflow = total - visibleChips.length;
              return (
                <div
                  key={d.iso}
                  onDragOver={(e) => onDragOverDay(e, d.iso)}
                  onDragLeave={() => onDragLeaveDay(d.iso)}
                  onDrop={(e) => onDropDay(e, d.iso)}
                  className={`relative min-h-[110px] sm:min-h-[120px] flex flex-col rounded-xl border text-sm transition-all overflow-hidden ${
                    isDropTarget
                      ? 'border-brand bg-brand/25 shadow-[0_0_18px_rgba(190,242,100,0.45)]'
                      : !d.inMonth
                        ? 'border-transparent bg-surface-alt/20'
                        : d.isToday
                          ? 'border-brand bg-brand/10 shadow-[0_0_14px_rgba(190,242,100,0.2)]'
                          : 'border-card-border bg-surface-alt/30 hover:bg-surface-alt/50'
                  }`}
                >
                  <button
                    onClick={() => { setActiveDate(d.iso); setView('day'); }}
                    className="flex items-center justify-between px-2 pt-1.5 pb-1 cursor-pointer hover:bg-white/5"
                    title="Open this day"
                  >
                    <span className={`text-sm sm:text-base font-black leading-none ${
                      !d.inMonth ? 'text-muted/40' : d.isToday ? 'text-brand' : 'text-primary'
                    }`}>{d.dayNum}</span>
                    {d.inMonth && total > 0 && (
                      <span className={`text-[9px] font-black ${allDone ? 'text-emerald-400' : 'text-muted'}`}>
                        {done}/{total}
                      </span>
                    )}
                  </button>
                  {d.inMonth && (
                    <div className="px-1 pb-1 space-y-0.5 flex-1 overflow-hidden">
                      {visibleChips.map((t) => {
                        const isDragging = dragId === t.id;
                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, t.id); }}
                            onDragEnd={onDragEnd}
                            onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                            title={t.text}
                            className={`text-[10px] leading-tight font-bold rounded px-1.5 py-0.5 truncate cursor-grab active:cursor-grabbing transition-all ${
                              isDragging ? 'opacity-40' : ''
                            } ${t.done
                                ? 'bg-emerald-500/15 text-emerald-300/80 line-through'
                                : 'bg-card text-primary border border-card-border hover:bg-surface-alt'
                            }`}
                          >
                            {t.text}
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <div className="text-[9px] font-bold text-muted px-1.5">+{overflow} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Jobber visits scheduled for the active day — read-only overlay */}
      {view === 'day' && <JobberVisitsForDay iso={activeDate} isToday={active.isToday} />}

      {/* Add input — only on day view (week kanban + month grid have their own affordances) */}
      {view === 'day' && (
        <div className="px-5 sm:px-6 pb-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={`Add a task for ${active.dayName} ${active.monthShort} ${active.dayNum}…`}
            className="flex-1 bg-surface-alt rounded-xl px-4 py-3 text-sm font-semibold text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button onClick={add} disabled={!draft.trim()}
            className="shrink-0 px-4 rounded-xl bg-brand text-on-brand font-black hover:bg-brand-hover cursor-pointer disabled:opacity-40 inline-flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      )}

      {/* Tasks for active day — only on day view */}
      {view === 'day' && (
      <div className="px-3 sm:px-4 pb-5">
        {dayTodos.length === 0 && (
          <p className="text-sm text-muted text-center py-6">Nothing planned for this day.</p>
        )}
        {dayTodos.map((t) => {
          const isEditing = editingId === t.id;
          const isDragging = dragId === t.id;
          return (
            <div key={t.id}
              draggable={!isEditing}
              onDragStart={(e) => onDragStart(e, t.id)}
              onDragEnd={onDragEnd}
              className={`group flex items-start gap-3 rounded-2xl px-4 py-3 transition-all ${
                isDragging ? 'opacity-40 scale-95' : ''
              } ${t.done ? 'bg-emerald-500/8' : 'hover:bg-surface-alt'} ${isEditing ? '' : 'cursor-grab active:cursor-grabbing'}`}>
              <button onClick={() => toggle(t.id)}
                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                  t.done
                    ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_14px_rgba(52,211,153,0.4)]'
                    : 'border-2 border-card-border bg-surface-alt'
                }`}>
                {t.done && <Check size={14} strokeWidth={3.5} />}
              </button>
              {isEditing ? (
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-surface-alt rounded-lg px-2 py-1 text-base font-bold text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                />
              ) : (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span onClick={() => toggle(t.id)} className={`flex-1 text-base font-bold leading-snug cursor-pointer truncate ${t.done ? 'text-muted line-through' : 'text-primary'}`}>
                    {t.text}
                  </span>
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover bg-brand/10 hover:bg-brand/15 rounded-lg px-2 py-1"
                      title={t.url}>
                      <ExternalLink size={12} /> Open
                    </a>
                  )}
                </div>
              )}
              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => promptForLink(t)}
                  className={`cursor-pointer p-1 rounded-lg ${t.url ? 'text-brand hover:text-brand-hover' : 'text-muted hover:text-primary'}`}
                  title={t.url ? 'Edit link' : 'Add link'}>
                  <Link2 size={14} />
                </button>
                <button onClick={() => startEdit(t)}
                  className="text-muted hover:text-primary cursor-pointer p-1 rounded-lg" title="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(t.id)}
                  className="text-muted hover:text-red-500 cursor-pointer p-1 rounded-lg" title="Remove">
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtle, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-card p-6 sm:p-8"
      style={{
        background: 'radial-gradient(120% 140% at 50% 0%, rgba(190,242,100,0.18) 0%, rgba(190,242,100,0.04) 50%, transparent 80%), var(--card-bg, rgb(15,15,15))',
        boxShadow: '0 22px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
          <Icon size={22} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">{label}</p>
      </div>
      <p className={`relative text-6xl sm:text-7xl font-black tracking-tight leading-none ${accent ? 'text-brand drop-shadow-[0_0_24px_rgba(190,242,100,0.35)]' : 'text-primary'}`}>
        {value}
      </p>
      {subtle && <p className="relative mt-3 text-sm text-secondary font-semibold">{subtle}</p>}
    </div>
  );
}

function ChecklistCard({ kind, title, icon: Icon, items, setItems, completedCount, totalCount, onResetAll, onEdit }) {
  const allDone = totalCount > 0 && completedCount === totalCount;
  const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const toggle = (id) => setItems(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  // Render only items that apply to today; preserve headers in-place if they have visible siblings after them.
  const visible = items.filter((i) => i.type === 'header' || isItemForToday(i));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-card-border bg-card"
      style={{
        background: kind === 'start'
          ? 'radial-gradient(120% 110% at 0% 0%, rgba(251,191,36,0.10) 0%, transparent 60%), var(--card-bg, rgb(13,13,13))'
          : 'radial-gradient(120% 110% at 100% 0%, rgba(99,102,241,0.10) 0%, transparent 60%), var(--card-bg, rgb(13,13,13))',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            kind === 'start' ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25' : 'bg-indigo-400/15 text-indigo-300 border border-indigo-400/25'
          }`}>
            <Icon size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">{title}</h2>
            <p className="text-xs font-bold text-secondary mt-0.5">{completedCount} of {totalCount} done · {pct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {completedCount > 0 && (
            <button onClick={onResetAll} className="text-xs font-bold text-muted hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-alt cursor-pointer inline-flex items-center gap-1">
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button onClick={onEdit} className="text-xs font-bold text-muted hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-alt cursor-pointer inline-flex items-center gap-1" title="Edit checklist">
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 sm:px-6">
        <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : kind === 'start' ? 'bg-amber-400' : 'bg-indigo-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="px-3 sm:px-4 py-4 space-y-1.5">
        {visible.length === 0 && <p className="text-sm text-muted py-6 text-center">No items for today.</p>}
        {visible.map((item) => {
          if (item.type === 'header') {
            return <p key={item.id} className="text-[10px] font-black uppercase tracking-[0.18em] text-muted px-3 pt-3 pb-1">{item.text}</p>;
          }
          const links = item.links || [];
          return (
            <div
              key={item.id}
              className={`w-full flex items-start gap-3 text-left rounded-2xl px-4 py-4 transition-colors ${
                item.done ? 'bg-emerald-500/8 hover:bg-emerald-500/12' : 'hover:bg-surface-alt'
              }`}
            >
              <button
                onClick={() => toggle(item.id)}
                className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                  item.done
                    ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_18px_rgba(52,211,153,0.45)]'
                    : 'border-2 border-card-border bg-surface-alt'
                }`}
              >
                {item.done && <Check size={16} strokeWidth={3.5} />}
              </button>
              <span
                onClick={() => toggle(item.id)}
                className={`flex-1 text-base sm:text-lg font-bold leading-snug cursor-pointer ${item.done ? 'text-muted line-through' : 'text-primary'}`}
              >
                {renderLinkedText(item.text)}
              </span>
              {links.length > 0 && (
                <div className="shrink-0 flex items-center gap-1">
                  {links.map((l) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand/10 hover:bg-brand/20 text-brand cursor-pointer"
                      title={l.label || l.url}>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-2xl bg-emerald-500/12 border border-emerald-500/30 px-4 py-3 text-center">
            <p className="text-sm font-black text-emerald-300">All done. {kind === 'start' ? 'Get out there.' : 'Lock it up.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerHome() {
  const ownerStartChecklist = useAppStore((s) => s.ownerStartChecklist);
  const setOwnerStartChecklist = useAppStore((s) => s.setOwnerStartChecklist);
  const ownerEndChecklist = useAppStore((s) => s.ownerEndChecklist);
  const setOwnerEndChecklist = useAppStore((s) => s.setOwnerEndChecklist);
  const ownerTodos = useAppStore((s) => s.ownerTodos) || [];
  const setOwnerTodos = useAppStore((s) => s.setOwnerTodos);

  useDayReset(ownerStartChecklist, setOwnerStartChecklist, 'owner-start');
  useDayReset(ownerEndChecklist, setOwnerEndChecklist, 'owner-end');

  const startCheckable = ownerStartChecklist.filter((i) => i.type !== 'header' && isItemForToday(i));
  const endCheckable = ownerEndChecklist.filter((i) => i.type !== 'header' && isItemForToday(i));
  const startDone = startCheckable.filter((i) => i.done).length;
  const endDone = endCheckable.filter((i) => i.done).length;

  const resetStart = () => setOwnerStartChecklist(ownerStartChecklist.map((i) => ({ ...i, done: false })));
  const resetEnd = () => setOwnerEndChecklist(ownerEndChecklist.map((i) => ({ ...i, done: false })));

  // 'start' | 'end' | null
  const [editing, setEditing] = useState(null);

  // Recurring data
  const [recurring, setRecurring] = useState({ clients: null, monthly: null, loading: true, error: null });
  useEffect(() => {
    fetch('/api/jobber-data?action=recurring-summary')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        const lawnMonthly = (d?.lawnJobs || []).reduce((s, j) => s + (j.monthly || 0), 0);
        setRecurring({ clients: (d?.recurringClientList || []).length, monthly: lawnMonthly, loading: false, error: null });
      })
      .catch((err) => setRecurring({ clients: null, monthly: null, loading: false, error: err.message }));
  }, []);

  return (
    <div className="pb-16 space-y-6 sm:space-y-8">
      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <StatCard
          icon={Users}
          label="Recurring Clients"
          value={recurring.loading ? '—' : recurring.error ? '?' : recurring.clients}
          subtle={recurring.error ? 'Could not load (Jobber)' : recurring.loading ? 'Loading from Jobber…' : 'Active recurring lawn route'}
          accent
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Recurring Revenue"
          value={recurring.loading ? '—' : recurring.error ? '?' : money(recurring.monthly)}
          subtle={recurring.error ? null : recurring.loading ? 'Loading…' : 'From recurring lawn maintenance'}
          accent
        />
      </div>

      {/* Plan */}
      <Planner todos={ownerTodos} setTodos={setOwnerTodos} />

      {/* Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <ChecklistCard
          kind="start"
          title="Start of Day"
          icon={Sun}
          items={ownerStartChecklist}
          setItems={setOwnerStartChecklist}
          completedCount={startDone}
          totalCount={startCheckable.length}
          onResetAll={resetStart}
          onEdit={() => setEditing('start')}
        />
        <ChecklistCard
          kind="end"
          title="End of Day"
          icon={Moon}
          items={ownerEndChecklist}
          setItems={setOwnerEndChecklist}
          completedCount={endDone}
          totalCount={endCheckable.length}
          onResetAll={resetEnd}
          onEdit={() => setEditing('end')}
        />
      </div>

      {editing && (
        <Suspense fallback={null}>
          <ChecklistEditorModal
            onClose={() => setEditing(null)}
            items={editing === 'start' ? ownerStartChecklist : ownerEndChecklist}
            setItems={editing === 'start' ? setOwnerStartChecklist : setOwnerEndChecklist}
            title={editing === 'start' ? 'Edit Start of Day' : 'Edit End of Day'}
          />
        </Suspense>
      )}
    </div>
  );
}
