# v0.7.5 – Kollapsbar kjøpshistorikk og samlet Mobiloverføring

- Kjøpshistorikk grupperes nå i kollapsbare uker i stedet for én lang, flat tabell.
- Nyeste uke er åpen som standard; eldre uker er lukket og kan åpnes ved behov.
- Ukehodet viser uke, datointervall, antall varer og samlet kjøpsverdi.
- Dato beholdes på hver varelinje, mens den tidligere separate Uke-kolonnen er fjernet som redundant.
- Eksisterende periodefilter og sortering beholdes; sorteringen brukes på varelinjene innenfor ukegruppene.
- Den separate «Skann vare»-knappen er fjernet fra Handleliste-headeren.
- «Skann vare» er nå tredje valg under «Mobiloverføring», sammen med «Send til mobil» og «Motta fra mobil».
- Eksisterende vareskanner gjenbrukes uendret; kun inngangen til funksjonen er flyttet.
- Ingen databaseendringer eller endringer i mobiloverføringsprotokollen.

# v0.7.4 – Tøm Aktiv etter vellykket mobiloverføring

- `Send til mobil` fjerner nå varelinjene fra fanen `Aktiv` først når telefonen faktisk har hentet handlelisten via den lokale LAN-overføringen.
- QR-visning alene tømmer ikke listen; endringen skjer kun etter bekreftet GET fra Android-appen.
- Bare varelinjene som inngikk i den konkrete utsendingen fjernes. Nye eller endrede aktive varer påvirkes ikke.
- PB1-kildesnapshotet beholdes i `shoppingTrips`, slik at PB2-returen fortsatt kan matches og importeres korrekt til `Kjøpt`.
- Etter vellykket sending opprettes ny aktiv handleliste-ID for neste handleliste.
- Ingen databaseversjon eller eksisterende brukerdata endres.

# v0.7.3 – Direkte lokal Mobiloverføring

- Erstattet store PB1/PB2 QR-koder som transport med direkte lokal overføring mellom Electron-appen og Android-appen på samme Wi-Fi/LAN.
- `Send til mobil` starter en midlertidig lokal HTTP-sesjon i Electron og viser en liten QR-kode med lokal adresse og engangsnøkkel. Telefonen henter PB1 v2-data direkte fra PC-en.
- `Motta fra mobil` starter en tilsvarende lokal mottakssesjon. Telefonen scanner den lille QR-koden og sender PB2-data direkte tilbake til desktop.
- Ingen ekstern backend, konto, skylagring eller separat serverinstallasjon brukes; den lokale mottakeren eksisterer bare inne i Electron mens Mobiloverføring er aktiv.
- Hver sesjon bruker tilfeldig engangstoken, kan brukes én gang og utløper automatisk etter fem minutter.
- PB1/PB2 v2 beholdes som intern datakontrakt, men GZIP/Base64/QR brukes ikke lenger som normal transport. Eldre PB2 QR-dekoding beholdes for bakoverkompatibilitet.
- Eksisterende PB2-import, Kjøpt-historikk, forventet/faktisk pris og regnskapsføring er uendret.
- Ingen databaseversjon eller eksisterende brukerdata endres.

# v0.7.2 – Kompakt PB1/PB2 QR-format

- Forenklet mobiloverføringen til PB v2 med samme kompakte varemodell begge veier.
- PB1 v2 sender bare korte tekniske ID-er samt vare, mengde/enhet, kategori, butikk og pris.
- PB2 v2 returnerer samme varemodell; faktisk totalsum er eneste ekstra handleturfelt (`t`).
- Lange UUID-er, EAN, listenavn, valuta, timestamps og doble expected/actual-felt er fjernet fra nye QR-koder.
- Desktop beholder forventet pris og full kildedata lokalt i eksisterende PB1-snapshot og matcher retur via korte liste-/vare-ID-er.
- Nye aktive handlelister og varelinjer får korte transport-ID-er automatisk; eldre snapshots beholdes.
- PB2 v1 støttes fortsatt ved import for bakoverkompatibilitet.
- Ingen databaseversjon eller eksisterende brukerdata endres.

# v0.7.1 – PB2 bruker lokalt PC-kamera

- Rettet at `Motta fra mobil` kunne starte telefonkamera/Phone Link før kameravalget var gjort.
- PB2-kameralisten hentes nå uten et generisk `getUserMedia({video:true})`-kall, slik at Windows ikke får starte standardkameraet automatisk.
- PB2 velger et lokalt PC-kamera som standard når det kan identifiseres.
- Typiske mobil-/virtuelle kameraer (bl.a. Phone Link/Windows Virtual Camera) merkes i kameravelgeren og brukes ikke som automatisk standard.
- Sist valgte kamera gjenbrukes bare automatisk dersom det ikke er identifisert som mobil-/virtuelt kamera.
- Endringen gjelder kun `Mobiloverføring → Motta fra mobil`; `Send til mobil`/PB1 er uendret.
- Ingen database- eller protokollendringer.

# v0.7.0 – Kameravelger for Motta fra mobil

- Lagt til kameravelger i `Mobiloverføring → Motta fra mobil` for PB2-skanning på desktop.
- Kameralisten hentes fra kameraene Windows/Electron eksponerer, og valgt kamera startes eksplisitt via `deviceId`.
- Sist valgte PB2-mottakskamera huskes lokalt og gjenbrukes neste gang.
- Kameravalget er isolert til `Motta fra mobil`; `Send til mobil`/PB1 er uendret og deler ikke kamerainnstilling.
- Bytte av kamera stopper forrige videostrøm før det nye kameraet startes.
- Ingen databaseendringer eller endringer i PB1/PB2-protokollen.

# v0.6.8 – Automatisk prisoppdatering før handleliste

## 0.6.9
- Endret Handleliste-knappen fra «Send til mobil» til «Mobiloverføring».
- Lagt til samlet modal for PB1 Send til mobil og PB2 Motta fra mobil.
- PB1 sender nå stabil liste-ID og stabile varelinje-ID-er som additive v1-felt.
- Lagt til lokal PB1-kildesnapshot slik at PB2-retur kan matches robust mot opprinnelig desktop-liste.
- Lagt til PB2 v1-dekoding: Base64URL + GZIP + JSON med validering av protokollversjon og handletur-ID.
- Lagt til PC-kameraskanning av PB2 QR-koder med forhåndsvisning før import.
- Kjøpte PB2-linjer flyttes til Kjøpt; varer som ikke returneres forblir aktive.
- PB2-import er idempotent via Android-handleturens stabile ID.
- Faktisk handletotal bokføres som én Mat-utgift (`shopping-trip`) når `at` finnes, uten kunstig fordeling på varelinjer.
- Forventet og faktisk varepris beholdes separat; linjer uten `ap` merkes som estimert i kjøpshistorikken.
- Lagt til additiv IndexedDB v5-store `shoppingTrips` for mobiloverføringer og fullførte handleturer.
- Eksisterende brukerdata og eldre backupfiler bevares.


- Oppskrifter som brukes i valgt matplan får ferske Kassal.app-priser før handlelisten genereres.
- Prisoppslag dedupliseres på EAN og hentes med `pricesBulk` i bolker på opptil 100 produkter.
- En egen 24-timers per-EAN-cache i eksisterende `apiCache` hindrer unødvendige API-kall.
- Bulk-kall kjøres med minst 1,1 sekunders mellomrom for å holde appen under Kassal.app-grensen på 60 requests/minutt også ved svært store lister.
- Samme produkt beholdes. Eksisterende butikk beholdes når den finnes i ferske prisdata; hvis butikken ikke lenger finnes, brukes billigste tilgjengelige pris for samme EAN.
- Endrede priser lagrer forrige pris og tidspunkt for siste prisoppdatering, og oppskriftens totalpris/pris per porsjon beregnes på nytt.
- Hvis prisoppdateringen feiler, genereres handlelisten fortsatt med sist lagrede priser og brukeren varsles.
- Ingen databaseversjon eller eksisterende brukerdata endres.

# v0.6.7 – Release-info-knapp rettet

- Rettet feil der Release-info-knappen i Innstillinger kunne forbli deaktivert selv etter at versjonssjekken var ferdig.
- Knappen oppdateres nå dynamisk når updater-state/release-versjon mottas.
- Release-info åpner samme modal som topbar-varselet.
- Oppdaterings-, backup- og installasjonslogikken er ellers uendret.

# v0.6.6 – Testrelease for stille oppdatering

- Testrelease for å verifisere hele automatiske oppdateringsflyten fra v0.6.5.
- Ingen funksjonelle endringer utover versjonsnummer.
- Skal installeres via appens Oppdater-knapp uten NSIS-installasjonsdialog.
- Appen skal starte automatisk igjen som v0.6.6 etter oppdateringen.
- Stabilt release-filnavn og eksisterende backup/updater-logikk beholdes.

# v0.6.5 – Korrekt silent updater for electron-updater 6.x

- Rettet updater-kallet til `quitAndInstall(true, true)`.
- Første `true` aktiverer stille NSIS-installasjon.
- Andre `true` starter appen automatisk etter oppdateringen.
- Objektformen brukt i v0.6.3/v0.6.4 er fjernet fordi prosjektet bruker electron-updater 6.x / electron-builder 26.
- Stabilt artifactName fra v0.6.4 beholdes.
- Ingen database- eller brukerdataendringer.

# v0.6.4 – Stabilt filnavn for oppdateringer

- electron-builder bruker nå fast artifactName: Personlig-Budsjett-Setup-${version}.${ext}.
- Installer, blockmap og latest.yml vil dermed bruke samme filnavnkonvensjon automatisk.
- Manuell omdøping av release-filer skal ikke lenger være nødvendig.
- Hindrer 404-feil som skyldes at latest.yml peker på et annet navn enn GitHub-asseten.
- Updater-logikken ellers er uendret.

# v0.6.3 – Stille oppdateringsinstallasjon

- Oppdateringsinstallasjonen kjører nå stille i bakgrunnen på Windows.
- Brukeren får ikke lenger NSIS-installasjonsveiviseren under vanlig appoppdatering.
- Etter ferdig installasjon startes Personlig Budsjett automatisk igjen.
- Førstegangsinstallasjon beholder eksisterende installeroppsett.
- Backup, nedlasting, fremdrift og øvrig updater-logikk fra v0.6.1/v0.6.2 er uendret.
- Ingen database- eller brukerdataendringer.

# v0.6.2 – Ny logo og appikon

- Ny Personlig Budsjett-logo lagt inn i appen.
- Dagens PB-merke i topbar er erstattet med den nye illustrasjonen.
- Nytt Windows/appikon brukes av Electron, installer og snarveier.
- Komplett logo med illustrasjon + «Personlig Budsjett» følger som appasset.
- Oppdateringslogikken fra v0.6.1 er uendret.
- Ingen database- eller brukerdataendringer.

# v0.6.1 – Automatisk oppdateringsflyt

