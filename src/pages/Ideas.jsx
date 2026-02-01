import { useState } from 'react';
import { Lightbulb, Plus, X } from 'lucide-react';
import { genId } from '../data';

export default function Ideas({ ideas, setIdeas, currentUser }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString('en-US');
    setIdeas([
      ...ideas,
      {
        id: genId(),
        title: form.title,
        description: form.description,
        submittedBy: currentUser,
        date: today,
        status: 'Reviewing',
      },
    ]);
    setForm({ title: '', description: '' });
    setAdding(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Ideas</h1>
        <p className="text-tertiary mt-1">Team suggestions and improvement ideas</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Team Ideas</h2>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Lightbulb size={16} />
            Submit Idea
          </button>
        </div>

        <div className="space-y-4">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-xl border border-border-subtle p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-primary">{idea.title}</h3>
                  <p className="text-sm text-tertiary mt-1">{idea.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted">
                      By {idea.submittedBy} &middot; {idea.date}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        idea.status === 'Implemented'
                          ? 'bg-brand-light text-brand-text-strong'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {idea.status}
                    </span>
                  </div>
                </div>
                <Lightbulb size={22} className="text-purple-400 ml-4 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAdding(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 px-8 py-6 relative">
              <button
                onClick={() => setAdding(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white">Submit Idea</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="What's your idea?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-y"
                  placeholder="Describe your idea and why it would help..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Submitted by</label>
                <input
                  type="text"
                  value={currentUser}
                  readOnly
                  className="w-full rounded-lg border border-border-default px-4 py-2.5 text-tertiary bg-surface cursor-not-allowed"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-5 py-2.5 rounded-lg border border-border-strong text-secondary font-medium hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
