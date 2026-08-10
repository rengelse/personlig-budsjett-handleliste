## Personlig Budsjett Handleliste v0.6.0

Denne versjonen introduserer **handleturer og lokal historikk** som grunnlag for senere retur av kjøpsdata til Personlig Budsjett på PC.

### Nytt
- QR-import og manuelle varer lagres nå i en aktiv **handletur**.
- Handleturen beholder alle varer, butikk, forventet pris og kjøpt-status.
- **Forventet totalpris** fra Personlig Budsjett holdes separat fra **faktisk totalpris**.
- Faktisk totalpris kan registreres manuelt på den aktive handleturen.
- Ny handling: **Fullfør handletur**.
- Fullførte turer flyttes til **Historikk**, gruppert etter måned og dato.
- Historikken viser kjøpt/total, forventet total, faktisk total og avvik.
- Tidligere «Fjern handlet» er erstattet med **Skjul/Vis handlet**, slik at kjøpte varer ikke slettes fra dataene.
- Eksisterende v0.5.2-handleliste migreres automatisk til en aktiv handletur ved oppdatering.

### Viktig
- PB1-formatet og QR-importen fra Personlig Budsjett er ikke endret.
- Retur-QR fra mobil til PC er **ikke** implementert i denne versjonen, men datamodellen er forberedt for dette.
- Update engine og permanent GitHub Release-signering er beholdt.
