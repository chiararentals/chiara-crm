import { useState } from 'react';
import Modal from './Modal';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { TEAM } from '../seed';
import { PRIORITIES } from '../lib/todos';
import { today } from '../lib/dates';

export default function TodoForm({ todo, defaults = {}, onClose }) {
  const { categories } = useData();
  const [me] = useMe();
  const editing = !!todo;
  const [f, setF] = useState({
    title: '', description: '', assignee: me, dueDate: '', priority: 'normal', categoryId: categories[0]?.id ?? null,
    ...defaults, ...todo,
  });
  const [newCat, setNewCat] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value || (k === 'dueDate' ? '' : e.target.value) });

  const save = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    let categoryId = f.categoryId;
    if (newCat.trim()) categoryId = actions.addCategory(newCat.trim());
    const data = { ...f, categoryId, dueDate: f.dueDate || null };
    if (editing) actions.updateTodo(todo.id, data);
    else actions.addTodo(data, me);
    onClose();
  };
  const remove = () => { if (confirm('Obrisati zadatak?')) { actions.deleteTodo(todo.id); onClose(); } };

  return (
    <Modal title={editing ? 'Uredi zadatak' : 'Novi zadatak'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div><label className="label">Naslov</label><input className="field" value={f.title} onChange={set('title')} autoFocus={!editing} /></div>
        <div><label className="label">Opis (opcionalno)</label><textarea className="field min-h-[70px]" value={f.description} onChange={set('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Osoba</label>
            <select className="field" value={f.assignee} onChange={set('assignee')}>{TEAM.map((n) => <option key={n}>{n}</option>)}</select>
          </div>
          <div><label className="label">Rok</label><input type="date" className="field" min={editing ? undefined : today()} value={f.dueDate || ''} onChange={set('dueDate')} /></div>
          <div>
            <label className="label">Prioritet</label>
            <select className="field" value={f.priority} onChange={set('priority')}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Kategorija</label>
            <select className="field" value={f.categoryId ?? ''} onChange={set('categoryId')}>
              <option value="">— bez —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">…ili nova kategorija</label><input className="field" placeholder="npr. Knjigovodstvo" value={newCat} onChange={(e) => setNewCat(e.target.value)} /></div>
        <div className="flex gap-2 pt-1">
          {editing && <button type="button" onClick={remove} className="btn-outline text-wine">Obriši</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Odustani</button>
          <button className="btn-primary" disabled={!f.title.trim()}>Spremi</button>
        </div>
      </form>
    </Modal>
  );
}
