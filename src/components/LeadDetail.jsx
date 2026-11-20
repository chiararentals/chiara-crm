import { useState } from 'react';
import { Phone, Mail, MessageCircle, Pencil, Check, Trash2 } from 'lucide-react';
import Modal from './Modal';
import LeadFacts from './LeadFacts';
import ContactDialog from './ContactDialog';
import LeadForm from './LeadForm';
import FirmBadge from './FirmBadge';
import { actions, useData } from '../data';
import { CHANNELS, TEMPERATURES, parseIds, viewedTotal, waLink } from '../lib/leads';
import { fmtDateTime, fmtDate } from '../lib/dates';

const uid = () => crypto.randomUUID();

// Profil kupca: 4 odgovora, nekretnine (DUX ID-ovi) i povijest kontakata
export default function LeadDetail({ leadId, onClose }) {
  const { leads } = useData();
  const lead = leads.find((l) => l.id === leadId);
  const [dialog, setDialog] = useState(null); // 'contact' | 'edit'
  const [ids, setIds] = useState({ planned: '', viewed: '' });
  if (!lead) return null;

  const wa = waLink(lead.phone);
  const viewings = lead.viewings || [];
  const addViewings = (status) => {
    const list = parseIds(ids[status === 'planned' ? 'planned' : 'viewed']).filter((id) => !viewings.some((v) => v.duxId === id && v.status === status));
    if (!list.length) return;
    actions.updateLead(lead.id, {
      viewings: [...viewings.filter((v) => !(status === 'viewed' && list.includes(v.duxId) && v.status === 'planned')),
        ...list.map((id) => ({ id: uid(), duxId: id, status, note: '', date: status === 'viewed' ? new Date().toISOString().slice(0, 10) : null }))],
    });
    setIds({ ...ids, [status === 'planned' ? 'planned' : 'viewed']: '' });
  };
  const setViewings = (v) => actions.updateLead(lead.id, { viewings: v });
  const contacts = [...(lead.contacts || [])].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Modal title={lead.name} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${TEMPERATURES[lead.temperature]?.badge}`}>{TEMPERATURES[lead.temperature]?.label}</span>
          <FirmBadge firm={lead.firm} />
          <span className="text-xs text-soft">Voditelj: <b>{lead.owner || 'Vanja'}</b></span>
          {lead.followUpDate && <span className="text-xs text-soft">· Sljedeći follow-up: <b>{fmtDate(lead.followUpDate)}</b></span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {lead.phone && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`tel:${lead.phone}`}><Phone size={14} /> {lead.phone}</a>}
          {wa && <a className="btn-outline !px-3 !py-1.5 text-xs" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
          {lead.email && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`mailto:${lead.email}`}><Mail size={14} /> {lead.email}</a>}
          <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => setDialog('edit')}><Pencil size={14} /> Uredi</button>
        </div>

        <div>
          <LeadFacts lead={lead} />
          <button className="btn-primary mt-3 w-full" onClick={() => setDialog('contact')}><Check size={16} /> Zabilježi kontakt / odradi follow-up</button>
          <button className="btn-outline mt-2 w-full" onClick={() => setDialog('data')}>Samo upiši podatke (bez bilježenja kontakta)</button>
        </div>

        <section>
          <h3 className="mb-2 text-lg font-semibold">Nekretnine (DUX ID) <span className="text-sm font-normal text-mute">· ukupno pogledao: {viewedTotal(lead)}</span></h3>
          <label className="label">Ručno upisan broj pogledanih</label>
          <input type="number" min="0" className="field mb-3 !w-28" defaultValue={lead.viewedManual || 0}
            onBlur={(e) => actions.updateLead(lead.id, { viewedManual: Number(e.target.value) || 0 })} />
          <ul className="mb-3 space-y-1.5">
            {viewings.map((v) => (
              <li key={v.id} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
                <b className="flex-1">{v.duxId}</b>
                <span className={`badge ${v.status === 'viewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-gold/30 text-navy'}`}>{v.status === 'viewed' ? 'Pogledano' : 'Izabrano za gledanje'}</span>
                {v.status === 'planned' && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setViewings(viewings.map((x) => (x.id === v.id ? { ...x, status: 'viewed', date: new Date().toISOString().slice(0, 10) } : x)))}>Pogledano</button>}
                <button className="p-1 text-mute hover:text-wine" aria-label="Obriši" onClick={() => setViewings(viewings.filter((x) => x.id !== v.id))}><Trash2 size={15} /></button>
              </li>
            ))}
            {!viewings.length && <li className="text-sm text-mute">Još nema upisanih nekretnina.</li>}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            {[['planned', 'Izabrao za gledanje: ID-ovi'], ['viewed', 'Pogledao: ID-ovi']].map(([st, ph]) => (
              <form key={st} className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addViewings(st); }}>
                <input className="field !py-2 text-sm" placeholder={ph} value={ids[st]} onChange={(e) => setIds({ ...ids, [st]: e.target.value })} />
                <button className="btn-ghost !px-3 text-sm">Dodaj</button>
              </form>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-lg font-semibold">Povijest kontakata</h3>
          {!contacts.length && <p className="text-sm text-mute">Još nema zabilježenih kontakata.</p>}
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="rounded-xl border border-black/5 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                  <b className="text-navy">{c.by}</b> · {fmtDateTime(c.at)} · {CHANNELS[c.channel] || c.channel}
                </div>
                <div className="mt-1">{c.sentText}</div>
                <div className="mt-1 text-xs text-soft">
                  Dolazi: {c.arrivalDate ? fmtDate(c.arrivalDate) : c.arrivalNote || 'još ne zna'} · Pogledao: {c.viewedCount} · Izabrano: {c.chosen?.length ? c.chosen.join(', ') : 'ništa'}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {dialog === 'data' && <ContactDialog dataOnly lead={lead} onClose={() => setDialog(null)} />}
      {dialog === 'contact' && <ContactDialog lead={lead} onClose={() => setDialog(null)} />}
      {dialog === 'edit' && <LeadForm lead={lead} onClose={() => setDialog(null)} />}
    </Modal>
  );
}
