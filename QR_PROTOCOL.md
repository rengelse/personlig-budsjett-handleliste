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
- `list`: visningsnavn for handlelisten
- `id`: stabil ID for handlelisten i desktop. Android lagrer denne som `sourceListId`.
- `items[].id`: stabil ID for varelinjen i desktop. Android lagrer denne som `sourceItemId`.
- `qty`
- `unit`
- `category`
- `price`
- `store`
- `ean`

`id`-feltene er additive i PB1 v1. Eldre QR-koder uten ID-er skal fortsatt kunne importeres. Android godtar også aliasene `listId`/`sid` for liste-ID og `itemId`/`li` for varelinje-ID under overgang, men desktop bør bruke `id` som kanonisk PB1-felt.

Ukjente felter skal ignoreres.

## PB2 – Android → Personlig Budsjett Desktop

Returnerer en fullført handletur til Personlig Budsjett. PB2 er separat fra PB1 og skal ikke brukes til import av planlagte handlelister på mobilen.

Format:

`PB2:` + Base64 URL-safe uten padding av GZIP-komprimert UTF-8 JSON.

PB2 v1 bruker korte feltnavn for å holde QR-koden liten.

Rotobjekt:
- `v`: protokollversjon, nå `1`
- `id`: stabil handletur-ID generert på mobilen
- `sid`: stabil ID til opprinnelig PB1-handleliste når den finnes og turen ikke er slått sammen fra ulike kildelister
- `l`: listenavn
- `ca`: opprettet tidspunkt, Unix ms
- `da`: fullført tidspunkt, Unix ms
- `cur`: valuta, nå `NOK`
- `et`: forventet totalpris
- `at`: faktisk totalpris når registrert
- `i`: array med varer som faktisk er markert kjøpt

Vareobjekt:
- `li`: opprinnelig stabil PB1-varelinje-ID når tilgjengelig
- `n`: varenavn
- `q`: mengde
- `u`: enhet
- `c`: kategori
- `ep`: forventet pris når tilgjengelig
- `ap`: faktisk varepris når den faktisk er kjent. Feltet er valgfritt og skal ikke konstrueres fra totalavvik.
- `s`: butikk når tilgjengelig
- `e`: EAN når tilgjengelig

Kun varer med kjøpt-status sendes i PB2 v1. Ikke-kjøpte varer blir liggende i mobilens historikk, men skal ikke registreres som kjøp i desktopappen.

### Identitetsregler

- Mobilens `id` for handleturen og desktopens `sid` er to forskjellige identiteter.
- `sid` og `li` skal bevares uendret gjennom lokal redigering, kjøpt-markering, fullføring og historikk.
- Hvis brukeren slår sammen QR-lister med forskjellige kilde-ID-er, utelater mobilen `sid` i PB2 fremfor å sende en feil kobling. Linjer som har `li` beholder likevel sin identitet.
- Ved PB1-import med `items[].id` matches merge først på denne ID-en. To forskjellige desktop-linjer skal ikke slås sammen bare fordi navn eller EAN er likt.
