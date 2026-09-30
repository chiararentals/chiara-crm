import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { hr } from 'date-fns/locale';
import { useData } from '../data';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StayCard from '../components/StayCard';
import StayForm from '../components/StayForm';
import { groupedUnits, tasksOf, progressOf } from '../lib/stays';
import { today, plusDays, diffDays } from '../lib/dates';

const DAYS = 21;
const COL = 44; // px po danu
const LABEL = typeof window !== "undefined" && window.innerWidth < 640 ? 112 : 150; // px širina stupca s imenima

export default function Calendar() {
  const { stays, units, properties, stayTasks } = useData();
  const [start, setStart] = useState(plusDays(today(), -2));
  const [openStay, setOpenStay] = useState(null);
  const [newStay, setNewStay] = useState(null);
  const days = Array.from({ length: DAYS }, (_, i) => plusDays(start, i));
  const t = today();

  const renderRow = (u) => {
    const bars = stays.filter((s) => s.unitId === u.id && s.checkOut > start && s.checkIn < plusDays(start, DAYS));
    return (
      <div key={u.id} className="relative flex border-b border-mist" style={{ height: 40 }}>
        <div className="sticky left-0 z-10 flex flex-none items-center bg-white px-3 text-xs font-semibold" style={{ width: LABEL }}>
          <span className="line-clamp-2 leading-tight">{u.name}</span>
        </div>
        <div className="relative flex">
          {days.map((d) => (
            <button key={d} onClick={() => setNewStay({ unitId: u.id, checkIn: d, checkOut: plusDays(d, 3) })}
              aria-label={`Novi boravak ${d}`}
              className={`h-full flex-none border-l border-mist hover:bg-mist ${d === t ? 'bg-gold/15' : ''}`} style={{ width: COL }} />
          ))}
          {bars.map((s) => {
            // boravak počinje u podne dana dolaska i završava u podne dana odlaska
            const from = Math.max(diffDays(s.checkIn, start), -0.5);
            const to = Math.min(diffDays(s.checkOut, start), DAYS - 0.5);
            const p = progressOf(tasksOf(s, stayTasks));
            return (
              <button key={s.id} onClick={() => setOpenStay(s.id)}
                className={`absolute top-1.5 h-7 truncate rounded-lg px-2 text-left text-xs font-semibold text-white shadow-sm ${p.complete ? 'bg-emerald-700' : 'bg-wine hover:bg-wine-dark'}`}
                style={{ left: (from + 0.5) * COL + 2, width: (to - from) * COL - 4 }}>
                {s.guestName}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Kalendar" subtitle="Zauzetost po jedinicama">
        <div className="flex items-center gap-2">
          <button className="btn-outline !px-3" onClick={() => setStart(plusDays(start, -7))} aria-label="Tjedan unatrag"><ChevronLeft size={18} /></button>
          <button className="btn-outline" onClick={() => setStart(plusDays(today(), -2))}>Danas</button>
          <button className="btn-outline !px-3" onClick={() => setStart(plusDays(start, 7))} aria-label="Tjedan naprijed"><ChevronRight size={18} /></button>
        </div>
      </PageHeader>
      <div className="card overflow-x-auto">
        <div style={{ width: LABEL + DAYS * COL }}>
          <div className="sticky top-0 flex border-b border-mute/30 bg-white">
            <div className="sticky left-0 z-10 flex-none bg-white" style={{ width: LABEL }} />
            {days.map((d) => (
              <div key={d} className={`flex-none border-l border-mist py-1.5 text-center text-[11px] leading-tight ${d === t ? 'bg-gold/30 font-bold' : 'text-soft'}`} style={{ width: COL }}>
                <div className="capitalize">{format(parseISO(d), 'EEE', { locale: hr })}</div>
                <div className="font-semibold">{format(parseISO(d), 'd.M.')}</div>
              </div>
            ))}
          </div>
          {groupedUnits(units, properties).map(({ property, units: us }) => (
            <div key={property.id}>
              {!(us.length === 1 && us[0].name === property.name) && <div className="bg-mist px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-soft" style={{ width: LABEL + DAYS * COL }}>
                <span className="sticky left-3 inline-block">{property.name}</span>
              </div>}
              {us.map(renderRow)}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-mute">Klik na boravak otvara detalje, klik na prazno polje dodaje novi boravak. Zeleno = sve odrađeno.</p>

      {openStay && (
        <Modal title="Boravak" onClose={() => setOpenStay(null)}>
          <StayCard stay={stays.find((s) => s.id === openStay)} defaultOpen />
        </Modal>
      )}
      {newStay && <StayForm defaults={newStay} onClose={() => setNewStay(null)} />}
    </>
  );
}
