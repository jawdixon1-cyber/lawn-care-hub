import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Pencil, Archive } from 'lucide-react';
import { QUADRANT_META, BUYBACK_STATUS_META } from '../../data';

const STATUS_KEYS = Object.keys(BUYBACK_STATUS_META);

function KanbanCard({ idea, onEdit, onArchive }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: idea.id,
  });
  const qMeta = QUADRANT_META[idea.quadrant];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <p className="text-sm font-semibold text-primary leading-snug truncate">{idea.title}</p>

      {/* Quadrant badge */}
      <span
        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${qMeta.badgeBg} ${qMeta.badgeText}`}
      >
        {qMeta.label}
      </span>

      {/* Energy / Value dots */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-muted mr-0.5">E</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`w-1.5 h-1.5 rounded-full ${n <= idea.energyScore ? 'bg-amber-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-muted mr-0.5">V</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`w-1.5 h-1.5 rounded-full ${n <= idea.valueScore ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Assignee + actions */}
      <div className="flex items-center justify-between mt-2">
        {idea.assignedTo ? (
          <span className="text-[10px] text-muted truncate">{idea.assignedTo}</span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(idea);
            }}
            className="p-1 rounded hover:bg-gray-100 text-muted hover:text-secondary transition-colors cursor-pointer"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(idea.id);
            }}
            className="p-1 rounded hover:bg-amber-50 text-muted hover:text-amber-600 transition-colors cursor-pointer"
            title="Archive"
          >
            <Archive size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanCardOverlay({ idea }) {
  const qMeta = QUADRANT_META[idea.quadrant];
  return (
    <div className="w-56 bg-white rounded-lg border border-indigo-300 p-3 shadow-xl rotate-2 opacity-90">
      <p className="text-sm font-semibold text-primary leading-snug truncate">{idea.title}</p>
      <span
        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${qMeta.badgeBg} ${qMeta.badgeText}`}
      >
        {qMeta.label}
      </span>
    </div>
  );
}

function KanbanColumn({ statusKey, items, onEdit, onArchive }) {
  const meta = BUYBACK_STATUS_META[statusKey];
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border-subtle bg-surface/50 p-3 min-h-[200px] flex flex-col transition-all ${
        isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
        <span className="text-xs font-semibold text-muted">{items.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted opacity-50 italic text-center py-4">Drop here</p>
        )}
        {items.map((idea) => (
          <KanbanCard key={idea.id} idea={idea} onEdit={onEdit} onArchive={onArchive} />
        ))}
      </div>
    </div>
  );
}

export default function BuybackKanban({ ideas, onEdit, onArchive, onStatusChange }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group ideas by status
  const grouped = {};
  STATUS_KEYS.forEach((k) => (grouped[k] = []));
  ideas.forEach((idea) => {
    const key = grouped[idea.status] ? idea.status : 'backlog';
    grouped[key].push(idea);
  });

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) : null;

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const targetStatus = over.id;
    const idea = ideas.find((i) => i.id === active.id);
    if (!idea || idea.status === targetStatus) return;

    onStatusChange(idea.id, targetStatus);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_KEYS.map((statusKey) => (
          <KanbanColumn
            key={statusKey}
            statusKey={statusKey}
            items={grouped[statusKey]}
            onEdit={onEdit}
            onArchive={onArchive}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIdea ? <KanbanCardOverlay idea={activeIdea} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
