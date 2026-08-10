# Personlig Budsjett – Handleliste Android v0.6.1

Android-handleappen for **Personlig Budsjett**. Desktopappen planlegger og genererer handlelisten; mobilappen mottar listen via PB1-QR og brukes under selve handleturen.

## v0.6.1

- Aktiv handleliste lagres som en **handletur**.
- Forventet totalpris fra desktop beholdes separat fra manuelt registrert **faktisk totalpris**.
- Handleturen kan fullføres og flyttes til lokal **Historikk**.
- Historikken grupperes etter måned og dato og viser forventet/faktisk pris og avvik.
- Kjøpte varer kan skjules uten å slettes, slik at varedata og kjøpt-status bevares for senere retur til desktopappen.
- Eksisterende v0.5.2-data migreres automatisk til den nye modellen.
- PB1-format og eksisterende QR-import er uendret.

## Distribusjon

GitHub Actions bygger en permanent signert release-APK. Ved tagger på formen `mobile-v*` publiseres APK-en som GitHub Release asset med stabilt navn:

`handleliste.apk`

Update engine i appen sjekker Latest Release og kan laste ned denne APK-en. Alle release-builds må signeres med samme permanente signing key.

## Release-signering

Signing key lagres som GitHub Actions Secrets. Selve `.jks`-filen skal aldri committes til repositoryet.
