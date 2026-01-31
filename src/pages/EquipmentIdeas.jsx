import { useState } from 'react';
import { Wrench, Lightbulb, Plus } from 'lucide-react';
import Card from '../components/Card';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';

const EQUIP_CATEGORIES = ['Equipment Guide'];
const IDEA_CATEGORIES = ['Business Idea'];

export default function EquipmentIdeas({ equipment, setEquipment, ideas, setIdeas, ownerMode }) {
  const [viewing, setViewing] = useState(null);
  const [editingEquip, setEditingEquip] = useState(null);
  const [addingEquip, setAddingEquip] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [addingIdea, setAddingIdea] = useState(false);

  const handleDeleteEquip = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setEquipment(equipment.filter((i) => i.id !== item.id));
    }
  };

  const handleSaveEquip = (form) => {
    if (editingEquip) {
      setEquipment(equipment.map((i) => (i.id === editingEquip.id ? { ...i, ...form } : i)));
    } else {
      setEquipment([...equipment, { id: genId(), ...form }]);
    }
    setEditingEquip(null);
    setAddingEquip(false);
  };

  const handleDeleteIdea = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setIdeas(ideas.filter((i) => i.id !== item.id));
    }
  };

  const handleSaveIdea = (form) => {
    if (editingIdea) {
      setIdeas(ideas.map((i) => (i.id === editingIdea.id ? { ...i, ...form } : i)));
    } else {
      setIdeas([...ideas, { id: genId(), ...form }]);
    }
    setEditingIdea(null);
    setAddingIdea(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wrench size={22} className="text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-900">Equipment Guides</h2>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAddingEquip(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-colors"
          >
            <Plus size={18} /> Add Equipment Guide
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {equipment.map((item) => (
          <Card
            key={item.id}
            item={item}
            onClick={setViewing}
            onEdit={setEditingEquip}
            onDelete={handleDeleteEquip}
            ownerMode={ownerMode}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Lightbulb size={22} className="text-sky-500" />
          <h2 className="text-2xl font-bold text-gray-900">Business Growth Ideas</h2>
        </div>
        {ownerMode && (
          <button
            onClick={() => setAddingIdea(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 transition-colors"
          >
            <Plus size={18} /> Add Idea
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((item) => (
          <Card
            key={item.id}
            item={item}
            onClick={setViewing}
            onEdit={setEditingIdea}
            onDelete={handleDeleteIdea}
            ownerMode={ownerMode}
          />
        ))}
      </div>

      {viewing && <ViewModal item={viewing} onClose={() => setViewing(null)} />}
      {(editingEquip || addingEquip) && (
        <EditModal
          item={editingEquip}
          categories={EQUIP_CATEGORIES}
          title="Equipment Guide"
          onSave={handleSaveEquip}
          onClose={() => { setEditingEquip(null); setAddingEquip(false); }}
        />
      )}
      {(editingIdea || addingIdea) && (
        <EditModal
          item={editingIdea}
          categories={IDEA_CATEGORIES}
          title="Business Idea"
          onSave={handleSaveIdea}
          onClose={() => { setEditingIdea(null); setAddingIdea(false); }}
        />
      )}
    </div>
  );
}
