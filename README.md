# Personlig Budsjett – Handleliste Android v0.6.4

Android-handleappen for **Personlig Budsjett**. Desktopappen planlegger og genererer handlelisten; mobilappen mottar listen via PB1-QR og brukes under selve handleturen.

## v0.6.4

- Aktiv handleliste lagres som en **handletur**.
- Forventet totalpris fra desktop beholdes separat fra manuelt registrert **faktisk totalpris**.
- Handleturen kan fullføres og flyttes til lokal **Historikk**.
- Historikken grupperes etter måned og dato og viser forventet/faktisk pris og avvik.
- Kjøpte varer kan skjules uten å slettes, slik at varedata og kjøpt-status bevares for senere retur til desktopappen.
- Eksisterende v0.5.2-data migreres automatisk til den nye modellen.
- PB1 v1 er bakoverkompatibel; stabile liste-/varelinje-ID-er er lagt til som valgfrie felt for presis retur til desktop.

- Fullførte handleturer kan åpnes fra Historikk og sendes tilbake som **PB2-retur-QR**.
- Retur-QR sender bare varer som faktisk er markert kjøpt, sammen med forventet/faktisk totalsum og handletur-ID.

## Distribusjon

GitHub Actions bygger en permanent signert release-APK. Ved tagger på formen `mobile-v*` publiseres APK-en som GitHub Release asset med stabilt navn:

`handleliste.apk`

Update engine i appen sjekker Latest Release og kan laste ned denne APK-en. Alle release-builds må signeres med samme permanente signing key.

## Release-signering

Signing key lagres som GitHub Actions Secrets. Selve `.jks`-filen skal aldri committes til repositoryet.


## v0.6.4 – identitet for retur til desktop
PB1 kan valgfritt sende stabil liste-ID og varelinje-ID. Android bevarer disse og PB2 returnerer dem som `sid` og `li`, slik at Personlig Budsjett senere kan matche eksakt handleliste og varelinje. Eldre PB1-koder uten ID-er støttes fortsatt.
