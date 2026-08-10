# Personlig Budsjett Handleliste v0.6.5

Android-handleappen for **Personlig Budsjett**. Desktop planlegger handlelisten; mobilen mottar den via QR og brukes under handleturen.

## QR-protokoll

v0.6.5 bruker den kompakte **PB v2**-kontrakten sammen med Personlig Budsjett Desktop v0.7.2:

- `PB1:` Desktop -> Android
- `PB2:` Android -> Desktop
- UTF-8 JSON -> GZIP -> Base64URL uten påkrevd padding
- korte stabile liste- og varelinje-ID-er bevares uendret gjennom hele handleturen
- PB2 returnerer bare varer som faktisk er kjøpt
- faktisk totalsum returneres når brukeren har registrert den
- faktisk varepris returneres bare dersom mobilen faktisk kjenner den

Android kan fortsatt lese PB1 v1. Eldre historiske turer uten komplett v2-identitet kan fortsatt returneres som PB2 v1, som Desktop v0.7.2 støtter.

Se `QR_PROTOCOL.md` for feltkontrakten.

## Handleturer og historikk

Den aktive handlelisten lagres som en handletur. Forventet total fra desktop beholdes separat fra manuelt registrert faktisk total. Fullførte turer lagres i lokal historikk, gruppert etter måned og dato, og kan åpnes i read-only detaljvisning.

## Distribusjon og oppdatering

GitHub Actions bygger signert release-APK. Tagger på formen `mobile-v*` publiserer APK-en som GitHub Release asset med stabilt navn `handleliste.apk`. Appens update engine bruker Latest Release.

Release-signering skal alltid bruke samme permanente signing key via GitHub Actions Secrets. `.jks` skal aldri committes til repositoryet.
