# Personlig Budsjett

Electron-app for personlig økonomi og matplanlegging.

## Kjør lokalt

```bash
npm install
npm run dev
```

## Bygg Windows-installer

```bash
npm run dist
```

## Tester

```bash
npm test
```

## Budsjettposter

En budsjettpost angir navn, kategori, planlagt beløp, gyldighet og eventuelt kalenderuke. Kalenderukene beregnes fra valgt måned og år etter ISO-ukestandard.


## Endring i 0.4.15
Kontoer-modulen er fjernet. Appen fokuserer på inntekter, utgifter, budsjett, lån, sparing og analyser.


## Endring i 0.4.16
«Mine ingredienser» er fjernet. Ingredienser-fanen brukes nå til å finne produkter og priser fra Kassalapp. Produkter kan legges direkte i Matlager eller Handleliste.

### Ukebudsjett
For budsjettposter som gjelder valgt måned kan en faktisk ISO-kalenderuke velges. Hver uke vises som egen budsjettlinje, og registrerte utgifter fordeles automatisk etter utgiftsdatoens ISO-uke. Samme kategori kan ikke ha både hele måneden og ukebudsjetter i samme måned.


## Vedlikehold
Under Innstillinger → Vedlikehold kan enkeltområder tømmes eller hele appen nullstilles.


## Modaloppførsel i 0.4.21
Modaler forblir åpne ved klikk utenfor. Ved Avbryt, X eller Escape spør appen om ulagrede endringer skal forkastes.

## Sparing i v0.4.23
Sparemål krever kun målsum, planlagt månedlig sparing, valgfri måldato og prioritet. Fremdrift og forventet måldato beregnes automatisk. Forventet overskudd vises kun som forslag og endrer ikke regnskapet eller spart beløp automatisk.


## Oppskriftskostnader
Oppskrifter kan kobles til konkrete Kassalapp-produkter. Brukt mengde beregnes mot pakningsmengde og pakningspris. Totalpris og pris per porsjon oppdateres automatisk.


## Oppskriftsimport v1
Under Oppskrifter kan en URL importeres når siden publiserer schema.org Recipe som JSON-LD. Resultatet åpnes alltid i editoren før lagring.


## Ingrediensmotor v2
Importerte ingredienser matches automatisk mot Kassalapp. Sikre treff velges, mens usikre forslag vises for kontroll. Tidligere valg huskes lokalt.


## v0.4.33 – Matøkonomi
- Ny samlet Matøkonomi-side.
- Handleliste genereres fra matplan og oppskrifter.
- Like ingredienser slås sammen og matlager trekkes fra.
- Matbudsjett, faktisk forbruk, matplan og handleliste sammenlignes.


## Arkitektur
- `src/js/pricing-engine.js`: autoritativ pris-, enhets- og kostnadsmotor for matmodulene.

## Shopping Engine

`src/js/shopping-engine.js` er autoritet for handlelisteflyten: sammenslåing fra matplan, skalering, lagerfratrekk, genererte poster, statusoppsummering og bokføringsgrunnlag. UI-et skal ikke duplisere denne logikken.

### Meal Planning Engine
`src/js/meal-planning-engine.js` er autoritet for matplanposter, oppskriftskobling, porsjonsskalering, ukekopiering og matplanoppsummering.

### Mengdekontroll i handlelisten
Shopping Engine summerer ingrediensbehov fra alle planlagte oppskrifter, konverterer kompatible enheter, trekker fra registrert matlager og beregner antall hele pakninger som må kjøpes.

## Lageranalyse

Matlager viser en lokal rapport basert på registrerte måltider og oppskrifter. Rapporten beregner ukentlig bruk, hvor lenge beholdningen anslås å vare, anbefalt minimum og om varen bør fylles opp. Resultatene er kun forslag og endrer ikke handlelisten automatisk.
