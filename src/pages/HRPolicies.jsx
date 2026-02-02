import { useState } from 'react';
import { ChevronRight, X, Calendar, Plus, Pencil, Trash2, Search } from 'lucide-react';
import ViewModal from '../components/ViewModal';
import EditModal from '../components/EditModal';
import { genId } from '../data';
import { useAppStore } from '../store/AppStoreContext';
import { useAuth } from '../contexts/AuthContext';

const POLICY_CATEGORIES = ['Compensation', 'Time Off', 'Onboarding', 'Conduct', 'Training', 'Hiring'];

export default function HRPolicies() {
  const { ownerMode, currentUser } = useAuth();
  const items = useAppStore((s) => s.policies);
  const setItems = useAppStore((s) => s.setPolicies);
  const timeOffRequests = useAppStore((s) => s.timeOffRequests);
  const setTimeOffRequests = useAppStore((s) => s.setTimeOffRequests);

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addingPolicy, setAddingPolicy] = useState(false);
  const [requestingOff, setRequestingOff] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [search, setSearch] = useState('');

  const isOwner = ownerMode;
  const pendingCount = isOwner ? timeOffRequests.filter((r) => r.status === 'pending').length : 0;
  const approvedCount = isOwner ? timeOffRequests.filter((r) => r.status === 'approved').length : 0;

  const handleApprove = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
  };

  const handleDeny = (id) => {
    setTimeOffRequests(timeOffRequests.map((r) => (r.id === id ? { ...r, status: 'denied' } : r)));
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const start = new Date(form.startDate + 'T00:00');
    const end = new Date(form.endDate + 'T00:00');
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const today = new Date().toLocaleDateString('en-US');
    setTimeOffRequests([
      ...timeOffRequests,
      {
        id: genId(),
        name: currentUser,
        startDate: start.toLocaleDateString('en-US'),
        endDate: end.toLocaleDateString('en-US'),
        days,
        reason: form.reason,
        requestedDate: today,
        status: 'pending',
      },
    ]);
    setForm({ startDate: '', endDate: '', reason: '' });
    setRequestingOff(false);
  };

  const handleSavePolicy = (form) => {
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...i, ...form, summary: form.content.slice(0, 80) + '...' } : i)));
    } else {
      setItems([...items, { id: genId(), ...form, summary: form.content.slice(0, 80) + '...' }]);
    }
    setEditing(null);
    setAddingPolicy(false);
  };

  const handleDeletePolicy = (item) => {
    if (confirm(`Delete "${item.title}"?`)) {
      setItems(items.filter((i) => i.id !== item.id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">HR &amp; Policies</h1>
          <p className="text-tertiary mt-1">Employee handbook, time off, schedules</p>
        </div>
        <button
          onClick={() => setRequestingOff(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-on-brand text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
        >
          <Calendar size={16} />
          Request Time Off
        </button>
      </div>

      {/* Info Cards */}
      {isOwner && (
        <div className="mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 p-6 text-white">
            <h3 className="font-bold text-lg">Time Off Overview</h3>
            <p className="text-white/80 text-sm mt-1">{pendingCount} pending</p>
            <p className="text-2xl font-bold mt-1">{approvedCount} approved</p>
          </div>
        </div>
      )}

      {/* Time Off Requests - Owner Only */}
      {isOwner && (
        <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-6 mb-8">
          <h2 className="text-xl font-bold text-primary mb-6">Time Off Requests</h2>
          <div className="space-y-4">
            {timeOffRequests.length === 0 && (
              <p className="text-muted text-sm">No time off requests yet.</p>
            )}
            {timeOffRequests.map((req) => (
              <div
                key={req.id}
                className={`rounded-xl border-l-4 p-5 ${
                  req.status === 'pending'
                    ? 'border-l-amber-400 bg-amber-50/50 border border-amber-200'
                    : req.status === 'approved'
                    ? 'border-l-emerald-400 bg-emerald-50/30 border border-emerald-200'
                    : 'border-l-red-400 bg-red-50/30 border border-red-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-primary">{req.name}</h3>
                    <p className="text-sm text-secondary mt-0.5">
                      {req.startDate} - {req.endDate} ({req.days} day{req.days > 1 ? 's' : ''})
                    </p>
                    <p className="text-sm text-tertiary mt-1">Reason: {req.reason}</p>
                    <p className="text-xs text-muted mt-1">Requested: {req.requestedDate}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      req.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {req.status.toUpperCase()}
                  </span>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-2.5 rounded-lg bg-brand text-on-brand font-semibold text-sm hover:bg-brand-hover transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(req.id)}
                      className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Handbook */}
      <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-primary">Employee Handbook</h2>
          {ownerMode && (
            <button
              onClick={() => setAddingPolicy(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-on-brand font-medium text-sm hover:bg-brand-hover transition-colors"
            >
              <Plus size={16} /> Add Policy
            </button>
          )}
        </div>
        <p className="text-tertiary text-sm mb-4">Review company policies and procedures</p>
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies..."
            className="w-full rounded-xl border border-border-default bg-card pl-10 pr-4 py-2.5 text-sm text-primary placeholder-placeholder-muted focus:ring-2 focus:ring-ring-brand focus:border-border-brand outline-none transition"
          />
        </div>
        {(() => {
          const q = search.toLowerCase().trim();
          const filtered = q
            ? items.filter((i) => i.title?.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q))
            : items;
          if (filtered.length === 0) return <p className="text-muted text-sm">{q ? 'No policies match your search.' : 'No policies yet.'}</p>;
          return (<div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-start justify-between rounded-xl border border-border-subtle p-5 hover:shadow-md hover:border-border-default transition-all cursor-pointer"
              onClick={() => setViewing(item)}
            >
              <div>
                <h3 className="font-bold text-primary">{item.title}</h3>
                <p className="text-sm text-tertiary mt-1">{item.summary}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {ownerMode && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(item); }}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePolicy(item); }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <ChevronRight size={20} className="text-muted" />
              </div>
            </div>
          ))}
        </div>);
        })()}
      </div>

      {viewing && <ViewModal item={viewing} onClose={() => setViewing(null)} />}

      {(editing || addingPolicy) && (
        <EditModal
          item={editing}
          categories={POLICY_CATEGORIES}
          title="Policy"
          richText
          onSave={handleSavePolicy}
          onClose={() => { setEditing(null); setAddingPolicy(false); }}
        />
      )}

      {requestingOff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRequestingOff(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 px-8 py-6 relative">
              <button
                onClick={() => setRequestingOff(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white">Request Time Off</h2>
            </div>
            <form onSubmit={handleRequestSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-ring-brand focus:border-border-brand outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-ring-brand focus:border-border-brand outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-primary focus:ring-2 focus:ring-ring-brand focus:border-border-brand outline-none transition"
                  placeholder="e.g. Family vacation, doctor appointment..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Requested by</label>
                <input
                  type="text"
                  value={currentUser}
                  readOnly
                  className="w-full rounded-lg border border-border-default px-4 py-2.5 text-tertiary bg-surface cursor-not-allowed"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRequestingOff(false)}
                  className="px-5 py-2.5 rounded-lg border border-border-strong text-secondary font-medium hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-brand text-on-brand font-medium hover:bg-brand-hover transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
