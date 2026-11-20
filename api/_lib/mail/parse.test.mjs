// Testovi čitača (izmišljeni podaci, oblik maila prema stvarnim primjerima). Pokretanje: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { simpleParser } from 'mailparser';
import { parseMail } from './parse.js';
import { mergeLead } from './merge.js';
import { applySent, cleanSentText, senderName } from './sent.js';

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

test('Najam se uvozi s tipom „najam”; uz SKIP_RENTALS=1 se preskače', async () => {
  const m = await read(njuskalo('OPATIJA, IČIĆI – moderan stan za dugoročni najam', `Poštovani,\n\nDa li je stan još dostupan za najam?\n\nLp\nMate\n\nPošiljatelj: mt (ivo.test@example.com)\nInterna šifra: 42646\nCijena: 950 EUR\n`));
  const r = parseMail(m);
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.type, 'najam');
  process.env.SKIP_RENTALS = '1';
  assert.deepEqual([parseMail(m).kind, parseMail(m).reason], ['skip', 'najam']);
  delete process.env.SKIP_RENTALS;
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

const INDOMIO = `Klijent je zainteresiran za Vašu nekretninu!
#20981
Građevinsko zemljište 1100 m² za kupnju
Brseč (Mošćenička Draga)
€130.000
Petar Test
+421 911 000 111 (Cijeli dan)
petar.test@example.com
Poštovani, zanima me vaša ponuda zemljišta u mjestu BRSEČ broj oglasa: 13943437 cijena zemljišta 130.000 eura. Moj budžet je 100.000 eura. Da je vlasnik bio spreman sniziti cijenu, odmah bih kupio zemljište. Iskreno Petar Test
Tel: +421911000111
Odgovorite putem emaila
Pogledajte upit u Vašem sustavu
Ovo je automatski mail.
Indomio. Sva prava pridržana`;

test('Indomio: prepoznat po tekstu (bez poznatog pošiljatelja), ID (#), cijena, ime i telefon', async () => {
  const r = parseMail({ from: 'mailer@nepoznato.example', replyTo: [], subject: 'Novi upit', text: INDOMIO, date: new Date('2026-12-06T10:00:00Z'), messageId: '<i1@x>' });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.source, 'indomio');
  assert.equal(r.lead.listingId, '20981'); // naš ID (#), ne broj oglasa na portalu iz teksta
  assert.equal(r.lead.email, 'petar.test@example.com');
  assert.equal(r.lead.name, 'Petar Test');
  assert.match(r.lead.phone, /421/);
  assert.equal(r.lead.priceRange, '€130.000');
});

const KVADRATKO = `Novi upit kupca za vaš oglas
Poruka kupca
Guten Tag, ich interessiere mich für diese Immobilie, bzw ein Baugrundstück in der Region Opatija. Können Sie mir aktuelle Objekte zeigen? Mit freundlichen Grüßen, C. Test
Oglas
OPATIJA, IČIĆI - Grundstück für eine Villa mit Baugenehmigung 300 m² in der Nähe
Šifra objekta
25359
Ime
Christian Test
E-mail
chris.test@example.com
Telefon
Nije unesen
Odgovorite izravno na ovaj e-mail — vaš odgovor stiže kupcu.
Poruka je poslana automatski jer ste zaprimili novi upit na Kvadratko.hr.`;

test('Kvadratko: polja Ime/E-mail/Šifra objekta, bez telefona, njemački jezik', async () => {
  const r = parseMail({ from: 'info@kvadratko.hr', replyTo: ['chris.test@example.com'], subject: 'Novi upit', text: KVADRATKO, date: new Date(), messageId: '<k1@x>' });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.source, 'kvadratko');
  assert.equal(r.lead.listingId, '25359');
  assert.equal(r.lead.name, 'Christian Test');
  assert.equal(r.lead.phone, '');
  assert.equal(r.lead.language, 'de');
});

test('Poslano: odgovor kupcu = odrađen kontakt (bez citirane povijesti), novi rok od dana slanja, bez duplikata', () => {
  const lead = { id: 'l1', firm: 'dux', name: 'Petar', email: 'petar.test@example.com', temperature: 'vruc', status: 'otvoren', lastContact: '2026-12-01', followUpDate: '2026-12-05', contacts: [] };
  const leads = [lead];
  const sent = { to: ['Petar.Test@example.com'], subject: 'Re: upit', messageId: '<s1@x>', date: new Date('2026-12-06T09:00:00Z'),
    text: 'Poštovani, javljam se vezano uz zemljište. Šaljem ponudu.\n\nMarko\n\nOn Fri, Dec 4, 2026 Petar wrote:\n> Poštovani, zanima me' };
  assert.equal(applySent(leads, sent).length, 1);
  assert.equal(leads[0].lastContact, '2026-12-06');
  assert.equal(leads[0].followUpDate, '2026-12-10'); // vruć +4
  assert.equal(leads[0].contacts[0].auto, true);
  assert.ok(!leads[0].contacts[0].sentText.includes('zanima me'));
  assert.equal(leads[0].factsPending, true);
  assert.equal(applySent(leads, sent).length, 0); // isti mail dvaput
  assert.equal(applySent(leads, { ...sent, to: ['kolega@dux-nekretnine.hr'], messageId: '<s2@x>' }).length, 0);
});

test('cleanSentText reže citat', () => {
  assert.equal(cleanSentText('Bok\nlp\n> stari tekst'), 'Bok\nlp');
});

