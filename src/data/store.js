// "Sloj za podatke". Bez Supabase ključeva sve se sprema u preglednik (localStorage);
// s ključevima se isto stanje sprema u Supabase i sinkronizira uživo među korisnicima.
import { buildInitialState, buildBaseState, STANDARD_TASKS } from '../seed';
import { today } from '../lib/dates';
import { isClosed, suggestDate, viewedIds, followUpState, sameLead } from '../lib/leads';
import { remoteEnabled } from '../lib/supabase';
import * as remote from './remote';

const KEY = 'chiara-crm-v2';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* prazan ili pokvaren spremnik – kreni ispočetka */ }
  return buildInitialState();
}

const EMPTY = { properties: [], units: [], stays: [], stayTasks: [], todos: [], recurring: [], leads: [], templates: [] };
let state = remoteEnabled ? EMPTY : load();
const listeners = new Set();

// Stanje veze s bazom (za prikaz greške i čekanje učitavanja)
let status = { ready: !remoteEnabled, error: null };
const statusListeners = new Set();
function setStatus(patch) { status = { ...status, ...patch }; statusListeners.forEach((l) => l()); }
export const sync = {
  getState: () => status,
  subscribe(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); },
};

// Upisi u bazu idu jedan za drugim, da se redoslijed ne pomiješa
let queue = Promise.resolve();
function enqueueWrite(prev, next) {
  queue = queue
    .then(() => remote.writeDiff(prev, next))
    .then(() => status.error && setStatus({ error: null }))
    .catch((e) => { console.error('Spremanje nije uspjelo', e); setStatus({ error: 'Spremanje nije uspjelo – provjeri internet i osvježi stranicu.' }); });
}

function commit(next) {
  const prev = state;
  state = next;
  if (remoteEnabled) enqueueWrite(prev, next);
  else { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignoriraj */ } }
  listeners.forEach((l) => l());
}

// Promjena koju je napravio netko drugi: primijeni u stanje, ali je ne upisuj ponovno u bazu
function applyRemote(key, item, id) {
  const list = state[key] || [];
  const next = item
    ? (list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? item : x)) : [...list, item])
    : list.filter((x) => x.id !== id);
  if (JSON.stringify(next) === JSON.stringify(list)) return;
  state = { ...state, [key]: next };
  listeners.forEach((l) => l());
}

let unsubscribeRemote = null;
// Poziva se nakon prijave: učitaj sve iz baze, po potrebi upiši početne objekte i slušaj promjene
export async function initRemote() {
  if (!remoteEnabled || status.ready) return;
  try {
    let loaded = await remote.fetchAll();
    if (!loaded.properties.length) {          // prvi put: upiši objekte, jedinice i predloške
      const base = buildBaseState();
      state = loaded;
      commit({ ...loaded, ...base });
      await queue;
      loaded = state;
    }
    state = loaded;
    unsubscribeRemote = remote.subscribe(applyRemote);
    setStatus({ ready: true, error: null });
    listeners.forEach((l) => l());
    actions.generateDaily();
  } catch (e) {
    console.error(e);
    setStatus({ error: 'Učitavanje iz baze nije uspjelo. Provjeri postavke Supabasea i osvježi stranicu.' });
  }
}
export function stopRemote() { unsubscribeRemote?.(); unsubscribeRemote = null; }

