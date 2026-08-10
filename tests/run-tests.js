'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { cleanBaseUrl, buildProductQuery } = require('../electron/kassal-query');

function testKassalQuery() {
  assert.equal(cleanBaseUrl('https://kassal.app/api/v1'), 'https://kassal.app/api/v1/');
  assert.throws(() => cleanBaseUrl('https://example.com/api/'), /kassal\.app/);
  const q = buildProductQuery({ search:'melk', sort:'price_asc', size:24, page:9, unique:false, excl_allergens:['MILK'] });
  assert.equal(q.get('search'), 'melk');
  assert.equal(q.get('size'), '24');
  assert.equal(q.get('unique'), '0');
  assert.equal(q.get('page'), null, 'Udokumentert page-parameter skal ikke sendes');
  assert.deepEqual(q.getAll('excl_allergens[]'), ['MILK']);
}

function loadFinanceEngine() {
  const context = { window:{}, console, Date, Map, Set, Math, Number, String, Array, Object, Intl };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/js/finance-engine.js'), 'utf8'), context);
  return context.window.FinanceEngine;
}

function testFinanceEngine() {
  const FinanceEngine = loadFinanceEngine();
  const data = {
    incomes:[{id:1,name:'Lønn',amount:40000,date:'2026-01-15',frequency:'Månedlig',category:'Lønn',status:'Aktiv'}],
    expenses:[{id:1,description:'Husleie',amount:12000,dueDate:'2026-01-01',frequency:'Månedlig',category:'Bolig',status:'Betalt',automatic:true,type:'Fast'}],
    loans:[], goals:[], budgets:[{id:1,name:'Bolig',category:'Bolig',planned:12000,frequency:'Månedlig',startDate:'2026-01-01',endDate:'',active:true}], occurrenceOverrides:[]
  };
  const month = FinanceEngine.build(data, '2026-08');
  assert.equal(month.metrics.plannedIncome, 40000);
  assert.equal(month.metrics.plannedExpenses, 12000);
  assert.equal(month.metrics.expectedCashFlow, 28000);
  assert.equal(month.byCategory.planned.Bolig, 12000);
  const year = FinanceEngine.build(data, '2026-all');
  assert.equal(year.metrics.plannedIncome, 480000);
  assert.equal(year.metrics.plannedExpenses, 144000);
  assert.equal(year.metrics.budgetPlanned, 144000);
  const inactive = FinanceEngine.build({...data, budgets:[{...data.budgets[0], active:false}]}, '2026-08');
  assert.equal(inactive.metrics.budgetPlanned, 12000);
  const inactiveEntries = FinanceEngine.build({...data, incomes:[{...data.incomes[0], active:false}], expenses:[{...data.expenses[0], active:false}]}, '2026-08');
  assert.equal(inactiveEntries.metrics.plannedIncome, 40000);
  assert.equal(inactiveEntries.metrics.plannedExpenses, 12000);
  assert.equal(inactiveEntries.metrics.actualExpenses, 12000);

  const weeklyBudgetData = {
    incomes:[], loans:[], goals:[], occurrenceOverrides:[],
    expenses:[
      {id:11,description:'Mat uke 33',amount:900,dueDate:'2026-08-12',frequency:'Engangs',category:'Mat',status:'Betalt',automatic:false,type:'Variabel'},
      {id:12,description:'Mat uke 34',amount:1100,dueDate:'2026-08-19',frequency:'Engangs',category:'Mat',status:'Betalt',automatic:false,type:'Variabel'}
    ],
    budgets:[
      {id:21,name:'Mat',category:'Mat',planned:1500,frequency:'Engangs',startDate:'2026-08-10',budgetMonth:'2026-08',calendarWeek:'2026-W33',active:true},
      {id:22,name:'Mat',category:'Mat',planned:1600,frequency:'Engangs',startDate:'2026-08-17',budgetMonth:'2026-08',calendarWeek:'2026-W34',active:true}
    ]
  };
  const weekly = FinanceEngine.build(weeklyBudgetData, '2026-08');
  assert.equal(weekly.budgets.length, 2, 'Ukesbudsjetter skal være separate rader');
  assert.deepEqual(weekly.budgets.map(x=>x.calendarWeek), ['2026-W33','2026-W34']);
  assert.deepEqual(weekly.budgets.map(x=>x.actual), [900,1100]);
  assert.equal(weekly.metrics.budgetPlanned, 3100);
  assert.equal(weekly.metrics.budgetActual, 2000);
}


function testPricingEngine() {
  const PricingEngine = require('../src/js/pricing-engine');
  assert.equal(PricingEngine.normalizeUnit('liter'), 'l');
  assert.equal(PricingEngine.baseQuantity(1.5, 'kg'), 1500);
  assert.equal(PricingEngine.baseQuantity(3, 'dl'), 300);
  assert(PricingEngine.compatibleUnits('dl','ml'));
  assert.equal(PricingEngine.ingredientCost({packagePrice:69.9,packageQuantity:400,packageUnit:'g',usedQuantity:300,usedUnit:'g'}), 52.425);
  assert.deepEqual(PricingEngine.recipeCost([{packagePrice:69.9,packageQuantity:400,packageUnit:'g',usedQuantity:300,usedUnit:'g'}],4), {total:52.42,perServing:13.11});
  const products=PricingEngine.normalizeProducts({data:[{id:1,name:'Melk',current_price:24.9,current_unit_price:24.9,weight:1,weight_unit:'l',store:[{name:'KIWI'}]}]});
  assert.equal(products[0].price,24.9);
  assert.equal(products[0].unit,'l');
  const shopping=PricingEngine.shoppingSummary([{price:100,store:'KIWI',checked:true},{price:50,store:'KIWI',checked:false},{price:20,atHome:true}]);
  assert.equal(shopping.estimated,150);
  assert.equal(shopping.purchased,100);
}


function testEanResponseNormalization() {
  const payload = { data: { ean: '7311311015953', products: [
    { id: 10, name: 'Testvare', current_price: { price: 29.9, unit_price: 59.8 }, weight: 500, weight_unit: 'g', store: { name: 'Butikk', code: 'TEST' } }
  ], allergens: [{ code:'milk' }], nutrition: [{ code:'energy' }] } };
  const product = PricingEngine.normalizeProducts(payload)[0];
  assert.equal(product.eName, 'Testvare');
  assert.equal(product.ean, '7311311015953');
  assert.equal(product.price, 29.9);
  assert.equal(product.unitPrice, 59.8);
  assert.equal(product.packageSize, 500);
}

