import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { Check, Plus, CalendarClock, PhoneCall } from 'lucide-react';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { TEAM, FIRMS } from '../seed';
import PageHeader from '../components/PageHeader';
import FirmBadge, { FirmFilter, firmCardStyle } from '../components/FirmBadge';
import { useFirm } from '../lib/firm';
import TodoForm from '../components/TodoForm';
import { PRIORITIES, isOverdue, sortTodos } from '../lib/todos';
import { fmtShort, today, plusDays } from '../lib/dates';
import { TEMPERATURES, followUpState, leadOwner } from '../lib/leads';
import ContactDialog from '../components/ContactDialog';
import LeadDetail from '../components/LeadDetail';

function TodoCard({ todo, me, onEdit, onDone }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id });
  const overdue = isOverdue(todo);
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ ...firmCardStyle(todo.firm), transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, touchAction: 'manipulation' }}
      className={`rounded-xl border border-black/5 p-3.5 shadow-card ${isDragging ? 'z-50 rotate-1 shadow-xl' : ''} ${overdue ? 'border-red-300' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDone(todo)}
          aria-label="Označi odrađenim"
          className="group mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-soft/60 bg-white hover:border-emerald-600"
        >
          <Check size={15} strokeWidth={3} className="text-emerald-600 opacity-0 group-hover:opacity-60" />
        </button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="text-sm font-semibold">{todo.title}</div>
          {todo.description && <div className="mt-0.5 line-clamp-2 text-xs text-soft">{todo.description}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <FirmBadge firm={todo.firm} />
            <span className={`badge ${PRIORITIES[todo.priority].badge}`}>{PRIORITIES[todo.priority].label}</span>
            {todo.dueDate && (
              <span className={`badge ${overdue ? 'bg-red-600 text-white' : 'bg-mist text-soft'}`}>
                <CalendarClock size={12} /> {overdue ? 'Rok prošao · ' : ''}{fmtShort(todo.dueDate)}
              </span>
            )}
          </div>
        </button>
      </div>
      {/* Prebacivanje zadatka na drugu osobu (na računalu se može i povući) */}
      <div className="mt-2.5 flex items-center gap-2 border-t border-mist pt-2" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-xs text-mute">Prebaci na:</span>
        <select className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold" value={todo.assignee} onChange={(e) => actions.updateTodo(todo.id, { assignee: e.target.value })}>
          {TEAM.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// Follow-up kupca prikazan kao zadatak (kupci kojima je rok danas ili je prošao)
function FollowUpCard({ lead, onOpen, onDone }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `lead:${lead.id}` });
  const late = followUpState(lead) === 'late';
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ ...firmCardStyle(lead.firm), transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, touchAction: 'manipulation' }}
      className={`rounded-xl border border-black/5 p-3.5 shadow-card ${isDragging ? 'z-50 rotate-1 shadow-xl' : ''} ${late ? 'border-red-300' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDone(lead)} aria-label="Follow-up odrađen"
          className="group mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-soft/60 bg-white hover:border-emerald-600">
          <Check size={15} strokeWidth={3} className="text-emerald-600 opacity-0 group-hover:opacity-60" />
        </button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpen(lead.id)} className="min-w-0 flex-1 text-left">
          <div className="text-sm font-semibold">Follow-up: {lead.name}</div>
          {lead.nextStep && <div className="mt-0.5 line-clamp-2 text-xs text-soft">{lead.nextStep}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="badge bg-navy/10 text-navy"><PhoneCall size={12} /> Kupac</span>
            <FirmBadge firm={lead.firm} />
            <span className={`badge ${TEMPERATURES[lead.temperature]?.badge}`}>{TEMPERATURES[lead.temperature]?.label}</span>
            <span className={`badge ${late ? 'bg-red-600 text-white' : 'bg-mist text-soft'}`}><CalendarClock size={12} /> {late ? 'Rok prošao · ' : ''}{fmtShort(lead.followUpDate)}</span>
          </div>
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-2 border-t border-mist pt-2" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-xs text-mute">Prebaci na:</span>
        <select className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold" value={leadOwner(lead)} onChange={(e) => actions.updateLead(lead.id, { owner: e.target.value })}>
          {TEAM.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

function Column({ name, children, count, isMe }) {
  const { setNodeRef, isOver } = useDroppable({ id: name });
  return (
    <div ref={setNodeRef} className={`rounded-2xl p-3 transition-colors ${isOver ? 'bg-black/[0.07]' : 'bg-black/[0.03]'}`}>
      <h2 className="mb-3 flex items-center gap-2 px-1 text-xl font-semibold">
        {name} <span className="badge bg-ink text-white">{count}</span>
        {isMe && <span className="badge bg-gold/60 text-navy">ti</span>}
      </h2>
      <div className="min-h-[60px] space-y-3">{children}</div>
    </div>
  );
}

export default function Todos() {
  const { todos, leads } = useData();
  const [me] = useMe();
  const [form, setForm] = useState(null); // {} = novi, todo = uređivanje
  const [onlyMine, setOnlyMine] = useState(false);
  const [firm] = useFirm();
  const [undo, setUndo] = useState(null);
  const [contact, setContact] = useState(null);
  const [detail, setDetail] = useState(null);
  const [when, setWhen] = useState('danas'); // danas | sutra | tjedan | svi | datum
  const [pickDate, setPickDate] = useState(plusDays(today(), 2));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );

  // odrađeni zadaci odmah nestaju s ploče (vide se u Arhiva → Odrađeni zadaci)
  // Razdoblje: Danas = kasne + danas (+ zadaci bez roka), Sutra = samo sutra, Tjedan = do +6 dana, Svi = sve, Datum = točno taj dan
  const t0 = today(), tom = plusDays(t0, 1), wk = plusDays(t0, 6);
  const inWhen = (d, noDateOk) => {
    switch (when) {
      case 'danas': return d ? d <= t0 : noDateOk;
      case 'sutra': return d === tom;
      case 'tjedan': return d ? d <= wk : noDateOk;
      case 'datum': return d === pickDate;
      default: return true;
    }
  };
  const visible = todos.filter((t) => !t.done).filter((t) => !firm || t.firm === firm).filter((t) => inWhen(t.dueDate, true));
  const people = onlyMine ? [me] : TEAM;
  // follow-upi kupaca: po izabranom razdoblju ("Svi" = samo kasni i današnji, da ne bude stotine kartica)
  const followUps = leads
    .filter((l) => ['late', 'today', 'soon'].includes(followUpState(l)) && (!firm || l.firm === firm))
    .filter((l) => (when === 'svi' ? l.followUpDate <= t0 : inWhen(l.followUpDate, false)))
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  const overdueCount = todos.filter(isOverdue).length + leads.filter((l) => followUpState(l) === 'late').length;
  const counts = Object.fromEntries(Object.keys(FIRMS).map((k) => [k, todos.filter((t) => !t.done && t.firm === k).length]));

  const markDone = (todo) => {
    actions.toggleTodo(todo.id, me);
    setUndo(todo);
    clearTimeout(markDone.timer);
    markDone.timer = setTimeout(() => setUndo(null), 6000);
  };

  const onDragEnd = ({ active, over }) => {
    if (!over) return;
    if (String(active.id).startsWith('lead:')) {
      actions.updateLead(String(active.id).slice(5), { owner: over.id });
      return;
    }
    const todo = todos.find((t) => t.id === active.id);
    if (todo && todo.assignee !== over.id) actions.updateTodo(todo.id, { assignee: over.id });
  };

  return (
    <>
      <PageHeader title="Zadaci" subtitle={overdueCount ? `${overdueCount} ${overdueCount === 1 ? 'zadatak kasni' : 'zadataka kasni'}` : 'Sve je na vrijeme'}>
        <button className="btn-primary" onClick={() => setForm({})}><Plus size={18} /> Novi zadatak</button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setOnlyMine(!onlyMine)} className={onlyMine ? 'btn-primary' : 'btn-outline'}>Moji zadaci</button>
        <FirmFilter counts={counts} />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[['danas', 'Danas'], ['sutra', 'Sutra'], ['tjedan', 'Ovaj tjedan'], ['svi', 'Svi'], ['datum', 'Odaberi dan']].map(([k, label]) => (
          <button key={k} onClick={() => setWhen(k)} className={when === k ? 'btn-primary !py-1.5' : 'btn-outline !py-1.5'}>{label}</button>
        ))}
        {when === 'datum' && <input type="date" className="field !w-auto !py-2 text-sm" value={pickDate} onChange={(e) => setPickDate(e.target.value)} aria-label="Dan" />}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={`grid gap-4 ${onlyMine ? '' : 'lg:grid-cols-3'}`}>
          {people.map((name) => {
            const list = sortTodos(visible.filter((t) => t.assignee === name));
            const fups = followUps.filter((l) => leadOwner(l) === name);
            return (
              <Column key={name} name={name} count={list.length + fups.length} isMe={name === me}>
                {fups.map((l) => <FollowUpCard key={l.id} lead={l} onOpen={setDetail} onDone={setContact} />)}
                {list.map((t) => <TodoCard key={t.id} todo={t} me={me} onEdit={() => setForm(t)} onDone={markDone} />)}
                {!list.length && !fups.length && <p className="px-1 py-3 text-sm text-mute">Nema zadataka.</p>}
              </Column>
            );
          })}
        </div>
      </DndContext>
      <p className="mt-4 hidden text-xs text-mute lg:block">Povuci zadatak u drugi stupac ili ga prebaci izbornikom na kartici. Odrađeni zadaci nestaju odavde i nalaze se u Arhiva → Odrađeni zadaci.</p>

      {undo && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl lg:bottom-6">
          <span className="truncate">Odrađeno: {undo.title}</span>
          <button className="font-semibold text-gold" onClick={() => { actions.toggleTodo(undo.id, me); setUndo(null); }}>Poništi</button>
        </div>
      )}
      {detail && <LeadDetail leadId={detail} onClose={() => setDetail(null)} />}
      {contact && <ContactDialog lead={contact} onClose={() => setContact(null)} />}
      {form && <TodoForm todo={form.id ? form : undefined} onClose={() => setForm(null)} />}
    </>
  );
}
