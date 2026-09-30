// Jedino mjesto odakle ostatak aplikacije dobiva podatke.
// Faza B: promijeni import u './supabaseStore'.
import { useSyncExternalStore } from 'react';
import { store, actions } from './localStore';

export { actions };
export const useData = () => useSyncExternalStore(store.subscribe, store.getState);