- Oppdater-knappen i Release-info er aktivert.
- Før nedlasting opprettes alltid en lokal backup av alle brukerdata, også hvis vanlig automatisk backup er slått av.
- electron-updater laster ned oppdateringen først etter brukerens Oppdater-klikk.
- Release-info viser nedlastingsfremdrift i prosent.
- Når nedlastingen er ferdig vises «Oppdatering klar».
- Appen kjører deretter quitAndInstall(), lukkes, installerer oppdateringen og startes på nytt.
- Feil under backup, nedlasting eller installasjon vises i oppdateringspanelet.
- Eksisterende GitHub-versjonssjekk og release-notes-normalisering er beholdt.

# v0.6.0 – Release notes-format

- Bygger på v0.5.98-koden med fungerende GitHub-versjonssjekk.
- Release notes fra GitHub/electron-updater normaliseres før visning.
- HTML som `<p>Test</p>` vises nå som `Test`.
- Avsnitt, linjeskift og punktlister beholdes som lesbare linjer.
- HTML-entiteter dekodes, men rå HTML rendres aldri direkte.
- Ingen endring i versjonssjekk, nedlasting, installasjon eller brukerdata.

# v0.5.98 – Ekte GitHub-versjonssjekk

- Bygger direkte på v0.5.97.
- UI-simuleringen for oppdateringer er fjernet.
- electron-updater er koblet mot det offentlige repoet rengelse/Personlig-Budsjett-Releases.
- Appen sjekker automatisk etter ny versjon etter oppstart.
- autoDownload er deaktivert: ingen oppdatering lastes ned uten brukerhandling.
- Topbar-varsel vises kun når en nyere versjon faktisk finnes.
- Om og oppdateringer viser installert versjon, nyeste versjon og reell status.
- Release-info bruker releaseName/releaseNotes fra GitHub/electron-updater.
- Oppdater-knappen vises ved tilgjengelig versjon, men er deaktivert i denne etappen.
- Ingen nedlasting, installasjon, quitAndInstall eller datamigrering er aktivert ennå.

# v0.5.97 – Release-info footer

- Oppdater-knappen er flyttet ned på samme linje som Lukk i Release-info-modalen.
- Oppdater har egen grønn handlingsfarge, mens Lukk forblir nøytral.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.96 – Oppdater flyttet til Release-info

- «Oppdater» er fjernet fra Om og oppdateringer-kortet.
- «Oppdater» ligger nå inne i Release-info-modalen.
- Samme modal åpnes både fra topbar-varselet og Release-info-knappen.
- Om og oppdateringer-kortet er dermed redusert til status, Release-info og manuell versjonssjekk.
- Ingen ekte GitHub-oppdatering er aktivert ennå.

# v0.5.95 – Topbar åpner Release-info

- Klikk på «Ny versjon»-badgen i topbar åpner nå Release-info direkte.
- Release-info-knappen i Om og oppdateringer bruker samme modal.
- Topbar navigerer ikke lenger først til Vedlikehold.
- Ingen funksjons-, database- eller datalogikkendringer utover UI-flyten.

# v0.5.94 – Kompakt release-info UI

- Fjernet hjelpeteksten under oppdateringsknappene.
- Fjernet «Ny versjon»-badge og releasedato fra Om og oppdateringer-kortet.
- Kortet viser nå kun installert versjon, nyeste versjon og handlinger.
- Ny «Release-info»-knapp åpner modal med release-tittel og «Hva er nytt».
- Oppdateringsknappene ligger nå bedre på linje med øvrige kort.
- Ingen ekte GitHub-kobling er aktivert ennå.
- Ingen database- eller datalogikkendringer.

# v0.5.93 – Oppdateringsvarsel og topbar

- Bygger på v0.5.92 UI-preview.
- Oppdateringsbadgen er flyttet til høyre i topbar der lys/mørk-knappen tidligere lå.
- Lys/mørk-knappen er fjernet fra topbar; tema endres fortsatt under Visningsinnstillinger.
- «Åpne nedlasting» er endret til «Oppdater».
- Oppdateringsflyten kommuniserer nå riktig modell: varsling automatisk, bruker starter oppdateringen, appen håndterer selve oppdateringen.
- UI-preview simulerer v0.5.94 som tilgjengelig release.
- Ingen ekte GitHub-oppdatering er aktivert ennå.

# v0.5.92 – UI-preview: oppdateringsvarsling

- Bygger direkte på v0.5.91.
- Simulerer at v0.5.92 er tilgjengelig for å teste brukeropplevelsen.
- Topbar viser diskret varsel om ny versjon.
- Klikk på varselet åpner Innstillinger → Vedlikehold.
- Om og oppdateringer viser installert versjon, nyeste versjon, releasedato og «Hva er nytt».
- Varsling er automatisk i målbildet; nedlasting og installasjon skal alltid gjøres manuelt.
- Ingen ekte GitHub-kobling eller nedlasting er aktivert i denne UI-prototypen.
- Ingen database- eller datalogikkendringer.

# v0.5.91 – Generelt omdøpt til Kategori

- Innstillingsfanen «Generelt» heter nå «Kategori».
- Sideoverskriften er forenklet til «Kategori» / «Kategorier».
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.90 – Generelt: to-korts bredde

- Generelt bruker nå et konsekvent grid med to like kort i bredden.
- Kategorier-kortet opptar én av to kolonner.
- Eventuelle senere kort på Generelt vil automatisk følge samme bredde.
- På smale skjermer går layouten til én kolonne.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.89 – Integrasjoner: konsistent kortbredde

- Kassalapp og Handleliste-app bruker nå samme kortbredde som tre-korts layouten på Innstillinger.
- Desktop-gridet har tre like kolonner; de to eksisterende kortene fyller de to første.
- Integrasjonskortene har lik høyde.
- Responsivt: to kolonner på mellomstore skjermer og én på smale skjermer.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.88 – Visningsinnstillinger flyttet

- De tre eksisterende kortene i Vedlikehold beholdes uendret på første rad.
- Visningsinnstillinger er flyttet fra Generelt til et eget kort under dem.
- Kortet har samme bredde/størrelseslogikk som kortene over.
- Forklaringstekst i Visningsinnstillinger er redusert.
- Generelt er nå fokusert på kategorier og grunninnstillinger.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.87 – Innstillinger: tre balanserte kort

- Data og sikkerhetskopi, Datavedlikehold og Om og oppdateringer er tre separate kort.
- Alle tre kort har lik høyde på desktop.
- Tekst og forklaringer er komprimert betydelig.
- Om og oppdateringer er flyttet fra Generelt til Vedlikehold.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.87 – Innstillinger: balanserte Vedlikehold-kort

- Data og sikkerhetskopi / Datavedlikehold har nå lik høyde.
- Tekst og forklaringer er forkortet betydelig.
- Kortene har strammere padding, spacing og kontrollhøyde.
- Viktige advarsler og funksjoner er beholdt.
- Ingen funksjons-, database- eller datalogikkendringer.

# v0.5.86 – Innstillinger: Vedlikehold med to separate kort

- Korrigerer v0.5.85-designen.
- «Data og sikkerhetskopi» og «Datavedlikehold» er nå to separate kompakte kort ved siden av hverandre.
- Data-kortet inneholder automatisk backup, backup-dropdown, gjenoppretting, eksport og import.
- Datavedlikehold-kortet inneholder rydd enkeltområde og Nullstill hele appen, med tydelig skille/fareseksjon.
- Kortene strekkes ikke til unødvendig høyde.
- På mindre skjermer stables kortene.
- Ingen database- eller datalogikkendringer.

# v0.5.85 – Innstillinger: Data og backup inn i Vedlikehold

- Bygger på v0.5.84.
- «Data & integrasjoner» er forenklet til «Integrasjoner».
- Integrasjoner inneholder nå kun Kassalapp og Handleliste-app.
- Data og sikkerhetskopi er flyttet til Vedlikehold.
- Siste 14 lokale sikkerhetskopier vises i én dropdown i stedet for en lang liste.
- Gjenoppretting skjer med «Velg sikkerhetskopi» + «Gjenopprett».
- Automatisk backup, eksport og import er samlet kompakt øverst i Vedlikehold.
- Rydd enkeltområde og Nullstill hele appen beholdes i samme kort under tydelige skiller.
- Ingen database- eller datalogikkendringer.

# v0.5.84 – Innstillinger: kompakt Vedlikehold

- Bygger på v0.5.83.
- «Rydd enkeltområder» er erstattet med én dropdown og én «Tøm valgt område»-knapp.
- Beskrivelse av valgt område vises under dropdownen.
- «Rydd enkeltområde» og «Nullstill hele appen» ligger nå i ett samlet Datavedlikehold-kort.
- Tydelig skille og faresone mellom vanlig rydding og full nullstilling.
- Eksisterende bekreftelsesdialoger og backup før full nullstilling er beholdt.
- Ingen database- eller datalogikkendringer.

# v0.5.83 – Versjonsinfo og trygg oppdateringsgrunnmur

- Viser faktisk installert versjon under Innstillinger → Generelt → Om og oppdateringer.
- Ny «Se etter oppdatering»-knapp.
- Oppdateringskilden er bevisst ukonfigurert inntil desktop-appen publiseres på GitHub.
- Oppdateringskontrollen er klar for GitHub Releases når API-/release-adresse settes i main-prosessen.
- Ingen automatisk installasjon er aktivert.
- Ved fremtidig nedlasting opprettes automatisk lokal backup før release-siden åpnes.
- Oppdateringsflyten endrer ikke IndexedDB, backupfiler eller brukerdata.
- Ingen databaseendring.

# v0.5.82 – Innstillinger: struktur og kompakt layout

- Bygger direkte på v0.5.81.
- Beholder hovedfanene Generelt / Data & integrasjoner / Vedlikehold.
- Data & integrasjoner er visuelt delt i Data og Integrasjoner.
- Kassalapp viser vanlig oppsett kompakt; Base URL, maks søkeresultater, cache og detaljstatus ligger under «Avanserte innstillinger».
- Handleliste-app bruker fast offisiell GitHub latest-download URL; sluttbrukeren trenger ikke konfigurere APK-adresse.
- Handleliste-app-kortet er redusert til QR, forklaring og Last ned APK.
- Innstillingskort strekkes ikke unødvendig til samme høyde.
- Generelt og Data & integrasjoner har redusert lokal spacing/padding uten globale kortendringer.
- Vedlikehold er funksjonelt uendret.

# v0.5.81 – Prisfall/Prishopp søk

- Lagt til Søk i «Finn produkter» for Prisfall og Prishopp, samme plassering som på Produkter.
- Søket filtrerer live på produktnavn, merke, kategori og EAN.
- Ingen nye API-kall; filtreringen skjer kun på allerede lastede ukelister.
- Sortering beholder aktivt søk.
- Ingen databaseendring.

# v0.5.80 – Prisfall/Prishopp bilder

- Bygger på v0.5.79.
- Weekly-parseren finner nå nærmeste produktbilde både før og etter produktlenken.
- Støtter src, data-src, data-lazy-src, data-original, srcset og data-srcset.
- Relative Kassalapp-bildeadresser normaliseres til full URL.
- Ingen per-EAN API-oppslag gjeninnføres; rask lasting fra v0.5.79 beholdes.
- Ingen databaseendring.

# v0.5.79 – Prisfall/Prishopp lasting

