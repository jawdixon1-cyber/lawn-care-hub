import { useState } from 'react';
import {
  ChevronDown,
  AlertTriangle,
  Lightbulb,
  ClipboardCheck,
  StickyNote,
  Plus,
  Trash2,
  Megaphone,
  Settings,
  TrendingUp,
} from 'lucide-react';
import OwnerChecklist from '../components/OwnerChecklist';
import { genId } from '../data';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function OwnerDashboard({
  announcements,
  setAnnouncements,
  timeOffRequests,
  setTimeOffRequests,
  equipment,
  setEquipment,
  ideas,
  setIdeas,
  ownerTodos,
  setOwnerTodos,
  ownerStartChecklist,
  setOwnerStartChecklist,
  ownerEndChecklist,
  setOwnerEndChecklist,
  onNavigate,
}) {
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', priority: 'normal' });
  const [todoForm, setTodoForm] = useState({ title: '', note: '' });
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingPTO = timeOffRequests.filter((r) => r.status === 'pending');
  const repairEquipment = equipment.filter((e) => e.status === 'needs-repair');
  const reviewingIdeas = ideas.filter((i) => i.status === 'Reviewing');

  const handleApprove = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
  };

  const handleDeny = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'denied' } : r)));
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

  const handleIdeaStatus = (id, status) => {
    setIdeas(ideas.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handlePostAnnouncement = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    setAnnouncements([
      {
        id: genId(),
        title: announcementForm.title,
        message: announcementForm.message,
        priority: announcementForm.priority,
        date: today,
        postedBy: 'Jude Wilson',
      },
      ...announcements,
    ]);
    setAnnouncementForm({ title: '', message: '', priority: 'normal' });
    setShowAnnouncementForm(false);
  };

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
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-bold">{getGreeting()}, Jude</h1>
        <p className="text-emerald-100 mt-2 text-lg">Here's your business overview</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-300" />
            {pendingPTO.length} pending PTO
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-300" />
            {repairEquipment.length} repairs
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-300" />
            {reviewingIdeas.length} new ideas
          </span>
        </div>
      </div>

      {/* Apps */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Apps</h2>
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { name: 'Jobber', url: 'https://getjobber.com', bg: 'bg-[#7ac143]', icon: 'J' },
            { name: 'GoHighLevel', url: 'https://app.gohighlevel.com', bg: 'bg-[#0f62fe]', icon: 'G' },
            { name: 'QuickBooks', url: 'https://quickbooks.intuit.com', bg: 'bg-[#2ca01c]', icon: 'QB' },
            { name: 'ADP', url: 'https://my.adp.com', bg: 'bg-[#d0271d]', icon: 'ADP' },
            { name: 'Canva', url: 'https://www.canva.com', bg: 'bg-[#00c4cc]', icon: 'C' },
            { name: 'ChatGPT', url: 'https://chat.openai.com', bg: 'bg-[#10a37f]', icon: 'AI' },
            { name: 'Gemini', url: 'https://gemini.google.com', bg: 'bg-[#4285f4]', icon: 'Ge' },
            { name: 'Claude', url: 'https://claude.ai', bg: 'bg-[#d97757]', icon: 'Cl' },
          ].map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div className={`w-16 h-16 rounded-2xl ${app.bg} flex items-center justify-center text-white font-bold text-lg shadow-md hover:scale-105 transition-transform`}>
                {app.icon}
              </div>
              <span className="text-xs font-medium text-gray-600 w-16 text-center truncate">{app.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Maintenance ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">Maintenance</h2>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Action Required — Two columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Time Off */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Pending Time Off</h2>
          </div>
          {pendingPTO.length === 0 ? (
            <p className="text-gray-400 text-sm">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingPTO.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
                >
                  <h3 className="font-bold text-gray-900">{req.name}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {req.startDate} - {req.endDate} ({req.days} day{req.days > 1 ? 's' : ''})
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Reason: {req.reason}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(req.id)}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipment Needing Repair */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">Equipment Needing Repair</h2>
          </div>
          {repairEquipment.length === 0 ? (
            <p className="text-gray-400 text-sm">All equipment operational</p>
          ) : (
            <div className="space-y-4">
              {repairEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className="rounded-xl border border-red-200 bg-red-50/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-gray-900">{eq.name}</h3>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        eq.urgency === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {eq.urgency === 'critical' ? 'CRITICAL' : 'MAINTENANCE'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{eq.reportedIssue}</p>
                  <button
                    onClick={() => handleMarkRepaired(eq.id)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Mark Fixed
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigate('equipment')}
            className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            View All Equipment &rarr;
          </button>
        </div>
      </div>

      {/* Create Announcement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Create Announcement</h2>
        </div>
        {!showAnnouncementForm ? (
          <button
            onClick={() => setShowAnnouncementForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            New Announcement
          </button>
        ) : (
          <form onSubmit={handlePostAnnouncement} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
              <textarea
                required
                rows={3}
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="Write your announcement..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAnnouncementForm({ ...announcementForm, priority: 'normal' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    announcementForm.priority === 'normal'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setAnnouncementForm({ ...announcementForm, priority: 'high' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    announcementForm.priority === 'high'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  High
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAnnouncementForm(false);
                  setAnnouncementForm({ title: '', message: '', priority: 'normal' });
                }}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Post Announcement
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Owner Daily Checklists */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Owner's Daily Checklists</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <OwnerChecklist title="Start of Day" items={ownerStartChecklist} setItems={setOwnerStartChecklist} />
          <OwnerChecklist title="End of Day" items={ownerEndChecklist} setItems={setOwnerEndChecklist} />
        </div>
      </div>

      {/* ── Growth ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">Growth</h2>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* New Team Ideas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">New Team Ideas</h2>
        </div>
        {reviewingIdeas.length === 0 ? (
          <p className="text-gray-400 text-sm">No new ideas to review</p>
        ) : (
          <div className="space-y-4">
            {reviewingIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
              >
                <h3 className="font-bold text-gray-900">{idea.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{idea.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>By {idea.submittedBy}</span>
                  <span>{idea.date}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleIdeaStatus(idea.id, 'Approved')}
                    className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:opacity-80 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleIdeaStatus(idea.id, 'Implemented')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:opacity-80 transition-colors cursor-pointer"
                  >
                    Implemented
                  </button>
                  <button
                    onClick={() => handleIdeaStatus(idea.id, 'Rejected')}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:opacity-80 transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => onNavigate('equipment')}
          className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
        >
          View All Ideas &rarr;
        </button>
      </div>

      {/* Strategy Notepad */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote size={20} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-900">Strategy Notepad</h2>
        </div>

        <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={todoForm.title}
            onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            placeholder="Add a to-do item..."
          />
          <input
            type="text"
            value={todoForm.note}
            onChange={(e) => setTodoForm({ ...todoForm, note: e.target.value })}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
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
          <p className="text-gray-400 text-sm">No items yet. Add your first to-do above.</p>
        )}

        {activeTodos.length > 0 && (
          <div className="space-y-2 mb-4">
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-3 rounded-xl border border-gray-100 p-4 group"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggleTodo(todo.id)}
                  className="w-5 h-5 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{todo.title}</span>
                  {todo.note && <p className="text-xs text-gray-500 mt-0.5">{todo.note}</p>}
                </div>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-2"
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
                    className="flex items-start gap-3 rounded-xl border border-gray-50 p-4 bg-gray-50/50 group"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggleTodo(todo.id)}
                      className="w-5 h-5 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-400 line-through">{todo.title}</span>
                      {todo.note && <p className="text-xs text-gray-300 mt-0.5 line-through">{todo.note}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
    </div>
  );
}
