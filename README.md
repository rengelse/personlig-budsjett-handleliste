# v0.4.2 – Innstillinger og bunnnavigasjon

- Ny Innstillinger-fane i bunnnavigasjonen.
- Bunnnavigasjon: Oversikt · Handleliste · Skann QR · Innstillinger.
- Versjonsnummer hentes dynamisk fra BuildConfig.
- Innstillinger har eget område for Om appen og Oppdateringer.
- Oppdateringsmotor kobles på i neste steg.

# Personlig Budsjett – Handleliste Android v0.4.0

## Nytt
- Ekte **Oversikt**-skjerm med fremdrift, forventet totalpris, gjenstående beløp, manglende priser og butikkoversikt.
- **Handleliste** er egen navigerbar hovedvisning.
- **Skann QR** beholdes som tredje hovedhandling.
- **Legg til vare** har nå Mest brukt, Nylig brukt og manuelt varenavn.
- Bruksfrekvens lagres lokalt på telefonen.
- Tannhjulet er fjernet.
- Versjonsnummer vises direkte under «Handleliste».
- Android WindowInsets-fiksen fra v0.3.1 beholdes.
- PB1-format og eksisterende handlelistedata beholdes.

## Release-signering

Fra v0.4.4 bygges GitHub Release-APK med `assembleRelease` og en permanent signing key lagret som GitHub Actions Secrets. Selve `.jks`-filen skal aldri committes til repoet. Workflowen publiserer fortsatt APK-en med stabilt navn `handleliste.apk`.



## Oppdateringer

Fra v0.4.5 sjekker appen GitHub Releases automatisk og kan laste ned `handleliste.apk`. Android viser fortsatt sin systembekreftelse før APK-en installeres. Release-builds må signeres med samme permanente nøkkel.
