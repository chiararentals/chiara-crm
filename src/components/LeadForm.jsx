import { useState } from 'react';
import Modal from './Modal';
import { FirmPicker } from './FirmBadge';
import { actions } from '../data';
import { TEMPERATURES } from '../lib/leads';

export default function LeadForm({ lead, defaults = {}, onClose }) {
  const editing = !!lead;
  const [f, setF] = useState({
    name: '', firm: 'dux', temperature: 'topao', email: '', phone: '', language: '', source: '',
    wants: '', nextStep: '', followUpDate: '', notes: '', location: '', type: '', priceRange: '',
    ...defaults, ...lead,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = { ...f, followUpDate: f.followUpDate || null };
    if (editing) actions.updateLead(lead.id, data); else actions.addLead(data);
    onClose();
  };
  const remove = () => { if (confirm(`Obrisati "${lead.name}"?`)) { actions.deleteLead(lead.id); onClose(); } };

  return (
    <Modal title={editing ? 'Uredi kupca' : 'Novi kupac / lead'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
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
          <div><label className="label">Email</label><input type="email" className="field" value={f.email} onChange={set('email')} /></div>
          <div><label className="label">Telefon</label><input className="field" value={f.phone} onChange={set('phone')} /></div>
          <div><label className="label">Jezik</label><input className="field" placeholder="hr / en / de" value={f.language} onChange={set('language')} /></div>
          <div><label className="label">Izvor</label><input className="field" placeholder="web, Njuškalo…" value={f.source} onChange={set('source')} /></div>
        </div>
        <div><label className="label">Što traži</label><textarea className="field min-h-[60px]" value={f.wants} onChange={set('wants')} /></div>
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
