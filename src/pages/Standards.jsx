import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import Card from '../components/Card';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';

const STANDARD_CATEGORIES = ['Quality', 'Safety'];
const POLICY_CATEGORIES = ['Professionalism', 'Conduct'];
const ALL_CATEGORIES = [...STANDARD_CATEGORIES, ...POLICY_CATEGORIES];

export default function Standards({ items, setItems, ownerMode }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('standard');

  const filtered = items.filter((i) =>
    filter === 'standard' ? i.type === 'standard' : i.type === 'policy'
  );

  const handleDelete = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setItems(items.filter((i) => i.id !== item.id));
    }
  };

  const handleSave = (form) => {
    const type = STANDARD_CATEGORIES.includes(form.category) ? 'standard' : 'policy';
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
        <div className="flex items-center gap-2">
          <CheckSquare size={22} className="text-emerald-600" />
          <h2 className="text-2xl font-bold text-gray-900">Standards & Policies</h2>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Add {filter === 'standard' ? 'Standard' : 'Policy'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setFilter('standard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'standard'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Standards
        </button>
        <button
          onClick={() => setFilter('policy')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'policy'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Policies
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <Card
            key={item.id}
            item={item}
            onClick={setViewing}
            onEdit={setEditing}
            onDelete={handleDelete}
            ownerMode={ownerMode}
            hideCategory
          />
        ))}
      </div>

      {viewing && <ViewModal item={viewing} onClose={() => setViewing(null)} />}
      {(editing || adding) && (
        <EditModal
          item={editing}
          categories={filter === 'standard' ? STANDARD_CATEGORIES : POLICY_CATEGORIES}
          title={filter === 'standard' ? 'Standard' : 'Policy'}
          onSave={handleSave}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
