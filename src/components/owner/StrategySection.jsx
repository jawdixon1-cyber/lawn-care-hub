import { useState } from 'react';
import { ChevronDown, StickyNote, Plus, Trash2 } from 'lucide-react';
import { genId } from '../../data';
import { useAppStore } from '../../store/AppStoreContext';

export default function StrategySection() {
  const ownerTodos = useAppStore((s) => s.ownerTodos);
  const setOwnerTodos = useAppStore((s) => s.setOwnerTodos);

  const [todoForm, setTodoForm] = useState({ title: '', note: '' });
  const [showCompleted, setShowCompleted] = useState(false);

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!todoForm.title.trim()) return;
    setOwnerTodos([
      ...ownerTodos,
      { id: genId(), title: todoForm.title.trim(), note: todoForm.note.trim(), done: false },
    ]);
    setTodoForm({ title: '', note: '' });
  };

  const handleToggleTodo = (id) => {
    setOwnerTodos(ownerTodos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleDeleteTodo = (id) => {
    setOwnerTodos(ownerTodos.filter((t) => t.id !== id));
  };

  const activeTodos = ownerTodos.filter((t) => !t.done);
  const completedTodos = ownerTodos.filter((t) => t.done);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-6">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote size={20} className="text-indigo-500" />
        <h2 className="text-lg font-bold text-primary">Strategy Notepad</h2>
      </div>

      <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={todoForm.title}
          onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
          className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          placeholder="Add a to-do item..."
        />
        <input
          type="text"
          value={todoForm.note}
          onChange={(e) => setTodoForm({ ...todoForm, note: e.target.value })}
          className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          placeholder="Optional note..."
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Add
        </button>
      </form>

      {activeTodos.length === 0 && completedTodos.length === 0 && (
        <p className="text-muted text-sm">No items yet. Add your first to-do above.</p>
      )}

      {activeTodos.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 rounded-xl border border-border-subtle p-4 group"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleToggleTodo(todo.id)}
                className="w-5 h-5 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-primary">{todo.title}</span>
                {todo.note && <p className="text-xs text-tertiary mt-0.5">{todo.note}</p>}
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {completedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-tertiary hover:text-secondary transition-colors cursor-pointer mb-2"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`}
            />
            {completedTodos.length} completed
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 rounded-xl border border-border-subtle p-4 bg-surface/50 group"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleTodo(todo.id)}
                    className="w-5 h-5 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-muted line-through">{todo.title}</span>
                    {todo.note && <p className="text-xs text-muted mt-0.5 line-through">{todo.note}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
