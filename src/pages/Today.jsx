import { useData } from '../data';
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
      <PageHeader title="Danas i sutra" subtitle="Dolasci i odlasci"><NewStayButton /></PageHeader>
      <Section title="Danas" date={t} {...on(t)} />
      <Section title="Sutra" date={tomorrow} {...on(tomorrow)} />
    </>
  );
}