function testStaticCleanup() {
  const root = path.join(__dirname, '..');
  const files = ['electron/main.js','electron/preload.js','src/js/app.js','src/js/backend.js','src/js/finance-engine.js','src/js/pricing-engine.js','src/js/barcode-engine.js','src/index.html'];
  const text = files.map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n');
  ['kassal:stores','kassal:category-id','kassal:labels','kassalProductSearchBtn','recordsForPeriod','window.DUMMY'].forEach(token => assert(!text.includes(token), `Død kode finnes fortsatt: ${token}`));
  assert(!text.includes("img-src 'self' data: https: http:"), 'CSP tillater fortsatt HTTP-bilder');
  ["{id:'accounts'", 'function accounts()', 'openAccountTransfer', 'transferBetweenAccountsBtn', "store:'accounts'", "label:'Konto'", "label:'Betalingskonto'"].forEach(token => assert(!text.includes(token), `Kontokode finnes fortsatt: ${token}`));
  const pkg = require('../package.json');
  assert.equal(pkg.version, '0.7.5');
  const html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
  const crud = fs.readFileSync(path.join(root,'src/js/crud.js'),'utf8');
  const backend = fs.readFileSync(path.join(root,'src/js/backend.js'),'utf8');
  const recipeModalSchema = crud.slice(crud.indexOf("recipes: { store:'recipes'"), crud.indexOf("mealplan: { store:'mealPlans'"));
  assert(!recipeModalSchema.includes("label:'Favoritt'"), 'Oppskriftsmodal skal ikke vise Favoritt-checkbox');
  assert(!crud.includes("${render('favorite')}"), 'Oppskriftsmodal prøver fortsatt å rendre fjernet favorittfelt');

  const componentsCss = fs.readFileSync(path.join(root,'src/css/components.css'),'utf8');
  assert(!crud.includes('ingredient-manual-search-btn'), 'Manuelt ingredienssøk skal være fjernet');
  assert(!crud.includes('Søk etter annet produkt'), 'Manuelt søkefelt skal være fjernet');
  assert.ok(crud.includes('Match importerte ingredienser'));
  assert.ok(crud.includes('ingredientMatchPreferences'));
  assert.ok(crud.includes('scoreIngredientProduct'));
  assert(!crud.includes("recipeSearchResults.some(item=>item.packagePrice>0)"));
  assert(crud.includes("recipeSearchResults = expanded") || crud.includes("recipeSearchResults = products.map(product =>"));
  assert(crud.includes("recipeProductToIngredient(product)"));

  const app = fs.readFileSync(path.join(root,'src/js/app.js'),'utf8');
  const barcodeEngine = fs.readFileSync(path.join(root,'src/js/barcode-engine.js'),'utf8');
  assert(!app.includes('id="pb2CameraSelect"'), 'PB2 Mobiloverføring skal ikke lenger bruke PC-kamera');
  assert(!app.includes("PB2_RECEIVE_CAMERA_STORAGE_KEY='pb2-receive-camera-device-id'"), 'Gammel PB2-kamerainnstilling finnes fortsatt');
  assert(app.includes('startMobileTransferSend'), 'Send til mobil bruker ikke lokal overføring');
  assert(app.includes('startMobileTransferReceive'), 'Motta fra mobil bruker ikke lokal overføring');
  assert(app.includes('onMobileTransferStatus'), 'Mobiloverføring mangler statuskanal');
  assert(barcodeEngine.includes('deviceId: { exact: selectedDeviceId }'), 'Eksisterende QR-motor skal fortsatt støtte eksplisitt kamera-ID');
  const main = fs.readFileSync(path.join(root,'electron/main.js'),'utf8');
  const preload = fs.readFileSync(path.join(root,'electron/preload.js'),'utf8');
  assert.ok(app.includes('const escapeHtml = value =>'), 'Barcode Engine må ha lokal escapeHtml');
  assert.ok(html.includes('id="quickEntryName"'));
  assert.ok(html.includes('js/pantry-analysis-engine.js'));
  assert.ok(html.includes('js/recipe-price-refresh-engine.js'));
  assert.ok(app.includes('refreshMealPlanRecipePrices'));
  assert.ok(app.includes('RECIPE_PRICE_CACHE_TTL_MS'));
  assert.ok(app.includes('RECIPE_PRICE_REQUEST_INTERVAL_MS=1100'));
  assert.ok(app.includes('Lageranalyse'));
  assert.ok(app.includes('pantryAnalysisWeeks'));
  assert.ok(html.includes('id="quickEntryCategory"'));
  assert.ok(app.includes('populateQuickCategories'));
  assert.ok(app.includes("quickCategoryTypes(type)"));
  assert(crud.includes("#crud-name"), 'Kategori-navnfelt mangler eksplisitt aktivering');
  assert(!app.includes("newCategoryBtn.addEventListener"), 'Ny kategori er koblet dobbelt');
  assert(crud.includes("mealplan:(AppState.mealPlans||[]).map(x=>x.id)"), 'Matplan mangler CRUD-kobling');
  assert(app.includes('mealplan-week'), 'Matplan mangler ny ukevisning');
  assert(app.includes('mealplanPrevWeek'), 'Matplan mangler ukenavigasjon');
  assert(app.includes("CRUD.open('mealplan',null,{date:btn.dataset.date,persons:2})"), 'Velg måltid åpner ikke måltidseditor med riktig dato');
  assert(app.includes('＋ Velg måltid'), 'Matplan bruker fortsatt middagsbegrenset legg-til-tekst');
  assert(app.includes('mealplan-meal-type'), 'Måltidstype vises ikke på egne måltidskort');
  assert(app.includes("mealPlanView = 'week'"), 'Matplan mangler Uke/Måned-visningsstate');
  assert(app.includes('mealplan-month-grid'), 'Matplan mangler kompakt månedsgrid');
  assert(app.includes('mealplanPrevMonth'), 'Matplan mangler månedsnavigasjon');
  assert(app.includes('mealplan-open-week'), 'Månedsdato kan ikke åpne aktuell uke');
  assert(app.includes('copyPreviousMonthBtn'), 'Månedsvisning mangler Kopier forrige måned');
  assert(app.includes("mealPlanView==='month'"), 'Handlelistegenerering skiller ikke mellom uke og måned');
  assert(backend.includes('copyPreviousMonthTo'), 'Backend mangler kopiering av forrige måned');
  assert(componentsCss.includes('.mealplan-month-meal'), 'Månedsmåltider mangler kompakt kortstil');
  assert(app.includes('mealplanEditModeBtn'), 'Matplan mangler Rediger plan-modus');
  assert(app.includes('mealplanDeleteSelectedBtn'), 'Matplan mangler Slett valgte');
  assert(app.includes('mealplanClearScopeBtn'), 'Matplan mangler Tøm uke/måned');
  assert(app.includes('mealplan-clear-day'), 'Matplan mangler Tøm dagen');
  assert(backend.includes('deleteMealPlans'), 'Backend mangler kontrollert massesletting av måltider');
  assert(componentsCss.includes('.mealplan-month-meal.mealplan-type-breakfast'), 'Månedsfarger overstyres fortsatt av standardkortfarge');
  ['breakfast','lunch','dinner','evening','snack'].forEach(type => assert(app.includes(`mealplan-type-${type}`) || app.includes(`'${type}'`), `Matplan mangler typeklasse for ${type}`));
  ['meal-breakfast','meal-lunch','meal-dinner','meal-evening','meal-snack'].forEach(token => assert(componentsCss.includes(token), `Matplan mangler måltidsfarge: ${token}`));
  assert(componentsCss.includes('grid-template-columns:repeat(auto-fill,minmax(245px,1fr))'), 'Matplan legger ikke flere måltidskort horisontalt');
  assert(app.includes("countText(weekPlans.length,'måltid')"), 'Ukesstatus teller ikke alle måltider');
  assert(crud.includes("if (page === 'mealplan' && !record.date)"), 'Matplan overstyrer dato valgt fra dagsrad');
  assert(app.includes('AppState.allMealPlans||AppState.mealPlans'), 'Matplan støtter ikke uker over månedsskifte');
  assert(backend.includes('copyPreviousWeekTo'), 'Eksakt kopiering av forrige uke mangler');
  ['Planlagt beløp','Gjelder for','Kalenderuke','Valgt måned','Hver måned','Kvartalsvis','Årlig'].forEach(token => assert(crud.includes(token), `Budsjettmodal mangler: ${token}`));
  assert(!crud.includes("{key:'actual'"), 'Budsjettmodal skal ikke ha manuelt faktisk-felt');
  assert(!crud.includes("{key:'month',label:'Måned'"), 'Budsjettmodal bruker fortsatt måned som manuelt felt');
  const budgetSchema = crud.slice(crud.indexOf("budget: { store:'budgets'"), crud.indexOf("income: { store:'incomes'"));
  assert(!budgetSchema.includes("{key:'startDate',label:'Startdato'"), 'Budsjettmodal viser fortsatt startdato');
  assert(!budgetSchema.includes("{key:'endDate',label:'Sluttdato'"), 'Budsjettmodal viser fortsatt sluttdato');
  assert(crud.includes('budgetWeeksForMonth'), 'Dynamiske ISO-uker mangler');
  assert(crud.includes('selected_month'), 'Valgt måned-logikk mangler');
  assert(crud.includes('budgetAppliesInMonth'), 'Budsjett-konfliktkontroll mangler');
  assert(crud.includes('Det finnes allerede et budsjett'), 'Overlappende måneds-/ukebudsjett blokkeres ikke');
  const savingsSchema = crud.slice(crud.indexOf("savings: { store:'goals'"), crud.indexOf("recipes: { store:'recipes'"));
  assert(!savingsSchema.includes("label:'Nåværende beløp'"), 'Sparemål skal ikke kreve manuelt nåværende beløp');
  ['Planlagt sparing per måned','Måldato (valgfritt)','Ta med forventet overskudd i spareforslag'].forEach(token => assert(savingsSchema.includes(token), `Sparemål mangler: ${token}`));
  assert(app.includes('goalStatus(goal)'), 'Sparemål mangler dynamisk status');
  assert(app.includes('Forventet månedlig overskudd'), 'Sparemål mangler overskuddsforslag');

  assert(app.includes("'Periode'"), 'Budsjetttabellen viser ikke periode/uke');

  const incomeSchema = crud.slice(crud.indexOf("income: { store:'incomes'"), crud.indexOf("expenses: { store:'expenses'"));
  const expenseSchema = crud.slice(crud.indexOf("expenses: { store:'expenses'"), crud.indexOf("loans: { store:'loans'"));
  [incomeSchema, expenseSchema].forEach((schemaText, index) => {
    ['Gjelder for','Kalenderuke','Valgt måned','Hver måned','Kvartalsvis','Årlig'].forEach(token => assert(schemaText.includes(token), `${index === 0 ? 'Inntekt' : 'Utgift'} mangler: ${token}`));
    assert(!schemaText.includes('Startdato / første'), `${index === 0 ? 'Inntekt' : 'Utgift'} viser fortsatt startdato`);
    assert(!schemaText.includes("label:'Sluttdato'"), `${index === 0 ? 'Inntekt' : 'Utgift'} viser fortsatt sluttdato`);
  });
  assert(crud.includes('dateForMonthAndWeek'), 'Datoutledning fra valgt måned/uke mangler');

  assert(!app.includes('Mine ingredienser'), 'Mine ingredienser finnes fortsatt i UI');
  assert(!app.includes('ingredientMineHtml'), 'Gammel Mine ingredienser-renderer finnes fortsatt');
  assert(!crud.includes("ingredients: { store:'ingredients'"), 'Ingrediens-CRUD finnes fortsatt');
  assert(app.includes('add-api-pantry'), 'Kassalapp-produkt kan ikke legges i matlager');
  assert(!app.includes("backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});"), 'Hurtigmodal lukkes fortsatt ved klikk utenfor');
  assert(!crud.includes("modal.addEventListener('click', e => { if (e.target === modal) close(); });"), 'CRUD-modal lukkes fortsatt ved klikk utenfor');
  assert(!crud.includes("occurrenceModal.addEventListener('click', e => { if (e.target === occurrenceModal) closeOccurrence(); });"), 'Månedsavvik lukkes fortsatt ved klikk utenfor');
  assert(app.includes('requestQuickClose'), 'Hurtigregistrering mangler kontrollert lukking');
  assert(app.includes('savingsPeriodWindow'), 'Sparetips mangler periodefremdrift');
  assert(app.includes('ligger an til å gå over budsjett'), 'Proaktivt budsjettvarsel mangler');
  assert(app.includes('previousMonthPeriods'), 'Utgiftstrend mangler historisk sammenligning');
  assert(crud.includes('Forkast endringer?'), 'CRUD-modal mangler varsel om ulagrede endringer');
  assert(app.includes("BudgetDB.getAll('pantryItems')"), 'Kassalapp-produkt bruker ikke matlageret');

  const recipeSchema = crud.slice(crud.indexOf("recipes: { store:'recipes'"), crud.indexOf("mealplan: { store:'mealPlans'"));
  ['Ingredienser og produkter','Beregnet totalpris','Pris per porsjon'].forEach(token => assert(recipeSchema.includes(token), `Oppskrift mangler: ${token}`));
  ['ingredientCost','searchRecipeProducts','findCheaperRecipeProduct','recipeIngredientsDraft'].forEach(token => assert(crud.includes(token), `Oppskriftskostnad mangler: ${token}`));
  assert(app.includes('/ porsjon'), 'Oppskriftsoversikt mangler kostnadsinformasjon');

  assert(app.includes('PricingEngine.extractProductPrice'), 'App bruker ikke Pricing Engine for pris');
  assert(app.includes('PricingEngine.normalizeProducts'), 'App bruker ikke Pricing Engine for produktnormalisering');
  assert(app.includes('ShoppingEngine.buildGeneratedRecords'), 'Matplan bruker ikke Shopping Engine');
  assert(app.includes('MealPlanningEngine.plansForWeek'), 'Matplan bruker ikke Meal Planning Engine for ukevisning');
  assert(crud.includes('MealPlanningEngine.normalizePlan'), 'Matplan-CRUD bruker ikke Meal Planning Engine');
  assert(backend.includes('MealPlanningEngine.copyWeek'), 'Uke-kopiering bruker ikke Meal Planning Engine');
  assert(crud.includes('ShoppingEngine.expenseRecord'), 'Handlelistebokføring bruker ikke Shopping Engine');
  assert(crud.includes('updateShoppingState'), 'Handleliste mangler felles hurtigoppdatering gjennom CRUD');
  assert(app.includes('shopping-state-toggle'), 'Handleliste mangler direkte statuskontroller');
  assert(app.includes("shoppingView = 'active'"), 'Handleliste mangler Aktiv/Kjøpt-visning');
  assert(app.includes('shoppingHistoryModeSelect'), 'Handleliste mangler historikkfilter');
  assert(crud.includes('PricingEngine.ingredientCost'), 'Oppskriftseditor bruker ikke Pricing Engine');
  assert(!crud.includes("Ingen produkter med pris funnet"), 'Oppskriftsøk bruker fortsatt gammel feiltekst/filtrering');

  const css = fs.readFileSync(path.join(root,'src/css/components.css'),'utf8');
  assert(app.includes("releaseInfoBtn.disabled=!desktopUpdateState.latestVersion"), 'Release-info-knappen oppdateres ikke når updater-state kommer');
  assert(app.includes("Vis release-info for v${desktopUpdateState.latestVersion}"), 'Release-info-knappen mangler dynamisk status');

  assert(!main.includes('quitAndInstall({isSilent:true,isForceRunAfter:true})'), 'Objektform av quitAndInstall finnes fortsatt');
  assert(main.includes('autoUpdater.quitAndInstall(true,true)'), 'v26-kompatibelt silent updater-kall mangler');

  assert(pkg.build?.artifactName==='Personlig-Budsjett-Setup-${version}.${ext}', 'Fast artifactName for updater mangler');

  assert(!main.includes('quitAndInstall(false,true)'), 'Gammel ikke-silent updater-kall finnes fortsatt');
  assert(main.includes('quitAndInstall(true,true)'), 'Updater kjører ikke silent install');
  assert(main.includes('quitAndInstall(true,true)'), 'Appen startes ikke automatisk etter silent install');

  assert(html.includes('assets/app-icon.png'), 'Ny app-logo mangler i topbar');
  assert(!html.includes('<div class="brand-mark">PB</div>'), 'Gammel PB-logo finnes fortsatt');
  assert(pkg.build?.win?.icon==='build/icon.ico', 'Windows-ikon er ikke konfigurert');
  assert(main.includes("assets', 'app-icon.png'"), 'BrowserWindow bruker ikke appikonet');
  assert(fs.existsSync(path.join(root,'src/assets/app-icon.png')), 'app-icon.png mangler');
  assert(fs.existsSync(path.join(root,'src/assets/personlig-budsjett-logo.png')), 'Komplett logoasset mangler');
  assert(fs.existsSync(path.join(root,'build/icon.ico')), 'Windows ICO mangler');

  assert(backend.includes('async function createUpdateBackup()'), 'Tvungen backup før oppdatering mangler');
  assert(backend.includes('BudgetDB.exportAll()'), 'Oppdateringsbackup eksporterer ikke brukerdata');
  assert(main.includes("autoUpdater.on('download-progress'"), 'Nedlastingsfremdrift mangler');
  assert(main.includes("autoUpdater.on('update-downloaded'"), 'update-downloaded event mangler');
  assert(main.includes("ipcMain.handle('app:update:download'"), 'IPC for oppdateringsnedlasting mangler');
  assert(main.includes('await autoUpdater.downloadUpdate()'), 'downloadUpdate mangler');
  assert(main.includes("ipcMain.handle('app:update:install'"), 'IPC for installasjon mangler');
  assert(main.includes('autoUpdater.quitAndInstall(true,true)'), 'Silent quitAndInstall mangler');
  assert(preload.includes('downloadUpdate:'), 'downloadUpdate mangler i preload');
  assert(preload.includes('installUpdate:'), 'installUpdate mangler i preload');
  assert(app.includes('await Backend.createUpdateBackup()'), 'UI tar ikke backup før nedlasting');
  assert(app.indexOf('await Backend.createUpdateBackup()') < app.indexOf('await window.budgetApp.downloadUpdate()'), 'Backup skjer ikke før nedlasting');
  assert(app.includes("title.textContent='Laster ned oppdatering'"), 'Fremdriftsstatus mangler');
  assert(app.includes("title.textContent='Oppdatering klar'"), 'Klar-status mangler');
  assert(css.includes('.update-progress-track{'), 'Fremdriftsindikator mangler styling');

  assert(app.includes(".replace(/<br\\s*\\/?>/gi,'\\n')"), 'Release notes normaliserer ikke HTML linjeskift');
  assert(app.includes(".replace(/<[^>]+>/g,' ')"), 'Release notes stripper ikke HTML-tags');
  assert(app.includes("document.createElement('textarea')"), 'Release notes dekoder ikke HTML-entiteter sikkert');

  assert(pkg.dependencies && pkg.dependencies['electron-updater'], 'electron-updater dependency mangler');
  assert(pkg.build.publish?.[0]?.repo==='Personlig-Budsjett-Releases', 'GitHub release-repo er ikke konfigurert');
  assert(main.includes("const { autoUpdater } = require('electron-updater')"), 'electron-updater mangler i main');
  assert(main.includes('autoUpdater.autoDownload=false'), 'Oppdateringer lastes fortsatt ned automatisk');
  assert(main.includes("autoUpdater.on('update-available'"), 'update-available event mangler');
  assert(main.includes("autoUpdater.on('update-not-available'"), 'update-not-available event mangler');
  assert(preload.includes('onUpdateStatus'), 'Updater-status bridge mangler');
  assert(app.includes('let desktopUpdateState='), 'Renderer mangler ekte updater-state');
  assert(!app.includes('UPDATE_UI_PREVIEW'), 'UI-preview finnes fortsatt');
  assert(html.includes('id="topbarUpdateAlert"') && html.includes('hidden'), 'Topbar-varsel er ikke skjult som standard');

  assert(css.includes('.release-update-btn{'), 'Oppdater-knappen mangler egen farge');
  assert(app.includes("updateBtn.className='btn release-update-btn'"), 'Oppdater-knappen bruker ikke egen action-stil');

  assert(!app.includes('id="manualUpdateBtn"'), 'Oppdater-knappen finnes fortsatt i Om og oppdateringer-kortet');
  assert(app.includes("updateBtn.id='releaseModalUpdateBtn'"), 'Oppdater-knappen er ikke flyttet til Release-info-footer');

  assert(app.includes('function openReleaseInfoModal()'), 'Felles release-info modalhjelper mangler');
  assert(app.includes("topbarUpdateAlert.addEventListener('click',openReleaseInfoModal)"), 'Topbar-badge åpner ikke release-info');
  assert(app.includes("releaseInfoBtn.addEventListener('click',openReleaseInfoModal)"), 'Release-info-knappen bruker ikke samme modal');

  assert(!app.includes('Varsling skjer automatisk.'), 'Unødvendig varslingstekst finnes fortsatt');
  assert(!app.includes('<span class="badge success">Ny versjon</span>'), 'Ny versjon-badge finnes fortsatt i kortet');
  assert(!app.includes('publishedLabel'), 'Releasedato brukes fortsatt i kortet');
  assert(app.includes('id="releaseInfoBtn"'), 'Release-info-knapp mangler');
  assert(app.includes("actionModal(`Release v${desktopUpdateState.latestVersion}`"), 'Release-info-modal mangler');

  assert(!html.includes('id="themeToggle"'), 'Tema-knapp finnes fortsatt i topbar');
  assert(!html.includes('class="theme-label"'), 'Lys/mørk tekst finnes fortsatt i topbar');
  assert(app.includes("updateBtn.id='releaseModalUpdateBtn'"), 'Oppdater-knappen mangler i Release-info-footer');

  assert(html.includes('id="topbarUpdateAlert"'), 'Topbar-varsel for ny versjon mangler');
  assert(app.includes('id="releaseInfoBtn"'), 'Release-info-knapp mangler');
  assert(app.includes("footer.insertBefore(updateBtn,submit)"), 'Oppdater-knappen ligger ikke ved siden av Lukk');
  assert(css.includes('.topbar-update-alert{'), 'Topbar-varsel mangler styling');

  assert(app.includes("{id:'general', label:'Kategori'}"), 'Innstillingsfanen er ikke omdøpt til Kategori');
  assert(app.includes("UI.pageHeader('Kategori','Kategorier')"), 'Kategori-sideheader mangler');

  assert(css.includes('.settings-general-grid.settings-general-categories-only{'), 'Generelt mangler eget grid');
  assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'Generelt bruker ikke to-korts bredde');

  assert(css.includes('.settings-integrations-grid{'), 'Integrasjonsgrid mangler');
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'Integrasjoner bruker ikke samme tre-korts bredde');
  assert(css.includes('.settings-integrations-grid .settings-data-integration>.card{'), 'Integrasjonskort mangler lik høyde-layout');

  assert(app.includes('maintenance-display-column'), 'Visningsinnstillinger er ikke flyttet under de tre kortene');
  assert(app.includes("UI.card('Visningsinnstillinger'"), 'Visningsinnstillinger-kort mangler');
  assert(app.includes('maintenance-settings-second-row'), 'Andre kortrad mangler');
  assert(!app.includes('settings-general-display'), 'Visningsinnstillinger ligger fortsatt under Generelt');

  assert(app.includes('maintenance-update-column'), 'Om og oppdateringer er ikke flyttet til Vedlikehold');
  assert(!app.includes('settings-general-side'), 'Om og oppdateringer ligger fortsatt under Generelt');
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'Vedlikehold bruker ikke tre kort side om side');

  assert(css.includes('.maintenance-settings-grid>div>.card{'), 'Vedlikeholdskort mangler lik høyde-layout');
  assert(css.includes('height:100%'), 'Vedlikeholdskort strekkes ikke til lik høyde');
  assert(app.includes('Alle brukerdata, innstillinger og cache slettes.'), 'Vedlikeholdstekst er ikke komprimert');
  assert(app.includes('Eksporter eller importer alle appdata.'), 'Data-kortet har fortsatt unødvendig lang forklaring');

  assert(app.includes('maintenance-settings-grid'), 'Vedlikehold mangler to-korts grid');
  assert(app.includes("UI.card('Data og sikkerhetskopi'"), 'Data og sikkerhetskopi er ikke eget kort');
  assert(app.includes("UI.card('Datavedlikehold'"), 'Datavedlikehold er ikke eget kort');
  assert(app.includes('maintenance-data-column'), 'Data-kolonne mangler');
  assert(app.includes('maintenance-tools-column'), 'Vedlikeholdskolonne mangler');
  assert(css.includes('.maintenance-settings-grid{'), 'To-korts layout mangler styling');

  assert(app.includes("{id:'data', label:'Integrasjoner'}"), 'Data & integrasjoner er ikke forenklet til Integrasjoner');
  assert(app.includes("UI.pageHeader('Integrasjoner'"), 'Integrasjonssiden har feil tittel');
  assert(app.includes('id="backupSelect"'), 'Backup-dropdown mangler');
  assert(app.includes('id="restoreSelectedBackupBtn"'), 'Gjenopprett-knapp mangler');
  assert(app.includes('items.slice(0,14)'), 'Backup-dropdown begrenser ikke til siste 14');
  assert(!app.includes('id="backupList"'), 'Gammel backup-liste finnes fortsatt');
  assert(app.includes("UI.pageHeader('Vedlikehold','Backup, dataflyt og rydding')"), 'Data er ikke flyttet til Vedlikehold');
  assert(css.includes('.maintenance-backup-row{'), 'Kompakt backup-layout mangler');

  assert(app.includes('id="maintenanceModuleSelect"'), 'Vedlikehold mangler områdedropdown');
  assert(app.includes('id="clearSelectedModuleBtn"'), 'Vedlikehold mangler tøm valgt område-knapp');
  assert(!app.includes('class="btn secondary clear-module-btn"'), 'Gamle individuelle tøm-knapper finnes fortsatt');
  assert(app.includes('maintenance-section-divider'), 'Vedlikehold mangler skille mellom rydding og nullstilling');
  assert(app.includes('maintenance-danger-block'), 'Nullstill hele appen mangler tydelig faresone i Datavedlikehold-kortet');
  assert(css.includes('.maintenance-compact-card{'), 'Kompakt vedlikeholdsstyling mangler');

  assert(main.includes("ipcMain.handle('app:update:check'"), 'Oppdateringssjekk mangler i main');
  assert(main.includes("repo:'Personlig-Budsjett-Releases'"), 'Oppdateringskilde peker ikke på offentlig release-repo');
  assert(preload.includes('checkForUpdates'), 'Oppdateringssjekk mangler i preload');
  assert(app.includes("UI.card('Om og oppdateringer'"), 'Om og oppdateringer-kort mangler');
  assert(app.includes('id="installedAppVersion"'), 'Versjonsinfo mangler');
  assert(app.includes('id="checkForUpdatesBtn"'), 'Oppdateringsknapp mangler');
  assert(app.includes('id="releaseInfoBtn"'), 'Release-info mangler');

  assert(app.includes("https://github.com/rengelse/personlig-budsjett-handleliste/releases/latest/download/handleliste.apk"), 'Offisiell Handleliste-APK URL mangler');
  assert(!app.includes('id="mobileAppApkUrlInput"'), 'APK-adresse vises fortsatt som brukerinnstilling');
  assert(!app.includes('id="saveMobileAppApkUrlBtn"'), 'Lagre APK-adresse finnes fortsatt');
  assert(app.includes('<summary>Avanserte innstillinger</summary>'), 'Kassalapp avanserte innstillinger mangler');
  assert(app.includes("UI.pageHeader('Vedlikehold','Backup, dataflyt og rydding')"), 'Data og sikkerhetskopi er ikke flyttet til Vedlikehold');
  assert(app.includes("UI.pageHeader('Integrasjoner','Eksterne tjenester og tilkoblinger')"), 'Integrasjonssiden mangler');
  assert(css.includes('.settings-integrations-grid{'), 'Kompakt integrasjonsgrid mangler');

  assert(app.includes('id="priceChangeSearch"'), 'Prisfall/Prishopp mangler søk i Finn produkter');
  assert(app.includes("search?.addEventListener('input'"), 'Prisfall/Prishopp-søk er ikke live');
  assert(app.includes("item.name,item.brand,item.category,item.ean"), 'Prisfall/Prishopp-søk mangler forventede søkefelt');
  assert(app.includes("{...priceChangeState.filters,sort:"), 'Sortering nullstiller fortsatt søket');

  const priceLoadStart=app.indexOf('async function loadPriceChanges(force=false)');
  const priceLoadEnd=app.indexOf('function priceChangeCard',priceLoadStart);
  const priceLoad=app.slice(priceLoadStart,priceLoadEnd);
  assert(priceLoad.includes('knownPriceChangeProducts()'), 'Prisendringer bruker ikke lokal metadata-beriking');
  assert(!priceLoad.includes('getProductByEan'), 'Prisendringer gjør fortsatt ett API-oppslag per EAN');
  assert(app.includes("host.querySelector('.price-change-browser')"), 'Prisendringsrender bruker gammel DOM-sentinel');
  assert(!app.includes("host.querySelector('.price-change-results-only')"), 'Gammel prisendrings-sentinel finnes fortsatt');

  assert(css.includes('.product-filter-card{top:0}'), 'Finn produkter har fortsatt sticky topp-offset');
  assert(!css.includes('.product-filter-card{top:14px}'), 'Gammel 14px topp-offset finnes fortsatt');

  assert(app.includes('browser-topbar'), 'Produktbrowser mangler felles toppkontrollrad');
  assert(app.includes("return browserTop+`<div class=\"product-browser-layout"), 'Produktbrowser starter ikke med felles toppkontrollrad');
  assert(!app.includes('product-browser-head browser-results-head'), 'Gammel resultatheader finnes fortsatt over kortene');
  assert(css.includes('.browser-topbar{'), 'Produktbrowser mangler toppkontrollrad-styling');

  assert(app.includes('page-view-tabs ingredient-api-tabs'), 'Ingredienser bruker ikke felles lokale tabs');
  assert(app.includes('browser-filter-card'), 'Produktbrowser mangler felles filterkort-klasse');
  assert(app.includes('browser-topbar'), 'Produktbrowser mangler felles toppkontrollrad');
  assert(css.includes('.browser-results-head{'), 'Felles produktbrowser-header styling mangler');

  assert(app.includes('page-view-tabs saving-view-tabs'), 'Sparetips bruker ikke felles lokale tabs');
  assert(app.includes("+tabs+UI.card('Sparetips',body)"), 'Sparetips-tabs ligger fortsatt inne i kortet');
  assert(css.includes('.saving-view-tabs{'), 'Sparetips mangler lokal tab-styling');

  ['budget-toolbar','income-toolbar','expense-toolbar'].forEach(token=>assert(app.includes(token), `Tabellside mangler felles toolbar-klasse: ${token}`));
  assert(css.includes('.page-table-toolbar{'), 'Felles tabellside-toolbar styling mangler');

  assert(app.includes('page-view-tabs shopping-view-tabs'), 'Handleliste bruker ikke felles lokale tabs');
  assert(app.includes('page-view-tabs pantry-view-tabs'), 'Matlager bruker ikke felles lokale tabs');
  assert(app.includes("mainTabs+UI.card('Aktiv handleliste',table)"), 'Handleliste-tabs ligger fortsatt inne i kortet');
  assert(app.includes("mainTabs+UI.card('Kjøpshistorikk',historyToolbar+`<div class=\"shopping-history-groups\">${historyGroups}</div>`)"), 'Kjøpt-tabs ligger fortsatt inne i kortet');
  assert(app.includes("header+kpis+tabs+UI.card('Beholdning'"), 'Matlager-tabs ligger fortsatt inne i Beholdning-kortet');
  assert(app.includes("header+kpis+tabs+UI.card('Lageranalyse'"), 'Matlager-tabs ligger fortsatt inne i Lageranalyse-kortet');
  assert(css.includes('.page-view-tabs{'), 'Felles styling for lokale tabs mangler');

  assert(app.includes("let shoppingHistorySort = 'date_desc'"), 'Kjøpt mangler sorteringsstate');
  assert(app.includes('shoppingHistoryModeSelect'), 'Kjøpt mangler periode-dropdown');
  assert(app.includes('shoppingHistorySort'), 'Kjøpt mangler sorterings-dropdown');
  assert(app.includes('shopping-history-groups'), 'Kjøpt-tabs/kontroller ligger ikke i standard struktur');
  assert(!app.includes("class=\"shopping-history-mode"), 'Gamle periodeknapper finnes fortsatt');

  const shoppingPurchasedSource = app.slice(app.indexOf('function shopping() {'), app.indexOf('function pantry() {'));
  assert(!shoppingPurchasedSource.includes("{label:'Uke',key:'week'"), 'Uke-kolonnen skal være erstattet av kollapsbar ukegruppe');
  assert(shoppingPurchasedSource.includes("const weekMap=new Map()"), 'Kjøpte varer grupperes ikke per uke');

  const shoppingViewSource = app.slice(app.indexOf('function shopping() {'), app.indexOf('function pantry() {'));
  assert(!shoppingViewSource.includes("{label:'Brukes i'"), 'Aktiv handleliste skal ikke vise Brukes i-kolonnen');
  assert(shoppingViewSource.includes("{label:'Butikk',key:'store'"), 'Butikk-kolonnen skal fortsatt vises');

  assert(css.includes('gap:12px'), 'Oppskriftsfiltre skal ha tydelig 12px mellomrom');
  ['.product-browser-layout','.api-product-grid','.dashboard-primary-grid','.expense-donut','.recipe-ingredient-row'].forEach(token => assert(css.includes(token), `Ingrediens-layout mangler: ${token}`));
}



