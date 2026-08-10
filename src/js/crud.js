(() => {
  const options = (...values) => values.map(value => ({ value, label:value }));
  const schemas = {
    budget: { store:'budgets', title:'budsjettpost', fields:[
      {key:'name',label:'Navn',required:true},
      {key:'category',label:'Kategori',required:true,type:'category-select',categoryTypes:['Utgift','Mat']},
      {key:'planned',label:'Planlagt beløp',type:'number',required:true},
      {key:'appliesTo',label:'Gjelder for',type:'select',options:[
        {value:'selected_month',label:'Valgt måned'},
        {value:'monthly',label:'Hver måned'},
        {value:'quarterly',label:'Kvartalsvis'},
        {value:'yearly',label:'Årlig'}
      ],default:'selected_month'},
      {key:'calendarWeek',label:'Kalenderuke',type:'budget-week-select'},
    ]},
    income: { store:'incomes', title:'inntekt', fields:[
      {key:'name',label:'Navn',required:true},
      {key:'amount',label:'Beløp',type:'number',required:true},
      {key:'category',label:'Kategori',required:true,type:'category-select',categoryTypes:['Inntekt']},
      {key:'appliesTo',label:'Gjelder for',type:'select',options:[
        {value:'selected_month',label:'Valgt måned'},
        {value:'monthly',label:'Hver måned'},
        {value:'quarterly',label:'Kvartalsvis'},
        {value:'yearly',label:'Årlig'}
      ],default:'selected_month'},
      {key:'calendarWeek',label:'Kalenderuke',type:'calendar-week-select'},
      {key:'status',label:'Status for valgt måned',type:'select',options:options('Forventet','Mottatt')}
    ]},
    expenses: { store:'expenses', title:'utgift', fields:[
      {key:'description',label:'Beskrivelse',required:true},
      {key:'amount',label:'Beløp',type:'number',required:true},
      {key:'category',label:'Kategori',required:true,type:'category-select',categoryTypes:['Utgift','Mat']},
      {key:'appliesTo',label:'Gjelder for',type:'select',options:[
        {value:'selected_month',label:'Valgt måned'},
        {value:'monthly',label:'Hver måned'},
        {value:'quarterly',label:'Kvartalsvis'},
        {value:'yearly',label:'Årlig'}
      ],default:'selected_month'},
      {key:'calendarWeek',label:'Kalenderuke',type:'calendar-week-select'},
      {key:'status',label:'Status for valgt måned',type:'select',options:options('Ubetalt','Betalt','Delvis')},
      {key:'type',label:'Type',type:'select',options:options('Fast','Variabel','Periodisk','Engangs')},
      {key:'note',label:'Notat',type:'textarea',wide:true}
    ]},
    loans: { store:'loans', title:'lån', fields:[
      {key:'name',label:'Navn',required:true},{key:'type',label:'Lånetype',type:'select',options:options('Boliglån','Billån','Forbrukslån','Studielån','Kredittkort','Privat lån','Annet')},{key:'original',label:'Opprinnelig lånebeløp',type:'number'},{key:'balance',label:'Gjenstående saldo',type:'number',required:true},{key:'nominal',label:'Nominell rente %',type:'number',step:'0.01'},{key:'effective',label:'Effektiv rente %',type:'number',step:'0.01'},{key:'payment',label:'Terminbeløp',type:'number'},{key:'fee',label:'Gebyr',type:'number'},{key:'paymentDay',label:'Betalingsdag',type:'number'},{key:'term',label:'Nedbetalingstid'},{key:'rateType',label:'Rentetype',type:'select',options:options('Fast','Flytende')},{key:'interestOnlyMonths',label:'Avdragsfri måneder',type:'number'},{key:'expenseCategory',label:'Utgiftskategori',type:'category-select',categoryTypes:['Utgift','Mat'],default:'Lån og gjeld'}
    ]},
    savings: { store:'goals', title:'sparemål', fields:[
      {key:'name',label:'Navn',required:true},
      {key:'target',label:'Målsum',type:'number',required:true},
      {key:'monthly',label:'Planlagt sparing per måned',type:'number',required:true},
      {key:'deadline',label:'Måldato (valgfritt)',type:'date'},
      {key:'priority',label:'Prioritet',type:'select',options:options('Høy','Middels','Lav'),default:'Middels'},
      {key:'useSurplus',label:'Ta med forventet overskudd i spareforslag',type:'checkbox',default:true}
    ]},
    recipes: { store:'recipes', title:'oppskrift', fields:[
      {key:'name',label:'Navn',required:true},{key:'description',label:'Beskrivelse',type:'textarea',wide:true},{key:'category',label:'Kategori',type:'select',options:options('Frokost','Lunsj','Middag','Kveldsmat','Mellommåltid','Snack','Dessert','Bakst','Brunsj','Annet'),default:'Middag'},{key:'servings',label:'Porsjoner',type:'number',default:2},{key:'time',label:'Tilberedningstid'},{key:'recipeIngredients',label:'Ingredienser og produkter',type:'recipe-ingredients-editor',wide:true},{key:'price',label:'Beregnet totalpris',type:'number',readonly:true},{key:'pricePerServing',label:'Pris per porsjon',type:'number',readonly:true},{key:'instructions',label:'Fremgangsmåte',type:'textarea',wide:true},{key:'tagsText',label:'Tags (kommaseparert)',wide:true},{key:'allergensText',label:'Allergener (kommaseparert)',wide:true}
    ]},
    mealplan: { store:'mealPlans', title:'måltid', fields:[
      {key:'name',label:'Måltid/oppskrift',required:true,type:'recipe-combobox'},{key:'date',label:'Dato',type:'date',required:true},{key:'mealType',label:'Måltidstype',type:'select',options:options('Frokost','Lunsj','Middag','Kveldsmat','Mellommåltid')},{key:'persons',label:'Antall personer',type:'number',default:2},{key:'estimatedCost',label:'Estimert kostnad',type:'number'},{key:'leftovers',label:'Restemat',type:'checkbox'},{key:'freezerPortions',label:'Porsjoner til frysing',type:'number',default:0}
    ]},
    shopping: { store:'shoppingItems', title:'vare', fields:[
      {key:'name',label:'Vare',required:true},{key:'quantity',label:'Mengde',type:'number'},{key:'unit',label:'Enhet'},{key:'category',label:'Kategori'},{key:'recipe',label:'Brukes i'},{key:'price',label:'Pris',type:'number',step:'0.01'},{key:'purchaseDate',label:'Kjøpsdato',type:'date'},{key:'atHome',label:'Finnes hjemme',type:'checkbox'},{key:'checked',label:'Kjøpt',type:'checkbox'}
    ]},
    pantry: { store:'pantryItems', title:'lagervare', fields:[
      {key:'name',label:'Vare',required:true},{key:'quantity',label:'Mengde',type:'number'},{key:'unit',label:'Enhet'},{key:'purchaseDate',label:'Innkjøpsdato',type:'date'},{key:'expiryDate',label:'Utløpsdato',type:'date'},{key:'minimum',label:'Minimumsbeholdning',type:'number'},{key:'location',label:'Plassering',type:'select',options:options('Kjøleskap','Fryser','Skap')}
    ]},
    categories: { store:'categories', title:'kategori', fields:[
      {key:'name',label:'Navn',required:true,type:'text'},{key:'type',label:'Type',type:'select',options:options('Inntekt','Utgift','Mat','Overføring')},{key:'mode',label:'Standard',type:'select',options:options('Fast','Variabel','Periodisk')},{key:'color',label:'Farge',type:'color',default:'#4f6ef7'}
    ]}
  };
  schemas.general = schemas.categories;


  function isoWeek(date) {
    const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    return { year:value.getUTCFullYear(), week:Math.ceil((((value - yearStart) / 86400000) + 1) / 7) };
  }

  function budgetWeeksForMonth(monthKey) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!match) return [];
    const year = Number(match[1]);
    const month = Number(match[2]);
    const lastDay = new Date(year, month, 0).getDate();
    const seen = new Map();
    for (let day = 1; day <= lastDay; day += 1) {
      const info = isoWeek(new Date(year, month - 1, day));
      const key = `${info.year}-W${String(info.week).padStart(2,'0')}`;
      if (!seen.has(key)) seen.set(key, { value:key, label:`Uke ${info.week}` });
    }
    return [...seen.values()];
  }

  function budgetAppliesTo(record) {
    if (record.appliesTo) return record.appliesTo;
    const frequency = String(record.frequency || '').toLocaleLowerCase('nb-NO');
    if (frequency === 'månedlig') return 'monthly';
    if (frequency === 'kvartalsvis') return 'quarterly';
    if (frequency === 'årlig') return 'yearly';
    return 'selected_month';
  }

  function budgetAppliesInMonth(record, monthKey) {
    const startMonth = selectedBudgetMonth(record);
    if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(monthKey)) return false;
    const [sy,sm] = startMonth.split('-').map(Number);
    const [y,m] = monthKey.split('-').map(Number);
    const diff = (y-sy)*12 + (m-sm);
    if (diff < 0 || record.active === false) return false;
    const scope = budgetAppliesTo(record);
    if (scope === 'monthly') return true;
    if (scope === 'quarterly') return diff % 3 === 0;
    if (scope === 'yearly') return diff % 12 === 0;
    return diff === 0;
  }

  function selectedBudgetMonth(record = {}) {
    if (record.budgetMonth) return record.budgetMonth;
    if (record.startDate) return String(record.startDate).slice(0,7);
    if (record.month) return String(record.month).slice(0,7);
    const today = new Date();
    const parts = String(activePeriod || '').split('-');
    const year = /^\d{4}$/.test(parts[0] || '') ? parts[0] : String(today.getFullYear());
    const month = parts[1] && parts[1] !== 'all' ? parts[1] : String(today.getMonth()+1).padStart(2,'0');
    return `${year}-${month}`;
  }

  function selectedEntryMonth(record = {}, page = current?.page) {
    if (record.periodMonth) return record.periodMonth;
    const dateKey = page === 'income' ? 'date' : page === 'expenses' ? 'dueDate' : 'startDate';
    if (record[dateKey]) return String(record[dateKey]).slice(0,7);
    return selectedBudgetMonth(record);
  }

  function entryAppliesTo(record = {}) {
    if (record.appliesTo) return record.appliesTo;
    const frequency = String(record.frequency || '').toLocaleLowerCase('nb-NO');
    if (frequency === 'månedlig') return 'monthly';
    if (frequency === 'kvartalsvis') return 'quarterly';
    if (frequency === 'årlig') return 'yearly';
    return 'selected_month';
  }

  function dateForMonthAndWeek(monthKey, weekKey) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const lastDay = new Date(year, month, 0).getDate();
    if (weekKey) {
      for (let day = 1; day <= lastDay; day += 1) {
        const info = isoWeek(new Date(year, month - 1, day));
        const key = `${info.year}-W${String(info.week).padStart(2,'0')}`;
        if (key === weekKey) return `${monthKey}-${String(day).padStart(2,'0')}`;
      }
    }
    return `${monthKey}-01`;
  }

  let modal;
  let current = null;


  let confirmDialog;
  let confirmResolver = null;

  function ensureConfirmDialog() {
    if (confirmDialog) return confirmDialog;
    confirmDialog = document.createElement('div');
    confirmDialog.className = 'modal-backdrop hidden';
    confirmDialog.id = 'appConfirmBackdrop';
    confirmDialog.innerHTML = `<section class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="appConfirmTitle" aria-describedby="appConfirmMessage">
      <header class="modal-header"><div><span class="eyebrow">Bekreft handling</span><h2 id="appConfirmTitle">Bekreft sletting</h2></div><button type="button" class="icon-btn ghost" id="appConfirmClose" aria-label="Lukk">×</button></header>
      <div class="modal-body confirm-modal-body"><div class="confirm-icon" aria-hidden="true">!</div><div><p id="appConfirmMessage"></p><p class="muted" id="appConfirmHelp">Denne handlingen kan ikke angres.</p></div></div>
      <footer class="modal-footer"><button type="button" class="btn secondary" id="appConfirmCancel">Avbryt</button><button type="button" class="btn danger" id="appConfirmAccept">Slett</button></footer>
    </section>`;
    document.body.appendChild(confirmDialog);
    const resolve = value => {
      confirmDialog.classList.add('hidden');
      const done = confirmResolver;
      confirmResolver = null;
      done?.(value);
    };
    confirmDialog.querySelector('#appConfirmClose').addEventListener('click', () => resolve(false));
    confirmDialog.querySelector('#appConfirmCancel').addEventListener('click', () => resolve(false));
    confirmDialog.querySelector('#appConfirmAccept').addEventListener('click', () => resolve(true));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !confirmDialog.classList.contains('hidden')) resolve(false);
    });
    return confirmDialog;
  }

  function confirmAction({ title='Bekreft sletting', message='Vil du slette denne posten?', confirmLabel='Slett', help='Denne handlingen kan ikke angres.' } = {}) {
    const dialog = ensureConfirmDialog();
    if (confirmResolver) confirmResolver(false);
    dialog.querySelector('#appConfirmTitle').textContent = title;
    dialog.querySelector('#appConfirmMessage').textContent = message;
    dialog.querySelector('#appConfirmHelp').textContent = help;
    dialog.querySelector('#appConfirmAccept').textContent = confirmLabel;
    dialog.classList.remove('hidden');
    requestAnimationFrame(() => dialog.querySelector('#appConfirmCancel')?.focus());
    return new Promise(resolve => { confirmResolver = resolve; });
  }

  window.AppConfirm = confirmAction;

  let modalDirty = false;
  let occurrenceDirty = false;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-backdrop hidden';
    modal.id = 'crudModalBackdrop';
    modal.innerHTML = `<section class="modal crud-modal" role="dialog" aria-modal="true">
      <header class="modal-header"><div><span class="eyebrow" id="crudEyebrow">Registrering</span><h2 id="crudTitle"></h2></div><button class="icon-btn ghost" id="crudClose">×</button></header>
      <form id="crudForm"><div class="modal-body"><div class="form-grid two-col" id="crudFields"></div></div>
      <footer class="modal-footer"><button type="button" class="btn danger hidden" id="crudDelete">Slett</button><span class="modal-spacer"></span><button type="button" class="btn secondary" id="crudCancel">Avbryt</button><button type="submit" class="btn primary">Lagre</button></footer></form></section>`;
    document.body.appendChild(modal);
    modal.querySelector('#crudClose').addEventListener('click', requestClose);
    modal.querySelector('#crudCancel').addEventListener('click', requestClose);
    modal.querySelector('#crudForm').addEventListener('input', () => { modalDirty = true; });
    modal.querySelector('#crudForm').addEventListener('change', () => { modalDirty = true; });
    modal.querySelector('#crudForm').addEventListener('submit', save);
    modal.querySelector('#crudDelete').addEventListener('click', remove);
    return modal;
  }


  let recipeIngredientsDraft = [];
  let recipeSearchResults = [];
  let ingredientMatchRunning = false;
  const ingredientSearchCache = new Map();
  const MATCH_PREF_KEY = 'ingredientMatchPreferences';

  function normalizeIngredientText(value) {
    return String(value || '')
      .toLocaleLowerCase('nb-NO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\([^)]*\)/g,' ')
      .replace(/\b(romtemperert|finhakket|grovhakket|hakket|revet|skivet|i biter|etter smak|til steking|til servering|valgfritt|fersk|ferske|tørr|tørket)\b/g,' ')
      .replace(/\b(kyllingkjøttdeig eller svinekjøttdeig)\b/g,'kjøttdeig')
      .replace(/[^a-zæøå0-9 ]/g,' ')
      .replace(/\s+/g,' ').trim();
  }

  function ingredientSearchSource(item) {
    return String(item?.ingredientName || item?.originalText || '')
      .toLocaleLowerCase('nb-NO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\([^)]*\)/g,' ')
      .replace(/kyllingkjøttdeig eller svinekjøttdeig/g,'kjøttdeig')
      .replace(/etter smak|til steking|til servering|valgfritt|romtemperert|renset|vasket|avrent/g,' ')
      .replace(/[^a-zæøå0-9., ]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function ingredientSpecificSearchQuery(item) {
    const stopTokens=new Set([
      'ca','cirka','omtrent','en','ei','et','halv','halvt','kvart','neve','klype','dash',
      'ts','teskje','teskjeer','ss','spiseskje','spiseskjeer','krm',
      'dl','cl','ml','l','liter','gram','g','kg','mg',
      'stk','stykk','stykke','pk','pakke','pakker','boks','bokser','beger','pose','poser','porsjon','porsjoner'
    ]);

    return ingredientSearchSource(item)
      .split(/\s+/)
      .map(token=>token.replace(/^[.,]+|[.,]+$/g,''))
      .filter(Boolean)
      .filter(token=>!/^\d+(?:[.,]\d+)?$/.test(token))
      .filter(token=>!stopTokens.has(token))
      .join(' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function ingredientSearchQuery(item) {
    const descriptorTokens=new Set([
      'finhakket','grovhakket','hakket','revet','skivet','strimlet','terninger',
      'fersk','ferske','torr','torket','malt','knust','naturell','usaltet',
      'saltet','kokt','stekt','frossen','frosne','liten','lite','stor','store',
      'middels','medium','fin','grov','grovt'
    ]);

    return ingredientSpecificSearchQuery(item)
      .split(/\s+/)
      .filter(Boolean)
      .filter(token=>!descriptorTokens.has(token))
      .join(' ')
      .trim();
  }

  function ingredientSearchVariants(item) {
    const specific=ingredientSpecificSearchQuery(item);
    const broad=ingredientSearchQuery(item);
    const variants=[];
    if(specific)variants.push({query:specific,kind:'specific'});
    if(broad&&broad!==specific)variants.push({query:broad,kind:'broad'});
    return variants;
  }

  function tokenSet(value) { return new Set(normalizeIngredientText(value).split(' ').filter(x=>x.length>1)); }
  function overlapScore(a,b) {
    const one=tokenSet(a), two=tokenSet(b); if(!one.size||!two.size)return 0;
    let hit=0; one.forEach(x=>{if(two.has(x))hit+=1;});
    return hit / Math.max(one.size,two.size);
  }

  function packageFitScore(item, product) {
    if (!compatibleUnits(item.usedUnit, product.unit)) return 0;
    const needed=baseQuantity(item.usedQuantity,item.usedUnit);
    const pack=baseQuantity(product.packageSize,product.unit);
    if(!needed||!pack)return 0.45;
    const ratio=Math.min(needed,pack)/Math.max(needed,pack);
    return Math.max(0.25,ratio);
  }

  function ingredientProductConflict(item, product) {
    const queryTokens=tokenSet(ingredientSpecificSearchQuery(item));
    const productTokens=tokenSet(`${product.eName||''} ${product.brand||''} ${product.category||''}`);

    const processedTokens=[
      'chips','potetgull','snack','snacks','smak','smakssatt','smakstilsatt',
      'dip','dipp','dressing','saus','suppe','pizza','burger','wrap',
      'kryddermix','krydderblanding','pulver','nudler','kjeks'
    ];

    return processedTokens.filter(token=>productTokens.has(token)&&!queryTokens.has(token)).length;
  }

  function scoreIngredientProduct(item, product, learnedProductId) {
    if (learnedProductId && String(product.id) === String(learnedProductId)) return 1;

    const broad=ingredientSearchQuery(item);
    const specific=ingredientSpecificSearchQuery(item);
    const productName=normalizeIngredientText(`${product.eName||''} ${product.brand||''}`);

    const broadTokens=[...tokenSet(broad)];
    const specificTokens=[...tokenSet(specific)];
    const productTokens=tokenSet(productName);

    const broadCoverage=broadTokens.length
      ? broadTokens.filter(token=>productTokens.has(token)).length/broadTokens.length
      : 0;
    const specificCoverage=specificTokens.length
      ? specificTokens.filter(token=>productTokens.has(token)).length/specificTokens.length
      : broadCoverage;

    const broadPhrase=broad&&productName.includes(broad)?1:0;
    const specificPhrase=specific&&productName.includes(specific)?1:0;
    const headToken=broadTokens[broadTokens.length-1]||specificTokens[specificTokens.length-1]||'';
    const headHit=headToken&&productTokens.has(headToken)?1:0;

    const modifierTokens=specificTokens.filter(token=>!broadTokens.includes(token));
    const modifierCoverage=modifierTokens.length
      ? modifierTokens.filter(token=>productTokens.has(token)).length/modifierTokens.length
      : 1;

    const units=compatibleUnits(item.usedUnit,product.unit)?1:0;
    const pack=packageFitScore(item,product);
    const priced=Number(product.price)>0?1:0;

    let score=
      broadCoverage*0.34 +
      specificCoverage*0.20 +
      broadPhrase*0.10 +
      specificPhrase*0.12 +
      headHit*0.12 +
      modifierCoverage*0.06 +
      units*0.03 +
      pack*0.02 +
      priced*0.01;

    if(headToken&&!productTokens.has(headToken))score-=0.30;

    const conflicts=ingredientProductConflict(item,product);
    if(conflicts)score-=Math.min(0.48,conflicts*0.24);

    return Math.max(0,Math.min(1,score));
  }

  async function loadIngredientMatchPreferences() {
    const rows=await BudgetDB.getAll('settings');
    return rows.find(x=>x.key===MATCH_PREF_KEY)?.value || {};
  }

  async function rememberIngredientMatch(item, product) {
    const prefs=await loadIngredientMatchPreferences();
    prefs[ingredientSearchQuery(item)]={productId:product.id,ean:product.ean||'',productName:product.eName||'',updatedAt:new Date().toISOString()};
    const rows=await BudgetDB.getAll('settings');
    const existing=rows.find(x=>x.key===MATCH_PREF_KEY);
    const record={...(existing||{}),key:MATCH_PREF_KEY,value:prefs};
    existing?.id ? await BudgetDB.put('settings',record) : await BudgetDB.add('settings',record);
  }

  function matchLabel(status) {
    if(status==='matched') return 'Sikker match';
    if(status==='searching') return 'Søker …';
    if(status==='pricing') return 'Henter priser …';
    if(status==='suggested') return 'Forslag';
    if(status==='unmatched') return 'Må velges';
    return 'Ikke matchet';
  }

  const normalizeUnit = unit => PricingEngine.normalizeUnit(unit);
  const baseQuantity = (quantity, unit) => PricingEngine.baseQuantity(quantity, unit);
  const compatibleUnits = (a, b) => PricingEngine.compatibleUnits(a, b);
  const ingredientCost = item => PricingEngine.ingredientCost(item);

  function recipeProductToIngredient(product) {
    return {
      productId: product.id, ean: product.ean || '', productName: product.eName || 'Ukjent produkt',
      brand: product.brand || '', store: product.store || '', packagePrice: PricingEngine.number(product.price),
      packageQuantity: PricingEngine.number(product.packageSize) || 1, packageUnit: PricingEngine.normalizeUnit(product.unit || 'stk'),
      image: product.image || '', apiUpdatedAt: product.updatedAt || new Date().toISOString()
    };
  }

  function productBaseKey(product) {
    return String(product?.ean || product?.id || product?.eName || '').trim();
  }
  function productCandidateKey(product) {
    return `${productBaseKey(product)}::${String(product?.storeCode||product?.store||'').trim()}::${Number(product?.price)||''}`;
  }
  async function expandIngredientStoreCandidates(products,maxStoresPerProduct=3) {
    if(typeof window.expandKassalProductsByStore!=='function')return products||[];
    return window.expandKassalProductsByStore(products||[],maxStoresPerProduct);
  }

  function recipeIngredientsEditorHtml() {
    return `<div class="field recipe-editor-field" style="grid-column:1/-1"><span>Ingredienser og produkter</span>
      <div class="recipe-product-search"><input id="recipeProductSearch" type="search" placeholder="Søk etter produkt i Kassalapp …" autocomplete="off"><button type="button" class="btn secondary" id="recipeProductSearchBtn">Søk</button><button type="button" class="btn primary" id="matchImportedIngredientsBtn">Match importerte ingredienser</button></div>
      <div id="ingredientMatchStatus" class="ingredient-match-status muted"></div>
      <div id="recipeProductResults" class="recipe-product-results"></div>
      <div id="recipeIngredientRows" class="recipe-ingredient-rows"></div>
      <div class="recipe-cost-summary"><span>Totalpris <strong id="recipeTotalPrice">0 kr</strong></span><span>Pris per porsjon <strong id="recipeServingPrice">0 kr</strong></span></div>
      <small class="muted">Kostnaden beregnes fra pakningspris × brukt mengde / pakningsmengde.</small>
    </div>`;
  }

  function fieldHtml(field, value) {
    const id = `crud-${field.key}`;
    const wide = field.wide ? ' style="grid-column:1/-1"' : '';
    if (field.type === 'checkbox') { const checked = value ?? field.default ?? false; return `<label class="field checkbox-field"${wide}><input id="${id}" name="${field.key}" type="checkbox" ${checked ? 'checked' : ''}><span>${field.label}</span></label>`; }
    if (field.type === 'textarea') return `<label class="field"${wide}><span>${field.label}</span><textarea id="${id}" name="${field.key}" rows="4">${escapeHtml(value ?? '')}</textarea></label>`;
    if (field.type === 'select') return `<label class="field"${wide}><span>${field.label}</span><select id="${id}" name="${field.key}">${field.options.map(o=>`<option value="${escapeHtml(o.value)}" ${String(value ?? field.default ?? '')===String(o.value)?'selected':''}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;
    if (['budget-week-select','calendar-week-select'].includes(field.type)) {
      const selected = String(value ?? '');
      const monthKey = current?.page === 'budget' ? selectedBudgetMonth(current?.record || {}) : selectedEntryMonth(current?.record || {}, current?.page);
      const weeks = budgetWeeksForMonth(monthKey);
      return `<label class="field"${wide}><span>${field.label}</span><select id="${id}" name="${field.key}"><option value="">Hele måneden</option>${weeks.map(option=>`<option value="${escapeHtml(option.value)}" ${selected===option.value?'selected':''}>${escapeHtml(option.label)}</option>`).join('')}</select></label>`;
    }
    if (field.type === 'category-select') {
      const allowed = field.categoryTypes || [];
      const categories = [...(AppState.categories || [])]
        .filter(x => x.active !== false && (!allowed.length || allowed.includes(x.type)))
        .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'nb'));
      const selected = String(value ?? field.default ?? '');
      const missing = selected && !categories.some(x => String(x.name) === selected);
      return `<label class="field"${wide}><span>${field.label}</span><select id="${id}" name="${field.key}" ${field.required?'required':''}><option value="">Velg kategori</option>${missing?`<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} (historisk)</option>`:''}${categories.map(x=>`<option value="${escapeHtml(x.name)}" ${selected===String(x.name)?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></label>`;
    }
    if (field.type === 'recipe-ingredients-editor') return recipeIngredientsEditorHtml();
    if (field.type === 'recipe-combobox') {
      const recipes = [...(AppState.recipes || [])].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'nb'));
      return `<label class="field"${wide}><span>${field.label}</span><input id="${id}" name="${field.key}" type="text" list="${id}-options" autocomplete="off" value="${escapeHtml(value ?? '')}" ${field.required?'required':''}><datalist id="${id}-options">${recipes.map(r=>`<option value="${escapeHtml(r.name||'')}">${escapeHtml(r.category||'Oppskrift')}</option>`).join('')}</datalist><small class="muted">Velg en lagret oppskrift eller skriv inn et måltid selv.</small></label>`;
    }
    return `<label class="field"${wide}><span>${field.label}</span><input id="${id}" name="${field.key}" type="${field.type || 'text'}" ${field.step?`step="${field.step}"`:''} value="${escapeHtml(value ?? field.default ?? '')}" ${field.required?'required':''} ${field.readonly?'readonly':''}></label>`;
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }


  function updateRecipeCostSummary() {
    const total = recipeIngredientsDraft.reduce((sum,item)=>sum+ingredientCost(item),0);
    const servings = Math.max(1, Number(modal?.querySelector('[name="servings"]')?.value || 1));
    const missingPrice=recipeIngredientsDraft.some(item=>item.productId && !(Number(item.packagePrice)>0));
    const totalInput = modal?.querySelector('[name="price"]');
    const portionInput = modal?.querySelector('[name="pricePerServing"]');
    if (totalInput) totalInput.value = total.toFixed(2);
    if (portionInput) portionInput.value = (total / servings).toFixed(2);
    const totalText = modal?.querySelector('#recipeTotalPrice');
    const portionText = modal?.querySelector('#recipeServingPrice');
    const totalLabel=new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK'}).format(total);
    const portionLabel=new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK'}).format(total/servings);
    if (totalText) totalText.textContent = missingPrice?`${totalLabel} + mangler pris`:totalLabel;
    if (portionText) portionText.textContent = missingPrice?`${portionLabel} + mangler pris`:portionLabel;
  }

  async function applyIngredientProduct(index, product) {
    if (!Number.isInteger(index) || index < 0 || index >= recipeIngredientsDraft.length) return;
    if (!product) return;

    const resolved=(await expandIngredientStoreCandidates([product],1))[0]||product;
    product=resolved;
    const previous=recipeIngredientsDraft[index];
    const previousCandidates=Array.isArray(previous.matchCandidates)?previous.matchCandidates:[];
    const selectedKey=productCandidateKey(product);
    const candidates=[];
    const seen=new Set();

    [product,...previousCandidates].forEach(candidate=>{
      if(!candidate)return;
      const key=productCandidateKey(candidate);
      if(!productBaseKey(candidate)||seen.has(key))return;
      seen.add(key);
      candidates.push(candidate);
    });

    recipeIngredientsDraft[index]={
      ...previous,
      ...recipeProductToIngredient(product),
      ingredientName:previous.ingredientName,
      originalText:previous.originalText,
      usedQuantity:previous.usedQuantity,
      usedUnit:previous.usedUnit,
      matchStatus:'matched',
      matchScore:1,
      matchCandidates:candidates,
      selectedMatchKey:selectedKey,
      manualMatch:true,
      priceAvailable:Number(product.price)>0,
      manualSearchResults:[],
      manualSearchPending:false
    };

    renderRecipeIngredientRows();
    updateRecipeCostSummary();
    modalDirty=true;

    try{
      await rememberIngredientMatch(previous,product);
    }catch(error){
      console.warn('Kunne ikke lagre ingrediensmatch-preferanse:',error);
    }
  }

  async function searchProductsCached(query, size=24) {
    const clean=String(query||'').trim();
    if(clean.length<3)throw new Error(`Søket «${clean}» er for kort for Kassalapp`);
    const key = `${normalizeIngredientText(clean)}::${Number(size)||24}`;
    if (ingredientSearchCache.has(key)) return ingredientSearchCache.get(key);
    const promise = (async()=>{
      const products = await window.searchKassalProductsForUi({
        search:clean,
        sort:'date_desc',
        size,
        page:1,
        unique:true,
        exclude_without_ean:true,
        stores:[],
        categories:[]
      });
      return Array.isArray(products)?products:[];
    })().catch(error=>{ ingredientSearchCache.delete(key); throw error; });
    ingredientSearchCache.set(key,promise);
    return promise;
  }

  async function loadIngredientChoices(index) {
    const item=recipeIngredientsDraft[index];
    if(!item)return;

    const query=ingredientSearchQuery(item)||ingredientSpecificSearchQuery(item);
    if(query.length<3){
      showToast(`Kan ikke søke etter «${query}» – Kassalapp krever minst 3 tegn`);
      return;
    }

    const button=modal?.querySelector(`.ingredient-load-choices[data-ingredient-index="${index}"]`);
    try{
      if(button){button.disabled=true;button.textContent='Henter produkter …';}

      // Manual selection is deliberately broad: same free-text product search,
      // no automatic-match threshold, and no price requirement.
      const products=await searchProductsCached(query,72);
      const prefs=await loadIngredientMatchPreferences();
      const learned=prefs[ingredientSearchQuery(item)]?.productId;

      const ranked=products
        .map(product=>({product,score:scoreIngredientProduct(item,product,learned)}))
        .sort((a,b)=>{
          if(b.score!==a.score)return b.score-a.score;
          const ap=Number(a.product.price)>0?Number(a.product.price):Infinity;
          const bp=Number(b.product.price)>0?Number(b.product.price):Infinity;
          return ap-bp;
        });

      const expanded=await expandIngredientStoreCandidates(ranked.slice(0,8).map(x=>x.product),3);
      const expandedRanked=expanded.map(product=>({product,score:scoreIngredientProduct(item,product,learned)}))
        .sort((a,b)=>b.score-a.score||(Number(a.product.price)||Infinity)-(Number(b.product.price)||Infinity));
      recipeIngredientsDraft[index]={
        ...recipeIngredientsDraft[index],
        matchCandidates:expandedRanked.slice(0,24).map(x=>x.product)
      };

      renderRecipeIngredientRows();
      if(!recipeIngredientsDraft[index].matchCandidates.length){
        showToast(`Fant ingen produkter for «${query}»`);
      }
    }catch(error){
      showToast(error.message||'Kunne ikke hente produktforslag');
    }finally{
      if(button){button.disabled=false;button.textContent='Velg / endre produkt';}
    }
  }

  function ingredientManualSearchHtml(item,index) {
    if(!item.manualSearchOpen)return '';
    const query=String(item.manualSearchQuery ?? ingredientSearchQuery(item) ?? ingredientSpecificSearchQuery(item) ?? '').trim();
    const results=Array.isArray(item.manualSearchResults)?item.manualSearchResults:[];
    const pending=item.manualSearchPending===true;
    return `<div class="ingredient-manual-search" data-ingredient-index="${index}">
      <div class="ingredient-manual-search-bar">
        <input class="ingredient-manual-search-input" data-ingredient-index="${index}" type="search" autocomplete="off" spellcheck="false" value="${escapeHtml(query)}" placeholder="Søk produkt …">
        <button type="button" class="btn primary small ingredient-manual-search-submit" data-ingredient-index="${index}" ${pending?'disabled':''}>${pending?'Søker …':'Søk'}</button>
        <button type="button" class="btn secondary small ingredient-manual-search-close" data-ingredient-index="${index}">Lukk</button>
      </div>
      <div class="ingredient-manual-search-results">
        ${pending?'<div class="muted ingredient-manual-search-message">Henter produkter …</div>':results.length?results.map((product,resultIndex)=>{
          const price=Number(product.price)>0
            ? Number(product.price).toLocaleString('nb-NO',{style:'currency',currency:'NOK'})
            : 'Pris ikke tilgjengelig';
          const meta=[product.brand,product.store,product.packageSize?`${product.packageSize} ${product.unit||''}`:''].filter(Boolean).join(' · ');
          return `<button type="button" class="ingredient-manual-result" data-ingredient-index="${index}" data-result-index="${resultIndex}">
            <span><strong>${escapeHtml(product.eName||'Ukjent produkt')}</strong>${meta?`<small>${escapeHtml(meta)}</small>`:''}</span>
            <b>${price}</b>
          </button>`;
        }).join(''):(item.manualSearchDone?'<div class="muted ingredient-manual-search-message">Ingen produkter funnet.</div>':'')}
      </div>
    </div>`;
  }

  async function runIngredientManualSearch(index) {
    const item=recipeIngredientsDraft[index];
    if(!item)return;
    const input=modal?.querySelector(`.ingredient-manual-search-input[data-ingredient-index="${index}"]`);
    const query=String(input?.value ?? item.manualSearchQuery ?? '').trim();
    if(query.length<3){showToast('Skriv minst tre tegn');return;}

    recipeIngredientsDraft[index]={...item,manualSearchOpen:true,manualSearchPending:true,manualSearchDone:false,manualSearchQuery:query};
    renderRecipeIngredientRows();
    try{
      const products=await searchProductsCached(query,72);
      const expanded=await expandIngredientStoreCandidates((products||[]).slice(0,8),3);
      recipeIngredientsDraft[index]={
        ...recipeIngredientsDraft[index],
        manualSearchPending:false,
        manualSearchDone:true,
        manualSearchResults:expanded.slice(0,24)
      };
    }catch(error){
      recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],manualSearchPending:false,manualSearchDone:true,manualSearchResults:[]};
      showToast(error.message||'Produktsøk feilet');
    }
    renderRecipeIngredientRows();
  }

  function renderRecipeIngredientRows() {
    const holder = modal?.querySelector('#recipeIngredientRows');
    if (!holder) return;
    holder.innerHTML = recipeIngredientsDraft.length ? recipeIngredientsDraft.map((item,index)=>{
      const cost = ingredientCost(item);
      return `<article class="recipe-ingredient-row" data-index="${index}">
        ${item.image?`<img src="${escapeHtml(item.image)}" alt="">`:'<div class="ingredient-image-placeholder">🥕</div>'}
        <div class="ingredient-product-info">
          <div class="ingredient-title-line"><strong>${escapeHtml(item.ingredientName || item.productName || 'Ingrediens')}</strong><span class="match-badge ${escapeHtml(item.matchStatus||'unmatched')}">${matchLabel(item.matchStatus)}</span></div>
          <span>${escapeHtml(item.productName || item.originalText || '')}</span>
          <small>${escapeHtml([item.store,item.brand].filter(Boolean).join(' · '))}</small>
          <div class="ingredient-product-controls">
            ${Array.isArray(item.matchCandidates)&&item.matchCandidates.length?`<select class="ingredient-match-choice" data-ingredient-index="${index}"><option value="">${item.matchStatus==='matched'?'Bytt produkt …':'Velg produktforslag …'}</option>${item.matchCandidates.map((candidate,cIndex)=>{
              const selected=(
                (item.selectedMatchKey&&productCandidateKey(candidate)===String(item.selectedMatchKey)) ||
                (!item.selectedMatchKey&&item.ean&&String(candidate.ean||'')===String(item.ean)&&String(candidate.store||'')===String(item.store||'')) ||
                (!item.selectedMatchKey&&item.productId&&String(candidate.id||'')===String(item.productId)&&String(candidate.store||'')===String(item.store||''))
              );
              const candidatePrice=Number(candidate.price)>0
                ? Number(candidate.price).toLocaleString('nb-NO',{style:'currency',currency:'NOK'})
                : 'Pris ikke tilgjengelig';
              const candidateStore=String(candidate.store||'').trim()||'Butikk ikke oppgitt';
              return `<option value="${cIndex}" ${selected?'selected':''}>${escapeHtml(candidate.eName)} · ${candidatePrice} · ${escapeHtml(candidateStore)}</option>`;
            }).join('')}</select>`:`<button type="button" class="btn secondary small ingredient-load-choices" data-ingredient-index="${index}">Velg forslag</button>`}
            <button type="button" class="btn secondary small ingredient-manual-search-open" data-ingredient-index="${index}">Søk produkt</button>
          </div>
        </div>
        <label><span>Brukt mengde</span><input class="ingredient-used-qty" type="number" min="0" step="0.01" value="${Number(item.usedQuantity||0)}"></label>
        <label><span>Enhet</span><select class="ingredient-used-unit">${['g','kg','ml','l','stk'].map(unit=>`<option ${normalizeUnit(item.usedUnit||item.packageUnit)===unit?'selected':''}>${unit}</option>`).join('')}</select></label>
        <div class="ingredient-package"><span>Pakning</span><strong>${Number(item.packageQuantity||0)} ${escapeHtml(item.packageUnit||'')}</strong><small>${Number(item.packagePrice)>0?`${Number(item.packagePrice).toLocaleString('nb-NO',{minimumFractionDigits:2})} kr`:'Pris ikke tilgjengelig'}</small></div>
        <div class="ingredient-row-cost"><span>Kostnad</span><strong>${Number(item.packagePrice)>0?cost.toLocaleString('nb-NO',{style:'currency',currency:'NOK'}):'—'}</strong></div>
        <div class="ingredient-row-actions"><button type="button" class="btn secondary small find-cheaper-ingredient">Finn billigere</button><button type="button" class="btn danger small remove-recipe-ingredient">Fjern</button></div>
        ${ingredientManualSearchHtml(item,index)}
      </article>`;
    }).join('') : '<p class="muted empty-recipe-ingredients">Ingen ingredienser lagt til.</p>';
    holder.querySelectorAll('.ingredient-used-qty').forEach((input,index)=>input.addEventListener('change',()=>{recipeIngredientsDraft[index].usedQuantity=Number(input.value||0);renderRecipeIngredientRows();modalDirty=true;}));
    holder.querySelectorAll('.ingredient-used-unit').forEach((select,index)=>select.addEventListener('change',()=>{recipeIngredientsDraft[index].usedUnit=select.value;renderRecipeIngredientRows();modalDirty=true;}));
    holder.querySelectorAll('.remove-recipe-ingredient').forEach((button,index)=>button.addEventListener('click',()=>{recipeIngredientsDraft.splice(index,1);renderRecipeIngredientRows();modalDirty=true;}));
    holder.querySelectorAll('.find-cheaper-ingredient').forEach((button,index)=>button.addEventListener('click',()=>findCheaperRecipeProduct(index)));
    holder.querySelectorAll('.ingredient-match-choice').forEach(select=>select.addEventListener('change',()=>{
      if(select.value==='')return;
      const index=Number(select.dataset.ingredientIndex);
      if(!Number.isInteger(index)||index<0||index>=recipeIngredientsDraft.length)return;
      const product=recipeIngredientsDraft[index].matchCandidates?.[Number(select.value)];
      if(product)void applyIngredientProduct(index,product);
    }));

    holder.querySelectorAll('.ingredient-load-choices').forEach(button=>button.addEventListener('click',async()=>{
      const index=Number(button.dataset.ingredientIndex);
      if(!Number.isInteger(index)||index<0||index>=recipeIngredientsDraft.length)return;
      await loadIngredientChoices(index);
    }));

    holder.querySelectorAll('.ingredient-manual-search-open').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.ingredientIndex);
      if(!Number.isInteger(index)||index<0||index>=recipeIngredientsDraft.length)return;
      const item=recipeIngredientsDraft[index];
      recipeIngredientsDraft[index]={
        ...item,
        manualSearchOpen:true,
        manualSearchPending:false,
        manualSearchDone:false,
        manualSearchQuery:String(item.manualSearchQuery||ingredientSearchQuery(item)||ingredientSpecificSearchQuery(item)||'').trim(),
        manualSearchResults:[]
      };
      renderRecipeIngredientRows();
      requestAnimationFrame(()=>modal?.querySelector(`.ingredient-manual-search-input[data-ingredient-index="${index}"]`)?.focus());
    }));

    holder.querySelectorAll('.ingredient-manual-search-close').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.ingredientIndex);
      if(!Number.isInteger(index)||index<0||index>=recipeIngredientsDraft.length)return;
      recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],manualSearchOpen:false,manualSearchPending:false};
      renderRecipeIngredientRows();
    }));

    holder.querySelectorAll('.ingredient-manual-search-submit').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.ingredientIndex);
      if(Number.isInteger(index))void runIngredientManualSearch(index);
    }));

    holder.querySelectorAll('.ingredient-manual-search-input').forEach(input=>input.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      const index=Number(input.dataset.ingredientIndex);
      if(Number.isInteger(index))void runIngredientManualSearch(index);
    }));

    holder.querySelectorAll('.ingredient-manual-result').forEach(button=>button.addEventListener('click',async()=>{
      const index=Number(button.dataset.ingredientIndex);
      const resultIndex=Number(button.dataset.resultIndex);
      if(!Number.isInteger(index)||!Number.isInteger(resultIndex))return;
      const product=recipeIngredientsDraft[index]?.manualSearchResults?.[resultIndex];
      if(!product)return;
      await applyIngredientProduct(index,product);
      if(recipeIngredientsDraft[index])recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],manualSearchOpen:false,manualSearchResults:[],manualSearchPending:false};
      renderRecipeIngredientRows();
    }));

    updateRecipeCostSummary();
  }

  function renderRecipeSearchResults() {
    const holder = modal?.querySelector('#recipeProductResults');
    if (!holder) return;
    holder.innerHTML = recipeSearchResults.length ? recipeSearchResults.map((product,index)=>{
      const hasPrice = Number(product.price) > 0;
      const priceLabel = hasPrice
        ? Number(product.price).toLocaleString('nb-NO',{style:'currency',currency:'NOK'})
        : (product._pricePending ? 'Henter pris…' : 'Pris ikke tilgjengelig');
      return `<button type="button" class="recipe-product-result" data-index="${index}" ${!hasPrice?'data-price-missing="true"':''}>${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:''}<span><strong>${escapeHtml(product.eName)}</strong><small>${escapeHtml([product.brand,product.store,`${product.packageSize} ${product.unit}`].filter(Boolean).join(' · '))}</small></span><b>${priceLabel}</b></button>`;
    }).join('') : '';
    holder.querySelectorAll('.recipe-product-result').forEach(button=>button.addEventListener('click',()=>{
      const product = recipeSearchResults[Number(button.dataset.index)];
      if (!(Number(product?.price) > 0)) {
        showToast(product?._pricePending ? 'Prisen hentes fortsatt' : 'Pris er ikke tilgjengelig for dette produktet');
        return;
      }
      const ingredient = recipeProductToIngredient(product);
      recipeIngredientsDraft.push({...ingredient,ingredientName:ingredient.productName,usedQuantity:ingredient.packageQuantity,usedUnit:ingredient.packageUnit});
      recipeSearchResults=[]; renderRecipeSearchResults(); renderRecipeIngredientRows(); modalDirty=true;
    }));
  }

  async function searchRecipeProducts() {
    const input = modal?.querySelector('#recipeProductSearch');
    const query = String(input?.value||'').trim();
    if (query.length < 3) { showToast('Skriv minst tre tegn'); return; }
    const button = modal.querySelector('#recipeProductSearchBtn');
    try {
      button.disabled=true; button.textContent='Søker …';
      if (typeof window.searchKassalProductsForUi !== 'function') throw new Error('Produktsøket er ikke klart. Start appen på nytt.');
      const products = await window.searchKassalProductsForUi({search:query,sort:'price_asc',size:24,page:1,unique:false,exclude_without_ean:false,stores:[],categories:[]});
      button.textContent='Henter butikker og priser …';
      const expanded=await expandIngredientStoreCandidates((products||[]).slice(0,12),2);
      recipeSearchResults = expanded.sort((a,b)=>(Number(a.price)||Infinity)-(Number(b.price)||Infinity)).slice(0,24)
        .map(product => ({ ...product, _pricePending: false }));
      renderRecipeSearchResults();
      if (!recipeSearchResults.length) { showToast('Ingen produkter funnet'); return; }
    } catch (error) { showToast(error.message || 'Produktsøk feilet'); }
    finally { button.disabled=false; button.textContent='Søk'; }
  }

  async function findCheaperRecipeProduct(index) {
    const currentItem = recipeIngredientsDraft[index];
    const query = currentItem.ingredientName || currentItem.productName;
    try {
      if (typeof window.searchKassalProductsForUi !== 'function') throw new Error('Produktsøket er ikke klart.');
      const products = await window.searchKassalProductsForUi({search:query,sort:'price_asc',size:24,page:1,unique:false,exclude_without_ean:false,stores:[],categories:[]});
      const expanded=await expandIngredientStoreCandidates(products,1);
      const candidates=expanded
        .map(recipeProductToIngredient)
        .filter(item=>item.packagePrice>0&&compatibleUnits(item.packageUnit,currentItem.usedUnit));
      const currentUnitCost = Number(currentItem.packagePrice||0)/Math.max(1,baseQuantity(currentItem.packageQuantity,currentItem.packageUnit));
      const cheaper=candidates.find(item=>Number(item.packagePrice)/Math.max(1,baseQuantity(item.packageQuantity,item.packageUnit)) < currentUnitCost - 0.00001);
      if (!cheaper) { showToast('Fant ikke et billigere kompatibelt produkt'); return; }
      const oldCost=ingredientCost(currentItem);
      const replacement={...cheaper,ingredientName:currentItem.ingredientName,usedQuantity:currentItem.usedQuantity,usedUnit:currentItem.usedUnit};
      const saving=oldCost-ingredientCost(replacement);
      const accepted=await confirmAction({title:'Bytt til billigere produkt?',message:`${cheaper.productName} reduserer beregnet kostnad med ca. ${saving.toLocaleString('nb-NO',{style:'currency',currency:'NOK'})}.`,confirmLabel:'Bytt produkt',help:`${cheaper.store || 'Butikk ikke oppgitt'} · ${cheaper.packagePrice.toLocaleString('nb-NO',{style:'currency',currency:'NOK'})}`});
      if (accepted) { recipeIngredientsDraft[index]=replacement; renderRecipeIngredientRows(); modalDirty=true; }
    } catch(error) { showToast(error.message || 'Kunne ikke finne alternativ'); }
  }

  async function matchImportedIngredients() {
    if (ingredientMatchRunning) return;
    const candidates=recipeIngredientsDraft
      .map((item,index)=>({item,index}))
      .filter(({item})=>{
        if(item.manualMatch===true&&Array.isArray(item.matchCandidates)&&item.matchCandidates.length)return false;
        const unresolved=!item.productId||Number(item.packagePrice||0)<=0||item.matchStatus!=='matched';
        const missingChoices=!Array.isArray(item.matchCandidates)||item.matchCandidates.length===0;
        return unresolved||missingChoices;
      });
    if(!candidates.length){showToast('Alle ingrediensene er allerede matchet');return;}
    if(typeof window.searchKassalProductsForUi!=='function')throw new Error('Produktsøket er ikke klart.');
    ingredientMatchRunning=true;
    const button=modal?.querySelector('#matchImportedIngredientsBtn');
    const status=modal?.querySelector('#ingredientMatchStatus');
    const prefs=await loadIngredientMatchPreferences();
    let matched=0,suggested=0,unmatched=0,completed=0;
    try{
      if(button){button.disabled=true;button.textContent='Matcher …';}
      candidates.forEach(({index})=>{ recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],matchStatus:'searching',matchCandidates:[]}; });
      renderRecipeIngredientRows();
      if(status)status.textContent=`Søker etter produkter for ${candidates.length} ingredienser …`;

      let cursor=0;
      const worker=async()=>{
        while(true){
          const position=cursor++;
          if(position>=candidates.length)return;
          const {item,index}=candidates[position];
          const query=ingredientSearchQuery(item);
          if(query.length<2){
            recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],matchStatus:'unmatched',matchCandidates:[]};
            unmatched++; completed++; renderRecipeIngredientRows();
            if(status)status.textContent=`${completed} av ${candidates.length} ferdig`;
            continue;
          }
          try{
            const variants=ingredientSearchVariants(item);
            const learned=prefs[query]?.productId;
            const productMap=new Map();
            const addProducts=products=>{
              (products||[]).forEach(product=>{
                const key=String(product.ean||product.id||`${product.eName}:${product.store}`);
                if(!productMap.has(key))productMap.set(key,product);
              });
            };

            for(const variant of variants){
              const size=variant.kind==='specific'?16:24;
              addProducts(await searchProductsCached(variant.query,size));
            }

            const ranked=[...productMap.values()]
              .map(product=>({product,score:scoreIngredientProduct(item,product,learned)}))
              .sort((a,b)=>b.score-a.score||Number(a.product.price)-Number(b.product.price));

            const best=ranked[0];
            const second=ranked[1];
            const queryTokenCount=tokenSet(ingredientSearchQuery(item)).size;
            const safeThreshold=queryTokenCount<=1?0.90:0.86;
            const safeMargin=queryTokenCount<=1?0.14:0.10;
            const margin=best?best.score-(second?.score||0):0;
            const hasConflict=best?ingredientProductConflict(item,best.product)>0:false;
            const isLearned=Boolean(learned&&best&&String(best.product.id)===String(learned));
            const safe=best&&!hasConflict&&((isLearned&&best.score>=0.80)||(best.score>=safeThreshold&&margin>=safeMargin));
            const choices=ranked.slice(0,8).map(x=>x.product);

            if(safe){
              recipeIngredientsDraft[index]={
                ...recipeIngredientsDraft[index],
                ...recipeProductToIngredient(best.product),
                ingredientName:item.ingredientName,
                originalText:item.originalText,
                usedQuantity:item.usedQuantity,
                usedUnit:item.usedUnit,
                matchStatus:'matched',
                matchScore:best.score,
                matchCandidates:choices,
                selectedMatchKey:productCandidateKey(best.product),
                manualMatch:false
              };
              matched++;
            }else if(best&&best.score>=0.46){
              recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],matchStatus:'suggested',matchScore:best.score,matchCandidates:choices};suggested++;
            }else{
              recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],matchStatus:'unmatched',matchScore:best?.score||0,matchCandidates:choices};unmatched++;
            }
          }catch(error){
            recipeIngredientsDraft[index]={...recipeIngredientsDraft[index],matchStatus:'unmatched',matchCandidates:[],matchError:error.message||'Søk feilet'};unmatched++;
          }
          completed++;
          renderRecipeIngredientRows();
          if(status)status.textContent=`${completed} av ${candidates.length} ferdig · ${matched} sikre · ${suggested} forslag`;
        }
      };
      await Promise.all(Array.from({length:Math.min(2,candidates.length)},()=>worker()));

      const rawChoices=[],rawSeen=new Set();
      candidates.forEach(({index})=>{
        (recipeIngredientsDraft[index]?.matchCandidates||[]).forEach(product=>{
          const key=productBaseKey(product);
          if(key&&!rawSeen.has(key)){rawSeen.add(key);rawChoices.push(product);}
        });
      });
      if(rawChoices.length){
        const expandedAll=await expandIngredientStoreCandidates(rawChoices,2);
        const expandedByBase=new Map();
        expandedAll.forEach(product=>{
          const key=productBaseKey(product);
          if(!expandedByBase.has(key))expandedByBase.set(key,[]);
          expandedByBase.get(key).push(product);
        });
        candidates.forEach(({item,index})=>{
          const draft=recipeIngredientsDraft[index],hydrated=[];
          (draft?.matchCandidates||[]).forEach(product=>hydrated.push(...(expandedByBase.get(productBaseKey(product))||[product])));
          const learned=prefs[ingredientSearchQuery(item)]?.productId;
          const rankedHydrated=hydrated.map(product=>({product,score:scoreIngredientProduct(item,product,learned)}))
            .sort((a,b)=>b.score-a.score||(Number(a.product.price)||Infinity)-(Number(b.product.price)||Infinity))
            .slice(0,24).map(x=>x.product);
          const updated={...draft,matchCandidates:rankedHydrated};
          if(draft?.matchStatus==='matched'){
            const base=String(draft.ean||draft.productId||'');
            const resolved=rankedHydrated.filter(product=>productBaseKey(product)===base)
              .sort((a,b)=>(Number(a.price)||Infinity)-(Number(b.price)||Infinity))[0];
            if(resolved)Object.assign(updated,recipeProductToIngredient(resolved),{
              ingredientName:draft.ingredientName,originalText:draft.originalText,
              usedQuantity:draft.usedQuantity,usedUnit:draft.usedUnit,selectedMatchKey:productCandidateKey(resolved)
            });
          }
          recipeIngredientsDraft[index]=updated;
        });
        renderRecipeIngredientRows();
        updateRecipeCostSummary();
      }
      if(status)status.textContent=`${matched} sikre matcher · ${suggested} forslag · ${unmatched} må velges`;
      showToast(`Ingrediensmatching ferdig: ${matched} sikre, ${suggested+unmatched} til kontroll`);
      modalDirty=true;
    }finally{
      ingredientMatchRunning=false;
      if(button){button.disabled=false;button.textContent='Match importerte ingredienser';}
    }
  }

  function wireRecipeIngredientEditor() {
    recipeSearchResults = [];
    const searchInput = modal?.querySelector('#recipeProductSearch');
    if (searchInput) searchInput.value = '';
    renderRecipeIngredientRows();
    renderRecipeSearchResults();
    modal.querySelector('#recipeProductSearchBtn')?.addEventListener('click',searchRecipeProducts);
    modal.querySelector('#matchImportedIngredientsBtn')?.addEventListener('click',()=>matchImportedIngredients().catch(error=>showToast(error.message||'Matching feilet')));
    modal.querySelector('#recipeProductSearch')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchRecipeProducts();}});
    modal.querySelector('[name="servings"]')?.addEventListener('input',updateRecipeCostSummary);
  }


  function recipeFieldsHtml(schema, record) {
    const byKey=Object.fromEntries(schema.fields.map(field=>[field.key,field]));
    const render=key=>fieldHtml(byKey[key],record[key]);
    return `
      <div class="recipe-modal-top-grid">
        <section class="recipe-modal-section recipe-modal-basics">
          <div class="recipe-modal-section-title"><h3>Grunninformasjon</h3></div>
          <div class="recipe-modal-grid recipe-modal-grid-basics">
            ${render('name')}
            ${render('category')}
            ${render('servings')}
            ${render('time')}
            ${render('description')}
          </div>
        </section>
        <section class="recipe-modal-section recipe-modal-instructions">
          <div class="recipe-modal-section-title"><h3>Fremgangsmåte</h3></div>
          <div class="recipe-modal-grid">${fieldHtml({...byKey.instructions,label:''},record.instructions)}</div>
        </section>
      </div>
      <section class="recipe-modal-section recipe-modal-ingredients">
        <div class="recipe-modal-section-title"><h3>Ingredienser og kostnad</h3></div>
        <div class="recipe-modal-grid">
          ${render('recipeIngredients')}
          <div class="recipe-cost-fields">
            ${render('price')}
            ${render('pricePerServing')}
          </div>
        </div>
      </section>
      `;
  }

  async function open(page, id = null, initialRecord = null) {
    const schema = schemas[page];
    if (!schema) return;
    ensureModal();
    let record = id ? await BudgetDB.get(schema.store, Number(id)) : (initialRecord ? structuredClone(initialRecord) : {});
    record = record || {};
    if (page === 'recipes') {
      recipeSearchResults = [];
      record.tagsText = (record.tags || []).join(', ');
      record.allergensText = (record.allergens || []).join(', ');
      recipeIngredientsDraft = (record.ingredients || []).map(item => ({...item}));
    }
    if (page === 'budget') {
      // Present the simple budget model while preserving compatibility with older records.
      if (!record.startDate && record.month) record.startDate = `${record.month}-01`;
      record.budgetMonth = selectedBudgetMonth(record);
      record.appliesTo = budgetAppliesTo(record);
      record.calendarWeek = record.calendarWeek || '';
      if (!record.name) record.name = record.category || '';
    }
    if (['income','expenses'].includes(page)) {
      record.periodMonth = selectedEntryMonth(record, page);
      record.appliesTo = entryAppliesTo(record);
      record.calendarWeek = record.calendarWeek || '';
    }
    if (!id && activePeriod) {
      const [selectedYear, selectedScope] = activePeriod.split('-');
      const selectedMonth = selectedScope === 'all' ? String(new Date().getMonth()+1).padStart(2,'0') : selectedScope;
      const editingPeriod = `${selectedYear}-${selectedMonth}`;
      const periodDate = `${editingPeriod}-01`;
      if (page === 'budget') {
        record.budgetMonth = editingPeriod;
        record.appliesTo = 'selected_month';
        record.calendarWeek = '';
      }
      if (['income','expenses'].includes(page)) {
        record.periodMonth = editingPeriod;
        record.appliesTo = 'selected_month';
        record.calendarWeek = '';
      }
      if (page === 'mealplan' && !record.date) record.date = periodDate;
      if (page === 'shopping') record.purchaseDate = periodDate;
    }
    current = { page, schema, id:id ? Number(id) : null, record };
    modal.querySelector('#crudEyebrow').textContent = id ? 'Rediger' : 'Ny post';
    modal.querySelector('#crudTitle').textContent = `${id ? 'Rediger' : 'Ny'} ${schema.title}`;
    modal.querySelector('#crudFields').innerHTML = page==='recipes' ? recipeFieldsHtml(schema,record) : schema.fields.map(f => fieldHtml(f, record[f.key])).join('');
    modal.querySelector('.crud-modal')?.classList.toggle('income-expense-modal',['income','expenses'].includes(page));
    modal.querySelector('.crud-modal')?.classList.toggle('income-modal',page==='income');
    modal.querySelector('.crud-modal')?.classList.toggle('expense-modal',page==='expenses');
    modal.querySelector('.crud-modal')?.classList.toggle('recipe-modal',page==='recipes');
    if (['budget','income','expenses'].includes(page)) {
      const appliesTo = modal.querySelector('[name="appliesTo"]');
      const calendarWeek = modal.querySelector('[name="calendarWeek"]');
      const syncCalendarWeek = () => {
        const monthSpecific = appliesTo?.value === 'selected_month';
        if (calendarWeek) {
          calendarWeek.disabled = !monthSpecific;
          if (!monthSpecific) calendarWeek.value = '';
        }
      };
      appliesTo?.addEventListener('change', syncCalendarWeek);
      syncCalendarWeek();
    }
    if (page === 'categories') {
      const nameInput = modal.querySelector('#crud-name');
      if (nameInput) {
        nameInput.disabled = false;
        nameInput.readOnly = false;
        nameInput.removeAttribute('readonly');
        nameInput.removeAttribute('disabled');
        nameInput.autocomplete = 'off';
        nameInput.style.pointerEvents = 'auto';
        nameInput.style.userSelect = 'text';
      }
    }
    if (page === 'mealplan') {
      const nameInput = modal.querySelector('[name="name"]');
      const costInput = modal.querySelector('[name="estimatedCost"]');
      const applyRecipe = () => {
        const recipe = (AppState.recipes || []).find(r => String(r.name || '').toLocaleLowerCase('nb-NO') === String(nameInput?.value || '').trim().toLocaleLowerCase('nb-NO'));
        if (recipe && costInput && (!costInput.value || Number(costInput.value) === 0)) costInput.value = MealPlanningEngine.estimatedCost({name:recipe.name,persons:modal.querySelector('[name="persons"]')?.value},AppState.recipes||[]);
      };
      nameInput?.addEventListener('change', applyRecipe);
      nameInput?.addEventListener('input', applyRecipe);
    }

    if (page === 'recipes') {
      wireRecipeIngredientEditor();
      if (!id && record.sourceUrl && recipeIngredientsDraft.some(item=>!item.productId)) {
        setTimeout(()=>matchImportedIngredients().catch(error=>showToast(error.message||'Automatisk matching feilet')),150);
      }
    }

    modal.querySelector('#crudDelete').classList.toggle('hidden', !id);
    modalDirty = false;
    modal.classList.remove('hidden');
    const firstField = page === 'categories' ? modal.querySelector('#crud-name') : modal.querySelector('input,select,textarea');
    requestAnimationFrame(() => firstField?.focus());
  }

  function close() { modalDirty = false; recipeSearchResults = []; recipeIngredientsDraft = []; modal?.classList.add('hidden'); current = null; }
  async function requestClose() {
    if (!modalDirty) { close(); return; }
    const discard = await confirmAction({title:'Forkast endringer?',message:'Du har ulagrede endringer.',confirmLabel:'Forkast',help:'Endringene blir ikke lagret.'});
    if (discard) close();
  }

  async function syncShoppingExpense(item, itemId) {
    const expenses = await BudgetDB.getAll('expenses');
    const linked = expenses.find(x => Number(x.shoppingItemId) === Number(itemId));
    const shouldBook = Boolean(item.checked && !item.atHome && Number(item.price || 0) > 0);
    if (!shouldBook) {
      if (linked?.id) await BudgetDB.remove('expenses', linked.id);
      return;
    }
    const record = ShoppingEngine.expenseRecord(item, itemId, linked);
    linked?.id ? await BudgetDB.put('expenses', record) : await BudgetDB.add('expenses', record);
  }

  async function updateShoppingState(id, patch = {}) {
    const itemId = Number(id);
    if (!Number.isFinite(itemId) || itemId <= 0) return;
    const item = await BudgetDB.get('shoppingItems', itemId);
    if (!item) return;
    const next = {...item, ...patch, id:itemId, updatedAtSystem:new Date().toISOString()};
    if (Object.prototype.hasOwnProperty.call(patch, 'checked')) {
      if (next.checked && !next.purchaseDate) next.purchaseDate = new Date().toISOString().slice(0,10);
      if (!next.checked) next.purchaseDate = '';
    }
    await BudgetDB.put('shoppingItems', next);
    await syncShoppingExpense(next, itemId);
    await Backend.automaticBackup();
    await Backend.loadSnapshot(activePeriod);
    syncPeriodSelect();
    renderPage();
  }

  async function addShoppingWithPantryGate(record, options = {}) {
    const candidate = {...record};
    const pantry = await BudgetDB.getAll('pantryItems');
    const need = ShoppingEngine.shoppingNeed(candidate, pantry);
    let addQuantity = need.requested;
    let overridden = false;

    if (need.state === 'CONFIRM_ALREADY_STOCKED') {
      const accepted = await confirmAction({
        title:'Varen finnes i Matlager',
        message:`Du har allerede ${need.inStock} ${need.unit} av ${candidate.name || 'varen'} i Matlager. Legge til likevel?`,
        confirmLabel:'Legg til likevel',
        help:'Handlelisten skal normalt bare inneholde varer du faktisk trenger å kjøpe.'
      });
      if (!accepted) return {added:false,cancelled:true,need};
      overridden = true;
    } else if (need.state === 'ADD_REMAINDER') {
      addQuantity = need.remaining;
    }

    if (!(addQuantity > 0)) return {added:false,cancelled:true,need};
    const originalQuantity = Math.max(0.0001, Number(candidate.quantity || need.requested || 1));
    const ratio = addQuantity / originalQuantity;
    candidate.quantity = addQuantity;
    if (Number(candidate.price || 0) > 0 && need.state === 'ADD_REMAINDER') candidate.price = Number((Number(candidate.price) * ratio).toFixed(2));
    candidate.atHome = false;
    if (candidate.checked == null) candidate.checked = false;
    candidate.updatedAtSystem = new Date().toISOString();

    let existing = null;
    if (options.mergeExact && (candidate.ean || candidate.kassalProductId)) {
      const all = await BudgetDB.getAll('shoppingItems');
      existing = all.find(item => !item.checked && (
        (candidate.ean && item.ean && String(candidate.ean) === String(item.ean)) ||
        (candidate.kassalProductId && item.kassalProductId && String(candidate.kassalProductId) === String(item.kassalProductId))
      ));
    }

    let savedId;
    if (existing) {
      const previousQuantity = Number(existing.quantity || 0);
      const nextQuantity = previousQuantity + addQuantity;
      const next = {...existing, ...candidate, id:existing.id, quantity:nextQuantity};
      if (Number(candidate.unitPrice || 0) > 0) next.price = Number((Number(candidate.unitPrice) * nextQuantity).toFixed(2));
      else if (Number(existing.price || 0) > 0 && Number(candidate.price || 0) > 0) next.price = Number((Number(existing.price) + Number(candidate.price)).toFixed(2));
      await BudgetDB.put('shoppingItems', next);
      savedId = existing.id;
    } else {
      savedId = await BudgetDB.add('shoppingItems', candidate);
    }
    return {added:true,savedId,need,addedQuantity:addQuantity,overridden,record:candidate,merged:Boolean(existing)};
  }

  async function save(event) {
    event.preventDefault();
    if (!current) return;
    const data = { ...current.record };
    for (const field of current.schema.fields) {
      const element = modal.querySelector(`[name="${field.key}"]`);
      if (!element) continue;
      if (field.type === 'checkbox') data[field.key] = element.checked;
      else if (field.type === 'number') data[field.key] = element.value === '' ? 0 : Number(element.value);
      else data[field.key] = element.value.trim();
    }
    if (current.page === 'recipes') {
      data.ingredients = recipeIngredientsDraft.map(item => { const {manualSearchResults,manualSearchPending,manualSearchQuery,matchError,...stored}=item; return {...stored, cost:Number(PricingEngine.ingredientCost(item).toFixed(2))}; });
      const recipePricing = PricingEngine.recipeCost(data.ingredients, data.servings);
      data.price = recipePricing.total;
      data.pricePerServing = recipePricing.perServing;
      data.tags = data.tagsText.split(',').map(x=>x.trim()).filter(Boolean);
      data.allergens = data.allergensText.split(',').map(x=>x.trim()).filter(Boolean);
      delete data.tagsText; delete data.allergensText;
    }
    if (current.page === 'mealplan') {
      Object.assign(data,MealPlanningEngine.normalizePlan(data,AppState.recipes||[]));
    }
    if (current.page === 'budget') {
      const monthKey = selectedBudgetMonth(data);
      const frequencyByScope = {
        selected_month:'Engangs',
        monthly:'Månedlig',
        quarterly:'Kvartalsvis',
        yearly:'Årlig'
      };
      data.budgetMonth = monthKey;
      data.startDate = `${monthKey}-01`;
      data.endDate = '';
      data.frequency = frequencyByScope[data.appliesTo] || 'Engangs';
      if (data.appliesTo !== 'selected_month') data.calendarWeek = '';
      const existingBudgets = await BudgetDB.getAll('budgets');
      const sameCategory = existingBudgets.filter(item => Number(item.id) !== Number(current.id || 0) && String(item.category || '').trim().toLocaleLowerCase('nb-NO') === String(data.category || '').trim().toLocaleLowerCase('nb-NO') && budgetAppliesInMonth(item, monthKey));
      const conflicting = sameCategory.find(item => {
        const existingWeek = item.calendarWeek || '';
        const candidateWeek = data.calendarWeek || '';
        return !existingWeek || !candidateWeek || existingWeek === candidateWeek;
      });
      if (conflicting) {
        const detail = conflicting.calendarWeek ? `uke ${Number(String(conflicting.calendarWeek).split('W')[1])}` : 'hele måneden';
        showToast(`Det finnes allerede et budsjett for ${data.category} (${detail}) i valgt måned`);
        return;
      }
      delete data.month;
      delete data.actual;
    }
    if (['income','expenses'].includes(current.page)) {
      const monthKey = selectedEntryMonth(data, current.page);
      const frequencyByScope = {
        selected_month:'Engangs',
        monthly:'Månedlig',
        quarterly:'Kvartalsvis',
        yearly:'Årlig'
      };
      data.periodMonth = monthKey;
      data.frequency = frequencyByScope[data.appliesTo] || 'Engangs';
      if (data.appliesTo !== 'selected_month') data.calendarWeek = '';
      const occurrenceDate = dateForMonthAndWeek(monthKey, data.calendarWeek);
      if (current.page === 'income') data.date = occurrenceDate;
      else data.dueDate = occurrenceDate;
      data.endDate = '';
    }
    if (current.page === 'savings') {
      data.current = Number(current.record?.current || 0);
      data.createdAt = current.record?.createdAt || new Date().toISOString();
      data.active = data.active !== false;
      data.useSurplus = data.useSurplus !== false;
    }
    if (current.page === 'categories' || current.page === 'general') {
      const standardCategory=current.record?.standard===true;
      if(standardCategory){
        data.name=current.record.name;
        data.type=current.record.type;
        data.mode=current.record.mode;
        data.active=current.record.active!==false;
        data.standard=true;
        data.system=false;
      } else if(current.id) data.active=current.record?.active!==false;
      else data.active=true;
      data.name = String(data.name || '').trim();
      if (!data.name) { showToast('Skriv inn kategorinavn'); return; }
      const existingCategories = await BudgetDB.getAll('categories');
      const duplicate = existingCategories.find(x => Number(x.id) !== Number(current.id || 0) && String(x.name || '').trim().toLocaleLowerCase('nb-NO') === data.name.toLocaleLowerCase('nb-NO'));
      if (duplicate) { showToast('Kategorien finnes allerede'); return; }
      if (!data.type) data.type = 'Utgift';
      if (!data.mode) data.mode = 'Variabel';
      if (!data.color) data.color = '#4f6ef7';
    }
    data.updatedAtSystem = new Date().toISOString();
    if (current.page === 'shopping' && !current.id) {
      const result = await addShoppingWithPantryGate(data);
      if (!result.added) return;
      await Backend.automaticBackup();
      await Backend.loadSnapshot(activePeriod);
      syncPeriodSelect(); modalDirty = false; close(); renderPage();
      showToast(result.need.state === 'ADD_REMAINDER' ? `Matlager dekker noe av behovet – ${result.addedQuantity} ${data.unit || ''} lagt til` : 'Lagret');
      return;
    }
    let savedId = current.id;
    if (current.id) { data.id = current.id; await BudgetDB.put(current.schema.store, data); }
    else savedId = await BudgetDB.add(current.schema.store, data);
    if (current.page === 'shopping') await syncShoppingExpense(data, savedId);
    await Backend.automaticBackup();
    await Backend.loadSnapshot(activePeriod);
    syncPeriodSelect(); modalDirty = false; close(); renderPage(); showToast('Lagret');
  }

  async function remove() {
    if (!current?.id) return;
    if(current.page==='general' && current.record?.standard===true){
      const accepted=await confirmAction({title:'Fjern standardkategori',message:`Fjerne ${current.record.name} fra aktive kategorier?`,confirmLabel:'Fjern',help:'Historiske poster beholder kategorien. Den kan legges til igjen senere.'});
      if(!accepted)return;
      await BudgetDB.put('categories',{...current.record,active:false,standard:true,system:false,updatedAtSystem:new Date().toISOString()});
      await Backend.automaticBackup(); await Backend.loadSnapshot(activePeriod);
      syncPeriodSelect(); modalDirty=false; close(); renderPage(); showToast('Kategori fjernet fra aktiv bruk'); return;
    }
    const accepted = await confirmAction({
      title:'Slett post',
      message:`Vil du slette denne ${current.schema.title}en?`,
      confirmLabel:'Slett'
    });
    if (!accepted) return;
    if (current.page === 'shopping') {
      const expenses = await BudgetDB.getAll('expenses');
      const linked = expenses.find(x => Number(x.shoppingItemId) === Number(current.id));
      if (linked?.id) await BudgetDB.remove('expenses', linked.id);
    }
    if (['income','expenses'].includes(current.page)) {
      const sourceType = current.page === 'income' ? 'income' : 'expense';
      const overrides = await BudgetDB.getAll('occurrenceOverrides');
      for (const item of overrides.filter(x => x.sourceType === sourceType && Number(x.sourceId) === Number(current.id))) await BudgetDB.remove('occurrenceOverrides', item.id);
    }
    await BudgetDB.remove(current.schema.store, current.id);
    await Backend.automaticBackup();
    await Backend.loadSnapshot(activePeriod);
    syncPeriodSelect(); modalDirty = false; close(); renderPage(); showToast('Slettet');
  }


  let occurrenceModal;
  let occurrenceContext = null;

  function ensureOccurrenceModal() {
    if (occurrenceModal) return occurrenceModal;
    occurrenceModal = document.createElement('div');
    occurrenceModal.className = 'modal-backdrop hidden';
    occurrenceModal.id = 'occurrenceModalBackdrop';
    occurrenceModal.innerHTML = `<section class="modal crud-modal" role="dialog" aria-modal="true">
      <header class="modal-header"><div><span class="eyebrow">Månedsavvik</span><h2 id="occurrenceTitle">Rediger forekomst</h2></div><button class="icon-btn ghost" id="occurrenceClose">×</button></header>
      <form id="occurrenceForm"><div class="modal-body"><p class="muted" id="occurrenceHelp"></p><div class="form-grid two-col">
        <label class="field"><span>Beløp denne måneden</span><input name="amount" type="number" step="0.01" required></label>
        <label class="field"><span>Status</span><select name="status" id="occurrenceStatus"></select></label>
        <label class="field"><span>Faktisk mottatt/betalt</span><input name="actualAmount" type="number" min="0" step="0.01"></label>
        <label class="field"><span>Dato denne måneden</span><input name="date" type="date"></label>
      </div></div><footer class="modal-footer"><button type="button" class="btn danger hidden" id="occurrenceReset">Fjern månedsavvik</button><span class="modal-spacer"></span><button type="button" class="btn secondary" id="occurrenceCancel">Avbryt</button><button type="submit" class="btn primary">Lagre for måneden</button></footer></form>
    </section>`;
    document.body.appendChild(occurrenceModal);
    const closeOccurrence = () => { occurrenceDirty = false; occurrenceModal.classList.add('hidden'); occurrenceContext = null; };
    const requestOccurrenceClose = async () => {
      if (!occurrenceDirty) { closeOccurrence(); return; }
      const discard = await confirmAction({title:'Forkast endringer?',message:'Du har ulagrede endringer i månedsavviket.',confirmLabel:'Forkast',help:'Endringene blir ikke lagret.'});
      if (discard) closeOccurrence();
    };
    occurrenceModal.querySelector('#occurrenceClose').addEventListener('click', requestOccurrenceClose);
    occurrenceModal.querySelector('#occurrenceCancel').addEventListener('click', requestOccurrenceClose);
    occurrenceModal.querySelector('#occurrenceForm').addEventListener('input', () => { occurrenceDirty = true; });
    occurrenceModal.querySelector('#occurrenceForm').addEventListener('change', () => { occurrenceDirty = true; });
    occurrenceModal.querySelector('#occurrenceForm').addEventListener('submit', saveOccurrence);
    occurrenceModal.querySelector('#occurrenceReset').addEventListener('click', resetOccurrence);
    return occurrenceModal;
  }

  async function findOccurrenceOverride(sourceType, sourceId, period) {
    const overrides = await BudgetDB.getAll('occurrenceOverrides');
    return overrides.find(x => x.sourceType === sourceType && Number(x.sourceId) === Number(sourceId) && x.period === period) || null;
  }

  async function openOccurrence(page, id) {
    const parts = String(activePeriod || '').split('-');
    if (parts[1] === 'all') { showToast('Velg en konkret måned for å registrere månedsavvik'); return; }
    const schema = schemas[page];
    if (!schema || !['income','expenses'].includes(page)) return;
    ensureOccurrenceModal();
    const sourceType = page === 'income' ? 'income' : 'expense';
    const record = await BudgetDB.get(schema.store, Number(id));
    if (!record) return;
    const existing = await findOccurrenceOverride(sourceType, id, activePeriod);
    const dateKey = page === 'income' ? 'date' : 'dueDate';
    const defaultStatus = FinanceEngine.defaultOccurrenceStatus(record, sourceType);
    const title = page === 'income' ? record.name : record.description;
    const statusOptions = page === 'income' ? ['Forventet','Mottatt','Ikke mottatt'] : ['Ubetalt','Betalt','Delvis'];
    occurrenceContext = { page, sourceType, sourceId:Number(id), period:activePeriod, record, existing };
    occurrenceModal.querySelector('#occurrenceTitle').textContent = `${title} · ${activePeriod}`;
    occurrenceModal.querySelector('#occurrenceHelp').textContent = 'Dette endrer bare valgt måned. Grunnposten og andre måneder beholdes uendret.';
    occurrenceModal.querySelector('[name="amount"]').value = existing?.amount ?? record.amount ?? 0;
    occurrenceModal.querySelector('[name="date"]').value = existing?.date || record[dateKey] || '';
    occurrenceModal.querySelector('[name="actualAmount"]').value = existing?.actualAmount ?? '';
    occurrenceModal.querySelector('#occurrenceStatus').innerHTML = statusOptions.map(value => `<option value="${value}" ${(existing?.status || defaultStatus) === value ? 'selected' : ''}>${value}</option>`).join('');
    const statusSelect = occurrenceModal.querySelector('#occurrenceStatus');
    const amountInput = occurrenceModal.querySelector('[name="amount"]');
    const actualInput = occurrenceModal.querySelector('[name="actualAmount"]');
    statusSelect.addEventListener('change', () => {
      if (['Mottatt','Betalt'].includes(statusSelect.value)) actualInput.value = amountInput.value;
      else if (['Forventet','Ubetalt','Ikke mottatt'].includes(statusSelect.value)) actualInput.value = 0;
    }, { once:false });
    occurrenceModal.querySelector('#occurrenceReset').classList.toggle('hidden', !existing);
    occurrenceDirty = false;
    occurrenceModal.classList.remove('hidden');
  }

  async function saveOccurrence(event) {
    event.preventDefault();
    if (!occurrenceContext) return;
    const form = occurrenceModal.querySelector('#occurrenceForm');
    const payload = {
      ...(occurrenceContext.existing || {}),
      sourceType:occurrenceContext.sourceType,
      sourceId:occurrenceContext.sourceId,
      period:occurrenceContext.period,
      amount:Number(form.elements.amount.value || 0),
      actualAmount:form.elements.actualAmount.value === '' ? '' : Number(form.elements.actualAmount.value),
      status:form.elements.status.value,
      date:form.elements.date.value || '',
      updatedAtSystem:new Date().toISOString()
    };
    payload.id ? await BudgetDB.put('occurrenceOverrides', payload) : await BudgetDB.add('occurrenceOverrides', payload);
    await Backend.automaticBackup();
    await Backend.loadSnapshot(activePeriod);
    occurrenceDirty = false; occurrenceModal.classList.add('hidden'); occurrenceContext = null; renderPage(); showToast('Månedsavvik lagret');
  }

  async function resetOccurrence() {
    if (!occurrenceContext?.existing?.id) return;
    await BudgetDB.remove('occurrenceOverrides', occurrenceContext.existing.id);
    await Backend.automaticBackup();
    await Backend.loadSnapshot(activePeriod);
    occurrenceDirty = false; occurrenceModal.classList.add('hidden'); occurrenceContext = null; renderPage(); showToast('Månedsavvik fjernet');
  }

  function actionButtons(id, page = activePage) {
    const occurrence = ['income','expenses'].includes(page) && !String(activePeriod || '').endsWith('-all') ? `<button class="btn secondary small occurrence-edit" data-id="${id}">Månedsavvik</button>` : '';
    const categoryRecord=page==='general'?(AppState.categories||[]).find(x=>Number(x.id)===Number(id)):null;
    const editLabel=page==='general'?'Rediger':'Rediger grunnpost';
    const removeLabel=categoryRecord?.standard?'Fjern':'Slett';
    return `<div class="row-actions"><button class="btn secondary small crud-edit" data-id="${id}">${editLabel}</button>${occurrence}<button class="btn danger small crud-remove" data-id="${id}">${removeLabel}</button></div>`;
  }

  function decorateTable(ids) {
    const table = content.querySelector('table');
    if (!table || !ids?.length) return;
    table.querySelector('thead tr')?.insertAdjacentHTML('beforeend','<th class="table-actions-column">Handlinger</th>');
    [...table.querySelectorAll('tbody tr')].filter(row=>!row.classList.contains('table-state-row')).forEach((row,index)=>{
      const explicitId = Number(row.dataset.crudId);
      const id = Number.isFinite(explicitId) && explicitId > 0 ? explicitId : ids[index];
      if (!id) return;
      row.insertAdjacentHTML('beforeend',`<td class="table-actions-column">${actionButtons(id, activePage)}</td>`);
    });
  }

  function decorateCards(selector, items) {
    [...content.querySelectorAll(selector)].forEach((card,index)=>{
      const explicitId = Number(card.dataset.crudId);
      const id = Number.isFinite(explicitId) && explicitId > 0 ? explicitId : items[index]?.id;
      if (!id) return;
      card.insertAdjacentHTML('beforeend',`<div class="card-actions">${actionButtons(id, activePage)}</div>`);
    });
  }

  let standardCategoryModal;
  function ensureStandardCategoryModal(){
    if(standardCategoryModal)return standardCategoryModal;
    standardCategoryModal=document.createElement('div');
    standardCategoryModal.className='modal-backdrop hidden';
    standardCategoryModal.id='standardCategoryModalBackdrop';
    standardCategoryModal.innerHTML=`<section class="modal crud-modal standard-category-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><span class="eyebrow">Kategorier</span><h2>Legg til standardkategori</h2></div><button class="icon-btn ghost" id="standardCategoryClose">×</button></header><div class="modal-body"><div id="standardCategoryList" class="standard-category-list"></div></div><footer class="modal-footer"><span class="modal-spacer"></span><button type="button" class="btn secondary" id="standardCategoryDone">Lukk</button></footer></section>`;
    document.body.appendChild(standardCategoryModal);
    const close=()=>standardCategoryModal.classList.add('hidden');
    standardCategoryModal.querySelector('#standardCategoryClose').addEventListener('click',close);
    standardCategoryModal.querySelector('#standardCategoryDone').addEventListener('click',close);
    return standardCategoryModal;
  }
  function openStandardCategoryModal(){
    const dialog=ensureStandardCategoryModal();
    const inactive=(AppState.categories||[]).filter(x=>x.standard===true&&x.active===false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'nb-NO'));
    const list=dialog.querySelector('#standardCategoryList');
    list.innerHTML=inactive.length?inactive.map(item=>`<button type="button" class="standard-category-choice" data-id="${item.id}"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)}</small></span><span>Legg til</span></button>`).join(''):`<p class="muted">Alle standardkategorier er allerede i aktiv bruk.</p>`;
    list.querySelectorAll('.standard-category-choice').forEach(btn=>btn.addEventListener('click',async()=>{const record=await BudgetDB.get('categories',Number(btn.dataset.id)); if(!record)return; await BudgetDB.put('categories',{...record,active:true,standard:true,system:false,updatedAtSystem:new Date().toISOString()}); await Backend.automaticBackup(); await Backend.loadSnapshot(activePeriod); dialog.classList.add('hidden'); renderPage(); showToast(`${record.name} lagt til`);}));
    dialog.classList.remove('hidden');
  }

  function wire() {
    const schema = schemas[activePage];
    if (!schema) return;
    const headerButtons = [...content.querySelectorAll('.page-header .btn')];
    const addButton = headerButtons.find(btn => /Ny|Legg til|Manuell vare/.test(btn.textContent));
    if (addButton) addButton.addEventListener('click', () => open(activePage));
    if(activePage==='general'){
      content.querySelector('#newCategoryBtn')?.addEventListener('click',()=>open('general'));
      content.querySelector('#addStandardCategoryBtn')?.addEventListener('click',openStandardCategoryModal);
    }

    const tableIds = {
      budget:(AppState.budgets||[]).map(x=>x[3]), income:(AppState.incomes||[]).map(x=>x[6]), expenses:(AppState.expenses||[]).map(x=>x[6]),
      mealplan:(AppState.mealPlans||[]).map(x=>x.id), shopping:(AppState.shoppingItems||[]).map(x=>x.id), pantry:(AppState.pantryItems||[]).map(x=>x.id), categories:(AppState.categories||[]).map(x=>x.id), general:(AppState.categories||[]).filter(x=>x.active!==false).map(x=>x.id)
    };
    if (tableIds[activePage]) decorateTable(tableIds[activePage]);
    if (activePage==='loans') decorateCards('.loan-card',AppState.loans);
    if (activePage==='savings') decorateCards('.goal-card',AppState.goals);

    content.querySelectorAll('.crud-edit').forEach(btn=>btn.addEventListener('click',()=>open(activePage,btn.dataset.id)));
    content.querySelectorAll('.occurrence-edit').forEach(btn=>btn.addEventListener('click',()=>openOccurrence(activePage,btn.dataset.id)));
    content.querySelectorAll('.crud-remove').forEach(btn=>btn.addEventListener('click',async()=>{
      const record = await BudgetDB.get(schema.store,Number(btn.dataset.id));
      current={page:activePage,schema,id:Number(btn.dataset.id),record}; await remove();
    }));
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (confirmDialog && !confirmDialog.classList.contains('hidden')) return;
    if (occurrenceModal && !occurrenceModal.classList.contains('hidden')) {
      event.preventDefault();
      occurrenceModal.querySelector('#occurrenceCancel')?.click();
      return;
    }
    if (modal && !modal.classList.contains('hidden')) {
      event.preventDefault();
      modal.querySelector('#crudCancel')?.click();
    }
  });

  window.CRUD = { wire, open, updateShoppingState, addShoppingWithPantryGate };
})();
