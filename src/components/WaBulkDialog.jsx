import { useMemo, useState } from 'react';
import Modal from './Modal';
import { actions } from '../data';
import { TEMPERATURES, WA_LABELS } from '../lib/leads';
import { exportLeads } from '../lib/exportLeads';

// Skupno micanje WhatsApp kupaca (npr. svi vrući, jer prelaze na Markov broj)
export default function WaBulkDialog({ leads, onClose, onDone }) {
  const [temps, setTemps] = useState([]);
  const [labels, setLabels] = useState([]);
  const [action, setAction] = useState('marko');
  const [busy, setBusy] = useState(false);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const picked = useMemo(() => {
    if (!temps.length && !labels.length) return [];
    return leads.filter((l) => (!temps.length || temps.includes(l.temperature)) && (!labels.length || labels.includes(l.waLabel)));
  }, [leads, temps, labels]);

  const run = () => {
    const what = action === 'marko'
      ? `Prebaciti ${picked.length} kupaca Marku? Nestat će s popisa WhatsApp, a ostaju u CRM-u (voditelj Marko). Ponovni uvoz tablice ih neće vratiti.`
      : `Ukloniti ${picked.length} kupaca? Nestat će iz CRM-a i ponovni uvoz tablice ih neće vratiti. (Prije toga možete izvesti popis u Excel.)`;
    if (!confirm(what)) return;
    const ids = picked.map((l) => l.id);
    if (action === 'marko') actions.moveToMarko(ids); else actions.removeLeads(ids);
    onDone(action === 'marko' ? `${ids.length} kupaca prebačeno Marku.` : `${ids.length} kupaca uklonjeno.`);
    onClose();
  };

  const chip = (on, label, onClick) => (
    <button key={label} type="button" onClick={onClick} className={on ? 'btn-primary !py-1.5 text-xs' : 'btn-outline !py-1.5 text-xs'}>{label}</button>
  );

  return (
    <Modal title="Makni WhatsApp kupce" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p className="text-soft">Odaberite koga želite maknuti (npr. sve <b>vruće</b>, jer prelaze na Markov broj). Pokazuje se tko će biti obuhvaćen prije nego potvrdite.</p>
        <div>
          <div className="label">Temperatura</div>
          <div className="flex flex-wrap gap-2">{Object.entries(TEMPERATURES).map(([k, v]) => chip(temps.includes(k), v.label, () => toggle(temps, setTemps, k)))}</div>
        </div>
        <div>
          <div className="label">Oznaka (WhatsApp Business)</div>
          <div className="flex flex-wrap gap-2">{Object.entries(WA_LABELS).map(([k, v]) => chip(labels.includes(k), v, () => toggle(labels, setLabels, k)))}</div>
        </div>
        <p className="font-semibold">{picked.length} kupaca obuhvaćeno</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-mist p-3">
          {picked.slice(0, 40).map((l) => <li key={l.id}>{l.name} <span className="text-mute">· {TEMPERATURES[l.temperature]?.label}{l.waLabel ? ` · ${WA_LABELS[l.waLabel] || l.waLabel}` : ''}</span></li>)}
          {picked.length > 40 && <li className="text-mute">… i još {picked.length - 40}</li>}
          {!picked.length && <li className="text-mute">Odaberite temperaturu i/ili oznaku.</li>}
        </ul>
        <div>
          <div className="label">Što napraviti</div>
          <label className="mb-1 flex items-start gap-2"><input type="radio" className="mt-1 accent-[#68051A]" checked={action === 'marko'} onChange={() => setAction('marko')} /> <span><b>Prebaci Marku</b>: nestaju s popisa WhatsApp, ostaju u CRM-u kao Markovi kupci (prikazuju se u Kupcima, voditelj Marko). Ponovni uvoz ih ne vraća.</span></label>
          <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-[#68051A]" checked={action === 'ukloni'} onChange={() => setAction('ukloni')} /> <span><b>Ukloni</b>: nestaju iz CRM-a. Ponovni uvoz ih ne vraća.</span></label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Odustani</button>
          {picked.length > 0 && <button className="btn-outline" disabled={busy} onClick={async () => { setBusy(true); try { await exportLeads(picked); } finally { setBusy(false); } }}>Izvezi popis u Excel</button>}
          <button className="btn-primary" disabled={!picked.length} onClick={run}>{action === 'marko' ? 'Prebaci Marku' : 'Ukloni'} ({picked.length})</button>
        </div>
      </div>
    </Modal>
  );
}
