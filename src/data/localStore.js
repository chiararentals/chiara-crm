// "Sloj za podatke" – FAZA A: sve se sprema u preglednik (localStorage).
// U fazi B ovu datoteku zamjenjuje supabaseStore.js s ISTIM funkcijama,
// pa se ostatak aplikacije ne mijenja.
import { buildInitialState, STANDARD_TASKS } from '../seed';

const KEY = 'chiara-crm-v1';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* prazan ili pokvaren spremnik – kreni ispočetka */ }
  return buildInitialState();
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignoriraj */ }
  listeners.forEach((l) => l());
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

  // ---- Kategorije ----
  addCategory(name) {
    const palette = ['#68051A', '#F8B42B', '#4F5962', '#0F766E', '#7C3AED', '#0369A1'];
    const id = uid();
    commit({ ...state, categories: [...state.categories, { id, name, color: palette[state.categories.length % palette.length] }] });
    return id;
  },
  deleteCategory(id) {
    commit({
      ...state,
      categories: state.categories.filter((c) => c.id !== id),
      todos: state.todos.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
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
  resetDemo() { commit(buildInitialState()); },
};
