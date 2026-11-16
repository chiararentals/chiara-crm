import { supabase } from '../lib/supabase';
import { COLLECTIONS, diffState } from './diff';

const TABLE = {
  properties: 'properties', units: 'units', stays: 'stays', stayTasks: 'stay_tasks',
  todos: 'todos', recurring: 'recurring', leads: 'leads', templates: 'templates',
};
const KEY_BY_TABLE = Object.fromEntries(Object.entries(TABLE).map(([k, t]) => [t, k]));
const rows = (list) => list.map((x) => ({ id: x.id, data: x, updated_at: new Date().toISOString() }));
const chunks = (list, n = 500) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

export async function fetchAll() {
  const state = {};
  for (const key of COLLECTIONS) {
    let all = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(TABLE[key]).select('data').order('id').range(from, from + 999);
      if (error) throw error;
      all = all.concat(data.map((r) => r.data));
      if (data.length < 1000) break;
    }
    state[key] = all;
  }
  return state;
}

export async function writeDiff(prev, next) {
  const d = diffState(prev, next);
  for (const [key, { added, changed, removed }] of Object.entries(d)) {
    const table = TABLE[key];
    // novi retci: ne pregazi ako ga je netko drugi već stvorio (npr. dnevni zadaci)
    for (const c of chunks(added)) {
      const { error } = await supabase.from(table).upsert(rows(c), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    }
    for (const c of chunks(changed)) {
      const { error } = await supabase.from(table).upsert(rows(c), { onConflict: 'id' });
      if (error) throw error;
    }
    for (const c of chunks(removed)) {
      const { error } = await supabase.from(table).delete().in('id', c);
      if (error) throw error;
    }
  }
}

// Promjene koje naprave drugi (uživo)
export function subscribe(onChange) {
  const channel = supabase
    .channel('crm-live')
    .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
      const key = KEY_BY_TABLE[p.table];
      if (!key) return;
      if (p.eventType === 'DELETE') onChange(key, null, p.old?.id);
      else onChange(key, p.new?.data, p.new?.id);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}