function testRecipePriceRefreshEngine() {
  global.PricingEngine = require('../src/js/pricing-engine');
  const RecipePriceRefreshEngine = require('../src/js/recipe-price-refresh-engine');
  const recipes=[
    {id:1,name:'Pasta',servings:2,price:20,pricePerServing:10,ingredients:[
      {ingredientName:'Pasta',productName:'Pasta 500 g',ean:'111',store:'KIWI',usedQuantity:250,usedUnit:'g',packageQuantity:500,packageUnit:'g',packagePrice:40}
    ]},
    {id:2,name:'Suppe',servings:2,ingredients:[{ingredientName:'Melk',ean:'222',packagePrice:20}]}
  ];
  const plans=[{recipeId:1,name:'Pasta',persons:2}];
  assert.deepEqual(RecipePriceRefreshEngine.collectEans(plans,recipes),['111']);
  const row={ean:'111',weight:500,weight_unit:'g',stores:[
    {store:'REMA1000',name:'REMA 1000',current_price:42},
    {store:'KIWI',name:'KIWI',current_price:45}
  ]};
  assert.equal(RecipePriceRefreshEngine.chooseStorePrice(row,'KIWI').price,45,'Valgt butikk skal beholdes når den finnes');
  assert.equal(RecipePriceRefreshEngine.chooseStorePrice(row,'MENY').price,42,'Billigste samme produkt brukes hvis gammel butikk mangler');
  const result=RecipePriceRefreshEngine.applyRows(recipes,plans,new Map([['111',row]]),'2026-08-10T08:00:00.000Z');
  assert.equal(result.changedRecipes.length,1);
  assert.equal(result.changedIngredients,1);
  assert.equal(result.recipes[0].ingredients[0].packagePrice,45);
  assert.equal(result.recipes[0].ingredients[0].previousPackagePrice,40);
  assert.equal(result.recipes[0].price,22.5);
  assert.equal(result.recipes[0].pricePerServing,11.25);
  assert.equal(result.recipes[1],recipes[1],'Oppskrifter som ikke brukes i matplanen skal ikke røres');
}

