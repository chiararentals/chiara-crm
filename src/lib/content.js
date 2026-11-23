import { today } from './dates';

// Content plan: platforme, firme (Marko = njegov osobni LinkedIn) i statusi
export const PLATFORMS = {
  instagram: { label: 'Instagram', short: 'IG', color: '#C13584' },
  tiktok: { label: 'TikTok', short: 'TT', color: '#111111' },
  facebook: { label: 'Facebook', short: 'FB', color: '#1877F2' },
  blog: { label: 'Blog (web)', short: 'Blog', color: '#2F855A' },
  linkedin: { label: 'LinkedIn', short: 'LI', color: '#0A66C2' },
  ostalo: { label: 'Ostalo', short: '•', color: '#6B7280' },
};
export const CONTENT_FIRMS = {
  chiara: { label: 'Chiara', color: '#B4233A' },
  bonvia: { label: 'Bonvia', color: '#C9B48A' },
  marko: { label: 'Marko (LinkedIn)', color: '#0A66C2' },
};
export const CONTENT_STATUS = {
  ideja: 'Ideja',
  planirano: 'Planirano',
  u_izradi: 'U izradi',
  spremno: 'Spremno za objavu',
  objavljeno: 'Objavljeno',
};

// Na koji se dan objava prikazuje u kalendaru: objavljene po stvarnom datumu, ostale po planiranom
export const calendarDay = (c) => (c.status === 'objavljeno' ? c.publishedDate || c.plannedDate : c.plannedDate) || null;

const norm = (v) => String(v ?? '').trim();
const key = (v) => norm(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// "04.11.2026", "4.11.2026." ili Excel datum -> "YYYY-MM-DD"
function toIso(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = norm(v);
  let m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const COLS = {
  'objava (ideja)': 'title', 'naslov / objava': 'title', 'ideja (tema)': 'title',
  'tema/kampanja': 'theme', format: 'format', status: 'status', 'status ideje': 'status',
  'planirani datum objave': 'plannedDate', 'stvarni datum objave': 'publishedDate',
  'link na vanjski sadrzaj': 'link', 'link (kad je live)': 'link',
  reach: 'reach', 'reach (24h)': 'reach', 'page views': 'reach',
  'engagement (broj)': 'engagement', 'engagement (vrijeme na stranici / konverzije)': 'engagement', 'engagement rate': 'engagementRate',
  napomena: 'notes', 'caption / copy': 'brief', 'kratki opis / brief': 'brief', 'kratki opis': 'brief', 'za koju mrezu': 'network',
};

export function platformOfSheet(name) {
  const k = key(name);
  if (/insta/.test(k)) return 'instagram';
  if (/tik/.test(k)) return 'tiktok';
  if (/face|fb/.test(k)) return 'facebook';
  if (/blog|web/.test(k)) return 'blog';
  if (/linked/.test(k)) return 'linkedin';
  return null;
}
const networkToPlatform = (v) => platformOfSheet(v) || 'ostalo';

function statusOf(v, planned) {
  const k = key(v);
  if (/objavljen/.test(k)) return 'objavljeno';
  if (/spremn/.test(k)) return 'spremno';
  if (/izrad/.test(k)) return 'u_izradi';
  if (/ideja/.test(k) && !planned) return 'ideja';
  if (/ideja/.test(k)) return 'ideja';
  return planned ? 'planirano' : 'ideja';
}

// Redovi jednog lista (zaglavlje se traži, jer iznad njega ima uputa) -> popis objava
export function rowsToContent(rows, platform, firm, sheetName) {
  const hi = rows.findIndex((r) => (r || []).some((c) => ['planirani datum objave', 'ideja (tema)'].includes(key(c))));
  if (hi < 0) return [];
  const idx = {};
  rows[hi].forEach((h, i) => { const f = COLS[key(h)]; if (f && idx[f] === undefined) idx[f] = i; });
  if (idx.title === undefined) return [];
  const isIdeas = idx.network !== undefined;
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const g = (f) => (idx[f] === undefined ? '' : norm(r[idx[f]]));
    const title = g('title').replace(/\s+/g, ' ').trim();
    if (!title || /primjer reda/i.test(g('notes'))) continue;
    if (isIdeas) {
      if (/^isko/.test(key(g('status')))) continue; // iskorištene ideje su već postale objave
      out.push({ firm, platform: networkToPlatform(g('network')), title, status: 'ideja', plannedDate: null, brief: g('brief'), notes: g('notes') });
      continue;
    }
    const plannedDate = toIso(r[idx.plannedDate]);
    const err = (v) => (/^#/.test(v) ? '' : v); // "#ERROR!" iz Google tablice se ignorira
    out.push({
      firm, platform, title, theme: g('theme'), format: g('format'), status: statusOf(g('status'), !!plannedDate),
      plannedDate, publishedDate: toIso(r[idx.publishedDate]), link: g('link'), brief: g('brief'), notes: g('notes'),
      reach: err(g('reach')), engagement: err(g('engagement')), engagementRate: err(g('engagementRate')),
    });
  }
  return out;
}

// Čita sve prepoznate listove (Instagram, TikTok, Facebook, Blog, Ideje…) iz .xlsx
export async function parseContentExcel(file, firm) {
  const { default: readXlsxFile, readSheetNames } = await import('read-excel-file');
  const names = await readSheetNames(file);
  const list = [], sheets = {}, ignored = [];
  for (const name of names) {
    const platform = platformOfSheet(name);
    const isIdeas = /^ideje/.test(key(name));
    if (!platform && !isIdeas) { ignored.push(name); continue; }
    const rows = await readXlsxFile(file, { sheet: name });
    const part = rowsToContent(rows, platform || 'ostalo', firm, name);
    sheets[name] = part.length;
    list.push(...part);
  }
  return { list, sheets, ignored };
}

export const todayIso = today;
