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