- Bygger på v0.5.78.
- Retter gammel DOM-sentinel som fikk Prisfall/Prishopp-panelet til å bygges opp på nytt under rendering.
- Fjerner per-EAN metadataoppslag etter lasting av ukelisten; dette kunne utløse svært mange ekstra API-kall før listen ble ferdig.
- Ukelisten er fortsatt kilden til navn, EAN, prisendring og bilde; lokal kjent produktmetadata brukes kun som lett beriking.
- Ingen databaseendring.

# v0.5.78 – Produktbrowser: faktisk høydefiks

- Bygget direkte på v0.5.76; v0.5.77 er forkastet.
- Årsaken til høydeforskjellen var en eldre `.product-filter-card { top:14px }`-regel.
- Sticky-offset er satt til 0 slik at «Finn produkter» starter parallelt med produktkortene.
- Ingen JavaScript-, API-, database- eller renderlogikk er endret.

# v0.5.76 – Produktbrowser: lik startlinje

- Resultattittel/status/sortering flyttet til en kompakt toppkontrollrad over browseren.
- «Finn produkter»-kortet og produktgridet starter nå på samme høyde.
- Gjelder Produkter, Prisfall og Prishopp.
- Ingen API-, data- eller produktkortlogikk er endret.

# v0.5.75 – UI-konsistens: Produktbrowser

- Produkter / Prisfall / Prishopp bruker samme lokale tab-komponent som øvrige standardiserte sider.
- Felles høyde, spacing og struktur for filterkort og resultatheader.
- Produktkort, sidebarfunksjoner, sortering og Kassalapp-logikk er beholdt.
- Ingen API-, database- eller datalogikkendringer.

# v0.5.74 – UI-konsistens: Sparetips

- Aktive/Senere/Gjennomført bruker samme lokale tab-komponent som Handleliste og Matlager.
- Tabs er flyttet ut av innholdskortet og ligger mellom KPI-området og kortet.
- Informasjonsteksten er beholdt, men flyttet til bunnen av innholdet.
- Ingen endring i sparetipslogikk, beregninger eller data.

# v0.5.73 – UI-konsistens: Budsjett, Inntekter og Utgifter

- Bygger videre på godkjent v0.5.72-pilot.
- Budsjett, Inntekter og Utgifter bruker nå samme tabellside-kontrollrad og spacing.
- Søkeplassering og kontrollhøyde følger samme mønster som øvrige standardiserte tabellsider.
- Ingen funksjons-, data- eller økonomilogikk er endret.

# v0.5.72 – UI-konsistens pilot: Handleliste + Matlager

- v0.5.71 beholdes som rollback-baseline.
- Felles struktur på Handleliste og Matlager: header → KPI → lokale tabs → kontroller → innhold.
- Aktiv/Kjøpt og Beholdning/Lageranalyse bruker samme lokale tab-komponent og plassering.
- Tabs er flyttet ut av innholdskortene og ligger nå mellom KPI-området og kortet.
- Eksisterende funksjoner, filtre, tabeller og motorer er uendret.
- Ingen database-, ShoppingEngine-, PantryAnalysisEngine- eller PB1-endringer.

# v0.5.71 – Handleliste: konsistente Kjøpt-kontroller

- Aktiv/Kjøpt beholdes som lokale tabs.
- Under Kjøpt er Alle/Dag/Uke/Måned-knappene erstattet med en vanlig Periode-dropdown.
- Dato/uke/måned-felt vises kun når valgt periode krever det.
- Ny sortering: Nyeste kjøp, Eldste kjøp, Nyeste uke, Vare A–Å, Butikk A–Å, Høyeste pris, Laveste pris.
- Kontrollene bruker samme toolbar-mønster som øvrige tabellsider.
- Ingen database-, ShoppingEngine- eller PB1-endringer.

# v0.5.70 – Kjøpt: ukenummer

- Lagt til Uke-kolonne etter Dato i Kjøpt-tabellen.
- Ukenummer beregnes fra eksisterende purchaseDate/ISO-uke.
- Aktiv-tabellen er urørt.
- Ingen database-, ShoppingEngine- eller PB1-endringer.

# v0.5.69 – Handleliste: ren tabellopprydding

- Bygget direkte på v0.5.68.
- Fjernet kun «Brukes i» fra Aktiv handleliste.
- Butikk beholdes synlig fordi pris og butikk hører sammen.
- Ingen butikkgruppering, nye KPI-er eller øvrig Handleliste-redesign.
- Ingen database-, ShoppingEngine- eller PB1-endringer.

# v0.5.68 – Oppskrifter modal/regresjonsretting

- Bygget på siste fungerende v0.5.66, ikke den defekte v0.5.67.
- Fjernet Favoritt-checkbox fra oppskriftsmodalen og fjernet den eksplisitte render-referansen som blokkerte modalåpning.
- Økt avstand mellom søk og dropdowns til 12 px, slik at forskjellen faktisk er synlig.
- Ingen database- eller motorendringer.

## 0.5.66 – Oppskrifter: live-søk
- Retter søk slik at oppskriftskort filtreres umiddelbart for hvert tastetrykk.
- Bruker eksplisitt søkeindeks per kort og robust synlig/skjult-state.

## 0.5.65 – Oppskrifter: favoritt og søk

- Klikkbar favorittstjerne på alle oppskriftskort.
- Favoritter flyttet til filter i verktøylinjen.
- Oppskriftsøk korrigert og bevart sammen med øvrige filtre.

## 0.5.64 – Oppskriftsoversikt FASE 3

- Kompakte oppskriftskort med fast størrelse og bilde fra importerte oppskrifter.
- Ny kategori- og sorteringslinje med Sist brukt, Mest brukt, Billigst, Kortest tid, Mest på lager og A–Å.
- Pris per porsjon, lagerdekning og butikk vises kompakt på kortet.
- Synlige handlinger er nå Legg i matplan og Åpne; Rediger/Slett er fjernet fra oversikten.
- Ingen databaseformatendring.

## 0.5.63 – Rediger plan

- Matplan har fått egen redigeringsmodus med flervalg og «Slett valgte».
- Dager kan tømmes via diskret ⋯-meny i redigeringsmodus.
- Hele valgt uke eller måned kan tømmes med bekreftelse.
- Månedsoversikten bruker nå nøyaktig samme måltidsfarger som ukevisningen.
- Ingen endring i databaseformat, ShoppingEngine, PricingEngine eller PB1.

## 0.5.62 – Månedshandlinger i Matplan

- Bygger direkte på godkjent v0.5.61; forkastet navigasjonsendring fra tidligere v0.5.62 er ikke med.
- Ukevisning beholder «Kopier forrige uke» og «Generer handleliste».
- Månedsvisning får «Kopier forrige måned» og «Generer handleliste» på samme plassering.
- «Kopier forrige måned» kopierer måltider fra samme dagnummer i forrige kalendermåned og hopper over datoer som ikke finnes i målmåneden.
- Eksisterende måltider med samme dato, type og navn dupliseres ikke.
- «Generer handleliste» bruker valgt måned når månedsvisningen er aktiv.
- Ingen database-, PB1- eller Android-formatendringer.

# Changelog

## 0.5.61 – Kompakt månedsoversikt i Matplan

- Matplan har nå visningsvelgeren `Uke | Måned`.
- Månedsvisningen viser hele måneden i et kompakt 7-kolonne kalendergrid.
- Måltider vises som små fargekodede linjer med samme måltidstypefarger som ukevisningen.
- Opptil fire måltider vises per dag; flere samles bak `+N flere`.
- Klikk på dato eller `+N flere` åpner den aktuelle ukevisningen.
- Klikk på et måltid åpner eksisterende måltidseditor, og `+` på dagen legger til nytt måltid.
- Månedsstatus viser antall måltider, estimert kostnad og antall planlagte dager.
- Ingen endring i databaseformat, ShoppingEngine, PricingEngine eller PB1.

## 0.5.60 – Fargekodede måltidskort i Matplan

- Frokost, lunsj, middag, kveldsmat og mellommåltid har nå hver sin diskrete fargeidentitet.
- Kortene bruker svakt tonet bakgrunn, tydelig venstrekant og farget måltidstype for rask visuell skanning.
- Fargene har egne Light/Dark-varianter og følger eksisterende temasystem.
- Ukjent/annen måltidstype faller tilbake til nøytral kortstil.
- Ingen endring i databaseformat, måltidsdata, ShoppingEngine eller PB1.

## 0.5.59 – Horisontale måltidskort i Matplan

- Flere måltider på samme dag legges nå ved siden av hverandre så lenge det er horisontal plass.
- Dagen bruker en responsiv kort-grid som automatisk bryter til neste linje først når bredden krever det.
- `Velg måltid` inngår i samme grid, slik at siden bruker mindre vertikal plass.
- Måltidskortene beholder type, navn, personer, pris og lagerstatus.
- Ingen endring i databaseformat, måltidsdata, ShoppingEngine eller PB1.

## 0.5.58 – Flere måltider per dag i Matplan

- Matplan viser nå hvert registrerte måltid som eget kort under riktig dag.
- Måltidstype vises på kortene (Frokost, Lunsj, Middag, Kveldsmat, Mellommåltid).
- `Velg middag` er erstattet med `Velg måltid`, og handlingen er tilgjengelig også når dagen allerede har måltider.
- Ukeoppsummeringen teller og priser alle måltider, ikke bare middag.
- Eksisterende datamodell, ShoppingEngine, PB1 og databaseformat er uendret.

## 0.5.57 – Matplan ukevisning
- Matplan er bygget om fra KPI-er og tabell til et kompakt ukentlig kontrollsenter.
- Ukenavigasjon med forrige uke, denne uken og neste uke.
- Kompakt statuslinje for middager, estimert kostnad, manglende varer og dager uten middag.
- Syv kompakte dagsrader med direkte valg/redigering av middag.
- Lagerstatus per middag bygger på eksisterende ShoppingEngine og Matlager-data.
- Generer handleliste bruker nå den viste uken.
- Kopier forrige uke kopierer eksplisitt inn i den viste uken.
- Ingen database-, PB1- eller Android-formatendringer.

## 0.5.56 – Read-only store in shopping list
- Handlelisten viser hvilken butikk som er valgt for hver vare.
- Muligheten til å endre butikk direkte fra handlelisten er fjernet.
- Ekstra EAN-/butikkprisoppslag fra handlelisten er fjernet.
- Pris og butikk kommer fortsatt fra valgt produkt i oppskriften.
- PB1-eksport og Android-appen mottar fortsatt butikkfeltet.
- Ingen andre funksjonsendringer.

# Changelog

## 0.5.55 – Robust shopping store alternatives
- Retter butikkvelgeren fra v0.5.54.
- `Velg butikk` bruker nå både Kassalapp `prices-bulk` og `GET products/ean/{ean}`.
- Resultatene slås sammen og dedupliseres per butikk.
- EAN normaliseres til bare siffer før sammenligning og API-kall.
- Valgt butikk beholdes som fallback dersom API-data midlertidig er ufullstendige.
- Hvis Kassalapp faktisk bare har én aktuell butikkpris, vises en tydelig forklaring i stedet for at dialogen ser ødelagt ut.
- API-belastning holdes lav: ekstra EAN-kall skjer kun når brukeren åpner `Velg butikk`, og resultatet caches i 5 minutter.
- Pris og butikk oppdateres fortsatt atomisk sammen.

