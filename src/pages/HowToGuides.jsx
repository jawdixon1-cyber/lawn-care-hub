import { useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import Card from '../components/Card';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';

const ALL_CATEGORIES = ['Service Work', 'Equipment & Maintenance', 'Quoting & Sales'];

const CATEGORY_TO_TYPE = {
  'Service Work': 'service',
  'Equipment & Maintenance': 'equipment',
  'Quoting & Sales': 'pme',
};

export default function HowToGuides({ items, setItems, ownerMode }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('service');
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();
  const filtered = items.filter((i) => {
    const matchesTab = i.type === filter;
    if (!query) return matchesTab;
    return (i.title?.toLowerCase().includes(query) || i.summary?.toLowerCase().includes(query));
  });

  const handleDelete = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setItems(items.filter((i) => i.id !== item.id));
    }
  };

  const handleSave = (form) => {
    const type = CATEGORY_TO_TYPE[form.category] || 'service';
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...i, ...form, type } : i)));
    } else {
      setItems([...items, { id: genId(), ...form, type }]);
    }
    setEditing(null);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-emerald-600" />
            <h2 className="text-2xl font-bold text-gray-900">Playbooks</h2>
          </div>
          <p className="text-gray-500 mt-1">Step-by-step procedures</p>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Add Guide
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search playbooks..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6 overflow-x-auto">
        {[
          { key: 'service', label: 'Service Work', activeColor: 'text-emerald-700' },
          { key: 'equipment', label: 'Equipment', activeColor: 'text-orange-700' },
          { key: 'pme', label: 'Quoting & Sales', activeColor: 'text-purple-700' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === tab.key
                ? `bg-white ${tab.activeColor} shadow-sm`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">{query ? 'No playbooks match your search.' : 'No playbooks in this category yet.'}</p>
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
          categories={ALL_CATEGORIES}
          title="Guide"
          richText
          onSave={handleSave}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
