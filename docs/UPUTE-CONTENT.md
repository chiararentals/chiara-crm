# Content (kalendar objava): jednokratna priprema + uvoz

Stranica **Content** je mjesečni kalendar objava (Instagram, TikTok, Facebook, Blog, LinkedIn) za firme **Chiara**, **Bonvia** i **Marko (osobni LinkedIn)**. Svaka objava ima mrežu, firmu, format, status (ideja → planirano → u izradi → spremno → objavljeno), planirani i stvarni datum, temu, tko radi, link, opis i neobavezne rezultate. Objave bez datuma su „Ideje” ispod kalendara.

## 1. Jednom pokrenite SQL
1. Supabase → **SQL Editor** → **New query**.
2. Zalijepite **cijeli sadržaj** datoteke `supabase/content.sql` (ne naziv datoteke!), **Run**. Mora pisati Success.
3. Osvježite CRM. Do tada stranica pokazuje upozorenje i ne sprema.

## 2. Uvoz iz vaše Google tablice (CONTENT_PLAN)
1. U Google tablici: **File → Download → Microsoft Excel (.xlsx)**.
2. U CRM-u: Content → odaberite „Uvoz za: Chiara” (ili Bonvia / Marko) → **Uvoz iz Excela** → odaberite datoteku.
3. Čitaju se listovi **Instagram, TikTok, Facebook, Blog** (planirane i objavljene objave) i **Ideje** (samo neiskorištene). Primjer redovi („Primjer reda — obriši…”) se preskaču, a #ERROR! iz tablice se ignorira.
4. Ponovni uvoz ne stvara duplikate: ista objava (firma, mreža, naslov i planirani datum) se ažurira, a CRM-ovi upisi ostaju.

## 3. Analitika
Poveznica **Social** u izborniku (i „Analitika (Social)” na stranici Content) otvara vašu nadzornu ploču s Metricoolom u novom tabu. Kolege trebaju Claude račun i podijeljenu stranicu.