# Changelog

## 0.5.54 – Shopping list store switching
- Aktiv handleliste viser nå valgt butikk.
- Varer med EAN har en kompakt `Endre`-handling ved butikken.
- Butikkvelgeren henter tilgjengelige butikkpriser for samme EAN via eksisterende Kassalapp `prices-bulk`.
- Ved butikkbytte lagres butikk og pakningspris sammen.
- Handlelistens totalpris beregnes på nytt som valgt pakningspris × nødvendig antall pakker.
- KPI for estimert totalsum og PB1-eksport bruker dermed den nye prisen automatisk.
- Kjøpshistorikken beholder eksisterende butikkvisning.
- Ingen endring i Android-appen eller PB1-formatet.

# Changelog

## 0.5.53 – Store-specific recipe ingredient products
- Produktvalg i oppskrifter kobler konkret butikk og pris sammen.
- «Velg / endre produkt» viser produkt · pris · butikk.
- Manuelt og vanlig produktsøk i oppskriftseditoren viser butikkspesifikke alternativer.
- Automatisk matching gjør samlet butikk/pris-beriking etter produktmatchingen for å begrense API-kall.
- Sikker match lagrer billigste tilgjengelige butikk for valgt produkt.
- Butikk følger videre via eksisterende kjede til handleliste, PB1 og mobilapp.

# Changelog

## 0.5.52 – Compact Data & Integrations
- Bygger direkte på v0.5.51.
- Data & integrasjoner bruker nå tre kort per rad på normal desktopbredde.
- Kort, mellomrom, typografi, felt, knapper og badges er gjort mer kompakte.
- Handleliste-appens installasjons-QR er redusert betydelig i størrelse.
- Responsiv layout går automatisk fra 3 → 2 → 1 kolonne.
- Ingen funksjonell endring i Kassalapp, backup, PB1 eller Android-integrasjonen.

# Changelog

## 0.5.51 – Direct Android APK Download
- Bygger på v0.5.50.
- Installasjons-QR i Innstillinger peker nå direkte til APK-filen på GitHub.
- Standardformat: `/releases/latest/download/handleliste.apk`.
- Skanning av installasjons-QR går dermed direkte til APK-nedlasting i stedet for GitHub Release-siden.
- Innstillingsfeltet heter nå `Direkte APK-adresse`.
- Knappen heter `Last ned APK`.
- Release-asset må ha stabilt filnavn `handleliste.apk` for at latest-lenken skal fungere på tvers av versjoner.
- Handlelisteeksport/PB1 er uendret.

# Changelog

## 0.5.50 – Android Handleliste Integration
- Bygget direkte på v0.5.42-baseline.
- Aktiv handleliste har ny `Send til mobil`-knapp.
- Handlelisten kodes som PB1 v1 med ekte gzip + base64url, samme format som Android Handleliste v0.4.0.
- QR-koden inneholder varenavn, mengde, enhet, kategori, butikk, pris når tilgjengelig og EAN når tilgjengelig.
- Ingen lokal webserver eller nettverk mellom PC og mobil kreves.
- Innstillinger → Data & integrasjoner har nytt kort `Handleliste-app`.
- Mobilapp-kortet viser installasjons-QR, Android-versjon og knapp for GitHub Release.
- GitHub Release-adressen lagres som innstilling; én standardkonstant kan hardkodes senere.
- Electron åpner kun http/https-adresser via systemnettleseren.
- Eksisterende v0.5.42-logikk for handleliste, matplan, API og strekkodeskanning er ellers urørt.

# Changelog

## 0.5.42 – Compact Manual Ingredient Product Search
- Hver ingrediensrad har nå en liten `Søk produkt`-knapp i tillegg til automatiske forslag.
- Knappen åpner et kompakt søkepanel kun for den aktuelle ingrediensen; resten av listen beholder samme høyde.
- Søkefeltet er forhåndsutfylt med kjerneingrediensen, men kan redigeres helt fritt.
- Enter eller `Søk` gjør et bredt Kassalapp-søk og beholder opptil 24 treff.
- Resultatlisten viser maks omtrent seks treff i høyden og får intern scrolling ved flere.
- Resultater viser produktnavn, merke/butikk/pakning og pris eller `Pris ikke tilgjengelig`.
- Valg av produkt lukker søkepanelet og bruker eksisterende kostnadsoppdatering umiddelbart.
- Automatisk matching, dropdown, prissemantikk og søkenormalisering fra v0.5.41 er ellers urørt.

# Changelog

## 0.5.41 – Correct Ingredient Search & Missing Price Semantics
- Bygget fra v0.5.38, ikke v0.5.40.
- Rettet rotårsaken til `løk` → `øk`: enhetsrens bruker nå whitespace-tokenisering i stedet for JavaScript `\b`, som ikke er Unicode-sikker for norske bokstaver.
- Verifiserte søk: `løk` → `løk`, `1 løk` → `løk`, `1 l melk` → `melk`, `2 ss revet cheddar` → `revet cheddar`, `400 g kjøttdeig` → `kjøttdeig`.
- `Velg / endre produkt` gjør ett bredt produktsøk på kjerneingrediensen og kan vise opptil 24 kandidater.
- Produkter uten pris filtreres ikke bort fra manuelt produktvalg.
- Produkter uten pris vises som `Pris ikke tilgjengelig`; teksten `Pris hentes ved valg` brukes ikke.
- Et produkt uten pris kan velges og lagres som match.
- Pakningspris og ingredienskostnad viser ikke falsk `0,00 kr` når pris mangler.
- Oppskriftssammendrag markerer når totalen mangler prisdata.
- Dropdown-indeksering og manuell overstyring fra v0.5.38 beholdes.

# Changelog

## 0.5.38 – Recipe Ingredient Selection Flow Fix
- Rettet dropdown-indeksering: valg bruker nå radens faktiske ingrediensindeks, ikke rekkefølgen blant dropdownene.
- `Må velges` har alltid en valgvei. Mangler kandidatlisten vises `Velg / endre produkt`, som henter forslag for akkurat den ingrediensen.
- `Sikker match` beholder opptil 8 alternativer og kan alltid overstyres.
- Produktvalg sletter ikke lenger kandidatlisten.
- Manuelt valgt produkt markeres og blir ikke unødvendig overskrevet ved ny matching.
- Auto-match lagrer hvilken kandidat som er aktiv.
- `Match importerte ingredienser` behandler også rader som har produkt/pris, men fortsatt er `Må velges` eller mangler alternativer.
- Pakningspris, ingredienskostnad, totalpris og pris per porsjon oppdateres fra riktig rad umiddelbart etter produktvalg.
- Matching/rangering fra v0.5.37 er ellers beholdt.

# Changelog

## 0.5.37 – Safer Ingredient Auto-Matching
- `Sikker match` er gjort betydelig mer konservativ.
- Produkter med ord som `chips`, `potetgull`, `snack`, `smak`, `dip`, `dressing`, `saus`, `pizza` osv. får sterk konfliktstraff når disse ordene ikke finnes i ingrediensen.
- `paprika` skal dermed ikke kunne låses til et produkt som `chips med grillet paprikasmak`.
- Ingredienser med bare ett kjerneord krever nå minst 0,90 score for sikker match.
- Sikker match krever også tydelig avstand til nest beste kandidat.
- Kandidater med konflikt kan aldri bli automatisk sikker match.
- Sikker match beholder opptil 8 alternative produkter og viser `Bytt produkt …`, slik at brukeren alltid kan overstyre.
- Kostnadsoppdateringen fra v0.5.36 beholdes.
- Layouten er ellers urørt.

# Changelog

## 0.5.36 – Immediate Recipe Cost Update
- Når et produkt velges i dropdownen for en importert ingrediens, oppdateres ingredienskostnaden umiddelbart.
- Oppskriftens totalpris og pris per porsjon oppdateres samtidig.
- UI-oppdateringen skjer før valgt produkt lagres som fremtidig matchpreferanse.
- Feil eller treghet i preferanselagringen kan derfor ikke lenger forsinke kostnadsberegningen.
- Matchinglogikk, forslag og layout fra v0.5.35 er ellers urørt.

# Changelog

## 0.5.35 – Specific + Broad Ingredient Matching
- Importmatching søker først med den faktiske ingrediensfrasen, for eksempel `revet cheddar`.
- Beskrivende ord som `revet`, `hakket`, `skivet` og `fersk` beholdes i det spesifikke søket.
- Et bredere søk, for eksempel `cheddar`, kjøres alltid i tillegg når det er forskjellig fra det spesifikke søket.
- Resultatene fra begge søk slås sammen og dedupliseres før rangering.
- Spesifikt søk henter opptil 16 produkter og bredt søk opptil 24.
- Rangeringen belønner både kjerneingrediensen og relevante beskrivelser som `revet`.
- Produkter som mangler selve kjerneordet får sterkere straff.
- Forslagslisten er økt fra 5 til 8 alternativer.
- Parallellitet, cache-forbedringen og øvrig importflyt fra v0.5.34 beholdes.
- Layouten er urørt.

# Changelog

## 0.5.34 – Improved Imported Ingredient Matching
- `Match importerte ingredienser` rydder nå bort mengder, kjøkkenmål og flere irrelevante ord før produktsøk.
- Ved svak første match prøves opptil to kontrollerte søkevarianter.
- Første søk er redusert fra 24 til 12 produkter.
- Rangeringen vektlegger kjerneord, token-dekning og eksakt frase sterkere.
- Produkter som mangler ingrediensens viktigste kjerneord straffes i rangeringen.
- Treff fra fallback-søk dedupliseres før forslagene rangeres.
- Parallelliteten er redusert fra 4 til 2 for å redusere API-kø.
- Søkecache skiller nå mellom ulike resultatsstørrelser.
- Oppskriftsimportens layout og øvrige funksjonalitet er urørt.

# Changelog

## 0.5.33 – Compact Product Details Typography
- Produktdetaljer er ytterligere komprimert uten å fjerne eller flytte innhold.
- Produktbildet er redusert fra 128 px til 112 px.
- Metadata og detaljrader bruker mindre tekst og strammere linjehøyde.
- Seksjonsoverskrifter er mindre og tettere.
- Detaljrader har mindre vertikal padding og mindre gap.
- Header/body/footer er litt strammere.
- Produktnavn og hovedpris beholdes tydelige.
- Intern scrolling fra v0.5.32 beholdes.

# Changelog

## 0.5.32 – Compact Product Details Modal
- Produktdetaljer-modalens innhold og struktur er uendret.
- Modalens topp/bunn-padding og body-padding er redusert.
- Produktbildet er redusert fra 170 px til 128 px.
- Avstand mellom seksjoner og detaljrader er redusert.
- Produktmodalen begrenses til tilgjengelig skjermhøyde og får intern vertikal scrolling ved lange produkter.
- Endringen er scoped kun til Produktdetaljer og påvirker ikke andre modaler.

# Changelog

## 0.5.31 – Price Change List Image Fallback
- Prisfall og Prishopp bruker nå nøyaktig samme fungerende bilde-fallback som Ingredienser → Produkter.
- Listekortene bruker samme `product-image-with-fallback`-klasse.
- `wireProductImageFallbacks()` kobles på Prisfall/Prishopp-gridet etter rendering.
- Manglende eller ødelagte bilder erstattes dermed med samme kamera + diagonal strek-placeholder også i listevisningen.
- Produktdetaljer, datakilde, sidebar, sortering, faner og scanner er urørt.

