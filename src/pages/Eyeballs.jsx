import { useMemo, useState } from 'react';
import { Eye, Search, MapPin, Phone, Navigation, MessageSquare, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

const RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '28d', label: '28 days', days: 28 },
  { id: '90d', label: '90 days', days: 90 },
];

// Mock data. Will be replaced by live connectors (GBP first).
// Shape is what each connector should return so the page renders the same way.
const MOCK = {
  '7d': {
    funnel: [
      { id: 'impressions', label: 'Impressions', value: 1842, prev: 1610, source: 'Google Business Profile' },
      { id: 'profileViews', label: 'Profile Views', value: 312, prev: 280, source: 'Google Business Profile' },
      { id: 'actions', label: 'Actions (call/direction/site)', value: 47, prev: 39, source: 'Google Business Profile' },
      { id: 'requests', label: 'Requests', value: 6, prev: 4, source: 'Jobber' },
      { id: 'booked', label: 'Booked Jobs', value: 2, prev: 1, source: 'Jobber' },
      { id: 'revenue', label: 'Revenue', value: 320, prev: 160, source: 'Jobber', isMoney: true },
    ],
    gbpBreakdown: [
      { id: 'search', label: 'From Google Search', icon: Search, value: 1124, prev: 980 },
      { id: 'maps', label: 'From Google Maps', icon: MapPin, value: 718, prev: 630 },
      { id: 'calls', label: 'Phone Calls', icon: Phone, value: 11, prev: 8 },
      { id: 'directions', label: 'Directions Requests', icon: Navigation, value: 19, prev: 15 },
      { id: 'website', label: 'Website Clicks', icon: ExternalLink, value: 17, prev: 16 },
      { id: 'messages', label: 'Messages', icon: MessageSquare, value: 3, prev: 2 },
    ],
  },
};

function pctDelta(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function fmt(n, isMoney) {
  if (n == null) return '—';
  if (isMoney) return `$${n.toLocaleString()}`;
  return n.toLocaleString();
}

function Delta({ curr, prev }) {
  const d = pctDelta(curr, prev);
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const color = d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-tertiary';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      <Icon size={12} />
      {d > 0 ? '+' : ''}{d}%
    </span>
  );
}

function FunnelRow({ step, total }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((step.value / total) * 100));
  return (
    <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-4 sm:p-5">
      <div
        className="absolute inset-y-0 left-0 bg-surface-alt"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">{step.source}</p>
          <p className="text-base sm:text-lg font-black text-primary truncate">{step.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl sm:text-3xl font-black text-primary leading-none">{fmt(step.value, step.isMoney)}</p>
          <div className="mt-1"><Delta curr={step.value} prev={step.prev} /></div>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ row }) {
  const Icon = row.icon;
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-surface-alt border border-card-border flex items-center justify-center text-primary">
          <Icon size={18} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">{row.label}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-4xl font-black text-primary leading-none">{fmt(row.value)}</p>
        <Delta curr={row.value} prev={row.prev} />
      </div>
    </div>
  );
}

export default function Eyeballs() {
  const [range, setRange] = useState('7d');
  const data = MOCK[range] || MOCK['7d'];
  const top = data.funnel[0]?.value || 0;

  const conversionLine = useMemo(() => {
    const imp = data.funnel.find((f) => f.id === 'impressions')?.value || 0;
    const booked = data.funnel.find((f) => f.id === 'booked')?.value || 0;
    if (!imp || !booked) return null;
    const ratio = (booked / imp) * 100;
    return `${ratio.toFixed(2)}% of impressions become booked jobs`;
  }, [data]);

  return (
    <div className="pb-16 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface-alt border border-card-border flex items-center justify-center text-primary">
              <Eye size={22} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-primary">Eyeballs</h1>
              <p className="text-sm text-tertiary font-semibold">Every view, click, and call — turned into dollars.</p>
            </div>
          </div>
        </div>
        <div className="inline-flex rounded-2xl border border-card-border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 sm:px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer ${
                range === r.id ? 'bg-primary text-card' : 'text-tertiary hover:text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mock banner */}
      <div className="rounded-2xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 font-semibold">
        Sample data — Google Business Profile connector lands next so these numbers go live.
      </div>

      {/* Funnel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-tertiary">Attention → Revenue</h2>
          {conversionLine && <p className="text-xs font-bold text-tertiary">{conversionLine}</p>}
        </div>
        <div className="space-y-2">
          {data.funnel.map((step) => (
            <FunnelRow key={step.id} step={step} total={top} />
          ))}
        </div>
      </section>

      {/* GBP Breakdown */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-tertiary mb-3">Google Business Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.gbpBreakdown.map((row) => (
            <BreakdownCard key={row.id} row={row} />
          ))}
        </div>
      </section>

      {/* Next-up */}
      <section className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-tertiary mb-3">Channels to wire next</h2>
        <ul className="space-y-2 text-sm font-semibold text-primary">
          <li>✅ Jobber (already connected — requests + booked jobs)</li>
          <li>⏳ Google Business Profile (impressions, searches, calls, directions)</li>
          <li>○ Website analytics (when site is live)</li>
          <li>○ Instagram / TikTok (when posting starts)</li>
        </ul>
      </section>
    </div>
  );
}
