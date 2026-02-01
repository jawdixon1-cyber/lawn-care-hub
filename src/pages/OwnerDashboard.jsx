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
  Users,
  Briefcase,
  Target,
  Calendar,
  Archive,
  RotateCcw,
  ClipboardList,
  Wrench,
  Pencil,
  Check,
  X,
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
  currentUser,
  announcements,
  setAnnouncements,
  archivedAnnouncements,
  setArchivedAnnouncements,
  timeOffRequests,
  setTimeOffRequests,
  equipment,
  setEquipment,
  suggestions,
  setSuggestions,
  ownerTodos,
  setOwnerTodos,
  ownerStartChecklist,
  setOwnerStartChecklist,
  ownerEndChecklist,
  setOwnerEndChecklist,
  equipmentRepairLog,
  setEquipmentRepairLog,
  teamChecklist,
  setTeamChecklist,
  onNavigate,
}) {
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', priority: 'normal' });
  const [todoForm, setTodoForm] = useState({ title: '', note: '' });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTeamMgmt, setShowTeamMgmt] = useState(false);
  const [showMyDay, setShowMyDay] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [showArchivedAnnouncements, setShowArchivedAnnouncements] = useState(false);
  const [showRepairLog, setShowRepairLog] = useState(false);
  const [teamChecklistEditId, setTeamChecklistEditId] = useState(null);
  const [teamChecklistEditText, setTeamChecklistEditText] = useState('');
  const [teamChecklistAddText, setTeamChecklistAddText] = useState('');

  const pendingPTO = timeOffRequests.filter((r) => r.status === 'pending');
  const repairEquipment = equipment.filter((e) => e.status === 'needs-repair');
  const newSuggestions = suggestions.filter((s) => s.status === 'New');

  // Team Availability helpers
  const getWeekBounds = (weekOffset) => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const parseMMDDYYYY = (str) => {
    const parts = str.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  };

  const getApprovedPTOForWeek = (weekOffset) => {
    const { start, end } = getWeekBounds(weekOffset);
    return timeOffRequests.filter((r) => {
      if (r.status !== 'approved') return false;
      const ptoStart = parseMMDDYYYY(r.startDate);
      const ptoEnd = parseMMDDYYYY(r.endDate);
      return ptoStart <= end && ptoEnd >= start;
    });
  };

  const formatWeekRange = (weekOffset) => {
    const { start, end } = getWeekBounds(weekOffset);
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const handleApprove = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
  };

  const handleDeny = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'denied' } : r)));
  };

  const handleMarkRepaired = (id) => {
    const today = new Date().toLocaleDateString('en-US');
    const eq = equipment.find((e) => e.id === id);
    if (eq && eq.reportedIssue) {
      const logEntry = {
        id: genId(),
        equipmentName: eq.name,
        issue: eq.reportedIssue,
        reportedBy: eq.reportedBy || 'Unknown',
        reportedDate: eq.reportedDate || today,
        repairedDate: today,
        urgency: eq.urgency || 'maintenance',
      };
      setEquipmentRepairLog((prev) => [logEntry, ...prev]);
    }
    setEquipment(
      equipment.map((e) =>
        e.id === id
          ? { ...e, status: 'operational', lastMaintenance: today, reportedIssue: undefined, reportedBy: undefined, reportedDate: undefined, urgency: undefined, photo: undefined }
          : e
      )
    );
  };

  const handleIdeaStatus = (id, status) => {
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleArchiveAnnouncement = (id) => {
    const item = announcements.find((a) => a.id === id);
    if (item) {
      setArchivedAnnouncements((prev) => [item, ...prev]);
      setAnnouncements(announcements.filter((a) => a.id !== id));
    }
  };

  const handleRestoreAnnouncement = (id) => {
    const item = archivedAnnouncements.find((a) => a.id === id);
    if (item) {
      setAnnouncements((prev) => [item, ...prev]);
      setArchivedAnnouncements(archivedAnnouncements.filter((a) => a.id !== id));
    }
  };

  const handlePermanentlyDeleteAnnouncement = (id) => {
    if (confirm('Permanently delete this announcement?')) {
      setArchivedAnnouncements(archivedAnnouncements.filter((a) => a.id !== id));
    }
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
        postedBy: currentUser,
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
    <div className="space-y-10">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-bold">{getGreeting()}, {currentUser?.split(' ')[0]}</h1>
        <p className="text-emerald-100 mt-2 text-lg">Here's your business overview</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-300" />
            {pendingPTO.length} pending time off
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-300" />
            {repairEquipment.length} repairs
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-300" />
            {newSuggestions.length} new ideas
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

      {/* ── Team Management ── */}
      <button
        onClick={() => setShowTeamMgmt((v) => !v)}
        className="flex items-center gap-3 pt-4 w-full cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <ChevronDown
          size={20}
          className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${showTeamMgmt ? '' : '-rotate-90'}`}
        />
      </button>

      {showTeamMgmt && <>
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

      {/* Team Availability */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900">Team Availability</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((offset) => {
            const ptoList = getApprovedPTOForWeek(offset);
            return (
              <div key={offset}>
                <h3 className="font-semibold text-gray-900 text-sm">{offset === 0 ? 'This Week' : 'Next Week'}</h3>
                <p className="text-xs text-gray-400 mb-3">{formatWeekRange(offset)}</p>
                {ptoList.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium">Full team available</p>
                ) : (
                  <div className="space-y-2">
                    {ptoList.map((r) => (
                      <div key={r.id} className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.startDate} - {r.endDate} ({r.days} day{r.days > 1 ? 's' : ''})</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Start-of-Day Checklist Editor */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Team Start-of-Day Checklist</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Shown to all team members on their Home page</p>
        <div className="space-y-2">
          {teamChecklist.map((item) => {
            if (teamChecklistEditId === item.id) {
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={teamChecklistEditText}
                    onChange={(e) => setTeamChecklistEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && teamChecklistEditText.trim()) {
                        setTeamChecklist(teamChecklist.map((i) => i.id === item.id ? { ...i, text: teamChecklistEditText.trim() } : i));
                        setTeamChecklistEditId(null);
                      }
                      if (e.key === 'Escape') setTeamChecklistEditId(null);
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (teamChecklistEditText.trim()) {
                        setTeamChecklist(teamChecklist.map((i) => i.id === item.id ? { ...i, text: teamChecklistEditText.trim() } : i));
                      }
                      setTeamChecklistEditId(null);
                    }}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={() => setTeamChecklistEditId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
              );
            }
            return (
              <div key={item.id} className="flex items-center gap-3 group rounded-lg px-3 py-2 hover:bg-gray-50 -mx-3">
                <span className="flex-1 text-sm text-gray-700">{item.text}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { setTeamChecklistEditId(item.id); setTeamChecklistEditText(item.text); }}
                    className="p-1 rounded text-gray-300 hover:text-blue-500 cursor-pointer"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setTeamChecklist(teamChecklist.filter((i) => i.id !== item.id))}
                    className="p-1 rounded text-gray-300 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!teamChecklistAddText.trim()) return;
            setTeamChecklist([...teamChecklist, { id: genId(), text: teamChecklistAddText.trim() }]);
            setTeamChecklistAddText('');
          }}
          className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-3"
        >
          <input
            type="text"
            value={teamChecklistAddText}
            onChange={(e) => setTeamChecklistAddText(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            placeholder="Add checklist item..."
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add
          </button>
        </form>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Announcements</h2>
          </div>
          {!showAnnouncementForm && (
            <button
              onClick={() => setShowAnnouncementForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Plus size={16} />
              New
            </button>
          )}
        </div>

        {showAnnouncementForm && (
          <form onSubmit={handlePostAnnouncement} className="space-y-4 mb-6 pb-6 border-b border-gray-100">
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

        {announcements.length === 0 ? (
          <p className="text-gray-400 text-sm">No announcements yet</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 group ${
                  a.priority === 'high' ? 'border-red-200 bg-red-50/50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">{a.title}</h3>
                      {a.priority === 'high' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">HIGH</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{a.message}</p>
                    <p className="text-gray-400 text-[11px] mt-1.5">{a.postedBy} &middot; {a.date}</p>
                  </div>
                  <button
                    onClick={() => handleArchiveAnnouncement(a.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {archivedAnnouncements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowArchivedAnnouncements((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showArchivedAnnouncements ? '' : '-rotate-90'}`}
              />
              {archivedAnnouncements.length} archived
            </button>
            {showArchivedAnnouncements && (
              <div className="space-y-3 mt-3">
                {archivedAnnouncements.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 group opacity-60 ${
                      a.priority === 'high' ? 'border-red-200 bg-red-50/50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">{a.title}</h3>
                          {a.priority === 'high' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">HIGH</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{a.message}</p>
                        <p className="text-gray-400 text-[11px] mt-1.5">{a.postedBy} &middot; {a.date}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleRestoreAnnouncement(a.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Restore"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handlePermanentlyDeleteAnnouncement(a.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Team Ideas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">New Team Ideas</h2>
        </div>
        {newSuggestions.length === 0 ? (
          <p className="text-gray-400 text-sm">No new ideas to review</p>
        ) : (
          <div className="space-y-4">
            {newSuggestions.map((idea) => (
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
          onClick={() => onNavigate('ideas')}
          className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
        >
          View All Ideas &rarr;
        </button>
      </div>

      {/* Equipment Maintenance Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={20} className="text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">Equipment Maintenance Log</h2>
        </div>
        {equipmentRepairLog.length === 0 ? (
          <p className="text-gray-400 text-sm">No repair history yet</p>
        ) : (
          <>
            <div className="space-y-3">
              {(showRepairLog ? equipmentRepairLog : equipmentRepairLog.slice(0, 3)).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-gray-400" />
                      <h3 className="font-bold text-gray-900 text-sm">{entry.equipmentName}</h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        entry.urgency === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {entry.urgency === 'critical' ? 'CRITICAL' : 'MAINTENANCE'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{entry.issue}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span>Reported: {entry.reportedDate}</span>
                    <span>Fixed: {entry.repairedDate}</span>
                    <span>By: {entry.reportedBy}</span>
                  </div>
                </div>
              ))}
            </div>
            {equipmentRepairLog.length > 3 && (
              <button
                onClick={() => setShowRepairLog((v) => !v)}
                className="mt-4 text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
              >
                {showRepairLog ? 'Show Less' : `Show All ${equipmentRepairLog.length} Repairs`}
              </button>
            )}
            {(() => {
              const counts = {};
              equipmentRepairLog.forEach((e) => { counts[e.equipmentName] = (counts[e.equipmentName] || 0) + 1; });
              const recurring = Object.entries(counts).filter(([, c]) => c >= 2);
              if (recurring.length === 0) return null;
              return (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <h4 className="font-semibold text-amber-800 text-sm">Recurring Issues</h4>
                  </div>
                  <ul className="space-y-1">
                    {recurring.map(([name, count]) => (
                      <li key={name} className="text-sm text-amber-700">
                        {name} &mdash; {count} repairs logged
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </>
        )}
      </div>
      </>}

      {/* ── My Day ── */}
      <button
        onClick={() => setShowMyDay((v) => !v)}
        className="flex items-center gap-3 pt-4 w-full cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">My Day</h2>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <ChevronDown
          size={20}
          className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${showMyDay ? '' : '-rotate-90'}`}
        />
      </button>

      {showMyDay && <>
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
      </>}

      {/* ── Strategy ── */}
      <button
        onClick={() => setShowStrategy((v) => !v)}
        className="flex items-center gap-3 pt-4 w-full cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <Target size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">Strategy</h2>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <ChevronDown
          size={20}
          className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${showStrategy ? '' : '-rotate-90'}`}
        />
      </button>

      {showStrategy && <>
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
      </>}
    </div>
  );
}
