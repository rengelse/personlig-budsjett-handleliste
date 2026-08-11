# Changelog

## v0.8.7
- Redesignet hovedkategorier i katalogen med ikon øverst og kategorinavn under.
- Utvidet den lokale/offline katalogen kraftig til flere hundre vareoppføringer.
- Frukt & grønt, bakeri, meieri, tørrvarer, kjøtt/fisk, drikke, personlig pleie, hjem, rengjøring m.fl. har nå reelle omfattende vareutvalg.
- Tekst- og stemmesøk bruker den samme komplette lokale katalogen.
- Søket matcher både varenavn og kategori og håndterer norske tegn mer robust.
- Ingen endring i PB1/PB2, LAN-overføring eller Kassal.app-integrasjonen.

## v0.8.6
- Hotfix: rettet Java-kompileringsfeil i katalogens grid-layout (`row.addView(spacer, sp)`).
- Ingen funksjonelle endringer fra v0.8.5.

## v0.8.5
- Katalogtoppen har nå ett felles søkefelt for hele den lokale varekatalogen.
- Live søk viser treff mens du skriver.
- Ny mikrofonknapp bruker Androids talegjenkjenning og fyller søket automatisk.
- Ny strekkodeknapp åpner eksisterende EAN/UPC-skanner og Kassal.app-oppslag direkte fra katalogen.
- Kategorier og hurtigvalg fra v0.8.4 er beholdt.

## v0.8.4
- Katalogen er bygget om til et komplett lokalt kataloghierarki.
- Nye hurtigkategorier: Vegetar, Vegan, Keto, Glutenfri, Proteinrik, Frys og Populært.
- Hver hurtigkategori åpner et eget vareutvalg i et visuelt 3-kolonne grid.
- Hovedkatalogen er delt i MAT, DRIKKE, PERSONLIG PLEIE OG HELSE, HJEM OG LIVSSTIL og ANNET.
- Alle hovedkategorier har egne lokale basisvarer og kan brukes helt offline.
- Varer fra katalogen legges til med kategori og standardenhet og teller videre i Mest brukt/Nylig brukt.
- PB1/PB2, lokal LAN-overføring og Kassal.app er uendret.

## v0.8.3
- Nye avrundede handlingsbobler for Legg til/Overfør-dropdown.
- Innstillinger flyttet fra bunnmenyen til tannhjul øverst til høyre.
- Bunnnavigasjon redusert til Handleliste, Historikk og Overfør.
- Safe-area/statuslinje-insets lagt til i hovedlayouten.
- Temabinding rettet for Hold skjermen på, Til handlelisten og fremdriftskort.

# v0.8.2 – Felles app-logo

- Ny Android-logo basert på samme ikon som Personlig Budsjett desktop.
- Oppdatert launcher icon, round icon og adaptive icon.
- Samme logo brukes også i toppfeltet inne i appen.
- Ingen endringer i handlelogikk, PB1/PB2, LAN-overføring eller Kassal.app.

# Changelog

## v0.8.1
- Rettet temastøtten i Historikk: valgt palett brukes nå på historikkoppsummering, månedstitler, kortkanter, detaljseksjoner og «Send til PC».
- Slått sammen «Motta fra PC» og «Legg til» på Handleliste. «Motta fra PC» ligger nå som ekstra valg i Legg til-menyen.
- Ny todelt «+ Legg til»-knapp med egen nedtrekksdel for Skriv inn, Velg fra katalog, Skann kode og Motta fra PC.
- Redesignet Overfør-siden til samme empty-state-stil som tom Handleliste med «Klar for overføring?».
- Ny todelt «+ Overfør»-knapp med valgene Motta fra PC og Overfør til PC.
- «Overfør til PC» sender brukeren direkte til Historikk for valg av fullført handletur.
- PB1/PB2, Kassal.app-integrasjonen og LAN-transporten er uendret.

## v0.8.0
- Ny Legg til vare-meny med Skriv inn, Velg fra katalog og Skann kode.
- Strekkodeskanning støtter EAN-13, EAN-8, UPC-A og UPC-E i egen scanner-modus.
- Integrasjon med Kassal.app for EAN-oppslag av produkt, butikk og gjeldende pris.
- Egen Kassal.app-side under Innstillinger for API-nøkkel og tilkoblingstest.
- Skannede produkter kan velges fra flere butikk/pristreff og legges til handlelisten.
- PB1/PB2 og lokal PC-overføring er uendret.

