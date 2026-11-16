import { createContext, useContext, useEffect, useState } from 'react';
import { FIRMS } from '../seed';

// Globalni filter firme: '' = sve firme, inače 'chiara' | 'bonvia' | 'dux'
const FirmContext = createContext(['', () => {}]);

export function FirmProvider({ children }) {
  const [firm, setFirm] = useState(() => {
    try { const v = localStorage.getItem('crm-firm'); return v in FIRMS ? v : ''; } catch { return ''; }
  });
  useEffect(() => { try { localStorage.setItem('crm-firm', firm); } catch { /* ignoriraj */ } }, [firm]);
  return <FirmContext.Provider value={[firm, setFirm]}>{children}</FirmContext.Provider>;
}
export const useFirm = () => useContext(FirmContext);
