import { FIRMS } from '../seed';
import { useFirm } from '../lib/firm';

// Boja kartice po firmi: prozirna podloga + traka s lijeve strane
export const firmCardStyle = (firm) => {
  const f = FIRMS[firm];
  return f ? { background: `${f.color}1F`, borderLeft: `4px solid ${f.color}` } : { borderLeft: '4px solid transparent' };
};

// Meka oznaka firme: točkica + ime
export default function FirmBadge({ firm, className = '' }) {
  const f = FIRMS[firm];
  if (!f) return null;
  return (
    <span className={`badge ${className}`} style={{ background: `${f.color}2E`, color: f.ink }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.color }} />{f.name}
    </span>
  );
}

// Izbor firme u obrascima – tri obojena gumba
export function FirmPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(FIRMS).map(([k, f]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
          style={value === k ? { background: f.color, color: f.text, borderColor: f.color } : { borderColor: `${f.color}88`, color: f.ink }}>
          {f.name}
        </button>
      ))}
    </div>
  );
}

// Filter firme na stranicama (isti kao izbornik gore). `counts` = broj stavki po firmi.
export function FirmFilter({ counts }) {
  const [firm, setFirm] = useFirm();
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const chip = (key, label, color, ink, n) => {
    const active = firm === key;
    return (
      <button key={key || 'sve'} onClick={() => setFirm(active && key ? '' : key)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
        style={active
          ? { background: color || '#262A31', borderColor: color || '#262A31', color: key ? FIRMS[key].text : '#fff' }
          : { background: color ? `${color}1F` : '#fff', borderColor: color ? `${color}66` : 'rgba(0,0,0,.12)', color: ink || '#1F2328' }}>
        {label}{n != null && <span className="rounded-full bg-black/10 px-1.5 text-xs">{n}</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {chip('', 'Sve', null, null, total)}
      {Object.entries(FIRMS).map(([k, f]) => chip(k, f.name, f.color, f.ink, counts ? counts[k] ?? 0 : null))}
    </div>
  );
}
