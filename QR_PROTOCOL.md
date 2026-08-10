# Lokal mobiloverføring – Personlig Budsjett Desktop v0.7.3+

Fra Android v0.6.6 inneholder QR-koden ikke lenger PB1/PB2-data. QR brukes bare som en engangs pairing-adresse til Personlig Budsjett på samme lokale Wi-Fi/LAN.

Det finnes ingen ekstern server eller skykomponent.

## Pairing-QR

Desktop viser en vanlig lokal HTTP-URL, for eksempel:

`http://192.168.1.42:53127/pb/send/JR6-Y2bQnQW8fZKx`

eller:

`http://192.168.1.42:53127/pb/receive/JR6-Y2bQnQW8fZKx`

Android bruker IP, port, path og token nøyaktig fra QR-en. IP og port hardkodes ikke.

Android validerer før tilkobling at:

- scheme er `http`
- host er privat/lokal IPv4 (`10/8`, `172.16/12`, `192.168/16` eller link-local `169.254/16`)
- path er riktig for valgt retning
- token består av URL-safe bokstaver/tall/`_`/`-`
- URL-en ikke inneholder userinfo, query eller fragment

## Desktop -> Android: Motta fra PC

1. Desktop åpner **Mobiloverføring -> Send til mobil**.
2. Desktop viser pairing-QR med `/pb/send/<token>`.
3. Android velger **Motta fra PC** og scanner QR-en.
4. Android gjør HTTP `GET` til nøyaktig URL i QR-en.
5. Ved HTTP 200 leses response body som direkte UTF-8 JSON.

Det brukes ikke GZIP, Base64URL eller `PB1:`-prefiks over LAN.

### PB1 v2 JSON

```json
{
  "v": 2,
  "id": "labc123",
  "i": [
    {
      "i": "ixyz789",
      "n": "Kjøttdeig",
      "q": 1,
      "u": "stk",
      "c": "Mat",
      "s": "REMA 1000",
      "p": 69.9
    }
  ]
}
```

- root `id` er stabil desktop liste-ID og lagres som `sourceListId`
- varefelt `i` er stabil desktop varelinje-ID og lagres som `sourceItemId`
- `p` er forventet pris og er valgfri
- identitetene bevares uendret gjennom lokal lagring, redigering, kjøpt-status, fullføring og historikk

## Android -> Desktop: Send til PC

1. Desktop åpner **Mobiloverføring -> Motta fra mobil**.
2. Desktop viser pairing-QR med `/pb/receive/<token>`.
3. Android åpner en fullført handletur og velger **Send til PC**.
4. Android scanner pairing-QR-en.
5. Android gjør HTTP `POST` til nøyaktig URL i QR-en.
6. Header er `Content-Type: application/json; charset=utf-8`.
7. Body er direkte PB2 v2 JSON.
8. Vellykket mottak krever HTTP 200 og `{"ok":true}` fra desktop.

### PB2 v2 JSON

```json
{
  "v": 2,
  "id": "labc123",
  "t": 879.3,
  "i": [
    {
      "i": "ixyz789",
      "n": "Kjøttdeig",
      "q": 1,
      "u": "stk",
      "c": "Mat",
      "s": "REMA 1000",
      "p": 74.9
    }
  ]
}
```

PB2-regler:

- root `id` er nøyaktig samme liste-ID som Android mottok i PB1
- `i` inneholder bare varer som faktisk er kjøpt
- varefelt `i` er nøyaktig samme desktop vare-ID som kom i PB1
- `t` er faktisk totalsum og utelates dersom totalsum ikke er registrert
- `p` i PB2 er faktisk varepris og sendes bare når Android faktisk kjenner den
- Android konstruerer aldri manglende enkeltpriser fra totalsummen
- en historisk tur uten komplett desktop liste-/vareidentitet avvises for lokal retur fremfor å sende tvetydige data

## HTTP-feil

Android viser målrettet feilinformasjon for blant annet:

- `400` – ugyldig JSON/PB-data
- `404` – ugyldig/utløpt token eller feil URL
- `405` – feil HTTP-metode eller overføringsretning
- `410` – sesjonen er utløpt eller allerede brukt

Andre HTTP-statuskoder vises med statusnummer.

## Nettverk

- telefon og PC må være på samme lokale Wi-Fi/LAN
- Android har `INTERNET`-tillatelse
- appen tillater cleartext HTTP for den lokale pairing-adressen
- ingen ekstern tjeneste kontaktes for selve mobiloverføringen

## Legacy

`QrProtocol` beholder lesekode for tidligere PB1-prefiks/GZIP-format for datakompatibilitet i kodebasen, men den ordinære v0.6.6-brukerflyten bruker pairing-URL + lokal HTTP og forsøker ikke å tolke pairing-QR-en som PB-data.
