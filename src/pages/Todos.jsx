import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { Check, Plus, CalendarClock } from 'lucide-react';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { TEAM } from '../seed';
import PageHeader from '../components/PageHeader';
import TodoForm from '../components/TodoForm';
import { PRIORITIES, isOverdue, sortTodos } from '../lib/todos';
import { fmtShort } from '../lib/dates';

function TodoCard({ todo, category, me, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id });
  const overdue = isOverdue(todo);
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, touchAction: 'manipulation' }}
      className={`card p-3.5 ${isDragging ? 'z-50 rotate-1 shadow-xl' : ''} ${overdue ? 'ring-2 ring-red-500/70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => actions.toggleTodo(todo.id, me)}
          aria-label={todo.done ? 'Poništi' : 'Označi odrađenim'}
          className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${todo.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-soft/60 bg-white hover:border-wine'}`}
        >
          {todo.done && <Check size={15} strokeWidth={3} />}
        </button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onEdit} className={`min-w-0 flex-1 text-left ${todo.done ? 'opacity-50' : ''}`}>
          <div className={`text-sm font-semibold ${todo.done ? 'line-through' : ''}`}>{todo.title}</div>
          {todo.description && <div className="mt-0.5 line-clamp-2 text-xs text-soft">{todo.description}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {category && <span className="badge text-white" style={{ background: category.color }}>{category.name}</span>}
            <span className={`badge ${PRIORITIES[todo.priority].badge}`}>{PRIORITIES[todo.priority].label}</span>
            {todo.dueDate && (
              <span className={`badge ${overdue ? 'bg-red-600 text-white' : 'bg-mist text-soft'}`}>
                <CalendarClock size={12} /> {overdue ? 'Rok prošao · ' : ''}{fmtShort(todo.dueDate)}
              </span>
            )}
          </div>
          {todo.done && <div className="mt-1.5 text-xs text-soft">{todo.doneBy}</div>}
        </button>
      </div>
      {/* Mobitel: prebacivanje izbornikom */}
      <div className="mt-2.5 flex items-center gap-2 border-t border-mist pt-2 lg:hidden" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-xs text-mute">Prebaci na:</span>
        <select className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold" value={todo.assignee} onChange={(e) => actions.updateTodo(todo.id, { assignee: e.target.value })}>
          {TEAM.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

function Column({ name, children, count, isMe }) {
  const { setNodeRef, isOver } = useDroppable({ id: name });
  return (
    <div ref={setNodeRef} className={`rounded-3xl p-3 transition-colors ${isOver ? 'bg-wine/10' : 'bg-white/50'}`}>
      <h2 className="mb-3 flex items-center gap-2 px-1 text-xl font-semibold">
        {name} <span className="badge bg-navy text-white">{count}</span>
        {isMe && <span className="badge bg-gold text-navy">ti</span>}
      </h2>
      <div className="min-h-[60px] space-y-3">{children}</div>
    </div>
  );
}

export default function Todos() {
  const { todos, categories } = useData();
  const [me] = useMe();
  const [form, setForm] = useState(null); // {} = novi, todo = uređivanje
  const [onlyMine, setOnlyMine] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );

  const visible = todos
    .filter((t) => !hideDone || !t.done)
    .filter((t) => !categoryId || t.categoryId === categoryId);
  const people = onlyMine ? [me] : TEAM;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const overdueCount = todos.filter(isOverdue).length;

  const onDragEnd = ({ active, over }) => {
    if (!over) return;
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
        <button onClick={() => setHideDone(!hideDone)} className={hideDone ? 'btn-primary' : 'btn-outline'}>Sakrij odrađene</button>
        <select className="field !w-auto !py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sve kategorije</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={`grid gap-4 ${onlyMine ? '' : 'lg:grid-cols-3'}`}>
          {people.map((name) => {
            const list = sortTodos(visible.filter((t) => t.assignee === name));
            return (
              <Column key={name} name={name} count={list.filter((t) => !t.done).length} isMe={name === me}>
                {list.map((t) => <TodoCard key={t.id} todo={t} category={catById[t.categoryId]} me={me} onEdit={() => setForm(t)} />)}
                {!list.length && <p className="px-1 py-3 text-sm text-mute">Nema zadataka.</p>}
              </Column>
            );
          })}
        </div>
      </DndContext>
      <p className="mt-4 hidden text-xs text-mute lg:block">Povuci zadatak u drugi stupac da ga prebaciš na drugu osobu.</p>

      {form && <TodoForm todo={form.id ? form : undefined} onClose={() => setForm(null)} />}
    </>
  );
}
