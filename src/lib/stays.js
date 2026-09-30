import { daysFromToday } from './dates';

export const SOURCES = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  rentlio_direct: 'Rentlio / direktno',
  other: 'Ostalo',
};

export const tasksOf = (stay, stayTasks) =>
  stayTasks.filter((t) => t.stayId === stay.id).sort((a, b) => a.sortOrder - b.sortOrder);

export function progressOf(tasks) {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, complete: tasks.length > 0 && done === tasks.length };
}

// Gost dolazi za ≤ 2 dana (uključujući danas), a osobne ili eVisitor nisu odrađeni.
export function warningOf(stay, tasks) {
  const days = daysFromToday(stay.checkIn);
  if (days < 0 || days > 2) return null;
  const open = tasks.filter((t) => (t.kind === 'id_received' || t.kind === 'evisitor') && !t.done);
  if (!open.length) return null;
  return { level: days <= 1 ? 'red' : 'gold', days, missing: open.map((t) => t.title) };
}

export const unitMap = (units, properties) => {
  const pm = Object.fromEntries(properties.map((p) => [p.id, p]));
  return Object.fromEntries(units.map((u) => [u.id, { ...u, property: pm[u.propertyId] }]));
};

// Za izbornik: objekti sa svojim jedinicama, poredano
export const groupedUnits = (units, properties) =>
  [...properties]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ property: p, units: units.filter((u) => u.propertyId === p.id).sort((a, b) => a.sortOrder - b.sortOrder) }))
    .filter((g) => g.units.length);

export const guests = (s) => s.adults + s.children;
