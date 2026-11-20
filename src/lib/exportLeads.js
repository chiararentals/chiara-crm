import { fmtDate } from './dates';
import { TEMPERATURES, leadOwner, plannedIds, viewedIds, viewedTotal } from './leads';
import { FIRMS } from '../seed';

const head = (value) => ({ value, fontWeight: 'bold' });
const d = (s) => (s ? fmtDate(s) : '');

// Izvoz trenutno filtrirane liste kupaca u .xlsx (za sastanke)
export async function exportLeads(leads) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const cols = ['Kupac', 'Firma', 'Temperatura', 'Voditelj', 'Rok follow-upa', 'Zadnji kontakt', 'Zadnje poslano', 'Dolazi u HR',
    'Pogledao (ukupno)', 'Pogledane nekretnine (ID)', 'Izabrano za gledanje (ID)', 'Sljedeći korak', 'Što traži', 'Prepreka',
    'Lokacija', 'Tip', 'Cijena', 'Telefon', 'Email', 'Jezik', 'Izvor'];
  const rows = leads.map((l) => [
    l.name, FIRMS[l.firm]?.name || '', TEMPERATURES[l.temperature]?.label || '', leadOwner(l), d(l.followUpDate), d(l.lastContact),
    l.lastSent || '', l.arrivalDate ? d(l.arrivalDate) : l.contacts?.length ? (l.arrivalNote || 'još ne zna') : '',
    l.contacts?.length || l.viewedManual ? viewedTotal(l) : '', viewedIds(l).join(', '), plannedIds(l).join(', '),
    l.nextStep || '', l.wants || '', l.obstacle || '', l.location || '', l.type || '', l.priceRange || '', l.phone || '', l.email || '',
    l.language || '', l.source || '',
  ]);
  const data = [cols.map(head), ...rows.map((r) => r.map((value) => ({ value: value === '' ? undefined : String(value) })))];
  const widths = [24, 9, 12, 10, 14, 14, 36, 14, 12, 20, 20, 34, 40, 30, 18, 14, 14, 16, 26, 8, 16].map((width) => ({ width }));
  await writeXlsxFile(data, { columns: widths }).toFile(`kupci-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
