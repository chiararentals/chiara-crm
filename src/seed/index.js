import { today, plusDays } from '../lib/dates';
import { TEMPLATES_SEED } from './templates';

export const TEAM = ['Marko', 'Lea', 'Vanja'];

// Firme i njihove boje (iz logotipa). `text` = boja slova na toj pozadini.
export const FIRMS = {
  chiara: { name: 'Chiara', color: '#B4233A', ink: '#8A1A2C', text: '#FFFFFF' },
  bonvia: { name: 'Bonvia', color: '#C9B48A', ink: '#7A6330', text: '#1F2328' },
  dux: { name: 'Dux', color: '#1E9E92', ink: '#0F6B62', text: '#FFFFFF' },
};
export const FIRM_KEYS = Object.keys(FIRMS);

// Zadaci koji se sami pojave svaki dan (mogu se mijenjati u Postavkama).
// repeat: 'daily' = svaki dan, 'workdays' = pon–pet
export const RECURRING_SEED = [
  ['Check-in / check-out gostiju', 'chiara', 'Lea'],
  ['Pregled maila (Chiara)', 'chiara', 'Lea'],
  ['Pregled Bookinga i Airbnba', 'chiara', 'Lea'],
  ['Follow-up kupaca preko maila', 'dux', 'Vanja'],
  ['Follow-up kupaca preko WhatsAppa', 'dux', 'Vanja'],
].map(([title, firm, assignee], i) => ({ id: `r${i + 1}`, title, firm, assignee, repeat: 'daily' }));

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
    ['Dodati nove oglase na web', '', 'Marko', d(3), 'normal', 'bonvia'],
    ['Objava na Instagramu i TikToku', 'Fotke su u zajedničkom albumu.', 'Vanja', d(2), 'normal', 'bonvia'],
    ['Ažurirati cijene apartmana na webu', 'Za sezonu 2027.', 'Lea', d(5), 'normal', 'chiara'],
    ['Objava na društvenim mrežama (TikTok + Insta)', '', 'Lea', d(1), 'normal', 'chiara'],
    ['Dignuti oglase (Dux)', 'Podići starije oglase na vrh.', 'Vanja', d(0), 'high', 'dux'],
    ['Kontaktirati nove leadove (Bonvia)', '', 'Marko', d(-1), 'high', 'bonvia'],
  ].map(([title, description, assignee, dueDate, priority, firm], i) => ({
    id: `td${i + 1}`, title, description, assignee, dueDate, priority, firm,
    done: false, doneBy: null, doneAt: null, sortOrder: i, createdBy: 'Marko', createdAt: new Date().toISOString(),
  }));
  todos.push({
    id: 'td9', title: 'Poslati potvrdu rezervacije (primjer odrađenog)', description: 'Poslano mailom.', assignee: 'Lea', dueDate: d(-1),
    priority: 'normal', firm: 'chiara', done: true, doneBy: 'Lea', doneAt: new Date(Date.now() - 86400e3).toISOString(),
    sortOrder: 9, createdBy: 'Marko', createdAt: new Date().toISOString(),
  });

  // Izmišljeni primjeri kupaca (stvarni se uvoze iz Excela u aplikaciji)
  const leads = [
    ['Primjer Kupac 1', 'dux', 'vruc', 'primjer1@example.com', '+385 91 000 0001', 'hr', 'Stan u Opatiji, do 400.000 €', 'Poslati nove ponude', d(0)],
    ['Primjer Kupac 2', 'dux', 'topao', 'primjer2@example.com', '+49 170 0000002', 'de', 'Kuća s vrtom, Lovran', 'Nazvati nakon razgleda', d(3)],
    ['Primjer Lead 3', 'bonvia', 'vruc', 'primjer3@example.com', '+44 7700 000003', 'en', 'Zainteresiran za suradnju', 'Poslati ponudu', d(-1)],
  ].map(([name, firm, temperature, email, phone, language, wants, nextStep, followUpDate], i) => ({
    id: `l${i + 1}`, name, firm, temperature, email, phone, language, wants, nextStep, followUpDate,
    lastContact: d(-3), status: 'otvoren', source: '', location: '', type: '', priceRange: '', notes: '',
    createdAt: new Date().toISOString(),
  }));

  return { properties, units, stays, stayTasks, todos, recurring: RECURRING_SEED, leads, templates: TEMPLATES_SEED };
}

// Samo ono što aplikacija treba na početku prave baze: objekti, jedinice, predlošci, svakodnevni zadaci.
export function buildBaseState() {
  const { properties, units, templates, recurring } = buildInitialState();
  return { properties, units, templates, recurring, stays: [], stayTasks: [], todos: [], leads: [] };
}
