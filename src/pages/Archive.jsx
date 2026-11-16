import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FirmBadge, { FirmPicker } from '../components/FirmBadge';
import { StayList } from './Stays';
import { actions, useData } from '../data';
import { useMe } from '../lib/me';
import { fmtDateTime } from '../lib/dates';

function DoneTasks() {
  const { todos } = useData();
  const [me] = useMe();
  const [firm, setFirm] = useState('');
  const list = todos
    .filter((t) => t.done && (!firm || t.firm === firm))
    .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  return (
    <>
      <div className="mb-4"><FirmPicker value={firm} onChange={(v) => setFirm(firm === v ? '' : v)} allowNone /></div>
      {!list.length && <div className="card p-5 text-sm text-soft">Još nema odrađenih zadataka.</div>}
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="card flex items-start gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold line-through decoration-mute/60">{t.title}</div>
              {t.description && <div className="mt-0.5 text-xs text-soft">{t.description}</div>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-soft">
                <FirmBadge firm={t.firm} />
                <span>{t.doneBy}{t.doneAt ? ` · ${fmtDateTime(t.doneAt)}` : ''}</span>
              </div>
            </div>
            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => actions.toggleTodo(t.id, me)}>
              <RotateCcw size={14} /> Vrati
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Archive() {
  const [tab, setTab] = useState('tasks');
  return (
    <>
      <PageHeader title="Arhiva" subtitle={tab === 'tasks' ? 'Odrađeni zadaci' : 'Prošli boravci'} />
      <div className="mb-5 flex gap-2">
        <button className={tab === 'tasks' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('tasks')}>Odrađeni zadaci</button>
        <button className={tab === 'stays' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('stays')}>Prošli boravci</button>
      </div>
      {tab === 'tasks' ? <DoneTasks /> : <StayList archive />}
    </>
  );
}
