import { useState } from 'react';
import { Megaphone, ChevronDown, ClipboardCheck } from 'lucide-react';

const startOfDayItems = [
  'Review daily route and job schedule',
  'Inspect and fuel all equipment',
  'Check oil levels and tire pressure',
  'Load trucks with correct supplies and materials',
  'Verify all PPE is available and in good condition',
  'Check weather forecast and adjust plans if needed',
  'Team huddle — review priorities and safety reminders',
];

const endOfDayItems = [
  'Clean all equipment and remove debris',
  'Inspect equipment for damage and report issues',
  'Refuel equipment for next day',
  'Secure all tools and lock storage',
  'Log completed jobs and note any client concerns',
  'Empty truck of trash and leftover materials',
  'Submit timesheet and mileage',
];

function ChecklistPanel({ title, items }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(() => Array(items.length).fill(false));

  const completedCount = checked.filter(Boolean).length;

  const toggle = (index) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-6 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 text-lg">{title}</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-3">
          {items.map((item, i) => (
            <label
              key={i}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="w-5 h-5 rounded accent-emerald-600 shrink-0"
              />
              <span
                className={`text-sm transition-colors duration-150 ${
                  checked[i] ? 'line-through text-gray-400' : 'text-gray-700'
                }`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home({ announcements }) {
  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-8 md:p-12 text-white mb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">🏡</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Welcome to GreenTeam Hub</h1>
            <p className="text-emerald-100 mt-1 text-lg">Your lawn care operations center</p>
          </div>
        </div>
        <p className="text-emerald-100 max-w-2xl">
          Access company standards, how-to guides, equipment resources, and HR policies all in one place.
          Stay informed with the latest announcements below.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Megaphone size={22} className="text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
      </div>

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
        <ChecklistPanel title="Start of Day" items={startOfDayItems} />
        <ChecklistPanel title="End of Day" items={endOfDayItems} />
      </div>
    </div>
  );
}
