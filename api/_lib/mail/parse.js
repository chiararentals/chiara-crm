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
  'kvadratko.hr': 'kvadratko',
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
// Prepoznavanje izvora: prvo po pošiljatelju, a ako ga nema, po tipičnom tekstu maila
export function detectPortal(m) {
  const key = portalKey((m.from || '').toLowerCase());
  if (key) return key;
  const txt = `${m.subject}\n${m.text || ''}`;
  if (/Klijent je zainteresiran za Vašu nekretninu/i.test(txt) || /indomio/i.test(m.from || '')) return 'indomio.hr';
  if (/Imate novu poruku/i.test(txt) && /Primljena poruka za oglas/i.test(txt)) return 'nekretnine.hr';
  if (/Novi upit kupca za va[sš] oglas/i.test(txt) || /kvadratko/i.test(`${m.from} ${txt.slice(-500)}`)) return 'kvadratko.hr';
  return null;
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
const rental = /najam|za rent|\brent\b|affitto|miete|\bmonatlich/i;
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

function baseLead({ source, email, name, message, listingId, price, subject, date, listingTitle, ownNumbers, isRental }) {
  const phone = findPhone(message, ownNumbers);
  const text = message.trim();
  const temperature = hot.test(text) ? 'vruc' : 'topao';
  return {
    firm: 'dux', temperature, name: name || (email || '').split('@')[0], email: email || '', phone,
    language: detectLanguage(text), source, listingId: listingId || '', priceRange: price || '',
    wants: text.slice(0, 400), lastComm: `${(date || new Date()).toISOString().slice(0, 10)} upit (${source}): ${text.slice(0, 200)}`,
    status: 'otvoren', type: isRental ? 'najam' : '', listingTitle: listingTitle || subject || '', review: true, owner: 'Vanja',
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
      date: m.date, listingTitle: title, ownNumbers, isRental: rental.test(title) || rental.test(message) || /EUR\s*\/\s*mj|mjese/i.test(price || ''),
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
    lead: baseLead({ source: 'luxuryestate', email, name, message, listingId: id, subject: m.subject, date: m.date, ownNumbers, isRental: rental.test(message) }),
  };
}

// ---------- Ostali portali i nepoznati oblici: samo ono što se može sigurno izvući ----------
function parseGeneric(m, source, ownNumbers) {
  const body = m.text || '';
  const email = (m.replyTo || []).find((a) => !isOwn(a)) || (body.match(EMAIL_RE) || []).find((a) => !isOwn(a) && !portalOf(a));
  if (!email) return null;
  const id = (body.match(/(?:[sš]ifra|ID|ref\.?|oglas(?:a)?)\D{0,6}(\d{4,6})/i) || m.subject.match(/\b(\d{4,6})\b/) || [])[1];
  const message = cleanLines(body).filter((l) => l && !GREETING.test(l)).slice(0, 12).join('\n');
  return { rental: rental.test(m.subject) || rental.test(message), lead: baseLead({ source, email, name: nameFromSignature(message), message, listingId: id, subject: m.subject, date: m.date, ownNumbers, isRental: rental.test(m.subject) || rental.test(message) }) };
}

const labelValue = (lines, label) => {
  const re = new RegExp(`^${label}\\b\\s*:?\\s*`, 'i');
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) return '';
  return lines[i].replace(re, '').trim() || lines[i + 1] || '';
};

