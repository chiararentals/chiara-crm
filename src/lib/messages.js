import { fmtDate } from './dates';

export function fillTemplate(text, stay, unit, by) {
  const vars = {
    ime: stay.guestName,
    objekt: unit?.property?.name ?? '',
    jedinica: unit?.name ?? '',
    datum_dolaska: fmtDate(stay.checkIn).replace(/\.$/, ''),
    datum_odlaska: fmtDate(stay.checkOut).replace(/\.$/, ''),
    vrijeme_dolaska: stay.arrivalTime || '',
    potpis: by,
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// "091 234 5678" -> 385912345678 ; "+49 170 ..." -> 49170...
export function phoneDigits(phone = '') {
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return '385' + d.slice(1);
  return d;
}

export const whatsappUrl = (phone, text) => `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(text)}`;
export const mailtoUrl = (email, subject, body) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
