import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import { useData } from '../data';
import PageHeader from '../components/PageHeader';
import { TEAM } from '../seed';
import { TEMPERATURES, allContacts, contactDay, CHANNELS, followUpState, isClosed, lateLeads, isHidden, leadKind } from '../lib/leads';
import { fmtDate, fmtDateTime, iso, today } from '../lib/dates';

const dayOf = (isoStr) => contactDay({ at: isoStr });
const PRESETS = { today: 'Danas', yesterday: 'Jučer', week: 'Ovaj tjedan', lastweek: 'Prošli tjedan', custom: 'Odaberi datume…' };

function rangeOf(preset, from, to) {
  const now = new Date();
  const mon = (d) => startOfWeek(d, { weekStartsOn: 1 });
  switch (preset) {
    case 'today': return [today(), today()];
    case 'yesterday': { const y = iso(addDays(now, -1)); return [y, y]; }
    case 'lastweek': { const m = addDays(mon(now), -7); return [iso(m), iso(addDays(m, 6))]; }
    case 'custom': return [from || today(), to || today()];
    default: return [iso(mon(now)), iso(endOfWeek(now, { weekStartsOn: 1 }))];
  }
}

export default function Overview() {
  const { leads: allLeads, todos, stayTasks, stays } = useData();
  const leads = allLeads.filter((l) => !isHidden(l));
  const [preset, setPreset] = useState('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(30);
  const [a, b] = rangeOf(preset, from, to);
  const inR = (isoStr) => { if (!isoStr) return false; const d = dayOf(isoStr); return d >= a && d <= b; };

  const { people, feed } = useMemo(() => {
    const stayName = Object.fromEntries(stays.map((s) => [s.id, s.guestName]));
    const contacts = allContacts(leads).filter((c) => inR(c.at));
    const doneTodos = todos.filter((t) => t.done && t.doneBy && inR(t.doneAt));
    const doneChecks = stayTasks.filter((t) => t.done && t.doneBy && inR(t.doneAt));
    const people = TEAM.map((name) => {
      const c = contacts.filter((x) => x.by === name);
      return {
        name, contacts: c.length, leads: new Set(c.map((x) => x.lead.id)).size,
        todos: doneTodos.filter((t) => t.doneBy === name).length,
        checks: doneChecks.filter((t) => t.doneBy === name).length,
        overdue: todos.filter((t) => !t.done && t.assignee === name && t.dueDate && t.dueDate < today()).length,
      };
    });
    const feed = [
      ...contacts.map((c) => ({ at: c.at, by: c.by, text: `Kupac ${c.lead.name} (${CHANNELS[c.channel] || c.channel}): ${c.sentText}` })),
      ...doneTodos.map((t) => ({ at: t.doneAt, by: t.doneBy, text: `Zadatak: ${t.title}` })),
      ...doneChecks.map((t) => ({ at: t.doneAt, by: t.doneBy, text: `Boravak ${stayName[t.stayId] || ''}: ${t.title}` })),
    ].sort((x, y) => y.at.localeCompare(x.at));
    return { people, feed };
  }, [leads, todos, stayTasks, stays, a, b]);

  const open = leads.filter((l) => !isClosed(l) && leadKind(l) === 'kupac');
  const lastContactAge = (l) => {
    // računa se od zadnjeg kontakta u CRM-u, a ako ga nema, od dana kad je kupac ušao u CRM (stari datumi iz tablice se ne broje)
    const last = (l.contacts || []).map((c) => dayOf(c.at)).sort().pop() || (l.createdAt ? dayOf(l.createdAt) : null);
    return last ? Math.floor((new Date(today()) - new Date(last)) / 864e5) : null;
  };
  const stale = open.filter((l) => { const n = lastContactAge(l); return n != null && n >= 7; }).length;
  const label = a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`;

  const summary = [
    `Pregled rada ${label}`,
    ...people.map((p) => `${p.name}: ${p.contacts} kontakata (${p.leads} kupaca), ${p.todos} zadataka, ${p.checks} stavki checkliste`),
    `Kupci: ${open.filter((l) => l.temperature === 'vruc').length} vrućih, ${open.filter((l) => l.temperature === 'topao').length} toplih, ${lateLeads(leads).length} kasni, ${stale} bez kontakta 7+ dana`,
  ].join('\n');

  return (
    <>
      <PageHeader title="Pregled rada" subtitle={label}>
        <button className="btn-outline" onClick={() => navigator.clipboard?.writeText(summary)}><Copy size={16} /> Kopiraj sažetak</button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {Object.entries(PRESETS).map(([k, v]) => <button key={k} onClick={() => setPreset(k)} className={preset === k ? 'btn-primary' : 'btn-outline'}>{v}</button>)}
        {preset === 'custom' && <>
          <input type="date" className="field !w-auto !py-2 text-sm" value={from || a} onChange={(e) => setFrom(e.target.value)} aria-label="Od" />
          <span className="text-mute">–</span>
          <input type="date" className="field !w-auto !py-2 text-sm" value={to || b} onChange={(e) => setTo(e.target.value)} aria-label="Do" />
        </>}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {people.map((p) => (
          <div key={p.name} className="card p-4">
            <h2 className="mb-2 text-xl font-semibold">{p.name}</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-soft">Kontaktirani kupci</dt><dd className="font-bold">{p.leads}</dd></div>
              <div className="flex justify-between"><dt className="text-soft">Zabilježeni kontakti</dt><dd className="font-bold">{p.contacts}</dd></div>
              <div className="flex justify-between"><dt className="text-soft">Odrađeni zadaci</dt><dd className="font-bold">{p.todos}</dd></div>
              <div className="flex justify-between"><dt className="text-soft">Checklista boravaka</dt><dd className="font-bold">{p.checks}</dd></div>
              <div className="flex justify-between"><dt className="text-soft">Zadaci koji kasne</dt><dd className={`font-bold ${p.overdue ? 'text-red-700' : ''}`}>{p.overdue}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <section className="card mb-6 p-4">
        <h2 className="mb-3 text-xl font-semibold">Kupci trenutno</h2>
        <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
          {[[open.filter((l) => l.temperature === 'vruc').length, TEMPERATURES.vruc.label], [open.filter((l) => l.temperature === 'topao').length, TEMPERATURES.topao.label],
            [lateLeads(leads).length, 'Kasni follow-up'], [stale, 'Bez kontakta 7+ dana']].map(([n, l]) => (
            <div key={l} className="rounded-xl bg-mist p-3"><div className="text-2xl font-bold">{n}</div><div className="text-xs text-soft">{l}</div></div>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">Za danas: {open.filter((l) => followUpState(l) === 'today').length} follow-upa. „Bez kontakta” se računa od zadnjeg kontakta zabilježenog u CRM-u (ili od dana uvoza kupca).</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Što je napravljeno <span className="badge bg-ink align-middle text-white">{feed.length}</span></h2>
        {!feed.length && <div className="card p-5 text-sm text-soft">U ovom razdoblju još nema zabilježenog rada.</div>}
        <ul className="space-y-2">
          {feed.slice(0, limit).map((f, i) => (
            <li key={i} className="card p-3 text-sm">
              <div className="text-xs text-soft"><b className="text-navy">{f.by}</b> · {fmtDateTime(f.at)}</div>
              <div className="line-clamp-3">{f.text}</div>
            </li>
          ))}
        </ul>
        {feed.length > limit && <button className="btn-outline mt-3" onClick={() => setLimit(limit + 50)}>Prikaži još ({feed.length - limit})</button>}
      </section>
    </>
  );
}