// Popis nekretnina nakon obrasca: pogledane se dodaju, a "izabrane za gledanje" zamjenjuju prijašnji popis izabranih
function syncViewings(lead, form) {
  let viewings = [...(lead.viewings || [])];
  const have = (id, st) => viewings.some((v) => v.duxId === id && v.status === st);
  for (const id of form.viewedIds) {
    viewings = viewings.filter((v) => !(v.duxId === id && v.status === 'planned'));
    if (!have(id, 'viewed')) viewings.push({ id: uid(), duxId: id, status: 'viewed', note: '', date: today() });
  }
  if (form.chosenIds) {
    viewings = viewings.filter((v) => v.status !== 'planned' || form.chosenIds.includes(v.duxId));
    for (const id of form.chosenIds) {
      if (!have(id, 'planned') && !have(id, 'viewed')) viewings.push({ id: uid(), duxId: id, status: 'planned', note: '', date: null });
    }
  }
  return viewings;
}
// Što se mijenja na kupcu kad se upišu odgovori; prazno polje = ne mijenjaj
function factsPatch(lead, form) {
  const patch = { viewings: syncViewings(lead, { viewedIds: form.viewedIds || [], chosenIds: form.chosenIds }) };
  if (form.sentText) patch.lastSent = form.sentText;
  if (form.arrival === 'date' && form.arrivalDate) { patch.arrivalDate = form.arrivalDate; patch.arrivalNote = ''; }
  else if (form.arrival === 'unknown') { patch.arrivalDate = null; patch.arrivalNote = form.arrivalNote || ''; }
  if (form.viewedManual !== '' && form.viewedManual != null) patch.viewedManual = Number(form.viewedManual) || 0;
  return patch;
}
const patchList = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const store = {
  getState: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export const actions = {
  // ---- Boravci ----
  addStay(data, by) {
    const id = uid();
    const stay = { externalId: null, externalSource: null, ...data, id, createdBy: by, createdAt: now() };
    const tasks = STANDARD_TASKS.map(([kind, title], i) => ({
      id: uid(), stayId: id, kind, title, sortOrder: i, done: false, doneBy: null, doneAt: null,
    }));
    commit({ ...state, stays: [...state.stays, stay], stayTasks: [...state.stayTasks, ...tasks] });
    return id;
  },
  updateStay(id, patch) { commit({ ...state, stays: patchList(state.stays, id, patch) }); },
  deleteStay(id) {
    commit({
      ...state,
      stays: state.stays.filter((s) => s.id !== id),
      stayTasks: state.stayTasks.filter((t) => t.stayId !== id),
    });
  },

  // ---- Zadaci boravka (checklista) ----
  toggleStayTask(id, by) {
    const t = state.stayTasks.find((x) => x.id === id);
    const done = !t.done;
    commit({
      ...state,
      stayTasks: patchList(state.stayTasks, id, { done, doneBy: done ? by : null, doneAt: done ? now() : null }),
    });
  },
  addStayTask(stayId, title) {
    const order = Math.max(0, ...state.stayTasks.filter((t) => t.stayId === stayId).map((t) => t.sortOrder)) + 1;
    commit({
      ...state,
      stayTasks: [...state.stayTasks, { id: uid(), stayId, kind: 'custom', title, sortOrder: order, done: false, doneBy: null, doneAt: null }],
    });
  },
  deleteStayTask(id) { commit({ ...state, stayTasks: state.stayTasks.filter((t) => t.id !== id) }); },

  // ---- Opći to-do ----
  addTodo(data, by) {
    const todo = { done: false, doneBy: null, doneAt: null, ...data, id: uid(), sortOrder: state.todos.length, createdBy: by, createdAt: now() };
    commit({ ...state, todos: [...state.todos, todo] });
  },
  updateTodo(id, patch) { commit({ ...state, todos: patchList(state.todos, id, patch) }); },
  toggleTodo(id, by) {
    const t = state.todos.find((x) => x.id === id);
    const done = !t.done;
    commit({ ...state, todos: patchList(state.todos, id, { done, doneBy: done ? by : null, doneAt: done ? now() : null }) });
  },
  deleteTodo(id) { commit({ ...state, todos: state.todos.filter((t) => t.id !== id) }); },

  // ---- Svakodnevni zadaci (predlošci) ----
  addRecurring(data) { commit({ ...state, recurring: [...state.recurring, { repeat: 'daily', ...data, id: uid() }] }); actions.generateDaily(); },
  updateRecurring(id, patch) { commit({ ...state, recurring: patchList(state.recurring, id, patch) }); },
  deleteRecurring(id) {
    commit({
      ...state,
      recurring: state.recurring.filter((r) => r.id !== id),
      todos: state.todos.filter((t) => !(t.recurringId === id && !t.done)),
    });
  },
  // Za svaki predložak napravi današnji zadatak (ako ga još nema); neodrađene stare kopije miče.
  generateDaily() {
    if (!status.ready) return;
    const t = today();
    const dow = new Date(`${t}T12:00:00`).getDay();
    const workday = dow >= 1 && dow <= 5;
    const todos = state.todos.filter((x) => !(x.recurringId && !x.done && x.dueDate < t));
    let changed = todos.length !== state.todos.length;
    for (const r of state.recurring) {
      if (r.repeat === 'workdays' && !workday) continue;
      if (todos.some((x) => x.recurringId === r.id && x.dueDate === t)) continue;
      todos.push({
        id: `${r.id}:${t}`, title: r.title, description: '', assignee: r.assignee, dueDate: t, priority: 'normal',
        firm: r.firm, recurringId: r.id, done: false, doneBy: null, doneAt: null,
        sortOrder: todos.length, createdBy: 'auto', createdAt: now(),
      });
      changed = true;
    }
    if (changed) commit({ ...state, todos });
  },

  // ---- Kupci i leadovi ----
  addLead(data) {
    const id = uid();
    commit({ ...state, leads: [...state.leads, { status: 'otvoren', notes: '', ...data, id, createdAt: now() }] });
    return id;
  },
  updateLead(id, patch) { commit({ ...state, leads: patchList(state.leads, id, patch) }); },
  deleteLead(id) { commit({ ...state, leads: state.leads.filter((l) => l.id !== id) }); },
  // Uvoz iz tablice: isti email (u istoj firmi) = ažuriranje, inače novi kupac.
  // - prazna polja iz tablice ne brišu ono što je upisano u CRM-u
  // - ako je kupac već imao kontakt u CRM-u, CRM je glavni za rok follow-upa i zadnji kontakt
  // - novi kupac bez važećeg roka dobiva prijedlog (vruć +4 dana, topao +7)
  // - zatvoreni (kupio / odustao) se ne dodaju kao novi; postojećima se samo promijeni status
  importLeads(list) {
    let added = 0, updated = 0, closed = 0;
    const leads = [...state.leads];
    for (const item of list) {
      const i = leads.findIndex((l) => sameLead(l, item));
      if (i >= 0) {
        const cur = leads[i];
        const patch = {};
        for (const [k, v] of Object.entries(item)) if (v !== '' && v != null) patch[k] = v;
        if (cur.contacts?.length) { delete patch.followUpDate; delete patch.lastContact; }
        leads[i] = { ...cur, ...patch, id: cur.id };
        updated++;
      } else if (isClosed(item)) {
        closed++;
      } else {
        leads.push({ notes: '', ...item, followUpDate: item.followUpDate || suggestDate(item.temperature), id: uid(), createdAt: now() });
        added++;
      }
    }
    commit({ ...state, leads });
    return { added, updated, closed };
  },
  // Jednokratno: svi kupci kojima je rok prošao dobiju novi rok (vruć +4, topao +7)
  resetLateFollowUps() {
    let n = 0;
    const leads = state.leads.map((l) => {
      if (followUpState(l) !== 'late') return l;
      n++;
      return { ...l, followUpDate: suggestDate(l.temperature) };
    });
    if (n) commit({ ...state, leads });
    return n;
  },
  // Prijedlog iz maila: dodaj kao kupca / vlasnika (ili ignoriraj)
  acceptSuggestion(id, kind) {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;
    commit({ ...state, leads: patchList(state.leads, id, { suggestion: false, ignored: false, kind, review: true, followUpDate: suggestDate(lead.temperature || 'topao') }) });
  },
  ignoreSuggestion(id) { commit({ ...state, leads: patchList(state.leads, id, { suggestion: false, ignored: true }) }); },

  // Samo upiši podatke: ažurira 4 odgovora, ali NE bilježi kontakt i NE mijenja rok follow-upa.
  // Prazno polje (null/undefined) = ne mijenjaj.
  updateLeadFacts(leadId, form) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return;
    commit({ ...state, leads: patchList(state.leads, leadId, { ...factsPatch(lead, form), factsPending: false }) });
  },
  // Zabilježi kontakt (i time odradi follow-up). form: sentText, channel, arrivalDate, arrivalNote,
  // viewedManual, viewedIds[], chosenIds[], nextDate
  logContact(leadId, form, by) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const patch = factsPatch(lead, form);
    const after = { ...lead, ...patch };
    const contact = {
      id: uid(), at: now(), by, channel: form.channel, sentText: form.sentText || '',
      arrivalDate: after.arrivalDate || null, arrivalNote: after.arrivalNote || '',
      viewedCount: (Number(after.viewedManual) || 0) + viewedIds(after).length,
      chosen: (after.viewings || []).filter((v) => v.status === 'planned').map((v) => v.duxId), nextDate: form.nextDate || null,
    };
    const gaveFacts = !!(form.sentText || form.arrival || (form.viewedManual !== '' && form.viewedManual != null) || (form.viewedIds || []).length || form.chosenIds);
    commit({
      ...state,
      leads: patchList(state.leads, leadId, {
        ...patch, contacts: [...(lead.contacts || []), contact],
        lastContact: today(), followUpDate: form.nextDate || null, ...(gaveFacts ? { factsPending: false } : {}),
      }),
    });
  },

  // ---- Objekti i jedinice ----
  addProperty(name) {
    const id = uid();
    commit({
      ...state,
      properties: [...state.properties, { id, name, sortOrder: state.properties.length }],
      units: [...state.units, { id: uid(), propertyId: id, name, sortOrder: 0 }],
    });
  },
  updateProperty(id, patch) { commit({ ...state, properties: patchList(state.properties, id, patch) }); },
  addUnit(propertyId, name) {
    const order = state.units.filter((u) => u.propertyId === propertyId).length;
    commit({ ...state, units: [...state.units, { id: uid(), propertyId, name, sortOrder: order }] });
  },
  updateUnit(id, patch) { commit({ ...state, units: patchList(state.units, id, patch) }); },
  deleteUnit(id) {
    if (state.stays.some((s) => s.unitId === id)) return false; // ne brišemo jedinicu s boravcima
    commit({ ...state, units: state.units.filter((u) => u.id !== id) });
    return true;
  },

  // ---- Predlošci poruka ----
  updateTemplate(id, patch) { commit({ ...state, templates: patchList(state.templates, id, patch) }); },

  // ---- Demo ----
  resetDemo() { if (!remoteEnabled) commit(buildInitialState()); },
};

// Svaki dan stvori današnje zadatke: pri pokretanju, pri povratku na karticu i svake minute.
if (typeof window !== 'undefined') {
  if (!remoteEnabled) actions.generateDaily();
  window.addEventListener('focus', () => actions.generateDaily());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) actions.generateDaily(); });
  setInterval(() => actions.generateDaily(), 60000);
}