# Changelog

## 0.5.30 – Broken Image Fallback Fix
- Rettet faktisk visning av manglende bilder i Ingredienser.
- Fjernet inline `onerror`, som ikke var pålitelig i Electron/CSP og derfor viste nettleserens ødelagt-bildeikon + alt-tekst.
- Produktbilder får nå vanlig JavaScript `error`-listener etter rendering.
- Bilder som allerede har feilet før listeneren kobles på håndteres via `complete && naturalWidth === 0`.
- Manglende bilde erstattes med eksisterende kamera + diagonal strek-placeholder.
- Produktdetaljer bruker samme prinsipp.
- Prisfall/Prishopp-datakilde, faner, sidebar, sortering og scanner er urørt.

# Changelog

## 0.5.29 – Isolated Ingredient Image Placeholder Fix
- Bygget direkte på v0.5.27 for å fjerne regressjonen fra v0.5.28.
- Endringen er isolert til `Ingredienser → Produkter`.
- Tom bilde-URL eller kjente placeholder/no-image-URL-er vises med den eksisterende kamera + strek-placeholderen.
- Eksisterende `onerror`-fallback beholdes for bilder som feiler å laste.
- Prisfall, Prishopp, ukelistehenting, fanerendering, produktdetaljer og scanner er urørt fra v0.5.27.

# Changelog

## 0.5.27 – Unified Product Image Placeholder
- Produkter uten bilde viser nå én felles placeholder med kameraikon og diagonal strek.
- Samme placeholder brukes i Produkter, Prisfall, Prishopp og Produktdetaljer.
- Dersom et bilde-URL finnes men ikke kan lastes, erstattes bildet automatisk med samme placeholder.
- Bildestørrelse og kortlayout beholdes.
- Ingen API-, søke-, pris- eller scannerlogikk er endret.

# Changelog

## 0.5.26 – Price Change Tab Render Fix
- Rettet fanebytte mellom Prisfall og Prishopp.
- Når ukelistedata allerede er lastet, rendres den nye fanen umiddelbart.
- Ved første besøk lastes data som før.
- Sortering trenger ikke lenger endres for å få produktene til å vises.
- Layout, datakilde, produktkort og scanner er urørt.

# Changelog

## 0.5.25 – Internal Price Change Product Details
- Klikk på bilde, produktnavn eller `Detaljer` i Prisfall/Prishopp åpner nå samme interne `Produktdetaljer`-modal som vanlige Ingredienser-produkter.
- Kassalapp-nettsiden åpnes ikke lenger.
- Produktdetaljer hentes via EAN fra Kassalapp API og caches i 24 timer.
- Nåpris fra Prisfall/Prishopp beholdes i detaljvisningen.
- Layout, sidebar, sortering og ukelistedata er urørt.

# Changelog

## 0.5.24 – Price Change Product Images
- Prisfall og Prishopp beriker nå ukelistene med produktmetadata via Kassalapp EAN-oppslag.
- Produktbilde hentes fra Kassalapp API og brukes i samme kortstruktur som Produkter.
- Merke, kategori og pakningsinformasjon fylles samtidig inn når tilgjengelig.
- EAN-metadata caches i 24 timer.
- Layout, sidebar, sortering og ukeliste-parser er urørt.

# Changelog

## 0.5.23 – Price Change Card Alignment
- Prisfall og Prishopp bruker nå samme produktkortstruktur som vanlige Ingredienser-produkter.
- Samme bildeplassering, produktnavn, kortspacing, prisrad og knappestruktur.
- Prisområdet viser nåværende pris som hovedpris og førpris ved siden av.
- Prisendring i kroner og prosent vises som eneste ekstra informasjon.
- Sidebar, sortering og datakilde er urørt.

# Changelog

## 0.5.22 – Kassalapp Weekly Parser Fix
- Rettet parseren som gjorde Prisfall og Prishopp tomme.
- Produktkort leses fra én `/vare/...`-lenke frem til neste.
- Parseren starter nå etter hele åpningstaggen, ikke inne i `href`-attributtet.
- Støtter relative og absolutte Kassalapp-produktlenker.
- Leser EAN, produktnavn, førpris, nåpris, prisendring og prosent.
- Lagt til fixture-test basert på faktisk Kassalapp-kortstruktur.
- Layouten fra v0.5.21 er helt urørt.

# Changelog

## 0.5.21 – Price Change Sidebar Alignment
- Prisfall og Prishopp bruker igjen samme `product-browser-layout` som Produkter.
- Sidebar `Finn produkter` beholdes med samme plassering og struktur.
- Sidebaren inneholder kun én kontroll: `Sortering`.
- Prisfall: Størst prisnedgang, Minst prisnedgang, Laveste pris, Høyeste pris.
- Prishopp: Størst prishopp, Minst prishopp, Laveste pris, Høyeste pris.
- Ingen kategori-, pris-, søke- eller andre filtre er lagt til.
- Ingen ekstra sorteringskontroll vises over resultatene.
- Datakilde, scanner og vanlig produktsøk er urørt.

# Changelog

## 0.5.20 – Price Change Sort Only
- Prisfall og Prishopp har ikke lenger kategori-, pris-, søke- eller andre filtre.
- Eneste kontroll er `Sorter`, plassert på samme sted som på Produkter.
- Prisfall: Størst prisnedgang, Minst prisnedgang, Laveste pris, Høyeste pris.
- Prishopp: Størst prishopp, Minst prishopp, Laveste pris, Høyeste pris.
- Datakilden fra v0.5.18/v0.5.19 er urørt.
- Scanner og vanlig produktsøk er urørt.

# Changelog

## 0.5.19 – Price Change Layout Alignment
- Prisfall og Prishopp bruker nå samme layout som `Finn produkter`.
- Samme venstre filterkort, samme høyre resultatområde og samme plassering av `Sorter` øverst til høyre.
- Kategorier bruker samme checkbox-mønster med ett aktivt valg eller `Alle kategorier`.
- Prisfall/Prishopp beholder bare relevante filtre og fire sorteringsvalg.
- Datakilden fra v0.5.18 er urørt.
- Scanner og vanlig produktsøk er urørt.

# Changelog

## 0.5.18 – Kassalapp Weekly List Source
- Prisfall og Prishopp bruker nå Kassalapps offentlige ukelister som datakilde.
- `/varer/nedsatt` og `/varer/prishopp` hentes sidevis i stedet for å rekonstrueres fra et begrenset produktutvalg.
- 7/30/90-dagersfilter er fjernet; disse fanene gjelder denne uken, som på Kassalapp.
- Sortering er redusert til fire valg: størst prisendring, minst prisendring, laveste pris og høyeste pris.
- Kategorilisten bruker Kassalapps hovedkategorier, ikke dype underkategorier som Egg/Smør/Majones.
- Scanner og vanlig produktsøk er urørt.

# Changelog

## 0.5.17 – Adaptive Price Change Discovery
- Fjernet den faste grensen på 300 produkter som gjorde at Prisfall/Prishopp ofte bare viste noen få treff.
- Prisendringsmotoren henter nå Kassalapp-produkter sidevis i blokker på 100.
- Etter hver blokk analyseres prishistorikken umiddelbart via `prices-bulk`.
- Hentingen stopper når både Prisfall og Prishopp har minst 48 kandidater, eller når maks 20 API-sider / 2000 produkter er kontrollert.
- Maksgrensen holder en full førstegangsanalyse innenfor et kontrollert API-budsjett.
- Status viser hvor mange produkter som faktisk er kontrollert.
- Eksisterende lokale EAN-er analyseres først.
- Scanner og øvrig produktsøk er urørt.

# Changelog

## 0.5.16 – Prisfall og Prishopp
- Ingredienser har nå tre interne visninger: `Produkter`, `Prisfall` og `Prishopp`.
- Ny `PriceChangeEngine` beregner prisendring per EAN + butikk fra Kassalapps `prices-bulk`.
- Støtter 7, 30 og 90 dagers historikk.
- Viser gammel pris, nåværende pris, endring i kroner og prosent.
- Filtre: søk, butikk, kategori, minimumsendring i kr/prosent, makspris og sortering.
- Prisendringskort kan legges direkte til handlelisten og åpne produktdetaljer.
- Prisendringer bruker lokale kjente EAN-er pluss et kontrollert ferskt utvalg fra Kassalapp (opptil 300 produkter), i 100-EAN chunks.
- Ingen scraping av Kassalapp-nettsidene.
- Scanner er urørt.

# Changelog

## 0.5.15 – Kassalapp Laravel Validation Fix
- Korrigert etter faktisk 422-respons fra Kassalapp.
- Arrayfiltre sendes igjen som Laravel-query arrays: `excl_allergens[]`, `incl_allergens[]`, `has_labels[]`.
- `unique` og `exclude_without_ean` sendes som `1` / `0`, som backend-validatoren aksepterer.
- Validering av `category_id`, prisgrenser og `size` fra v0.5.14 beholdes.
- Ingen endring i produktsøkarkitektur, priser, paginering eller scanner.

# Changelog

## 0.5.14 – Kassalapp Query Serialization Fix
- Arrayfiltre (`has_labels`, `excl_allergens`, `incl_allergens`) serialiseres nå som gjentatte query-parametere i tråd med OpenAPI, ikke med `[]`-suffiks.
- `unique` og `exclude_without_ean` sendes som `true` / `false`.
- `category_id`, `price_min`, `price_max` og `size` valideres før de sendes, slik at `NaN`, negative priser og ugyldige verdier ikke kan gi 422.
- `size` begrenses eksplisitt til Kassalapps dokumenterte 1–100.
- Ingen endring i scanner, produktkort eller databaseflyt.

# Changelog

## 0.5.13 – Kassalapp Contract Correction
- Korrigert integrasjonen mot gjeldende OpenAPI: `store`, `has_labels`, `excl_allergens` og `incl_allergens` er støttede `/products`-parametere og er gjeninnført i query-builderen.
- Ett valgt butikkfilter sendes direkte til `/products`; `prices-bulk` brukes bare når flere butikker skal sammenlignes.
- Allergenfilter sendes igjen til Kassalapp i stedet for å være et rent lokalt filter.
- Prisfilter kan kjøres server-side når ingen eller én butikk er valgt; flere butikker filtreres etter `prices-bulk`.
- `prices-bulk` bruker dokumenterte `current_unit_price` og `current_unit_price_unit`.
- EAN-normalisering støtter både objekt- og arrayvariant av `current_price`, slik Kassalapps dokumentasjon/spesifikasjon har vist i ulike formater.
- Næringsinnhold rendres nå korrekt fra `nutrition[]` med `display_name`, `amount` og `unit`.
- Kamera-/strekkodelogikk er urørt.

# Changelog

