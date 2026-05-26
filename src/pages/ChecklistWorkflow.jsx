import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ExternalLink, CheckCircle2, RotateCcw, Pencil } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';

const WeatherStep = lazy(() => import('../components/WeatherStep'));
const ChecklistEditorModal = lazy(() => import('../components/ChecklistEditorModal'));

const DETAILS_KEY = 'greenteam-checklist-details';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isItemForToday = (item) => !item.days || item.days.length === 0 || item.days.includes(DAY_NAMES[new Date().getDay()]);

function readAll() {
  try {
    const raw = localStorage.getItem(DETAILS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(data) {
  try { localStorage.setItem(DETAILS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// Strip markdown links to plain text and extract URL parts
function parseLinks(text) {
  const parts = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    parts.push({ type: 'link', label: m[1], url: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts;
}

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const t = draft.trim();
          setEditing(false);
          if (t && t !== value) onSave(t);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="flex-1 bg-transparent outline-none text-2xl sm:text-3xl font-black text-primary tracking-tight leading-tight border-b-2 border-primary"
      />
    );
  }
  // Render the saved text but parse markdown links inline.
  const parts = parseLinks(value);
  return (
    <h1
      onClick={() => setEditing(true)}
      className="flex-1 text-2xl sm:text-3xl font-black text-primary tracking-tight leading-tight cursor-text hover:bg-surface-alt rounded-lg px-1 -mx-1"
      title="Tap to rename"
    >
      {renderText(parts)}
    </h1>
  );
}

function renderText(parts) {
  return parts.map((p, i) =>
    p.type === 'text'
      ? <span key={i}>{p.value}</span>
      : <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-brand font-black underline decoration-2 underline-offset-4 hover:opacity-80">
          {p.label}
        </a>
  );
}

export default function ChecklistWorkflow() {
  const { kind, stepIndex } = useParams();
  const navigate = useNavigate();
  const idx = Math.max(0, parseInt(stepIndex || '0', 10));

  const ownerStartChecklist = useAppStore((s) => s.ownerStartChecklist);
  const setOwnerStartChecklist = useAppStore((s) => s.setOwnerStartChecklist);
  const ownerEndChecklist = useAppStore((s) => s.ownerEndChecklist);
  const setOwnerEndChecklist = useAppStore((s) => s.setOwnerEndChecklist);

  const list = kind === 'end' ? ownerEndChecklist : ownerStartChecklist;
  const setList = kind === 'end' ? setOwnerEndChecklist : setOwnerStartChecklist;

  // Only step through actual items (not headers), and only those scheduled for today
  const steps = useMemo(() => list.filter((i) => i.type !== 'header' && isItemForToday(i)), [list]);
  const total = steps.length;

  // First undone real step index, or last step if all done.
  const firstUndoneIdx = useMemo(() => {
    if (steps.length === 0) return 0;
    const idx = steps.findIndex((s) => !s.done);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps]);

  useEffect(() => {
    if (stepIndex != null) return;
    if (steps.length === 0) return;
    navigate(`/workflow/${kind}/${firstUndoneIdx}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, steps.length, kind]);

  const item = steps[idx];

  // Find header that this item falls under
  const headerForItem = useMemo(() => {
    if (!item) return null;
    let lastHeader = null;
    for (const i of list) {
      if (i.type === 'header') lastHeader = i;
      if (i.id === item.id) break;
    }
    return lastHeader;
  }, [list, item]);

  const all = readAll();
  const initial = item ? (all[item.id] || { sop: '', subItems: [] }) : { sop: '', subItems: [] };

  const [subItems, setSubItems] = useState(initial.subItems);
  const [showFullEditor, setShowFullEditor] = useState(false);

  // Reset local sub-items state when navigating to a new step
  useEffect(() => {
    const fresh = readAll()[item?.id] || { sop: '', subItems: [] };
    setSubItems(fresh.subItems);
  }, [item?.id]);

  // Persist sub-item check state
  useEffect(() => {
    if (!item) return;
    const data = readAll();
    data[item.id] = { ...(data[item.id] || { sop: '' }), subItems };
    writeAll(data);
  }, [item?.id, subItems]);

  if (!item) {
    return (
      <div className="px-4 py-12 max-w-3xl mx-auto text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black text-primary tracking-tight mb-2">
          {kind === 'end' ? 'End of Day complete' : 'Start of Day complete'}
        </h1>
        <p className="text-base font-bold text-muted mb-8">
          Nice. {total} steps done. Go get it.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 bg-brand text-black font-black px-6 py-3 rounded-2xl hover:brightness-110">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    );
  }

  const sop = (readAll()[item.id] || {}).sop || '';
  const subDone = subItems.filter((s) => s.done).length;
  const subTotal = subItems.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const toggleSub = (id) => setSubItems((arr) => arr.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  const resetSubs = () => setSubItems((arr) => arr.map((s) => ({ ...s, done: false })));

  const markAndNext = () => {
    // Mark this item done in the main list
    setList(list.map((i) => i.id === item.id ? { ...i, done: true } : i));
    // Reset sub-items for next time (so the next workflow run starts fresh)
    setSubItems((arr) => arr.map((s) => ({ ...s, done: false })));
    // Advance
    navigate(`/workflow/${kind}/${idx + 1}`);
  };

  const skipNext = () => navigate(`/workflow/${kind}/${idx + 1}`);
  const prev = () => idx > 0 && navigate(`/workflow/${kind}/${idx - 1}`);

  const titleParts = parseLinks(item.text);

  // Short label for the step list (strip markdown links, trim to ~25 chars).
  const shortLabel = (t) => {
    const plain = (t || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    return plain.length > 30 ? plain.slice(0, 28) + '…' : plain || 'Step';
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Side stepper */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-card-border bg-card p-3">
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              {kind === 'end' ? 'End of Day' : 'Start of Day'} · {idx + 1}/{total}
            </p>
            <button
              onClick={() => setShowFullEditor(true)}
              className="text-muted hover:text-primary p-1 rounded-lg hover:bg-surface-alt cursor-pointer"
              title="Edit the whole checklist"
            >
              <Pencil size={13} />
            </button>
          </div>
          <div className="lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto flex lg:block gap-1 overflow-x-auto">
            {steps.map((s, i) => {
              const active = i === idx;
              const done = s.done;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/workflow/${kind}/${i}`)}
                  className={`shrink-0 lg:w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-primary text-card font-black'
                      : done
                        ? 'text-tertiary hover:bg-surface-alt font-medium'
                        : 'text-primary hover:bg-surface-alt font-medium'
                  }`}
                >
                  <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                    active
                      ? 'bg-card text-primary'
                      : done
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-card-border text-tertiary'
                  }`}>
                    {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`flex-1 truncate ${done && !active ? 'line-through opacity-60' : ''}`}>
                    {shortLabel(s.text)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main step content */}
      <div className="min-w-0">
      {/* Step title — tap to rename */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <EditableTitle
          value={item.text}
          onSave={(t) => setList(list.map((i) => i.id === item.id ? { ...i, text: t } : i))}
        />
        <Link
          to={`/checklist/${kind}/${item.id}`}
          className="shrink-0 mt-1 text-muted hover:text-primary p-1.5 rounded-lg hover:bg-surface-alt cursor-pointer"
          title="Edit this step's details · SOP, sub-checklist, links"
        >
          <Pencil size={14} />
        </Link>
      </div>

      {/* Special: weather step renders the live weather card inline */}
      {item.type === 'weather' && (
        <div className="mb-6">
          <Suspense fallback={<p className="text-sm text-tertiary">Loading weather…</p>}>
            <WeatherStep hideContinue />
          </Suspense>
        </div>
      )}

      {/* Links (from item + stored detail) */}
      {(() => {
        // Prefer edited links (from details) when present; fall back to seeded item.links.
        const editedLinks = readAll()[item.id]?.links;
        const allLinks = (editedLinks && editedLinks.length > 0) ? editedLinks : (item.links || []);
        if (allLinks.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-2 mb-6">
            {allLinks.map((l) => {
              const isInternal = l.url?.startsWith('/');
              if (isInternal) {
                return (
                  <Link key={l.id} to={l.url}
                    className="inline-flex items-center gap-1.5 text-sm font-black text-brand bg-brand/10 hover:bg-brand/15 px-3 py-2 rounded-2xl">
                    <ExternalLink size={14} /> {l.label}
                  </Link>
                );
              }
              return (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-black text-brand bg-brand/10 hover:bg-brand/15 px-3 py-2 rounded-2xl">
                  <ExternalLink size={14} /> {l.label}
                </a>
              );
            })}
          </div>
        );
      })()}

      {/* SOP */}
      {sop.trim() && (
        <section className="rounded-3xl border border-card-border bg-card p-5 sm:p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">How to do it</h2>
            <Link to={`/checklist/${kind}/${item.id}`} className="text-xs font-bold text-muted hover:text-primary cursor-pointer">
              Edit
            </Link>
          </div>
          <p className="text-base text-primary leading-relaxed whitespace-pre-wrap">{sop}</p>
        </section>
      )}

      {/* Sub-checklist */}
      {subItems.length > 0 && (
        <section className="rounded-3xl border border-card-border bg-card p-5 sm:p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
              Sub-checklist &middot; {subDone}/{subTotal}
            </h2>
            {subDone > 0 && (
              <button onClick={resetSubs} className="text-xs font-bold text-muted hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-alt cursor-pointer inline-flex items-center gap-1">
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {subItems.map((s) => (
              <div
                key={s.id}
                onClick={() => toggleSub(s.id)}
                className={`flex items-start gap-3 rounded-2xl px-3 py-3 cursor-pointer ${
                  s.done ? 'bg-emerald-500/8' : 'hover:bg-surface-alt'
                }`}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  s.done ? 'bg-emerald-400 text-emerald-950' : 'border-2 border-card-border bg-surface-alt'
                }`}>
                  {s.done && <Check size={14} strokeWidth={3.5} />}
                </div>
                <span className={`flex-1 text-sm sm:text-base font-bold ${s.done ? 'text-muted line-through' : 'text-primary'}`}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state if no SOP and no sub-items */}
      {!sop.trim() && subItems.length === 0 && (
        <p className="text-xs text-muted mb-5">
          <Link to={`/checklist/${kind}/${item.id}`} className="hover:text-primary">+ Add instructions</Link>
        </p>
      )}

      {/* Action bar */}
      <div className="sticky bottom-4 z-10 flex items-center gap-2">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl text-muted hover:text-primary bg-card border border-card-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={markAndNext}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-brand text-black font-black px-5 py-4 sm:py-4 rounded-2xl hover:brightness-110 cursor-pointer text-sm sm:text-base"
        >
          {idx + 1 === total ? 'Done & Finish' : 'Done & Next'}
          <ArrowRight size={16} />
        </button>
      </div>
      </div>

      {showFullEditor && (
        <Suspense fallback={null}>
          <ChecklistEditorModal
            onClose={() => setShowFullEditor(false)}
            items={list}
            setItems={setList}
            title={kind === 'end' ? 'Edit End of Day' : 'Edit Start of Day'}
            kind={kind}
          />
        </Suspense>
      )}
    </div>
  );
}
