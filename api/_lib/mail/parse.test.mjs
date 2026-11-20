// Testovi čitača (izmišljeni podaci, oblik maila prema stvarnim primjerima). Pokretanje: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { simpleParser } from 'mailparser';
import { parseMail } from './parse.js';
import { mergeLead } from './merge.js';

const eml = (h, body) => `${Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`;
const read = async (raw) => {
  const m = await simpleParser(raw);
  return { from: m.from.value[0].address, replyTo: (m.replyTo?.value || []).map((a) => a.address), subject: m.subject, text: m.text, date: m.date, messageId: m.messageId };
};
const OWN = ['+385 91 189 8332', '+385 99 640 8438'];

const njuskalo = (title, text) => eml({
  From: 'noreply@njuskalo.hr', To: 'oglasi@dux-nekretnine.hr', 'Reply-To': 'ivo.test@example.com',
  Subject: `Upit s Njuškala za oglas ${title}`, Date: 'Wed, 18 Nov 2026 20:36:00 +0100', 'Message-ID': `<${Math.random()}@njuskalo.hr>`,
}, text);

test('Njuškalo: kupnja – email, šifra, cijena, telefon, ime iz potpisa', async () => {
  const m = await read(njuskalo('OPATIJA – stan 62 m², blizina mora', `Poštovani,\n\nZanima me stan. Kada bi se mogao pogledati?\nHvala i lp\nIvo Test\n0919455829\n\nPošiljatelj: ivt34 (ivo.test@example.com)\nOglas: OPATIJA – stan 62 m²\n\nInterna šifra: 42646\n\nCijena: 250000 EUR\n`));
  const r = parseMail(m, { ownNumbers: OWN });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.email, 'ivo.test@example.com');
  assert.equal(r.lead.listingId, '42646');
  assert.equal(r.lead.name, 'Ivo Test');
  assert.equal(r.lead.phone, '0919455829');
  assert.equal(r.lead.temperature, 'vruc'); // traži razgled
  assert.equal(r.lead.source, 'njuškalo');
  assert.equal(r.lead.review, true);
});

test('Njuškalo: najam se preskače', async () => {
  const m = await read(njuskalo('OPATIJA, IČIĆI – moderan stan za dugoročni najam', `Poštovani,\n\nDa li je stan još dostupan za najam?\n\nLp\nMate\n\nPošiljatelj: mt (ivo.test@example.com)\nInterna šifra: 42646\nCijena: 950 EUR\n`));
  assert.deepEqual([parseMail(m).kind, parseMail(m).reason], ['skip', 'najam']);
});

test('LuxuryEstate: ID i email u tijelu, talijanski jezik, vlastiti telefoni se ne čitaju', async () => {
  const m = await read(eml({ From: 'Luxury Estate <noreply@luxuryestate.com>', To: 'info@dux-nekretnine.hr', Subject: 'Nuova richiesta', Date: 'Thu, 19 Nov 2026 10:00:00 +0100', 'Message-ID': '<l1@luxuryestate.com>' },
    `ID 45182\n\nMi interessa questo immobile, vorrei avere maggiori informazioni sulla disponibilità e sul prezzo.\n\npaolo.test@example.com\nPaolo\n--\nLijep pozdrav / Kind regards\nDonna Karan\n+385 99 640 8438\n`));
  const r = parseMail(m, { ownNumbers: OWN });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.listingId, '45182');
  assert.equal(r.lead.email, 'paolo.test@example.com');
  assert.equal(r.lead.name, 'Paolo');
  assert.equal(r.lead.phone, ''); // to je Donnin broj
  assert.equal(r.lead.language, 'it');
});

test('Obavijest „novi rezultati” i vlastiti mailovi se preskaču; nepoznati pošiljatelj je „unknown”', async () => {
  const news = await read(eml({ From: 'DUX NEKRETNINE <info@dux-nekretnine.hr>', Subject: 'Nove nekretnine', 'Message-ID': '<n1@x>' }, 'Novi rezultati koji odgovaraju Vašoj spremljenoj pretrazi.'));
  assert.equal(parseMail(news).kind, 'skip');
  const unk = await read(eml({ From: 'netko@example.org', Subject: 'Pozdrav', 'Message-ID': '<u1@x>' }, 'Bok'));
  assert.equal(parseMail(unk).kind, 'unknown');
});

test('Spajanje: isti email = ažuriranje, isti mail dvaput = duplikat, novi = kreiran s rokom', async () => {
  const m = await read(njuskalo('OPATIJA – stan', `Poštovani,\n\nZanima me stan.\nLp\nIvo\n\nPošiljatelj: iv (ivo.test@example.com)\nInterna šifra: 111\nCijena: 200000 EUR\n`));
  const lead = parseMail(m).lead;
  const a = mergeLead([], lead, '<a@x>', 'id1', new Date('2026-11-20T10:00:00Z'));
  assert.equal(a.action, 'created');
  assert.equal(a.lead.followUpDate, '2026-11-27'); // topao +7
  const b = mergeLead([a.lead], { ...lead, listingId: '222' }, '<b@x>');
  assert.equal(b.action, 'updated');
  assert.equal(b.lead.listingId, '111, 222');
  assert.equal(b.lead.followUpDate, a.lead.followUpDate); // CRM-ov rok se ne dira
  assert.equal(mergeLead([b.lead], lead, '<b@x>').action, 'duplicate');
});

test('Njuškalo koristi vlastito pravilo (kratka interna šifra i cijena)', async () => {
  const m = await read(njuskalo('OPATIJA – stan', `Poštovani,\n\nZanima me stan.\n\nPošiljatelj: iv (ivo.test@example.com)\nInterna šifra: 111\nCijena: 200000 EUR\n`));
  const r = parseMail(m);
  assert.equal(r.lead.listingId, '111');
  assert.equal(r.lead.priceRange, '200000 EUR');
});
