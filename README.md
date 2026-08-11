# Personlig Budsjett Handleliste

**Gjeldende versjon: v0.8.1**

Android-handleappen for **Personlig Budsjett**. Desktop planlegger handlelisten; mobilen mottar den direkte fra Personlig Budsjett over samme lokale Wi-Fi/LAN og brukes under handleturen.


## Handleflate

Handlelisten er nå appens tydelige hovedflate: kompakt fremdrift øverst, flate varerader, butikk/kategori som små filtre og «Legg til vare» som primær tommelhandling. Når listen er tom vises en egen startflate med direkte tilgang til lokal PC-overføring eller manuell vare.


## Utseende og innstillinger

Fra v0.7.2 har appen egen Utseende-side med System/Lys/Mørk modus og lokale fargepaletter. Valgt palett brukes på sentrale aksentelementer som primærknapper, fremdrift, aktiv navigasjon og handlemarkeringer. Innstillingen «Hold skjermen på» kan holde telefonen våken mens Handleliste er åpen. Alle valg lagres lokalt.

## Lokal mobiloverføring

Fra v0.6.6 er QR-koden bare en kort, engangs pairing-adresse til Electron-appen på PC-en. Selve handlelisten ligger ikke i QR-koden.

- **Motta fra PC:** skann desktopens `/pb/send/<token>`-QR -> Android gjør lokal HTTP GET -> mottar direkte PB1 v2 JSON.
- **Send til PC:** åpne en fullført handletur -> skann desktopens `/pb/receive/<token>`-QR -> Android POST-er direkte PB2 v2 JSON.
- Ingen GZIP/Base64/PB-prefiks brukes over LAN.
- Ingen ekstern server eller sky brukes.
- Telefon og PC må være på samme lokale nettverk.
- Pairing-adressen valideres som lokal/private IPv4 og korrekt overføringsretning før tilkobling.

PB v2-identitetene fra desktop beholdes uendret gjennom hele handleturen slik at retur kan matches presist.

Se `QR_PROTOCOL.md` for full kontrakt.

## Handleturer og historikk

Den aktive handlelisten lagres som en handletur. Forventet total fra desktop beholdes separat fra manuelt registrert faktisk total. Fullførte turer lagres i lokal historikk, gruppert etter måned og dato, og kan åpnes i read-only detaljvisning.

## Distribusjon og oppdatering

GitHub Actions bygger signert release-APK. Tagger på formen `mobile-v*` publiserer APK-en som GitHub Release asset med stabilt navn `handleliste.apk`. Appens update engine bruker Latest Release.

Release-signering skal alltid bruke samme permanente signing key via GitHub Actions Secrets. `.jks` skal aldri committes til repositoryet.


## Hurtiglegg til

«Legg til vare» har lokal, permanent brukshistorikk:
- «Mest brukt» sorteres etter hvor mange ganger varen er lagt til manuelt.
- «Nylig brukt» sorteres etter faktisk siste-brukt-tidspunkt.
- Historikken beholdes mellom appstarter og er uavhengig av aktiv handleliste.


## Kassal.app-integrasjon (v0.8.0)
Legg til vare tilbyr Skriv inn, Velg fra katalog og Skann kode. Den lokale katalogen har hurtigkategorier (Vegetar, Vegan, Keto, Glutenfri, Proteinrik, Frys og Populært) og hovedseksjoner for Mat, Drikke, Personlig pleie/helse, Hjem/livsstil og Annet. Hver kategori åpner et eget varegrid. Strekkodeskanning gjør EAN-oppslag mot Kassal.app når en API-nøkkel er konfigurert under Innstillinger. API-nøkkelen lagres lokalt på telefonen og bygges ikke inn i APK-en.


## UI v0.8.1
- Handleliste bruker en todelt «+ Legg til»-knapp. Nedtrekksmenyen inneholder Skriv inn, Velg fra katalog, Skann kode og Motta fra PC.
- Overfør-siden bruker samme empty-state-stil som tom Handleliste, med Motta fra PC / Overfør til PC.
- Historikk følger valgt tema/palett.


## Visuell identitet

Android-appen bruker samme app-logo som Personlig Budsjett på desktop, inkludert adaptive launcher icons på nyere Android-versjoner.


## UI v0.8.4
Bunnnavigasjonen har tre hovedflater (Handleliste, Historikk, Overfør), mens Innstillinger åpnes fra tannhjulet øverst. Legg til/Overfør bruker egne avrundede handlingsbobler, og hovedlayouten respekterer Android statuslinje/system-insets. Temaet brukes også på brytere, historikkhandlinger og fremdriftskort.


## Katalog v0.8.8
Katalogen inneholder nå flere hundre lokale basisvarer fordelt på hurtigkategorier og hovedkategorier. Tekst- og stemmesøk bruker denne samme offline-katalogen.

## Skann til PC (prototype v0.9.0)

Handleliste-appen kan brukes som lokal strekkodeskanner for Personlig Budsjett desktop. Desktop viser en pairing-QR med en lokal URL på formen `http://<privat-ip>:<port>/pb/barcode/<token>`. Android scanner QR-en, åpner en kontinuerlig EAN/UPC-scanner og POST-er hver dekodede kode tilbake til samme lokale session. Produktoppslag og Kassal.app-logikk skal ligge på desktop i denne flyten.

Se `DESKTOP_BARCODE_PROTOCOL.md` for den konkrete prototypekontrakten.
