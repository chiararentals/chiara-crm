import { fmtDate } from '../lib/dates';
import { plannedIds, viewedTotal } from '../lib/leads';

// 4 ključna odgovora o kupcu: što je poslano, kad dolazi, koliko je pogledao, što je izabrao
export default function LeadFacts({ lead }) {
  const arrival = lead.arrivalDate ? fmtDate(lead.arrivalDate) : lead.contacts?.length ? (lead.arrivalNote || 'još ne zna') : null;
  const planned = plannedIds(lead);
  const hasData = lead.contacts?.length > 0;
  const cell = (label, value) => (
    <div className="min-w-0 rounded-lg bg-white/70 px-2.5 py-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-mute">{label}</div>
      <div className={`line-clamp-2 text-xs font-semibold ${value ? 'text-navy' : 'text-mute'}`}>{value || '—'}</div>
    </div>
  );
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {cell('Zadnje poslano', hasData ? lead.lastSent : null)}
      {cell('Dolazi u HR', arrival)}
      {cell('Pogledao', hasData || lead.viewedManual ? `${viewedTotal(lead)} nekretnina` : null)}
      {cell('Izabrano za gledanje', hasData ? (planned.length ? planned.join(', ') : 'nije izabrao') : null)}
    </div>
  );
}
