# Changelog

## v0.6.1
- Kollapsbare måneder i Historikk; inneværende måned åpen som standard.
- Fullførte handleturer kan åpnes med vanlig trykk.
- Ny read-only detaljvisning med alle varer, butikk, kjøpt-status og prisoppsummering.
- Historiske data kan ikke redigeres.
- Forbereder UI for senere retur-QR til Personlig Budsjett.

# v0.6.0 – Handleturer og historikk

- Innfører en egen handleturmodell med stabil ID, opprettet tidspunkt og fullført tidspunkt.
- Skiller forventet totalpris fra faktisk totalpris.
- Faktisk total kan registreres manuelt før eller under fullføring.
- Fullførte handleturer lagres lokalt og vises i Historikk gruppert etter måned og dato.
- Historikken viser kjøpt-status, forventet total, faktisk total og avvik.
- «Fjern handlet» er endret til Skjul/Vis handlet slik at kjøpte varer ikke slettes fra turdataene.
- v0.5.2-lagring migreres automatisk til ny handleturmodell.
- PB1 og QR-import beholdes uendret. Retur-QR til desktop er ikke implementert ennå.

# v0.5.2 – Forbedret Innstillinger

- Slår sammen «Om appen» og «Oppdateringer» til ett kompakt kort.
- Viser installert versjon, nyeste versjon og oppdateringsstatus samlet.
- Beholder Release-info, manuell oppdateringssjekk og Oppdater-knappen.
- Ingen endringer i den fungerende oppdateringsmotoren.

# v0.5.1 – Oppdateringstest

- Ren testrelease for den nye permanent signerte v0.5.x-linjen.
- Ingen funksjonelle endringer utover versjonsnummer.
- Skal oppdages automatisk av installert v0.5.0.
- Tester varsling, release-info, nedlasting og Android-oppdatering over eksisterende installasjon.
- Eksisterende handlelister og brukerdata skal beholdes.

# v0.5.0 – Ny permanent signert baseline

- Ny ren release-linje etter reset av GitHub-repo og signing-oppsett.
- Permanent release-signering brukes fra første v0.5.x-versjon.
- Automatisk oppdateringssjekk og update engine er inkludert.
- GitHub Release fortsetter å publisere stabil asset med navnet handleliste.apk.
- v0.5.0 skal installeres manuelt én gang som ny baseline.
- Alle senere v0.5.x-versjoner skal kunne oppdatere over denne med samme signing key.
- Ingen gamle v0.4.x-tags eller releases skal gjenbrukes.

# v0.4.5 – Update Engine

- Automatisk sjekk mot GitHub Releases ved oppstart.
- Innstillinger viser installert og nyeste versjon.
- Varsel i Innstillinger/bunnmeny når ny versjon finnes.
- Release-info hentes fra GitHub.
- Oppdater-knapp laster ned `handleliste.apk` med prosentvis fremdrift.
- APK deles sikkert til Android-installasjonen via FileProvider.
- Androids systembekreftelse brukes for selve installasjonen.
- Handleliste og lokal lagring endres ikke.
