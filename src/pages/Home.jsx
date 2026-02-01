import { Megaphone, ChevronRight, ClipboardCheck, AlertCircle, Lightbulb } from 'lucide-react';
import ChecklistPanel from '../components/ChecklistPanel';

const endOfDayItems = [
  'Clean all equipment and remove debris',
  'Inspect equipment for damage and report issues',
  'Refuel equipment for next day',
  'Secure all tools and lock storage',
  'Log completed jobs and note any client concerns',
  'Empty truck of trash and leftover materials',
  'Submit timesheet and mileage',
];

export default function Home({ announcements, onNavigate, teamChecklist }) {
  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-8 md:p-12 text-white mb-8">
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">Welcome to HQ</h1>
          <p className="text-emerald-100 mt-1 text-lg">Your lawn care operations center</p>
        </div>
        <p className="text-emerald-100 max-w-2xl">
          Access company playbooks, standards, and HR policies all in one place.
        </p>
        <p className="text-white font-semibold mt-4 text-lg">
          Review announcements, run through your checklist, and head to Jobber — every shift, every time.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Megaphone size={22} className="text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
      </div>

      {announcements.length === 0 && (
        <p className="text-gray-400 text-sm mb-6">No announcements right now.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl border p-6 ${
              a.priority === 'high'
                ? 'border-red-200 bg-red-50/50'
                : 'border-gray-100 bg-white'
            } shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-gray-900">{a.title}</h3>
              {a.priority === 'high' && (
                <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  HIGH
                </span>
              )}
              {a.priority === 'normal' && (
                <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  NORMAL
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{a.message}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Posted by {a.postedBy}</span>
              <span>{a.date}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6 mt-10">
        <ClipboardCheck size={22} className="text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Daily Checklists</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChecklistPanel title="Start of Day" items={teamChecklist} />
        <ChecklistPanel title="End of Day" items={endOfDayItems} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <a
          href="http://heyjudeslawncare.com/app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white hover:opacity-90 transition-opacity"
        >
          <div>
            <h3 className="text-lg font-bold">Open Jobber</h3>
            <p className="text-sm text-white/80 mt-1">View today's schedule and jobs</p>
          </div>
          <ChevronRight size={24} />
        </a>
        <button
          onClick={() => onNavigate('equipment')}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-left hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div>
            <h3 className="text-lg font-bold">Report Issue</h3>
            <p className="text-sm text-white/80 mt-1">Equipment needs repair</p>
          </div>
          <AlertCircle size={24} />
        </button>
        <button
          onClick={() => onNavigate('ideas')}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 p-6 text-white text-left hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div>
            <h3 className="text-lg font-bold">Submit Idea</h3>
            <p className="text-sm text-white/80 mt-1">Suggest an improvement</p>
          </div>
          <Lightbulb size={24} />
        </button>
      </div>
    </div>
  );
}
