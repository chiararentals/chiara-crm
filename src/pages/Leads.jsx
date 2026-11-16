import { useMemo, useRef, useState } from 'react';
import { Plus, Upload, Phone, Mail, MessageCircle, Pencil, Check, ChevronDown } from 'lucide-react';
import { actions, useData } from '../data';
import PageHeader from '../components/PageHeader';
import FirmBadge, { FirmFilter, firmCardStyle } from '../components/FirmBadge';
import { useFirm } from '../lib/firm';
import LeadForm from '../components/LeadForm';
import { TEMPERATURES, followUpState, nextDate, parseExcel, waLink } from '../lib/leads';
import { fmtShort, today, plusDays } from '../lib/dates';

function LeadCard({ lead, onEdit }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const state = followUpState(lead);
  const wa = waLink(lead.phone);
  const done = (days) => {
    actions.updateLead(lead.id, { lastContact: today(), followUpDate: nextDate(days) });
    setPicking(false);
  };
  const dateBadge = lead.followUpDate
    ? `${state === 'late' ? 'Kasni · ' : ''}${fmtShort(lead.followUpDate)}`
    : 'Bez datuma';
  return (
    <div className="rounded-xl border border-black/5 p-3.5 shadow-card" style={firmCardStyle(lead.firm)}>
      <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">{lead.name}</span>
            <span className={`badge ${TEMPERATURES[lead.temperature]?.badge}`}>{TEMPERATURES[lead.temperature]?.label}</span>
            <span className={`badge ${state === 'late' ? 'bg-red-100 text-red-700' : state === 'today' ? 'bg-gold/50 text-navy' : 'bg-black/5 text-soft'}`}>{dateBadge}</span>
          </div>
          {lead.wants && <div className="mt-1 line-clamp-2 text-xs text-soft">{lead.wants}</div>}
          {lead.nextStep && <div className="mt-1 text-xs font-semibold text-navy">→ {lead.nextStep}</div>}
        </div>
        <ChevronDown size={18} className={`mt-1 flex-none text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-mist pt-3 text-xs text-soft">
          <div className="flex flex-wrap gap-2">
            {lead.phone && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`tel:${lead.phone}`}><Phone size={14} /> {lead.phone}</a>}
            {wa && <a className="btn-outline !px-3 !py-1.5 text-xs" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
            {lead.email && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`mailto:${lead.email}`}><Mail size={14} /> {lead.email}</a>}
          </div>
          {[['Lokacija', lead.location], ['Tip', lead.type], ['Cijena', lead.priceRange], ['Izvor', lead.source], ['ID oglasa', lead.listingId],
            ['Jezik', lead.language], ['Prepreka', lead.obstacle], ['Zadnja komunikacija', lead.lastComm], ['Zadnji kontakt', lead.lastContact], ['Napomena', lead.notes]]
            .filter(([, v]) => v).map(([k, v]) => <div key={k}><b className="text-navy">{k}:</b> {v}</div>)}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!picking
              ? <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setPicking(true)}><Check size={14} /> Follow-up odrađen</button>
              : <>
                  <span className="font-semibold text-navy">Sljedeći follow-up za:</span>
                  {[[1, 'sutra'], [3, '3 dana'], [7, 'tjedan'], [14, '2 tjedna']].map(([d, l]) => (
                    <button key={d} className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => done(d)}>{l}</button>
                  ))}
                  <button className="text-mute underline" onClick={() => setPicking(false)}>odustani</button>
                </>}
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={onEdit}><Pencil size={14} /> Uredi</button>
          </div>
        </div>
      )}
    </div>
  );
}

const RANGES = {
  all: 'Svi datumi', late: 'Kasne', today: 'Danas', week: 'Ovih 7 dana', next7: 'Sljedećih 7 dana',
  month: 'Idući 30 dana', none: 'Bez datuma', custom: 'Odabrani raspon…',
};
function inRange(l, range, from, to) {
  const d = l.followUpDate;
  const t = today();
  switch (range) {
    case 'late': return d && d < t;
    case 'today': return d === t;
    case 'week': return d && d >= plusDays(t, -7) && d <= t;
    case 'next7': return d && d >= t && d <= plusDays(t, 7);
    case 'month': return d && d >= t && d <= plusDays(t, 30);
    case 'none': return !d;
    case 'custom': return d && (!from || d >= from) && (!to || d <= to);
    default: return true;
  }
}
const PAGE = 20;

const SECTIONS = [
  ['late', 'Kasne'], ['today', 'Danas'], ['soon', 'Uskoro'], ['none', 'Bez datuma'],
];

export default function Leads() {
  const { leads } = useData();
  const [form, setForm] = useState(null);
  const [firm] = useFirm();
  const [range, setRange] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limits, setLimits] = useState({});
  const [temp, setTemp] = useState('');
  const [q, setQ] = useState('');
  const [importFirm, setImportFirm] = useState('dux');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads
      .filter((l) => !firm || l.firm === firm)
      .filter((l) => !temp || l.temperature === temp)
      .filter((l) => inRange(l, range, from, to))
      .filter((l) => !needle || [l.name, l.email, l.phone, l.wants, l.location].some((v) => (v || '').toLowerCase().includes(needle)))
      .sort((a, b) => (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999') || (a.temperature === 'vruc' ? -1 : 1));
  }, [leads, firm, temp, q, range, from, to]);
  const counts = Object.fromEntries(['chiara', 'bonvia', 'dux'].map((k) => [k, leads.filter((l) => l.firm === k).length]));
  const lateCount = leads.filter((l) => followUpState(l) === 'late').length;
  const todayCount = leads.filter((l) => followUpState(l) === 'today').length;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const list = await parseExcel(file, importFirm);
      const hot = list.filter((l) => l.temperature === 'vruc').length;
      if (!list.length) { setMsg('U tablici nema vrućih ni toplih kupaca.'); return; }
      if (!confirm(`Uvesti ${list.length} kupaca (${hot} vrućih, ${list.length - hot} toplih) u firmu ${importFirm === 'dux' ? 'Dux' : importFirm === 'bonvia' ? 'Bonvia' : 'Chiara'}?\nKupci koji već postoje (isti email) bit će ažurirani.`)) return;
      const r = actions.importLeads(list);
      setMsg(`Uvezeno: ${r.added} novih, ${r.updated} ažuriranih.`);
    } catch (err) {
      setMsg(`Uvoz nije uspio: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader title="Kupci i leadovi"
        subtitle={`${leads.length} kupaca · ${lateCount} kasni · ${todayCount} za danas`}>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field !w-auto !py-2 text-sm" value={importFirm} onChange={(e) => setImportFirm(e.target.value)} aria-label="Firma za uvoz">
            <option value="dux">Uvoz u: Dux</option><option value="bonvia">Uvoz u: Bonvia</option><option value="chiara">Uvoz u: Chiara</option>
          </select>
          <button className="btn-outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Uvoz iz Excela</button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} />
          <button className="btn-primary" onClick={() => setForm({})}><Plus size={18} /> Novi kupac</button>
        </div>
      </PageHeader>

      {msg && <div className="card mb-4 p-3 text-sm text-soft">{msg}</div>}

      <div className="mb-3"><FirmFilter counts={counts} /></div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {Object.entries(TEMPERATURES).map(([k, v]) => (
          <button key={k} onClick={() => setTemp(temp === k ? '' : k)} className={temp === k ? 'btn-primary' : 'btn-outline'}>{v.label}</button>
        ))}
        <select className="field !w-auto !py-2 text-sm" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Follow-up datum">
          {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>Follow-up: {v}</option>)}
        </select>
        {range === 'custom' && (
          <>
            <input type="date" className="field !w-auto !py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Od datuma" />
            <span className="text-mute">–</span>
            <input type="date" className="field !w-auto !py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Do datuma" />
          </>
        )}
        <input className="field !w-auto min-w-[10rem] flex-1 !py-2 text-sm" placeholder="Traži ime, email, telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!filtered.length && <div className="card p-5 text-sm text-soft">Nema kupaca. Dodaj ih ručno ili uvezi Excel tablicu.</div>}
      {SECTIONS.map(([st, title]) => {
        const list = filtered.filter((l) => followUpState(l) === st);
        if (!list.length) return null;
        return (
          <section key={st} className="mb-7">
            <h2 className="mb-3 text-xl font-semibold">{title} <span className="badge bg-ink text-white">{list.length}</span></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {list.slice(0, limits[st] || PAGE).map((l) => <LeadCard key={l.id} lead={l} onEdit={() => setForm(l)} />)}
            </div>
            {list.length > (limits[st] || PAGE) && (
              <button className="btn-outline mt-3" onClick={() => setLimits({ ...limits, [st]: (limits[st] || PAGE) + 40 })}>
                Prikaži još ({list.length - (limits[st] || PAGE)})
              </button>
            )}
          </section>
        );
      })}

      {form && <LeadForm lead={form.id ? form : undefined} onClose={() => setForm(null)} />}
    </>
  );
}
