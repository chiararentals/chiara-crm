import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { actions, useData } from '../data';
import PageHeader from '../components/PageHeader';
import FirmBadge, { FirmPicker } from '../components/FirmBadge';
import { TEAM } from '../seed';
import { TEMPLATE_KINDS, LANGUAGES } from '../seed/templates';

function AddRow({ placeholder, onAdd }) {
  const [v, setV] = useState('');
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(''); } }}>
      <input className="field !py-2 text-sm" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn-ghost !px-3" aria-label="Dodaj"><Plus size={18} /></button>
    </form>
  );
}

function Properties() {
  const { properties, units } = useData();
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-xl font-semibold">Objekti i jedinice</h2>
      <p className="mb-4 text-sm text-soft">Objekt je zgrada, a jedinice su apartmani u njoj (npr. Apartments Vila Chiara → Mascagni 1, Istriana 2…).</p>
      <div className="space-y-4">
        {[...properties].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => (
          <div key={p.id} className="rounded-2xl bg-mist p-3">
            <input className="w-full bg-transparent font-serif text-lg font-semibold outline-none" defaultValue={p.name}
              onBlur={(e) => e.target.value.trim() && actions.updateProperty(p.id, { name: e.target.value.trim() })} />
            <ul className="mt-2 space-y-1.5">
              {units.filter((u) => u.propertyId === p.id).sort((a, b) => a.sortOrder - b.sortOrder).map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <input className="field !py-1.5 text-sm" defaultValue={u.name}
                    onBlur={(e) => e.target.value.trim() && actions.updateUnit(u.id, { name: e.target.value.trim() })} />
                  <button className="p-1.5 text-mute hover:text-wine" aria-label="Obriši jedinicu"
                    onClick={() => confirm(`Obrisati jedinicu "${u.name}"?`) && !actions.deleteUnit(u.id) && alert('Jedinica ima boravke – prvo ih obriši ili premjesti.')}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2"><AddRow placeholder="Nova jedinica u ovom objektu" onAdd={(n) => actions.addUnit(p.id, n)} /></div>
          </div>
        ))}
      </div>
      <div className="mt-4"><AddRow placeholder="Novi objekt (dobit će jednu jedinicu istog imena)" onAdd={actions.addProperty} /></div>
    </section>
  );
}

function Recurring() {
  const { recurring } = useData();
  const [f, setF] = useState({ title: '', firm: 'chiara', assignee: TEAM[0], repeat: 'daily' });
  const add = (e) => { e.preventDefault(); if (f.title.trim()) { actions.addRecurring({ ...f, title: f.title.trim() }); setF({ ...f, title: '' }); } };
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-xl font-semibold">Svakodnevni zadaci</h2>
      <p className="mb-4 text-sm text-soft">Ovi se zadaci sami pojave svaki dan kod zadane osobe. Što se ne odradi tijekom dana, sutradan se zamijeni novim.</p>
      <ul className="mb-4 space-y-2">
        {recurring.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-2.5">
            <FirmBadge firm={r.firm} />
            <input className="field !w-auto min-w-[10rem] flex-1 !py-1.5 text-sm" defaultValue={r.title}
              onBlur={(e) => e.target.value.trim() && actions.updateRecurring(r.id, { title: e.target.value.trim() })} />
            <select className="field !w-auto !py-1.5 text-sm" value={r.assignee} onChange={(e) => actions.updateRecurring(r.id, { assignee: e.target.value })}>
              {TEAM.map((n) => <option key={n}>{n}</option>)}
            </select>
            <select className="field !w-auto !py-1.5 text-sm" value={r.repeat} onChange={(e) => actions.updateRecurring(r.id, { repeat: e.target.value })}>
              <option value="daily">Svaki dan</option>
              <option value="workdays">Pon–pet</option>
            </select>
            <button className="p-1.5 text-mute hover:text-wine" aria-label="Obriši"
              onClick={() => confirm(`Obrisati svakodnevni zadatak "${r.title}"?`) && actions.deleteRecurring(r.id)}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-3 border-t border-mist pt-4">
        <FirmPicker value={f.firm} onChange={(firm) => setF({ ...f, firm })} />
        <div className="flex flex-wrap gap-2">
          <input className="field !w-auto min-w-[12rem] flex-1 !py-2 text-sm" placeholder="Novi svakodnevni zadatak" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className="field !w-auto !py-2 text-sm" value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })}>{TEAM.map((n) => <option key={n}>{n}</option>)}</select>
          <select className="field !w-auto !py-2 text-sm" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })}>
            <option value="daily">Svaki dan</option><option value="workdays">Pon–pet</option>
          </select>
          <button className="btn-ghost !px-3" aria-label="Dodaj"><Plus size={18} /></button>
        </div>
      </form>
    </section>
  );
}

function Templates() {
  const { templates } = useData();
  const [kind, setKind] = useState('id_request');
  const [lang, setLang] = useState('hr');
  const tpl = templates.find((t) => t.kind === kind && t.language === lang);
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-xl font-semibold">Predlošci poruka</h2>
      <p className="mb-4 text-sm text-soft">Vrijede za WhatsApp i email. Oznake: <code>{'{ime} {objekt} {jedinica} {datum_dolaska} {datum_odlaska} {vrijeme_dolaska} {potpis}'}</code></p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(TEMPLATE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="field" value={lang} onChange={(e) => setLang(e.target.value)}>{Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {tpl && (
        <div key={tpl.id} className="space-y-3">
          <div><label className="label">Naslov emaila</label><input className="field" defaultValue={tpl.subject} onBlur={(e) => actions.updateTemplate(tpl.id, { subject: e.target.value })} /></div>
          <div><label className="label">Tekst</label><textarea className="field min-h-[240px] text-sm" defaultValue={tpl.body} onBlur={(e) => actions.updateTemplate(tpl.id, { body: e.target.value })} /></div>
          <p className="text-xs text-mute">Sprema se automatski kad klikneš izvan polja.</p>
        </div>
      )}
    </section>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Postavke" />
      <div className="space-y-5">
        <Recurring />
        <Templates />
        <Properties />
        <section className="card p-5">
          <h2 className="mb-1 text-xl font-semibold">Testni podaci</h2>
          <p className="mb-3 text-sm text-soft">Ovo je probna verzija: podaci se spremaju samo u ovom pregledniku. Gumb vraća početne testne podatke.</p>
          <button className="btn-outline text-wine" onClick={() => confirm('Vratiti sve na testne podatke?') && actions.resetDemo()}>Vrati testne podatke</button>
        </section>
      </div>
    </>
  );
}
