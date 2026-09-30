import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { actions, useData } from '../data';
import PageHeader from '../components/PageHeader';
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

function Categories() {
  const { categories } = useData();
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-xl font-semibold">Kategorije zadataka</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="badge gap-2 py-1 text-white" style={{ background: c.color }}>
            {c.name}
            <button onClick={() => confirm(`Obrisati kategoriju "${c.name}"?`) && actions.deleteCategory(c.id)} aria-label="Obriši">×</button>
          </span>
        ))}
      </div>
      <AddRow placeholder="Nova kategorija" onAdd={actions.addCategory} />
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
        <Templates />
        <Properties />
        <Categories />
        <section className="card p-5">
          <h2 className="mb-1 text-xl font-semibold">Testni podaci</h2>
          <p className="mb-3 text-sm text-soft">Ovo je probna verzija: podaci se spremaju samo u ovom pregledniku. Gumb vraća početne testne podatke.</p>
          <button className="btn-outline text-wine" onClick={() => confirm('Vratiti sve na testne podatke?') && actions.resetDemo()}>Vrati testne podatke</button>
        </section>
      </div>
    </>
  );
}
