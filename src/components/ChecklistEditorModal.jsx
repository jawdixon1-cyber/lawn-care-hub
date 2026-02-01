import { useState, useRef } from 'react';
import {
  X,
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  ChevronRight,
  ChevronLeft,
  Type,
} from 'lucide-react';
import { genId } from '../data';

function normalizeItem(item) {
  return {
    id: item.id || genId(),
    text: item.text || '',
    type: item.type || 'item',
    indent: item.indent || 0,
    done: item.done || false,
  };
}

function normalizeItems(items) {
  return items.map(normalizeItem);
}

function ChecklistSection({ title, items, setItems }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [addText, setAddText] = useState('');
  const [addType, setAddType] = useState('item');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const normalized = normalizeItems(items);

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const updated = [...normalized];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setItems(updated);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setItems(normalized.map((i) => (i.id === editingId ? { ...i, text: editText.trim() } : i)));
    }
    setEditingId(null);
    setEditText('');
  };

  const deleteItem = (id) => {
    setItems(normalized.filter((i) => i.id !== id));
  };

  const indent = (id) => {
    setItems(normalized.map((i) => (i.id === id ? { ...i, indent: Math.min((i.indent || 0) + 1, 3) } : i)));
  };

  const outdent = (id) => {
    setItems(normalized.map((i) => (i.id === id ? { ...i, indent: Math.max((i.indent || 0) - 1, 0) } : i)));
  };

  const toggleType = (id) => {
    setItems(normalized.map((i) => (i.id === id ? { ...i, type: i.type === 'header' ? 'item' : 'header' } : i)));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!addText.trim()) return;
    setItems([...normalized, { id: genId(), text: addText.trim(), type: addType, indent: 0, done: false }]);
    setAddText('');
  };

  return (
    <div>
      <h3 className="font-bold text-primary text-sm mb-3">{title}</h3>
      <div className="space-y-1 mb-3">
        {normalized.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className="group"
            style={{ marginLeft: `${(item.indent || 0) * 24}px` }}
          >
            {editingId === item.id ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 p-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                  }}
                  className="flex-1 rounded border border-border-default px-2 py-1 text-sm text-primary outline-none focus:ring-1 focus:ring-emerald-400"
                  autoFocus
                />
                <button onClick={saveEdit} className="p-1 rounded text-brand-text hover:bg-brand-light cursor-pointer">
                  <Check size={14} />
                </button>
                <button onClick={() => { setEditingId(null); setEditText(''); }} className="p-1 rounded text-muted hover:bg-surface-alt cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-lg p-1.5 hover:bg-surface transition-colors">
                <div className="cursor-grab text-muted hover:text-tertiary shrink-0">
                  <GripVertical size={14} />
                </div>
                <span
                  className={`flex-1 text-sm ${
                    item.type === 'header'
                      ? 'font-bold text-primary uppercase tracking-wide text-xs'
                      : 'text-secondary'
                  }`}
                >
                  {item.type === 'header' && <span className="text-purple-500 mr-1">H</span>}
                  {item.text}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => outdent(item.id)} className="p-1 rounded text-muted hover:text-blue-500 cursor-pointer" title="Outdent">
                    <ChevronLeft size={12} />
                  </button>
                  <button onClick={() => indent(item.id)} className="p-1 rounded text-muted hover:text-blue-500 cursor-pointer" title="Indent">
                    <ChevronRight size={12} />
                  </button>
                  <button onClick={() => toggleType(item.id)} className="p-1 rounded text-muted hover:text-purple-500 cursor-pointer" title="Toggle header">
                    <Type size={12} />
                  </button>
                  <button onClick={() => startEdit(item)} className="p-1 rounded text-muted hover:text-blue-500 cursor-pointer" title="Edit">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-1 rounded text-muted hover:text-red-500 cursor-pointer" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {normalized.length === 0 && (
          <p className="text-muted text-sm py-2">No items yet. Add one below.</p>
        )}
      </div>
      <form onSubmit={addItem} className="flex items-center gap-2 border-t border-border-subtle pt-3">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-secondary outline-none cursor-pointer bg-card"
        >
          <option value="item">Item</option>
          <option value="header">Header</option>
        </select>
        <input
          type="text"
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          placeholder="Add item... (use [text](url) for links)"
          className="flex-1 rounded-lg border border-border-default px-3 py-1.5 text-sm text-primary outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-on-brand text-xs font-semibold hover:bg-brand-hover transition-colors cursor-pointer"
        >
          <Plus size={12} />
          Add
        </button>
      </form>
    </div>
  );
}

export default function ChecklistEditorModal({
  onClose,
  teamChecklist, setTeamChecklist,
  teamEndChecklist, setTeamEndChecklist,
  ownerStartChecklist, setOwnerStartChecklist,
  ownerEndChecklist, setOwnerEndChecklist,
}) {
  const [activeTab, setActiveTab] = useState('team');
  const [activeTime, setActiveTime] = useState('start');

  const getActiveItems = () => {
    if (activeTab === 'team' && activeTime === 'start') return teamChecklist;
    if (activeTab === 'team' && activeTime === 'end') return teamEndChecklist;
    if (activeTab === 'owner' && activeTime === 'start') return ownerStartChecklist;
    if (activeTab === 'owner' && activeTime === 'end') return ownerEndChecklist;
    return [];
  };

  const getActiveSetter = () => {
    if (activeTab === 'team' && activeTime === 'start') return setTeamChecklist;
    if (activeTab === 'team' && activeTime === 'end') return setTeamEndChecklist;
    if (activeTab === 'owner' && activeTime === 'start') return setOwnerStartChecklist;
    if (activeTab === 'owner' && activeTime === 'end') return setOwnerEndChecklist;
    return () => {};
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-primary">Edit Checklists</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 space-y-3">
          <div className="flex gap-1 bg-surface-alt p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'team' ? 'bg-card text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Team Checklist
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'owner' ? 'bg-card text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Owner Checklist
            </button>
          </div>
          <div className="flex gap-1 bg-surface-alt p-1 rounded-xl">
            <button
              onClick={() => setActiveTime('start')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTime === 'start' ? 'bg-card text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Start of Day
            </button>
            <button
              onClick={() => setActiveTime('end')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTime === 'end' ? 'bg-card text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              End of Day
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <ChecklistSection
            key={`${activeTab}-${activeTime}`}
            title={`${activeTab === 'team' ? 'Team' : 'Owner'} — ${activeTime === 'start' ? 'Start of Day' : 'End of Day'}`}
            items={getActiveItems()}
            setItems={getActiveSetter()}
          />
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border-subtle">
          <p className="text-xs text-muted">
            Drag items to reorder. Use indent/outdent arrows to nest sub-tasks. Use [text](url) for links.
          </p>
        </div>
      </div>
    </div>
  );
}
