window.APP_SEED = {
  summary: {
    available: 24850,
    fixed: 19340,
    variable: 8120,
    result: 6730,
    spent: 21460,
    upcoming: 4980,
    debt: 2148000,
    interest: 8920,
    foodBudget: 7500,
    foodActual: 4825
  },
  incomes: [
    ['Fast lønn', 43800, '12.08.2026', 'Månedlig', 'Lønn', 'Aktiv'],
    ['Overtid juli', 4200, '12.08.2026', 'Variabel', 'Overtid', 'Aktiv'],
    ['Leieinntekt bod', 1800, '01.08.2026', 'Månedlig', 'Leieinntekt', 'Aktiv'],
    ['Refusjon reise', 760, '05.08.2026', 'Engangs', 'Refusjon', 'Avsluttet']
  ],
  expenses: [
    ['Boliglån', 12650, '15.08.2026', 'Bolig', 'Månedlig', 'Ubetalt'],
    ['Strøm', 1380, '20.08.2026', 'Strøm', 'Månedlig', 'Ubetalt'],
    ['Dagligvarer', 4825, 'Løpende', 'Mat', 'Variabel', 'Delvis'],
    ['Forsikringer', 2240, '01.08.2026', 'Forsikring', 'Månedlig', 'Betalt'],
    ['Mobil og internett', 1098, '08.08.2026', 'Telefon/internett', 'Månedlig', 'Betalt'],
    ['Drivstoff', 1860, 'Løpende', 'Transport', 'Variabel', 'Delvis']
  ],
  loans: [
    {name:'Boliglån', type:'Boliglån', balance:1850000, original:2300000, nominal:5.2, effective:5.41, payment:12650, term:'18 år 4 mnd'},
    {name:'Billån', type:'Billån', balance:214000, original:340000, nominal:6.8, effective:7.24, payment:4860, term:'4 år 2 mnd'},
    {name:'Studielån', type:'Studielån', balance:84000, original:132000, nominal:4.65, effective:4.65, payment:1180, term:'7 år 1 mnd'}
  ],
  goals: [
    {name:'Bufferkonto', current:68400, target:100000, deadline:'Desember 2026', monthly:7900, priority:'Høy'},
    {name:'MC-ferie Europa', current:18200, target:45000, deadline:'Mai 2027', monthly:2980, priority:'Middels'},
    {name:'Oppussing kjøkken', current:26000, target:160000, deadline:'Juni 2028', monthly:6100, priority:'Lav'}
  ],
  budgets: [
    ['Bolig', 15800, 15240], ['Mat', 7500, 4825], ['Transport', 4000, 3160], ['Strøm', 1500, 1380], ['Forsikring', 2300, 2240], ['Fritid', 2500, 1880], ['Sparing', 11000, 11000]
  ],
  recipes: [
    {name:'Kremet kyllingpasta', category:'Middag', time:'30 min', servings:4, price:148, tags:['Rask','Familie'], favorite:true},
    {name:'Tacobowl med ris', category:'Middag', time:'25 min', servings:4, price:176, tags:['Favoritt'], favorite:true},
    {name:'Fiskegrateng', category:'Middag', time:'55 min', servings:6, price:198, tags:['Frysevennlig'], favorite:false},
    {name:'Havregrøt med bær', category:'Frokost', time:'10 min', servings:2, price:28, tags:['Billig','Rask'], favorite:true},
    {name:'Tomatsuppe med egg', category:'Middag', time:'20 min', servings:4, price:74, tags:['Billig','Vegetar'], favorite:false},
    {name:'Kyllingwraps', category:'Lunsj', time:'20 min', servings:4, price:132, tags:['Rask'], favorite:false}
  ],
  ingredients: [
    ['Kyllingfilet','g',700,119.90,'Rema 1000','Kjøtt','05.08.2026'],
    ['Pasta','g',500,24.90,'Kiwi','Tørrvarer','04.08.2026'],
    ['Kjøttdeig','g',400,69.90,'Rema 1000','Kjøtt','03.08.2026'],
    ['Ris','g',1000,39.90,'Coop Extra','Tørrvarer','01.08.2026'],
    ['Løk','g',1000,26.90,'Kiwi','Grønnsaker','30.07.2026'],
    ['Melk','ml',1000,23.90,'Rema 1000','Meieri','05.08.2026']
  ]
};

window.AppState = window.APP_SEED;
