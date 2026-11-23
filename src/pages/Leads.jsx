import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Download, CalendarDays, Phone, Mail, MessageCircle, Pencil, Check, ChevronDown, Eye, ClipboardEdit } from 'lucide-react';
import { actions, useData } from '../data';
import PageHeader from '../components/PageHeader';
import FirmBadge, { FirmFilter, firmCardStyle } from '../components/FirmBadge';
import { useFirm } from '../lib/firm';
import LeadForm from '../components/LeadForm';
import LeadFacts from '../components/LeadFacts';
import LeadDetail from '../components/LeadDetail';
import ContactDialog from '../components/ContactDialog';
import ContactsCalendar from '../components/ContactsCalendar';
import CleanupDialog from '../components/CleanupDialog';
import { exportLeads } from '../lib/exportLeads';
import { TEMPERATURES, KINDS, followUpState, parseExcelAll, waLink, leadOwner, lateLeads, leadKind, isHidden, contractState } from '../lib/leads';
import { fmtShort, today, plusDays } from '../lib/dates';
import { TEAM } from '../seed';

function LeadCard({ lead, onEdit, onDetail, onContact, onData }) {
  const [open, setOpen] = useState(false);
  const state = followUpState(lead);
  const wa = waLink(lead.phone);
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
            {lead.review && <span className="badge bg-gold text-navy">Novo – provjeri</span>}
            {lead.factsPending && <span className="badge bg-navy/10 text-navy">Dopuni podatke</span>}
            {leadKind(lead) !== 'kupac' && <span className="badge bg-navy text-white">{KINDS[leadKind(lead)]}</span>}
            {contractState(lead)?.state === 'expired' && <span className="badge bg-red-600 text-white">Ugovor istekao</span>}
            {contractState(lead)?.state === 'soon' && <span className="badge bg-gold text-navy">Ugovor ističe za {contractState(lead).days} d</span>}
            <span className="text-[11px] text-mute">{leadOwner(lead)}</span>
          </div>
          {lead.wants && <div className="mt-1 line-clamp-2 text-xs text-soft">{lead.wants}</div>}
          {lead.nextStep && <div className="mt-1 text-xs font-semibold text-navy">→ {lead.nextStep}</div>}
        </div>
        <ChevronDown size={18} className={`mt-1 flex-none text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <LeadFacts lead={lead} />

      {open && (
        <div className="mt-3 space-y-2 border-t border-mist pt-3 text-xs text-soft">
          <div className="flex flex-wrap gap-2">
            {lead.phone && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`tel:${lead.phone}`}><Phone size={14} /> {lead.phone}</a>}
            {wa && <a className="btn-outline !px-3 !py-1.5 text-xs" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
            {lead.email && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`mailto:${lead.email}`}><Mail size={14} /> {lead.email}</a>}
          </div>
          {[['Lokacija', lead.location], ['Tip', lead.type], ['Cijena', lead.priceRange], ['Izvor', lead.source], ['ID oglasa', lead.listingId], ['Oglas', lead.listingTitle],
            ['Jezik', lead.language], ['Prepreka', lead.obstacle], ['Zadnja komunikacija', lead.lastComm], ['Zadnji kontakt', lead.lastContact], ['Napomena', lead.notes]]
            .filter(([, v]) => v).map(([k, v]) => <div key={k}><b className="text-navy">{k}:</b> {v}</div>)}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-mist pt-3">
        {lead.review && <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => actions.updateLead(lead.id, { review: false })}><Check size={14} /> Podaci su točni</button>}
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => onContact(lead)}><Check size={14} /> Follow-up odrađen</button>
        <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => onDetail(lead.id)}><Eye size={14} /> Detalji i povijest</button>
        {leadKind(lead) === 'kupac' && <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => onData(lead)}><ClipboardEdit size={14} /> Samo upiši podatke</button>}
        <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={onEdit}><Pencil size={14} /> Uredi</button>
      </div>
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

// Novi upiti iz maila (review) idu na sam vrh, najnoviji prvi; ostali su po roku follow-upa
const SECTIONS = [
  ['review', 'Novi upiti – provjeri'], ['late', 'Kasne'], ['today', 'Danas'], ['soon', 'Uskoro'], ['none', 'Bez datuma'], ['closed', 'Zatvoreno (kupio / odustao)'],
];

function SuggestionCard({ lead }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-3.5 shadow-card">
      <div className="text-sm font-semibold">{lead.name}</div>
      <div className="text-xs text-soft">{lead.email}{lead.language ? ` · ${lead.language}` : ''}</div>
      {lead.suggestSubject && <div className="mt-1 line-clamp-2 text-xs text-soft">„{lead.suggestSubject}”</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => actions.acceptSuggestion(lead.id, 'kupac')}>Dodaj kao kupca</button>
        <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => actions.acceptSuggestion(lead.id, 'vlasnik')}>Dodaj kao vlasnika</button>
        <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => actions.acceptSuggestion(lead.id, 'najmoprimac')}>Dodaj kao najmoprimca</button>
        <button className="text-xs text-mute underline" onClick={() => actions.ignoreSuggestion(lead.id)}>Ignoriraj</button>
      </div>
    </div>
  );
}

// mode: 'kupci' (kupci i ostali kontakti) | 'vlasnici' (prodavatelji i najmodavci) | 'najmoprimci'
const MODE_KIND = { vlasnici: 'vlasnik', najmoprimci: 'najmoprimac' };
const MODE_TEXT = {
  kupci: { title: 'Kupci i leadovi', noun: 'kontakata', add: 'Novi kupac' },
  vlasnici: { title: 'Vlasnici', noun: 'vlasnika', add: 'Novi vlasnik', empty: 'Još nema vlasnika. Dodajte ih gumbom „Novi vlasnik” ili iz prijedloga na stranici Kupci.' },
  najmoprimci: { title: 'Najmoprimci', noun: 'najmoprimaca', add: 'Novi najmoprimac', empty: 'Još nema najmoprimaca. Dodajte ih gumbom „Novi najmoprimac” ili iz prijedloga na stranici Kupci.' },
};
export default function Leads({ mode = 'kupci' }) {
  const { leads: allLeads } = useData();
  const owners = mode !== 'kupci'; // posebne stranice (vlasnici, najmoprimci)
  const text = MODE_TEXT[mode];
  const leads = useMemo(
    () => allLeads.filter((l) => !isHidden(l) && (owners ? leadKind(l) === MODE_KIND[mode] : !['vlasnik', 'najmoprimac'].includes(leadKind(l)))),
    [allLeads, owners, mode]
  );
  const suggestions = owners ? [] : allLeads.filter((l) => l.suggestion);
  const [kind, setKind] = useState('');
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
  const [detail, setDetail] = useState(null);
  const [contact, setContact] = useState(null);
  const [dataFor, setDataFor] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [owner, setOwner] = useState('');
  const [cleanup, setCleanup] = useState(false);
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads
      .filter((l) => !firm || l.firm === firm)
      .filter((l) => !kind || leadKind(l) === kind)
      .filter((l) => !temp || l.temperature === temp)
      .filter((l) => !owner || leadOwner(l) === owner)
      .filter((l) => inRange(l, range, from, to))
      .filter((l) => !needle || [l.name, l.email, l.phone, l.wants, l.location].some((v) => (v || '').toLowerCase().includes(needle)))
      .sort((a, b) => (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999') || (a.temperature === 'vruc' ? -1 : 1));
  }, [leads, firm, kind, temp, owner, q, range, from, to]);
  const counts = Object.fromEntries(['chiara', 'bonvia', 'dux'].map((k) => [k, leads.filter((l) => l.firm === k).length]));
  const lateCount = lateLeads(leads).length;
  const todayCount = leads.filter((l) => followUpState(l) === 'today').length;
  const reviewCount = leads.filter((l) => l.review).length;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { list, sheets, ignored } = await parseExcelAll(file, importFirm);
      const open = list.filter((l) => !/^zatvoren/i.test(l.status || ''));
      if (!list.length) { setMsg('U tablici nema prepoznatih listova s kupcima, najmoprimcima ili prodavateljima.'); return; }
      const perSheet = Object.entries(sheets).map(([n, c]) => `${n}: ${c}`).join(', ');
      const firmName = importFirm === 'dux' ? 'Dux' : importFirm === 'bonvia' ? 'Bonvia' : 'Chiara';
      if (!confirm(`Uvesti ${open.length} kontakata u firmu ${firmName}?\n\nListovi: ${perSheet}${ignored.length ? `\n(preskočeni listovi: ${ignored.join(', ')})` : ''}\n\nKupci koji već postoje (isti email, pa telefon, pa ime) bit će ažurirani i prebačeni u vrstu iz lista (Kupci, Najmoprimci, Vlasnici); ono što ste upisali u CRM (kontakti, nekretnine, rokovi nakon kontakta) ostaje. Stari rokovi iz tablice se preskaču. Zatvoreni (kupio/odustao): ${list.length - open.length}.`)) return;
      const r = actions.importLeads(list);
      setMsg(`Uvezeno: ${r.added} novih, ${r.updated} ažuriranih${r.closed ? `, ${r.closed} zatvorenih preskočeno` : ''}. (${perSheet})`);
    } catch (err) {
      setMsg(`Uvoz nije uspio: ${err.message}`);
    }
  };

  const fixLate = () => {
    const n = lateLeads(leads).length;
    if (!n) { setMsg('Nijedan kupac ne kasni.'); return; }
    if (!confirm(`${n} kupaca kasni s follow-upom. Svima staviti novi rok (vruć +4 dana, topao +7 dana od danas)?`)) return;
    setMsg(`Novi rok postavljen za ${actions.resetLateFollowUps()} kupaca.`);
  };

  return (
    <>
      <PageHeader title={text.title}
        subtitle={`${leads.length} ${text.noun} · ${lateCount} kasni · ${todayCount} za danas${reviewCount ? ` · ${reviewCount} za provjeru` : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          {!owners && <select className="field !w-auto !py-2 text-sm" value={importFirm} onChange={(e) => setImportFirm(e.target.value)} aria-label="Firma za uvoz">
            <option value="dux">Uvoz u: Dux</option><option value="bonvia">Uvoz u: Bonvia</option><option value="chiara">Uvoz u: Chiara</option>
          </select>}
          <button className="btn-outline" onClick={() => setShowCal(!showCal)}><CalendarDays size={16} /> Kalendar kontakata</button>
          <button className="btn-outline" onClick={() => exportLeads(filtered).catch((e) => setMsg(`Izvoz nije uspio: ${e.message}`))}><Download size={16} /> Izvoz u Excel</button>
          {!owners && <button className="btn-outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Uvoz iz Excela</button>}
          {!owners && <button className="btn-outline" onClick={() => setCleanup(true)}><Trash2 size={16} /> Očisti stare</button>}
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} />
          <button className="btn-primary" onClick={() => setForm(owners ? { kind: MODE_KIND[mode] } : {})}><Plus size={18} /> {text.add}</button>
        </div>
      </PageHeader>

      {msg && <div className="card mb-4 p-3 text-sm text-soft">{msg}</div>}
      {lateCount > 0 && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-2 border border-red-200 p-3 text-sm">
          <span><b className="text-red-700">{lateCount}</b> kupaca kasni s follow-upom.</span>
          <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={fixLate}>Postavi nove rokove (vruć +4, topao +7)</button>
        </div>
      )}
      {showCal && <ContactsCalendar leads={leads} onOpenLead={setDetail} />}

      <div className="mb-3"><FirmFilter counts={counts} /></div>
      {!owners && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[['', 'Svi'], ['kupac', 'Kupci'], ['ostalo', 'Ostalo']].map(([k, label]) => {
            const n = k ? leads.filter((l) => leadKind(l) === k).length : leads.length;
            return (
              <button key={k || 'sve'} onClick={() => setKind(k)} className={kind === k ? 'btn-primary !py-1.5' : 'btn-outline !py-1.5'}>
                {label} <span className="rounded-full bg-black/10 px-1.5 text-xs">{n}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {Object.entries(TEMPERATURES).map(([k, v]) => (
          <button key={k} onClick={() => setTemp(temp === k ? '' : k)} className={temp === k ? 'btn-primary' : 'btn-outline'}>{v.label}</button>
        ))}
        <select className="field !w-auto !py-2 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Voditelj">
          <option value="">Svi voditelji</option>{TEAM.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
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

      {suggestions.length > 0 && !kind && (
        <section className="mb-7">
          <h2 className="mb-1 text-xl font-semibold">Prijedlozi iz maila: dodati u CRM? <span className="badge bg-ink align-middle text-white">{suggestions.length}</span></h2>
          <p className="mb-3 text-xs text-mute">Ljudi s kojima ste se dopisivali, a još nisu u CRM-u. Ništa se ne dodaje dok ne kliknete.</p>
          <div className="grid gap-3 md:grid-cols-2">{suggestions.map((l) => <SuggestionCard key={l.id} lead={l} />)}</div>
        </section>
      )}
      {!filtered.length && <div className="card p-5 text-sm text-soft">{owners ? text.empty : 'Nema kupaca. Dodaj ih ručno ili uvezi Excel tablicu.'}</div>}
      {SECTIONS.map(([st, title]) => {
        const list = st === 'review'
          ? filtered.filter((l) => l.review && followUpState(l) !== 'closed').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          : filtered.filter((l) => !(l.review && followUpState(l) !== 'closed') && followUpState(l) === st);
        if (!list.length) return null;
        return (
          <section key={st} className="mb-7">
            <h2 className="mb-3 text-xl font-semibold">{title} <span className="badge bg-ink text-white">{list.length}</span></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {list.slice(0, limits[st] || PAGE).map((l) => <LeadCard key={l.id} lead={l} onEdit={() => setForm(l)} onDetail={setDetail} onContact={setContact} onData={setDataFor} />)}
            </div>
            {list.length > (limits[st] || PAGE) && (
              <button className="btn-outline mt-3" onClick={() => setLimits({ ...limits, [st]: (limits[st] || PAGE) + 40 })}>
                Prikaži još ({list.length - (limits[st] || PAGE)})
              </button>
            )}
          </section>
        );
      })}

      {cleanup && <CleanupDialog leads={leads} onClose={() => setCleanup(false)} onDone={setMsg} />}
      {detail && <LeadDetail leadId={detail} onClose={() => setDetail(null)} />}
      {contact && <ContactDialog lead={contact} onClose={() => setContact(null)} />}
      {dataFor && <ContactDialog dataOnly lead={dataFor} onClose={() => setDataFor(null)} />}
      {form && <LeadForm lead={form.id ? form : undefined} defaults={form.id ? undefined : form} onClose={() => setForm(null)} />}
    </>
  );
}
