import { today, plusDays } from '../lib/dates';
import { TEMPLATES_SEED } from './templates';

export const TEAM = ['Marko', 'Ana', 'Lea'];

// Objekt -> jedinice. `null` = objekt ima samo jednu jedinicu (isto ime kao objekt).
const PROPERTIES = [
  ['Villa Garden Ičići', ['1. kat', '2. kat']],
  ['Apartments Vila Chiara', ['Mascagni 1', 'Istriana 2', 'Vienna 3', 'Moderna 4']],
  ['Vila Chiara Ground Floor', ['Rustica 5', 'Residence 6']],
  ['Vila Sokol', ['Šabić 1 (veliki)', 'Šabić 2 (mali)', 'Šabić 3 (mali)']],
  ['Apartman Lara Rooftop', null],
  ['Apartman Stella Rooftop', null],
  ['Apartman Maurina', null],
  ['Apartman Mauro', null],
  ['Chiara Rentals Housing', ['Donji Bosanac', 'Gornji Bosanac']],
  ['Apartman Ida', null],
  ['Apartman Barbara', null],
  ['Soho Kondo', null],
  ['Vila Otranto', null],
  ['Vila Mistral', null],
  ['Villa Tramontana', null],
  ['Vila Marealto', null],
];

export const STANDARD_TASKS = [
  ['confirmation', 'Poslana potvrda bookinga'],
  ['id_request', 'Poslana zamolba za osobne iskaznice'],
  ['id_received', 'Osobne dostavljene'],
  ['evisitor', 'Prijavljeni u eVisitor'],
];

