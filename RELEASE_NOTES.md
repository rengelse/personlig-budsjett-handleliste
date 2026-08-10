## Personlig Budsjett Handleliste v0.6.3

Denne versjonen klargjør QR-returen for presis kobling tilbake til Personlig Budsjett på PC.

### Nytt
- PB1 kan nå motta og bevare stabil ID for handlelisten fra desktop.
- PB1 kan nå motta og bevare stabil ID for hver varelinje fra desktop.
- PB2 sender `sid` for opprinnelig handleliste når identiteten er entydig.
- PB2 sender `li` for kjøpte varelinjer når original ID finnes.
- PB2 sender nå valuta (`NOK`).
- Datamodellen støtter valgfri faktisk pris per vare for senere bruk.

### Sikrere sammenslåing
Når PB1 inneholder stabile varelinje-ID-er, brukes disse først ved sammenslåing. To forskjellige varelinjer blir derfor ikke lenger slått sammen bare fordi de har samme navn eller EAN.

Hvis en aktiv handletur slås sammen fra forskjellige desktop-lister, utelates toppnivå-ID-en i retur-QR i stedet for å sende en feil kobling.

### Kompatibilitet
Eksisterende PB1-koder uten ID-felter fungerer fortsatt som før. PB1-formatet er ikke brutt; ID-feltene er valgfrie tillegg til versjon 1.
