import { useState } from 'react';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { genId, calculateQuadrant, QUADRANT_META } from '../../data';
import EnergyValuePicker from './EnergyValuePicker';

const STATUSES = ['backlog', 'this-week', 'in-progress', 'done'];
const STATUS_LABELS = { backlog: 'Backlog', 'this-week': 'This Week', 'in-progress': 'In Progress', done: 'Done' };

export default function BuybackTriageModal({ idea, teamMembers, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    idea
      ? { ...idea }
      : {
          title: '',
          description: '',
          energyScore: 3,
          valueScore: 3,
          sopLink: '',
          status: 'backlog',
          assignedTo: '',
          scheduledTime: '',
          weekOf: '',
          notes: '',
        }
  );

  const [sopError, setSopError] = useState('');

  const quadrant = calculateQuadrant(form.energyScore, form.valueScore);
  const qMeta = QUADRANT_META[quadrant];
  const needsSop = (quadrant === 'delegation' || quadrant === 'replacement') && form.assignedTo !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (needsSop && !form.sopLink.trim()) {
      setSopError('SOP link is required when delegating or assigning replacement tasks');
      return;
    }
    setSopError('');

    const now = new Date().toISOString();
    const saved = {
      ...form,
      id: idea?.id || genId(),
      quadrant,
      createdAt: idea?.createdAt || now,
      updatedAt: now,
    };
    onSave(saved);
  };

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'sopLink' || field === 'assignedTo') setSopError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white">
            {idea ? 'Edit Idea' : 'New Idea'}
          </h2>
          <p className="text-indigo-200 text-sm mt-1">Score to auto-assign quadrant</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-secondary mb-1">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
              placeholder="What task or activity is this?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-secondary mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition resize-y"
              placeholder="Brief description of this task..."
            />
          </div>

          {/* Energy & Value Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <EnergyValuePicker
              variant="energy"
              value={form.energyScore}
              onChange={(v) => update('energyScore', v)}
            />
            <EnergyValuePicker
              variant="value"
              value={form.valueScore}
              onChange={(v) => update('valueScore', v)}
            />
          </div>

          {/* Live Quadrant Preview */}
          <div className={`rounded-xl border ${qMeta.border} ${qMeta.bg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${qMeta.dotColor}`} />
              <span className={`text-sm font-bold ${qMeta.text}`}>{qMeta.label}</span>
            </div>
            <p className={`text-xs mt-1 ${qMeta.text} opacity-80`}>{qMeta.subtitle}</p>
          </div>

          {/* Status & Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1">Assigned To</label>
              <select
                value={form.assignedTo}
                onChange={(e) => update('assignedTo', e.target.value)}
                className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
              >
                <option value="">Owner (me)</option>
                {teamMembers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SOP Link */}
          <div>
            <label className="block text-sm font-semibold text-secondary mb-1">
              <span className="inline-flex items-center gap-1.5">
                <LinkIcon size={14} />
                SOP Link
                {needsSop && <span className="text-red-500 text-xs">(required)</span>}
              </span>
            </label>
            <input
              type="url"
              value={form.sopLink}
              onChange={(e) => update('sopLink', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition ${
                sopError ? 'border-red-400' : 'border-border-strong'
              }`}
              placeholder="https://docs.google.com/..."
            />
            {sopError && (
              <p className="flex items-center gap-1.5 text-red-600 text-xs mt-1.5">
                <AlertCircle size={12} />
                {sopError}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-secondary mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition resize-y"
              placeholder="Any additional context..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-border-strong text-secondary font-medium hover:bg-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {idea ? 'Save Changes' : 'Add Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
