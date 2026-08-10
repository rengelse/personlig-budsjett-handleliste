# v0.7.5 – Audit og løsning

Baseline: v0.7.4 full ZIP.

## Endringer

- Kjøpshistorikk rendres som kollapsbare `<details>`-grupper per ISO-uke.
- Nyeste uke er åpen som standard; eldre uker er kollapset.
- Ukehodet viser uke, mandag–søndag-intervall, vareantall og totalsum.
- Dato beholdes på varelinjen; Uke-kolonnen fjernes som redundant.
- Eksisterende periodefilter og sorteringsstate beholdes. Varelinjene sorteres fortsatt etter valgt sortering innen ukegruppene; ukegruppene vises kronologisk (eldst først kun ved «Eldste kjøp», ellers nyest først).
- Egen Handleliste-knapp for «Skann vare» fjernes.
- «Skann vare» legges som tredje valg i Mobiloverføring og åpner eksisterende `openBarcodeScanner('shopping')` uten endring i scannerimplementasjonen.

## Risiko / data

- Ingen IndexedDB-migrering.
- Ingen endring i PB1/PB2 eller lokal HTTP-mobiloverføring.
- Ingen brukerdata slettes eller omskrives.

## Kontroll

- Hele JavaScript-kodebasen passerer `node --check`.
- `npm test`: Alle tester bestått.
