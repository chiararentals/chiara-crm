import { useMemo, useState } from 'react';
import Modal from './Modal';
import { actions } from '../data';
import { staleImportCandidates, leadKind, KINDS } from '../lib/leads';
import { exportLeads } from '../lib/exportLeads';
import { fmtDate } from '../lib/dates';

// Brisanje starih kupaca iz prvog (zastarjelog) uvoza. Sigurnosne kočnice: samo kupci koji NISU u zadnjem uvozu
// i nemaju nikakvu aktivnost u CRM-u; prije brisanja se vidi popis i može se izvesti u Excel.
export default function CleanupDialog({ leads, onClose, onDone }) {
  const [cutoff, setCutoff] = useState('2026-11-19');
  const { latest, list } = useMemo(() => staleImportCandidates(leads, cutoff), [leads, cutoff]);
  const [busy, setBusy] = useState(false);

  const remove = () => {
    if (!confirm(`Trajno obrisati ${list.length} kupaca? Ovo se ne može poništiti (prvo izvezite popis u Excel ako želite sigurnosnu kopiju).`)) return;
    actions.deleteLeads(list.map((l) => l.id));
    onDone(`Obrisano ${list.length} starih kupaca.`);
    onClose();
  };

  return (
    <Modal title="Očisti stare uvezene kupce" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        {!latest ? (
          <p className="rounded-xl bg-gold/20 p-3">Prvo <b>uvezite novu tablicu</b> (gumb „Uvoz iz Excela”). Kupci koji su u njoj ostaju, a ovaj alat nudi brisanje samo onih koji u njoj <b>nisu</b>.</p>
        ) : (
          <>
            <p className="text-soft">Nude se kupci koji su u CRM stigli <b>prije</b> odabranog datuma, <b>nisu u zadnjem uvozu</b> tablice i u CRM-u nemaju <b>nikakvu aktivnost</b> (kontakte, nekretnine, mailove, upisane podatke, bilješke).</p>
            <div className="flex items-center gap-2">
              <label className="label !mb-0">Stigli prije</label>
              <input type="date" className="field !w-auto !py-2" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
            </div>
            <p className="font-semibold">{list.length} kupaca za brisanje</p>
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl bg-mist p-3">
              {list.slice(0, 40).map((l) => <li key={l.id}>{l.name} <span className="text-mute">· {KINDS[leadKind(l)]} · {l.email || l.phone || 'bez kontakta'} · stigao {fmtDate(l.createdAt.slice(0, 10))}</span></li>)}
              {list.length > 40 && <li className="text-mute">… i još {list.length - 40}</li>}
              {!list.length && <li className="text-mute">Nema kupaca za brisanje.</li>}
            </ul>
          </>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Odustani</button>
          {list.length > 0 && <button className="btn-outline" disabled={busy} onClick={async () => { setBusy(true); try { await exportLeads(list); } finally { setBusy(false); } }}>Izvezi popis u Excel</button>}
          {list.length > 0 && <button className="btn-primary" onClick={remove}>Obriši {list.length}</button>}
        </div>
      </div>
    </Modal>
  );
}
