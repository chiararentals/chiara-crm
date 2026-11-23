import { useState } from 'react';
import Modal from './Modal';
import { actions } from '../data';
import { useMe } from '../lib/me';
import { TEAM } from '../seed';
import { PLATFORMS, CONTENT_FIRMS, CONTENT_STATUS } from '../lib/content';

const FORMATS = ['Slika', 'Carousel', 'Video', 'Reels/Kratki video', 'Story', 'Blog', 'Tekst'];

// Nova objava / uređivanje: mreža, firma, format, status, datumi, brief, link i (neobavezno) rezultati
export default function ContentDialog({ item, defaults = {}, onClose }) {
  const [me] = useMe();
  const editing = !!item;
  const [f, setF] = useState({
    title: '', platform: 'instagram', firm: 'chiara', format: '', status: 'planirano', plannedDate: '', publishedDate: '', theme: '',
    owner: '', link: '', brief: '', notes: '', reach: '', engagement: '', engagementRate: '', ...defaults, ...item,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    const data = { ...f, title: f.title.trim(), plannedDate: f.plannedDate || null, publishedDate: f.publishedDate || null };
    if (editing) actions.updateContent(item.id, data); else actions.addContent(data, me);
    onClose();
  };
  const remove = () => { if (confirm(`Obrisati „${item.title}”?`)) { actions.deleteContent(item.id); onClose(); } };

  return (
    <Modal title={editing ? 'Objava' : 'Nova objava'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-3">
        <div><label className="label">Objava / ideja</label><input className="field" value={f.title} onChange={set('title')} autoFocus={!editing} placeholder="npr. Villa Tramontana – video" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mreža</label>
            <select className="field" value={f.platform} onChange={set('platform')}>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <div>
            <label className="label">Za koga</label>
            <select className="field" value={f.firm} onChange={set('firm')}>{Object.entries(CONTENT_FIRMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <div>
            <label className="label">Format</label>
            <input className="field" list="content-formats" value={f.format || ''} onChange={set('format')} placeholder="Slika, Video…" />
            <datalist id="content-formats">{FORMATS.map((x) => <option key={x} value={x} />)}</datalist>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={f.status} onChange={set('status')}>{Object.entries(CONTENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label className="label">Planirani datum</label><input type="date" className="field" value={f.plannedDate || ''} onChange={set('plannedDate')} /></div>
          <div><label className="label">Stvarni datum objave</label><input type="date" className="field" value={f.publishedDate || ''} onChange={set('publishedDate')} /></div>
          <div><label className="label">Tema / kampanja</label><input className="field" value={f.theme || ''} onChange={set('theme')} /></div>
          <div>
            <label className="label">Tko radi</label>
            <select className="field" value={f.owner || ''} onChange={set('owner')}><option value="">—</option>{TEAM.map((n) => <option key={n}>{n}</option>)}</select>
          </div>
        </div>
        <div><label className="label">Link (kad je objavljeno)</label><input className="field" value={f.link || ''} onChange={set('link')} placeholder="https://…" /></div>
        <div><label className="label">Kratki opis / caption / brief</label><textarea className="field min-h-[80px]" value={f.brief || ''} onChange={set('brief')} /></div>
        <div><label className="label">Napomena</label><textarea className="field min-h-[60px]" value={f.notes || ''} onChange={set('notes')} /></div>
        <details className="rounded-xl bg-mist p-3">
          <summary className="cursor-pointer text-sm font-semibold">Rezultati (neobavezno)</summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div><label className="label">Doseg / pregledi</label><input className="field" value={f.reach || ''} onChange={set('reach')} /></div>
            <div><label className="label">Engagement</label><input className="field" value={f.engagement || ''} onChange={set('engagement')} /></div>
            <div><label className="label">Engagement rate</label><input className="field" value={f.engagementRate || ''} onChange={set('engagementRate')} /></div>
          </div>
        </details>
        <div className="flex gap-2 pt-1">
          {editing && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={!f.title.trim()}>Spremi</button>
        </div>
      </form>
    </Modal>
  );
}