// ---------- Indomio ("Klijent je zainteresiran za Vašu nekretninu!") ----------
function parseIndomio(m, ownNumbers) {
  const lines = cleanLines(m.text).filter(Boolean);
  const idIdx = lines.findIndex((l) => /^#\d{3,7}\b/.test(l));
  const emailIdx = lines.findIndex((l) => (l.match(EMAIL_RE) || []).some((a) => !isOwn(a) && !portalKey(a)));
  if (emailIdx < 0) return null;
  const email = lines[emailIdx].match(EMAIL_RE).find((a) => !isOwn(a) && !portalKey(a));
  const hasPhone = emailIdx > 0 && findPhone(lines[emailIdx - 1], ownNumbers);
  const name = lines[hasPhone ? emailIdx - 2 : emailIdx - 1] || '';
  const stop = lines.findIndex((l, i) => i > emailIdx && /^(Tel:|Odgovorite putem|Pogledajte upit)/i.test(l));
  const message = lines.slice(emailIdx + 1, stop > 0 ? stop : undefined).join('\n');
  const head = lines.slice(Math.max(idIdx, 0), Math.max(idIdx, 0) + 6).join(' ');
  const title = idIdx >= 0 ? lines[idIdx + 1] || '' : '';
  return {
    rental: rental.test(title) || rental.test(message),
    lead: {
      ...baseLead({
        source: 'indomio', email, name: /^[\p{L}][\p{L} .'-]{1,40}$/u.test(name) ? name : '', message, listingId: idIdx >= 0 ? lines[idIdx].match(/\d+/)[0] : '',
        price: (head.match(/€\s*[\d.,]+|[\d.,]+\s*(?:€|EUR)/) || [])[0], subject: m.subject, date: m.date, listingTitle: title, ownNumbers, isRental: rental.test(title) || rental.test(message),
      }),
      phone: hasPhone || findPhone(message, ownNumbers),
    },
  };
}

// ---------- Kvadratko ("Novi upit kupca za vaš oglas") ----------
function parseKvadratko(m, ownNumbers) {
  const lines = cleanLines(m.text).filter(Boolean);
  const from = lines.findIndex((l) => /^Poruka kupca/i.test(l));
  const to = lines.findIndex((l, i) => i > from && /^(Oglas|[SŠ]ifra objekta)\b/i.test(l));
  const message = lines.slice(from + 1, to > from ? to : undefined).join('\n');
  const email = (labelValue(lines, 'E-?mail').match(EMAIL_RE) || [])[0] || (m.replyTo || []).find((a) => !isOwn(a));
  if (!email) return null;
  const title = labelValue(lines, 'Oglas');
  const phoneRaw = labelValue(lines, 'Telefon');
  const isRental = rental.test(title) || rental.test(message);
  return {
    rental: isRental,
    lead: {
      ...baseLead({
        source: 'kvadratko', email, name: labelValue(lines, 'Ime'), message, listingId: (labelValue(lines, '[SŠ]ifra objekta').match(/\d+/) || [])[0], subject: m.subject, date: m.date,
        listingTitle: title, ownNumbers, isRental,
      }),
      phone: findPhone(phoneRaw, ownNumbers) || findPhone(message, ownNumbers),
    },
  };
}

// ---------- Web obrazac Duxa ("X je poslao upit …") i "Novi kontakt za oglas N": šalju se i s vlastite domene ----------
const REPLY_PREFIX = /^\s*(re|fwd?|odg|aw)\s*:/i;
const isWebForm = (subject = '') => !REPLY_PREFIX.test(subject) && /\bje poslao(?:la)? upit\b/i.test(subject);
const isNewContact = (subject = '') => !REPLY_PREFIX.test(subject) && /^\s*Novi kontakt za oglas\s*\d+/i.test(subject);

const titleCase = (n) => (n && n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) : n);

function parseWebForm(m, ownNumbers) {
  const subj = m.subject || '';
  const lines = cleanLines(m.text).filter(Boolean);
  // Polja korisnika su iza "Podaci o korisniku su u nastavku" (iznad su podaci tvrtke Dux)
  const start = lines.findIndex((l) => /Podaci o korisniku/i.test(l));
  const part = start >= 0 ? lines.slice(start + 1) : lines;
  const first = labelValue(part, 'Ime');
  const last = labelValue(part, 'Prezime');
  const nameFromSubject = ((subj.match(/(?:DUX NEKRETNINE:\s*)?(.+?)\s+je poslao(?:la)? upit/i) || [])[1] || '').trim();
  const name = titleCase([first, last].filter(Boolean).join(' ') || nameFromSubject);
  const fromField = (labelValue(part, 'E-?mail').match(EMAIL_RE) || [])[0];
  const email = (m.replyTo || []).find((a) => !isOwn(a)) || fromField || (m.text || '').match(EMAIL_RE)?.find((a) => !isOwn(a) && !portalKey(a));
  if (!email || isOwn(email)) return null;
  const mi = part.findIndex((l) => /^Poruka\b/i.test(l));
  const message = (mi >= 0 ? part.slice(mi + 1) : part.filter((l) => !GREETING.test(l))).slice(0, 15).join('\n').replace(/^Poruka\s*:?\s*/i, '');
  const title = (subj.match(/upit\s*[:-]\s*(.+?)(?:\s*\(ID[^)]*\))?\s*$/i) || [])[1] || '';
  const id = (subj.match(/\bID\s*(?:kod)?\s*:?\s*(\d{3,7})/i) || subj.match(/oglas\s*(\d{3,7})/i) || (m.text || '').match(/(?:[SŠsš]ifra|\bID)\b[^\d\n]{0,14}(\d{3,7})/) || [])[1];
  const isRental = rental.test(title) || rental.test(message);
  return {
    rental: isRental,
    lead: {
      ...baseLead({
        source: isNewContact(subj) ? 'ostalo' : 'dux web', email, name, message, listingId: id, subject: subj, date: m.date,
        listingTitle: title, ownNumbers, isRental,
      }),
      phone: findPhone(labelValue(part, 'Telefon'), ownNumbers) || findPhone(message, ownNumbers),
    },
  };
}