## v0.7.2
- Redesignet Innstillinger til en ryddigere seksjonsbasert layout med store trykkflater.
- Ny egen Utseende-side med valg mellom System, Lys og Mørk modus.
- Ny Tema-side med fem lokale fargepaletter: Personlig Budsjett, Hav, Safir, Skog og Solnedgang.
- Tema påvirker primærknapper, fremdrift, aktiv bunnnavigasjon, gruppevalg og handlemarkeringer.
- Tema-siden har lokal forhåndsvisning før paletten lagres.
- Ny innstilling «Hold skjermen på» mens Handleliste er åpen.
- Utseendevalg og skjerminnstilling lagres permanent lokalt.
- PB1/PB2, LAN-overføring og handledata er uendret.

## v0.7.1
- Ny permanent bunnnavigasjon: Handleliste, Historikk, Overfør og Innstillinger.
- Egen Overfør-side for lokal PC-overføring.
- Ny visuell empty state og fullskjerm «Legg til vare» med Vanlige, Kategorier og Mest brukt.
- Lokal kategori-/basisvarekatalog og Nylig brukt under Vanlige.
- PB1/PB2 og LAN-overføring er uendret.

## v0.7.0
- Første større UI-redesign av Handleliste med kompakt fremdriftsheader og mindre dashboardpreg.
- Flatere, tettere varerader med tydelig avkrysning, vare/mengde og høyrejustert pris.
- Forenklede butikk-/kategoriheadere med antall varer, gruppesum og kollapskontroll på én linje.
- «Legg til vare» er hovedhandling nær bunnen; «Skjul/Vis handlet» er gjort visuelt sekundær.
- Ny empty state med «Motta fra PC» og «Legg til vare» når ingen aktiv liste finnes.
- Bunnnavigasjonen er endret til Handleliste → Historikk → Motta fra PC → Innstillinger.
- Hurtigvalg i «Legg til vare» vises kompakt og horisontalt.
- Ingen endringer i PB1/PB2, lokal LAN-overføring, historikkdata eller øvrig forretningslogikk.

## v0.6.8
- Rettet knapperekkefølgen i historikkdetaljen: «Slett» bruker nå venstre AlertDialog-posisjon, «Lukk» står i midten og «Send til PC» til høyre.
- «Mest brukt» bruker nå permanent lokal bruksstatistikk og er ikke lenger avhengig av varer i den aktive handlelisten.
- «Nylig brukt» sorterer nå etter faktisk siste-brukt-tidspunkt i stedet for å reversere «Mest brukt».
- Migrerer tidligere lagrede `last_<timestamp>`-verdier én gang, slik at eksisterende quick-add-historikk bevares.
- Lokal LAN-overføring og PB1/PB2 er uendret.

## v0.6.7
- Lagt til sletting av fullførte handleturer fra read-only historikkdetaljen.
- «Slett» ligger helt til venstre, tydelig adskilt fra «Send til PC».
- Sletting krever eksplisitt bekreftelse med varsel om at handleturen og alle lagrede varer fjernes permanent.
- Etter bekreftet sletting oppdateres Historikk umiddelbart; tomme måneder forsvinner automatisk.
- Aktiv handletur og lokal mobiloverføring er uendret.

## v0.6.6
- Byttet mobiloverføring fra data-i-QR til lokal HTTP pairing mot Personlig Budsjett Desktop v0.7.3.
- QR inneholder nå bare `/pb/send/<token>` eller `/pb/receive/<token>` på desktopens lokale IP/port.
- «Motta fra PC» gjør HTTP GET og leser direkte PB1 v2 JSON.
- «Send til PC» gjør HTTP POST med direkte PB2 v2 JSON fra fullført handletur.
- Validerer lokal/private IPv4, HTTP-scheme, retning/path og pairing-token før tilkobling.
- Tillater cleartext HTTP til lokal pairing-adresse og bruker ingen ekstern server.
- Lagt til håndtering av 400/404/405/410 og eksplisitt `{"ok":true}`-bekreftelse fra desktop.
- Fjernet ZXing QR-generatoravhengigheten fra app-builden; returdata vises ikke lenger som QR på mobilen.

## v0.6.5
- Added compact PB1 v2 decoding for Desktop v0.7.2.
- Added compact PB2 v2 return format with preserved desktop list/item identities.
- PB2 v2 returns only purchased items and optional actual total.
- PB2 v2 item price is emitted only when actual item price is known.
- Kept PB1 v1 input and PB2 v1 historical fallback compatibility.

## v0.6.4
- Forbedret QR-skanning av tettere PB1-koder med stabile UUID-er fra desktop.
- CameraX analyserer nå QR-bildet i høyere oppløsning (mål 1920×1080) for bedre ML Kit-dekoding.
- Ingen endringer i PB1/PB2-format eller handlelogikk.

