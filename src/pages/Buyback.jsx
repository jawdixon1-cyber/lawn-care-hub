import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, Columns3, Archive, RotateCcw, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';
import { calculateQuadrant, QUADRANT_SCORE_RANGES, QUADRANT_META } from '../data';
import BuybackMatrix from '../components/owner/BuybackMatrix';
import BuybackKanban from '../components/owner/BuybackKanban';
import BuybackTriageModal from '../components/owner/BuybackTriageModal';

export default function Buyback() {
  const navigate = useNavigate();
  const ideas = useAppStore((s) => s.buybackIdeas);
  const setIdeas = useAppStore((s) => s.setBuybackIdeas);
  const permissions = useAppStore((s) => s.permissions);

  const [tab, setTab] = useState('matrix');
  const [modalIdea, setModalIdea] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const teamMembers = Object.values(permissions || {})
    .map((p) => p.name)
    .filter(Boolean);

  // Split ideas into active and archived
  const activeIdeas = ideas.filter((i) => !i.archived);
  const archivedIdeas = ideas.filter((i) => i.archived);

  const openNew = () => {
    setModalIdea(null);
    setShowModal(true);
  };

  const openEdit = (idea) => {
    setModalIdea(idea);
    setShowModal(true);
  };

  const handleSave = (saved) => {
    setIdeas((prev) => {
      const exists = prev.find((i) => i.id === saved.id);
      if (exists) return prev.map((i) => (i.id === saved.id ? saved : i));
      return [...prev, saved];
    });
    setShowModal(false);
  };

  const handleArchive = (id) => {
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, archived: true, updatedAt: new Date().toISOString() } : i
      )
    );
  };

  const handleRestore = (id) => {
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, archived: false, updatedAt: new Date().toISOString() } : i
      )
    );
  };

  const handleMoveIdea = (ideaId, targetQuadrant) => {
    const range = QUADRANT_SCORE_RANGES[targetQuadrant];
    if (!range) return;

    setIdeas((prev) =>
      prev.map((i) => {
        if (i.id !== ideaId) return i;
        const energyScore = Math.max(range.energy[0], Math.min(range.energy[1], i.energyScore));
        const valueScore = Math.max(range.value[0], Math.min(range.value[1], i.valueScore));
        return {
          ...i,
          energyScore,
          valueScore,
          quadrant: targetQuadrant,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleStatusChange = (id, status) => {
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status, quadrant: calculateQuadrant(i.energyScore, i.valueScore), updatedAt: new Date().toISOString() }
          : i
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTItNmgydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1 className="text-3xl md:text-4xl font-bold">Buyback Command Center</h1>
          <p className="text-indigo-200 mt-2 text-lg">
            Score tasks by energy & value. Keep the gold, delegate the rest.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tab toggle */}
        <div className="inline-flex rounded-lg border border-border-strong overflow-hidden">
          <button
            onClick={() => setTab('matrix')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === 'matrix'
                ? 'bg-indigo-600 text-white'
                : 'bg-card text-secondary hover:bg-surface'
            }`}
          >
            <LayoutGrid size={16} />
            Matrix
          </button>
          <button
            onClick={() => setTab('kanban')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === 'kanban'
                ? 'bg-indigo-600 text-white'
                : 'bg-card text-secondary hover:bg-surface'
            }`}
          >
            <Columns3 size={16} />
            Kanban
          </button>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={18} />
          Add Idea
        </button>
      </div>

      {/* Content */}
      {tab === 'matrix' ? (
        <BuybackMatrix ideas={activeIdeas} onClickIdea={openEdit} onMoveIdea={handleMoveIdea} onArchive={handleArchive} />
      ) : (
        <BuybackKanban
          ideas={activeIdeas}
          onEdit={openEdit}
          onArchive={handleArchive}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Archived Section */}
      {archivedIdeas.length > 0 && (
        <div className="border border-border-subtle rounded-xl overflow-hidden">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between px-5 py-3 bg-surface/50 hover:bg-surface transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-muted" />
              <span className="text-sm font-semibold text-secondary">
                Archived ({archivedIdeas.length})
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted transition-transform ${showArchived ? 'rotate-180' : ''}`}
            />
          </button>

          {showArchived && (
            <div className="divide-y divide-border-subtle">
              {archivedIdeas.map((idea) => {
                const qMeta = QUADRANT_META[idea.quadrant];
                return (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-secondary truncate">{idea.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${qMeta.badgeBg} ${qMeta.badgeText}`}
                      >
                        {qMeta.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestore(idea.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Triage Modal */}
      {showModal && (
        <BuybackTriageModal
          idea={modalIdea}
          teamMembers={teamMembers}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
