import { useState } from 'react';
import { Lightbulb, MessageSquare, Plus, X, Trash2 } from 'lucide-react';
import { genId } from '../data';

const STATUS_COLORS = {
  New: 'bg-purple-100 text-purple-700',
  Reviewing: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Implemented: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function IdeasFeedback({ suggestions, setSuggestions, ownerMode, currentUser }) {
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'idea', title: '', description: '' });

  const filtered = filter === 'all'
    ? suggestions
    : suggestions.filter((s) => s.type === filter);

  const handleSubmit = (e) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString('en-US');
    setSuggestions([
      {
        id: genId(),
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        submittedBy: currentUser,
        date: today,
        status: 'New',
      },
      ...suggestions,
    ]);
    setForm({ type: 'idea', title: '', description: '' });
    setAdding(false);
  };

  const handleStatus = (id, status) => {
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleDelete = (id) => {
    if (confirm('Delete this submission?')) {
      setSuggestions(suggestions.filter((s) => s.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb size={22} className="text-amber-500" />
            <h2 className="text-2xl font-bold text-gray-900">Ideas & Feedback</h2>
          </div>
          <p className="text-gray-500 mt-1">Submit ideas to improve the business or feedback on the software</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors cursor-pointer"
          >
            <Plus size={18} /> Submit
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">New Submission</h3>
            <button onClick={() => { setAdding(false); setForm({ type: 'idea', title: '', description: '' }); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">What type?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'idea' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    form.type === 'idea'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Lightbulb size={16} />
                  Business Idea
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'feedback' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    form.type === 'feedback'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare size={16} />
                  Software Feedback
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                placeholder={form.type === 'idea' ? 'What\'s your idea?' : 'What could be better?'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition resize-y"
                placeholder={form.type === 'idea' ? 'Describe your idea and how it helps the business...' : 'Describe the issue or what you\'d like to see improved...'}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setAdding(false); setForm({ type: 'idea', title: '', description: '' }); }}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors cursor-pointer"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'idea', label: 'Business Ideas' },
          { key: 'feedback', label: 'Software Feedback' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Lightbulb size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {suggestions.length === 0
              ? 'No submissions yet. Be the first to share an idea or give feedback!'
              : 'No submissions in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === 'idea' ? (
                      <Lightbulb size={16} className="text-amber-500 shrink-0" />
                    ) : (
                      <MessageSquare size={16} className="text-blue-500 shrink-0" />
                    )}
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-6">{item.description}</p>
                  <div className="flex items-center gap-3 mt-3 ml-6">
                    <p className="text-xs text-gray-400">
                      {item.submittedBy} &middot; {item.date}
                    </p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  {ownerMode && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-6">
                      {['New', 'Reviewing', 'Approved', 'Implemented', 'Rejected']
                        .filter((s) => s !== item.status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatus(item.id, s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${STATUS_COLORS[s]} hover:opacity-80`}
                          >
                            {s}
                          </button>
                        ))}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