## v0.6.3
- La til stabil `sourceListId` fra PB1 og `sid` i PB2.
- La til stabil `sourceItemId` fra PB1 og `li` per kjøpt vare i PB2.
- La til `cur: NOK` i PB2.
- La til valgfri `actualPrice` / `ap` i datamodell og PB2-protokoll.
- Bevarer kilde-ID-er gjennom lokal lagring, redigering, fullføring og historikk.
- Sikrere merge: PB1-linjer med ulik stabil ID slås ikke sammen på navn/EAN.
- Ved merge av forskjellige kildelister utelates toppnivå `sid` fremfor å sende feil identitet.
- Eldre PB1 uten ID-er er fortsatt bakoverkompatibel.

## v0.6.2
- Fullførte handleturer kan nå generere retur-QR via «Send til Personlig Budsjett».
- Ny separat PB2-protokoll for Android → desktop.
- PB2 inneholder handletur-ID, tidspunkt, forventet/faktisk total og bare varer som faktisk er markert kjøpt.
- Returdata komprimeres med GZIP og Base64 URL-safe for å holde QR-koden kompakt.
- PB1-importen er uendret.

## v0.6.1
- Kollapsbare måneder i Historikk; inneværende måned åpen som standard.
- Fullførte handleturer kan åpnes med vanlig trykk.
- Ny read-only detaljvisning med alle varer, butikk, kjøpt-status og prisoppsummering.
- Historiske data kan ikke redigeres.
- Forbereder UI for senere retur-QR til Personlig Budsjett.

# v0.6.0 – Handleturer og historikk

- Innfører en egen handleturmodell med stabil ID, opprettet tidspunkt og fullført tidspunkt.
- Skiller forventet totalpris fra faktisk totalpris.
- Faktisk total kan registreres manuelt før eller under fullføring.
- Fullførte handleturer lagres lokalt og vises i Historikk gruppert etter måned og dato.
- Historikken viser kjøpt-status, forventet total, faktisk total og avvik.
- «Fjern handlet» er endret til Skjul/Vis handlet slik at kjøpte varer ikke slettes fra turdataene.
- v0.5.2-lagring migreres automatisk til ny handleturmodell.
- PB1 og QR-import beholdes uendret. Retur-QR til desktop er ikke implementert ennå.

# v0.5.2 – Forbedret Innstillinger

- Slår sammen «Om appen» og «Oppdateringer» til ett kompakt kort.
- Viser installert versjon, nyeste versjon og oppdateringsstatus samlet.
- Beholder Release-info, manuell oppdateringssjekk og Oppdater-knappen.
- Ingen endringer i den fungerende oppdateringsmotoren.

# v0.5.1 – Oppdateringstest

- Ren testrelease for den nye permanent signerte v0.5.x-linjen.
- Ingen funksjonelle endringer utover versjonsnummer.
- Skal oppdages automatisk av installert v0.5.0.
- Tester varsling, release-info, nedlasting og Android-oppdatering over eksisterende installasjon.
- Eksisterende handlelister og brukerdata skal beholdes.

# v0.5.0 – Ny permanent signert baseline

- Ny ren release-linje etter reset av GitHub-repo og signing-oppsett.
- Permanent release-signering brukes fra første v0.5.x-versjon.
- Automatisk oppdateringssjekk og update engine er inkludert.
- GitHub Release fortsetter å publisere stabil asset med navnet handleliste.apk.
- v0.5.0 skal installeres manuelt én gang som ny baseline.
- Alle senere v0.5.x-versjoner skal kunne oppdatere over denne med samme signing key.
- Ingen gamle v0.4.x-tags eller releases skal gjenbrukes.

# v0.4.5 – Update Engine

- Automatisk sjekk mot GitHub Releases ved oppstart.
- Innstillinger viser installert og nyeste versjon.
- Varsel i Innstillinger/bunnmeny når ny versjon finnes.
- Release-info hentes fra GitHub.
- Oppdater-knapp laster ned `handleliste.apk` med prosentvis fremdrift.
- APK deles sikkert til Android-installasjonen via FileProvider.
- Androids systembekreftelse brukes for selve installasjonen.
- Handleliste og lokal lagring endres ikke.

## 0.7.1
- Ny bottom navigation og egen Overfør-side.
- Ny empty state.
- Fullskjerm Legg til vare med Vanlige, Kategorier og Mest brukt.
- Lokal kategorikatalog og nylig-brukt-liste.

## v0.8.5
- Globalt katalogsøk, stemmesøk og direkte strekkodeskanning fra katalogtoppen.
