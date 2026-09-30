import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import { hr } from 'date-fns/locale';

export const iso = (d) => format(d, 'yyyy-MM-dd');
export const today = () => iso(new Date());
export const plusDays = (dateStr, n) => iso(addDays(parseISO(dateStr), n));
export const diffDays = (a, b) => differenceInCalendarDays(parseISO(a), parseISO(b));
// koliko dana od danas (0 = danas, 1 = sutra, -1 = jučer)
export const daysFromToday = (dateStr) => diffDays(dateStr, today());

export const fmtDate = (s) => format(parseISO(s), 'd. M. yyyy.');
export const fmtShort = (s) => format(parseISO(s), 'EEE d. M.', { locale: hr });
export const fmtDay = (s) => format(parseISO(s), 'd.M.');
export const fmtDateTime = (isoStr) => format(new Date(isoStr), 'd.M. HH:mm');
export const fmtLong = (s) => format(parseISO(s), 'EEEE, d. MMMM', { locale: hr });
