import { daysFromToday, plusDays, today } from './dates';

export const TEMPERATURES = {
  vruc: { label: 'Vruć', badge: 'bg-red-600 text-white' },
  topao: { label: 'Topao', badge: 'bg-orange-400 text-navy' },
};

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
      lastContact: toIso(r[idx.lastContact]), followUpDate: toIso(r[idx.followUpDate]),
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
  if (!lead.followUpDate) return 'none';
  const d = daysFromToday(lead.followUpDate);
  return d < 0 ? 'late' : d === 0 ? 'today' : 'soon';
}
export const nextDate = (days) => plusDays(today(), days);

export const waLink = (phone) => {
  const digits = norm(phone).replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
  return digits ? `https://wa.me/${digits}` : null;
};
