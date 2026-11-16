import { useState } from 'react';
import Modal from './Modal';
import { FirmPicker } from './FirmBadge';
import { actions } from '../data';
import { useMe } from '../lib/me';
import { TEAM } from '../seed';
import { PRIORITIES } from '../lib/todos';
import { today } from '../lib/dates';

export default function TodoForm({ todo, defaults = {}, onClose }) {
  const [me] = useMe();
  const editing = !!todo;
  const [f, setF] = useState({
    title: '', description: '', assignee: me, dueDate: today(), priority: 'normal', firm: 'chiara',
    ...defaults, ...todo,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    const data = { ...f, dueDate: f.dueDate || null };
    if (editing) actions.updateTodo(todo.id, data);
    else actions.addTodo(data, me);
    onClose();
  };
  const remove = () => { if (confirm('Obrisati zadatak?')) { actions.deleteTodo(todo.id); onClose(); } };

  return (
    <Modal title={editing ? 'Uredi zadatak' : 'Novi zadatak'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div><label className="label">Firma</label><FirmPicker value={f.firm} onChange={(firm) => setF({ ...f, firm })} /></div>
        <div><label className="label">Zadatak</label><input className="field" value={f.title} onChange={set('title')} autoFocus={!editing} /></div>
        <div><label className="label">Napomena (opcionalno)</label><textarea className="field min-h-[70px]" value={f.description} onChange={set('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Osoba</label>
            <select className="field" value={f.assignee} onChange={set('assignee')}>{TEAM.map((n) => <option key={n}>{n}</option>)}</select>
          </div>
          <div><label className="label">Rok</label><input type="date" className="field" value={f.dueDate || ''} onChange={set('dueDate')} /></div>
          <div>
            <label className="label">Prioritet</label>
            <select className="field" value={f.priority} onChange={set('priority')}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        {todo?.recurringId && <p className="text-xs text-mute">Ovo je svakodnevni zadatak. Mijenja se u Postavkama → Svakodnevni zadaci.</p>}
        <div className="flex gap-2 pt-1">
          {editing && !todo.recurringId && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={!f.title.trim()}>Spremi</button>
        </div>
      </form>
    </Modal>
  );
}
