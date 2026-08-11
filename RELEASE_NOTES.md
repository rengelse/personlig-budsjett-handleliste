# Personlig Budsjett Handleliste v0.9.0

## Prototype: Skann til PC

- Ny «Skann til PC»-flyt under Overfør.
- Android scanner først en pairing-QR fra Personlig Budsjett desktop.
- Pairing-QR peker til en lokal HTTP-session på `/pb/barcode/<token>`.
- Etter pairing åpnes en vedvarende EAN/UPC-scanner på mobilen.
- EAN-13, EAN-8, UPC-A og UPC-E dekodes lokalt på Android med ML Kit.
- Hver kode sendes direkte til desktop som liten JSON-payload; Android gjør ikke Kassal.app-oppslag i denne flyten.
- Samme kode undertrykkes i ca. 1,6 sekunder for å hindre spam, mens andre koder kan sendes fortløpende.
- Scannerbildet viser sist sendt kode og sendestatus og forblir åpent til brukeren lukker det.
- ML Kit auto-zoom er aktivert for produktstrekkoder for å redusere behovet for manuell zoom.

Eksisterende handlelisteoverføring, PB1/PB2, lokal katalog og Kassal.app-funksjon for «Skann kode» i handlelisten er uendret.
