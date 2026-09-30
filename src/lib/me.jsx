import { createContext, useContext, useEffect, useState } from 'react';
import { TEAM } from '../seed';

// Faza A: "tko sam ja" se bira ručno. U fazi B se određuje iz prijave (email).
const MeContext = createContext(['Marko', () => {}]);

export function MeProvider({ children }) {
  const [me, setMe] = useState(() => localStorage.getItem('chiara-me') || TEAM[0]);
  useEffect(() => { localStorage.setItem('chiara-me', me); }, [me]);
  return <MeContext.Provider value={[me, setMe]}>{children}</MeContext.Provider>;
}
export const useMe = () => useContext(MeContext);
