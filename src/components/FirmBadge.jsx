import { FIRMS } from '../seed';

// Obojena oznaka firme (Chiara / Bonvia / Dux)
export default function FirmBadge({ firm, className = '' }) {
  const f = FIRMS[firm];
  if (!f) return null;
  return <span className={`badge ${className}`} style={{ background: f.color, color: f.text }}>{f.name}</span>;
}

// Izbor firme – tri obojena gumba
export function FirmPicker({ value, onChange, allowNone = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowNone && (
        <button type="button" onClick={() => onChange('')}
          className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${!value ? 'border-navy bg-navy text-white' : 'border-mute/40 text-soft'}`}>Sve</button>
      )}
      {Object.entries(FIRMS).map(([k, f]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
          style={value === k ? { background: f.color, color: f.text, borderColor: f.color } : { borderColor: f.color, color: 'inherit' }}>
          {f.name}
        </button>
      ))}
    </div>
  );
}
