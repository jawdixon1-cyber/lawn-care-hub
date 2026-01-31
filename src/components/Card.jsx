import { Pencil, Trash2 } from 'lucide-react';

const categoryColors = {
  Quality: 'bg-emerald-100 text-emerald-700',
  Safety: 'bg-red-100 text-red-700',
  Conduct: 'bg-purple-100 text-purple-700',
  Professionalism: 'bg-blue-100 text-blue-700',
  'Service Work': 'bg-green-100 text-green-700',
  'Equipment & Maintenance': 'bg-orange-100 text-orange-700',
  'Equipment Guide': 'bg-orange-100 text-orange-700',
  'Business Idea': 'bg-sky-100 text-sky-700',
  Hiring: 'bg-indigo-100 text-indigo-700',
  Training: 'bg-teal-100 text-teal-700',
  Compensation: 'bg-amber-100 text-amber-700',
  'Time Off': 'bg-cyan-100 text-cyan-700',
};

export default function Card({ item, onClick, onEdit, onDelete, ownerMode }) {
  const colorClass = categoryColors[item.category] || 'bg-gray-100 text-gray-700';

  return (
    <div
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer
                 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
      onClick={() => onClick(item)}
    >
      {ownerMode && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
        {item.category}
      </span>
      <h3 className="mt-3 text-lg font-bold text-gray-900">{item.title}</h3>
      <p className="mt-2 text-sm text-gray-500 line-clamp-3 whitespace-pre-line">{item.content}</p>
    </div>
  );
}
