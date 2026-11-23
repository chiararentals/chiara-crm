import { fmtDate } from '../lib/dates';
import { plannedIds, viewedTotal, leadKind, contractState } from '../lib/leads';

// 4 ključna odgovora o kupcu: što je poslano, kad dolazi, koliko je pogledao, što je izabrao
export default function LeadFacts({ lead }) {
  if (leadKind(lead) === 'najmoprimac') {
    const cell = (label, value) => (
      <div className="min-w-0 rounded-lg bg-white/70 px-2.5 py-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-mute">{label}</div>
        <div className={`line-clamp-2 text-xs font-semibold ${value ? 'text-navy' : 'text-mute'}`}>{value || '—'}</div>
      </div>
    );
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {cell('Budžet', lead.priceRange)}
        {cell('Useljenje od', lead.moveInDate ? fmtDate(lead.moveInDate) : null)}
        {cell('Osoba', lead.people)}
        {cell('Ljubimci', lead.pets)}
      </div>
    );
  }
  if (leadKind(lead) !== 'kupac') {
    const c = contractState(lead);
    const cell = (label, value, warn) => (
      <div className="min-w-0 rounded-lg bg-white/70 px-2.5 py-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-mute">{label}</div>
        <div className={`line-clamp-2 text-xs font-semibold ${warn ? 'text-red-700' : value ? 'text-navy' : 'text-mute'}`}>{value || '—'}</div>
      </div>
    );
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {cell('Nekretnina', lead.propertyName)}
        {cell('Tražena cijena', lead.askingPrice)}
        {cell('Ugovor potpisan', lead.contractSigned ? fmtDate(lead.contractSigned) : null)}
        {cell('Ugovor vrijedi do', lead.contractUntil ? `${fmtDate(lead.contractUntil)}${c?.state === 'expired' ? ' (istekao)' : c?.state === 'soon' ? ` (za ${c.days} d)` : ''}` : null, c?.state === 'expired' || c?.state === 'soon')}
      </div>
    );
  }
  const hasData = lead.contacts?.length > 0;
  const arrival = lead.arrivalDate ? fmtDate(lead.arrivalDate) : lead.arrivalNote || (hasData ? 'još ne zna' : null);
  const planned = plannedIds(lead);
  const cell = (label, value) => (
    <div className="min-w-0 rounded-lg bg-white/70 px-2.5 py-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-mute">{label}</div>
      <div className={`line-clamp-2 text-xs font-semibold ${value ? 'text-navy' : 'text-mute'}`}>{value || '—'}</div>
    </div>
  );
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {cell('Zadnje poslano', lead.lastSent || null)}
      {cell('Dolazi u HR', arrival)}
      {cell('Pogledao', hasData || lead.viewedManual ? `${viewedTotal(lead)} nekretnina` : null)}
      {cell('Izabrano za gledanje', planned.length ? planned.join(', ') : hasData ? 'nije izabrao' : null)}
    </div>
  );
}
