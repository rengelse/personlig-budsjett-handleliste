# PB QR-protokoll

## PB v2 – kompakt kontrakt

Transport begge retninger:

`JSON -> UTF-8 -> GZIP -> Base64URL uten påkrevd padding -> prefiks`

- Desktop -> Android: `PB1:`
- Android -> Desktop: `PB2:`

### PB1 v2 – Desktop -> Android

```json
{
  "v": 2,
  "id": "l2k9x7",
  "i": [
    {
      "i": "i8fs2q",
      "n": "Kjøttdeig",
      "q": 1,
      "u": "stk",
      "c": "Kjøtt",
      "s": "REMA 1000",
      "p": 69.9
    }
  ]
}
```

Android bevarer toppnivå `id` som sourceListId og varefelt `i` som sourceItemId uendret gjennom import, lokal lagring, redigering, kjøpt-status, historikk og retur.

I PB1 v2 betyr `p` forventet pris. Feltet er valgfritt.

### PB2 v2 – Android -> Desktop

```json
{
  "v": 2,
  "id": "l2k9x7",
  "t": 74.9,
  "i": [
    {
      "i": "i8fs2q",
      "n": "Kjøttdeig",
      "q": 1,
      "u": "stk",
      "c": "Kjøtt",
      "s": "REMA 1000",
      "p": 74.9
    }
  ]
}
```

PB2 inneholder bare varer som er markert kjøpt.

- `v`: protokollversjon, `2`
- `id`: samme stabile desktop-liste-ID som kom i PB1
- `t`: faktisk totalsum for handleturen, valgfri
- `i`: kjøpte varer

Per vare:

- `i`: samme stabile desktop-varelinje-ID som kom i PB1
- `n`: varenavn
- `q`: mengde
- `u`: enhet
- `c`: kategori
- `s`: butikk
- `p`: faktisk varepris, kun når Android faktisk kjenner den

I PB2 v2 sendes aldri PB1-forventet pris tilbake som `p`. Dersom faktisk varepris er ukjent, utelates `p`.

## Bakoverkompatibilitet

Android v0.6.5 leser fortsatt PB1 v1. Historiske turer som mangler egnet source-identitet kan fortsatt genereres som PB2 v1, som Desktop v0.7.2 støtter.
