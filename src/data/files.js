// Dokumenti uz vile (ugovori u PDF-u i sl.): spremaju se u Supabase Storage (privatni spremnik "ugovori").
// Bez baze (lokalni način) učitavanje dokumenata nije dostupno.
import { supabase, remoteEnabled } from '../lib/supabase';

const BUCKET = 'ugovori';
export const filesEnabled = remoteEnabled;
export const MAX_MB = 25;
export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.doc,.docx';

// samo slova, brojke, točka, crtica i podcrtica (Storage ne voli č, š, razmake…)
const safe = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z0-9._-]+/g, '_');

export async function uploadFile(villaId, file) {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Datoteka je veća od ${MAX_MB} MB.`);
  const path = `${villaId}/${Date.now()}-${safe(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(/bucket not found/i.test(error.message) ? 'Spremnik „ugovori” ne postoji: pokrenite SQL iz docs/UPUTE-VILE.md.' : error.message);
  return { id: crypto.randomUUID(), path, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
}

export async function openFile(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300); // veza vrijedi 5 minuta
  if (error) throw new Error(error.message);
  window.open(data.signedUrl, '_blank', 'noopener');
}

export async function removeFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
