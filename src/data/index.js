// Jedino mjesto odakle ostatak aplikacije dobiva podatke.
import { useSyncExternalStore } from 'react';
import { store, actions, sync, initRemote, stopRemote } from './store';

export { actions, initRemote, stopRemote };
export const useData = () => useSyncExternalStore(store.subscribe, store.getState);
export const useSync = () => useSyncExternalStore(sync.subscribe, sync.getState);
