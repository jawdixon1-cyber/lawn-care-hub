import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Trash2, Save, ExternalLink, Link2 } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';

const STORAGE_KEY = 'greenteam-checklist-details';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// Tap-to-edit step title. Strips markdown links for display, keeps raw text
// for editing so links you typed inline survive.
function EditableItemTitle({ value, onSave }) {
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
        className="w-full bg-transparent outline-none text-2xl sm:text-3xl font-black text-primary tracking-tight leading-tight mb-4 border-b-2 border-primary pb-1"
      />
    );
  }
  return (
    <h1
      onClick={() => setEditing(true)}
      className="text-2xl sm:text-3xl font-black text-primary tracking-tight leading-tight mb-4 cursor-text hover:bg-surface-alt rounded-lg px-1 -mx-1"
      title="Tap to rename"
    >
      {value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
    </h1>
  );
}

export default function ChecklistItem() {
  const { kind, itemId } = useParams();
  const navigate = useNavigate();

  const ownerStartChecklist = useAppStore((s) => s.ownerStartChecklist);
  const setOwnerStartChecklist = useAppStore((s) => s.setOwnerStartChecklist);
  const ownerEndChecklist = useAppStore((s) => s.ownerEndChecklist);
  const setOwnerEndChecklist = useAppStore((s) => s.setOwnerEndChecklist);
  const list = kind === 'end' ? ownerEndChecklist : ownerStartChecklist;
  const setList = kind === 'end' ? setOwnerEndChecklist : setOwnerStartChecklist;
  const item = useMemo(() => list.find((i) => i.id === itemId), [list, itemId]);

  const itemDays = item?.days || [];
  const toggleDay = (d) => {
    const next = itemDays.includes(d) ? itemDays.filter((x) => x !== d) : [...itemDays, d];
    setList(list.map((i) => i.id === itemId ? { ...i, days: next } : i));
  };
  const setEveryDay = () => {
    setList(list.map((i) => i.id === itemId ? { ...i, days: [] } : i));
  };

  const all = readAll();
  const initial = all[itemId] || { sop: '', subItems: [], links: [] };
  // Merge seeded item.links (from store) with locally-edited details.links so user
  // can see + delete BOTH. Once they edit anything, details.links becomes the
  // source of truth (workflow now only reads from details.links).
  const seededLinks = item?.links || [];
  const initialLinks = (initial.links && initial.links.length > 0)
    ? initial.links
    : seededLinks.map((l) => ({ id: l.id || uid(), label: l.label, url: l.url }));

  const [sop, setSop] = useState(initial.sop);
  const [subItems, setSubItems] = useState(initial.subItems);
  const [links, setLinks] = useState(initialLinks);
  const [draft, setDraft] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [savedNote, setSavedNote] = useState('');

  // Persist on change
  useEffect(() => {
    const data = readAll();
    data[itemId] = { sop, subItems, links };
    writeAll(data);
  }, [itemId, sop, subItems, links]);

  if (!item) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <p className="text-muted">Item not found.</p>
        <Link to="/" className="text-brand font-bold mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back home
        </Link>
      </div>
    );
  }

  const addSub = () => {
    const t = draft.trim();
    if (!t) return;
    setSubItems((arr) => [...arr, { id: uid(), text: t, done: false }]);
    setDraft('');
  };
  const toggleSub = (id) => setSubItems((arr) => arr.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  const removeSub = (id) => setSubItems((arr) => arr.filter((s) => s.id !== id));
  const resetSubs = () => setSubItems((arr) => arr.map((s) => ({ ...s, done: false })));

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const label = linkLabel.trim() || url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const safeUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    setLinks((arr) => [...arr, { id: uid(), label, url: safeUrl }]);
    setLinkLabel(''); setLinkUrl('');
  };
  const removeLink = (id) => setLinks((arr) => arr.filter((l) => l.id !== id));

  const done = subItems.filter((s) => s.done).length;
  const total = subItems.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const onSaveSop = () => {
    setSavedNote('Saved');
    setTimeout(() => setSavedNote(''), 1200);
  };

  const deleteStep = () => {
    if (!confirm(`Delete "${item.text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}"?`)) return;
    setList(list.filter((i) => i.id !== itemId));
    navigate(`/workflow/${kind}`);
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={deleteStep}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-800 px-3 py-2 rounded-lg hover:bg-rose-50 cursor-pointer"
          title="Delete this step"
        >
          <Trash2 size={14} /> Delete Step
        </button>
      </div>

      <div className="mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
          {kind === 'end' ? 'End of Day' : 'Start of Day'} &middot; SOP
        </p>
      </div>
      <EditableItemTitle
        value={item.text}
        onSave={(t) => setList(list.map((i) => i.id === itemId ? { ...i, text: t } : i))}
      />

      {/* Days of week */}
      <section className="rounded-3xl border border-card-border bg-card p-4 sm:p-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">Runs on</h2>
          {itemDays.length > 0 && (
            <button onClick={setEveryDay} className="text-xs font-bold text-muted hover:text-primary px-2 py-1 rounded-lg hover:bg-surface-alt cursor-pointer">
              Every day
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAY_NAMES.map((d) => {
            const active = itemDays.length === 0 || itemDays.includes(d);
            const allDays = itemDays.length === 0;
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                  active
                    ? (allDays ? 'bg-brand/15 text-brand border border-brand/30' : 'bg-brand text-black')
                    : 'bg-surface-alt text-muted hover:text-primary border border-card-border'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-2.5">
          {itemDays.length === 0 ? 'Runs every day.' : `Only shows on ${itemDays.join(', ')}.`}
        </p>
      </section>

      {/* SOP Editor */}
      <section className="rounded-3xl border border-card-border bg-card p-5 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-primary">Standard Operating Procedure</h2>
          <button
            onClick={onSaveSop}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:bg-brand/10 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <Save size={14} /> {savedNote || 'Save'}
          </button>
        </div>
        <textarea
          value={sop}
          onChange={(e) => setSop(e.target.value)}
          placeholder="Write the step-by-step instructions a new hire would need to do this task. Be specific."
          rows={10}
          className="w-full rounded-2xl bg-surface-alt border border-card-border p-4 text-base font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand resize-y"
        />
      </section>

      {/* Links */}
      <section className="rounded-3xl border border-card-border bg-card p-5 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-primary">Links</h2>
          <span className="text-xs font-bold text-muted">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
        </div>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {links.map((l) => (
              <div key={l.id} className="group inline-flex items-center gap-2 rounded-2xl bg-brand/10 hover:bg-brand/15 pl-3 pr-1 py-1.5">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-black text-brand">
                  <ExternalLink size={12} /> {l.label}
                </a>
                <button onClick={() => removeLink(l.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 cursor-pointer p-1.5 rounded-lg transition-opacity" title="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Label (e.g. Jobber)"
            className="sm:w-44 rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-sm font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }}
            placeholder="https://..."
            className="flex-1 rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-sm font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand"
          />
          <button
            onClick={addLink}
            disabled={!linkUrl.trim()}
            className="inline-flex items-center justify-center gap-1 px-4 py-3 rounded-2xl bg-brand text-black font-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </section>

      {/* Sub-checklist */}
      <section className="rounded-3xl border border-card-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-black text-primary">Sub-Checklist</h2>
            <p className="text-xs font-bold text-muted mt-0.5">{done} of {total} done &middot; {pct}%</p>
          </div>
          {done > 0 && (
            <button
              onClick={resetSubs}
              className="text-xs font-bold text-muted hover:text-primary px-2 py-1.5 rounded-lg hover:bg-surface-alt cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {total > 0 && (
          <div className="h-2 rounded-full bg-surface-alt overflow-hidden mb-4">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          {subItems.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">No sub-items yet. Add steps below.</p>
          )}
          {subItems.map((s) => (
            <div
              key={s.id}
              className={`flex items-start gap-3 rounded-2xl px-3 py-3 group ${
                s.done ? 'bg-emerald-500/8' : 'hover:bg-surface-alt'
              }`}
            >
              <button
                onClick={() => toggleSub(s.id)}
                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                  s.done
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'border-2 border-card-border bg-surface-alt'
                }`}
              >
                {s.done && <Check size={14} strokeWidth={3.5} />}
              </button>
              <span
                onClick={() => toggleSub(s.id)}
                className={`flex-1 text-sm sm:text-base font-bold cursor-pointer ${s.done ? 'text-muted line-through' : 'text-primary'}`}
              >
                {s.text}
              </span>
              <button
                onClick={() => removeSub(s.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 cursor-pointer p-1 transition-opacity"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }}
            placeholder="Add a step..."
            className="flex-1 rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-base font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand"
          />
          <button
            onClick={addSub}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl bg-brand text-black font-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </section>
    </div>
  );
}
