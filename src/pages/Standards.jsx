import { useState } from 'react';
import { CheckSquare, Plus, Search } from 'lucide-react';
import Card from '../components/Card';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';

const CATEGORIES = ['Quality', 'Safety', 'Professionalism', 'Conduct'];

export default function Standards({ items, setItems, ownerMode }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();
  const filtered = query
    ? items.filter((i) => i.title?.toLowerCase().includes(query) || i.summary?.toLowerCase().includes(query))
    : items;

  const handleDelete = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setItems(items.filter((i) => i.id !== item.id));
    }
  };

  const handleSave = (form) => {
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...i, ...form } : i)));
    } else {
      setItems([...items, { id: genId(), ...form }]);
    }
    setEditing(null);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare size={22} className="text-brand-text" />
            <h2 className="text-2xl font-bold text-primary">Standards</h2>
          </div>
          <p className="text-tertiary mt-1">What's expected of our team</p>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-on-brand font-medium text-sm hover:bg-brand-hover transition-colors"
          >
            <Plus size={18} /> Add Standard
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search standards..."
          className="w-full rounded-xl border border-border-default bg-card pl-10 pr-4 py-2.5 text-sm text-primary placeholder-placeholder-muted focus:ring-2 focus:ring-ring-brand focus:border-border-brand outline-none transition"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted text-sm">{query ? 'No standards match your search.' : 'No standards yet.'}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              item={item}
              onClick={setViewing}
              onEdit={setEditing}
              onDelete={handleDelete}
              ownerMode={ownerMode}
            />
          ))}
        </div>
      )}

      {viewing && <ViewModal item={viewing} onClose={() => setViewing(null)} />}
      {(editing || adding) && (
        <EditModal
          item={editing}
          categories={CATEGORIES}
          title="Standard"
          richText
          onSave={handleSave}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
