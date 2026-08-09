# PB1 QR Protocol

## Mål

Transportere en komplett handleliste fra Personlig Budsjett Desktop til Android uten nettverk, server eller konto.

## Format

`PB1:` + Base64 URL-safe uten padding av GZIP-komprimert UTF-8 JSON.

## Obligatorisk

- `v`: heltall, nå `1`
- `items`: array
- `items[].name`: ikke-tomt varenavn

## Anbefalt

- `list`
- `qty`
- `unit`
- `category`
- `price`
- `store`
- `ean`

Ukjente felter skal ignoreres, slik at protokollen kan utvides senere.
