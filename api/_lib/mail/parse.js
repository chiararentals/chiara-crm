// Čitanje upita kupaca iz mailova (po pravilima, bez AI-ja).
// Ulaz: mail već razložen mailparserom { from, replyTo, to, subject, text, date, messageId }.
// Izlaz: { kind: 'lead' | 'skip', reason, lead? }
import { franc } from 'franc-min';

const OWN_DOMAIN = (process.env.OWN_MAIL_DOMAIN || 'dux-nekretnine.hr').toLowerCase();
// Pošiljatelji koje prepoznajemo kao portale (domena -> ime izvora)
const PORTALS = {
  'njuskalo.hr': 'njuškalo',
  'luxuryestate.com': 'luxuryestate',
  'nekretnine.hr': 'nekretnine.hr',
  'indomio.hr': 'indomio',
  'nekretnine-kvarner.hr': 'nekretnine kvarner',
};
const LANG = { hrv: 'hr', srp: 'hr', bos: 'hr', eng: 'en', deu: 'de', ita: 'it', slv: 'sl' };
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// hrvatski i međunarodni oblici: 091 234 5678, 0919455829, +385 91 234 567, 00385…
const PHONE_RE = /(?:\+|00)?\d[\d\s/().-]{7,16}\d/g;

const domainOf = (addr = '') => addr.toLowerCase().split('@')[1] || '';
const isOwn = (addr) => domainOf(addr).endsWith(OWN_DOMAIN);
const cleanLines = (t) => String(t || '').replace(/\r/g, '').split('\n').map((l) => l.trim());

// Domena portala (ključ u PORTALS) ili null
export function portalKey(fromAddr) {
  const d = domainOf(fromAddr);
  return Object.keys(PORTALS).find((p) => d === p || d.endsWith(`.${p}`)) || null;
}
export const portalOf = (fromAddr) => PORTALS[portalKey(fromAddr)] || null;

