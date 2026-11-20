// Spajanje pročitanog upita s kupcima koji već postoje u CRM-u.
// (Namjerno bez uvoza iz src/: Vercel funkcije ne podržavaju import bez ".js" nastavka.)
const digits = (v) => String(v || '').replace(/\D/g, '');
const sameLead = (a, b) => {
  if (a.firm !== b.firm) return false;
  if (a.email && b.email) return a.email.toLowerCase() === b.email.toLowerCase();
  if (digits(a.phone).length >= 8 && digits(b.phone).length >= 8) return digits(a.phone) === digits(b.phone);
  return !a.email && !b.email && a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
};
const DAYS = { vruc: 4, topao: 7 };
const addDays = (isoDay, n) => { const d = new Date(`${isoDay}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const zagrebDay = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' });
const isClosed = (l) => /^zatvoren/i.test(l.status || '');

// Vraća { action: 'created' | 'updated' | 'duplicate', lead } – lead je cijeli novi zapis.
export function mergeLead(leads, parsed, messageId, id = crypto.randomUUID(), now = new Date()) {
  const cur = leads.find((l) => sameLead(l, parsed));
  const day = zagrebDay(now);
  if (cur) {
    if ((cur.mailIds || []).includes(messageId)) return { action: 'duplicate', lead: cur };
    const ids = new Set(String(cur.listingId || '').split(/[,\s]+/).filter(Boolean));
    if (parsed.listingId) ids.add(parsed.listingId);
    return {
      action: 'updated',
      lead: {
        ...cur,
        mailIds: [...(cur.mailIds || []), messageId].slice(-50),
        listingId: [...ids].join(', '),
        phone: cur.phone || parsed.phone,
        lastComm: parsed.lastComm,
        lastWrote: 'kupac',
        // novi upit: neka se vidi, ali CRM-ov rok follow-upa i status se ne diraju
        ...(isClosed(cur) ? {} : { temperature: cur.temperature === 'vruc' ? 'vruc' : parsed.temperature }),
      },
    };
  }
  return {
    action: 'created',
    lead: { ...parsed, id, createdAt: now.toISOString(), notes: '', mailIds: [messageId], lastWrote: 'kupac', followUpDate: addDays(day, DAYS[parsed.temperature] ?? 7), lastContact: day },
  };
}
