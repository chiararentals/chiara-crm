import { useState } from 'react';
import Modal from './Modal';
import { actions } from '../data';
import { useMe } from '../lib/me';
import { CHANNELS, parseIds, plannedIds, suggestDate, TEMPERATURES } from '../lib/leads';

// Odrađen follow-up / kontakt: 4 obavezna odgovora + datum sljedećeg follow-upa.
export default function ContactDialog({ lead, onClose, dataOnly }) {
  const [me] = useMe();
  const known = lead.contacts?.length > 0;
  const [f, setF] = useState({
    sentText: '', channel: 'whatsapp',
    arrival: lead.arrivalDate ? 'date' : known ? 'unknown' : '', arrivalDate: lead.arrivalDate || '', arrivalNote: lead.arrivalNote || '',
    viewedManual: lead.viewedManual ?? (known ? 0 : ''), viewedText: '',
    chosen: plannedIds(lead).length ? 'ids' : known ? 'none' : '', chosenText: plannedIds(lead).join(', '),
    nextDate: suggestDate(lead.temperature), noNext: false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const chosenIds = f.chosen === 'ids' ? parseIds(f.chosenText) : [];

  const missing = [];
  if (!dataOnly && !f.sentText.trim()) missing.push('što je poslano');
  if (!dataOnly) {
    if (!(f.arrival === 'unknown' || (f.arrival === 'date' && f.arrivalDate))) missing.push('kad dolazi');
    if (f.viewedManual === '' || Number(f.viewedManual) < 0) missing.push('koliko je pogledao');
    if (!(f.chosen === 'none' || chosenIds.length)) missing.push('izabrana nekretnina');
  }

  const save = (e) => {
    e.preventDefault();
    if (missing.length) return;
    if (dataOnly) {
      actions.updateLeadFacts(lead.id, {
        sentText: f.sentText.trim(), arrival: f.arrival, arrivalDate: f.arrivalDate, arrivalNote: f.arrivalNote.trim(),
        viewedManual: f.viewedManual, viewedIds: parseIds(f.viewedText),
        chosenIds: f.chosen === 'ids' ? chosenIds : f.chosen === 'none' ? [] : undefined,
      });
      onClose();
      return;
    }
    actions.logContact(lead.id, {
      sentText: f.sentText.trim(), channel: f.channel,
      arrivalDate: f.arrival === 'date' ? f.arrivalDate : null, arrivalNote: f.arrival === 'unknown' ? f.arrivalNote.trim() : '',
      viewedManual: f.viewedManual, viewedIds: parseIds(f.viewedText), chosenIds,
      nextDate: f.noNext ? null : f.nextDate || null,
    }, me);
    onClose();
  };

  const radio = (name, value, label) => (
    <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${f[name] === value ? 'border-wine bg-wine/5' : 'border-mute/40'}`}>
      <input type="radio" className="accent-[#68051A]" checked={f[name] === value} onChange={() => setF({ ...f, [name]: value })} /> {label}
    </label>
  );

  return (
    <Modal title={`${dataOnly ? 'Podaci' : 'Follow-up'}: ${lead.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-soft">{dataOnly ? 'Upiši što znaš. Ovo NE bilježi kontakt i ne mijenja rok follow-upa.' : 'Odgovori na 4 pitanja su obavezni.'} <span className={`badge ${TEMPERATURES[lead.temperature]?.badge}`}>{TEMPERATURES[lead.temperature]?.label}</span></p>

        <div>
          <label className="label">1. Što mu je poslano / što ste dogovorili{dataOnly ? ' (neobavezno)' : ''}</label>
          <textarea className="field min-h-[80px]" value={f.sentText} onChange={set('sentText')} autoFocus placeholder="npr. poslane 3 nove ponude za stanove u Opatiji" />
          {!dataOnly && <select className="field mt-2" value={f.channel} onChange={set('channel')} aria-label="Kanal">
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>}
        </div>

        <div>
          <label className="label">2. Kad potencijalno dolazi u Hrvatsku</label>
          <div className="grid grid-cols-2 gap-2">{radio('arrival', 'date', 'Zna datum')}{radio('arrival', 'unknown', 'Još ne zna')}</div>
          {f.arrival === 'date' && <input type="date" className="field mt-2" value={f.arrivalDate} onChange={set('arrivalDate')} />}
          {f.arrival === 'unknown' && <input className="field mt-2" placeholder="Bilješka (npr. „možda u svibnju”)" value={f.arrivalNote} onChange={set('arrivalNote')} />}
        </div>

        <div>
          <label className="label">3. Koliko je nekretnina već pogledao</label>
          <input type="number" min="0" className="field" placeholder="Ručno upisani broj (npr. 3)" value={f.viewedManual} onChange={set('viewedManual')} />
          <input className="field mt-2" placeholder="+ ID-ovi iz DUX baze koje je pogledao (odvoji zarezom)" value={f.viewedText} onChange={set('viewedText')} />
          <p className="mt-1 text-xs text-mute">Ukupno = ručni broj + broj ID-ova na popisu kupca.</p>
        </div>

        <div>
          <label className="label">4. Je li izabrao nekretninu za gledanje</label>
          <div className="grid grid-cols-2 gap-2">{radio('chosen', 'ids', 'Da, izabrao je')}{radio('chosen', 'none', 'Još nije')}</div>
          {f.chosen === 'ids' && <input className="field mt-2" placeholder="ID-ovi iz DUX baze (odvoji zarezom)" value={f.chosenText} onChange={set('chosenText')} />}
        </div>

        {!dataOnly && <div className="rounded-xl bg-mist p-3">
          <label className="label">Sljedeći follow-up</label>
          <input type="date" className="field" value={f.nextDate} disabled={f.noNext} onChange={set('nextDate')} />
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#68051A]" checked={f.noNext} onChange={(e) => setF({ ...f, noNext: e.target.checked })} /> Bez sljedećeg follow-upa</label>
          <p className="mt-1 text-xs text-mute">Prijedlog: vruć +4 dana, topao +7 dana. Slobodno promijeni.</p>
        </div>}

        {missing.length > 0 && <p className="text-xs text-soft">Još nedostaje: {missing.join(', ')}.</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={missing.length > 0}>{dataOnly ? 'Spremi podatke' : 'Spremi i odradi'}</button>
        </div>
      </form>
    </Modal>
  );
}
