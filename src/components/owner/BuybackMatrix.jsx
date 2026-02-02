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
import { Archive } from 'lucide-react';
import { QUADRANT_META, BUYBACK_STATUS_META } from '../../data';

// Grid layout: rows are Energy (High top, Low bottom), columns are Value (Low left, High right)
// This gives us the 2x2 Buyback Principle matrix
const GRID = [
  // Top row (High Energy): replacement (low value), production (high value)
  { quadrant: 'replacement', row: 0, col: 0 },
  { quadrant: 'production', row: 0, col: 1 },
  // Bottom row (Low Energy): elimination (low value), delegation (high value)
  { quadrant: 'elimination', row: 1, col: 0 },
  { quadrant: 'delegation', row: 1, col: 1 },
];

function DraggableCard({ idea, onClickIdea, onArchive }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: idea.id,
  });
  const statusMeta = BUYBACK_STATUS_META[idea.status] || BUYBACK_STATUS_META.backlog;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClickIdea(idea)}
      className={`w-full text-left bg-white/80 rounded-lg border border-white/60 p-2.5 hover:bg-white hover:shadow-sm transition-all cursor-pointer ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-semibold text-primary leading-snug truncate">{idea.title}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(idea.id);
          }}
          className="p-1 rounded hover:bg-amber-50 text-muted hover:text-amber-600 transition-colors cursor-pointer shrink-0"
          title="Archive"
        >
          <Archive size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusMeta.bg} ${statusMeta.text}`}>
          {statusMeta.label}
        </span>
        {idea.assignedTo && (
          <span className="text-[10px] text-muted truncate">{idea.assignedTo}</span>
        )}
      </div>
    </div>
  );
}

function CardOverlay({ idea }) {
  const statusMeta = BUYBACK_STATUS_META[idea.status] || BUYBACK_STATUS_META.backlog;
  return (
    <div className="w-56 bg-white rounded-lg border border-indigo-300 p-2.5 shadow-xl rotate-2 opacity-90">
      <p className="text-sm font-semibold text-primary leading-snug truncate">{idea.title}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusMeta.bg} ${statusMeta.text}`}>
          {statusMeta.label}
        </span>
        {idea.assignedTo && (
          <span className="text-[10px] text-muted truncate">{idea.assignedTo}</span>
        )}
      </div>
    </div>
  );
}

function DroppableQuadrant({ quadrant, items, onClickIdea, onArchive }) {
  const meta = QUADRANT_META[quadrant];
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border ${meta.border} ${meta.bg} p-4 min-h-[180px] flex flex-col transition-all ${
        isOver ? 'ring-2 ring-indigo-400 ring-offset-2 scale-[1.02]' : ''
      }`}
    >
      {/* Quadrant header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColor}`} />
            <span className={`text-sm font-bold ${meta.text}`}>{meta.label}</span>
          </div>
          <p className={`text-[11px] mt-0.5 ${meta.text} opacity-70`}>{meta.subtitle}</p>
        </div>
        {items.length > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badgeBg} ${meta.badgeText}`}>
            {items.length}
          </span>
        )}
      </div>

      {/* Idea cards */}
      <div className="flex-1 space-y-2">
        {items.length === 0 && (
          <p className={`text-xs ${meta.text} opacity-50 italic`}>No items</p>
        )}
        {items.map((idea) => (
          <DraggableCard key={idea.id} idea={idea} onClickIdea={onClickIdea} onArchive={onArchive} />
        ))}
      </div>
    </div>
  );
}

export default function BuybackMatrix({ ideas, onClickIdea, onMoveIdea, onArchive }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = { production: [], replacement: [], delegation: [], elimination: [] };
  ideas.forEach((idea) => {
    if (grouped[idea.quadrant]) grouped[idea.quadrant].push(idea);
  });

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const targetQuadrant = over.id;
    const idea = ideas.find((i) => i.id === active.id);
    if (!idea || idea.quadrant === targetQuadrant) return;

    onMoveIdea?.(idea.id, targetQuadrant);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-2">
        {/* Axis labels */}
        <div className="flex items-end gap-2">
          <div className="w-6" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="text-center text-xs font-semibold text-muted uppercase tracking-wider">Low Value</div>
            <div className="text-center text-xs font-semibold text-muted uppercase tracking-wider">High Value</div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-around w-6 shrink-0">
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider -rotate-90 whitespace-nowrap origin-center">
              High Energy
            </div>
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider -rotate-90 whitespace-nowrap origin-center">
              Low Energy
            </div>
          </div>

          {/* 2x2 Grid */}
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3">
            {GRID.map(({ quadrant }) => (
              <DroppableQuadrant
                key={quadrant}
                quadrant={quadrant}
                items={grouped[quadrant]}
                onClickIdea={onClickIdea}
                onArchive={onArchive}
              />
            ))}
          </div>
        </div>

        {/* X-axis label */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-6" />
          <div className="flex-1 text-center text-[10px] font-semibold text-muted uppercase tracking-widest">
            Value &rarr;
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIdea ? <CardOverlay idea={activeIdea} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
