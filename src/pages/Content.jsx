import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Upload } from 'lucide-react';
import { addMonths, format, getDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { hr } from 'date-fns/locale';
import { actions, useData } from '../data';
import { missingTables } from '../data/remote';
import PageHeader from '../components/PageHeader';
import ContentDialog from '../components/ContentDialog';
import { PLATFORMS, CONTENT_FIRMS, CONTENT_STATUS, calendarDay, parseContentExcel } from '../lib/content';
import { useMe } from '../lib/me';
import { today } from '../lib/dates';

// Chip jedne objave u kalendaru: boja = firma, oznaka = mreža; objavljeno je ublaženo s kvačicom, ideja je iscrtkana
function Chip({ c, onClick, compact }) {
  const firm = CONTENT_FIRMS[c.firm]?.color || '#6B7280';
  const p = PLATFORMS[c.platform] || PLATFORMS.ostalo;
  const done = c.status === 'objavljeno';
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(c); }} title={`${p.label} · ${CONTENT_STATUS[c.status] || ''} · ${c.title}`}
      className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight ${done ? 'opacity-60' : ''} ${c.status === 'ideja' ? 'border border-dashed' : 'border border-transparent'}`}
      style={{ background: `${firm}26`, borderLeft: `3px solid ${firm}`, borderColor: c.status === 'ideja' ? firm : undefined }}>
      <span className="flex-none rounded px-1 text-[9px] font-bold text-white" style={{ background: p.color }}>{p.short}</span>
      {!compact && <span className="truncate">{done ? '✓ ' : ''}{c.title}</span>}
    </button>
  );
}

export default function Content() {
  const { content = [] } = useData();
  const [me] = useMe();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [day, setDay] = useState(today());
  const [firm, setFirm] = useState('');
  const [platform, setPlatform] = useState('');
  const [form, setForm] = useState(null); // {} nova (s defaults), {item} uređivanje
  const [importFirm, setImportFirm] = useState('chiara');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const missing = missingTables.has('content');

  const items = useMemo(() => content.filter((c) => (!firm || c.firm === firm) && (!platform || c.platform === platform)), [content, firm, platform]);
  const byDay = useMemo(() => {
    const m = {};
    for (const c of items) { const d = calendarDay(c); if (d) (m[d] ||= []).push(c); }
    for (const list of Object.values(m)) list.sort((a, b) => a.platform.localeCompare(b.platform));
    return m;
  }, [items]);
  const ideas = items.filter((c) => !calendarDay(c));

  const lead = (getDay(startOfMonth(month)) + 6) % 7; // ponedjeljak = 0
  const dim = endOfMonth(month).getDate();
  const days = Array.from({ length: dim }, (_, i) => format(new Date(month.getFullYear(), month.getMonth(), i + 1), 'yyyy-MM-dd'));
  const selected = (byDay[day] || []);
  const open = (item) => setForm({ item });
  const add = (date) => setForm({ defaults: { plannedDate: date || '', firm: firm || 'chiara', platform: platform || 'instagram' } });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { list, sheets, ignored } = await parseContentExcel(file, importFirm);
      if (!list.length) { setMsg('U tablici nema prepoznatih objava.'); return; }
      const per = Object.entries(sheets).map(([n, c]) => `${n}: ${c}`).join(', ');
      if (!confirm(`Uvesti ${list.length} objava za „${CONTENT_FIRMS[importFirm].label}”?\n\nListovi: ${per}${ignored.length ? `\n(preskočeni: ${ignored.join(', ')})` : ''}\n\nObjave koje već postoje (ista mreža, naslov i datum) ažuriraju se, a ostale se dodaju.`)) return;
      const r = actions.importContent(list, me);
      setMsg(`Uvezeno: ${r.added} novih, ${r.updated} ažuriranih. (${per})`);
    } catch (err) { setMsg(`Uvoz nije uspio: ${err.message}`); }
  };

  return (
    <>
      <PageHeader title="Content" subtitle={`${format(month, 'LLLL yyyy', { locale: hr })} · ${items.length} objava`}>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field !w-auto !py-2 text-sm" value={importFirm} onChange={(e) => setImportFirm(e.target.value)} aria-label="Uvoz za firmu">
            {Object.entries(CONTENT_FIRMS).map(([k, v]) => <option key={k} value={k}>Uvoz za: {v.label}</option>)}
          </select>
          <button className="btn-outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Uvoz iz Excela</button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} />
          <button className="btn-primary" disabled={missing} onClick={() => add(day)}><Plus size={18} /> Nova objava</button>
        </div>
      </PageHeader>

      {missing && <div className="card mb-4 border border-gold p-4 text-sm"><b>Za Content treba još jednom pokrenuti SQL u Supabaseu</b> (jednokratno). Upute: <code>docs/UPUTE-CONTENT.md</code>. Do tada se objave ne spremaju.</div>}
      {msg && <div className="card mb-4 p-3 text-sm text-soft">{msg}</div>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[['', 'Sve firme'], ...Object.entries(CONTENT_FIRMS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k || 'sve'} onClick={() => setFirm(k)} className={firm === k ? 'btn-primary !py-1.5' : 'btn-outline !py-1.5'}>
            {k && <span className="h-2 w-2 rounded-full" style={{ background: CONTENT_FIRMS[k].color }} />}{label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[['', 'Sve mreže'], ...Object.entries(PLATFORMS).filter(([k]) => k !== 'ostalo').map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k || 'sve'} onClick={() => setPlatform(k)} className={platform === k ? 'btn-primary !py-1.5 text-xs' : 'btn-outline !py-1.5 text-xs'}>{label}</button>
        ))}
        <a href="https://claude.ai/artifact/PJwqAgHVxqKD1mBGHVjsBJ" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-soft underline-offset-2 hover:underline"><ExternalLink size={13} /> Analitika (Social)</a>
      </div>

      <div className="card mb-5 p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2">
          <button className="btn-outline !px-2.5" onClick={() => setMonth(addMonths(month, -1))} aria-label="Prošli mjesec"><ChevronLeft size={16} /></button>
          <div className="min-w-[9rem] text-center font-serif text-xl font-semibold first-letter:uppercase">{format(month, 'LLLL yyyy', { locale: hr })}</div>
          <button className="btn-outline !px-2.5" onClick={() => setMonth(addMonths(month, 1))} aria-label="Sljedeći mjesec"><ChevronRight size={16} /></button>
          <button className="btn-ghost ml-auto !py-1.5 text-xs" onClick={() => { setMonth(startOfMonth(new Date())); setDay(today()); }}>Danas</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-mute md:gap-1.5">
          {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((d) => <div key={d}>{d}</div>)}
          {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const list = byDay[d] || [];
            const isToday = d === today();
            return (
              <div key={d} onClick={() => setDay(d)} onDoubleClick={() => add(d)}
                className={`group relative cursor-pointer rounded-lg border p-1 text-left transition-colors md:min-h-[7.5rem] md:p-1.5 ${d === day ? 'border-navy bg-white ring-1 ring-navy' : 'border-black/5 bg-mist/60 hover:bg-white'} ${isToday ? '!bg-gold/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? 'text-wine' : 'text-navy'}`}>{Number(d.slice(8))}</span>
                  <button className="hidden rounded p-0.5 text-mute opacity-0 hover:text-navy group-hover:opacity-100 md:block" aria-label="Dodaj objavu" onClick={(e) => { e.stopPropagation(); add(d); }}><Plus size={13} /></button>
                </div>
                {/* mobitel: točkice */}
                <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                  {list.slice(0, 4).map((c) => <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ background: CONTENT_FIRMS[c.firm]?.color || '#6B7280' }} />)}
                </div>
                {/* računalo: čipovi */}
                <div className="mt-1 hidden space-y-0.5 md:block">
                  {list.slice(0, 4).map((c) => <Chip key={c.id} c={c} onClick={open} />)}
                  {list.length > 4 && <div className="text-[10px] font-semibold text-mute">+{list.length - 4} više</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
          {Object.entries(CONTENT_FIRMS).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: v.color }} />{v.label}</span>)}
          <span>✓ objavljeno · iscrtkano = ideja</span>
        </div>
      </div>

      <section className="mb-7">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xl font-semibold first-letter:uppercase">{format(parseISO(day), 'EEEE, d. MMMM', { locale: hr })}</h2>
          <button className="btn-outline !px-3 !py-1 text-xs" disabled={missing} onClick={() => add(day)}><Plus size={14} /> Dodaj</button>
        </div>
        {!selected.length && <div className="card p-4 text-sm text-soft">Ništa nije planirano za ovaj dan.</div>}
        <div className="grid gap-2 md:grid-cols-2">
          {selected.map((c) => (
            <button key={c.id} onClick={() => open(c)} className="card p-3 text-left" style={{ borderLeft: `4px solid ${CONTENT_FIRMS[c.firm]?.color || '#6B7280'}` }}>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PLATFORMS[c.platform]?.color }}>{PLATFORMS[c.platform]?.label}</span>
                <span className="text-soft">{CONTENT_FIRMS[c.firm]?.label}</span>
                <span className="badge bg-mist text-soft">{CONTENT_STATUS[c.status]}</span>
                {c.format && <span className="text-mute">{c.format}</span>}
              </div>
              <div className="mt-1 text-sm font-semibold">{c.title}</div>
              {c.brief && <div className="mt-0.5 line-clamp-2 text-xs text-soft">{c.brief}</div>}
              {c.owner && <div className="mt-1 text-[11px] text-mute">Radi: {c.owner}</div>}
            </button>
          ))}
        </div>
      </section>

      {ideas.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-2 text-xl font-semibold">Ideje bez datuma <span className="badge bg-ink align-middle text-white">{ideas.length}</span></h2>
          <p className="mb-3 text-xs text-mute">Klik na ideju i upišite planirani datum da se pojavi u kalendaru.</p>
          <div className="grid gap-2 md:grid-cols-2">{ideas.map((c) => <div key={c.id} className="card p-2"><Chip c={c} onClick={open} /><div className="mt-1 px-1 text-xs text-soft">{c.brief || c.notes}</div></div>)}</div>
        </section>
      )}

      {form && <ContentDialog item={form.item} defaults={form.defaults} onClose={() => setForm(null)} />}
    </>
  );
}