## 0.5.12 – Kassalapp Taxonomy and Result Buffer
- Kategorifilteret fylles nå fra Kassalapps kategori-API. Den hardkodede listen brukes bare som fallback dersom taxonomien ikke kan hentes.
- Kategori-ID fra API-et brukes videre i produktsøket.
- Lokal butikk-, allergen- og prisfiltrering bruker nå et resultatbuffer som henter flere API-sider ved behov til valgt UI-sidestørrelse er fylt eller API-resultatet er tomt.
- UI-sider bygges fra ett sammenhengende filtrert resultatsett, så produkter du allerede har sett ikke gjentas når neste API-side må hentes.
- Totalantall vises først når filtreringen har nådd slutten av API-resultatet; vi viser ikke lenger et misvisende rått API-totalantall som filtrert total.
- Resultatbuffer nullstilles ved nytt søk eller ny sortering.
- Kamera-/strekkodelogikk er urørt.

# Changelog

## 0.5.11 – Kassalapp Search Core Fix
- Produktsøk bruker nå ett `/products`-kall per side i stedet for butikk × kategori-kombinasjoner.
- Fjernet 12-kombinasjonsgrensen.
- `/products` sender bare dokumenterte parametere; `store`, `has_labels[]`, `incl_allergens[]` og `excl_allergens[]` sendes ikke lenger.
- Vanlig produktsøk bruker `unique=true` og `exclude_without_ean=true`.
- Kategorifilter er nå ett valg om gangen og bruker `category_id` når API-taxonomien har ID, ellers kategorinavn som fallback.
- `Inneholder allergener` er fjernet. `Ekskluder allergener` filtreres lokalt med Kassalapps faktiske allergenkoder og krever eksplisitt `NO`.
- Butikkfilter flyttes til prislaget via `prices-bulk`; laveste pris blant valgte butikker brukes.
- Prisfilter og prissortering bruker valgt butikkpris når butikkfilter er aktivt.
- Kamera-/strekkodelogikk er urørt.

# Changelog

## 0.5.10 – Scanner Single Row Fix
- `Butikk og pris`, `Mengde` og `Enhet` er eksplisitt låst til kolonne 1, 2 og 3 på samme rad.
- Mengde er redusert til 76 px og Enhet til 92 px.
- Kamera/QR/decode er urørt.

# Changelog

## 0.5.09 – Scanner Field Alignment
- `Butikk og pris`, `Mengde` og `Enhet` er smalere og ligger på samme trekolonne-rad.
- Feltene har lik høyde og vertikal justering.
- Mengde bruker kun hele tall.
- Kamera/QR/decode er urørt.

# Changelog

## 0.5.08 – Scanner Product Hierarchy
- Produktnavnet ligger nå over både produktbildet og produktbeskrivelsen.
- Under navnet står bilde til venstre og Merke/Pakning/Butikk/Pris til høyre.
- `Butikk og pris`, `Mengde` og `Enhet` ligger på samme rad.
- Kamera-, QR-, pairing-, decode- og lookup-flyten er urørt.

# Changelog

## 0.5.07 – Scanner Layout Option 3
- Kamera/QR-kolonnen er urørt fra v0.5.06.
- Produktkortet viser bilde til venstre og produktnavn + Merke/Pakning/Butikk/Pris vertikalt til høyre.
- `Butikk og pris` er flyttet til egen fullbredderad under produktkortet.
- `Mengde` og `Enhet` ligger fortsatt side om side under dette.
- Ingen skanne-, kamera-, decode-, lookup- eller lagringslogikk er endret.

# Changelog

## 0.5.06 – Scanner Geometry Rollback
- Basert direkte på v0.5.04, der skanningen fungerte.
- Kamera-, QR-, pairing- og decode-oppsettet er urørt.
- Kun produktresultatet er komprimert: bilde + Merke/Pakning/Butikk/Pris og `Butikk og pris` på samme rad.
- Ingen endring i Barcode Engine eller kameraoppstart.

# Changelog

## 0.5.04 – Scanner Modal Layout Refinement
- QR-feltet er gjort mindre.
- Skannemodalen bruker mer plass på produktresultatet enn på QR/kameraområdet.
- `Mengde` og `Enhet` har nå eksplisitt grid, spacing og breddebegrensning slik at feltene holder seg inne i modalen.
- Produktresultatet er ryddet med større bilde, tydelig produktnavn, organisert Merke/Butikk/Pakning og separat pris.
- Ingen skanne-, produktoppslag- eller lagringslogikk er endret.

# Changelog

## 0.5.03 – Scanner Modal Text Cleanup
- Fjernet `Barcode Engine` fra modalhodet.
- QR-instruksjonen er redusert til `Skann QR-koden`.
- Fjernet forklaringen om kameragodkjenning og automatisk bildevisning.
- Fjernet teksten inne i skannerammen.
- Fjernet gjentatte forklaringer i resultatfeltet.
- Statusmeldinger er forkortet til korte systemtilstander.
- Ingen skanne-, kamera-, produkt- eller lagringslogikk er endret.

# Changelog

## 0.5.02 – Remove Recipe Details
- Fjernet hele detaljdelen fra Ny oppskrift.
- `Tags` og `Allergener` vises ikke lenger i oppskriftsmodalen.
- Ingen øvrig oppskriftslogikk er endret.

# Changelog

## 0.5.01 – Recipe Modal Detail Cleanup
- Fjernet seksjonsoverskriften `Detaljer`.
- Tags og allergener beholdes som kompakte felt nederst uten egen seksjonsboks.
- Fjernet den dupliserte feltetiketten `Fremgangsmåte` under seksjonsoverskriften.
- Ingen funksjonslogikk er endret.

# Changelog

## 0.5.00 – Compact Recipe Modal
- `Grunninformasjon` og `Fremgangsmåte` ligger nå ved siden av hverandre.
- Oppskriftsmodalen er gjort betydelig mer kompakt med mindre padding og spacing.
- `Ingredienser og kostnad` beholder full bredde.
- `Detaljer` ligger kompakt nederst.
- Ingen funksjonslogikk er endret.

# Changelog

## 0.4.99 – Recipe Modal Layout Cleanup
- `Ny oppskrift` er ryddet i fire tydelige seksjoner: Grunninformasjon, Ingredienser og kostnad, Fremgangsmåte og Detaljer.
- Eksisterende felt og funksjoner er beholdt.
- Ingrediens-/produktmatching, prisberegning, favoritt, tags, allergener og lagring er ikke endret.
- Endringen gjelder kun oppskriftsmodalen.

# Changelog

## 0.4.98 – Category Activation Model
- Kategoritabellen viser bare kategorier i aktiv bruk.
- Status-kolonnen er fjernet.
- `+ Standardkategori` viser forhåndsdefinerte kategorier som ikke er aktive.
- Standardkategorier kan legges til og fjernes fra aktiv bruk uten å slettes.
- Historiske poster beholder kategorien.
- Egendefinerte kategorier kan fortsatt opprettes og slettes.
- Mat, Lån og Lønn er vanlige standardkategorier og kan fjernes/legges til igjen.
- Standardkatalogen er utvidet med vanlige inntekts- og utgiftskategorier.
- Nye installasjoner starter med Mat, Lån, Lønn, Bolig, Transport og Andre utgifter aktive.

# Changelog

## 0.4.97 – Savings Goal Active Cleanup
- Fjernet `Aktiv` fra Nytt sparemål.
- Alle sparemål behandles nå som aktive.
- Gamle `active:false`-verdier på sparemål ignoreres, slik at eksisterende mål ikke skjules fra Sparemål eller Dashboard.
- Ingen annen sparemål-logikk er endret.

# Changelog

## 0.4.96 – Budget / Loan Simplification
- Fjernet `Aktiv` fra budsjettmodalen. Budsjettposter behandles alltid som aktive.
- Fjernet `Automatisk trekk` fra Lån og gjeld.
- Fjernet `Ta med terminbeløp i utgifter` fra Lån og gjeld.
- Finance Engine oppretter ikke lenger syntetiske låneutgifter. Lånebetalinger registreres manuelt under Utgifter.
- `Terminbeløp` i lånet brukes fortsatt til saldo-, rente- og nedbetalingsprognoser.
- Gamle `active`, `includePayment` og `automaticPayment`-verdier får ikke lenger skjult effekt på budsjett eller utgifter.
- Ekstra nedbetaling i Hva hvis? påvirker fortsatt lånesaldo og kontantstrøm som et tillegg utover manuelt registrerte utgifter.

# Changelog

## 0.4.95 – Income / Expense Field Simplification
- Fjernet `Skattepliktig` fra Inntekt.
- Fjernet `Aktiv` fra Inntekt og Utgift. Inntekts- og utgiftsposter behandles nå alltid som aktive i Finance Engine.
- Fjernet `Automatisk trekk` fra Utgift.
- Utgiftsstatus endres ikke lenger automatisk basert på dato. `Status for valgt måned` er autoriteten for om en utgift er Ubetalt/Betalt/Delvis.
- Eksisterende gamle `active`/`automatic`-felt i databasen ignoreres for inntekter og utgifter, slik at gamle data ikke gir skjult filtrering eller automatisk betaling.
- Quick Add lagrer ikke lenger de utgåtte feltene.
- Lån og andre områder med egne aktive-/automatikkfelt er ikke endret.

# Changelog

## 0.4.94 – Income / Expense Modal Alignment
- Inntekt og Utgift bruker nå samme modalbredde, to-kolonne-grid, spacing og felthøyde.
- De seks grunnfeltene følger samme rekkefølge: navn/beskrivelse, beløp, kategori, gjelder for, kalenderuke og status.
- Utgiftens egne felt (type, automatisk trekk og notat) og inntektens `Skattepliktig` beholdes som funksjonelle forskjeller.
- Eksisterende kategori-, periode-, uke-, status- og lagringslogikk er verifisert og urørt.
- Endringen gjelder bare Inntekt- og Utgift-modalene.

# Changelog

## 0.4.93 – Budget Modal Text Cleanup
- Basert direkte på v0.4.92.
- Fjernet hjelpeteksten `Administreres under Innstillinger → Kategorier.` fra CRUD-kategorifelt.
- Fjernet hjelpeteksten om ISO-kalenderuker fra ukevalget.
- Ingen layout, feltstruktur, kategori- eller ukelogikk er endret.

# Changelog

## 0.4.92 – Quick Add Category Menu Refinement
- Overflødig hjelpetekst under Kategori er fjernet.
- Kategorimenyen viser nå et større område med opptil flere synlige valg før scrolling.
- Antall treff vises øverst i kategorimenyen.
- Eksisterende typefiltrering og lagringsvalidering er beholdt uendret.

# Changelog

## 0.4.91 – Quick Add Modal Pass
- `+ Legg til` har fått søkbar kategori med begrenset høyde og scroll.
- Kategorier filtreres fortsatt korrekt etter valgt type.
- Manuell tekst som ikke matcher en gyldig kategori blokkeres ved lagring.
- Navn, beløp, kategori og dato har samme felthøyde i akkurat denne modalen.
- Ingen andre modaler eller globale feltstiler er endret.
- Eksisterende lagringsflyt er verifisert og beholdt.

# Changelog

## 0.4.90 – Maintenance Two-Column Layout
- `Rydd enkeltområder` og `Faresone` vises nå ved siden av hverandre.
- Rydd enkeltområder får størst bredde, mens faresonen ligger kompakt til høyre.
- Smale vinduer faller tilbake til én kolonne.
- Ingen vedlikeholdslogikk er endret.

