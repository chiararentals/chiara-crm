import { useState } from 'react';
import Modal from './Modal';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { SOURCES, groupedUnits } from '../lib/stays';
import { LANGUAGES } from '../seed/templates';
import { today, plusDays } from '../lib/dates';

export default function StayForm({ stay, defaults = {}, onClose }) {
  const { units, properties } = useData();
  const [me] = useMe();
  const editing = !!stay;
  const [f, setF] = useState(() => ({
    guestName: '', adults: 2, children: 0, checkIn: today(), arrivalTime: '', checkOut: plusDays(today(), 3),
    unitId: units[0]?.id, source: 'booking', phone: '', email: '', notes: '', language: 'hr',
    ...defaults, ...stay,
  }));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const invalid = !f.guestName.trim() || !f.unitId || f.checkOut <= f.checkIn;

  const save = (e) => {
    e.preventDefault();
    if (invalid) return;
    if (editing) actions.updateStay(stay.id, f);
    else actions.addStay(f, me);
    onClose();
  };
  const remove = () => {
    if (confirm(`Obrisati boravak gosta "${stay.guestName}"?`)) { actions.deleteStay(stay.id); onClose(); }
  };

  return (
    <Modal title={editing ? 'Uredi boravak' : 'Novi boravak'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label">Ime gosta</label>
          <input className="field" value={f.guestName} onChange={set('guestName')} autoFocus={!editing} />
        </div>
        <div>
          <label className="label">Jedinica</label>
          <select className="field" value={f.unitId} onChange={set('unitId')}>
            {groupedUnits(units, properties).map(({ property, units: us }) => (
              <optgroup key={property.id} label={property.name}>
                {us.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Odrasli</label><input type="number" min="1" className="field" value={f.adults} onChange={set('adults')} /></div>
          <div><label className="label">Djeca</label><input type="number" min="0" className="field" value={f.children} onChange={set('children')} /></div>
          <div><label className="label">Dolazak</label><input type="date" className="field" value={f.checkIn} onChange={set('checkIn')} /></div>
          <div><label className="label">Okvirno vrijeme</label><input className="field" placeholder="npr. oko 16h" value={f.arrivalTime} onChange={set('arrivalTime')} /></div>
          <div className="col-span-2"><label className="label">Odlazak</label><input type="date" className="field" value={f.checkOut} min={f.checkIn} onChange={set('checkOut')} /></div>
        </div>
        {f.checkOut <= f.checkIn && <p className="text-sm text-red-700">Odlazak mora biti nakon dolaska.</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Izvor</label>
            <select className="field" value={f.source} onChange={set('source')}>
              {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Jezik gosta</label>
            <select className="field" value={f.language} onChange={set('language')}>
              {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Telefon</label><input type="tel" className="field" placeholder="+385 …" value={f.phone} onChange={set('phone')} /></div>
          <div><label className="label">Email</label><input type="email" className="field" value={f.email} onChange={set('email')} /></div>
        </div>
        <div>
          <label className="label">Napomene</label>
          <textarea className="field min-h-[80px]" value={f.notes} onChange={set('notes')} />
        </div>
        <p className="text-xs text-mute">Ne upisuj brojeve osobnih iskaznica ni putovnica – aplikacija prati samo status.</p>
        <div className="flex gap-2 pt-1">
          {editing && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={invalid}>Spremi</button>
        </div>
      </form>
    </Modal>
  );
}
