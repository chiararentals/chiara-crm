import { daysFromToday } from './dates';

export const PRIORITIES = {
  high: { label: 'Visok', badge: 'bg-red-100 text-red-800' },
  normal: { label: 'Srednji', badge: 'bg-gold/30 text-navy' },
  low: { label: 'Nizak', badge: 'bg-mist text-soft' },
};
const RANK = { high: 0, normal: 1, low: 2 };

export const isOverdue = (t) => !t.done && t.dueDate && daysFromToday(t.dueDate) < 0;

// neodrađeni prvo; po roku, pa po prioritetu
export function sortTodos(list) {
  return [...list].sort((a, b) =>
    Number(a.done) - Number(b.done) ||
    (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
    RANK[a.priority] - RANK[b.priority]);
}
