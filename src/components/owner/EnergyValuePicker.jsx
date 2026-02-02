import { Zap, DollarSign } from 'lucide-react';

const ENERGY_LABELS = ['', 'Draining', 'Tiring', 'Neutral', 'Enjoyable', 'Energizing'];
const VALUE_LABELS = ['', 'Minimal', 'Low', 'Moderate', 'High', 'Critical'];

const ENERGY_FILLS = [
  '',
  'bg-red-400',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-lime-400',
  'bg-emerald-400',
];

const VALUE_FILLS = [
  '',
  'bg-emerald-200',
  'bg-emerald-300',
  'bg-emerald-400',
  'bg-emerald-500',
  'bg-emerald-600',
];

export default function EnergyValuePicker({ variant, value, onChange }) {
  const isEnergy = variant === 'energy';
  const Icon = isEnergy ? Zap : DollarSign;
  const labels = isEnergy ? ENERGY_LABELS : VALUE_LABELS;
  const fills = isEnergy ? ENERGY_FILLS : VALUE_FILLS;
  const label = isEnergy ? 'Energy' : 'Value';

  return (
    <div>
      <label className="block text-sm font-semibold text-secondary mb-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={14} className={isEnergy ? 'text-amber-500' : 'text-emerald-600'} />
          {label}
        </span>
      </label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
              score <= value
                ? `${fills[score]} border-transparent text-white shadow-sm`
                : 'border-border-strong bg-card text-muted hover:border-border-brand'
            }`}
            title={labels[score]}
          >
            {score}
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs font-medium text-secondary ml-2">{labels[value]}</span>
        )}
      </div>
    </div>
  );
}
