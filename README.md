# Personlig Budsjett Handleliste v0.6.7

Android-handleappen for **Personlig Budsjett**. Desktop planlegger handlelisten; mobilen mottar den direkte fra Personlig Budsjett over samme lokale Wi-Fi/LAN og brukes under handleturen.

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