function testShoppingEngine() {
  global.PricingEngine = require('../src/js/pricing-engine');
  const ShoppingEngine = require('../src/js/shopping-engine');
  const recipes=[{id:1,name:'Pasta',servings:2,ingredients:[
    {name:'Pasta',productName:'Pasta 500 g',ean:'111',usedQuantity:200,usedUnit:'g',packageQuantity:500,packageUnit:'g',packagePrice:40,store:'KIWI'},
    {name:'Pasta',productName:'Pasta 500 g',ean:'111',usedQuantity:100,usedUnit:'g',packageQuantity:500,packageUnit:'g',packagePrice:40,store:'KIWI'}
  ]}];
  const plans=[{recipeId:1,name:'Pasta',persons:4}];
  const merged=ShoppingEngine.mergeMealPlanIngredients(plans,recipes);
  assert.equal(merged.length,1);
  assert.equal(merged[0].totalNeed,600);
  const records=ShoppingEngine.buildGeneratedRecords(plans,recipes,[{name:'Pasta 500 g',ean:'111',quantity:100,unit:'g'}],{purchaseDate:'2026-08-06',createdAt:'x'});
  assert.equal(records.length,1);
  assert.equal(records[0].requiredQuantity,500);
  assert.equal(records[0].packageCount,1);
  assert.equal(records[0].price,40);
  assert(ShoppingEngine.quantityDisplay(records[0]).includes('kjøp 1 pakke'));

  const spiceRecipes=[
    {id:2,name:'Gryte',servings:2,ingredients:[{name:'Oregano',productName:'Oregano 15 g',ean:'222',usedQuantity:5,usedUnit:'g',packageQuantity:15,packageUnit:'g',packagePrice:25}]},
    {id:3,name:'Pizza',servings:2,ingredients:[{name:'Tørket oregano',productName:'Oregano 15 g',ean:'222',usedQuantity:8,usedUnit:'g',packageQuantity:15,packageUnit:'g',packagePrice:25}]}
  ];
  const spicePlans=[{recipeId:2,persons:2},{recipeId:3,persons:2}];
  const spice=ShoppingEngine.buildGeneratedRecords(spicePlans,spiceRecipes,[{name:'Oregano 15 g',ean:'222',quantity:4,unit:'g'}]);
  assert.equal(spice.length,1);
  assert.equal(spice[0].totalNeed,13);
  assert.equal(spice[0].inStock,4);
  assert.equal(spice[0].requiredQuantity,9);
  assert.equal(spice[0].packageCount,1);
  assert.equal(spice[0].leftoverAfterPurchase,6);

  const pantryPackages=ShoppingEngine.buildGeneratedRecords(spicePlans,spiceRecipes,[{name:'Oregano 15 g',ean:'222',quantity:1,unit:'g',packageSize:15,packageUnit:'g',kassalProductId:99}]);
  assert.equal(pantryPackages.length,0);

  const summary=ShoppingEngine.summary([{price:25,store:'KIWI',checked:false,atHome:false,packageCount:2},{price:10,store:'KIWI',checked:true,atHome:false,packageCount:1}]);
  assert.equal(summary.estimated,35);
  assert.equal(summary.purchased,10);
  assert.equal(summary.openCount,1);
  assert.equal(summary.packageCount,3);
  const fullNeed=ShoppingEngine.shoppingNeed({name:'Melk',quantity:1,unit:'stk',ean:'7300001',kassalProductId:10},[{name:'Melk',quantity:1,unit:'stk',ean:'7300001',kassalProductId:10}]);
  assert.equal(fullNeed.state,'CONFIRM_ALREADY_STOCKED');
  assert.equal(fullNeed.remaining,0);
  const partialNeed=ShoppingEngine.shoppingNeed({name:'Ris',quantity:3,unit:'kg'},[{name:'Ris',quantity:1,unit:'kg'}]);
  assert.equal(partialNeed.state,'ADD_REMAINDER');
  assert.equal(partialNeed.remaining,2);
  const missingNeed=ShoppingEngine.shoppingNeed({name:'Egg',quantity:2,unit:'stk'},[]);
  assert.equal(missingNeed.state,'ADD_FULL');

  const expense=ShoppingEngine.expenseRecord({name:'Pasta',price:25,checked:true,atHome:false,purchaseDate:'2026-08-06'},7);
  assert.equal(expense.amount,25);
  assert.equal(expense.shoppingItemId,7);
  assert.equal(ShoppingEngine.expenseRecord({name:'Pasta',price:25,checked:false,atHome:false},7),null);
}


