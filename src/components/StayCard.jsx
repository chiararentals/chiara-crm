import { useState } from 'react';
import { AlertTriangle, ChevronDown, Mail, MessageCircle, Pencil, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useData } from '../data';
import Checklist from './Checklist';
import MessageDialog from './MessageDialog';
import StayForm from './StayForm';
import UnitLabel from './UnitLabel';
import { SOURCES, tasksOf, progressOf, warningOf, unitMap, guests } from '../lib/stays';
import { fmtShort, daysFromToday } from '../lib/dates';

export function ProgressBadge({ done, total }) {
  const color = done === total ? 'bg-emerald-100 text-emerald-800' : done === 0 ? 'bg-red-100 text-red-800' : 'bg-gold/30 text-navy';
  return <span className={`badge ${color}`}>{done}/{total}</span>;
}

export default function StayCard({ stay, defaultOpen = false, highlight }) {
  const { stayTasks, units, properties, templates } = useData();
  const [open, setOpen] = useState(defaultOpen);
  const [dialog, setDialog] = useState(null); // 'whatsapp' | 'email' | 'edit'

  const tasks = tasksOf(stay, stayTasks);
  const progress = progressOf(tasks);
  const warning = warningOf(stay, tasks);
  const unit = unitMap(units, properties)[stay.unitId];
  const inDays = daysFromToday(stay.checkIn);

  return (
    <div className={`card overflow-hidden ${warning ? (warning.level === 'red' ? 'ring-2 ring-red-500/70' : 'ring-2 ring-gold') : ''}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {highlight === 'arrival' && <span className="badge bg-navy text-white"><ArrowRight size={12} /> Dolazak</span>}
            {highlight === 'departure' && <span className="badge bg-mist text-soft"><ArrowLeft size={12} /> Odlazak</span>}
            <ProgressBadge {...progress} />
            {warning && (
              <span className={`badge ${warning.level === 'red' ? 'bg-red-600 text-white' : 'bg-gold text-navy'}`}>
                <AlertTriangle size={12} />
                {inDays === 0 ? 'Dolazi danas' : inDays === 1 ? 'Dolazi sutra' : `Dolazi za ${inDays} d`} – nedostaje: {warning.missing.map((m) => (m.includes('eVisitor') ? 'eVisitor' : 'osobne')).join(', ')}
              </span>
            )}
          </div>
          <div className="mt-1.5 font-serif text-lg font-semibold leading-tight">{stay.guestName}</div>
          <UnitLabel unit={unit} className="text-sm text-soft" />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-soft">
            <span>{fmtShort(stay.checkIn)}{stay.arrivalTime ? ` · ${stay.arrivalTime}` : ''} → {fmtShort(stay.checkOut)}</span>
            <span className="inline-flex items-center gap-1"><Users size={14} />{stay.adults}{stay.children ? `+${stay.children}` : ''}</span>
            <span className="text-mute">{SOURCES[stay.source]}</span>
          </div>
        </div>
        <ChevronDown size={20} className={`mt-1 flex-none text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex gap-2 border-t border-mist px-4 py-2.5">
        <button className="btn-ghost !px-3 !py-2 flex-1" onClick={() => setDialog('whatsapp')}><MessageCircle size={16} /> WhatsApp</button>
        <button className="btn-ghost !px-3 !py-2 flex-1" onClick={() => setDialog('email')}><Mail size={16} /> Email</button>
        <button className="btn-ghost !px-3 !py-2" onClick={() => setDialog('edit')} aria-label="Uredi"><Pencil size={16} /></button>
      </div>

      {open && (
        <div className="border-t border-mist bg-white px-4 py-3">
          <Checklist stayId={stay.id} tasks={tasks} />
          {stay.notes && <p className="mt-3 rounded-xl bg-mist p-3 text-sm text-soft">{stay.notes}</p>}
        </div>
      )}

      {(dialog === 'whatsapp' || dialog === 'email') && (
        <MessageDialog stay={stay} unit={unit} templates={templates} channel={dialog} onClose={() => setDialog(null)} />
      )}
      {dialog === 'edit' && <StayForm stay={stay} onClose={() => setDialog(null)} />}
    </div>
  );
}
