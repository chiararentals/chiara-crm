// Čita Duxov sandučić (IMAP, samo čitanje) i upite kupaca upisuje u CRM (Supabase).
// Pokreće ga Vercel Cron (vercel.json) ili ručno: GET /api/mail-sync?key=<CRON_SECRET>&dry=1  (dry=1 = ništa ne upisuje)
// Postavke (Vercel → Settings → Environment Variables): MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS,
// SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET, a po želji OWN_PHONES (zarezom), OWN_MAIL_DOMAIN, SYNC_DAYS.
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import { parseMail } from './_lib/mail/parse.js';
import { mergeLead } from './_lib/mail/merge.js';
import { applySent } from './_lib/mail/sent.js';

export const config = { maxDuration: 60 };

// Adresa projekta smije imati višak na kraju (npr. /rest/v1/): uzima se samo https://nešto.supabase.co
const supabaseOrigin = (u) => { try { return new URL(String(u).trim()).origin; } catch { return String(u).trim(); } };

// Koja je vrsta ključa (bez otkrivanja ključa): publishable / secret / anon / service_role / nepoznato
function keyKind(key = '') {
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('sb_secret_')) return 'secret';
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role || 'nepoznato'; } catch { return 'nepoznato'; }
}

const need = ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'CRON_SECRET'];

