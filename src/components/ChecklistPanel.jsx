import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ChecklistPanel({ title, items }) {
  const normalized = items.map((item, i) =>
    typeof item === 'string' ? { id: `static-${i}`, text: item } : item
  );

  const [checked, setChecked] = useState(() => new Set());
  const [open, setOpen] = useState(false);

  const completedCount = normalized.filter((i) => checked.has(i.id)).length;

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            {completedCount}/{normalized.length} completed
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-3">
          {normalized.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id)}
                className="w-5 h-5 rounded accent-emerald-600 shrink-0"
              />
              <span
                className={`text-sm transition-colors duration-150 ${
                  checked.has(item.id) ? 'line-through text-gray-400' : 'text-gray-700'
                }`}
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