# Changelog

## 0.4.89 – Maintenance Page Pass
- Vedlikehold er ryddet til en tydelig vertikal arbeidsflyt.
- Enkeltområder vises som kompakte rader med forklaring og lik `Tøm`-handling.
- Full nullstilling er flyttet til en tydelig separat faresone nederst.
- Eksisterende bekreftelses- og vedlikeholdslogikk er beholdt.

# Changelog

## 0.4.88 – Data & Integrations Layout
- Data & integrasjoner er ryddet til to hovedområder i 65/35-layout.
- `Data og sikkerhetskopi` samler automatisk backup, eksport/import og gjenoppretting i ett kort.
- `Kassalapp` samler konfigurasjon og API-status i ett kort.
- Tilkoblingsstatus vises tydelig øverst i Kassalapp-kortet.
- Eksisterende funksjonslogikk for backup, import/eksport og Kassalapp er beholdt.

# Changelog

## 0.4.87 – General Settings Layout
- Generelt-tabben bruker nå en 65/35-grid.
- Kategorier ligger til venstre og bruker 65 % av bredden.
- Visningsinnstillinger ligger til høyre og bruker 35 %.
- På smalere vinduer går layouten tilbake til én kolonne.

# Changelog

## 0.4.86 – Settings Consolidation
- Innstillinger er redusert fra fem til tre tabs: Generelt, Data & integrasjoner og Vedlikehold.
- Kategorier er flyttet inn under Generelt.
- Kassalapp, backup, eksport/import og gjenoppretting er samlet under Data & integrasjoner.
- Mat, Lån og Lønn er faste systemkategorier og migreres automatisk inn dersom de mangler.
- Systemkategorier kan ikke slettes; navn/type/status holdes låst, mens farge kan endres.
- Vedlikehold beholdes separat for destruktive handlinger.
- Spacing og kortstruktur er standardisert.

# Changelog

## 0.4.85 – What If Result Colors
- Scenarioresultater bruker nå samme positive/negative-farger som resten av appen.
- Månedlig resultat: pluss grønt, minus rødt, null nøytralt.
- Renter og gjeld vurderes omvendt mot baseline: lavere er grønt, høyere er rødt.
- Sparing: høyere er grønt, lavere er rødt.
- 12-månedstabellen fargekoder resultat, differanse mot baseline og gjeld konsekvent.
- Ingen prognose- eller Finance Engine-logikk er endret.

# Changelog

## 0.4.84 – What If 35/65 Layout
- Scenario-kortet er gjort smalere og Effekt av scenario bredere, omtrent 35/65.
- Scenariofeltene vises nå i én kolonne for bedre lesbarhet i den smalere arbeidsflaten.
- På smale vinduer beholdes én-kolonne-layout.
- Ingen scenario-, Finance Engine- eller prognoselogikk er endret.

# Changelog

## 0.4.83 – What If Page Pass
- `Hva hvis?` er tydelig skilt fra Prognoser: Prognoser viser baseline, Hva hvis? viser konsekvensen av et simulert scenario.
- Scenariofeltene ligger samlet i venstre arbeidsflate og resultatene i høyre.
- Resultatet viser nå baseline, scenario og differanse for månedlig resultat, renter, gjeld og sparing.
- 12-månedersoversikten viser scenario og differanse mot baseline per måned.
- Det er tydeliggjort at lagrede scenarioinnstillinger kun er simulering og ikke endrer budsjett/regnskap.
- Inline-layout på lagreknappen er fjernet.
- Finance Engine og prognoseberegningen er urørt.

# Changelog

## 0.4.82 – Savings Tips Page Pass
- Sparetips-fanene ligger nå inne i samme innholdskort som tipslisten.
- Tipskortene er gjort mer kompakte og handlingshierarkiet er tydeligere.
- Hovedhandlingen er primær, mens senere/skjul/gjennomført er sekundære handlinger.
- Standard tomtilstand brukes, og reset-knappen vises bare når det finnes statuser å hente tilbake.
- Spacing og responsivitet er standardisert mot resten av appen.
- `buildSavingsTips()` og Savings Engine er urørt.

# Changelog

## 0.4.81 – Forecast Spacing Fix
- `Aktive forutsetninger` har nå samme vertikale avstand til `Månedsprognose` som øvrige kort i appen.
- Ingen prognose- eller beregningslogikk er endret.

# Changelog

## 0.4.80 – Reports / Forecast Role Split
- Rapporter viser nå kun faktiske tall, nøkkeltall og plan-mot-faktisk for valgt periode.
- 12-måneders prognosen er fjernet fra Rapporter og eies kun av Prognoser.
- Rapporter har fått fire faktiske KPI-er og ryddigere kortstruktur.
- `Eksporter rapport` er beholdt; eksporten inneholder valgt periodes plan/faktisk-data, ikke 12-måneders prognose.
- Prognosemotor og Finance Engine er urørt.

# Changelog

## 0.4.79 – Financial Health Two-Column Layout
- Økonomihelse bruker nå to hovedkolonner under hero-kortet.
- Alle dimensjonskort ligger stablet vertikalt i venstre kolonne.
- `Det som trekker opp` og `Det som trekker ned` er samlet i ett `Tolkning`-kort i høyre kolonne.
- `Hvordan scoren beregnes` ligger under tolkningen i høyre kolonne.
- Mobil/smale vinduer faller tilbake til én kolonne.
- Finance Engine og scoreberegningen er urørt.

# Changelog

## 0.4.78 – Financial Health Page Pass
- Økonomihelse er gjort mer kompakt og konsekvent med resten av appen.
- Hero, nøkkeltall og dimensjonskort er strammet inn.
- Styrker/risiko bruker standard tomtilstand når data mangler.
- Fast vertikal spacing er lagt inn mellom alle hovedblokker.
- `Hvordan scoren beregnes` har nå korrekt avstand til kortet over.
- Finance Engine og 0–100-beregningen er urørt.

# Changelog

## 0.4.77 – Food Economy Spacing Fix
- Standardisert vertikal avstand mellom `Budsjettstatus`, to-kolonneblokken og `Dyreste oppskrifter per porsjon`.
- Ingen funksjons- eller beregningslogikk er endret.

# Changelog

## 0.4.76 – Food Economy Page Pass
- Matøkonomi er strammet inn til fire hoved-KPI-er.
- Budsjettstatus er løftet frem som sidens hovedanalyse.
- `Handlekurv per butikk` er tydeliggjort som `Handleliste per butikk`.
- `Hva tallene betyr` er erstattet av et kompakt `Kostnadsgrunnlag`.
- Oppskriftstabellen heter nå `Dyreste oppskrifter per porsjon` og viser fortsatt topp fem.
- Standard tomtilstander og mer kompakt responsiv layout er lagt inn.
- Eksisterende prognoseberegning er beholdt uendret foreløpig.

# Changelog

## 0.4.75 – Pantry Tabs Layout
- Matlager har nå interne faner `Beholdning | Lageranalyse` under KPI-raden.
- Lageranalyse ligger ikke lenger under en voksende beholdningsliste.
- Beholdning beholder søk og får sticky header / standard tomtilstand.
- Lageranalyse beholder eksisterende analyseperiode og beregningslogikk, men får egen arbeidsflate og sticky tabellheader.
- Ingen Pantry Engine-, analyse-, CRUD- eller datamodell-logikk er endret.

## 0.4.74 – Shopping scanner modes + list tabs

- Flyttet Aktiv/Kjøpt-fanene ned i selve listekortet under KPI-ene.
- Handlelistens barcode-scanner har to eksplisitte moduser: Legg til på listen og Registrer kjøpte varer.
- Registrer kjøpte varer matcher Aktiv handleliste, flytter varen til Kjøpt, oppdaterer Matlager og bruker eksisterende bokføringsflyt.
- Varer som ikke finnes på Aktiv handleliste kan bekreftes direkte inn i Matlager.
- Mottaksmodus fortsetter scanning etter hver registrering.

## 0.4.73 – Pantry to shopping gate

- Felles Matlager-gate for nye handlelistevarer.
- EAN → produkt-ID → normalisert navn brukes som matchrekkefølge.
- Full lagerdekning krever eksplisitt bekreftelse før varen legges til.
- Delvis lagerdekning reduserer handlemengden til faktisk restbehov.
- Ingredienser, manuell vare og barcode-tillegg bruker samme gate.
- Matplan beholder eksisterende automatiske lagerfratrekk.
- Oppdater fra matplan sletter ikke lenger kjøpt historikk.

## 0.4.72 – Shopping workflow history

- Handleliste har nå interne faner Aktiv og Kjøpt.
- Aktiv viser kun varer som fortsatt skal kjøpes.
- Varer flyttes umiddelbart til Kjøpt når de markeres kjøpt.
- Kjøpt beholder permanent historikk med filtrering på Alle, Dag, Uke og Måned.
- Kjøpte varer kan flyttes tilbake til Aktiv.
- Barcode-innlegging til Matlager bruker nå samme CRUD/bokføringsautoritet når en matchende handlelistevare fullføres.
- Hjemme-status er fjernet fra den aktive handlelistevisningen.

## 0.4.71 – Shopping List Page Pass
- Standardiserte Handleliste etter felles side- og tabelloppsett.
- Ingen søkefelt; listen er arbeidsorientert sortert med gjenstående varer først, hjemmevarer deretter og kjøpte varer nederst.
- Direkte avhuking for Hjemme og Kjøpt bruker samme CRUD-/Shopping Engine-bokføring som modalredigering.
- Kjøpte og hjemmevarer tones ned visuelt; kjøpte varer får gjennomstreking.
- Pris og dato er komprimert/justert, sticky header aktivert og tomtilstand standardisert.
- Headerhandlinger er prioritert som Oppdater fra matplan, Skann vare og primær + Manuell vare.
- Ingen endring i Shopping Engine eller bokføringsregler.

## 0.4.69 – Recipes Overview Pass
- Standardized recipes toolbar and compact card layout.
- Favorite filter is now functional and combines with recipe search.
- Removed dead generic Filter action from recipes overview.
- Added standard empty state.

## v0.4.68 – Meal Plan Page Pass
- Standardized Matplan with the shared KPI/table layout.
- Added table search, sorting and sticky header.
- Clarified the persons KPI and compacted leftovers/freezer presentation.
- No Meal Planning Engine, CRUD or copy-week logic changes.

# Endringslogg

## v0.4.67 – Savings Goals Page Pass
- Standardisert Sparemål mot samme kompakte kortoppsett som Lån og gjeld og øvrige økonomisider.
- Gjort status tydeligere enn prioritet og samlet oppspart beløp, målbeløp, fremdrift og månedlig sparing i et strammere hierarki.
- Komprimert +500 kr/mnd-analysen til en enkel innsiktslinje per mål.
- Erstattet det permanente forklaringskortet med ett kompakt «Mulig ekstra sparing»-kort og standard tomtilstand.
- Sikret at Rediger/Slett kobles til riktig sparemål selv når kortene sorteres etter prioritet.
- Ingen endringer i Finance Engine, målberegninger, datamodell eller lagring.