export function buildInitialState() {
  const properties = [];
  const units = [];
  PROPERTIES.forEach(([name, unitNames], pi) => {
    const property = { id: `p${pi + 1}`, name, sortOrder: pi };
    properties.push(property);
    (unitNames || [name]).forEach((uname, ui) => {
      units.push({ id: `${property.id}u${ui + 1}`, propertyId: property.id, name: uname, sortOrder: ui });
    });
  });
  const unit = (name) => units.find((u) => u.name === name).id;

  const categories = [
    { id: 'c1', name: 'Mailovi', color: '#68051A' },
    { id: 'c2', name: 'Oglasi', color: '#F8B42B' },
    { id: 'c3', name: 'Društvene mreže', color: '#4F5962' },
    { id: 'c4', name: 'Ostalo', color: '#949CA5' },
  ];

  const t = today();
  const d = (n) => plusDays(t, n);
  const stayDefs = [
    // guest, adults, children, in, out, unit, source, phone, lang, time, done kinds
    ['Hans Müller', 2, 0, d(0), d(7), 'Mascagni 1', 'booking', '+49 170 1234567', 'de', '15:00', ['confirmation', 'id_request', 'id_received', 'evisitor']],
    ['Sarah Johnson', 2, 2, d(1), d(8), 'Vila Marealto', 'airbnb', '+44 7700 900123', 'en', '17:00', ['confirmation', 'id_request']],
    ['Ivana Horvat', 3, 0, d(2), d(5), 'Istriana 2', 'rentlio_direct', '091 234 5678', 'hr', '14:00', ['confirmation']],
    ['Marco Rossi', 2, 0, d(4), d(9), 'Šabić 1 (veliki)', 'booking', '+39 333 1234567', 'en', '18:30', ['confirmation', 'id_request']],
    ['Familie Weber', 4, 2, d(-3), d(0), 'Villa Tramontana', 'booking', '+49 151 7654321', 'de', '16:00', ['confirmation', 'id_request', 'id_received', 'evisitor']],
    ['Petra Novak', 2, 0, d(-2), d(1), 'Apartman Lara Rooftop', 'airbnb', '+386 41 123 456', 'en', '13:00', ['confirmation', 'id_request', 'id_received', 'evisitor']],
    ['Tom & Emma Clarke', 2, 0, d(-1), d(3), '1. kat', 'booking', '+44 7700 900456', 'en', '19:00', ['confirmation', 'id_request', 'id_received']],
    ['Luka Marić', 2, 1, d(6), d(10), 'Vienna 3', 'other', '098 765 4321', 'hr', '15:00', ['confirmation']],
    ['Anna Kowalski', 2, 0, d(9), d(14), 'Rustica 5', 'booking', '+48 600 123 456', 'en', '16:00', []],
    ['Jean Dupont', 2, 0, d(12), d(16), 'Soho Kondo', 'airbnb', '+33 6 12 34 56 78', 'en', '20:00', ['confirmation']],
    ['Klaus Becker', 2, 0, d(-12), d(-6), 'Moderna 4', 'booking', '+49 160 5551234', 'de', '15:00', ['confirmation', 'id_request', 'id_received', 'evisitor']],
    ['Marija Babić', 4, 0, d(-9), d(-4), 'Donji Bosanac', 'rentlio_direct', '095 111 2233', 'hr', '12:00', ['confirmation', 'id_request', 'id_received', 'evisitor']],
  ];

  const stays = [];
  const stayTasks = [];
  stayDefs.forEach(([guestName, adults, children, checkIn, checkOut, unitName, source, phone, language, arrivalTime, done], i) => {
    const id = `s${i + 1}`;
    stays.push({
      id, unitId: unit(unitName), guestName, adults, children, checkIn, arrivalTime, checkOut,
      source, phone, email: `${guestName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
      notes: '', language, externalId: null, externalSource: null,
      createdBy: 'Marko', createdAt: new Date().toISOString(),
    });
    STANDARD_TASKS.forEach(([kind, title], ti) => {
      const isDone = done.includes(kind);
      stayTasks.push({
        id: `${id}t${ti + 1}`, stayId: id, kind, title, sortOrder: ti,
        done: isDone, doneBy: isDone ? TEAM[(i + ti) % 3] : null,
        doneAt: isDone ? new Date(Date.now() - (ti + 1) * 3600e3 * 5).toISOString() : null,
      });
    });
  });
  // primjer vlastitog zadatka
  stayTasks.push({ id: 's2t9', stayId: 's2', kind: 'custom', title: 'Dječji krevetić', sortOrder: 9, done: false, doneBy: null, doneAt: null });

  const todos = [
    ['Odgovoriti na upit za ljeto (mail)', 'Upit za Villa Tramontana, 2 tjedna u srpnju.', 'Ana', d(0), 'high', 'c1'],
    ['Nove fotografije za Booking.com', '', 'Marko', d(3), 'normal', 'c2'],
    ['Objava na Instagramu – terasa Lara', 'Fotke su u zajedničkom albumu.', 'Lea', d(2), 'normal', 'c3'],
    ['Nazvati čistačicu za vikend', '', 'Marko', d(-2), 'high', 'c4'],
    ['Osvježiti opis oglasa – Vila Sokol', '', 'Lea', d(7), 'low', 'c2'],
    ['Poslati račune knjigovođi', '', 'Ana', d(5), 'normal', 'c1'],
    ['Objaviti ponudu za jesen', '', 'Ana', d(-5), 'normal', 'c3'],
  ].map(([title, description, assignee, dueDate, priority, categoryId], i) => ({
    id: `td${i + 1}`, title, description, assignee, dueDate, priority, categoryId,
    done: false, doneBy: null, doneAt: null, sortOrder: i, createdBy: 'Marko', createdAt: new Date().toISOString(),
  }));
  todos.push({
    id: 'td8', title: 'Zamijeniti ključeve – Mascagni 1', description: '', assignee: 'Lea', dueDate: d(-1),
    priority: 'normal', categoryId: 'c4', done: true, doneBy: 'Lea', doneAt: new Date(Date.now() - 86400e3).toISOString(),
    sortOrder: 8, createdBy: 'Ana', createdAt: new Date().toISOString(),
  });

  return { properties, units, stays, stayTasks, todos, categories, templates: TEMPLATES_SEED };
}
