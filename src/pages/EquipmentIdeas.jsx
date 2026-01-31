import { useState } from 'react';
import { Wrench, AlertCircle, CheckCircle, Plus, Lightbulb, X, Trash2 } from 'lucide-react';
import { genId } from '../data';
import AddEquipmentModal from '../components/AddEquipmentModal';
import ReportRepairModal from '../components/ReportRepairModal';

export default function EquipmentIdeas({ equipment, setEquipment, ideas, setIdeas, ownerMode, currentUser }) {
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [reportingRepair, setReportingRepair] = useState(false);
  const [addingIdea, setAddingIdea] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ title: '', description: '' });

  const handleAddEquipment = (form) => {
    setEquipment([...equipment, { id: genId(), ...form }]);
    setAddingEquipment(false);
  };

  const handleRepairSubmit = (form) => {
    const today = new Date().toLocaleDateString('en-US');
    setEquipment(
      equipment.map((eq) =>
        eq.id === form.equipmentId
          ? {
              ...eq,
              status: 'needs-repair',
              reportedIssue: form.problemDescription,
              reportedBy: form.reportedBy,
              reportedDate: today,
              urgency: form.urgency,
              photo: form.photo,
            }
          : eq
      )
    );
    setReportingRepair(false);
  };

  const handleMarkRepaired = (id) => {
    const today = new Date().toLocaleDateString('en-US');
    setEquipment(
      equipment.map((eq) =>
        eq.id === id
          ? { ...eq, status: 'operational', lastMaintenance: today, reportedIssue: undefined, reportedBy: undefined, reportedDate: undefined, urgency: undefined, photo: undefined }
          : eq
      )
    );
  };

  const handleDeleteEquipment = (id) => {
    setEquipment(equipment.filter((eq) => eq.id !== id));
  };

  const handleIdeaStatus = (id, status) => {
    setIdeas(ideas.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleDeleteIdea = (id) => {
    setIdeas(ideas.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Equipment &amp; Ideas</h1>
        <p className="text-gray-500 mt-1">Equipment tracking and team suggestions</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Equipment Log</h2>
          <div className="flex items-center gap-2">
            {ownerMode && (
              <button
                onClick={() => setAddingEquipment(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Add Equipment
              </button>
            )}
            <button
              onClick={() => setReportingRepair(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              <AlertCircle size={16} />
              Report Repair
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {equipment.map((item) => {
            const needsRepair = item.status === 'needs-repair';
            return (
              <div
                key={item.id}
                className={`rounded-xl border-l-4 p-5 ${
                  needsRepair
                    ? 'border-l-red-500 bg-red-50/50 border border-red-200'
                    : 'border-l-emerald-500 bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          needsRepair
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {needsRepair ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                        {needsRepair ? 'Needs Repair' : 'Operational'}
                      </span>
                      {needsRepair && item.urgency && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            item.urgency === 'critical'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.urgency === 'critical' ? 'CRITICAL' : 'Maintenance'}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-8 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">Last Maintenance</p>
                        <p className="text-sm font-medium text-gray-700">{item.lastMaintenance}</p>
                      </div>
                      {item.nextMaintenance && (
                        <div>
                          <p className="text-xs text-gray-400">Next Maintenance</p>
                          <p className="text-sm font-medium text-gray-700">{item.nextMaintenance}</p>
                        </div>
                      )}
                    </div>

                    {needsRepair && item.reportedIssue && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400">Reported Issue</p>
                        <p className="text-sm text-red-600 mt-0.5">{item.reportedIssue}</p>
                        {item.photo && (
                          <img
                            src={item.photo}
                            alt="Repair photo"
                            className="mt-2 rounded-lg max-h-32 object-cover"
                          />
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Reported by {item.reportedBy} on {item.reportedDate}
                        </p>
                      </div>
                    )}
                    {ownerMode && (
                      <div className="flex gap-2 mt-4">
                        {needsRepair && (
                          <button
                            onClick={() => handleMarkRepaired(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            <CheckCircle size={14} />
                            Mark Repaired
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEquipment(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <Wrench size={22} className={needsRepair ? 'text-red-400' : 'text-emerald-400'} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Ideas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Team Ideas</h2>
          <button
            onClick={() => setAddingIdea(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Lightbulb size={16} />
            Submit Idea
          </button>
        </div>

        <div className="space-y-4">
          {ideas.map((idea) => {
            const statusColors = {
              Reviewing: 'bg-purple-100 text-purple-700',
              Approved: 'bg-blue-100 text-blue-700',
              Implemented: 'bg-emerald-100 text-emerald-700',
              Rejected: 'bg-red-100 text-red-700',
            };
            return (
              <div key={idea.id} className="rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900">{idea.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{idea.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-400">
                        By {idea.submittedBy} &middot; {idea.date}
                      </p>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          statusColors[idea.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {idea.status}
                      </span>
                    </div>
                    {ownerMode && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {['Reviewing', 'Approved', 'Implemented', 'Rejected']
                          .filter((s) => s !== idea.status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => handleIdeaStatus(idea.id, s)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${statusColors[s]
                                } hover:opacity-80`}
                            >
                              {s}
                            </button>
                          ))}
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <Lightbulb size={22} className="text-purple-400 ml-4 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {addingIdea && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAddingIdea(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 px-8 py-6 relative">
              <button
                onClick={() => setAddingIdea(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white">Submit Idea</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const today = new Date().toLocaleDateString('en-US');
                setIdeas([...ideas, {
                  id: genId(),
                  title: ideaForm.title,
                  description: ideaForm.description,
                  submittedBy: currentUser,
                  date: today,
                  status: 'Reviewing',
                }]);
                setIdeaForm({ title: '', description: '' });
                setAddingIdea(false);
              }}
              className="p-8 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={ideaForm.title}
                  onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="What's your idea?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={ideaForm.description}
                  onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-y"
                  placeholder="Describe your idea and why it would help..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Submitted by</label>
                <input
                  type="text"
                  value={currentUser}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-500 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAddingIdea(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
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

      {addingEquipment && (
        <AddEquipmentModal
          onSave={handleAddEquipment}
          onClose={() => setAddingEquipment(false)}
        />
      )}

      {reportingRepair && (
        <ReportRepairModal
          equipment={equipment}
          currentUser={currentUser}
          onSubmit={handleRepairSubmit}
          onClose={() => setReportingRepair(false)}
        />
      )}
    </div>
  );
}
