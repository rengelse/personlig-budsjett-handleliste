# QR-protokoller

## PB1 – Personlig Budsjett Desktop → Android

Transporterer en komplett planlagt handleliste fra Personlig Budsjett Desktop til Android uten nettverk, server eller konto.

Format:

`PB1:` + Base64 URL-safe uten padding av GZIP-komprimert UTF-8 JSON.

Obligatorisk:
- `v`: heltall, nå `1`
- `items`: array
- `items[].name`: ikke-tomt varenavn

Anbefalt:
- `list`
- `qty`
- `unit`
- `category`
- `price`
- `store`
- `ean`

Ukjente felter skal ignoreres.

## PB2 – Android → Personlig Budsjett Desktop

Returnerer en fullført handletur til Personlig Budsjett. PB2 er separat fra PB1 og skal ikke brukes til import av planlagte handlelister på mobilen.

Format:

`PB2:` + Base64 URL-safe uten padding av GZIP-komprimert UTF-8 JSON.

PB2 v1 bruker korte feltnavn for å holde QR-koden liten.

Rotobjekt:
- `v`: protokollversjon, nå `1`
- `id`: stabil handletur-ID
- `l`: listenavn
- `ca`: opprettet tidspunkt, Unix ms
- `da`: fullført tidspunkt, Unix ms
- `et`: forventet totalpris
- `at`: faktisk totalpris når registrert
- `i`: array med varer som faktisk er markert kjøpt

Vareobjekt:
- `n`: varenavn
- `q`: mengde
- `u`: enhet
- `c`: kategori
- `ep`: forventet pris når tilgjengelig
- `s`: butikk når tilgjengelig
- `e`: EAN når tilgjengelig

Kun varer med kjøpt-status sendes i PB2 v1. Ikke-kjøpte varer blir liggende i mobilens historikk, men skal ikke registreres som kjøp i desktopappen.
