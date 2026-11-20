// Prijedlozi iz maila: ljudi s kojima se dopisuje, a nisu u CRM-u i nisu poslali upit preko portala.
// Ništa se ne dodaje sam: nastaje zapis s oznakom `suggestion`, a u CRM-u ga treba potvrditi.
import { NOISE, detectLanguage, domainOf, isOwn, portalKey } from './parse.js';
import { zagrebDay } from './merge.js';

// Privatni mail pružatelji (kupci i vlasnici obično pišu s njih); poslovne domene se ne predlažu da ne bude buke
const PERSONAL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.it', 'outlook.de', 'hotmail.com', 'hotmail.it', 'hotmail.de', 'hotmail.co.uk', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.it', 'yahoo.de', 'yahoo.co.uk', 'ymail.com', 'icloud.com', 'me.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch', 'web.de', 't-online.de', 'freenet.de',
  'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'tim.it', 'protonmail.com', 'proton.me', 'siol.net', 'net.hr', 'inet.hr', 't-com.hr', 'optinet.hr', 'vip.hr',
  'bluewin.ch', 'aon.at', 'a1.net', 'seznam.cz', 'centrum.cz', 'onet.pl', 'wp.pl', 'o2.pl',
]);
const AUTO_LOCAL = /^(no-?reply|do-?not-?reply|newsletter|news|info|office|marketing|mailer-daemon|postmaster|notifications?|support|billing|admin|sales|contact|bounce|system)/i;

const personal = (addr) => { const d = domainOf(addr); return PERSONAL.has(d) || d.endsWith('onmicrosoft.com'); };
const titleFromEmail = (a) => a.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();

// Je li ova adresa smislena za prijedlog?
export function worthSuggesting(addr, subject = '') {
  if (!addr || isOwn(addr) || portalKey(addr)) return false;
  if (AUTO_LOCAL.test(addr.split('@')[0])) return false;
  if (!personal(addr)) return process.env.SUGGEST_ALL === '1';
  return !NOISE.test(subject);
}

// Vraća novi zapis (prijedlog) ili null ako već postoji kupac s tom adresom ili nije smislen
export function makeSuggestion(leads, { address, name, subject, text, messageId, date }, now = new Date()) {
  const email = String(address || '').toLowerCase();
  if (!worthSuggesting(email, subject)) return null;
  if (leads.some((l) => l.email && l.email.toLowerCase() === email)) return null;
  const day = zagrebDay(date || now);
  return {
    id: crypto.randomUUID(), firm: 'dux', suggestion: true, kind: 'ostalo', name: (name || '').trim() || titleFromEmail(email) || email, email,
    language: detectLanguage(text || '', ''), source: 'mail', suggestSubject: String(subject || '').slice(0, 90), suggestedAt: day,
    temperature: 'topao', status: 'otvoren', notes: '', phone: '', mailIds: messageId ? [messageId] : [], createdAt: (date || now).toISOString(),
  };
}
