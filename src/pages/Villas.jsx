import { useState } from 'react';
import { Phone, Mail, MessageCircle, Plus, Paperclip, Search } from 'lucide-react';
import { useData } from '../data';
import { missingTables } from '../data/remote';
import PageHeader from '../components/PageHeader';
import FirmBadge from '../components/FirmBadge';
import VillaDialog, { VILLA_STATUS } from '../components/VillaDialog';
import { waLink } from '../lib/leads';
import { fmtDate, daysFromToday } from '../lib/dates';

// Baza vila za portfelj (Bonvia): ime ville, vlasnik, kontakt, ugovor i dokumenti
export default function Villas() {
  const { villas = [] } = useData();
  const [open, setOpen] = useState(null); // {} = nova, {id} = uređivanje
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const needle = q.trim().toLowerCase();
  const list = villas
    .filter((v) => !status || v.status === status)
    .filter((v) => !needle || [v.name, v.ownerName, v.location, v.phone, v.email].some((x) => (x || '').toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name, 'hr'));
  const missing = missingTables.has('villas');

  return (
    <>
      <PageHeader title="Bonvia vile" subtitle={`${villas.length} ${villas.length === 1 ? 'vila' : 'vila'} u portfelju`}>
        <button className="btn-primary" disabled={missing} onClick={() => setOpen({})}><Plus size={18} /> Nova vila</button>
      </PageHeader>

      {missing && (
        <div className="card mb-5 border border-gold p-4 text-sm">
          <b>Za Vile treba još jednom pokrenuti SQL u Supabaseu</b> (jednokratno, 1 minuta). Upute su u <code>docs/UPUTE-VILE.md</code>. Do tada ova stranica ne sprema podatke.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="field !py-2 !pl-9 text-sm" placeholder="Traži vilu, vlasnika, lokaciju…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field !w-auto !py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Svi statusi</option>
          {Object.entries(VILLA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {!list.length && <div className="card p-5 text-sm text-soft">{villas.length ? 'Nema vila za ovaj filter.' : 'Još nema vila. Dodajte prvu gumbom „Nova vila”.'}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((v) => {
          const left = v.contractUntil ? daysFromToday(v.contractUntil) : null;
          const wa = waLink(v.phone);
          return (
            <div key={v.id} className="rounded-xl border border-black/5 p-3.5 shadow-card" style={{ background: '#C9B48A1F', borderLeft: '4px solid #C9B48A' }}>
              <button className="block w-full text-left" onClick={() => setOpen({ id: v.id })}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-serif text-lg font-semibold">{v.name}</span>
                  <span className={`badge ${VILLA_STATUS[v.status]?.badge}`}>{VILLA_STATUS[v.status]?.label}</span>
                  {left != null && left < 0 && <span className="badge bg-red-600 text-white">Ugovor istekao</span>}
                  {left != null && left >= 0 && left <= 30 && <span className="badge bg-gold text-navy">Ugovor ističe za {left} d</span>}
                </div>
                {v.location && <div className="text-xs text-soft">{v.location}</div>}
                <div className="mt-1 text-sm"><span className="text-mute">Vlasnik:</span> <b>{v.ownerName || '—'}</b></div>
                {(v.contractSigned || v.contractUntil) && (
                  <div className="text-xs text-soft">Ugovor: {v.contractSigned ? fmtDate(v.contractSigned) : '—'} → {v.contractUntil ? fmtDate(v.contractUntil) : '—'}</div>
                )}
                {(v.files || []).length > 0 && <div className="mt-1 inline-flex items-center gap-1 text-xs text-soft"><Paperclip size={12} /> {(v.files || []).length} dokumenata</div>}
              </button>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-mist pt-3">
                {v.phone && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`tel:${v.phone}`}><Phone size={14} /> {v.phone}</a>}
                {wa && <a className="btn-outline !px-3 !py-1.5 text-xs" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
                {v.email && <a className="btn-outline !px-3 !py-1.5 text-xs" href={`mailto:${v.email}`}><Mail size={14} /> Email</a>}
              </div>
            </div>
          );
        })}
      </div>
      {open && <VillaDialog villaId={open.id} onClose={() => setOpen(null)} />}
    </>
  );
}