// Telefon iz teksta, ne naš (potpis agenta, tvrtke) i ne ID/cijena
export function findPhone(text, ownNumbers = []) {
  const own = ownNumbers.map((n) => n.replace(/\D/g, ''));
  for (const m of String(text || '').match(PHONE_RE) || []) {
    const d = m.replace(/\D/g, '');
    if (d.length < 9 || d.length > 14) continue;
    if (own.some((o) => o && (d.endsWith(o) || o.endsWith(d)))) continue;
    return m.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function detectLanguage(text, fallback = 'hr') {
  const t = String(text || '').trim();
  if (t.length < 25) return fallback;
  return LANG[franc(t, { minLength: 10 })] || fallback;
}

const hot = /razgled|pogledat|vidjeti stan|vidjeti kuću|termin|besichtig|viewing|visita|visit /i;
const rental = /najam|za rent|\brent\b|affitto|miete/i;
const GREETING = /^(po[sš]tovani|po[sš]tovanje|dobar dan|hello|dear|buongiorno|guten tag|hi|pozdrav)\b/i;
const CLOSING = /^(lp|l\.p\.|lijep pozdrav|srda[cč]an pozdrav|pozdrav|hvala|thanks|regards|kind regards|best regards|cordiali saluti|grazie|mfg|--)\b/i;

// Ime iz potpisa poruke (zadnji kratki redak nakon pozdrava); inače prazno
function nameFromSignature(message) {
  const lines = cleanLines(message).filter(Boolean);
  const i = lines.findIndex((l) => CLOSING.test(l));
  const after = i >= 0 ? lines.slice(i + 1) : lines.slice(-1);
  const cand = after.find((l) => /^[\p{L}][\p{L} .'-]{1,40}$/u.test(l) && l.split(/\s+/).length <= 3 && !CLOSING.test(l));
  return cand || '';
}

function baseLead({ source, email, name, message, listingId, price, subject, date, listingTitle, ownNumbers }) {
  const phone = findPhone(message, ownNumbers);
  const text = message.trim();
  const temperature = hot.test(text) ? 'vruc' : 'topao';
  return {
    firm: 'dux', temperature, name: name || (email || '').split('@')[0], email: email || '', phone,
    language: detectLanguage(text), source, listingId: listingId || '', priceRange: price || '',
    wants: text.slice(0, 400), lastComm: `${(date || new Date()).toISOString().slice(0, 10)} upit (${source}): ${text.slice(0, 200)}`,
    status: 'otvoren', listingTitle: listingTitle || subject || '', review: true, owner: 'Vanja',
    firstContact: (date || new Date()).toISOString().slice(0, 10),
  };
}

// ---------- Njuškalo ----------
function parseNjuskalo(m, ownNumbers) {
  const body = m.text || '';
  const email = (m.replyTo || []).find((a) => !isOwn(a)) || (body.match(/Po[sš]iljatelj:\s*\S+\s*\(([^)\s]+@[^)\s]+)\)/i) || [])[1];
  if (!email) return null;
  const username = (body.match(/Po[sš]iljatelj:\s*(\S+)\s*\(/i) || [])[1] || '';
  const id = (body.match(/Interna\s+[sš]ifra:\s*(\d+)/i) || [])[1];
  const price = (body.match(/Cijena:\s*([^\n]+)/i) || [])[1];
  const title = (m.subject.match(/oglas\s+(.+)$/i) || [])[1] || '';
  const upTo = body.search(/Po[sš]iljatelj:/i);
  const message = (upTo > 0 ? body.slice(0, upTo) : body).split('\n').map((l) => l.trim()).filter((l) => l && !GREETING.test(l)).join('\n');
  return {
    rental: rental.test(title) || rental.test(message) || /EUR\s*\/\s*mj|mjese/i.test(price || ''),
    lead: baseLead({
      source: 'njuškalo', email, name: nameFromSignature(message) || username, message, listingId: id, price, subject: m.subject,
      date: m.date, listingTitle: title, ownNumbers,
    }),
  };
}

// ---------- LuxuryEstate ----------
function parseLuxury(m, ownNumbers) {
  const body = m.text || '';
  const lines = cleanLines(body).filter(Boolean);
  const idLine = lines.findIndex((l) => /^ID\s+\d+/i.test(l));
  const id = idLine >= 0 ? lines[idLine].match(/\d+/)[0] : (m.subject.match(/\b(\d{4,6})\b/) || [])[1];
  const email = (m.replyTo || []).find((a) => !isOwn(a)) || (body.match(EMAIL_RE) || []).find((a) => !isOwn(a) && !domainOf(a).includes('luxuryestate'));
  if (!email) return null;
  const emailLine = lines.findIndex((l) => l.toLowerCase().includes(email.toLowerCase()));
  const message = lines.slice(idLine >= 0 ? idLine + 1 : 0, emailLine > 0 ? emailLine : undefined).filter((l) => !GREETING.test(l)).join('\n');
  const afterEmail = emailLine >= 0 ? lines[emailLine + 1] : '';
  const name = /^[\p{L}][\p{L} .'-]{1,40}$/u.test(afterEmail || '') && !CLOSING.test(afterEmail) ? afterEmail : '';
  return {
    rental: rental.test(message),
    lead: baseLead({ source: 'luxuryestate', email, name, message, listingId: id, subject: m.subject, date: m.date, ownNumbers }),
  };
}

// ---------- Ostali portali i nepoznati oblici: samo ono što se može sigurno izvući ----------
function parseGeneric(m, source, ownNumbers) {
  const body = m.text || '';
  const email = (m.replyTo || []).find((a) => !isOwn(a)) || (body.match(EMAIL_RE) || []).find((a) => !isOwn(a) && !portalOf(a));
  if (!email) return null;
  const id = (body.match(/(?:[sš]ifra|ID|ref\.?|oglas(?:a)?)\D{0,6}(\d{4,6})/i) || m.subject.match(/\b(\d{4,6})\b/) || [])[1];
  const message = cleanLines(body).filter((l) => l && !GREETING.test(l)).slice(0, 12).join('\n');
  return { rental: rental.test(m.subject) || rental.test(message), lead: baseLead({ source, email, name: nameFromSignature(message), message, listingId: id, subject: m.subject, date: m.date, ownNumbers }) };
}

const NOISE = /novi rezultati koji odgovaraju|spremljen(?:oj|a) pretra|unsubscribe od|odjava s liste|newsletter|automatski odgovor|out of office|delivery status/i;

// Glavna funkcija. ownNumbers = telefoni agenata/tvrtke koji se ne smiju pročitati kao kupčevi.
export function parseMail(m, { ownNumbers = [] } = {}) {
  const from = (m.from || '').toLowerCase();
  if (isOwn(from)) return { kind: 'skip', reason: 'vlastiti mail' };
  if (NOISE.test(`${m.subject} ${(m.text || '').slice(0, 600)}`)) return { kind: 'skip', reason: 'obavijest / newsletter' };
  const key = portalKey(from);
  if (!key) return { kind: 'unknown', reason: 'pošiljatelj nije poznati portal' };
  const parsed = key === 'njuskalo.hr' ? parseNjuskalo(m, ownNumbers) : key === 'luxuryestate.com' ? parseLuxury(m, ownNumbers) : parseGeneric(m, PORTALS[key], ownNumbers);
  if (!parsed) return { kind: 'skip', reason: 'nema email adrese kupca' };
  if (parsed.rental && process.env.INCLUDE_RENTALS !== '1') return { kind: 'skip', reason: 'najam', lead: parsed.lead };
  return { kind: 'lead', lead: parsed.lead };
}
