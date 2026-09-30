import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { actions } from '../data';
import { useMe } from '../lib/me';
import { fmtDateTime } from '../lib/dates';

export default function Checklist({ stayId, tasks }) {
  const [me] = useMe();
  const [title, setTitle] = useState('');

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    actions.addStayTask(stayId, title.trim());
    setTitle('');
  };

  return (
    <div>
      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="group flex items-start gap-3 rounded-xl px-1 py-1.5">
            <button
              onClick={() => actions.toggleStayTask(t.id, me)}
              aria-label={t.done ? 'Poništi' : 'Označi odrađenim'}
              className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-colors ${
                t.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-soft/60 bg-white hover:border-wine'
              }`}
            >
              {t.done && <Check size={15} strokeWidth={3} />}
            </button>
            <div className={`min-w-0 flex-1 ${t.done ? 'opacity-50' : ''}`}>
              <div className={`text-sm font-semibold ${t.done ? 'line-through' : ''}`}>{t.title}</div>
              {t.done && <div className="text-xs text-soft">{t.doneBy} · {fmtDateTime(t.doneAt)}</div>}
            </div>
            {t.kind === 'custom' && (
              <button onClick={() => actions.deleteStayTask(t.id)} className="p-1 text-mute hover:text-wine" aria-label="Obriši zadatak">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input className="field !py-2 text-sm" placeholder="Novi zadatak (npr. dječji krevetić)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn-ghost !px-3" aria-label="Dodaj zadatak"><Plus size={18} /></button>
      </form>
    </div>
  );
}