export default async function handler(req, res) {
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: `Nedostaju postavke: ${missing.join(', ')}` });
  const secret = process.env.CRON_SECRET;
  if (req.headers.authorization !== `Bearer ${secret}` && req.query?.key !== secret) return res.status(401).json({ error: 'Neovlašteno' });

  const kind = keyKind(process.env.SUPABASE_SERVICE_KEY);
  if (kind === 'publishable' || kind === 'anon') {
    return res.status(500).json({ error: `SUPABASE_SERVICE_KEY je javni ključ (${kind}). Treba tajni: "Secret key" (sb_secret_…) ili "service_role".` });
  }
  const dry = req.query?.dry === '1';
  const days = Number(req.query?.days || process.env.SYNC_DAYS || 3);
  const ownNumbers = (process.env.OWN_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const stats = { preview: [], folders: [], fetchedBy: {}, ownSample: [], noEmailSample: [], fetched: 0, created: 0, updated: 0, duplicate: 0, replies: 0, sentLogged: 0, skipped: {}, unknown: [], dry };
  const sentBy = process.env.SENT_AS_NAME || 'Vanja'; // ime kad se u potpisu ne prepozna nitko iz tima

  const db = createClient(supabaseOrigin(process.env.SUPABASE_URL), process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: rows, error } = await db.from('leads').select('data');
  if (error) {
    const hint = /permission denied/i.test(error.message)
      ? ` (vrsta ključa: ${kind}). Ako je ključ tajni, u Supabase SQL Editoru pokrenite: grant all on all tables in schema public to service_role;`
      : '';
    return res.status(500).json({ error: `Baza: ${error.message}${hint}` });
  }
  const leads = rows.map((r) => r.data);
  const changed = new Map();

  const imap = new ImapFlow({
    host: process.env.MAIL_HOST, port: Number(process.env.MAIL_PORT || 993), secure: true,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }, logger: false,
  });
  try {
    await imap.connect();
    const boxes = await imap.list();
    stats.folders = boxes.map((b) => b.path).slice(0, 60); // popis mapa u sandučiću (da vidimo gdje leže upiti)
    // INBOX + mape iz MAIL_FOLDERS (npr. "INBOX.Upiti, INBOX.Portali"), samo ako postoje
    // Ako MAIL_FOLDERS nije postavljen, automatski se čitaju i mape riješenih upita / portala (RIJEŠENO, Upiti, Portali…)
    const wanted = (process.env.MAIL_FOLDERS || '').split(',').map((f) => f.trim()).filter(Boolean);
    const extra = wanted.length
      ? wanted.filter((f) => boxes.some((b) => b.path === f))
      : boxes.filter((b) => /rije[sš]eno|upit|portal|njuskalo|kvadratko|automatsk/i.test(b.path.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) && b.path.toUpperCase() !== 'INBOX').map((b) => b.path);
    stats.extraFolders = extra;
    for (const folder of ['INBOX', ...extra]) {
    const lock = await imap.getMailboxLock(folder, { readOnly: true }); // samo čitanje: ništa se ne mijenja u sandučiću
    try {
      const since = new Date(Date.now() - days * 864e5);
      const uids = await imap.search({ since }, { uid: true });
      for await (const msg of imap.fetch(uids, { source: true, uid: true }, { uid: true })) {
        stats.fetched++;
        stats.fetchedBy[folder] = (stats.fetchedBy[folder] || 0) + 1;
        const mail = await simpleParser(msg.source);
        const m = {
          from: mail.from?.value?.[0]?.address || '', replyTo: (mail.replyTo?.value || []).map((a) => a.address),
          to: (mail.to?.value || []).map((a) => a.address), subject: mail.subject || '', text: mail.text || '', date: mail.date, messageId: mail.messageId || `uid-${msg.uid}`,
        };
        const r = parseMail(m, { ownNumbers });
        if (r.kind === 'unknown') {
          // kupac odgovara iz svog maila: osvježi zadnju komunikaciju
          const cur = leads.find((l) => l.email && l.email.toLowerCase() === m.from.toLowerCase());
          if (cur) {
            if (!(cur.mailIds || []).includes(m.messageId)) {
              const upd = { ...cur, mailIds: [...(cur.mailIds || []), m.messageId].slice(-50), lastWrote: 'kupac',
                lastComm: `${(m.date || new Date()).toISOString().slice(0, 10)} odgovor kupca: ${String(m.text || '').trim().slice(0, 200)}` };
              leads[leads.indexOf(cur)] = upd; changed.set(upd.id, upd); stats.replies++;
            }
          } else if (stats.unknown.length < 40) stats.unknown.push({ from: m.from.split('@')[1] || '', subject: m.subject.slice(0, 80) });
          continue;
        }
        if (r.kind === 'skip') {
          stats.skipped[r.reason] = (stats.skipped[r.reason] || 0) + 1;
          if (r.reason === 'vlastiti mail' && stats.ownSample.length < 12) stats.ownSample.push({ from: m.from, subject: m.subject.slice(0, 50) });
          if (r.reason === 'nema email adrese kupca' && stats.noEmailSample.length < 8) {
            stats.noEmailSample.push({ from: m.from, subject: m.subject.slice(0, 60), textLen: (m.text || '').length, replyTo: m.replyTo.length, emailsInText: ((m.text || '').match(/[\w.+-]+@[\w.-]+\.\w+/g) || []).length });
          }
          continue;
        }
        const out = mergeLead(leads, r.lead, m.messageId);
        stats[out.action]++;
        if (out.action !== 'duplicate' && stats.preview.length < 15) {
          const l = out.lead;
          stats.preview.push({ akcija: out.action, ime: l.name, email: l.email, izvor: l.source, oglas: l.listingId, temp: l.temperature, tip: l.type || '', telefon: l.phone ? 'da' : 'ne', jezik: l.language });
        }
        if (out.action !== 'duplicate') {
          changed.set(out.lead.id, out.lead);
          const i = leads.findIndex((l) => l.id === out.lead.id);
          if (i >= 0) leads[i] = out.lead; else leads.push(out.lead);
        }
      }
    } finally { lock.release(); }
    }

    // Poslano: što smo odgovorili kupcima (bilježi se kao odrađen kontakt)
    const sentBox = boxes.find((b) => b.specialUse === '\\Sent') || boxes.find((b) => /^(inbox\.)?sent( items| mail)?$/i.test(b.path));
    if (sentBox) {
      const lock2 = await imap.getMailboxLock(sentBox.path, { readOnly: true });
      try {
        const uids = await imap.search({ since: new Date(Date.now() - days * 864e5) }, { uid: true });
        for await (const msg of imap.fetch(uids, { source: true, uid: true }, { uid: true })) {
          const mail = await simpleParser(msg.source);
          const out = applySent(leads, {
            to: (mail.to?.value || []).map((a) => a.address), cc: (mail.cc?.value || []).map((a) => a.address),
            subject: mail.subject || '', text: mail.text || '', date: mail.date, messageId: mail.messageId || `sent-uid-${msg.uid}`,
          }, { by: sentBy });
          for (const l of out) { changed.set(l.id, l); stats.sentLogged++; }
        }
      } finally { lock2.release(); }
    } else stats.skipped['mapa Poslano nije pronađena'] = 1;
  } catch (e) {
    return res.status(502).json({ error: `Mail server: ${e.message}`, stats });
  } finally { await imap.logout().catch(() => {}); }

  if (!dry && changed.size) {
    const upsert = [...changed.values()].map((l) => ({ id: l.id, data: l, updated_at: new Date().toISOString() }));
    const { error: werr } = await db.from('leads').upsert(upsert, { onConflict: 'id' });
    if (werr) return res.status(500).json({ error: `Upis: ${werr.message}`, stats });
  }
  return res.status(200).json(stats);
}
