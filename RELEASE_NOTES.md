## Personlig Budsjett Handleliste v0.6.2

Denne versjonen innfører første del av returflyten fra mobilappen tilbake til Personlig Budsjett på PC.

### Nytt
- Åpne en fullført handletur i **Historikk** og velg **Send til Personlig Budsjett**.
- Appen genererer en QR-kode med den fullførte handleturen.
- Ny separat **PB2-protokoll** for Android → Personlig Budsjett Desktop.
- Retur-QR inneholder stabil handletur-ID, dato/tid, forventet totalpris og faktisk totalpris når denne er registrert.
- Bare varer som faktisk er markert **Kjøpt** sendes tilbake. Ikke-kjøpte varer blir ikke registrert som kjøp ved en senere desktopimport.
- Varedata inkluderer navn, mengde, enhet, kategori, forventet pris, butikk og EAN når dette finnes.
- PB2 bruker GZIP + Base64 URL-safe og kompakte feltnavn for å holde QR-koden så liten som mulig.

### Viktig
Personlig Budsjett Desktop må få støtte for å lese PB2 før QR-koden kan importeres på PC. Denne versjonen implementerer Android-siden av returflyten.

### Uendret
- PB1-import fra Personlig Budsjett til mobilappen er uendret.
- Historikk og fullførte handleturer beholdes lokalt.
- Update engine og GitHub Release-flyten er beholdt.