test('Tko je poslao: ime iz potpisa, inače zadano', () => {
  assert.equal(senderName('Poštovani,\njavljam se.\n\nSrdačan pozdrav,\nMarko', 'Vanja'), 'Marko');
  assert.equal(senderName('Poštovani,\njavljam se.\n\nLp,\nLea Test', 'Vanja'), 'Lea');
  assert.equal(senderName('Poštovani,\nSaljem ponudu, hvala.', 'Vanja'), 'Vanja');
});

test('Web obrazac s vlastite domene („X je poslao upit”) je upit; odgovor „Re:” nije', async () => {
  const form = await read(eml({ From: 'Dux <info@dux-nekretnine.hr>', 'Reply-To': 'katica.test@example.com', Subject: 'DUX NEKRETNINE: Katica Test je poslao upit - OPATIJA, CENTAR - 45m2', Date: 'Wed, 18 Nov 2026 20:36:00 +0100', 'Message-ID': '<w1@x>' },
    'Ime: Katica Test\nTelefon: 0911234567\nPoruka: Zanima me stan, mogu li ga pogledati?\nŠifra oglasa: 44123'));
  const r = parseMail(form, { ownNumbers: OWN });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.name, 'Katica Test');
  assert.equal(r.lead.source, 'dux web');
  assert.equal(r.lead.listingId, '44123');
  const re = { ...form, subject: 'Re: ' + form.subject };
  assert.equal(parseMail(re).kind, 'skip');
});

const WEBFORM = `DUX Nekretnine d.o.o.
Tizianova 8, 51000 Rijeka
Tel: +385 51 518 174, Mob: +385 91 480 8808
E-mail: info@dux-nekretnine.hr
Ovo je email upit od IVO TESTIC (ivo.testic@example.com) vezano uz Vaš oglas.
Za pregled kliknite na donju poveznicu:
OPATIJA, MOŠĆENIČKA DRAGA – vila s bazenom (ID Kod: 32625)
Kuća, Mošćenička Draga
Cijena: na upit
Podaci o korisniku su u nastavku:
Ime: IVO
Prezime: TESTIC
E-mail: ivo.testic@example.com
Telefon: 0994848848
Poruka:
Poštovani,
trenutno sam u potrazi za zemljištem na području Mošćenica. Zanima me cijena?
Hvala puno
Ivo Testic
+385 99 4848 848`;

test('Web obrazac (Ime/Prezime/E-mail/Telefon/Poruka): podaci kupca, ne tvrtke; ID iz naslova', async () => {
  const r = parseMail({ from: 'info@dux-nekretnine.hr', replyTo: [], subject: 'IVO TESTIC je poslao upit: OPATIJA, MOŠĆENIČKA DRAGA – vila s bazenom (ID Kod: 32625)', text: WEBFORM, date: new Date(), messageId: '<w2@x>' }, { ownNumbers: [] });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.name, 'Ivo Testic');
  assert.equal(r.lead.email, 'ivo.testic@example.com');
  assert.equal(r.lead.phone, '0994848848'); // ne +385 51 518 174 (tvrtka)
  assert.equal(r.lead.listingId, '32625');
  assert.equal(r.lead.source, 'dux web');
  assert.match(r.lead.wants, /zemljištem/);
});

const NEKRETNINE = `Imate novu poruku
Serena Test .
Mi interessa questo immobile, vorrei avere maggiori informazioni. Quanto costa?
Primljena poruka za oglas: 45670
Stan na prodaju
Kantrida, Rijeka
€ 1
131 m² | 4 sobe
Profil klijenta
IME
Serena Test .
E-MAIL
serena.test@example.com
TELEFON
+39 338 141 8166`;

test('Nekretnine.hr („Novi kontakt za oglas N”): ime, email, telefon, ID, talijanski; cijena „€ 1” se ignorira', async () => {
  const r = parseMail({ from: 'oglasi@nekretnine.hr', replyTo: ['serena.test@example.com'], subject: 'Novi kontakt za oglas 45670', text: NEKRETNINE, date: new Date(), messageId: '<n2@x>' });
  assert.equal(r.kind, 'lead');
  assert.equal(r.lead.source, 'nekretnine.hr');
  assert.equal(r.lead.listingId, '45670');
  assert.equal(r.lead.name, 'Serena Test');
  assert.match(r.lead.phone, /338/);
  assert.equal(r.lead.language, 'it');
  assert.equal(r.lead.priceRange, '');
});

test('Reklama portala nije upit; proslijeđeni upit („Fwd:”) kolege s naše domene se čita', async () => {
  const promo = { from: 'info@indomio.hr', replyTo: ['info@indomio.hr'], subject: 'Black Friday stiže na Nekretnine.hr!', text: 'Black Friday ponuda\nUštedite do 40%\nindomio', date: new Date(), messageId: '<p1@x>' };
  const rp = parseMail(promo);
  assert.equal(rp.kind, 'skip');
  const fwd = { from: 'tony@dux-nekretnine.hr', replyTo: [], subject: 'Fwd: Novi kontakt za oglas 45670', text: '---------- Forwarded message ----------\n' + NEKRETNINE, date: new Date(), messageId: '<f1@x>' };
  const rf = parseMail(fwd);
  assert.equal(rf.kind, 'lead');
  assert.equal(rf.lead.email, 'serena.test@example.com');
  assert.equal(rf.lead.listingId, '45670');
});
