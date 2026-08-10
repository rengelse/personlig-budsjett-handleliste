(() => {
  const seed = window.APP_SEED;
  const dateToIso = value => {
    if (!value || value === 'Løpende') return '2026-08-05';
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  };
  const monthKey = value => /^\d{4}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 7) : '';
  const sum = (items, getter) => (items || []).reduce((total, item) => total + Number(getter(item) || 0), 0);

  function mapSeed() {
    return {
      incomes: seed.incomes.map(r => ({ name:r[0], amount:r[1], date:dateToIso(r[2]), frequency:r[3], category:r[4], status:r[5], taxable:true })),
      expenses: seed.expenses.map(r => ({ description:r[0], amount:r[1], dueDate:dateToIso(r[2]), category:r[3], frequency:r[4], status:r[5], automatic:r[4] === 'Månedlig', type:r[4] === 'Variabel' ? 'Variabel' : 'Fast', note:'' })),
      loans: seed.loans.map(x => ({...x, rateType:'Flytende', fee:0, paymentDay:15, interestOnlyMonths:0, includePayment:false, automaticPayment:true, expenseCategory:'Lån og gjeld'})),
      goals: seed.goals.map(x => ({...x})),
      budgets: seed.budgets.map(r => ({ name:r[0], category:r[0], planned:r[1], frequency:'Månedlig', startDate:'2026-08-01', endDate:'', active:true, warningLimit:90 })),
      recipes: seed.recipes.map(x => ({...x, description:'', instructions:'', allergens:[], nutrition:''})),
      ingredients: seed.ingredients.map(r => ({ name:r[0], unit:r[1], packageSize:r[2], price:r[3], store:r[4], category:r[5], updatedAt:dateToIso(r[6]), alternative:'' })),
      mealPlans: [{name:'Kyllingpasta',date:'2026-08-05',mealType:'Middag',persons:2,estimatedCost:128,leftovers:false,freezerPortions:2}],
      shoppingItems: [
        {name:'Kyllingfilet',quantity:1.4,unit:'kg',category:'Kjøtt',recipe:'Kremet kyllingpasta, wraps',price:239.80,purchaseDate:'2026-08-05',atHome:false,checked:false},
        {name:'Pasta',quantity:500,unit:'g',category:'Tørrvarer',recipe:'Kremet kyllingpasta',price:24.90,purchaseDate:'2026-08-05',atHome:false,checked:false},
        {name:'Løk',quantity:1,unit:'kg',category:'Grønnsaker',recipe:'3 oppskrifter',price:26.90,purchaseDate:'2026-08-05',atHome:true,checked:false}
      ],
      pantryItems: [
        {name:'Ris',quantity:750,unit:'g',purchaseDate:'2026-07-18',expiryDate:'2027-12-18',minimum:500,location:'Skap'},
        {name:'Kyllingfilet',quantity:600,unit:'g',purchaseDate:'2026-08-02',expiryDate:'2026-08-12',minimum:400,location:'Fryser'},
        {name:'Melk',quantity:1,unit:'l',purchaseDate:'2026-08-04',expiryDate:'2026-08-10',minimum:1,location:'Kjøleskap'}
      ],
      categories: [
        {name:'Bolig', type:'Utgift', mode:'Fast', active:true},{name:'Mat', type:'Utgift', mode:'Variabel', active:true},
        {name:'Lønn', type:'Inntekt', mode:'Fast', active:true},{name:'Transport', type:'Utgift', mode:'Variabel', active:true},
        {name:'Sparing', type:'Overføring', mode:'Fast', active:true}
      ],
      settings: [{key:'seeded', value:true},{key:'theme', value:'light'},{key:'autoBackup', value:true},{key:'backupRetention', value:14}]
    };
  }

  const STANDARD_CATEGORIES = [
    {name:'Mat',type:'Utgift',mode:'Variabel',color:'#16a34a'},
    {name:'Lån',type:'Utgift',mode:'Fast',color:'#7c3aed'},
    {name:'Lønn',type:'Inntekt',mode:'Fast',color:'#0ea5e9'},
    {name:'Bolig',type:'Utgift',mode:'Fast',color:'#4f6ef7'},
    {name:'Strøm',type:'Utgift',mode:'Variabel',color:'#eab308'},
    {name:'Internett',type:'Utgift',mode:'Fast',color:'#2563eb'},
    {name:'Telefon',type:'Utgift',mode:'Fast',color:'#0891b2'},
    {name:'Forsikring',type:'Utgift',mode:'Fast',color:'#9333ea'},
    {name:'Transport',type:'Utgift',mode:'Variabel',color:'#f59e0b'},
    {name:'Drivstoff',type:'Utgift',mode:'Variabel',color:'#ea580c'},
    {name:'Bil',type:'Utgift',mode:'Variabel',color:'#64748b'},
    {name:'Helse',type:'Utgift',mode:'Variabel',color:'#dc2626'},
    {name:'Klær',type:'Utgift',mode:'Variabel',color:'#db2777'},
    {name:'Fritid',type:'Utgift',mode:'Variabel',color:'#0d9488'},
    {name:'Underholdning',type:'Utgift',mode:'Variabel',color:'#8b5cf6'},
    {name:'Abonnement',type:'Utgift',mode:'Fast',color:'#6366f1'},
    {name:'Barn',type:'Utgift',mode:'Variabel',color:'#ec4899'},
    {name:'Kjæledyr',type:'Utgift',mode:'Variabel',color:'#84cc16'},
    {name:'Reiser',type:'Utgift',mode:'Variabel',color:'#06b6d4'},
    {name:'Gaver',type:'Utgift',mode:'Variabel',color:'#f43f5e'},
    {name:'Sparing',type:'Utgift',mode:'Fast',color:'#22c55e'},
    {name:'Andre utgifter',type:'Utgift',mode:'Variabel',color:'#6b7280'},
    {name:'Bonus',type:'Inntekt',mode:'Variabel',color:'#10b981'},
    {name:'Trygd/Stønad',type:'Inntekt',mode:'Fast',color:'#14b8a6'},
    {name:'Andre inntekter',type:'Inntekt',mode:'Variabel',color:'#059669'}
  ];

  async function ensureStandardCategories() {
    const current=await BudgetDB.getAll('categories');
    const defaults=new Set(['Mat','Lån','Lønn','Bolig','Transport','Andre utgifter']);
    for(const item of STANDARD_CATEGORIES){
      const existing=current.find(x=>String(x.name||'').toLocaleLowerCase('nb-NO')===item.name.toLocaleLowerCase('nb-NO'));
      if(existing){
        await BudgetDB.put('categories',{...existing,name:item.name,type:item.type,mode:item.mode,color:existing.color||item.color,standard:true,system:false,active:existing.active!==false});
      }else{
        await BudgetDB.add('categories',{...item,standard:true,system:false,active:defaults.has(item.name)});
      }
    }
  }

  async function ensureSeeded() {
    const existing = await BudgetDB.getAll('settings');
    if (!existing.some(x => x.key === 'seeded')) {
      const data = mapSeed();
      for (const [store, values] of Object.entries(data)) await BudgetDB.replaceAll(store, values);
    }
    await ensureStandardCategories();
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    return y && m && d ? `${d}.${m}.${y}` : iso;
  }

  function periodParts(period) {
    const [yearText, scopeText] = String(period || '').split('-');
    const year = Number(yearText) || new Date().getFullYear();
    const isYear = scopeText === 'all';
    const month = isYear ? null : Math.min(12, Math.max(1, Number(scopeText) || (new Date().getMonth() + 1)));
    return { year, month, isYear };
  }

  function makePeriod(year, month = null) {
    return month ? `${year}-${String(month).padStart(2, '0')}` : `${year}-all`;
  }

  function monthsForPeriod(period) {
    const { year, month, isYear } = periodParts(period);
    return isYear ? Array.from({length:12}, (_,i)=>makePeriod(year,i+1)) : [makePeriod(year,month)];
  }

  function availableYears(records, selectedPeriod) {
    const values = new Set([new Date().getFullYear(), periodParts(selectedPeriod).year]);
    const add = value => { const y = Number(String(value || '').slice(0,4)); if (y) values.add(y); };
    records.incomes.forEach(x => add(x.date));
    records.expenses.forEach(x => add(x.dueDate));
    records.budgets.forEach(x => add(x.startDate || x.month));
    records.mealPlans.forEach(x => add(x.date));
    return [...values].sort((a,b)=>b-a);
  }

  function normalizedFrequency(value) {
    const frequency = String(value || 'Engangs').toLowerCase();
    if (frequency === 'fast') return 'månedlig';
    if (frequency === 'periodisk') return 'kvartalsvis';
    return frequency;
  }

  function monthDiff(start, year, month) {
    return (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
  }

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

  function weeklyOccurrences(start, year, month) {
    const first = new Date(year, month - 1, 1, 12);
    const last = new Date(year, month - 1, daysInMonth(year, month), 12);
    if (start > last) return 0;
    const anchor = start > first ? start : first;
    const diff = Math.max(0, Math.ceil((anchor - start) / 86400000));
    const firstOffset = (7 - (diff % 7)) % 7;
    const firstOccurrence = new Date(anchor); firstOccurrence.setDate(anchor.getDate() + firstOffset);
    if (firstOccurrence > last) return 0;
    return Math.floor((last - firstOccurrence) / (7 * 86400000)) + 1;
  }

  function occurrenceCount(record, dateKey, year, month) {
    const raw = record[dateKey];
    if (!raw) return 0;
    const start = new Date(`${String(raw).slice(0,10)}T12:00:00`);
    if (Number.isNaN(start.getTime())) return 0;
    const diff = monthDiff(start, year, month);
    if (diff < 0) return 0;
    const frequency = normalizedFrequency(record.frequency);
    if (record.status === 'Avsluttet') return 0;
    if (frequency === 'månedlig') return 1;
    if (frequency === 'kvartalsvis') return diff % 3 === 0 ? 1 : 0;
    if (frequency === 'halvårlig') return diff % 6 === 0 ? 1 : 0;
    if (frequency === 'årlig') return diff % 12 === 0 ? 1 : 0;
    if (frequency === 'ukentlig') return weeklyOccurrences(start, year, month);
    return start.getFullYear() === year && start.getMonth() + 1 === month ? 1 : 0;
  }




  async function loadSnapshot(requestedPeriod) {
    const [allIncomes,allExpenses,loans,goals,allBudgets,recipes,ingredients,categories,allMealPlans,shoppingItems,shoppingTrips,pantryItems,settings,occurrenceOverrides] = await Promise.all([
      BudgetDB.getAll('incomes'),BudgetDB.getAll('expenses'),BudgetDB.getAll('loans'),
      BudgetDB.getAll('goals'),BudgetDB.getAll('budgets'),BudgetDB.getAll('recipes'),BudgetDB.getAll('ingredients'),BudgetDB.getAll('categories'),
      BudgetDB.getAll('mealPlans'),BudgetDB.getAll('shoppingItems'),BudgetDB.getAll('shoppingTrips'),BudgetDB.getAll('pantryItems'),BudgetDB.getAll('settings'),BudgetDB.getAll('occurrenceOverrides')
    ]);

    const inferred = [...allBudgets.map(x=>monthKey(x.startDate || x.month)), ...allIncomes.map(x=>monthKey(x.date)), ...allExpenses.map(x=>monthKey(x.dueDate))].filter(Boolean).sort().reverse()[0];
    const selectedPeriod = requestedPeriod || window.AppState?.selectedPeriod || inferred || new Date().toISOString().slice(0, 7);
    const isYear = periodParts(selectedPeriod).isYear;
    const finance = FinanceEngine.build({
      incomes:allIncomes, expenses:allExpenses, loans, goals, budgets:allBudgets, occurrenceOverrides
    }, selectedPeriod);
    const incomes = finance.incomes;
    const expenses = finance.expenses;
    const budgets = finance.budgets;
    const {year, month} = periodParts(selectedPeriod);
    const mealPlans = allMealPlans.filter(x => isYear ? monthKey(x.date).startsWith(`${year}-`) : monthKey(x.date) === makePeriod(year,month));

    const chartMonths = isYear ? monthsForPeriod(selectedPeriod) : (() => {
      const result=[];
      for(let offset=5; offset>=0; offset--){const d=new Date(year,month-1-offset,1);result.push(makePeriod(d.getFullYear(),d.getMonth()+1));}
      return result;
    })();
    const chartData = chartMonths.map(period => {
      const point = FinanceEngine.build({incomes:allIncomes,expenses:allExpenses,loans,goals,budgets:allBudgets,occurrenceOverrides}, period);
      return { month:period, income:point.metrics.plannedIncome, expense:point.metrics.plannedExpenses, actualExpense:point.metrics.actualExpenses };
    });
    const m = finance.metrics;
    const sourceData = {incomes:allIncomes,expenses:allExpenses,loans,goals,budgets:allBudgets,occurrenceOverrides};
    const annualFinance = FinanceEngine.build(sourceData, `${year}-all`);
    const settingsObject = Object.fromEntries(settings.map(item=>[item.key,item.value]));
    const baselineForecast = FinanceEngine.project(sourceData, selectedPeriod, 12, {});
    const forecast12 = FinanceEngine.project(sourceData, selectedPeriod, 12, settingsObject.forecastAssumptions || {});
    const health = FinanceEngine.health(sourceData, selectedPeriod, settingsObject);

    window.AppState = {
      selectedPeriod,
      years: availableYears({incomes:allIncomes,expenses:allExpenses,budgets:allBudgets,mealPlans:allMealPlans}, selectedPeriod),
      chartData,
      finance,
      annualFinance, baselineForecast, forecast12, health, sourceData,
      summary:{
        available:m.expectedCashFlow,
        fixed:m.fixedExpenses,
        variable:m.variableExpenses,
        result:m.expectedCashFlow,
        spent:m.actualExpenses,
        expectedExpenses:m.plannedExpenses,
        upcoming:m.unpaidExpenses,
        debt:m.debt,
        interest:m.interest,
        foodBudget:m.foodBudget,
        foodActual:m.foodActual,
        foodForecast:m.foodForecast,
        actualCashFlow:m.actualCashFlow,
        annualReserve:m.annualReserve
      },
      incomes:incomes.map(x=>[x.name,x.amount,isYear?`${x.occurrenceCount} forekomster`:fmtDate(x.date),x.frequency,x.category,x.status,x.id]),
      expenses:expenses.map(x=>[x.description,x.amount,isYear?`${x.occurrenceCount} forekomster`:fmtDate(x.dueDate),x.category,x.frequency,x.status,x.id,x.type]),
      loans,goals:goals.map(goal => ({...goal, calculatedCurrent:FinanceEngine.goalValueAtPeriod(goal, selectedPeriod)})),
      budgets:budgets.map(x=>[x.category,x.planned,x.actual,x.sourceIds?.length===1?x.sourceIds[0]:(x.id||null),x.month,x.warningLimit,x.forecast,x.isUnbudgeted,x.forecastVariance,x.periodLabel||'Hele måneden',x.calendarWeek||'']),
      recipes,ingredients:ingredients.map(x=>[x.name,x.unit,x.packageSize,x.price,x.store,x.category,fmtDate(x.updatedAt),x.image||'',x.brand||'',x.ean||'',x.id]),categories,mealPlans,allMealPlans,shoppingItems,shoppingTrips,pantryItems,
      occurrenceOverrides,settings:settingsObject
    };
    return window.AppState;
  }

  async function saveQuickEntry(entry) {
    const now = new Date().toISOString();
    if (entry.type === 'income') {
      await BudgetDB.add('incomes',{name:entry.name,amount:entry.amount,date:entry.date,frequency:'Engangs',category:entry.category || 'Andre inntekter',status:'Mottatt',createdAt:now});
    } else if (entry.type === 'expense') {
      await BudgetDB.add('expenses',{description:entry.name,amount:entry.amount,dueDate:entry.date,category:entry.category || 'Annet',frequency:'Engangs',status:'Betalt',type:'Engangs',note:'',createdAt:now});
    } else if (entry.type === 'goal') {
      await BudgetDB.add('goals',{name:entry.name,current:0,target:entry.amount,deadline:entry.date,monthly:0,priority:'Middels',createdAt:now});
    } else {
      await BudgetDB.add('mealPlans',MealPlanningEngine.normalizePlan({name:entry.name,estimatedCost:entry.amount,date:entry.date,mealType:'Middag',createdAt:now},[]));
    }
    await automaticBackup();
  }

  async function automaticBackup() {
    if (!window.budgetApp?.saveAutoBackup) return;
    const settings = await BudgetDB.getAll('settings');
    if (settings.find(x=>x.key==='autoBackup')?.value === false) return;
    const payload = await BudgetDB.exportAll();
    const retention = Math.min(365, Math.max(1, Number(await getSetting('backupRetention', 14)) || 14));
    await window.budgetApp.saveAutoBackup(payload, retention);
  }

  async function createUpdateBackup() {
    if (!window.budgetApp?.saveAutoBackup) throw new Error('Lokal sikkerhetskopi er ikke tilgjengelig.');
    const payload = await BudgetDB.exportAll();
    const retention = Math.min(365, Math.max(1, Number(await getSetting('backupRetention', 14)) || 14));
    return window.budgetApp.saveAutoBackup(payload, retention);
  }

  async function exportData() { return window.budgetApp.exportData(await BudgetDB.exportAll()); }
  async function importData() {
    const result = await window.budgetApp.importData();
    if (result?.canceled || !result?.data) return false;
    BudgetDB.validateImport(result.data);
    const current = await BudgetDB.exportAll();
    const retention = Math.min(365, Math.max(1, Number(await getSetting('backupRetention', 14)) || 14));
    if (window.budgetApp?.saveAutoBackup) await window.budgetApp.saveAutoBackup(current, retention);
    await BudgetDB.importAll(result.data);
    await automaticBackup();
    return true;
  }
  async function listBackups() { return window.budgetApp?.listBackups ? window.budgetApp.listBackups() : []; }
  async function restoreBackup(fileName) {
    const result = await window.budgetApp.restoreBackup(fileName);
    if (!result?.data) return false;
    BudgetDB.validateImport(result.data);
    const current = await BudgetDB.exportAll();
    const retention = Math.min(365, Math.max(1, Number(await getSetting('backupRetention', 14)) || 14));
    if (window.budgetApp?.saveAutoBackup) await window.budgetApp.saveAutoBackup(current, retention);
    await BudgetDB.importAll(result.data);
    return true;
  }


  async function getSetting(key, fallback = null) {
    const settings = await BudgetDB.getAll('settings');
    const item = settings.find(x => x.key === key);
    return item ? item.value : fallback;
  }

  async function setSetting(key, value) {
    const settings = await BudgetDB.getAll('settings');
    const existing = settings.find(x => x.key === key);
    await BudgetDB.put('settings', { ...(existing || {}), key, value });
    return value;
  }

  async function copyPreviousWeek(period) {
    const items = await BudgetDB.getAll('mealPlans');
    const sourceDate = MealPlanningEngine.latestWeekDate(items, period);
    if (!sourceDate) return { copied:0 };
    const result = MealPlanningEngine.copyWeek(items, sourceDate);
    for (const clone of result.copies) await BudgetDB.add('mealPlans', clone);
    if (result.copies.length) await automaticBackup();
    return { copied:result.copies.length, sourceStart:result.sourceStart };
  }

  async function copyPreviousWeekTo(targetDate) {
    const items = await BudgetDB.getAll('mealPlans');
    const targetStart = MealPlanningEngine.startOfWeek(targetDate);
    const sourceDate = MealPlanningEngine.isoDate(MealPlanningEngine.addDays(targetStart,-7));
    const result = MealPlanningEngine.copyWeek(items, sourceDate);
    for (const clone of result.copies) await BudgetDB.add('mealPlans', clone);
    if (result.copies.length) await automaticBackup();
    return { copied:result.copies.length, sourceStart:result.sourceStart, targetStart:MealPlanningEngine.isoDate(targetStart) };
  }


  async function copyPreviousMonthTo(targetMonth) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(targetMonth || ''));
    if (!match) return { copied:0 };
    const targetYear = Number(match[1]);
    const targetMonthIndex = Number(match[2]) - 1;
    const targetStart = new Date(targetYear, targetMonthIndex, 1, 12);
    const sourceStart = new Date(targetYear, targetMonthIndex - 1, 1, 12);
    const targetDays = new Date(targetYear, targetMonthIndex + 1, 0, 12).getDate();
    const sourcePrefix = `${sourceStart.getFullYear()}-${String(sourceStart.getMonth()+1).padStart(2,'0')}-`;
    const targetPrefix = `${targetYear}-${String(targetMonthIndex+1).padStart(2,'0')}-`;
    const items = await BudgetDB.getAll('mealPlans');
    const existing = new Set(items.map(MealPlanningEngine.duplicateKey));
    const copies = [];
    for (const plan of items.filter(item => String(item.date || '').startsWith(sourcePrefix))) {
      const day = Number(String(plan.date || '').slice(8,10));
      if (!day || day > targetDays) continue;
      const clone = { ...plan, date:`${targetPrefix}${String(day).padStart(2,'0')}`, copiedFrom:plan.id, createdAt:new Date().toISOString() };
      delete clone.id;
      const key = MealPlanningEngine.duplicateKey(clone);
      if (existing.has(key)) continue;
      existing.add(key);
      copies.push(clone);
    }
    for (const clone of copies) await BudgetDB.add('mealPlans', clone);
    if (copies.length) await automaticBackup();
    return { copied:copies.length, sourceMonth:sourcePrefix.slice(0,7), targetMonth:targetPrefix.slice(0,7) };
  }

  async function deleteMealPlans(ids=[]) {
    const unique = [...new Set(ids.map(Number).filter(Number.isFinite))];
    for (const id of unique) await BudgetDB.remove('mealPlans', id);
    if (unique.length) await automaticBackup();
    return { deleted:unique.length };
  }

  async function exportReport(period, snapshot) {
    if (!window.budgetApp?.exportReport) return { canceled:true };
    const finance = snapshot?.finance;
    if (!finance?.metrics) throw new Error('Rapportgrunnlaget mangler FinanceEngine-data.');
    const metrics = finance.metrics;
    const isYear = String(period || '').endsWith('-all');
    const periodText = isYear ? 'i valgt år' : 'i valgt måned';
    const lines = [
      ['Personlig Budsjett – Rapport', period],
      [],
      ['Nøkkeltall','Beløp'],
      ['Planlagte inntekter', metrics.plannedIncome],
      ['Faktisk mottatte inntekter', metrics.actualIncome],
      ['Planlagte utgifter', metrics.plannedExpenses],
      ['Faktisk betalte utgifter', metrics.actualExpenses],
      ['Ubetalte utgifter', metrics.unpaidExpenses],
      ['Forventet kontantstrøm', metrics.expectedCashFlow],
      ['Faktisk kontantstrøm', metrics.actualCashFlow],
      ['Total gjeld', Number(metrics.debt || 0)],
      [`Rentekostnader ${periodText}`, metrics.interest],
      [],
      ['Faktiske utgifter per kategori','Beløp']
    ];
    Object.entries(finance.byCategory?.actual || {})
      .sort((a,b)=>Number(b[1])-Number(a[1]))
      .forEach(row=>lines.push(row));
    lines.push([], ['Forventede utgifter per kategori','Beløp']);
    Object.entries(finance.byCategory?.planned || {})
      .sort((a,b)=>Number(b[1])-Number(a[1]))
      .forEach(row=>lines.push(row));
    const csv = lines.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    return window.budgetApp.exportReport({ period, csv });
  }

  async function clearModule(storeName) {
    const allowed=['budgets','incomes','expenses','loans','goals','recipes','mealPlans','shoppingItems','pantryItems','apiCache'];
    if(!allowed.includes(storeName)) throw new Error('Ugyldig datasett.');
    await BudgetDB.clear(storeName);
    if(storeName==='shoppingItems') await BudgetDB.clear('shoppingTrips');
    if(['incomes','expenses'].includes(storeName)) {
      const overrides=await BudgetDB.getAll('occurrenceOverrides');
      const sourceType=storeName==='incomes'?'income':'expense';
      await BudgetDB.replaceAll('occurrenceOverrides',overrides.filter(x=>x.sourceType!==sourceType));
    }
    await automaticBackup();
  }

  async function resetApplication() {
    const payload=await BudgetDB.exportAll();
    if(window.budgetApp?.saveAutoBackup) await window.budgetApp.saveAutoBackup(payload,14);
    await BudgetDB.clearAll();
    const defaults=[
      {key:'seeded',value:true},{key:'theme',value:'light'},{key:'autoBackup',value:true},{key:'backupRetention',value:14}
    ];
    await BudgetDB.replaceAll('settings',defaults);
    await BudgetDB.replaceAll('categories',STANDARD_CATEGORIES.map(item=>({...item,standard:true,system:false,active:['Mat','Lån','Lønn','Bolig','Transport','Andre utgifter'].includes(item.name)})));
    if(window.budgetApp?.kassal?.clearToken) await window.budgetApp.kassal.clearToken();
  }

  window.Backend = { ensureSeeded, loadSnapshot, saveQuickEntry, automaticBackup, createUpdateBackup, exportData, importData, listBackups, restoreBackup, getSetting, setSetting, copyPreviousWeek, copyPreviousWeekTo, copyPreviousMonthTo, deleteMealPlans, exportReport, clearModule, resetApplication };
})();
