import { useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../data';
import PageHeader from '../components/PageHeader';
import NewStayButton from '../components/NewStayButton';
import StayCard from '../components/StayCard';
import { groupedUnits, tasksOf } from '../lib/stays';
import { today } from '../lib/dates';

// Zajednička lista za "Boravci" i "Arhiva"
export function StayList({ archive }) {
  const { stays, stayTasks, units, properties } = useData();
  const [q, setQ] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const t = today();

  const unitsOfProperty = new Set(units.filter((u) => !propertyId || u.propertyId === propertyId).map((u) => u.id));
  const list = stays
    .filter((s) => (archive ? s.checkOut < t : s.checkOut >= t))
    .filter((s) => s.guestName.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((s) => unitsOfProperty.has(s.unitId))
    .filter((s) => !from || s.checkOut >= from)
    .filter((s) => !to || s.checkIn <= to)
    .filter((s) => !onlyOpen || tasksOf(s, stayTasks).some((x) => !x.done))
    .sort((a, b) => (archive ? b.checkIn.localeCompare(a.checkIn) : a.checkIn.localeCompare(b.checkIn)));

  return (
    <>
      <div className="card mb-5 space-y-3 p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="field !pl-10" placeholder="Traži po imenu gosta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <select className="field col-span-2 md:col-span-1" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Svi objekti</option>
            {groupedUnits(units, properties).map(({ property }) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
          <div><label className="label">Od</label><input type="date" className="field !py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">Do</label><input type="date" className="field !py-2" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {!archive && (
            <label className="col-span-2 flex items-center gap-2 text-sm font-semibold md:col-span-1 md:self-end md:pb-2.5">
              <input type="checkbox" className="h-5 w-5 accent-[#68051A]" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
              Samo s neodrađenim
            </label>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm text-soft">{list.length} {list.length === 1 ? 'boravak' : 'boravaka'}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((s) => <StayCard key={s.id} stay={s} />)}
      </div>
      {!list.length && <div className="card p-6 text-center text-soft">Nema rezultata.</div>}
    </>
  );
}

export default function Stays() {
  return (
    <>
      <PageHeader title="Svi boravci" subtitle="Trenutni i nadolazeći"><NewStayButton /></PageHeader>
      <StayList />
    </>
  );
}
