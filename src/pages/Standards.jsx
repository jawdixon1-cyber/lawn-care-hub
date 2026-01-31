import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import Card from '../components/Card';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';

const CATEGORIES = ['Quality', 'Safety', 'Conduct', 'Professionalism'];

export default function Standards({ items, setItems, ownerMode }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

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
        <div className="flex items-center gap-2">
          <CheckSquare size={22} className="text-emerald-600" />
          <h2 className="text-2xl font-bold text-gray-900">Standards & Policies</h2>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Add Standard
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
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

      {viewing && <ViewModal item={viewing} onClose={() => setViewing(null)} />}
      {(editing || adding) && (
        <EditModal
          item={editing}
          categories={CATEGORIES}
          title="Standard"
          onSave={handleSave}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
