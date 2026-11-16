import { createContext, useContext, useEffect, useState } from 'react';
import { TEAM } from '../seed';
import { useAuth } from './auth';

// Faza A: "tko sam ja" se bira ručno. U fazi B se određuje iz prijave (email).
const MeContext = createContext(['Marko', () => {}]);

export function MeProvider({ children }) {
  const auth = useAuth(); // s prijavom se ime određuje iz emaila
  const [manual, setManual] = useState(() => localStorage.getItem('chiara-me') || TEAM[0]);
  useEffect(() => { if (!auth || auth.shared) localStorage.setItem('chiara-me', manual); }, [manual, auth]);
  const value = auth && !auth.shared ? [auth.name, () => {}] : [manual, setManual];
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}
export const useMe = () => useContext(MeContext);
