import { useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import Modal from './Modal';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { ACCEPT, MAX_MB, filesEnabled, openFile, removeFile, uploadFile } from '../data/files';
import { fmtDate } from '../lib/dates';

export const VILLA_STATUS = {
  prospekt: { label: 'Kontakt / razgovor', badge: 'bg-mist text-soft' },
  pregovori: { label: 'Pregovori', badge: 'bg-gold/40 text-navy' },
  ugovor: { label: 'Ugovor potpisan', badge: 'bg-emerald-100 text-emerald-800' },
  odustali: { label: 'Odustali', badge: 'bg-red-100 text-red-800' },
};

// Dodavanje/uređivanje ville + dokumenti (PDF ugovori). Dokumenti se spremaju odmah, neovisno o gumbu "Spremi".
export default function VillaDialog({ villaId, onClose }) {
  const { villas } = useData();
  const [me] = useMe();
  const villa = villas.find((v) => v.id === villaId);
  const editing = !!villa;
  const [f, setF] = useState(() => ({
    name: '', location: '', ownerName: '', phone: '', email: '', status: 'prospekt', contractSigned: '', contractUntil: '', notes: '',
    ...(villa ? { ...villa, files: undefined } : {}),
  }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const files = villa?.files || [];

  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = { ...f, contractSigned: f.contractSigned || null, contractUntil: f.contractUntil || null };
    delete data.files;
    if (editing) actions.updateVilla(villa.id, data); else actions.addVilla(data);
    onClose();
  };
  const remove = () => { if (confirm(`Obrisati vilu "${villa.name}"? Dokumenti u spremniku ostaju dok ih ne obrišete.`)) { actions.deleteVilla(villa.id); onClose(); } };

  const onFiles = async (e) => {
    const list = [...(e.target.files || [])];
    e.target.value = '';
    setErr(''); setBusy(true);
    try {
      for (const file of list) {
        const meta = await uploadFile(villa.id, file);
        actions.updateVilla(villa.id, { files: [...(villas.find((v) => v.id === villa.id)?.files || []), { ...meta, by: me }] });
      }
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const delFile = async (file) => {
    if (!confirm(`Obrisati dokument „${file.name}”?`)) return;
    try { await removeFile(file.path); actions.updateVilla(villa.id, { files: files.filter((x) => x.id !== file.id) }); } catch (ex) { setErr(ex.message); }
  };

  return (
    <Modal title={editing ? 'Vila' : 'Nova vila'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Ime ville</label><input className="field" value={f.name} onChange={set('name')} autoFocus={!editing} /></div>
          <div className="col-span-2"><label className="label">Lokacija</label><input className="field" placeholder="npr. Lovran" value={f.location || ''} onChange={set('location')} /></div>
          <div className="col-span-2"><label className="label">Vlasnik</label><input className="field" value={f.ownerName || ''} onChange={set('ownerName')} /></div>
          <div><label className="label">Telefon</label><input type="tel" className="field" value={f.phone || ''} onChange={set('phone')} /></div>
          <div><label className="label">Email</label><input type="email" className="field" value={f.email || ''} onChange={set('email')} /></div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={f.status} onChange={set('status')}>{Object.entries(VILLA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <div />
          <div><label className="label">Ugovor potpisan</label><input type="date" className="field" value={f.contractSigned || ''} onChange={set('contractSigned')} /></div>
          <div><label className="label">Ugovor vrijedi do</label><input type="date" className="field" value={f.contractUntil || ''} onChange={set('contractUntil')} /></div>
        </div>
        <div><label className="label">Napomene</label><textarea className="field min-h-[70px]" value={f.notes || ''} onChange={set('notes')} /></div>
        <div className="flex gap-2">
          {editing && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Zatvori</button>
          <button className="btn-primary" disabled={!f.name.trim()}>Spremi</button>
        </div>
      </form>

      {editing && (
        <section className="mt-6 border-t border-mist pt-4">
          <h3 className="mb-2 text-lg font-semibold">Dokumenti (ugovori)</h3>
          {!filesEnabled && <p className="mb-2 rounded-xl bg-gold/20 p-3 text-sm">Učitavanje dokumenata radi tek kad je CRM spojen na bazu (Supabase).</p>}
          <ul className="mb-3 space-y-1.5">
            {files.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
                <FileText size={16} className="flex-none text-soft" />
                <button type="button" className="min-w-0 flex-1 truncate text-left font-semibold underline-offset-2 hover:underline" onClick={() => openFile(x.path).catch((ex) => setErr(ex.message))}>{x.name}</button>
                <span className="hidden text-xs text-mute sm:inline">{x.by ? `${x.by} · ` : ''}{fmtDate(x.uploadedAt.slice(0, 10))}</span>
                <button type="button" className="p-1 text-mute hover:text-wine" aria-label="Obriši dokument" onClick={() => delFile(x)}><Trash2 size={15} /></button>
              </li>
            ))}
            {!files.length && <li className="text-sm text-mute">Još nema dokumenata.</li>}
          </ul>
          <label className={`btn-outline cursor-pointer ${!filesEnabled || busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload size={16} /> {busy ? 'Učitavam…' : 'Učitaj dokument'}
            <input type="file" accept={ACCEPT} multiple className="hidden" onChange={onFiles} disabled={!filesEnabled || busy} />
          </label>
          <p className="mt-1 text-xs text-mute">PDF, slike ili Word, do {MAX_MB} MB po datoteci.</p>
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        </section>
      )}
      {!editing && <p className="mt-3 text-xs text-mute">Dokumente možete učitati nakon što vilu spremite.</p>}
    </Modal>
  );
}
