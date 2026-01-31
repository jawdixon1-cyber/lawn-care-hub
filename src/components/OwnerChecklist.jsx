import { useState } from 'react';
import { ChevronDown, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { genId } from '../data';

function renderLinkedText(text) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={i++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-600 hover:text-emerald-700 underline"
        onClick={(e) => e.stopPropagation()}
      >
        {match[1]}
      </a>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export default function OwnerChecklist({ title, items, setItems }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [addText, setAddText] = useState('');

  const checkableItems = items.filter((i) => i.type !== 'header');
  const completedCount = checkableItems.filter((i) => i.done).length;

  const toggleDone = (id) => {
    setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setItems(items.map((i) => (i.id === editingId ? { ...i, text: editText.trim() } : i)));
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteItem = (id) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!addText.trim()) return;
    setItems([...items, { id: genId(), text: addText.trim(), type: 'item', indent: 0, done: false }]);
    setAddText('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-6 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 text-lg">{title}</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {completedCount}/{checkableItems.length} completed
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-2">
          {items.map((item) => {
            if (editingId === item.id) {
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 ml-1">Use [text](url) for links</p>
                </div>
              );
            }

            if (item.type === 'header') {
              return (
                <div key={item.id} className="flex items-center justify-between group pt-3 first:pt-0">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{item.text}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(item)} className="p-1 rounded text-gray-300 hover:text-blue-500 cursor-pointer">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1 rounded text-gray-300 hover:text-red-500 cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className={`flex items-start gap-3 group ${item.indent ? 'ml-8' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item.id)}
                  className="w-5 h-5 mt-0.5 rounded accent-emerald-600 shrink-0 cursor-pointer"
                />
                <span
                  className={`flex-1 text-sm transition-colors duration-150 ${
                    item.done ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {renderLinkedText(item.text)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(item)} className="p-1 rounded text-gray-300 hover:text-blue-500 cursor-pointer">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-1 rounded text-gray-300 hover:text-red-500 cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          <form onSubmit={addItem} className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-3">
            <input
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Add item (use [text](url) for links)..."
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