function testPantryAnalysisEngine() {
  global.PricingEngine = require('../src/js/pricing-engine');
  global.ShoppingEngine = require('../src/js/shopping-engine');
  const PantryAnalysisEngine = require('../src/js/pantry-analysis-engine');
  const recipes=[{id:1,name:'Risrett',servings:2,ingredients:[{ingredientName:'Ris',productName:'Ris 1 kg',ean:'111',usedQuantity:400,usedUnit:'g',packageQuantity:1,packageUnit:'kg'}]}];
  const plans=[
    {recipeId:1,name:'Risrett',persons:2,date:'2026-07-20'},
    {recipeId:1,name:'Risrett',persons:2,date:'2026-07-27'},
    {recipeId:1,name:'Risrett',persons:2,date:'2026-08-03'}
  ];
  const pantry=[{name:'Ris 1 kg',ean:'111',quantity:1,unit:'kg',packageSize:1,packageUnit:'kg',location:'Skap'}];
  const report=PantryAnalysisEngine.analyze({pantry,mealPlans:plans,recipes,weeks:4,referenceDate:new Date('2026-08-06T12:00:00')});
  assert.equal(report.rows.length,1);
  assert.equal(report.rows[0].weeklyUsage,300);
  assert.equal(report.rows[0].current,1000);
  assert.equal(report.rows[0].recommended,1000);
  assert.equal(report.rows[0].status,'God beholdning');
}

function testMealPlanningEngine() {
  global.PricingEngine = require('../src/js/pricing-engine');
  const MealPlanningEngine = require('../src/js/meal-planning-engine');
  const recipes=[{id:1,name:'Pasta',servings:2,ingredients:[{packagePrice:40,packageQuantity:500,packageUnit:'g',usedQuantity:250,usedUnit:'g'}]}];
  const plan=MealPlanningEngine.normalizePlan({name:'Pasta',date:'2026-08-03',mealType:'Middag',persons:4,leftovers:true,freezerPortions:2},recipes);
  assert.equal(plan.recipeId,1);
  assert.equal(plan.estimatedCost,40);
  assert.equal(plan.source,'recipe');
  const summary=MealPlanningEngine.summary([plan],recipes,{monthlyBudget:4345});
  assert(Math.abs(summary.weeklyBudget-1000)<1e-9);
  assert.equal(summary.totalCost,40);
  assert.equal(summary.freezerPortions,2);
  const copied=MealPlanningEngine.copyWeek([{...plan,id:7}], '2026-08-03');
  assert.equal(copied.copies.length,1);
  assert.equal(copied.copies[0].date,'2026-08-10');
  assert.equal(copied.copies[0].copiedFrom,7);
  const duplicate=MealPlanningEngine.copyWeek([{...plan,id:7},{...plan,id:8,date:'2026-08-10'}], '2026-08-03');
  assert.equal(duplicate.copies.length,0);
}

