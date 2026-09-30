// Početni predlošci poruka. Uređuju se u Postavkama.
// Oznake: {ime} {objekt} {jedinica} {datum_dolaska} {datum_odlaska} {vrijeme_dolaska} {potpis}
export const TEMPLATE_KINDS = {
  id_request: 'Zamolba za osobne iskaznice',
  confirmation: 'Potvrda bookinga',
};
export const LANGUAGES = { hr: 'Hrvatski', en: 'English', de: 'Deutsch' };

const T = (id, kind, language, subject, body) => ({ id, kind, language, subject, body });

export const TEMPLATES_SEED = [
  T('t1', 'id_request', 'hr', 'Podaci za prijavu boravka – Chiara',
`Poštovani {ime},

hvala Vam na rezervaciji ({jedinica}, {datum_dolaska} – {datum_odlaska}).

Kako bismo Vas mogli prijaviti u sustav eVisitor (zakonska obveza), molimo Vas da nam prije dolaska pošaljete fotografiju osobne iskaznice ili putovnice za sve goste.

Hvala Vam unaprijed!
Lijep pozdrav,
{potpis}
Chiara Apartments & Villas`),
  T('t2', 'id_request', 'en', 'Registration details for your stay – Chiara',
`Dear {ime},

thank you for your booking ({jedinica}, {datum_dolaska} – {datum_odlaska}).

To register you in the Croatian eVisitor system (a legal requirement), please send us a photo of the ID card or passport of every guest before arrival.

Thank you in advance!
Kind regards,
{potpis}
Chiara Apartments & Villas`),
  T('t3', 'id_request', 'de', 'Anmeldedaten für Ihren Aufenthalt – Chiara',
`Guten Tag {ime},

vielen Dank für Ihre Buchung ({jedinica}, {datum_dolaska} – {datum_odlaska}).

Für die gesetzlich vorgeschriebene Anmeldung im System eVisitor bitten wir Sie, uns vor der Anreise ein Foto des Personalausweises oder Reisepasses aller Gäste zu senden.

Vielen Dank im Voraus!
Freundliche Grüße,
{potpis}
Chiara Apartments & Villas`),
  T('t4', 'confirmation', 'hr', 'Potvrda rezervacije – Chiara',
`Poštovani {ime},

potvrđujemo Vašu rezervaciju: {jedinica} ({objekt}), dolazak {datum_dolaska} (oko {vrijeme_dolaska}), odlazak {datum_odlaska}.

Radujemo se Vašem dolasku!
Lijep pozdrav,
{potpis}
Chiara Apartments & Villas`),
  T('t5', 'confirmation', 'en', 'Booking confirmation – Chiara',
`Dear {ime},

we are happy to confirm your booking: {jedinica} ({objekt}), arrival {datum_dolaska} (around {vrijeme_dolaska}), departure {datum_odlaska}.

We look forward to welcoming you!
Kind regards,
{potpis}
Chiara Apartments & Villas`),
  T('t6', 'confirmation', 'de', 'Buchungsbestätigung – Chiara',
`Guten Tag {ime},

wir bestätigen Ihre Buchung: {jedinica} ({objekt}), Anreise {datum_dolaska} (ca. {vrijeme_dolaska}), Abreise {datum_odlaska}.

Wir freuen uns auf Ihren Besuch!
Freundliche Grüße,
{potpis}
Chiara Apartments & Villas`),
];
