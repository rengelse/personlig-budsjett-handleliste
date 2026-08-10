# Personlig Budsjett Handleliste v0.6.5

## Kompakt PB v2

- Støtte for den nye kompakte PB1 v2-kontrakten fra Personlig Budsjett Desktop v0.7.2.
- Leser korte liste- og varelinje-ID-er og bevarer dem gjennom hele handleturen.
- PB2 v2 returnerer samme liste-ID og varelinje-ID-er uendret.
- PB2 inneholder bare varer som faktisk er kjøpt.
- Faktisk totalsum sendes som `t` når den er registrert.
- `p` i PB2 sendes bare når faktisk varepris er kjent; forventet PB1-pris sendes ikke tilbake som faktisk pris.
- PB1 v1 beholdes som lesekompatibilitet for eldre QR-koder.
- Historiske turer kan fortsatt bruke PB2 v1 ved behov.
