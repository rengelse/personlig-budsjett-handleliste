# Desktop Barcode Companion – prototypekontrakt v0.9.0

## Formål
Android dekoder produktstrekkoder lokalt og sender bare koden til Personlig Budsjett desktop. Ingen produkt-/Kassal.app-oppslag gjøres av denne flyten på Android.

## Pairing QR
Desktop viser en vanlig lokal HTTP-URL:

`http://192.168.1.42:53127/pb/barcode/<token>`

Android krever:
- `http`
- privat/lokal IPv4
- path `/pb/barcode/<token>`
- URL-safe token

IP og port hardkodes ikke.

## Sending av strekkode
For hver dekodede vare gjør Android HTTP POST til nøyaktig pairing-URL.

Header:
`Content-Type: application/json; charset=utf-8`

Body:
```json
{
  "type": "barcode",
  "ean": "7038010012345"
}
```

Desktop skal ved vellykket mottak svare HTTP 200 med:
```json
{"ok":true}
```

Samme session-URL brukes for flere strekkoder til scannerbildet lukkes eller desktop avslutter sessionen.

## Barcodeformater
- EAN-13
- EAN-8
- UPC-A
- UPC-E

## Duplikatbeskyttelse
Samme kode undertrykkes i ca. 1,6 sekunder etter deteksjon. En annen kode kan sendes umiddelbart. Ved sendefeil fjernes sperren slik at varen kan skannes på nytt.

## Ansvarsdeling
Android: kamera, lokal dekoding, pairing og transport.
Desktop: produktlookup, Kassal.app, Matlager, kjøpsregistrering, handleliste og database.
