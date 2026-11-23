// Usporedi staro i novo stanje i vrati što treba upisati / obrisati u bazi.
export const COLLECTIONS = ['properties', 'units', 'stays', 'stayTasks', 'todos', 'recurring', 'leads', 'templates', 'villas', 'content'];

export function diffState(prev, next) {
  const out = {};
  for (const key of COLLECTIONS) {
    const a = new Map((prev[key] || []).map((x) => [x.id, x]));
    const b = new Map((next[key] || []).map((x) => [x.id, x]));
    const added = [], changed = [], removed = [];
    for (const [id, x] of b) {
      const old = a.get(id);
      if (!old) added.push(x);
      else if (old !== x && JSON.stringify(old) !== JSON.stringify(x)) changed.push(x);
    }
    for (const id of a.keys()) if (!b.has(id)) removed.push(id);
    if (added.length || changed.length || removed.length) out[key] = { added, changed, removed };
  }
  return out;
}
