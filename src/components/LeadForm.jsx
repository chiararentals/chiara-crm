import { useState } from 'react';
import Modal from './Modal';
import { FirmPicker } from './FirmBadge';
import { actions } from '../data';
import { useFirm } from '../lib/firm';
import { TEMPERATURES, KINDS, WA_LABELS } from '../lib/leads';
import { TEAM } from '../seed';

export default function LeadForm({ lead, defaults = {}, onClose }) {
  const [gFirm] = useFirm();
  const editing = !!lead;
  const [f, setF] = useState({
    name: '', firm: gFirm && gFirm !== 'chiara' ? gFirm : 'dux', temperature: 'topao', email: '', phone: '', language: '', source: '',
    kind: 'kupac', propertyName: '', askingPrice: '', contractSigned: '', contractUntil: '', moveInDate: '', people: '', pets: '', wants: '', nextStep: '', owner: 'Vanja', listingId: '', obstacle: '', followUpDate: '', notes: '', location: '', type: '', priceRange: '',
    ...defaults, ...lead,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = { ...f, followUpDate: f.followUpDate || null, contractSigned: f.contractSigned || null, contractUntil: f.contractUntil || null, moveInDate: f.moveInDate || null };
    if (editing) actions.updateLead(lead.id, data); else actions.addLead(data);
    onClose();
  };
  const remove = () => { if (confirm(`Obrisati "${lead.name}"?`)) { actions.deleteLead(lead.id); onClose(); } };

  return (
    <Modal title={editing ? 'Uredi kupca' : 'Novi kupac / lead'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label">Vrsta kontakta</label>
          <div className="flex gap-2">
            {Object.entries(KINDS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, kind: k })} className={(f.kind || 'kupac') === k ? 'btn-primary !py-1.5' : 'btn-outline !py-1.5'}>{v}</button>
            ))}
          </div>
        </div>
        <div><label className="label">Firma</label><FirmPicker value={f.firm} onChange={(firm) => setF({ ...f, firm })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Ime</label><input className="field" value={f.name} onChange={set('name')} autoFocus={!editing} /></div>
          <div>
            <label className="label">Temperatura</label>
            <select className="field" value={f.temperature} onChange={set('temperature')}>
              {Object.entries(TEMPERATURES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="label">Follow-up do</label><input type="date" className="field" value={f.followUpDate || ''} onChange={set('followUpDate')} /></div>
          <div>
            <label className="label">Voditelj</label>
            <select className="field" value={f.owner || 'Vanja'} onChange={set('owner')}>{TEAM.map((n) => <option key={n}>{n}</option>)}</select>
          </div>
          <div><label className="label">ID oglasa (upit)</label><input className="field" value={f.listingId || ''} onChange={set('listingId')} /></div>
          <div><label className="label">Email</label><input type="email" className="field" value={f.email} onChange={set('email')} /></div>
          <div><label className="label">Telefon</label><input className="field" value={f.phone} onChange={set('phone')} /></div>
          <div><label className="label">Jezik</label><input className="field" placeholder="hr / en / de" value={f.language} onChange={set('language')} /></div>
          <div><label className="label">Izvor</label><input className="field" placeholder="web, Njuškalo…" value={f.source} onChange={set('source')} /></div>
        </div>
        {f.kind === 'vlasnik' && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-mist p-3">
            <div className="col-span-2"><label className="label">Nekretnina</label><input className="field" placeholder="npr. Stan 45 m², Opatija centar" value={f.propertyName || ''} onChange={set('propertyName')} /></div>
            <div><label className="label">Tražena cijena</label><input className="field" placeholder="npr. 250.000 € ili 900 €/mj" value={f.askingPrice || ''} onChange={set('askingPrice')} /></div>
            <div><label className="label">DUX ID oglasa</label><input className="field" value={f.listingId || ''} onChange={set('listingId')} /></div>
            <div><label className="label">Ugovor potpisan</label><input type="date" className="field" value={f.contractSigned || ''} onChange={set('contractSigned')} /></div>
            <div><label className="label">Ugovor vrijedi do</label><input type="date" className="field" value={f.contractUntil || ''} onChange={set('contractUntil')} /></div>
          </div>
        )}
        {f.kind === 'najmoprimac' && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-mist p-3">
            <div><label className="label">Budžet (€/mj.)</label><input className="field" placeholder="npr. 900" value={f.priceRange || ''} onChange={set('priceRange')} /></div>
            <div><label className="label">Useljenje od</label><input type="date" className="field" value={f.moveInDate || ''} onChange={set('moveInDate')} /></div>
            <div><label className="label">Broj osoba</label><input className="field" placeholder="npr. 2 odrasla + dijete" value={f.people || ''} onChange={set('people')} /></div>
            <div><label className="label">Kućni ljubimci</label><input className="field" placeholder="npr. pas" value={f.pets || ''} onChange={set('pets')} /></div>
          </div>
        )}
        <div><label className="label">{f.kind === 'vlasnik' ? 'Što nudi / dogovor' : f.kind === 'najmoprimac' ? 'Što traži (lokacija, tip stana)' : 'Što traži'}</label><textarea className="field min-h-[60px]" value={f.wants} onChange={set('wants')} /></div>
        {f.channel === 'whatsapp' && (
          <div className="space-y-3 rounded-xl bg-mist p-3">
            <div>
              <label className="label">Oznaka (WhatsApp Business)</label>
              <select className="field" value={f.waLabel || ''} onChange={set('waLabel')}>
                <option value="">—</option>{Object.entries(WA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">Prijedlog poruke za follow-up</label><textarea className="field min-h-[70px]" value={f.suggestedMessage || ''} onChange={set('suggestedMessage')} placeholder="Otvara se u WhatsAppu gumbom „WhatsApp s porukom”" /></div>
          </div>
        )}
        <div><label className="label">Prepreka</label><input className="field" value={f.obstacle || ''} onChange={set('obstacle')} /></div>
        <div><label className="label">Sljedeći korak</label><input className="field" value={f.nextStep} onChange={set('nextStep')} /></div>
        <div><label className="label">Napomena</label><textarea className="field min-h-[60px]" value={f.notes} onChange={set('notes')} /></div>
        <div className="flex gap-2 pt-1">
          {editing && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={!f.name.trim()}>Spremi</button>
        </div>
      </form>
    </Modal>
  );
}