// ---------- Nekretnine.hr ("Novi kontakt za oglas N") ----------
function parseNekretnineHr(m, ownNumbers) {
  const lines = cleanLines(m.text).filter(Boolean);
  const email = (m.replyTo || []).find((a) => !isOwn(a) && !portalKey(a)) || (labelValue(lines, 'E-?MAIL').match(EMAIL_RE) || [])[0];
  if (!email) return null;
  const name = labelValue(lines, 'IME').replace(/[\s.]+$/, '') || '';
  const bi = lines.findIndex((l) => /^Imate novu poruku/i.test(l));
  const pi = lines.findIndex((l) => /^Primljena poruka za oglas/i.test(l));
  // poruka: iza imena pošiljatelja (prvi redak nakon "Imate novu poruku"), do "Primljena poruka za oglas"
  const message = lines.slice(bi >= 0 ? bi + 2 : 0, pi > 0 ? pi : undefined).join('\n');
  const id = (m.subject.match(/oglas\s*(\d{3,7})/i) || (lines[pi] || '').match(/(\d{3,7})/) || [])[1];
  const title = pi >= 0 ? lines[pi + 1] || '' : '';
  const priceRaw = pi >= 0 ? lines.slice(pi + 1, pi + 6).find((l) => /€/.test(l)) : '';
  const price = priceRaw && /\d{4,}|\d\.\d{3}/.test(priceRaw) ? priceRaw : '';
  const isRental = rental.test(title) || rental.test(message);
  return {
    rental: isRental,
    lead: {
      ...baseLead({ source: 'nekretnine.hr', email, name, message, listingId: id, price, subject: m.subject, date: m.date, listingTitle: title, ownNumbers, isRental }),
      phone: findPhone(labelValue(lines, 'TELEFON'), ownNumbers) || findPhone(message, ownNumbers),
    },
  };
}

// Portali šalju i reklame/obavijesti; upit je samo ono što ima tipične oznake upita
function looksLikeInquiry(key, m) {
  const t = m.text || '';
  switch (key) {
    case 'indomio.hr': return /Klijent je zainteresiran/i.test(t);
    case 'kvadratko.hr': return /Novi upit kupca|Poruka kupca/i.test(`${m.subject}\n${t}`);
    case 'nekretnine.hr': return /Novi kontakt|Imate novu poruku|Primljena poruka za oglas/i.test(`${m.subject}\n${t}`);
    case 'njuskalo.hr': return /^Upit\b|\bupit\b/i.test(m.subject);
    case 'luxuryestate.com': return /^ID\s+\d+/im.test(t) || /richiesta|upit|inquiry|anfrage/i.test(m.subject);
    default: return true;
  }
}

const NOISE = /novi rezultati koji odgovaraju|spremljen(?:oj|a) pretra|unsubscribe od|odjava s liste|newsletter|automatski odgovor|out of office|delivery status/i;

// Glavna funkcija. ownNumbers = telefoni agenata/tvrtke koji se ne smiju pročitati kao kupčevi.
export function parseMail(m, { ownNumbers = [] } = {}) {
  const from = (m.from || '').toLowerCase();
  const formMail = isWebForm(m.subject) || isNewContact(m.subject);
  // kolega s naše domene proslijedio je upit portala ("Fwd: …"): čita se original iz tijela
  const forwarded = isOwn(from) && /^\s*(fwd?|fw)\s*:/i.test(m.subject || '');
  if (forwarded) m = { ...m, text: String(m.text || '').replace(/^[>\s]+/gm, ''), from: 'forward@forward.invalid' };
  if (isOwn(from) && !formMail && !forwarded) return { kind: 'skip', reason: 'vlastiti mail' };
  if (NOISE.test(`${m.subject} ${(m.text || '').slice(0, 600)}`)) return { kind: 'skip', reason: 'obavijest / newsletter' };
  const key = detectPortal(m);
  if (forwarded && !key) return { kind: 'skip', reason: 'vlastiti mail' };
  if (key && !looksLikeInquiry(key, m)) return { kind: 'skip', reason: 'obavijest / newsletter' };
  if (!key && formMail) {
    const w = parseWebForm(m, ownNumbers);
    if (!w) return { kind: 'skip', reason: 'nema email adrese kupca' };
    if (w.rental && process.env.SKIP_RENTALS === '1') return { kind: 'skip', reason: 'najam', lead: w.lead };
    return { kind: 'lead', lead: w.lead };
  }
  if (!key) return { kind: 'unknown', reason: 'pošiljatelj nije poznati portal' };
  const parsed = key === 'njuskalo.hr' ? parseNjuskalo(m, ownNumbers)
    : key === 'luxuryestate.com' ? parseLuxury(m, ownNumbers)
    : key === 'indomio.hr' ? parseIndomio(m, ownNumbers)
    : key === 'kvadratko.hr' ? parseKvadratko(m, ownNumbers)
    : key === 'nekretnine.hr' ? parseNekretnineHr(m, ownNumbers)
    : parseGeneric(m, PORTALS[key], ownNumbers);
  if (!parsed) return { kind: 'skip', reason: 'nema email adrese kupca' };
  // najam se uvozi (type = "najam"); preskače se samo ako je postavljeno SKIP_RENTALS=1
  if (parsed.rental && process.env.SKIP_RENTALS === '1') return { kind: 'skip', reason: 'najam', lead: parsed.lead };
  return { kind: 'lead', lead: parsed.lead };
}
