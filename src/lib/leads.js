import { daysFromToday, plusDays, today } from './dates';

export const TEMPERATURES = {
  vruc: { label: 'Vruć', badge: 'bg-red-600 text-white' },
  topao: { label: 'Topao', badge: 'bg-orange-400 text-navy' },
};

// Prijedlog roka za sljedeći follow-up (dana): vruć 4, topao 7 (kao u tablici). U obrascu se može promijeniti.
export const DEFAULT_DAYS = { vruc: 4, topao: 7 };
export const suggestDate = (temperature) => plusDays(today(), DEFAULT_DAYS[temperature] ?? 7);
export const isClosed = (l) => /^zatvoren/i.test(l.status || '');
// Vrsta kontakta: kupac (zadano), vlasnik (nudi nekretninu, ugovor o posredovanju), ostalo
export const KINDS = { kupac: 'Kupac', vlasnik: 'Vlasnik', ostalo: 'Ostalo' };
export const leadKind = (l) => l.kind || 'kupac';
// Prijedlozi iz maila i ignorirani se ne pokazuju u običnim popisima
export const isHidden = (l) => !!(l.suggestion || l.ignored);
// Ugovor o posredovanju: istekao / ističe u idućih 30 dana
export function contractState(l) {
  if (!l.contractUntil) return null;
  const d = daysFromToday(l.contractUntil);
  return d < 0 ? { state: 'expired', days: d } : d <= 30 ? { state: 'soon', days: d } : { state: 'ok', days: d };
}
// Tko vodi kupca (u Zadacima se follow-up pojavi u stupcu te osobe). Zadano: Vanja.
export const leadOwner = (l) => l.owner || 'Vanja';

const norm = (v) => String(v ?? '').trim();
const key = (v) => norm(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Excel datum (Date ili tekst) -> "YYYY-MM-DD"
function toIso(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = norm(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const COLS = {
  Temperatura: 'temperature', Kupac: 'name', Email: 'email', Telefon: 'phone', Jezik: 'language',
  Izvor: 'source', 'Zadnji kontakt': 'lastContact', 'ID oglasa': 'listingId', Lokacija: 'location',
  Tip: 'type', 'Cjenovni rang': 'priceRange', 'Što traži': 'wants', Prepreka: 'obstacle',
  'Zadnja komunikacija': 'lastComm', Status: 'status', 'Sljedeći korak': 'nextStep', 'Follow-up do': 'followUpDate',
};

const futureOrNull = (d) => (d && d >= today() ? d : null);

// Redovi tablice (prvi red = zaglavlje) -> popis kupaca. Uvozi samo vruće i tople.
export function rowsToLeads(rows, firm) {
  const [head, ...body] = rows;
  const idx = {};
  head.forEach((h, i) => { if (COLS[norm(h)]) idx[COLS[norm(h)]] = i; });
  if (idx.name === undefined || idx.temperature === undefined) throw new Error('Nedostaju stupci "Kupac" i "Temperatura".');
  const out = [];
  for (const r of body) {
    const t = key(r[idx.temperature]);
    const temperature = t.startsWith('vruc') ? 'vruc' : t.startsWith('topao') ? 'topao' : null;
    if (!temperature || !norm(r[idx.name])) continue;
    const g = (k) => (idx[k] === undefined ? '' : norm(r[idx[k]]));
    out.push({
      firm, temperature, name: g('name'), email: g('email'), phone: g('phone'), language: g('language'),
      source: g('source'), listingId: g('listingId').replace(/\.0$/, ''), location: g('location'), type: g('type'),
      priceRange: g('priceRange'), wants: g('wants'), obstacle: g('obstacle'), lastComm: g('lastComm'),
      nextStep: g('nextStep'), status: g('status') || 'otvoren',
      // Datum iz tablice vrijedi samo ako nije prošao – stari datumi nisu ažurirani i ne smiju sve učiniti "kasnim"
      lastContact: toIso(r[idx.lastContact]), followUpDate: futureOrNull(toIso(r[idx.followUpDate])),
    });
  }
  return out;
}

export async function parseExcel(file, firm) {
  const { default: readXlsxFile } = await import('read-excel-file');
  let rows;
  try { rows = await readXlsxFile(file, { sheet: 'Kupci' }); } catch { rows = await readXlsxFile(file); }
  return rowsToLeads(rows, firm);
}

// kasni / danas / uskoro / bez datuma
export function followUpState(lead) {
  if (isHidden(lead)) return 'hidden';
  if (isClosed(lead)) return 'closed';
  if (!lead.followUpDate) return 'none';
  const d = daysFromToday(lead.followUpDate);
  return d < 0 ? 'late' : d === 0 ? 'today' : 'soon';
}
export const nextDate = (days) => plusDays(today(), days);

export const waLink = (phone) => {
  const digits = norm(phone).replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
  return digits ? `https://wa.me/${digits}` : null;
};

// ---- Kontakti, nekretnine i 4 ključna odgovora ----
export const CHANNELS = { whatsapp: 'WhatsApp', email: 'Email', poziv: 'Poziv', ostalo: 'Ostalo' };

export const viewedIds = (l) => (l.viewings || []).filter((v) => v.status === 'viewed').map((v) => v.duxId);
export const plannedIds = (l) => (l.viewings || []).filter((v) => v.status === 'planned').map((v) => v.duxId);
// ručno upisani broj + pogledane s popisa
export const viewedTotal = (l) => (Number(l.viewedManual) || 0) + viewedIds(l).length;
export const parseIds = (text) => [...new Set(String(text || '').split(/[\s,;]+/).filter(Boolean))];

// Danas / kasni se računa samo za otvorene kupce
export const lateLeads = (leads) => leads.filter((l) => !isClosed(l) && followUpState(l) === 'late');

// Datum (YYYY-MM-DD) kad je kontakt zabilježen, po lokalnom vremenu
export const contactDay = (c) => {
  const d = new Date(c.at);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
export const allContacts = (leads) =>
  leads.flatMap((l) => (l.contacts || []).map((c) => ({ ...c, lead: l })));

// Isti kupac: isti email, inače isti telefon (samo znamenke), inače isto ime – uvijek unutar iste firme
const digits = (v) => String(v || '').replace(/\D/g, '');
export const sameLead = (a, b) => {
  if (a.firm !== b.firm) return false;
  if (a.email && b.email) return a.email.toLowerCase() === b.email.toLowerCase();
  if (digits(a.phone).length >= 8 && digits(b.phone).length >= 8) return digits(a.phone) === digits(b.phone);
  return !a.email && !b.email && a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
};
