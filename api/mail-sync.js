// Čita Duxov sandučić (IMAP, samo čitanje) i upite kupaca upisuje u CRM (Supabase).
// Pokreće ga Vercel Cron (vercel.json) ili ručno: GET /api/mail-sync?dry=1  (dry=1 = ništa ne upisuje)
// Postavke (Vercel → Settings → Environment Variables): MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS,
// SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET, a po želji OWN_PHONES (zarezom), OWN_MAIL_DOMAIN, SYNC_DAYS.
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import { parseMail } from './_lib/mail/parse.js';
import { mergeLead } from './_lib/mail/merge.js';

export const config = { maxDuration: 60 };

const need = ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'CRON_SECRET'];

export default async function handler(req, res) {
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: `Nedostaju postavke: ${missing.join(', ')}` });
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Neovlašteno' });

  const dry = req.query?.dry === '1';
  const days = Number(req.query?.days || process.env.SYNC_DAYS || 3);
  const ownNumbers = (process.env.OWN_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const stats = { fetched: 0, created: 0, updated: 0, duplicate: 0, skipped: {}, unknown: [], dry };

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: rows, error } = await db.from('leads').select('data');
  if (error) return res.status(500).json({ error: `Baza: ${error.message}` });
  const leads = rows.map((r) => r.data);
  const changed = new Map();

  const imap = new ImapFlow({
    host: process.env.MAIL_HOST, port: Number(process.env.MAIL_PORT || 993), secure: true,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }, logger: false,
  });
  try {
    await imap.connect();
    const lock = await imap.getMailboxLock('INBOX', { readOnly: true }); // samo čitanje: ništa se ne mijenja u sandučiću
    try {
      const since = new Date(Date.now() - days * 864e5);
      const uids = await imap.search({ since }, { uid: true });
      for await (const msg of imap.fetch(uids, { source: true, uid: true }, { uid: true })) {
        stats.fetched++;
        const mail = await simpleParser(msg.source);
        const m = {
          from: mail.from?.value?.[0]?.address || '', replyTo: (mail.replyTo?.value || []).map((a) => a.address),
          to: (mail.to?.value || []).map((a) => a.address), subject: mail.subject || '', text: mail.text || '', date: mail.date, messageId: mail.messageId || `uid-${msg.uid}`,
        };
        const r = parseMail(m, { ownNumbers });
        if (r.kind === 'unknown') { stats.unknown.push({ from: m.from.split('@')[1] || '', subject: m.subject.slice(0, 80) }); continue; }
        if (r.kind === 'skip') { stats.skipped[r.reason] = (stats.skipped[r.reason] || 0) + 1; continue; }
        const out = mergeLead(leads, r.lead, m.messageId);
        stats[out.action]++;
        if (out.action !== 'duplicate') {
          changed.set(out.lead.id, out.lead);
          const i = leads.findIndex((l) => l.id === out.lead.id);
          if (i >= 0) leads[i] = out.lead; else leads.push(out.lead);
        }
      }
    } finally { lock.release(); }
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
