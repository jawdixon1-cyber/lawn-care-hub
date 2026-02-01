import { X } from 'lucide-react';

const gradients = {
  Quality: 'from-emerald-500 to-emerald-700',
  Safety: 'from-red-500 to-red-700',
  Conduct: 'from-purple-500 to-purple-700',
  Professionalism: 'from-blue-500 to-blue-700',
  'Service Work': 'from-green-500 to-green-700',
  'Field Team': 'from-emerald-500 to-emerald-700',
  'Equipment & Maintenance': 'from-orange-500 to-orange-700',
  'Equipment Guide': 'from-orange-500 to-orange-700',
  Sales: 'from-purple-500 to-purple-700',
  Owner: 'from-blue-500 to-blue-700',
  Strategy: 'from-blue-500 to-blue-700',
  'Business Idea': 'from-sky-500 to-sky-700',
  Hiring: 'from-indigo-500 to-indigo-700',
  Training: 'from-teal-500 to-teal-700',
  Compensation: 'from-amber-500 to-amber-700',
  'Time Off': 'from-cyan-500 to-cyan-700',
};

export default function ViewModal({ item, onClose }) {
  if (!item) return null;
  const gradient = gradients[item.category] || 'from-gray-500 to-gray-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${gradient} px-8 py-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
            {item.category}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-white">{item.title}</h2>
        </div>
        <div className="p-8 overflow-y-auto">
          {item.content && item.content.includes('<') ? (
            <div
              className="prose prose-sm max-w-none text-secondary [&_img]:rounded-lg [&_img]:max-h-64 [&_img]:object-cover"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          ) : (
            <p className="text-secondary leading-relaxed whitespace-pre-line">{item.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
