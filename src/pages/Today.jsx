import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import FirmBadge from '../components/FirmBadge';
import { followUpState } from '../lib/leads';
import { isOverdue, sortTodos } from '../lib/todos';
import PageHeader from '../components/PageHeader';
import NewStayButton from '../components/NewStayButton';
import StayCard from '../components/StayCard';
import { today, plusDays, fmtLong } from '../lib/dates';

function Section({ title, date, arrivals, departures }) {
  const empty = !arrivals.length && !departures.length;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-2xl font-semibold">{title} <span className="ml-1 inline-block font-sans text-sm font-medium first-letter:uppercase text-mute">{fmtLong(date)}</span></h2>
      {empty && <div className="card p-5 text-sm text-soft">Nema dolazaka ni odlazaka.</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {arrivals.map((s) => <StayCard key={s.id} stay={s} highlight="arrival" defaultOpen />)}
        {departures.map((s) => <StayCard key={s.id} stay={s} highlight="departure" />)}
      </div>
    </section>
  );
}

function MyTasks() {
  const { todos, leads } = useData();
  const [me] = useMe();
  const mine = sortTodos(todos.filter((t) => !t.done && t.assignee === me && t.dueDate && t.dueDate <= today()));
  const due = leads.filter((l) => ['late', 'today'].includes(followUpState(l)));
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-2xl font-semibold">Moji zadaci danas <span className="badge bg-navy align-middle text-white">{mine.length}</span></h2>
      {!mine.length && <div className="card p-5 text-sm text-soft">Sve je odrađeno. 🎉</div>}
      <ul className="grid gap-2 md:grid-cols-2">
        {mine.map((t) => (
          <li key={t.id} className={`card flex items-center gap-3 p-3 ${isOverdue(t) ? 'ring-2 ring-red-500/60' : ''}`}>
            <button onClick={() => actions.toggleTodo(t.id, me)} aria-label="Označi odrađenim"
              className="group flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-soft/60 bg-white hover:border-emerald-600">
              <Check size={15} strokeWidth={3} className="text-emerald-600 opacity-0 group-hover:opacity-60" />
            </button>
            <span className="min-w-0 flex-1 text-sm font-semibold">{t.title}</span>
            <FirmBadge firm={t.firm} />
          </li>
        ))}
      </ul>
      {due.length > 0 && (
        <Link to="/kupci" className="card mt-3 flex items-center justify-between p-3.5 text-sm font-semibold">
          <span>{due.length} {due.length === 1 ? 'kupac čeka' : 'kupaca čeka'} follow-up (danas ili kasni)</span>
          <span className="text-wine">Otvori →</span>
        </Link>
      )}
    </section>
  );
}

export default function Today() {
  const { stays } = useData();
  const t = today();
  const tomorrow = plusDays(t, 1);
  const on = (date) => ({
    arrivals: stays.filter((s) => s.checkIn === date),
    departures: stays.filter((s) => s.checkOut === date),
  });

  return (
    <>
      <PageHeader title="Danas i sutra" subtitle="Zadaci, dolasci i odlasci"><NewStayButton /></PageHeader>
      <MyTasks />
      <Section title="Danas" date={t} {...on(t)} />
      <Section title="Sutra" date={tomorrow} {...on(tomorrow)} />
    </>
  );
}
