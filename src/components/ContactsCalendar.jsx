import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';
import { hr } from 'date-fns/locale';
import { TEAM } from '../seed';
import { allContacts, contactDay, CHANNELS } from '../lib/leads';
import { today, fmtLong } from '../lib/dates';

// Mali mjesečni kalendar: točkice na danima kad je netko kontaktiran; klik na dan = tko je koga
export default function ContactsCalendar({ leads, onOpenLead }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [day, setDay] = useState(today());
  const [who, setWho] = useState('');

  const byDay = useMemo(() => {
    const m = {};
    for (const c of allContacts(leads)) if (!who || c.by === who) (m[contactDay(c)] ||= []).push(c);
    return m;
  }, [leads, who]);

  const first = startOfMonth(month);
  const lead = (getDay(first) + 6) % 7; // ponedjeljak = 0
  const days = Array.from({ length: endOfMonth(month).getDate() }, (_, i) => format(new Date(month.getFullYear(), month.getMonth(), i + 1), 'yyyy-MM-dd'));
  const list = (byDay[day] || []).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="card mb-5 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn-outline !px-2.5" onClick={() => setMonth(addMonths(month, -1))} aria-label="Prošli mjesec"><ChevronLeft size={16} /></button>
        <div className="min-w-[8rem] text-center text-sm font-semibold first-letter:uppercase">{format(month, 'LLLL yyyy', { locale: hr })}</div>
        <button className="btn-outline !px-2.5" onClick={() => setMonth(addMonths(month, 1))} aria-label="Sljedeći mjesec"><ChevronRight size={16} /></button>
        <div className="ml-auto flex gap-1.5">
          {['', ...TEAM].map((n) => <button key={n} onClick={() => setWho(n)} className={`rounded-full px-3 py-1 text-xs font-semibold ${who === n ? 'bg-ink text-white' : 'bg-mist text-soft'}`}>{n || 'Svi'}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-mute">
        {['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'].map((d) => <div key={d}>{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const n = byDay[d]?.length || 0;
          return (
            <button key={d} onClick={() => setDay(d)} className={`flex h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold ${d === day ? 'bg-ink text-white' : d === today() ? 'bg-gold/30 text-navy' : 'text-navy hover:bg-mist'}`}>
              {Number(d.slice(8))}
              <span className={`text-[10px] leading-none ${n ? (d === day ? 'text-gold' : 'text-wine') : 'opacity-0'}`}>{n ? `● ${n}` : '·'}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-mist pt-3">
        <div className="mb-2 text-sm font-semibold first-letter:uppercase">{fmtLong(day)} · {list.length} {list.length === 1 ? 'kontakt' : 'kontakata'}</div>
        {!list.length && <p className="text-sm text-mute">Nitko nije kontaktiran ovaj dan.</p>}
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => onOpenLead(c.lead.id)} className="w-full rounded-xl bg-mist p-2.5 text-left text-sm">
                <div className="text-xs text-soft"><b className="text-navy">{c.by}</b> → <b className="text-navy">{c.lead.name}</b> · {format(new Date(c.at), 'HH:mm')} · {CHANNELS[c.channel] || ''}</div>
                <div className="line-clamp-2">{c.sentText}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
