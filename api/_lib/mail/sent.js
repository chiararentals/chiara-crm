// Poslani mailovi (mapa "Poslano") -> kontakt u CRM-u: ako je mail poslan kupcu koji je u CRM-u, bilježi se kao odrađen follow-up.
// Bilježi se što je poslano i kada. Ostala tri odgovora (kad dolazi, koliko je pogledao, izabrane nekretnine) ostaju
// za upis u CRM-u (lead dobiva oznaku factsPending).
import { zagrebDay } from './merge.js';

const DAYS = { vruc: 4, topao: 7 };
const OWN_DOMAIN = (process.env.OWN_MAIL_DOMAIN || 'dux-nekretnine.hr').toLowerCase();
const isOwn = (a) => (a.split('@')[1] || '').toLowerCase().endsWith(OWN_DOMAIN);
const addDays = (isoDay, n) => { const d = new Date(`${isoDay}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Samo ono što je napisano u ovom mailu, bez citirane povijesti ispod
export function cleanSentText(text) {
  const out = [];
  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    if (/^(>|-{2,}\s*(original|izvorna|forwarded)|on .+ wrote:|dana .+(pi[sš]e|napisao|napisala)|od:\s|from:\s|poslano:|sent:)/i.test(l)) break;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Vraća izmijenjene kupce (nove objekte). sent = { to[], cc[], subject, text, date, messageId }
export function applySent(leads, sent, { by = 'Marko', now = new Date() } = {}) {
  const day = zagrebDay(sent.date || now);
  const text = cleanSentText(sent.text).slice(0, 400);
  if (!text) return [];
  const changed = [];
  for (const addr of [...(sent.to || []), ...(sent.cc || [])]) {
    if (!addr || isOwn(addr)) continue;
    const lead = leads.find((l) => l.email && l.email.toLowerCase() === addr.toLowerCase());
    if (!lead) continue;
    if ((lead.contacts || []).some((c) => c.messageId === sent.messageId)) continue;
    const viewed = (lead.viewings || []).filter((v) => v.status === 'viewed').length;
    const contact = {
      id: crypto.randomUUID(), at: (sent.date || now).toISOString(), by, channel: 'email', sentText: text,
      arrivalDate: lead.arrivalDate || null, arrivalNote: lead.arrivalNote || '', viewedCount: (Number(lead.viewedManual) || 0) + viewed,
      chosen: (lead.viewings || []).filter((v) => v.status === 'planned').map((v) => v.duxId), auto: true, messageId: sent.messageId,
    };
    const closed = /^zatvoren/i.test(lead.status || '');
    const newer = !lead.lastContact || lead.lastContact <= day; // stariji poslani mail ne vraća rok unatrag
    const upd = {
      ...lead, contacts: [...(lead.contacts || []), contact],
      factsPending: !lead.arrivalDate && !lead.arrivalNote ? true : lead.factsPending,
      ...(newer ? { lastSent: text, lastContact: day, ...(closed ? {} : { followUpDate: addDays(day, DAYS[lead.temperature] ?? 7) }) } : {}),
    };
    leads[leads.indexOf(lead)] = upd;
    changed.push(upd);
  }
  return changed;
}