## v0.4.66 – Loans Page Pass
- Standardisert Lån og gjeld mot samme kompakte sideoppsett som øvrige økonomisider.
- Strammet lånekortene med tydeligere restsaldo, renteinformasjon og terminbeløp.
- Erstattet regnskapskoblingsraden med diskret «Med i budsjettet»-status når terminbeløpet inngår i budsjettet.
- Lagt til standard tomtilstand når ingen lån er registrert.
- Fjernet de overflødige forklaringskortene «Renteendring» og «Ekstra innbetaling».
- Ryddet simulatorens resultatkort og fjernet inline-layout.
- Ingen endringer i låneberegninger, Finance Engine, CRUD, lagring eller datamodell.

## v0.4.65 – Expense Page Pass
- Utgifter bruker samme Unified Table System-oppsett som Budsjett og Inntekter.
- Lagt til felles søke-toolbar, sortering, sticky header og standard tomtilstand.
- Beløp høyrejusteres og tabellkolonnene er strammet inn.
- «Variable utgifter» er endret til «Øvrige utgifter» for å samsvare bedre med beregningen.
- KPI- og tabellspacing er harmonisert med de øvrige økonomisidene.
- Eksisterende kategorifilter, CRUD, Finance Engine og lagring er uendret.

## v0.4.64 – Income Page Pass

- Standardized Inntekter on the shared page/table layout.
- Replaced the local toolbar with `UI.tableToolbar()` and added consistent search markup.
- Enabled shared sortable columns and sticky table header.
- Right-aligned the amount column and tightened date/frequency/status widths.
- Renamed `Variabel inntekt` to `Øvrige inntekter` with clearer supporting text.
- Added the shared empty-table state and compact section spacing.
- No Finance Engine, CRUD, persistence or calculation logic changed.

## v0.4.63 – Budget Page Pass

- Koblet Budsjett-tabellen til Unified Table System med søk, sortering og sticky header.
- Høyrejustert økonomiske kolonner og strammet periode-/forbrukskolonner.
- Viser forbruksprosent sammen med progressbar.
- Fremhever ubudsjetterte rader subtilt.
- Kategori kan åpne Utgifter filtrert på samme kategori.
- Forbedret tomtilstand og spacing uten å endre beregninger, CRUD eller datamodell.

## v0.4.62 – Dashboard UI pass

- Strammet KPI-hierarki og samlet Dashboard-spacing.
- Lagt til diskrete seksjonsmarkører for status og nøkkeltall.
- Gjort sekundære KPI-er mer kompakte.
- Redusert donut- og grafhøyde uten å endre datagrunnlag.
- Forbedret kategorirader, sparetips, sparemål og tomtilstander.
- Justert responsive brytepunkter for jevnere overgang.
- Ingen endringer i beregnings-, lagrings- eller navigasjonslogikk.

## v0.4.61 – UI: remove dead actions

- Fjernet døde knappene Filter og Eksporter fra Inntekter.
- Fjernet døde knappene Filter og Vis ubetalte fra Utgifter.
- Fjernet død + Legg til post-knapp fra Dashboard.
- Ingen motor-, data- eller CRUD-logikk er endret.

## v0.4.60 – UI: Matlager table-toolbar consistency

- Added the shared table toolbar to Matlager → Beholdning.
- Added search for pantry inventory using the existing global table search wiring.
- No changes to Pantry Engine, Barcode Engine, storage, or CRUD behaviour.

## v0.4.59 – UI: Unified Table System foundation
- Ny bakoverkompatibel `UI.table()` med støtte for kolonnemetadata, justering, sticky header, sortering, loading og standard tomtilstand.
- Ny `UI.tableToolbar()` for felles søk-/filter-/handlingsområde.
- Tabeller har fått mer kompakt radhøyde, konsekvent padding, subtil zebra, hover/focus og tabular numerics.
- Standardisert grunnlag for handlingskolonner og responsiv toolbar.
- Ingen side- eller motorlogikk er endret; sidevis migrering gjøres senere.

# Changelog

## v0.4.58 – UI: kompakte kort og KPI-er
- Gjort KPI-kort merkbart mer kompakte med tydeligere hierarki mellom label, verdi og hjelpetekst.
- Redusert padding, minimumshøyder og grid-gap på felles kortsystem.
- Standardisert card-header, valgfritt header-extra-område, card-body, meta-rader og card-actions.
- Beholdt Dashboardets primære/sekundære KPI-hierarki, men gjort begge nivåer tettere.
- Gjort lån-, sparemål-, oppskrifts- og sparetipskort mer kompakte.
- Standardisert tomtilstand og erstattet relevante inline-margins med gjenbrukbare CSS-klasser.
- Ingen endringer i beregninger, motorer, lagring eller Barcode Engine.

## v0.4.57 – UI: felles sideheader
- Oppgradert `UI.pageHeader()` med tydeligere tittelhierarki og roligere beskrivelse.
- Standardisert spacing og handlingsområde på tvers av sidene.
- Fjerner tom handlingscontainer på sider uten headerknapper.
- Fjernet dobbel `header-actions`-markup på Oppskrifter.
- Begrenset beskrivelsesbredde for bedre lesbarhet på brede skjermer.
- Forbedret responsiv wrapping på mellomstore vinduer og stablede handlinger på små skjermer.
- Ingen endringer i sidefunksjoner eller motorlogikk.

## v0.4.56 – UI: appskall og navigasjon
- Strammet inn toppfelt og samlet år/måned i én visuell periodekontroll.
- Gjort Hurtigregistrering tydeligere med «+ Legg til».
- Forbedret hover-, aktiv- og tastaturfokus for hoved- og underfaner.
- Skjuler undernavigasjon automatisk når en seksjon bare har én side.
- Forenklet statuslinjen til lokal lagring og appversjon.
- Lagt til en felles `navigateTo()`-flyt for intern navigasjon og fjernet duplisert navigasjonskode.
- Forbedret responsiv oppførsel i toppfelt og faner.


## 0.4.55
- Butikk- og prisvalg i strekkodemodalen uten endring i scanner-loop eller videobehandling.
- Valgt butikk huskes gjennom samme skanneøkt.
- Billigste tilgjengelige butikk brukes når øktbutikken mangler varen.
## v0.4.55

- Kontinuerlig skanneøkt: kameraet forblir tilkoblet etter lagring.
- Neste vare kan skannes automatisk uten ny QR-paring.
- Tydelig skanneramme og sentrert bildeanalyse beholdt.
- Produktoppslag pauser dekoderen mens varen kontrolleres og starter den igjen etter lagring.

## v0.4.51

- La til tydelig skanneramme over mobilkameraet.
- Barcode Engine analyserer kun området innenfor rammen.
- Tettere skanneintervall og større effektiv strekkodeoppløsning.
- Mobilkamera og produktflyt ellers uendret.

## v0.4.50
- Mobilkamera via QR-paring, isolert på stabil v0.4.46-base.
- SDK lastes først når skanneren åpnes, slik at appoppstart ikke påvirkes.
- QR-feltet erstattes av livevideo når mobilen kobles til.

## v0.4.46
- Standardisert produktmodell i Barcode Engine.
- Automatisk utfylling av produktdata og bilde.
- Husker plassering per EAN.
- Lagrer lokal prishistorikk på matlagervarer.
- Kan markere tilsvarende handlelistevare som kjøpt ved skanning til matlager.

# Changelog

## v0.4.46
- Rettet normalisering av Kassalapp sitt EAN-endepunkt (`data.products`).
- Produktnavn, EAN, pris, pakningsstørrelse og butikk vises nå korrekt etter skanning.

## v0.4.44
- Rettet runtime-feilen `escapeHtml is not defined` etter vellykket strekkodeskanning.
- Barcode Engine kan nå vise og lagre det oppslåtte produktet.

# Endringslogg

## v0.4.43
- Ignorerer normale ZXing-missetreff per videobilde, slik at de ikke vises som kamerafeil.
- Bruker høyere kameraoppløsning, bakre kamera og kontinuerlig fokus/eksponering når kameraet støtter det.
- Redusert skanneintervall for mer stabil EAN-lesing.

## v0.4.43

- Rettet Barcode Engine-kall mot PricingEngine: bruker nå `enrichProducts`.
- Rettet avhengighetsnavnene for produktdetalj og prisoppslag.
- Lagt til ZXing-basert kameraskanning med BarcodeDetector som fallback.
- Manuelt EAN-oppslag fungerer igjen.

## v0.4.41
- Ny Barcode Engine med kamera/EAN-oppslag mot Kassalapp.
- Skann direkte til Matlager eller Handleliste.
- Manuell EAN-fallback og eksplisitt bekreftelse før lagring.

# Endringslogg

## 0.4.37 – Shopping Engine

- Ny sentral Shopping Engine.
- Flyttet generering av handleliste fra matplan ut av UI-koden.
- Samler like ingredienser og skalerer etter antall personer.
- Trekker matlager fra beregnet behov.
- Lager standardiserte handlelisteposter.
- Samler handlelistestatus og bokføringsgrunnlag i én motor.
- Lagt til egne motor- og regresjonstester.

## 0.4.36 – Pricing Engine
- Ny sentral `PricingEngine` for Kassalapp-normalisering, prisberikelse, enhetskonvertering og kostnadsberegning.
- Oppskrifter, ingredienser, handleliste og Matøkonomi bruker samme prismotor.
- Duplisert prislogikk fjernet fra `app.js` og `crud.js`.
- Tester for motorens pris- og enhetsberegninger lagt til.

# Endringslogg

## 0.4.35
- Fjernet manuelt produktsøk fra hver ingrediensrad.
- Beholdt automatisk parallell matching, cache, tidligere valg og produktforslag.
- Redusert plassbruk i oppskriftsmodalen.

0.4.34
- Ingrediensmatching kjører opptil fire søk parallelt.
- Tidligere valg og søkecache brukes før nye API-kall.
- Alle ingrediensrader har eget fritt Kassalapp-søk.
- Automatiske forslag kan alltid overstyres.
- Status oppdateres fortløpende per ingrediens.
- Søkeresultater lagres ikke i oppskriften.

## 0.4.39
- Ny sentral Meal Planning Engine.
- Flyttet ukekopiering, porsjonsskalering, oppskriftskobling, kostnadsberegning, restemat/fryseporsjoner og matplanoppsummering ut av UI-koden.
- Matplan, backend og CRUD bruker nå samme motor.

## 0.4.39
- Shopping Engine summerer samme ingrediens på tvers av oppskrifter.
- Mengder normaliseres mellom kg/g og l/dl/ml.
- Matlager trekkes fra med produkt-ID/EAN og pakningsstørrelse.
- Antall nødvendige pakninger beregnes med avrunding oppover.
- Handlelisten viser behov, pakningsantall, pakningsstørrelse og estimert rest.
- Handlelistepris beregnes fra hele pakninger, ikke proporsjonal oppskriftskostnad.

## 0.4.41

- Ny Lageranalyse i Matlager.
- Beregner gjennomsnittlig bruk per uke fra Matplan og oppskrifter.
- Viser estimert varighet, anbefalt minimum og forslag til buffer.
- Tar hensyn til pakningsstørrelse, enheter, plassering og utløpsdato.
- Analyseperiode kan settes til 4, 8 eller 12 uker.
- Forslag legges aldri automatisk i handlelisten.
