# Personlig Budsjett Handleliste v0.6.6

## Lokal mobiloverføring

Denne versjonen tilpasser Android-appen til den nye lokale mobiloverføringen i Personlig Budsjett Desktop v0.7.3.

- QR-koden inneholder nå bare en kort, lokal pairing-URL – ikke selve handlelisten.
- Ny **Motta fra PC**-flyt: skann desktopens pairing-QR og hent PB1 v2 direkte med HTTP GET.
- Ny **Send til PC**-flyt fra fullført handletur: skann desktopens pairing-QR og send PB2 v2 direkte med HTTP POST.
- Liste-ID og vare-ID fra desktop bevares uendret for presis returmatching.
- Bare kjøpte varer sendes tilbake.
- Faktisk totalsum sendes når den er registrert; faktisk varepris sendes bare når den virkelig er kjent.
- Pairing-URL valideres som lokal/private IPv4 med riktig `/pb/send/` eller `/pb/receive/`-retning.
- Tydelige feil for utløpt/ugyldig token, feil metode og ugyldige PB-data.
- Ingen ekstern server eller skykomponent brukes.
