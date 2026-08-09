# Personlig Budsjett – Handleliste Android

Første proof-of-concept for den lokale Android-følgeappen til Personlig Budsjett.

## v0.1.0

- Android 6.0+ (API 23)
- Ingen konto eller innlogging
- Ingen backend/server
- Lokal lagring på telefonen
- Skann handleliste direkte fra QR
- Erstatt eller slå sammen med eksisterende liste
- Kategorivisning
- Avkryssing av varer
- Ferdige varer flyttes til egen seksjon
- Legg til / rediger / slett varer manuelt
- Estimert pris kan vises når desktop-appen sender den
- Lys/mørk modus følger telefonen

## QR-protokoll PB1

Produksjonsformat:

`PB1:<base64url(gzip(utf8(json)))>`

JSON før komprimering:

```json
{
  "v": 1,
  "list": "Handleliste uke 33",
  "items": [
    {
      "name": "Kjøttdeig",
      "qty": 400,
      "unit": "g",
      "category": "Kjøtt",
      "price": 59.9,
      "store": "REMA 1000",
      "ean": "7035620057773"
    }
  ]
}
```

Appen aksepterer også rå JSON i utviklingsfasen, men desktop-integrasjonen skal bruke `PB1:`.

## Bygg APK gratis med GitHub

Prosjektet inneholder `.github/workflows/build-apk.yml`.

1. Opprett et GitHub-repository.
2. Last opp innholdet i dette prosjektet.
3. Push til `main`.
4. Åpne **Actions → Build Android APK**.
5. Ferdig APK ligger som artifact `personlig-budsjett-handleliste-debug`.

Når vi senere lager tag som `mobile-v0.1.0`, legges APK-en også på GitHub Release automatisk.

> POC-en bruker debug-signert APK. Før permanent distribusjon lager vi en fast privat signeringsnøkkel slik at nye APK-versjoner kan installeres som oppdateringer over eksisterende app.