try {
  testKassalQuery();
  testFinanceEngine();
  testPricingEngine();
  testShoppingEngine();
  testRecipePriceRefreshEngine();
  testMealPlanningEngine();
  testPantryAnalysisEngine();
  testEanResponseNormalization();
  const barcodeJs=fs.readFileSync(path.join(__dirname,'../src/js/barcode-engine.js'),'utf8');
  const appJsBarcode=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert.match(barcodeJs,/toStandardProduct/);
  assert.match(appJsBarcode,/keepOpen:true/);
  assert.match(appJsBarcode,/Kamera tilkoblet/);
  assert.match(appJsBarcode,/startRemoteDecode/);
  assert.match(appJsBarcode,/priceHistory/);
  assert.match(appJsBarcode,/completeShopping/);
  testStaticCleanup();
  
{
  const appJs = fs.readFileSync(path.join(__dirname, '../src/js/app.js'), 'utf8');
  assert(appJs.includes('quickCategoryOptions'), 'Hurtigregistrering mangler søkbar kategori');
  assert(appJs.includes('Velg en gyldig kategori'), 'Hurtigregistrering validerer ikke kategori mot faktisk liste');
}

{
  const crudJs = fs.readFileSync(path.join(__dirname, '../src/js/crud.js'), 'utf8');
  assert(crudJs.includes("classList.toggle('income-expense-modal'"), 'Inntekt/utgift mangler felles modal-layout');
  const expenseStart = crudJs.indexOf("expenses: { store:'expenses'");
  const expenseEnd = crudJs.indexOf("loans: { store:'loans'", expenseStart);
  const expenseSchema = crudJs.slice(expenseStart, expenseEnd);
  assert(expenseSchema.indexOf("key:'status'") < expenseSchema.indexOf("key:'type'"), 'Utgiftens grunnfelt er ikke justert mot inntektsmodalen');
}

{
  const crudJs = fs.readFileSync(path.join(__dirname, '../src/js/crud.js'), 'utf8');
  const financeJs = fs.readFileSync(path.join(__dirname, '../src/js/finance-engine.js'), 'utf8');
  const incomeStart = crudJs.indexOf("income: { store:'incomes'");
  const expenseStart = crudJs.indexOf("expenses: { store:'expenses'");
  const loanStart = crudJs.indexOf("loans: { store:'loans'", expenseStart);
  const incomeSchema = crudJs.slice(incomeStart, expenseStart);
  const expenseSchema = crudJs.slice(expenseStart, loanStart);
  assert(!incomeSchema.includes("key:'taxable'"), 'Skattepliktig finnes fortsatt i inntektsmodalen');
  assert(!incomeSchema.includes("key:'active'"), 'Aktiv finnes fortsatt i inntektsmodalen');
  assert(!expenseSchema.includes("key:'automatic'"), 'Automatisk trekk finnes fortsatt i utgiftsmodalen');
  assert(!expenseSchema.includes("key:'active'"), 'Aktiv finnes fortsatt i utgiftsmodalen');
  assert(!financeJs.includes("if (!record.automatic) return 'Ubetalt'"), 'Finance Engine bruker fortsatt automatisk trekk for status');
  assert(financeJs.includes("return (records || []).flatMap"), 'Inntekt/utgift filtreres fortsatt på active');
}

{
  const crudJs = fs.readFileSync(path.join(__dirname, '../src/js/crud.js'), 'utf8');
  const financeJs = fs.readFileSync(path.join(__dirname, '../src/js/finance-engine.js'), 'utf8');
  const budgetStart = crudJs.indexOf("budget: { store:'budgets'");
  const incomeStart = crudJs.indexOf("income: { store:'incomes'", budgetStart);
  const loanStart = crudJs.indexOf("loans: { store:'loans'");
  const savingsStart = crudJs.indexOf("savings: { store:'goals'", loanStart);
  const budgetSchema = crudJs.slice(budgetStart, incomeStart);
  const loanSchema = crudJs.slice(loanStart, savingsStart);
  assert(!budgetSchema.includes("key:'active'"), 'Aktiv finnes fortsatt i budsjettmodalen');
  assert(!loanSchema.includes("includePayment"), 'Ta med terminbeløp i utgifter finnes fortsatt i lån');
  assert(!loanSchema.includes("automaticPayment"), 'Automatisk trekk finnes fortsatt i lån');
  assert(financeJs.includes("function loanScheduleForPeriod"), 'Låneplanfunksjon mangler');
  assert(financeJs.includes("return [];"), 'Lån oppretter fortsatt syntetiske utgifter');
  assert(financeJs.includes("filter(loan => n(loan.payment) > 0"), 'Låneprognose bruker ikke terminbeløpet direkte');
}

{
  const crudJs = fs.readFileSync(path.join(__dirname, '../src/js/crud.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../src/js/app.js'), 'utf8');
  const savingsStart = crudJs.indexOf("savings: { store:'goals'");
  const recipesStart = crudJs.indexOf("recipes: { store:'recipes'", savingsStart);
  const savingsSchema = crudJs.slice(savingsStart, recipesStart);
  assert(!savingsSchema.includes("key:'active'"), 'Aktiv finnes fortsatt i Nytt sparemål');
  assert(!appJs.includes("filter(goal=>goal.active!==false)"), 'Sparemål filtreres fortsatt på active');
  assert(!appJs.includes("filter(g=>g.active!==false)"), 'Dashboard filtrerer fortsatt sparemål på active');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const crudJs=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const backendJs=fs.readFileSync(path.join(__dirname,'../src/js/backend.js'),'utf8');
  assert(appJs.includes("const active=(AppState.categories||[]).filter(x=>x.active!==false)"));
  assert(!appJs.includes("['Navn','Type','Rolle','Farge','Status']"));
  assert(appJs.includes('addStandardCategoryBtn'));
  assert(crudJs.includes('openStandardCategoryModal'));
  assert(backendJs.includes('STANDARD_CATEGORIES'));
  assert(!backendJs.includes('ensureSystemCategories'));
}

{
  const crudJs=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  assert(crudJs.includes('function recipeFieldsHtml'), 'Oppskriftsmodal mangler seksjonert renderer');
  ['Grunninformasjon','Ingredienser og kostnad','Fremgangsmåte'].forEach(token=>assert(crudJs.includes(token),`Oppskriftsmodal mangler seksjon: ${token}`));
  assert(crudJs.includes("classList.toggle('recipe-modal',page==='recipes')"), 'Oppskriftsmodal mangler lokal layoutklasse');
}

{
  const crudJs=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  assert(crudJs.includes('recipe-modal-top-grid'), 'Oppskriftsmodal mangler toppgrid');
}

{
  const crudJs=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const recipeStart=crudJs.indexOf('function recipeFieldsHtml');
  const recipeEnd=crudJs.indexOf('async function open(',recipeStart);
  const recipeLayout=crudJs.slice(recipeStart,recipeEnd);
  assert(!recipeLayout.includes('<h3>Detaljer</h3>'), 'Detaljer-seksjonen finnes fortsatt');
  assert(recipeLayout.includes("label:''"), 'Fremgangsmåte har fortsatt duplisert feltetikett');
}

{
  const crudJs=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const recipeStart=crudJs.indexOf('function recipeFieldsHtml');
  const recipeEnd=crudJs.indexOf('async function open(',recipeStart);
  const recipeLayout=crudJs.slice(recipeStart,recipeEnd);
  assert(!recipeLayout.includes("render('tagsText')"), 'Tags vises fortsatt i oppskriftsmodalen');
  assert(!recipeLayout.includes("render('allergensText')"), 'Allergener vises fortsatt i oppskriftsmodalen');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(!appJs.includes('<span class="eyebrow">Barcode Engine</span>'), 'Barcode Engine-etiketten finnes fortsatt');
  assert(!appJs.includes('Godkjenn kamera på mobilen. Bildet vises her automatisk.'), 'Overflødig QR-hjelpetekst finnes fortsatt');
  assert(!appJs.includes('Plasser strekkoden innenfor rammen</small>'), 'Overflødig tekst i skannerammen finnes fortsatt');
  assert(appJs.includes('<strong>Skann QR-koden</strong>'), 'Kort QR-instruksjon mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes('barcode-product-lines'), 'Produktresultat mangler kompakte produktlinjer');
  assert(css.includes('#barcodeModalBackdrop .companion-qr-shell'), 'QR-størrelse er ikke lokalt justert');
  assert(css.includes('#barcodeModalBackdrop #barcodeSaveForm'), 'Skjemaet i skannemodalen mangler lokal grid-fiks');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  ['Merke:','Pakning:','Butikk:','Pris:'].forEach(x=>assert(appJs.includes(x),`Produktlinje mangler: ${x}`));
  assert(appJs.includes('barcode-store-field'), 'Butikk og pris mangler i produktresultatet');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes('barcode-store-field'), 'Butikk og pris mangler');
  assert(!appJs.includes('<div class="barcode-product-row"><div id="barcodeProductSummary">'), 'Butikk/pris ligger fortsatt presset inn på samme rad');
  assert(css.includes('v0.5.08 Scanner product hierarchy'), 'Scanner hierarchy CSS mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes('barcode-product-name'), 'Produktnavn ligger ikke som egen topplinje');
  assert(appJs.includes('barcode-product-body'), 'Produktbilde/beskrivelse mangler samlet body');
  assert(appJs.includes('barcode-save-grid'), 'Butikk/pris, Mengde og Enhet mangler felles rad');
  assert(css.includes('minmax(0,1.6fr) minmax(90px,.65fr) minmax(90px,.65fr)'), 'Tre-kolonne raden er ikke definert');
}

{
 const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
 assert(appJs.includes('name="quantity" type="number" min="1" step="1"'), 'Mengde tillater fortsatt desimaler');
 assert(css.includes('minmax(0,1.35fr) minmax(72px,.55fr) minmax(82px,.65fr)'), 'Tre felter mangler kompakt grid');
}

{
 const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
 assert(css.includes('grid-template-columns:minmax(0,1.15fr) 76px 92px'), 'Scannerfeltene er ikke låst til tre smale kolonner');
 assert(css.includes('grid-column:3 !important'), 'Enhet er ikke eksplisitt låst til tredje kolonne');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const kassalQuery=fs.readFileSync(path.join(__dirname,'../electron/kassal-query.js'),'utf8');
  assert(!appJs.includes('Maks 12 filterkombinasjoner'), '12-kombinasjonsgrensen finnes fortsatt');
  assert(appJs.includes('products-browser-v6'), 'Ny enkel produktsøk-cache mangler');
  assert(appJs.includes('unique:true') && appJs.includes('exclude_without_ean:true'), 'Produktidentifikasjon bruker ikke unique/EAN-filter');
  assert(appJs.includes('applyKassalBrowserFilters'), 'Lokale butikk/allergenfiltre mangler');
  assert(kassalQuery.includes("'store'"), 'Dokumentert store-filter mangler på /products');
  assert(kassalQuery.includes("'incl_allergens'"), 'Dokumentert incl_allergens-filter mangler');
  assert(kassalQuery.includes("'excl_allergens'"), 'Dokumentert excl_allergens-filter mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes("kassal-categories-all-v3"), 'API-taxonomi brukes ikke som kategori-kilde');
  assert(appJs.includes("categoryHolder.innerHTML=rows.map"), 'API-kategorier rendres ikke i filteret');
  assert(appJs.includes("bufferedKassalBrowserPage"), 'Filtrert resultatbuffer mangler');
  assert(appJs.includes("kassalBrowser.buffers.clear()"), 'Buffer nullstilles ikke ved nytt søk');
  assert(appJs.includes("state.exhausted"), 'Buffer kjenner ikke slutt på API-resultatet');
}

{
  const PricingEngine=require('../src/js/pricing-engine.js');
  assert.equal(PricingEngine.extractProductPrice({current_price:{price:72.9,unit_price:151.88}}),72.9,'EAN current_price objekt normaliseres ikke');
  assert.equal(PricingEngine.extractProductPrice({current_price:[{price:69.9,unit_price:156.04}]}),69.9,'EAN current_price array normaliseres ikke');
  assert.equal(PricingEngine.extractUnitPrice({current_price:{price:72.9,unit_price:151.88}}),151.88,'EAN unit_price objekt normaliseres ikke');
  assert.equal(PricingEngine.extractUnitPrice({current_price:[{price:69.9,unit_price:156.04}]}),156.04,'EAN unit_price array normaliseres ikke');
}
{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const queryJs=fs.readFileSync(path.join(__dirname,'../electron/kassal-query.js'),'utf8');
  assert(queryJs.includes("'has_labels', 'excl_allergens', 'incl_allergens'"),'Dokumenterte arrayfiltre mangler');
  assert(appJs.includes("const singleStore=selectedStores.length===1"),'Enkelt butikkfilter sendes ikke direkte til /products');
  assert(appJs.includes("if(stores.length>1&&filtered.length)"),'prices-bulk brukes ikke bare ved flere butikker');
  assert(appJs.includes("item.display_name||item.code"),'Næringsinnhold rendres ikke som API-array');
}

{
  const { buildProductQuery } = require('../electron/kassal-query');
  const q = buildProductQuery({
    search:'melk',
    category_id:'12',
    price_min:'10',
    price_max:'50',
    has_labels:['frysevare','euroleaf'],
    excl_allergens:['melk','gluten'],
    incl_allergens:['egg'],
    unique:true,
    exclude_without_ean:true,
    size:999
  });
  assert.deepEqual(q.getAll('has_labels[]'), ['frysevare','euroleaf'], 'has_labels serialiseres feil');
  assert.deepEqual(q.getAll('excl_allergens[]'), ['melk','gluten'], 'excl_allergens serialiseres feil');
  assert.deepEqual(q.getAll('incl_allergens[]'), ['egg'], 'incl_allergens serialiseres feil');
  assert.equal(q.get('excl_allergens'), null, 'Allergen-array skal bruke Laravel bracket-syntaks');
  assert.equal(q.get('unique'), '1', 'unique skal serialiseres som Laravel boolean');
  assert.equal(q.get('exclude_without_ean'), '1', 'exclude_without_ean skal serialiseres som Laravel boolean');
  assert.equal(q.get('category_id'), '12');
  assert.equal(q.get('price_min'), '10');
  assert.equal(q.get('price_max'), '50');
  assert.equal(q.get('size'), '100', 'size skal clamped til API-maks');
}
{
  const { buildProductQuery } = require('../electron/kassal-query');
  const q = buildProductQuery({category_id:'abc',price_min:'abc',price_max:-1,size:'abc'});
  assert.equal(q.get('category_id'), null, 'Ugyldig category_id skal ikke sendes');
  assert.equal(q.get('price_min'), null, 'Ugyldig price_min skal ikke sendes');
  assert.equal(q.get('price_max'), null, 'Negativ price_max skal ikke sendes');
  assert.equal(q.get('size'), '24', 'Ugyldig size skal falle tilbake til 24');
}

{
  const { buildProductQuery } = require('../electron/kassal-query');
  const q = buildProductQuery({
    excl_allergens:['melk','gluten'],
    incl_allergens:['egg'],
    unique:true,
    exclude_without_ean:false
  });
  assert.deepEqual(q.getAll('excl_allergens[]'), ['melk','gluten']);
  assert.deepEqual(q.getAll('incl_allergens[]'), ['egg']);
  assert.equal(q.get('unique'),'1');
  assert.equal(q.get('exclude_without_ean'),'0');
}

{
  const PriceChangeEngine=require('../src/js/price-change-engine.js');
  const bulk={data:[{
    ean:'123',name:'Testvare',stores:[{store:'KIWI',name:'KIWI',current_price:80},{store:'REMA_1000',name:'REMA',current_price:120}],
    price_history:[
      {date:'2026-08-01',store:'KIWI',price:100},{date:'2026-08-07',store:'KIWI',price:80},
      {date:'2026-08-01',store:'REMA_1000',price:100},{date:'2026-08-07',store:'REMA_1000',price:120}
    ]
  }]};
  const products=[{ean:'123',eName:'Testvare',brand:'Test',category:'Mat'}];
  const down=PriceChangeEngine.changesFromBulk(bulk,products,{direction:'down',storeLabels:[['KIWI','KIWI']]});
  const up=PriceChangeEngine.changesFromBulk(bulk,products,{direction:'up',storeLabels:[['REMA_1000','REMA 1000']]});
  assert.equal(down.length,1); assert.equal(down[0].diff,-20); assert.equal(down[0].percent,-20);
  assert.equal(up.length,1); assert.equal(up[0].diff,20); assert.equal(up[0].percent,20);
}
{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const indexHtml=fs.readFileSync(path.join(__dirname,'../src/index.html'),'utf8');
  assert(indexHtml.includes('js/price-change-engine.js'),'Price Change Engine lastes ikke');
  assert(appJs.includes("Produkter</button>")&&appJs.includes("Prisfall</button>")&&appJs.includes("Prishopp</button>"),'Prisendring-tabs mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const mainJs=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  assert(mainJs.includes("kassal:weekly-price-changes"));
  assert(mainJs.includes("/varer/${pathName}?sortering=diff_asc"));
  assert(appJs.includes("Størst ${label}")&&appJs.includes("Minst ${label}"));
  assert(appJs.includes("Laveste pris")&&appJs.includes("Høyeste pris"));
  assert(!appJs.includes("priceChangePeriod"),'Periodefilter skal være fjernet');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes('ingredient-sort-field'),'Sorter er ikke plassert som på Produkter');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes('product-browser-layout price-change-browser'),'Prisfall/Prishopp mangler produktbrowser-layout');
  assert(appJs.includes('ingredient-sort-field'),'Sorter er ikke plassert som på Produkter');
  assert(!appJs.includes('priceChangeCategory'),'Kategorifilter finnes fortsatt');
  assert(!appJs.includes('priceChangeMin'),'Prisendringsfilter finnes fortsatt');
  assert(!appJs.includes('priceChangeMaxPrice'),'Prisfilter finnes fortsatt');
  assert(appJs.includes("Størst ${label}")&&appJs.includes("Minst ${label}")&&appJs.includes('Laveste pris')&&appJs.includes('Høyeste pris'),'De fire sorteringsvalgene mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes('product-browser-layout price-change-browser'),'Prisfall/Prishopp bruker ikke samme hovedlayout som Produkter');
  assert(appJs.includes('<div class="card-header"><h3>Finn produkter</h3></div>'),'Finn produkter-sidebar mangler');
  assert(appJs.includes('browser-topbar') && appJs.includes('priceChangeSort'),'Sortering mangler i produktbrowserens toppkontrollrad');
  assert(!appJs.includes('priceChangeCategory'),'Kategori finnes fortsatt i Prisfall/Prishopp');
  assert(!appJs.includes('priceChangeMin'),'Prisendringsfilter finnes fortsatt i Prisfall/Prishopp');
  assert(!appJs.includes('priceChangeMaxPrice'),'Prisfilter finnes fortsatt i Prisfall/Prishopp');
  const panelStart=appJs.indexOf('function priceChangePanelHtml');
  const panelEnd=appJs.indexOf('function renderPriceChangeContent',panelStart);
  const panel=appJs.slice(panelStart,panelEnd);
  assert(panel.includes('browser-topbar') && panel.includes('ingredient-sort-field'),'Sortering skal ligge i felles toppkontrollrad');
}

{
  const {parseKassalWeeklyHtml}=require('../electron/kassal-weekly-parser');
  const fixture=`
    <article>
      <a href="/vare/52586-hele-bonner-friele-500-g-frokostkaffe-morkbrent-8711000853702">kr 61,60</a>
      <div>Hele bønner Friele 500 g, frokostkaffe mørkbrent</div>
      <div>før 139.00 kr 77,40</div>
    </article>
    <article>
      <a href="https://kassal.app/vare/123-red-bull-energidrikk-1234567890123">kr 39,90</a>
      <div>Red Bull Energidrikk Sukkerfri 250mlx4 boks</div>
      <div>før 89.90 kr 50,00</div>
    </article>`;
  const rows=parseKassalWeeklyHtml(fixture);
  assert.equal(rows.length,2,'Kassalapp ukeliste-parser finner ikke produktkortene');
  assert.equal(rows[0].ean,'8711000853702');
  assert.equal(rows[0].oldPrice,139);
  assert.equal(rows[0].currentPrice,77.4);
  assert.equal(rows[0].diff,-61.6);
  assert.equal(rows[0].name,'Hele bønner Friele 500 g, frokostkaffe mørkbrent');
  assert.equal(rows[1].ean,'1234567890123');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const start=appJs.indexOf('function priceChangeCard');
  const end=appJs.indexOf('function priceChangePanelHtml',start);
  const card=appJs.slice(start,end);
  assert(card.includes('card api-product-card price-change-product-card'),'Prisendringskort bruker ikke vanlig produktkortstruktur');
  assert(card.includes('api-product-body'),'Prisendringskort mangler vanlig produkt-body');
  assert(card.includes('product-title-button'),'Prisendringskort mangler vanlig produktnavnstruktur');
  assert(card.includes('product-price-row'),'Prisendringskort mangler vanlig prisrad');
  assert(card.includes('product-actions'),'Prisendringskort mangler vanlig action-rad');
}





{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const tabStart=appJs.indexOf("document.querySelectorAll('.ingredient-api-tab')");
  const tabEnd=appJs.indexOf('wireSearch();',tabStart);
  const tabWire=appJs.slice(tabStart,tabEnd);
  assert(tabWire.includes("if(priceChangeState.loaded)renderPriceChangeContent()"),'Prisfall/Prishopp rendres ikke umiddelbart ved fanebytte');
  assert(tabWire.includes("else loadPriceChanges(false)"),'Prisdata lastes ikke ved første fanebytte');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes("function productImagePlaceholder"),'Felles bilde-placeholder mangler');
  assert(appJs.includes("product-image-empty-icon"),'Kameraikon-placeholder mangler');
  assert(appJs.includes("product-image-empty-slash"),'Kryss/skrÅstrek-placeholder mangler');
  assert(appJs.includes("product-detail-placeholder"),'Produktdetaljer bruker ikke felles placeholder');
  assert(css.includes("v0.5.27 Unified missing-product-image placeholder"),'Placeholder CSS mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes('function ingredientProductHasImage'),'Ingredienser mangler isolert bildevalidering');
  assert(appJs.includes('ingredientProductHasImage(p.image)?'),'Ingredienskort bruker ikke bildevalideringen');
  assert(appJs.includes("'placeholder'")&&appJs.includes("'no-image'"),'Placeholder/no-image URL gjenkjennes ikke');
  const pcStart=appJs.indexOf('function priceChangeCard');
  const pcEnd=appJs.indexOf('function priceChangePanelHtml',pcStart);
  const pc=appJs.slice(pcStart,pcEnd);
  assert(!pc.includes('ingredientProductHasImage'),'Prisfall/Prishopp skal ikke bruke Ingredienser-fiksen');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes('function wireProductImageFallbacks'),'JS bilde-fallback mangler');
  assert(appJs.includes("addEventListener('error',replace"),'Ingrediensbilde bruker ikke error-listener');
  assert(appJs.includes('img.complete && img.naturalWidth===0'),'Allerede feilede bilder håndteres ikke');
  assert(appJs.includes('wireProductImageFallbacks(holder);'),'Fallback wires ikke etter produkt-rendering');
  const productCardStart=appJs.indexOf('function productCardHtml');
  const productCardEnd=appJs.indexOf('async function cachedApi',productCardStart);
  const productCard=appJs.slice(productCardStart,productCardEnd);
  assert(!productCard.includes('onerror='),'Ingredienskort bruker fortsatt inline onerror');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const pcStart=appJs.indexOf('function priceChangeCard');
  const pcEnd=appJs.indexOf('function priceChangePanelHtml',pcStart);
  const pc=appJs.slice(pcStart,pcEnd);
  assert(pc.includes('class="product-image-with-fallback"'),'Prisfall/Prishopp bruker ikke samme bilde-fallbackklasse som Ingredienser');
  const wireStart=appJs.indexOf('function wirePriceChangeActions');
  const wireEnd=appJs.indexOf('function ingredients()',wireStart);
  const wire=appJs.slice(wireStart,wireEnd);
  assert(wire.includes("wireProductImageFallbacks(host);"),'Prisfall/Prishopp kobler ikke på samme bilde-fallback som Ingredienser');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes("classList.add('product-detail-modal')"),'Produktdetaljer får ikke egen modal-klasse');
  assert(css.includes('.product-detail-modal .modal-body'),'Produktdetaljer mangler scoped kompakt modal-CSS');
  assert(css.includes('overflow-y:auto'),'Produktdetaljer mangler intern scrolling');
  assert(css.includes('grid-template-columns:128px minmax(0,1fr)'),'Produktbildet er ikke komprimert');
  assert(css.includes('max-height:calc(100vh - 28px)'),'Produktmodalen er ikke begrenset til skjermhøyden');
}

{
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(css.includes('v0.5.33 More compact product details typography'),'Kompakt typografi mangler');
  assert(css.includes('grid-template-columns:112px minmax(0,1fr)'),'Produktbildet er ikke ytterligere redusert');
  assert(css.includes('font-size:.78rem'),'Detaljrader er ikke komprimert');
  assert(css.includes('padding:5px 7px'),'Detaljrader har fortsatt for mye padding');
}

{
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  assert(crud.includes('function ingredientSpecificSearchQuery'),'Spesifikt ingredienssøk mangler');
  assert(crud.includes('function ingredientSearchVariants'),'Søkevarianter mangler');
  assert(crud.includes("variant.kind==='specific'?16:24"),'Spesifikt og bredt søk har feil resultatsstørrelse');
  assert(crud.includes("for(const variant of variants)"),'Spesifikt og bredt søk kjøres ikke begge');
  assert(crud.includes("Math.min(2,candidates.length)"),'Parallelliteten er ikke redusert');
  assert(crud.includes("specificPhrase*0.12"),'Spesifikk frase vektlegges ikke');
  assert(crud.includes("modifierCoverage*0.06"),'Beskrivende ord som revet/hakket vektlegges ikke');
  assert(crud.includes("::${Number(size)||24}"),'Cache-nøkkelen inkluderer ikke resultatsstørrelse');
  assert(crud.includes('function ingredientProductConflict'),'Konfliktdeteksjon mangler');
  assert(crud.includes("'chips','potetgull','snack','snacks','smak'"),'Feiltreff som chips/smak filtreres ikke');
  assert(crud.includes('conflicts*0.24'),'Konflikter gir ikke poengstraff');
  assert(crud.includes('const safeThreshold=queryTokenCount<=1?0.90:0.86'),'Sikker match er ikke streng nok');
  assert(crud.includes('const safeMargin=queryTokenCount<=1?0.14:0.10'),'Sikker match krever ikke margin');
  assert(crud.includes('!hasConflict'),'Konflikt kan fortsatt bli sikker match');
  assert(crud.includes('matchCandidates:choices'),'Sikker match beholder ikke alternativer');
  assert(crud.includes("item.matchStatus==='matched'?'Bytt produkt …':'Velg produktforslag …'"),'Sikker match kan ikke overstyres');
}

{
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const start=crud.indexOf('async function applyIngredientProduct');
  const end=crud.indexOf('async function searchProductsCached',start);
  const apply=crud.slice(start,end);
  const renderPos=apply.indexOf('renderRecipeIngredientRows();');
  const costPos=apply.indexOf('updateRecipeCostSummary();');
  const rememberPos=apply.indexOf('await rememberIngredientMatch');
  assert(renderPos>=0&&costPos>renderPos,'Produktvalg oppdaterer ikke kostnad umiddelbart');
  assert(rememberPos>costPos,'Database-læring blokkerer fortsatt kostnadsoppdateringen');
  assert(apply.includes("console.warn('Kunne ikke lagre ingrediensmatch-preferanse:'"),'Feil i preferanselagring er ikke isolert');
}

{
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const renderStart=crud.indexOf('function renderRecipeIngredientRows');
  const renderEnd=crud.indexOf('function renderRecipeSearchResults',renderStart);
  const render=crud.slice(renderStart,renderEnd);

  assert(render.includes('data-ingredient-index="${index}"'),'Dropdown mangler radindeks');
  assert(render.includes('const index=Number(select.dataset.ingredientIndex);'),'Dropdown leser ikke radindeks');
  assert(!render.includes("querySelectorAll('.ingredient-match-choice').forEach((select,index)"),'Dropdown bruker fortsatt DOM-rekkefølge');

  const applyStart=crud.indexOf('async function applyIngredientProduct');
  const applyEnd=crud.indexOf('async function searchProductsCached',applyStart);
  const apply=crud.slice(applyStart,applyEnd);
  assert(apply.includes('matchCandidates:candidates'),'Valgt produkt sletter kandidatlisten');
  assert(apply.includes('manualMatch:true'),'Manuelt valg markeres ikke');
  assert(apply.indexOf('renderRecipeIngredientRows();') < apply.indexOf('await rememberIngredientMatch'),'UI/kostnad venter på preferanselagring');

  assert(crud.includes('async function loadIngredientChoices(index)'),'Valg for rader uten kandidater mangler');
  assert(render.includes('ingredient-load-choices'),'Rad uten kandidater mangler Velg / endre produkt');
  assert(crud.includes("item.matchStatus!=='matched'"),'Må velges-rader med produkt blir hoppet over');
  assert(crud.includes('missingChoices'),'Match uten kandidater blir hoppet over');
  assert(crud.includes('selectedMatchKey:productCandidateKey(best.product)') || crud.includes('selectedMatchKey:String(best.product.ean||best.product.id'),'Auto-match lagrer ikke valgt kandidat');
}

{
  const fs=require('fs');
  const path=require('path');
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');

  assert(crud.includes("const stopTokens=new Set"),'Unicode-sikker tokenrens mangler');
  assert(!crud.includes("\\\\b(ts|teskje|teskjeer|ss|spiseskje"),'Gammel ordgrense-basert enhetsrens finnes fortsatt');
  assert(crud.includes("searchProductsCached(query,72)"),'Manuelt produktvalg gjør ikke bredt søk');
  assert(crud.includes("expandedRanked.slice(0,24)") || crud.includes("ranked.slice(0,24)"),'Manuelt produktvalg viser for få kandidater');
  assert(crud.includes("'Pris ikke tilgjengelig'"),'Produkt uten pris merkes ikke korrekt');
  assert(crud.includes("missingPrice?`${totalLabel} + mangler pris`"),'Ufullstendig oppskriftspris markeres ikke');

  // Run the exact query cleaner in isolation from the source logic.
  function source(value){
    return String(value||'')
      .toLocaleLowerCase('nb-NO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\([^)]*\)/g,' ')
      .replace(/kyllingkjøttdeig eller svinekjøttdeig/g,'kjøttdeig')
      .replace(/etter smak|til steking|til servering|valgfritt|romtemperert|renset|vasket|avrent/g,' ')
      .replace(/[^a-zæøå0-9., ]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function specific(value){
    const stopTokens=new Set([
      'ca','cirka','omtrent','en','ei','et','halv','halvt','kvart','neve','klype','dash',
      'ts','teskje','teskjeer','ss','spiseskje','spiseskjeer','krm',
      'dl','cl','ml','l','liter','gram','g','kg','mg',
      'stk','stykk','stykke','pk','pakke','pakker','boks','bokser','beger','pose','poser','porsjon','porsjoner'
    ]);
    return source(value).split(/\s+/)
      .map(token=>token.replace(/^[.,]+|[.,]+$/g,''))
      .filter(Boolean)
      .filter(token=>!/^\d+(?:[.,]\d+)?$/.test(token))
      .filter(token=>!stopTokens.has(token))
      .join(' ').trim();
  }
  assert.equal(specific('løk'),'løk');
  assert.equal(specific('1 løk'),'løk');
  assert.equal(specific('1 l melk'),'melk');
  assert.equal(specific('2 ss revet cheddar'),'revet cheddar');
  assert.equal(specific('400 g kjøttdeig'),'kjøttdeig');
}

{
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(crud.includes('function ingredientManualSearchHtml'),'Manuelt ingredienssøk mangler renderer');
  assert(crud.includes('async function runIngredientManualSearch'),'Manuelt ingredienssøk mangler søkeflyt');
  assert(crud.includes('ingredient-manual-search-open'),'Søk produkt-knapp mangler');
  assert(crud.includes('searchProductsCached(query,72)'),'Manuelt søk bruker ikke bredt produktsøk');
  assert(crud.includes('manualSearchResults:expanded.slice(0,24)') || crud.includes('manualSearchResults:(products||[]).slice(0,24)'),'Manuelt søk beholder ikke bred kandidatpool');
  assert(crud.includes('ingredient-manual-result'),'Manuelle søkeresultater er ikke valgbare');
  assert(css.includes('max-height:228px'),'Manuell resultatliste mangler kompakt intern scroll');
  assert(css.includes('grid-column:1/-1'),'Manuelt søk bruker ikke radbredden uten å endre hovedgrid');
}

{
  const main=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const preload=fs.readFileSync(path.join(__dirname,'../electron/preload.js'),'utf8');
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(main.includes("'pb1:encode-shopping-list'"),'PB1 shopping-list encoder IPC mangler');
  assert(main.includes("zlib.gzipSync"),'PB1 bruker ikke gzip');
  assert(main.includes("toString('base64url')"),'PB1 bruker ikke base64url');
  assert(preload.includes('encodeShoppingListPb1'),'PB1 encoder mangler i preload');
  assert(appJs.includes('id="sendShoppingToMobileBtn"'),'Send til mobil-knapp mangler');
  assert(appJs.includes('openShoppingMobileTransfer'),'Mobiloverføringsmodal mangler');
  assert(appJs.includes('Motta fra mobil'),'PB2 mottak mangler i Mobiloverføring');
  assert(main.includes("'pb2:decode-shopping-trip'"),'PB2 decoder IPC mangler');
  assert(preload.includes('decodeShoppingTripPb2'),'PB2 decoder mangler i preload');
  assert(main.includes("'mobile-transfer:start-send'"),'Lokal Send til mobil IPC mangler');
  assert(main.includes("'mobile-transfer:start-receive'"),'Lokal Motta fra mobil IPC mangler');
  assert(main.includes("http.createServer"),'Electron mangler lokal HTTP-mottaker');
  assert(main.includes("crypto.randomBytes(12).toString('base64url')"),'Mobiloverføring mangler tilfeldig engangstoken');
  assert(main.includes('MOBILE_TRANSFER_TIMEOUT_MS = 5 * 60 * 1000'),'Mobiloverføring mangler fem minutters utløp');
  assert(preload.includes('startMobileTransferSend'),'Lokal Send til mobil mangler i preload');
  assert(preload.includes('startMobileTransferReceive'),'Lokal Motta fra mobil mangler i preload');
  assert(preload.includes('onMobileTransferStatus'),'Mobiloverføring mangler preload statuslistener');
  assert(appJs.includes('shoppingTrips'),'PB2 handletur-lagring mangler');
  assert(appJs.includes('shoppingTripUid'),'Trip-basert regnskapsidentitet mangler');
  const databaseJs=fs.readFileSync(path.join(__dirname,'../src/js/database.js'),'utf8');
  assert(databaseJs.includes('const DB_VERSION = 5'),'IndexedDB er ikke migrert til v5');
  assert(databaseJs.includes("'shoppingTrips'"),'shoppingTrips-store mangler');
  assert(main.includes('JSON.stringify({ v: 2, id: listId, i: items })'),'PB1 v2 kompakt root-format mangler');
  assert(main.includes("i: String(item?.i"),'PB1 v2 kompakt vare-ID mangler');
  assert(main.includes("n: String(item?.n"),'PB1 v2 kompakt varenavn mangler');
  assert(main.includes("if (version !== 1 && version !== 2)"),'PB2 mangler v1/v2 bakoverkompatibilitet');

  assert(appJs.includes('clearSentActiveItems'),'Mobiloverføring mangler opprydding av sendt Aktiv-liste');
  assert(appJs.includes("event.type==='sent'&&currentView==='send'"),'Aktiv-listen tømmes ikke ved bekreftet send-hendelse');
  assert(appJs.includes("await BudgetDB.remove('shoppingItems',current.id)"),'Sendt handleliste fjernes ikke fra Aktiv');
  assert(appJs.includes('await currentShoppingListUid({renew:true})'),'Ny liste-ID opprettes ikke etter vellykket sending');
  assert(appJs.includes("mobileTransferShortId('l')"),'Kort PB-list-ID mangler');
  assert(appJs.includes("mobileTransferShortId('i')"),'Kort PB-vare-ID mangler');
  assert(appJs.includes('id="mobileAppInstallQr"'),'Mobilapp QR i innstillinger mangler');
  assert(!appJs.includes('id="mobileAppApkUrlInput"'),'Direkte APK-adresse skal ikke være redigerbar i vanlig UI');
  assert(appJs.includes("mobileAppApkUrl"),'Mobilapp APK-konfigurasjon mangler');
  assert(appJs.includes("/releases/latest/download/handleliste.apk"),'Fast latest APK-lenke mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  assert(appJs.includes("DEFAULT_MOBILE_APP_APK_URL"),'Standard direkte APK-URL mangler');
  assert(appJs.includes("releases/latest/download"),'Direkte GitHub latest-download mangler');
  assert(!appJs.includes("DEFAULT_MOBILE_APP_RELEASE_URL"),'Gammel release-side URL finnes fortsatt');
}

{
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Data & integrasjoner er ikke 3-kolonne layout');
  assert(css.includes('@media(max-width:1180px)'),'2-kolonne breakpoint mangler');
  assert(css.includes('@media(max-width:760px)'),'1-kolonne breakpoint mangler');
  assert(css.includes('.settings-data-integration .mobile-app-install-qr'),'Kompakt mobilapp-QR styling mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  assert(appJs.includes('window.expandKassalProductsByStore'),'Butikkspesifikk produktutvidelse mangler');
  assert(appJs.includes("pricesBulk({eans:chunk,days:1,aggregation:'min'})"),'Bulk butikkpris-oppslag mangler');
  assert(crud.includes('productCandidateKey'),'Butikkspesifikk kandidatidentitet mangler');
  assert(crud.includes('candidateStore'),'Butikk mangler i produktvalgets tekst');
  assert(crud.includes('const rawChoices=[],rawSeen=new Set()'),'Batch-beriking av automatisk matching mangler');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes("{label:'Butikk',key:'store'"),'Butikk-kolonne mangler i aktiv handleliste');
}



{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes("{label:'Butikk',key:'store'"),'Butikk-kolonne mangler i aktiv handleliste');
  assert(appJs.includes("escapeHtml(x.store||'Ikke valgt')"),'Valgt butikk vises ikke i handlelisten');
  assert(!appJs.includes('shopping-store-change'),'Endre butikk skal være fjernet');
  assert(!appJs.includes('openShoppingStorePicker'),'Butikkvelger skal være fjernet');
  assert(!appJs.includes('shoppingStoreAlternatives'),'Butikkalternativ-oppslag skal være fjernet');
  assert(css.includes('.shopping-store-cell'),'Butikkvisning mangler styling');
  assert(!css.includes('.shopping-store-option{'),'Butikkvelger-styling skal være fjernet');
}

{
  const appJs=fs.readFileSync(path.join(__dirname,'../src/js/app.js'),'utf8');
  const crud=fs.readFileSync(path.join(__dirname,'../src/js/crud.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../src/css/components.css'),'utf8');
  assert(appJs.includes('recipeCategoryFilter'),'Oppskriftskategori-filter mangler');
  assert(appJs.includes("recipeSort = 'recent'"),'Oppskriftssortering mangler');
  assert(appJs.includes('recipePantryCoverage'),'Lagerdekning for oppskrifter mangler');
  assert(appJs.includes('recipe-card-image'),'Oppskriftskort bruker ikke importert bilde');
  assert(appJs.includes('Legg i matplan'),'Legg i matplan mangler på oppskriftskort');
  assert(appJs.includes("CRUD.open('mealplan',null"),'Oppskrift kan ikke legges direkte i matplan');
  assert(!crud.includes("if (activePage==='recipes') decorateCards('.recipe-card',AppState.recipes);"),'Oppskriftskort skal ikke få automatiske Rediger/Slett-knapper');
  assert(css.includes('height:330px'),'Oppskriftskort har ikke fast kompakt høyde');
  assert(css.includes('object-fit:cover'),'Oppskriftsbilder fyller ikke fast bildeflate');
}
console.log('Alle tester bestått.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}


// Recipe Import Engine v1
{
  const { parseRecipeJsonLd, normalizeRecipe, parseIngredientLine, isoDurationToText } = require('../electron/recipe-import');
  const html = `<!doctype html><script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org','@type':'Recipe',name:'Hverdagsgryte',description:'Enkel gryte',
    recipeYield:'4 porsjoner',totalTime:'PT35M',recipeCategory:'Middag',
    recipeIngredient:['1 pk kyllingkjøttdeig 400 g','3 dl matfløte','4 porsjoner ris'],
    recipeInstructions:[{'@type':'HowToStep',text:'Stek kjøttet.'},{'@type':'HowToStep',text:'Tilsett resten.'}],
    image:['https://example.com/recipe.jpg']
  })}</script>`;
  const node = parseRecipeJsonLd(html);
  const recipe = normalizeRecipe(node, 'https://example.com/oppskrift');
  assert.equal(recipe.name, 'Hverdagsgryte');
  assert.equal(recipe.servings, 4);
  assert.equal(recipe.time, '35 min');
  assert.equal(recipe.ingredients.length, 3);
  assert.equal(recipe.ingredients[0].usedQuantity, 1);
  assert.equal(recipe.ingredients[0].usedUnit, 'stk');
  assert.match(recipe.instructions, /1\. Stek kjøttet/);
  assert.equal(recipe.sourceName, 'example.com');
  assert.equal(parseIngredientLine('400 g kjøttdeig').usedQuantity, 400);
  assert.equal(parseIngredientLine('400 g kjøttdeig').usedUnit, 'g');
  assert.equal(isoDurationToText('PT1H20M'), '1 t 20 min');
}

{
  const main = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '../electron/preload.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../src/js/app.js'), 'utf8');
  assert.match(main, /recipe:import-url/);
  assert.match(preload, /importRecipeUrl/);
  assert.match(appJs, /importRecipeUrlBtn/);
  assert.match(appJs, /CRUD\.open\('recipes',null,recipe\)/);
}

{
  const appJs = fs.readFileSync(path.join(__dirname, '../src/js/app.js'), 'utf8');
  assert(appJs.includes("{id:'foodeconomy', label:'Matøkonomi'}"), 'Matøkonomi-fane mangler');
  assert(appJs.includes('function rebuildShoppingFromMealPlan'), 'Handlelistegenerator mangler');
  assert(appJs.includes('updateShoppingFromMealPlanBtn'), 'Knapp for matplan til handleliste mangler');
  assert(appJs.includes('Registrer kjøpte varer'), 'Mottaksmodus for barcode mangler');
  assert(appJs.includes('receiveScannedShoppingProduct'), 'Barcode mottaksflyt mangler');
  assert(appJs.includes("mainTabs+UI.card('Aktiv handleliste',table)"), 'Handlelistefaner skal ligge rett over innholdskortet');
  assert(appJs.includes('shopping-history-week'), 'Kjøpshistorikk mangler kollapsbare ukegrupper');
  assert(appJs.includes('isoWeekRangeLabel'), 'Kjøpshistorikk mangler ukeintervall');
  assert(!appJs.includes('id="scanShoppingBtn"'), 'Skann vare skal ikke ligge som egen Handleliste-knapp');
  assert(appJs.includes('data-view="scan"'), 'Skann vare mangler under Mobiloverføring');
}


{
  const {parseKassalWeeklyHtml}=require('../electron/kassal-weekly-parser');
  const html=`
    <article class="product">
      <img data-src="/images/test-product.webp" alt="Testprodukt">
      <a href="/vare/123-testprodukt-1234567890123">kr 20,00</a>
      <div>Testprodukt 500 g</div>
      <div>før 30.00 kr 20,00</div>
    </article>
    <article class="product">
      <img srcset="//cdn.kassal.app/product2.webp 1x, //cdn.kassal.app/product2@2x.webp 2x">
      <a href="/vare/456-produkt-to-1234567890124">kr 10,00</a>
      <div>Produkt to</div>
      <div>før 15.00 kr 10,00</div>
    </article>`;
  const rows=parseKassalWeeklyHtml(html);
  assert.equal(rows.length,2,'Weekly parser skal finne begge produkter');
  assert.equal(rows[0].image,'https://kassal.app/images/test-product.webp','Parser finner ikke bilde før produktlenken');
  assert.equal(rows[1].image,'https://cdn.kassal.app/product2.webp','Parser håndterer ikke srcset');
}
