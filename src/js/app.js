const sections = {
  overview: [{id:'dashboard', label:'Dashboard'}],
  economy: [
    {id:'budget', label:'Budsjett'}, {id:'income', label:'Inntekter'}, {id:'expenses', label:'Utgifter'},
{id:'loans', label:'Lån og gjeld'}, {id:'savings', label:'Sparemål'}
  ],
  food: [
    {id:'mealplan', label:'Matplan'}, {id:'recipes', label:'Oppskrifter'}, {id:'ingredients', label:'Ingredienser'},
    {id:'shopping', label:'Handleliste'}, {id:'pantry', label:'Matlager'}, {id:'foodeconomy', label:'Matøkonomi'}
  ],
  analysis: [{id:'health', label:'Økonomihelse'}, {id:'reports', label:'Rapporter'}, {id:'forecast', label:'Prognoser'}, {id:'savingtips', label:'Sparetips'}, {id:'whatif', label:'Hva hvis?'}],
  settings: [{id:'general', label:'Kategori'}, {id:'data', label:'Integrasjoner'}, {id:'maintenance', label:'Vedlikehold'}]
};

let activeSection = 'overview';
let activePage = 'dashboard';
let activePeriod = null;

const DEFAULT_MOBILE_APP_APK_URL='https://github.com/rengelse/personlig-budsjett-handleliste/releases/latest/download/handleliste.apk';

function mobileAppApkUrl(){
  return DEFAULT_MOBILE_APP_APK_URL;
}

function mobileAppUrlConfigured(){
  return true;
}

function mobileTransferUuid(){
  if(window.crypto?.randomUUID)return window.crypto.randomUUID();
  return `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}-${Math.random().toString(36).slice(2,10)}`;
}

function mobileTransferShortId(prefix='x'){
  const bytes=new Uint8Array(5);
  if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  let value=0n;
  for(const byte of bytes)value=(value<<8n)|BigInt(byte);
  return `${prefix}${value.toString(36)}`;
}

function mobileTransferIsCompactId(value,prefix){
  return new RegExp(`^${prefix}[0-9a-z]{5,9}$`,'i').test(String(value||'').trim());
}

function mobileTransferDate(timestamp){
  const value=Number(timestamp);
  if(!Number.isFinite(value)||value<=0)return new Date().toISOString().slice(0,10);
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return new Date().toISOString().slice(0,10);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function currentShoppingListUid({renew=false}={}){
  let uid=!renew?String(AppState.settings?.currentShoppingListUid||'').trim():'';
  // PB v2 bruker korte transport-ID-er. Eldre UUID-er beholdes i gamle snapshots, men nye utsendinger får kompakt ID.
  if(!mobileTransferIsCompactId(uid,'l'))uid=mobileTransferShortId('l');
  if(renew||uid!==String(AppState.settings?.currentShoppingListUid||'')){
    await Backend.setSetting('currentShoppingListUid',uid);
    AppState.settings={...(AppState.settings||{}),currentShoppingListUid:uid};
  }
  return uid;
}

async function activeShoppingForMobile(){
  const listUid=await currentShoppingListUid();
  const source=(await BudgetDB.getAll('shoppingItems')).filter(item=>!item.checked&&!item.atHome);
  const items=[];
  for(const item of source){
    let uid=String(item.mobileItemUid||'').trim();
    if(!mobileTransferIsCompactId(uid,'i'))uid=mobileTransferShortId('i');
    const needsSave=uid!==String(item.mobileItemUid||'')||String(item.mobileListUid||'')!==listUid;
    const stored=needsSave?{...item,mobileItemUid:uid,mobileListUid:listUid,updatedAtSystem:new Date().toISOString()}:item;
    if(needsSave)await BudgetDB.put('shoppingItems',stored);
    const stateItem=(AppState.shoppingItems||[]).find(x=>Number(x.id)===Number(item.id));
    if(stateItem){stateItem.mobileItemUid=uid;stateItem.mobileListUid=listUid;}
    const qty=num(stored.quantity ?? stored.requiredQuantity ?? stored.packageQuantity ?? 0);
    const unit=String(stored.unit || stored.requiredUnit || stored.packageUnit || '').trim();
    const price=num(stored.price ?? stored.estimatedPrice ?? 0);
    items.push({
      id:uid,
      shoppingItemId:stored.id,
      name:String(stored.name||'').trim(),
      qty,
      unit,
      category:String(stored.category||'').trim(),
      store:String(stored.store||'').trim(),
      price:price>0?price:undefined,
      ean:String(stored.ean||'').trim()
    });
  }
  return {listUid,items:items.filter(item=>item.name)};
}

async function savePb1SourceSnapshot(listUid,list,items){
  const trips=await BudgetDB.getAll('shoppingTrips');
  const existing=trips.find(x=>x.type==='pb1-source'&&String(x.sourceListUid||'')===String(listUid));
  const priorItems=Array.isArray(existing?.items)?existing.items:[];
  const byUid=new Map(priorItems.map(item=>[String(item.uid||item.id||''),item]));
  for(const item of items){
    byUid.set(String(item.id),{
      uid:String(item.id),shoppingItemId:Number(item.shoppingItemId)||null,name:item.name,qty:item.qty,unit:item.unit,
      category:item.category,store:item.store,expectedPrice:Number.isFinite(Number(item.price))?Number(item.price):null,ean:item.ean||''
    });
  }
  const record={...(existing||{}),type:'pb1-source',sourceListUid:listUid,label:list,expectedTotal:Number(total(items,item=>item.price||0).toFixed(2)),items:[...byUid.values()],sentAt:new Date().toISOString(),updatedAtSystem:new Date().toISOString()};
  existing?.id?await BudgetDB.put('shoppingTrips',record):await BudgetDB.add('shoppingTrips',record);
}

async function shoppingPb1Data(){
  const prepared=await activeShoppingForMobile();
  if(!prepared.items.length) throw new Error('Handlelisten er tom.');
  const list=`Handleliste ${activePeriod?periodLabel(activePeriod):''}`.trim();
  await savePb1SourceSnapshot(prepared.listUid,list,prepared.items);
  return {v:2,id:prepared.listUid,i:prepared.items.map(item=>({
    i:item.id,n:item.name,q:item.qty,u:item.unit,c:item.category,s:item.store,
    ...(Number.isFinite(Number(item.price))&&Number(item.price)>0?{p:Number(item.price)}:{})
  }))};
}

async function shoppingPb1Payload(){
  return window.budgetApp.encodeShoppingListPb1(await shoppingPb1Data());
}

let savingsTipFilter = 'active';
let chartMode = 'bar';
let kassalBrowser = { products: [], page: 1, lastPage: 1, total: 0, loading: false, params: null, categories: [], categoryMap: {}, stores: [], categoryTrail: [], requestId: 0, buffers:new Map() };
let ingredientApiView='products';
let priceChangeState={loading:false,loaded:false,down:[],up:[],filters:{sort:'diff_desc',search:''},error:''};

let desktopUpdateState={
  status:'idle',
  currentVersion:'',
  latestVersion:'',
  updateAvailable:false,
  releaseName:'',
  releaseNotes:'',
  error:''
};

function updateStatusLabel(state=desktopUpdateState){
  if(state.status==='checking')return 'Kontrollerer …';
  if(state.status==='available')return `Ny versjon v${state.latestVersion}`;
  if(state.status==='downloading')return `Laster ned ${Math.round(Number(state.downloadPercent||0))} %`;
  if(state.status==='ready')return 'Oppdatering klar';
  if(state.status==='installing')return 'Starter appen på nytt …';
  if(state.status==='current')return 'Oppdatert';
  if(state.status==='development')return 'Kun installert app';
  if(state.status==='error')return 'Kunne ikke sjekke';
  return 'Ikke kontrollert';
}

function releaseNoteItems(notes=''){
  const raw=String(notes||'').trim();
  if(!raw)return ['Ingen release-notater er publisert for denne versjonen.'];

  const decodeText=value=>{
    const area=document.createElement('textarea');
    area.innerHTML=String(value||'');
    return area.value;
  };

  const normalized=raw
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p\s*>/gi,'\n')
    .replace(/<\/div\s*>/gi,'\n')
    .replace(/<\/h[1-6]\s*>/gi,'\n')
    .replace(/<li\b[^>]*>/gi,'\n- ')
    .replace(/<\/li\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' ');

  const lines=decodeText(normalized)
    .split(/\r?\n/)
    .map(line=>line.replace(/^\s*[-*#>]+\s*/,'').replace(/\s+/g,' ').trim())
    .filter(Boolean);

  return lines.length?lines:['Ingen release-notater er publisert for denne versjonen.'];
}

function applyDesktopUpdateState(next={}){
  desktopUpdateState={...desktopUpdateState,...next};
  const alert=document.getElementById('topbarUpdateAlert');
  const version=document.getElementById('topbarUpdateVersion');
  if(alert){
    alert.hidden=!desktopUpdateState.updateAvailable;
    alert.title=desktopUpdateState.updateAvailable
      ? `Ny versjon v${desktopUpdateState.latestVersion} tilgjengelig`
      : 'Ingen ny versjon';
  }
  if(version)version.textContent=desktopUpdateState.latestVersion?`v${desktopUpdateState.latestVersion}`:'';

  const installed=document.getElementById('installedAppVersion');
  if(installed&&desktopUpdateState.currentVersion)installed.textContent=`v${desktopUpdateState.currentVersion.replace(/^v/i,'')}`;
  const latest=document.getElementById('latestAppVersion');
  if(latest)latest.textContent=desktopUpdateState.latestVersion?`v${desktopUpdateState.latestVersion}`:'—';
  const status=document.getElementById('appUpdateStatus');
  if(status)status.textContent=updateStatusLabel(desktopUpdateState);

  const releaseInfoBtn=document.getElementById('releaseInfoBtn');
  if(releaseInfoBtn){
    releaseInfoBtn.disabled=!desktopUpdateState.latestVersion;
    releaseInfoBtn.title=desktopUpdateState.latestVersion
      ? `Vis release-info for v${desktopUpdateState.latestVersion}`
      : 'Release-info blir tilgjengelig etter versjonssjekk';
  }
}


const KASSAL_CATEGORIES=['Apotekvarer','Bakeri','Bakevarer og kjeks','Barneprodukter','Blomster & planter','Blomster og planter','Dessert','Dessert og iskrem','Drikke','Dyr','Fisk & skalldyr','Frukt & grønt','Hus & hjem','Kioskvarer','Kjøtt','Kylling og fjærkre','Meieri & egg','Middag','Middagstilbehør','Ost','Pålegg & frokost','Personlige artikler','Snacks & godteri','Ukategorisert'];
const KASSAL_STORES=[['MENY_NO','Meny'],['SPAR_NO','SPAR'],['JOKER_NO','Joker'],['COOP_NO','Coop'],['ODA_NO','Oda'],['ENGROSSNETT_NO','Engrosnett'],['KIWI','KIWI'],['BUNNPRIS','Bunnpris'],['REMA_1000','REMA 1000'],['COOP_EXTRA','Coop Extra'],['MATKROKEN','Matkroken'],['EUROPRIS_NO','Europris'],['HAVARISTEN','Havaristen'],['HOLDBART','Holdbart'],['FUDI','FUDI'],['PIERRE_ROBERT','Pierre Robert'],['SLOWLY_NO','Slowly.no'],['LESKE_NO','Leske.no'],['FASTCANDY_NO','FastCandy.no']];
const KASSAL_ALLERGENS=['Bløtdyr','Cashewnøtter','Egg','Fisk','Gluten','Hasselnøtter','Lupiner','Macademiannøtter','Mandler','Melk','Nøtter','Paranøtter','Peanøtter','Pekannøtter','Pistasienøtter','Pistasjnøtter','Selleri','Sennep','Sesam','Skalldyr','Soya','Sulfitt','Valnøtter'];
const KASSAL_ALLERGEN_CODES={
  'Bløtdyr':'blotdyr','Cashewnøtter':'cashewnotter','Egg':'egg','Fisk':'fisk','Gluten':'gluten','Hasselnøtter':'hasselnotter','Lupiner':'lupiner','Macademiannøtter':'macadamianotter','Mandler':'mandler','Melk':'melk','Nøtter':'notter','Paranøtter':'paranotter','Peanøtter':'peanotter','Pekannøtter':'pekannotter','Pistasienøtter':'pistasjnotter','Pistasjnøtter':'pistasjnotter','Selleri':'selleri','Sennep':'sennep','Sesam':'sesam','Skalldyr':'skalldyr','Soya':'soya','Sulfitt':'sulfitt','Valnøtter':'valnotter'
};
let expenseCategoryFilter = '';
let recipeFavoriteFilter = 'all';
let recipeCategoryFilter = '';
let recipeSort = 'recent';
let recipeSearchQuery = '';
let shoppingView = 'active';
let shoppingHistoryMode = 'all';
let shoppingHistoryValue = '';
let shoppingHistorySort = 'date_desc';
let pantryView = 'stock';
let mealPlanWeekStart = '';
let mealPlanView = 'week';
let mealPlanMonth = '';
let mealPlanEditMode = false;
let mealPlanSelectedIds = new Set();
const content = document.getElementById('appContent');
const secondaryTabs = document.getElementById('secondaryTabs');

const num = value => Number(value || 0);
const total = (items, getter) => (items || []).reduce((sum, item) => sum + num(getter(item)), 0);
const pct = (value, maximum) => maximum > 0 ? Math.round((value / maximum) * 100) : 0;
const countText = (count, singular, plural = `${singular}er`) => `${count} ${count === 1 ? singular : plural}`;
const monthNames = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const escapeHtml = value => String(value ?? '').replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));

function goalCurrent(goal) { return num(goal.calculatedCurrent ?? goal.current); }
function goalPriorityRank(value) { return ({Høy:0,Middels:1,Lav:2})[value] ?? 1; }
function goalDateLabel(date) { return date ? date.toLocaleDateString('nb-NO',{month:'long',year:'numeric'}) : 'Ingen dato'; }
function goalStatus(goal) {
  const current=goalCurrent(goal), target=num(goal.target), monthly=Math.max(0,num(goal.monthly));
  const estimate=FinanceEngine.goalTargetDate({...goal,current,createdAt:null}, AppState.selectedPeriod, 0);
  const deadline=goal.deadline ? new Date(`${String(goal.deadline).slice(0,10)}T12:00:00`) : null;
  if (current>=target) return {label:'Mål nådd',className:'success',date:'Fullført'};
  if (!estimate.date) return {label:'Mangler sparebeløp',className:'warning',date:'Ingen beregnet måldato'};
  if (!deadline) return {label:'På vei',className:'',date:`Beregnet mål: ${goalDateLabel(estimate.date)}`};
  const delta=Math.round((estimate.date-deadline)/(30.4375*86400000));
  if (delta<=0) return {label:'I rute',className:'success',date:`Beregnet mål: ${goalDateLabel(estimate.date)}`};
  return {label:`${delta} mnd etter planen`,className:'warning',date:`Beregnet mål: ${goalDateLabel(estimate.date)}`};
}

function currentMonthLabel() { return periodLabel(AppState.selectedPeriod || activePeriod || new Date().toISOString().slice(0,7)); }
function periodLabel(period) {
  const [year, month] = String(period || '').split('-');
  if (month === 'all') return `hele ${year}`;
  const label = monthNames[Math.max(0, num(month)-1)] || '';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
}
function syncPeriodSelect() {
  if (!window.AppState) return;
  activePeriod = AppState.selectedPeriod;
  const [year, month] = activePeriod.split('-');
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  if (yearSelect) yearSelect.innerHTML = (AppState.years || [Number(year)]).map(value => `<option value="${value}" ${String(value)===year?'selected':''}>${value}</option>`).join('');
  if (monthSelect) monthSelect.value = month || 'all';
}

function badgeForStatus(status) {
  if (['Betalt','Aktiv','Mottatt'].includes(status)) return UI.badge(status, 'success');
  if (['Ubetalt','Ikke mottatt'].includes(status)) return UI.badge(status, 'danger');
  if (['Delvis','Forventet','Blandet'].includes(status)) return UI.badge(status, 'warning');
  return UI.badge(status);
}

function syncPrimaryTabs() {
  document.querySelectorAll('.primary-tab').forEach(btn => {
    const active = btn.dataset.section === activeSection;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

function renderSecondaryTabs() {
  const items = sections[activeSection] || [];
  const wrap = secondaryTabs.closest('.secondary-tabs-wrap');
  if (wrap) wrap.classList.toggle('hidden', items.length <= 1);
  secondaryTabs.innerHTML = items.map(item => `<button class="secondary-tab ${item.id===activePage?'active':''}" data-page="${item.id}" ${item.id===activePage?'aria-current="page"':''}>${item.label}</button>`).join('');
  secondaryTabs.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => navigateTo(activeSection, btn.dataset.page)));
}

function navigateTo(section, page = sections[section]?.[0]?.id) {
  if (!sections[section] || !sections[section].some(item => item.id === page)) return;
  activeSection = section;
  activePage = page;
  syncPrimaryTabs();
  renderSecondaryTabs();
  renderPage();
}

function chartHtml() {
  const data = AppState.chartData || [];
  const comfortPercent = Math.min(90, Math.max(0, num(AppState.settings?.comfortMarginPercent ?? 15)));
  const mode = AppState.settings?.dashboardChartMode || chartMode || 'bar';
  const controls = `<div class="chart-controls"><div class="tabs-inline"><button class="chart-mode ${mode==='bar'?'active':''}" data-mode="bar">Stolper</button><button class="chart-mode ${mode==='line'?'active':''}" data-mode="line">Linjer</button></div>${mode==='line'?`<button class="btn secondary small" id="comfortMarginBtn">Komfort ${comfortPercent} %</button>`:''}</div>`;
  const empty = data.every(item => !num(item.income) && !num(item.expense));
  if (empty) return `${controls}<p class="muted">Ingen inntekter eller utgifter registrert i denne perioden.</p>`;
  if (mode === 'line') {
    const width=760,height=220,padX=42,padY=24;
    const points=data.map(item=>({...item,comfort:num(item.income)*(1-comfortPercent/100)}));
    const maximum=Math.max(1,...points.flatMap(x=>[num(x.income),num(x.expense),num(x.comfort)]));
    const x=i=>padX+(points.length===1?0:i*((width-padX*2)/(points.length-1)));
    const y=v=>height-padY-(num(v)/maximum)*(height-padY*2);
    const path=key=>points.map((item,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(item[key]).toFixed(1)}`).join(' ');
    const labels=points.map((item,i)=>`<text x="${x(i)}" y="${height-5}" text-anchor="middle">${periodLabel(item.month).split(' ')[0].slice(0,3)}</text>`).join('');
    return `${controls}<div class="legend"><span><i></i>Inntekter</span><span><i class="alt"></i>Utgifter</span><span><i class="comfort"></i>Komfortgrense</span></div><div class="line-chart-wrap"><svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Inntekter, utgifter og komfortgrense"><line class="chart-axis" x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"></line><path class="line income-line" d="${path('income')}"></path><path class="line expense-line" d="${path('expense')}"></path><path class="line comfort-line" d="${path('comfort')}"></path>${labels}</svg></div><p class="muted">Komfortgrensen viser maksimal anbefalt utgift når ${comfortPercent} % av inntekten beholdes som spillerom.</p>`;
  }
  const maximum = Math.max(1, ...data.flatMap(x => [num(x.income), num(x.expense)]));
  const bars = data.map(item => {
    const incomeHeight = Math.max(item.income ? 4 : 0, Math.round((num(item.income) / maximum) * 160));
    const expenseHeight = Math.max(item.expense ? 4 : 0, Math.round((num(item.expense) / maximum) * 160));
    return `<div class="chart-group" title="${periodLabel(item.month)} · Inntekter ${UI.money(item.income)} · Utgifter ${UI.money(item.expense)}"><div class="chart-bar" style="height:${incomeHeight}px"></div><div class="chart-bar alt" style="height:${expenseHeight}px"></div></div>`;
  }).join('');
  const labels = data.map(item => `<span>${periodLabel(item.month).split(' ')[0].slice(0,3)}</span>`).join('');
  return `${controls}<div class="legend"><span><i></i>Inntekter</span><span><i class="alt"></i>Utgifter</span></div><div class="chart">${bars}</div><div class="chart-labels">${labels}</div>`;
}

function expenseBreakdownHtml() {
  const actual = AppState.finance?.byCategory?.actual || {};
  const planned = AppState.finance?.byCategory?.planned || {};
  const actualTotal = Object.values(actual).reduce((sum,value)=>sum+num(value),0);
  const source = actualTotal > 0 ? actual : planned;
  const sourceLabel = actualTotal > 0 ? 'Betalte utgifter' : 'Forventede utgifter';
  const entries = Object.entries(source).filter(([,value])=>num(value)>0).sort((a,b)=>num(b[1])-num(a[1]));
  const totalValue = entries.reduce((sum,[,value])=>sum+num(value),0);
  if (!entries.length || !totalValue) return '<div class="dashboard-empty"><strong>Ingen utgifter registrert</strong><span>Fordelingen vises når perioden inneholder utgifter.</span></div>';
  const palette=['var(--primary)','var(--warning)','var(--success)','#7c6cf2','#dd6b8b','#4ca6a8','#d18f45','#8291a8'];
  let cursor=0;
  const segments=entries.map(([category,value],index)=>{
    const share=num(value)/totalValue*100;
    const from=cursor; cursor+=share;
    return `${palette[index%palette.length]} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(',');
  const rows=entries.slice(0,7).map(([category,value],index)=>{
    const share=Math.round(num(value)/totalValue*100);
    return `<button class="expense-breakdown-row" data-expense-category="${category.replace(/"/g,'&quot;')}"><span class="expense-dot" style="background:${palette[index%palette.length]}"></span><span>${category}</span><strong>${UI.money(value)}</strong><small>${share} %</small></button>`;
  }).join('');
  return `<div class="expense-breakdown"><div class="donut-wrap"><div class="expense-donut" style="background:conic-gradient(${segments})"><div><strong>${UI.money(totalValue)}</strong><span>${sourceLabel}</span></div></div></div><div class="expense-breakdown-list">${rows}${entries.length>7?`<p class="muted">+ ${entries.length-7} flere kategorier</p>`:''}</div></div>`;
}

function dashboard() {
  const s = AppState.summary;
  const metrics = AppState.finance?.metrics || {};
  const budgetTotal = num(metrics.budgetPlanned);
  const expectedExpenses = num(metrics.plannedExpenses);
  const actualExpenses = num(metrics.actualExpenses);
  const availableNow = num(metrics.plannedIncome) - actualExpenses;
  const expectedResult = num(metrics.expectedCashFlow);
  const spentPct = pct(actualExpenses, expectedExpenses || budgetTotal);
  const foodPct = pct(s.foodActual, s.foodBudget);
  const savingsCurrent = total(AppState.goals || [], goalCurrent);
  const activeTips = buildSavingsTips().filter(t=>t.status==='active').slice(0,3);
  const tips = activeTips.map(t=>`<div class="dashboard-tip"><div><span class="badge ${t.priority==='Høy'?'warning':''}">${t.priority}</span><strong>${t.title}</strong><small>${t.kind} · ${t.category}</small></div><button class="btn secondary small tip-action" data-action="${t.action}">Se</button></div>`).join('') || '<div class="dashboard-empty"><strong>Ingen aktive sparetips</strong><span>Nye forslag vises her når det finnes noe å forbedre.</span></div>';
  const goals = (AppState.goals || []).sort((a,b)=>goalPriorityRank(a.priority)-goalPriorityRank(b.priority)).slice(0,3).map(g=>{const current=goalCurrent(g),progress=pct(current,g.target);return `<div class="dashboard-goal"><div class="dashboard-goal-head"><strong>${g.name}</strong><span>${progress} %</span></div>${UI.progress(progress,progress>=60?'success':'')}<div class="dashboard-goal-meta"><span>${UI.money(current)} beregnet</span><span>${UI.money(Math.max(0,num(g.target)-current))} igjen</span></div></div>`}).join('') || '<div class="dashboard-empty"><strong>Ingen sparemål registrert</strong><span>Sparemål vises her når de opprettes.</span></div>';
  const periodText=currentMonthLabel();
  return UI.pageHeader(`${periodText} – økonomisk oversikt`,'Rask oversikt over hvordan økonomien din står akkurat nå') +
    `<div class="dashboard-section-label">Status nå</div><div class="dashboard-primary-grid">${UI.kpi('Disponibelt nå',UI.money(availableNow),'Inntekter minus det som er betalt',availableNow>=0?'positive':'negative')}${UI.kpi('Forventet resultat',UI.money(expectedResult),'Når alle registrerte utgifter er tatt med',expectedResult>=0?'positive':'negative')}${UI.kpi('Økonomihelse',`${AppState.health?.score||0}/100`,AppState.health?.status||'Ikke beregnet',AppState.health?.score>=70?'positive':AppState.health?.score<50?'negative':'')}${UI.kpi('Forbruk hittil',`${spentPct} %`,`${UI.money(actualExpenses)} av ${UI.money(expectedExpenses||budgetTotal)}`)}</div>`+
    `<div class="dashboard-section-label dashboard-section-label-secondary">Nøkkeltall</div><div class="dashboard-summary-grid">${UI.kpi('Inntekter',UI.money(metrics.plannedIncome),'Forventet i perioden')}${UI.kpi('Utgifter',UI.money(metrics.plannedExpenses),'Forventet i perioden')}${UI.kpi('Gjeld',UI.money(metrics.debt),'Registrert restgjeld')}${UI.kpi('Sparing',UI.money(savingsCurrent),countText((AppState.goals||[]).length,'aktivt mål','aktive mål'))}${UI.kpi('Matbudsjett',UI.money(s.foodActual),`${foodPct} % av ${UI.money(s.foodBudget)}`)}</div>`+
    `<div class="dashboard-main-grid">${UI.card('Hvor går pengene?',expenseBreakdownHtml(),'<span class="badge">Klikk en kategori for detaljer</span>')}${UI.card('Inntekter og utgifter',chartHtml(),'<span class="badge">Registrerte data</span>')}</div>`+
    `<div class="dashboard-bottom-grid">${UI.card('Viktigste sparetips',tips,`<span class="badge">${activeTips.length} vises</span>`)}${UI.card('Sparemål',goals)}</div>`;
}

function budget() {
  const rows = AppState.budgets.map(r=>{
    const isUnbudgeted = Boolean(r[7]);
    const planned = num(r[1]), actual = num(r[2]), forecast = num(r[6]);
    const usage = planned > 0 ? pct(actual,planned) : (actual > 0 ? 100 : 0);
    const categoryName = String(r[0] || 'Ukategorisert');
    const safeCategory = categoryName.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const category = `<button type="button" class="budget-category-link" data-expense-category="${safeCategory}"><span>${safeCategory}</span>${isUnbudgeted ? ' <span class="badge warning">Ikke budsjettert</span>' : ''}</button>`;
    const variance = planned-actual;
    const usageClass = actual>planned ? 'warning' : 'success';
    const usageCell = `<div class="budget-usage"><span>${usage} %</span>${UI.progress(usage,usageClass)}</div>`;
    return {className:isUnbudgeted?'budget-row-unbudgeted':'',cells:[category,r[9]||'Hele måneden',UI.money(planned),UI.money(actual),UI.money(forecast),`<strong class="${variance>=0?'positive':'negative'}">${UI.money(variance)}</strong>`,usageCell]};
  });
  const metrics = AppState.finance?.metrics || {};
  const planned = num(metrics.budgetPlanned);
  const actual = num(metrics.budgetActual);
  const forecast = num(metrics.budgetForecast);
  const remaining = num(metrics.budgetRemaining);
  const unbudgeted = num(metrics.unbudgetedActual);
  const warnings = AppState.budgets.filter(r=>num(r[1])>0 && pct(r[2],r[1]) >= num(r[5]||90)).length;
  const periodLabel = AppState.finance?.period?.isYear ? 'Årsbudsjett' : 'Månedsbudsjett';
  const columns = [
    {label:'Kategori',key:'category',sortable:true},
    {label:'Periode',key:'period',width:'118px'},
    {label:'Planlagt',key:'planned',align:'right',sortable:true},
    {label:'Faktisk',key:'actual',align:'right',sortable:true},
    {label:'Forventet',key:'forecast',align:'right',sortable:true},
    {label:'Avvik mot plan',key:'variance',align:'right',sortable:true},
    {label:'Forbruk',key:'usage',align:'right',sortable:true,width:'150px'}
  ];
  const toolbar = UI.tableToolbar('<input class="search" type="search" placeholder="Søk i budsjett" aria-label="Søk i budsjett">','',{className:'page-table-toolbar budget-toolbar'});
  return UI.pageHeader('Budsjett','Planlagt ramme koblet direkte til faktiske utgifter for valgt periode', UI.button('＋ Ny budsjettpost'))+
  `<div class="kpi-grid budget-kpi-grid">${UI.kpi('Planlagt totalt',UI.money(planned),`${AppState.budgets.filter(r=>!r[7]).length} budsjetterte kategorier`)}${UI.kpi('Faktisk hittil',UI.money(actual),`${pct(actual,planned)} % av planen`)}${UI.kpi('Forventet totalt',UI.money(forecast),'Alle registrerte utgifter i perioden')}${UI.kpi('Gjenstående ramme',UI.money(remaining),unbudgeted?`${UI.money(unbudgeted)} er ikke budsjettert`:'Ingen ubudsjetterte kjøp',remaining>=0?'positive':'negative')}</div>`+
  UI.card(periodLabel,toolbar+UI.table(columns,rows,{stickyHeader:true,emptyText:'Ingen budsjettposter ennå. Opprett en budsjettpost for å komme i gang.',className:'budget-table',wrapClass:'budget-table-scroll'}),`<span class="badge ${warnings?'warning':'success'}">${warnings ? countText(warnings,'varsel') : 'Ingen varsler'}</span>`);
}

function income() {
  const rows=AppState.incomes.map(r=>[r[0],UI.money(r[1]),r[2],r[3],r[4],badgeForStatus(r[5])]);
  const monthTotal=num(AppState.finance?.metrics?.plannedIncome);
  const fixed=total(AppState.finance?.incomes?.filter(r=>['månedlig','fast'].includes(String(r.frequency||'').toLowerCase())),r=>r.amount);
  const variable=monthTotal-fixed;
  const annual=num(AppState.annualFinance?.metrics?.plannedIncome);
  const columns=[
    {label:'Navn',key:'name',sortable:true},
    {label:'Beløp',key:'amount',align:'right',sortable:true,width:'132px'},
    {label:'Dato',key:'date',sortable:true,width:'118px'},
    {label:'Frekvens',key:'frequency',sortable:true,width:'126px'},
    {label:'Kategori',key:'category',sortable:true},
    {label:'Status',key:'status',sortable:true,width:'112px'}
  ];
  const toolbar=UI.tableToolbar('<input class="search" type="search" placeholder="Søk i inntekter" aria-label="Søk i inntekter">','',{className:'page-table-toolbar income-toolbar'});
  return UI.pageHeader('Inntekter','Faste og variable inntekter',UI.button('＋ Ny inntekt'))+
  `<div class="kpi-grid income-kpi-grid">${UI.kpi('Denne måneden',UI.money(monthTotal),countText(AppState.incomes.length,'registrert inntekt','registrerte inntekter'))}${UI.kpi('Fast inntekt',UI.money(fixed),`${pct(fixed,monthTotal)} % av totalen`)}${UI.kpi('Øvrige inntekter',UI.money(variable),'Ikke registrert som fast månedlig inntekt')}${UI.kpi('Forventet årsinntekt',UI.money(annual),'Basert på aktive poster')}</div>`+
  UI.card('Alle inntekter',toolbar+UI.table(columns,rows,{stickyHeader:true,emptyText:'Ingen inntekter registrert ennå. Opprett en inntekt for å komme i gang.',className:'income-table',wrapClass:'income-table-scroll'}));
}

function expenses() {
  const sourceRows=expenseCategoryFilter ? AppState.expenses.filter(r=>String(r[3]||'').toLocaleLowerCase('nb-NO')===expenseCategoryFilter.toLocaleLowerCase('nb-NO')) : AppState.expenses;
  const rows=sourceRows.map(r=>[r[0],UI.money(r[1]),r[2],r[3],r[4],badgeForStatus(r[5])]);
  const fixed=num(AppState.finance?.metrics?.fixedExpenses);
  const variable=num(AppState.finance?.metrics?.variableExpenses);
  const unpaidRows=AppState.expenses.filter(r=>r[5]==='Ubetalt' || r[5]==='Delvis');
  const unpaid=num(AppState.finance?.metrics?.unpaidExpenses);
  const annualReserve=num(AppState.finance?.metrics?.annualReserve);
  const clearFilter=expenseCategoryFilter?`<button class="btn secondary small" id="clearExpenseCategoryFilter">Vis alle</button>`:'';
  const columns=[
    {label:'Beskrivelse',key:'description',sortable:true},
    {label:'Beløp',key:'amount',align:'right',sortable:true,width:'132px'},
    {label:'Forfall',key:'due',sortable:true,width:'118px'},
    {label:'Kategori',key:'category',sortable:true},
    {label:'Frekvens',key:'frequency',sortable:true,width:'126px'},
    {label:'Status',key:'status',sortable:true,width:'112px'}
  ];
  const searchValue=String(expenseCategoryFilter||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const toolbar=UI.tableToolbar(`<input class="search" type="search" value="${searchValue}" placeholder="Søk i utgifter" aria-label="Søk i utgifter">`,'',{className:'page-table-toolbar expense-toolbar'});
  return UI.pageHeader('Utgifter',expenseCategoryFilter?`Viser utgifter i kategorien ${expenseCategoryFilter}`:'Faste, variable, periodiske og engangsutgifter',clearFilter+UI.button('＋ Ny utgift'))+
  `<div class="kpi-grid expense-kpi-grid">${UI.kpi('Faste utgifter',UI.money(fixed),'Basert på utgiftstype')}${UI.kpi('Øvrige utgifter',UI.money(variable),'Ikke klassifisert som faste utgifter')}${UI.kpi('Ubetalte regninger',UI.money(unpaid),countText(unpaidRows.length,'forfall gjenstår','forfall gjenstår'),'negative')}${UI.kpi('Årsutgifter fordelt',UI.money(annualReserve),'Månedlig reserve')}</div>`+
  UI.card(expenseCategoryFilter?`Utgifter · ${expenseCategoryFilter}`:'Alle utgifter',toolbar+UI.table(columns,rows,{stickyHeader:true,emptyText:'Ingen utgifter registrert ennå. Opprett en utgift for å komme i gang.',className:'expense-table',wrapClass:'expense-table-scroll'}));
}

function loans() {
  const cards=AppState.loans.map(l=>`<article class="card loan-card"><div class="loan-card-head"><div class="loan-card-title"><span class="badge">${l.type}</span><h3>${l.name}</h3></div>${l.term?`<span class="loan-term">${l.term}</span>`:''}</div><div class="loan-balance"><span>Restsaldo</span><strong>${UI.money(l.balance)}</strong></div><div class="loan-details"><div class="meta-row"><span>Nominell rente</span><strong>${num(l.nominal).toFixed(2)} %</strong></div><div class="meta-row"><span>Effektiv rente</span><strong>${num(l.effective).toFixed(2)} %</strong></div><div class="meta-row"><span>Terminbeløp</span><strong>${UI.money(l.payment)}</strong></div></div>${l.includePayment?`<div class="loan-budget-link"><span class="badge success">Med i budsjettet</span><span>${l.expenseCategory||'Lån og gjeld'}</span></div>`:''}</article>`).join('');
  const debt=num(AppState.finance?.metrics?.debt);
  const payments=num(AppState.finance?.metrics?.loanPayments);
  const interest=num(AppState.finance?.metrics?.interest);
  const reduced=total(AppState.loans,l=>Math.max(0,num(l.original)-num(l.balance)));
  const loanCards=cards||`<div class="loan-empty-state">${UI.emptyState('Ingen lån registrert','Opprett et lån for å få oversikt over renter, avdrag og nedbetaling.')}</div>`;
  return UI.pageHeader('Lån og gjeld','Full oversikt over renter, avdrag og nedbetaling','<button class="btn secondary" id="loanSimulatorBtn">Rentesimulator</button>'+UI.button('＋ Nytt lån'))+
  `<div class="kpi-grid loans-kpi-grid">${UI.kpi('Total gjeld',UI.money(debt),countText(AppState.loans.length,'aktivt lån','aktive lån'))}${UI.kpi('Månedlige terminer',UI.money(payments),'Sum registrerte terminbeløp')}${UI.kpi('Renter denne måneden',UI.money(interest),'Beregnet fra nominell rente')}${UI.kpi('Nedbetalt totalt',UI.money(reduced),'Opprinnelig lån minus restsaldo','positive')}</div><div class="card-grid loan-grid">${loanCards}</div>`;
}

function savings() {
  const goals=(AppState.goals||[]).sort((a,b)=>goalPriorityRank(a.priority)-goalPriorityRank(b.priority));
  const annualIncome=num(AppState.annualFinance?.metrics?.plannedIncome);
  const plannedMonthly=total(goals,g=>g.monthly);
  const savingsRate=annualIncome>0 ? plannedMonthly*12/annualIncome*100 : 0;
  const monthlySurplus=Math.max(0,num(AppState.annualFinance?.metrics?.expectedCashFlow)/12);
  const surplusGoal=goals.find(g=>g.useSurplus!==false && goalCurrent(g)<num(g.target));
  const cards=goals.map(g=>{
    const current=goalCurrent(g), target=num(g.target), progress=Math.min(100,pct(current,target));
    const status=goalStatus(g);
    const extra=FinanceEngine.goalTargetDate({...g,current,createdAt:null},AppState.selectedPeriod,500);
    const normal=FinanceEngine.goalTargetDate({...g,current,createdAt:null},AppState.selectedPeriod,0);
    const monthsEarlier=normal.months!=null&&extra.months!=null?Math.max(0,normal.months-extra.months):0;
    const priorityClass=g.priority==='Høy'?'warning':'';
    return `<article class="card goal-card" data-crud-id="${g.id}"><div class="goal-card-head"><div class="goal-card-title"><span class="badge ${status.className}">${status.label}</span><h3>${g.name}</h3></div><span class="badge ${priorityClass}">${g.priority||'Middels'} prioritet</span></div><div class="goal-balance"><div><span>Oppspart</span><strong>${UI.money(current)}</strong></div><small>av ${UI.money(target)}</small></div><div class="goal-progress"><div class="goal-progress-head"><span>${progress} %</span><span>${UI.money(g.monthly)}/mnd</span></div>${UI.progress(progress,progress>=60?'success':'')}</div><div class="goal-details"><span>${status.date}</span>${monthsEarlier?`<span class="goal-insight-line">+500 kr/mnd → ${monthsEarlier} måneder tidligere</span>`:`<span class="goal-insight-line">+500 kr/mnd → raskere fremdrift</span>`}</div></article>`;
  }).join('');
  const goalCards=cards||`<div class="goal-empty-state">${UI.emptyState('Ingen aktive sparemål','Opprett et mål og angi hvor mye du ønsker å spare per måned.')}</div>`;
  const suggestion=surplusGoal&&monthlySurplus>0?`<div class="savings-suggestion-main"><span>Forventet månedlig overskudd</span><strong>${UI.money(monthlySurplus)}</strong></div><div class="savings-suggestion-note">Prioritert forslag: <strong>${surplusGoal.name}</strong><span>Forslag – bokføres ikke automatisk</span></div>`:`<div class="savings-suggestion-empty"><strong>Ingen ekstra spareforslag akkurat nå</strong><span>Positivt overskudd vises her når prognosen gir rom.</span></div>`;
  return UI.pageHeader('Sparemål','Planlegg sparingen – appen beregner fremdrift og forventet måldato',UI.button('＋ Nytt sparemål'))+
    `<div class="kpi-grid savings-kpi-grid">${UI.kpi('Planlagt sparing',UI.money(plannedMonthly)+'/mnd',countText(goals.length,'aktivt mål','aktive mål'))}${UI.kpi('Sparerate',`${savingsRate.toLocaleString('nb-NO',{maximumFractionDigits:1})} %`,'Andel av forventet årsinntekt')}${UI.kpi('Beregnet oppspart',UI.money(total(goals,goalCurrent)),'Basert på startbeløp og spareplan')}${UI.kpi('Mulig overskudd',UI.money(monthlySurplus)+'/mnd','Forslag – ikke bokført')}</div>`+
    `<section class="card savings-suggestion-card"><div class="card-header"><h3>Mulig ekstra sparing</h3></div><div class="card-body">${suggestion}</div></section>`+
    `<div class="card-grid goal-grid">${goalCards}</div>`;
}

function recipeUsageStats(recipe) {
  const plans=AppState.allMealPlans||AppState.mealPlans||[];
  const matches=plans.filter(plan=>Number(plan?.recipeId)===Number(recipe?.id) || String(plan?.name||'').trim().toLocaleLowerCase('nb-NO')===String(recipe?.name||'').trim().toLocaleLowerCase('nb-NO'));
  const dates=matches.map(plan=>String(plan?.date||'')).filter(Boolean).sort();
  return {count:matches.length,lastUsed:dates.at(-1)||''};
}

function recipePantryCoverage(recipe) {
  const ingredients=(Array.isArray(recipe?.ingredients)?recipe.ingredients:[]).filter(item=>num(item?.usedQuantity)>0);
  if(!ingredients.length)return {available:false,covered:0,total:0,ratio:-1};
  const pantry=AppState.pantryItems||[];
  const covered=ingredients.filter(item=>ShoppingEngine.pantryQuantity(item,pantry)+1e-9>=ShoppingEngine.canonicalQuantity(num(item.usedQuantity),item.usedUnit||item.unit||'stk')).length;
  return {available:true,covered,total:ingredients.length,ratio:covered/ingredients.length};
}

function recipeCardData(recipe) {
  const ingredients=Array.isArray(recipe?.ingredients)?recipe.ingredients:[];
  const servings=Math.max(1,num(recipe?.servings)||1);
  const pricing=PricingEngine.recipeCost(ingredients,servings);
  const total=pricing.total>0?pricing.total:num(recipe?.price);
  const perServing=pricing.perServing>0?pricing.perServing:num(recipe?.pricePerServing)||(total/servings);
  const stores=[...new Set(ingredients.map(item=>item.store).filter(Boolean))];
  return {recipe,ingredients,servings,total,perServing,stores,usage:recipeUsageStats(recipe),coverage:recipePantryCoverage(recipe)};
}

function recipeImageHtml(recipe) {
  const image=String(recipe?.image||'').trim();
  if(!image)return '<div class="recipe-card-image-placeholder" aria-hidden="true"><span>🍽️</span><small>Ingen bilde</small></div>';
  return `<img class="recipe-card-image" src="${escapeHtml(image)}" alt="${escapeHtml(recipe.name||'Oppskrift')}" loading="lazy">`;
}

function recipes() {
  const allData=(AppState.recipes||[]).map(recipeCardData);
  const categories=[...new Set(allData.map(item=>String(item.recipe.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nb-NO'));
  const query=recipeSearchQuery.trim().toLocaleLowerCase('nb-NO');
  const visible=allData.filter(item=>{
    const recipe=item.recipe;
    const matchesCategory=!recipeCategoryFilter||recipe.category===recipeCategoryFilter;
    const matchesFavorite=recipeFavoriteFilter!=='favorites'||recipe.favorite===true;
    const haystack=[recipe.name,recipe.category,recipe.time,...(Array.isArray(recipe.tags)?recipe.tags:[]),...item.stores].filter(Boolean).join(' ').toLocaleLowerCase('nb-NO');
    const matchesSearch=!query||haystack.includes(query);
    return matchesCategory&&matchesFavorite&&matchesSearch;
  }).sort((a,b)=>{
    if(recipeSort==='used')return b.usage.count-a.usage.count || String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
    if(recipeSort==='cheap')return (a.perServing||Infinity)-(b.perServing||Infinity) || String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
    if(recipeSort==='time')return recipeTimeMinutes(a.recipe.time)-recipeTimeMinutes(b.recipe.time) || String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
    if(recipeSort==='pantry')return b.coverage.ratio-a.coverage.ratio || String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
    if(recipeSort==='name')return String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
    return String(b.usage.lastUsed||'').localeCompare(String(a.usage.lastUsed||'')) || b.usage.count-a.usage.count || String(a.recipe.name||'').localeCompare(String(b.recipe.name||''),'nb-NO');
  });
  const cards=visible.map(item=>{
    const r=item.recipe;
    const coverage=item.coverage.available?`✓ ${item.coverage.covered}/${item.coverage.total} på lager`:'Lagerdekning ikke tilgjengelig';
    const stores=item.stores.length?item.stores.slice(0,2).join(' · '):'Ingen butikk valgt';
    const favoriteTitle=r.favorite?'Fjern fra favoritter':'Legg til som favoritt';
    const searchText=[r.name,r.category,r.time,...(Array.isArray(r.tags)?r.tags:[]),...item.stores].filter(Boolean).join(' ').toLocaleLowerCase('nb-NO');
    return `<article class="card recipe-card" data-recipe-id="${r.id}" data-recipe-search="${escapeHtml(searchText)}"><div class="recipe-card-media">${recipeImageHtml(r)}<button type="button" class="recipe-card-favorite-toggle ${r.favorite?'active':''}" data-id="${r.id}" aria-pressed="${r.favorite?'true':'false'}" title="${favoriteTitle}" aria-label="${favoriteTitle}">★</button></div><div class="recipe-card-body"><div class="recipe-card-title-row"><h3 title="${escapeHtml(r.name||'')}">${escapeHtml(r.name||'Uten navn')}</h3><span class="badge">${escapeHtml(r.category||'Oppskrift')}</span></div><div class="recipe-meta"><span>${escapeHtml(r.time||'Tid ikke oppgitt')}</span><span>${item.servings} porsjoner</span></div><div class="recipe-card-facts"><strong>${item.perServing>0?`${UI.money(item.perServing)} / porsjon`:'Pris ikke beregnet'}</strong><span>${coverage}</span></div><div class="recipe-card-store" title="${escapeHtml(item.stores.join(', '))}">${escapeHtml(stores)}</div><div class="recipe-card-actions"><button type="button" class="btn primary small recipe-add-plan" data-id="${r.id}">Legg i matplan</button><button type="button" class="btn secondary small recipe-open" data-id="${r.id}">Åpne</button></div></div></article>`;
  }).join('');
  const grid=cards||`<div class="recipe-empty-state">${UI.emptyState('Ingen oppskrifter matcher','Juster søk eller filter.')}</div>`;
  const controls=`<input class="search" id="recipeSearchInput" type="search" placeholder="Søk i oppskrifter" aria-label="Søk i oppskrifter" value="${escapeHtml(recipeSearchQuery)}"><select id="recipeCategoryFilter" aria-label="Kategori"><option value="">Alle kategorier</option>${categories.map(category=>`<option value="${escapeHtml(category)}" ${recipeCategoryFilter===category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select><select id="recipeFavoriteFilter" aria-label="Favorittfilter"><option value="all" ${recipeFavoriteFilter==='all'?'selected':''}>Alle oppskrifter</option><option value="favorites" ${recipeFavoriteFilter==='favorites'?'selected':''}>★ Favoritter</option></select><select id="recipeSort" aria-label="Sorter oppskrifter"><option value="recent" ${recipeSort==='recent'?'selected':''}>Sist brukt</option><option value="used" ${recipeSort==='used'?'selected':''}>Mest brukt</option><option value="cheap" ${recipeSort==='cheap'?'selected':''}>Billigst</option><option value="time" ${recipeSort==='time'?'selected':''}>Kortest tid</option><option value="pantry" ${recipeSort==='pantry'?'selected':''}>Mest på lager</option><option value="name" ${recipeSort==='name'?'selected':''}>Navn A–Å</option></select>`;
  const status=`${countText(allData.length,'oppskrift')} · ${countText(allData.filter(item=>item.recipe.favorite).length,'favoritt')}`;
  return UI.pageHeader('Oppskrifter',status,`<button class="btn secondary" id="importRecipeUrlBtn">Importer fra nett</button>${UI.button('＋ Ny oppskrift')}`)+UI.tableToolbar(controls,'',{className:'recipe-toolbar'})+`<div class="card-grid recipe-grid">${grid}</div>`;
}

function recipeTimeMinutes(value) {
  const text=String(value||'').toLowerCase();
  const hours=Number((text.match(/(\d+(?:[.,]\d+)?)\s*t(?:\b|ime)/)||[])[1]?.replace(',','.')||0);
  const minutes=Number((text.match(/(\d+(?:[.,]\d+)?)\s*min/)||[])[1]?.replace(',','.')||0);
  if(hours||minutes)return hours*60+minutes;
  const plain=Number((text.match(/\d+(?:[.,]\d+)?/)||[])[0]?.replace(',','.')||0);
  return plain||Number.POSITIVE_INFINITY;
}

function foodPeriodItems(items, dateKey='date') {
  const period=String(AppState.selectedPeriod||activePeriod||'');
  const [year,scope]=period.split('-');
  return (items||[]).filter(item=>{
    const value=String(item?.[dateKey]||item?.purchaseDate||'');
    if (!value) return true;
    return scope==='all' ? value.startsWith(`${year}-`) : value.startsWith(`${year}-${scope}`);
  });
}
function foodEconomy() {
  const recipes=AppState.recipes||[];
  const mealPlans=foodPeriodItems(AppState.mealPlans||[],'date');
  const shoppingItems=foodPeriodItems(AppState.shoppingItems||[],'purchaseDate');
  const foodBudget=num(AppState.summary.foodBudget);
  const foodActual=num(AppState.summary.foodActual);
  const plannedMeals=total(mealPlans,x=>x.estimatedCost);
  const shoppingPricing=PricingEngine.shoppingSummary(shoppingItems);
  const shoppingEstimate=shoppingPricing.estimated;
  const purchased=shoppingPricing.purchased;
  const recipePricing=PricingEngine.recipeSummary(recipes);
  const recipePrices=recipePricing.priced;
  const averagePortion=recipePricing.averagePerServing;
  const remaining=foodBudget-foodActual;
  const forecast=Math.max(foodActual,plannedMeals,shoppingEstimate);
  const activeShoppingCount=shoppingItems.filter(x=>!x.atHome&&!x.checked).length;
  const storeRows=shoppingPricing.byStore.map(({store,value})=>[store,UI.money(value),shoppingEstimate?`${pct(value,shoppingEstimate)} %`:'0 %']);
  const expensive=recipePricing.byPerServingDesc.slice(0,5).map(x=>[x.name,UI.money(x.total),UI.money(x.total/x.servings)]);
  const status=foodBudget<=0?'Opprett et Mat-budsjett':forecast<=foodBudget?'Innenfor budsjett':`Over budsjett med ${UI.money(forecast-foodBudget)}`;
  const budgetStatus=`<div class="food-budget-summary"><div><span>Brukt av matbudsjett</span><strong>${UI.money(foodActual)} <small>av ${UI.money(foodBudget)}</small></strong></div><span class="badge ${forecast>foodBudget?'danger':'success'}">${status}</span></div>${UI.progress(foodBudget?pct(foodActual,foodBudget):0,foodActual>foodBudget?'danger':'success')}<div class="food-budget-meta"><div><span>Gjenstår</span><strong class="${remaining<0?'negative':'positive'}">${UI.money(remaining)}</strong></div><div><span>Forventet nivå</span><strong>${UI.money(forecast)}</strong></div></div>`;
  const basis=`<div class="list-item"><span>Faktisk kjøpt</span><strong>${UI.money(purchased)}</strong></div><div class="list-item"><span>Planlagt mat</span><strong>${UI.money(plannedMeals)}</strong></div><div class="list-item"><span>Aktiv handleliste</span><strong>${UI.money(shoppingEstimate)}</strong></div><div class="list-item"><span>Snitt per porsjon</span><strong>${UI.money(averagePortion)}</strong></div><p class="muted">Oppskrift og matplan er estimater. Regnskap påvirkes først ved registrert kjøp.</p>`;
  return UI.pageHeader('Matøkonomi','Samlet kostnadsoversikt for oppskrifter, matplan, handleliste og faktisk matforbruk')+
    `<div class="kpi-grid">${UI.kpi('Matbudsjett',UI.money(foodBudget),periodLabel(AppState.selectedPeriod))}${UI.kpi('Faktisk forbruk',UI.money(foodActual),foodBudget?`${pct(foodActual,foodBudget)} % av budsjettet`:'Ingen budsjettramme')}${UI.kpi('Planlagt mat',UI.money(plannedMeals),`${mealPlans.length} måltider i perioden`)}${UI.kpi('Forventet nivå',UI.money(forecast),`${activeShoppingCount} varer på aktiv handleliste`)}</div>`+
    `<div class="food-economy-stack">`+
      UI.card('Budsjettstatus',budgetStatus)+
      `<div class="two-column">${UI.card('Handleliste per butikk',storeRows.length?UI.table(['Butikk','Estimert','Andel'],storeRows,{stickyHeader:true,emptyText:'Ingen butikkdata i handlelisten ennå.'}):UI.emptyState('Ingen butikkdata','Aktive handlevarer med butikk/pris vil vises her.'))}${UI.card('Kostnadsgrunnlag',basis)}</div>`+
      UI.card('Dyreste oppskrifter per porsjon',expensive.length?UI.table(['Oppskrift','Totalpris','Per porsjon'],expensive,{stickyHeader:true,emptyText:'Ingen prisede oppskrifter ennå.'}):UI.emptyState('Ingen prisede oppskrifter','Prisede oppskrifter vil vises her når prisgrunnlag finnes.'))+
    `</div>`;
}

const RECIPE_PRICE_CACHE_TTL_MS=24*60*60*1000;
const RECIPE_PRICE_BULK_SIZE=100;
const RECIPE_PRICE_REQUEST_INTERVAL_MS=1100;

async function refreshMealPlanRecipePrices(plans){
  const recipes=AppState.recipes||[];
  const engine=window.RecipePriceRefreshEngine;
  const kassal=window.budgetApp?.kassal;
  const config=AppState.settings?.kassalUi||{};
  if(!engine||!kassal?.pricesBulk||config.enabled===false||!config.hasToken)return {recipes,updatedRecipes:0,updatedIngredients:0,skipped:true};

  const eans=engine.collectEans(plans,recipes);
  if(!eans.length)return {recipes,updatedRecipes:0,updatedIngredients:0,skipped:true};

  const now=Date.now();
  const nowIso=new Date(now).toISOString();
  const cacheRows=await BudgetDB.getAll('apiCache');
  const cacheByKey=new Map(cacheRows.map(entry=>[entry.key,entry]));
  const rowsByEan=new Map();
  const stale=[];

  for(const ean of eans){
    const key=`recipe-price-v1:${ean}`;
    const cached=cacheByKey.get(key);
    const savedAt=new Date(cached?.savedAt||0).getTime();
    if(cached&&Number.isFinite(savedAt)&&now-savedAt<RECIPE_PRICE_CACHE_TTL_MS){
      rowsByEan.set(ean,{...(cached.payload||{ean,stores:[]}),_priceFetchedAt:cached.savedAt});
    }else stale.push(ean);
  }

  let lastRequestAt=0;
  for(let offset=0;offset<stale.length;offset+=RECIPE_PRICE_BULK_SIZE){
    const chunk=stale.slice(offset,offset+RECIPE_PRICE_BULK_SIZE);
    const wait=Math.max(0,RECIPE_PRICE_REQUEST_INTERVAL_MS-(Date.now()-lastRequestAt));
    if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
    lastRequestAt=Date.now();
    const payload=await kassal.pricesBulk({eans:chunk,days:1,aggregation:'min'});
    const returned=new Map((Array.isArray(payload?.data)?payload.data:[]).map(row=>[String(row?.ean||''),row]));
    for(const ean of chunk){
      const row=returned.get(String(ean))||{ean,stores:[]};
      rowsByEan.set(String(ean),{...row,_priceFetchedAt:nowIso});
      const existing=cacheByKey.get(`recipe-price-v1:${ean}`);
      await BudgetDB.put('apiCache',{...(existing||{}),key:`recipe-price-v1:${ean}`,payload:row,savedAt:nowIso});
    }
  }

  const applied=engine.applyRows(recipes,plans,rowsByEan,nowIso);
  for(const recipe of applied.changedRecipes)await BudgetDB.put('recipes',recipe);
  if(applied.changedRecipes.length)AppState.recipes=applied.recipes;
  return {recipes:applied.recipes,updatedRecipes:applied.changedRecipes.length,updatedIngredients:applied.changedIngredients,skipped:false};
}

async function rebuildShoppingFromMealPlan(plansOverride=null){
  const plans=Array.isArray(plansOverride)?plansOverride:foodPeriodItems(AppState.mealPlans||[],'date');
  let recipes=AppState.recipes||[];
  try{
    const refreshed=await refreshMealPlanRecipePrices(plans);
    recipes=refreshed.recipes||recipes;
  }catch(error){
    console.warn('Kunne ikke oppdatere oppskriftspriser før handlelistebygging',error);
    showToast('Kunne ikke hente ferske priser – bruker sist lagrede priser');
  }
  const generated=ShoppingEngine.buildGeneratedRecords(plans,recipes,AppState.pantryItems||[]);
  const listUid=await currentShoppingListUid({renew:true});
  const current=await BudgetDB.getAll('shoppingItems');
  for(const item of current.filter(x=>x.source==='mealplan-generated'&&!x.checked)) await BudgetDB.remove('shoppingItems',item.id);
  for(const record of generated) await BudgetDB.add('shoppingItems',{...record,mobileItemUid:mobileTransferUuid(),mobileListUid:listUid});
  await Backend.automaticBackup();
  await Backend.loadSnapshot(activePeriod);
  return generated.length;
}


function ingredientProductBrowserHtml() {
  const cfg=AppState.settings?.kassalUi||{};
  if(!cfg.hasToken) return UI.card('Finn produkter',`<p class="muted">Legg inn API-nøkkel under Innstillinger → API og integrasjoner for å søke i Kassalapp.</p><button class="btn primary" id="goToApiSettingsBtn">Åpne API-innstillinger</button>`);
  const sortOptions=[['date_desc','Nyeste først'],['date_asc','Eldste først'],['price_asc','Pris lav–høy'],['price_desc','Pris høy–lav'],['name_asc','Navn A–Å'],['name_desc','Navn Å–A']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const browserTop=`<div class="browser-topbar"><div><h3>Produkter fra Kassalapp</h3><p class="muted" id="kassalResultStatus">Henter produktoversikt …</p></div><label class="field ingredient-sort-field"><span>Sorter</span><select id="kassalSort" name="sort" form="kassalBrowserForm">${sortOptions}</select></label></div>`;
  return browserTop+`<div class="product-browser-layout"><aside class="card product-filter-card browser-filter-card"><div class="card-header"><h3>Finn produkter</h3></div><div class="card-body"><form id="kassalBrowserForm" class="product-filter-form browser-filter-form">
    <label class="field product-search-field"><span>Søk</span><input id="kassalProductSearch" name="search" type="search" autocomplete="off" spellcheck="false" minlength="3" value="${kassalBrowser.params?.search||''}" placeholder="Melk, kjøttdeig, pasta …"></label>
    ${UI.filterGroup('Kategorier',`<label class="check-row select-all-row"><input type="checkbox" id="categorySelectAll" checked><span>Alle kategorier</span></label><div id="kassalCategories" class="filter-options">${KASSAL_CATEGORIES.map(x=>`<label class="check-row"><input type="checkbox" name="category_filter" value="${x}"><span>${x}</span></label>`).join('')}</div>`)}
    ${UI.filterGroup('Butikker',`<label class="check-row select-all-row"><input type="checkbox" id="storeSelectAll" checked><span>Velg alle</span></label><div id="kassalStores" class="filter-options">${KASSAL_STORES.map(([v,l])=>`<label class="check-row"><input type="checkbox" name="store_filter" value="${v}"><span>${l}</span></label>`).join('')}</div>`)}
    ${UI.filterGroup('Ekskluder allergener',`<label class="check-row select-all-row"><input type="checkbox" id="allergenSelectAll" checked><span>Ingen allergenfilter</span></label><div id="kassalAllergens" class="filter-options">${KASSAL_ALLERGENS.map(x=>`<label class="check-row"><input type="checkbox" name="excl_allergens" value="${x}"><span>${x}</span></label>`).join('')}</div>`)}
    ${UI.filterGroup('Pris',`<div class="two-column compact-fields"><label class="field"><span>Fra</span><input name="price_min" type="number" min="0" step="1"></label><label class="field"><span>Til</span><input name="price_max" type="number" min="0" step="1"></label></div>`)}
    <label class="field product-page-size"><span>Produkter per side</span><select name="size"><option>24</option><option>48</option><option>96</option></select></label>
    <button class="btn primary product-filter-submit" type="submit">Vis produkter</button>
  </form></div></aside><section class="product-results"><div id="kassalProductGrid" class="api-product-grid" aria-live="polite"></div><div id="kassalPagination" class="pagination"></div></section></div>`;
}


function ingredientApiTabs(){
  return `<div class="page-view-tabs ingredient-api-tabs tabs-inline" role="tablist" aria-label="Produktvisning">
    <button class="ingredient-api-tab ${ingredientApiView==='products'?'active':''}" data-view="products" role="tab" aria-selected="${ingredientApiView==='products'}">Produkter</button>
    <button class="ingredient-api-tab ${ingredientApiView==='down'?'active':''}" data-view="down" role="tab" aria-selected="${ingredientApiView==='down'}">Prisfall</button>
    <button class="ingredient-api-tab ${ingredientApiView==='up'?'active':''}" data-view="up" role="tab" aria-selected="${ingredientApiView==='up'}">Prishopp</button>
  </div>`;
}

function knownPriceChangeProducts(){
  const map=new Map();
  const add=product=>{
    const ean=String(product?.ean||'').trim();
    if(!ean)return;
    const old=map.get(ean)||{};
    map.set(ean,{...old,...product,ean});
  };
  (kassalBrowser.products||[]).forEach(add);
  (AppState.pantryItems||[]).forEach(x=>add({ean:x.ean,name:x.name,brand:x.brand,image:x.image,category:x.category,packageSize:x.packageSize,unit:x.packageUnit||x.unit}));
  (AppState.shoppingItems||[]).forEach(x=>add({ean:x.ean,name:x.name,brand:x.brand,image:x.image,category:x.category,packageSize:x.packageSize,unit:x.packageUnit||x.unit}));
  (AppState.ingredients||[]).forEach(x=>add({ean:x?.[9],name:x?.[0],image:x?.[7],brand:x?.[8],category:x?.[5],packageSize:x?.[2],unit:x?.[1]}));
  (AppState.recipes||[]).flatMap(r=>r.recipeIngredients||r.ingredients||[]).forEach(x=>add({ean:x.ean,name:x.productName||x.name,brand:x.brand,image:x.image,category:x.category,packageSize:x.packageQuantity,unit:x.packageUnit}));
  return [...map.values()];
}

async function loadPriceChanges(force=false){
  if(priceChangeState.loading)return;
  if(priceChangeState.loaded&&!force)return;
  priceChangeState.loading=true;
  priceChangeState.error='';
  renderPriceChangeContent();
  try{
    const [downPayload,upPayload]=await Promise.all([
      window.budgetApp.kassal.weeklyPriceChanges({kind:'down',maxPages:30}),
      window.budgetApp.kassal.weeklyPriceChanges({kind:'up',maxPages:30})
    ]);

    const knownByEan=new Map(knownPriceChangeProducts().map(product=>[String(product.ean||''),product]));
    const enrich=row=>{
      const meta=knownByEan.get(String(row.ean||''));
      if(!meta)return row;
      return {
        ...row,
        id:meta.id||row.id,
        image:row.image||meta.image||'',
        brand:meta.brand||row.brand||'',
        category:meta.category||row.category||'',
        packageSize:meta.packageSize||row.packageSize||0,
        unit:meta.unit||row.unit||''
      };
    };

    priceChangeState.down=(Array.isArray(downPayload?.items)?downPayload.items:[]).map(enrich);
    priceChangeState.up=(Array.isArray(upPayload?.items)?upPayload.items:[]).map(enrich);
    priceChangeState.loaded=true;
  }catch(error){
    priceChangeState.error=error.message||'Kunne ikke hente ukens prisendringer';
  }finally{
    priceChangeState.loading=false;
    renderPriceChangeContent();
  }
}
function priceChangeCard(item,direction){
  const down=direction==='down';
  const deltaClass=down?'positive':'negative';
  const deltaSign=down?'−':'+';
  return `<article class="card api-product-card price-change-product-card">
    ${item.image
      ? `<button class="price-change-detail image-button" data-ean="${escapeHtml(item.ean)}"><img class="product-image-with-fallback" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer"></button>`
      : `<button class="price-change-detail image-button" data-ean="${escapeHtml(item.ean)}">${productImagePlaceholder('product-image-placeholder')}</button>`}
    <div class="api-product-body">
      <div class="product-card-meta"><span>Denne uken</span>${item.category?`<span>${escapeHtml(item.category)}</span>`:''}</div>
      <button class="product-title-button price-change-detail" data-ean="${escapeHtml(item.ean)}"><h3>${escapeHtml(item.name)}</h3></button>
      ${[item.brand,item.packageSize?`${item.packageSize} ${item.unit||''}`:''].filter(Boolean).length?`<p class="muted product-secondary">${[item.brand,item.packageSize?`${item.packageSize} ${item.unit||''}`:''].filter(Boolean).map(escapeHtml).join(' · ')}</p>`:''}
      <div class="product-price-row price-change-prices">
        <strong>${UI.money(item.currentPrice)}</strong>
        <span>Før ${UI.money(item.oldPrice)}</span>
      </div>
      <div class="price-change-delta ${deltaClass}">${deltaSign}${UI.money(Math.abs(item.diff))} · ${deltaSign}${Math.abs(item.percent).toFixed(1)} %</div>
      <div class="product-actions">
        <button class="btn secondary small price-change-detail" data-ean="${escapeHtml(item.ean)}">Detaljer</button>
        <button class="btn secondary small price-change-shopping" data-ean="${escapeHtml(item.ean)}">Til handleliste</button>
      </div>
    </div>
  </article>`;
}
function priceChangePanelHtml(){
  const direction=ingredientApiView==='up'?'up':'down';
  const filters=priceChangeState.filters;
  const label=direction==='down'?'prisnedgang':'prishopp';

  const browserTop=`<div class="browser-topbar"><div><h3>${direction==='down'?'Prisfall':'Prishopp'} denne uken</h3><p class="muted" id="priceChangeStatus"></p></div><label class="field ingredient-sort-field"><span>Sorter</span><select id="priceChangeSort">
      <option value="diff_desc" ${filters.sort==='diff_desc'?'selected':''}>Størst ${label}</option>
      <option value="diff_asc" ${filters.sort==='diff_asc'?'selected':''}>Minst ${label}</option>
      <option value="price_asc" ${filters.sort==='price_asc'?'selected':''}>Laveste pris</option>
      <option value="price_desc" ${filters.sort==='price_desc'?'selected':''}>Høyeste pris</option>
    </select></label></div>`;
  return browserTop+`<div class="product-browser-layout price-change-browser">
    <aside class="card product-filter-card browser-filter-card">
      <div class="card-header"><h3>Finn produkter</h3></div>
      <div class="card-body">
        <div class="product-filter-form browser-filter-form">
          <label class="field product-search-field"><span>Søk</span><input id="priceChangeSearch" type="search" autocomplete="off" spellcheck="false" value="${escapeHtml(filters.search||'')}" placeholder="${direction==='down'?'Søk i prisfall':'Søk i prishopp'}"></label>
        </div>
      </div>
    </aside>

    <section class="product-results">
      <div id="priceChangeGrid" class="api-product-grid"></div>
    </section>
  </div>`;
}
function renderPriceChangeContent(){
  const host=document.getElementById('ingredientApiContent');
  if(!host||ingredientApiView==='products')return;
  if(!host.querySelector('.price-change-browser'))host.innerHTML=priceChangePanelHtml();
  const grid=document.getElementById('priceChangeGrid'),status=document.getElementById('priceChangeStatus');
  if(!grid||!status)return;
  if(priceChangeState.loading){
    status.textContent='Henter Kassalapps ukeliste …';
    grid.innerHTML='<div class="product-loading-state"><span class="table-spinner" aria-hidden="true"></span><span>Henter ukens prisendringer …</span></div>';
    return;
  }
  if(priceChangeState.error){
    status.textContent='Kunne ikke hente prisendringer';
    grid.innerHTML=`<div class="card"><div class="card-body"><p class="negative">${escapeHtml(priceChangeState.error)}</p></div></div>`;
    return;
  }

  const search=String(priceChangeState.filters.search||'').trim().toLocaleLowerCase('nb-NO');
  const rows=[...(ingredientApiView==='up'?priceChangeState.up:priceChangeState.down)].filter(item=>{
    if(!search)return true;
    const haystack=[item.name,item.brand,item.category,item.ean].filter(Boolean).join(' ').toLocaleLowerCase('nb-NO');
    return haystack.includes(search);
  });
  const sort=priceChangeState.filters.sort||'diff_desc';

  switch(sort){
    case 'diff_asc':
      rows.sort((a,b)=>Math.abs(num(a.diff))-Math.abs(num(b.diff)));
      break;
    case 'price_asc':
      rows.sort((a,b)=>num(a.currentPrice)-num(b.currentPrice));
      break;
    case 'price_desc':
      rows.sort((a,b)=>num(b.currentPrice)-num(a.currentPrice));
      break;
    default:
      rows.sort((a,b)=>Math.abs(num(b.diff))-Math.abs(num(a.diff)));
      break;
  }

  status.textContent=`${rows.length} varer · Kassalapps ukeliste`;
  grid.innerHTML=rows.length
    ? rows.map(x=>priceChangeCard(x,ingredientApiView)).join('')
    : UI.emptyState('Ingen prisendringer funnet','Ingen varer i ukens liste.');
  wirePriceChangeActions();
}
function wirePriceChangeActions(){
  const host=document.getElementById('priceChangeGrid');
  wireProductImageFallbacks(host);

  const sort=document.getElementById('priceChangeSort');
  const search=document.getElementById('priceChangeSearch');

  sort?.addEventListener('change',()=>{
    priceChangeState.filters={...priceChangeState.filters,sort:sort.value||'diff_desc'};
    renderPriceChangeContent();
  });
  search?.addEventListener('input',()=>{
    priceChangeState.filters={...priceChangeState.filters,search:search.value||''};
    renderPriceChangeContent();
  });

  document.querySelectorAll('.price-change-detail').forEach(btn=>btn.addEventListener('click',async()=>{
    const ean=String(btn.dataset.ean||'').trim();
    if(!ean)return;

    const source=ingredientApiView==='up'?priceChangeState.up:priceChangeState.down;
    const item=source.find(x=>String(x.ean)===ean);
    if(!item)return;

    let product=null;
    try{
      const payload=await cachedApi(
        `kassal-weekly-ean-detail-v1:${ean}`,
        24*60*60*1000,
        ()=>window.budgetApp.kassal.getProductByEan(ean)
      );
      product=normalizeKassalProducts(payload)[0]||null;
    }catch(_){}

    product=product||{
      id:item.id||null,
      eName:item.name,
      ean:item.ean,
      image:item.image||'',
      brand:item.brand||'',
      category:item.category||'',
      packageSize:item.packageSize||0,
      unit:item.unit||'',
      price:item.currentPrice||0,
      store:item.store||''
    };

    product.price=item.currentPrice||product.price||0;

    const previousProducts=kassalBrowser.products;
    kassalBrowser.products=[product];
    try{
      await showProductDetails(0);
    }finally{
      kassalBrowser.products=previousProducts;
    }
  }));

  document.querySelectorAll('.price-change-shopping').forEach(btn=>btn.addEventListener('click',async()=>{
    const source=ingredientApiView==='up'?priceChangeState.up:priceChangeState.down;
    const item=source.find(x=>String(x.ean)===String(btn.dataset.ean));
    if(!item)return;
    const result=await CRUD.addShoppingWithPantryGate({
      name:item.name,
      quantity:1,
      unit:'stk',
      category:'Dagligvare',
      recipe:'',
      price:item.currentPrice,
      unitPrice:item.currentPrice,
      atHome:false,
      checked:false,
      ean:item.ean,
      createdAt:new Date().toISOString()
    },{mergeExact:true});

    if(result.added){
      await Backend.automaticBackup();
      await Backend.loadSnapshot(activePeriod);
      showToast('Produkt lagt til i handlelisten');
    }
  }));
}

function ingredients() {
  const body=ingredientApiView==='products'?ingredientProductBrowserHtml():priceChangePanelHtml();
  return UI.pageHeader('Ingredienser','Finn matvarer, priser og produktinformasjon fra Kassalapp')+ingredientApiTabs()+`<div id="ingredientApiContent">${body}</div>`;
}


function mealPlanIsoWeek(value){
  const date=new Date(`${String(value||'').slice(0,10)}T12:00:00`);
  if(Number.isNaN(date.getTime()))return 0;
  const target=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=target.getUTCDay()||7;
  target.setUTCDate(target.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(target.getUTCFullYear(),0,1));
  return Math.ceil((((target-yearStart)/86400000)+1)/7);
}
function mealPlanAnchorDate(){
  if(mealPlanWeekStart)return mealPlanWeekStart;
  const all=AppState.allMealPlans||AppState.mealPlans||[];
  const today=new Date().toISOString().slice(0,10);
  const period=String(activePeriod||AppState.selectedPeriod||'');
  const [year,scope]=period.split('-');
  if(scope==='all'&&String(new Date().getFullYear())===year) return today;
  if(scope!=='all'&&today.startsWith(`${period}-`)) return today;
  const latest=MealPlanningEngine.latestWeekDate(all,period);
  if(latest)return latest;
  if(/^\d{4}-\d{2}$/.test(period))return `${period}-01`;
  if(/^\d{4}-all$/.test(period))return `${year}-01-01`;
  return today;
}
function mealPlanDayInventory(plans){
  const merged=ShoppingEngine.mergeMealPlanIngredients(plans,AppState.recipes||[]);
  if(!merged.length)return null;
  let stocked=0,missing=0;
  for(const item of merged){
    const inStock=ShoppingEngine.pantryQuantity(item,AppState.pantryItems||[]);
    if(inStock>=num(item.totalNeed)&&num(item.totalNeed)>0)stocked+=1;
    else missing+=1;
  }
  return {stocked,missing,total:merged.length};
}
function mealPlanMealOrder(type){
  const order={frokost:1,lunsj:2,middag:3,kveldsmat:4,mellommåltid:5};
  return order[String(type||'').toLocaleLowerCase('nb-NO')]||99;
}
function mealPlanMealTypeClass(type){
  const classes={frokost:'breakfast',lunsj:'lunch',middag:'dinner',kveldsmat:'evening',mellommåltid:'snack'};
  return classes[String(type||'').toLocaleLowerCase('nb-NO')]||'other';
}
function mealPlanSelectionMarker(planId){
  if(!mealPlanEditMode)return '';
  const selected=mealPlanSelectedIds.has(Number(planId));
  return `<span class="mealplan-select-mark" aria-hidden="true">${selected?'✓':''}</span>`;
}
function mealPlanDayMenuHtml(date,hasMeals){
  if(!mealPlanEditMode||!hasMeals)return '';
  return `<details class="mealplan-day-menu"><summary title="Handlinger for dagen">⋯</summary><div class="mealplan-day-menu-popover"><button type="button" class="mealplan-menu-action mealplan-add" data-date="${date}">Legg til måltid</button><button type="button" class="mealplan-menu-action danger mealplan-clear-day" data-date="${date}">Tøm dagen</button></div></details>`;
}
function mealPlanDayHtml(date,plans){
  const dayNames=['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
  const dateObj=new Date(`${date}T12:00:00`);
  const dayName=dayNames[dateObj.getDay()]||'';
  const dateLabel=dateObj.toLocaleDateString('nb-NO',{day:'numeric',month:'long'});
  const normalizedPlans=plans.map(plan=>MealPlanningEngine.normalizePlan(plan,AppState.recipes||[])).sort((a,b)=>mealPlanMealOrder(a.mealType)-mealPlanMealOrder(b.mealType)||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'}));
  const mealsHtml=normalizedPlans.map(plan=>{
    const inventory=mealPlanDayInventory([plan]);
    const inventoryHtml=inventory?`<span class="mealplan-stock"><span class="positive">✓ ${inventory.stocked} på lager</span><span>🛒 ${inventory.missing} mangler</span></span>`:'';
    const selected=mealPlanSelectedIds.has(Number(plan.id));
    return `<button type="button" class="mealplan-meal mealplan-edit mealplan-type-${mealPlanMealTypeClass(plan.mealType)}${selected?' is-selected':''}" data-id="${plan.id}" title="${mealPlanEditMode?'Velg':'Åpne'} ${escapeHtml(plan.name||'måltid')}" aria-pressed="${mealPlanEditMode?String(selected):'false'}">${mealPlanSelectionMarker(plan.id)}<span class="mealplan-meal-main"><span class="mealplan-meal-type">${escapeHtml(plan.mealType||'Måltid')}</span><strong>${escapeHtml(plan.name||'Måltid')}</strong><span>${num(plan.persons)} ${num(plan.persons)===1?'person':'personer'} · ca. ${UI.money(plan.estimatedCost||0)}</span></span>${inventoryHtml}</button>`;
  }).join('');
  const addHtml=`<button type="button" class="mealplan-empty mealplan-add" data-date="${date}">＋ Velg måltid</button>`;
  return `<article class="mealplan-day ${normalizedPlans.length?'has-meals':'is-empty'}${mealPlanEditMode?' is-editing':''}"><header class="mealplan-day-head"><div><strong>${escapeHtml(dayName)}</strong><span>${escapeHtml(dateLabel)}</span></div>${mealPlanDayMenuHtml(date,normalizedPlans.length>0)}</header><div class="mealplan-day-content">${mealsHtml}${addHtml}</div></article>`;
}
function mealPlanMonthKey(){
  if(mealPlanMonth)return mealPlanMonth;
  const anchor=mealPlanAnchorDate();
  return String(anchor).slice(0,7);
}
function mealPlanMonthDayHtml(date,plans,inMonth=true){
  if(!inMonth)return '<div class="mealplan-month-day is-outside" aria-hidden="true"></div>';
  const dateObj=new Date(`${date}T12:00:00`);
  const normalized=plans.map(plan=>MealPlanningEngine.normalizePlan(plan,AppState.recipes||[])).sort((a,b)=>mealPlanMealOrder(a.mealType)-mealPlanMealOrder(b.mealType)||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'}));
  const visible=normalized.slice(0,4).map(plan=>{
    const selected=mealPlanSelectedIds.has(Number(plan.id));
    return `<button type="button" class="mealplan-month-meal mealplan-edit mealplan-type-${mealPlanMealTypeClass(plan.mealType)}${selected?' is-selected':''}" data-id="${plan.id}" title="${mealPlanEditMode?'Velg':'Åpne'} ${escapeHtml(plan.mealType||'Måltid')}: ${escapeHtml(plan.name||'Måltid')}" aria-pressed="${mealPlanEditMode?String(selected):'false'}">${mealPlanSelectionMarker(plan.id)}<span>${escapeHtml(plan.mealType||'Måltid')}</span><strong>${escapeHtml(plan.name||'Måltid')}</strong></button>`;
  }).join('');
  const more=normalized.length>4?`<button type="button" class="mealplan-month-more mealplan-open-week" data-date="${date}">+${normalized.length-4} flere</button>`:'';
  const dayMenu=mealPlanEditMode&&normalized.length?`<details class="mealplan-month-day-menu"><summary title="Handlinger for dagen">⋯</summary><div class="mealplan-day-menu-popover"><button type="button" class="mealplan-menu-action mealplan-add" data-date="${date}">Legg til måltid</button><button type="button" class="mealplan-menu-action danger mealplan-clear-day" data-date="${date}">Tøm dagen</button></div></details>`:'';
  return `<article class="mealplan-month-day ${normalized.length?'has-meals':'is-empty'}${mealPlanEditMode?' is-editing':''}"><button type="button" class="mealplan-month-date mealplan-open-week" data-date="${date}" title="Åpne uke">${dateObj.getDate()}</button>${dayMenu}<div class="mealplan-month-meals">${visible}${more}</div><button type="button" class="mealplan-month-add mealplan-add" data-date="${date}" title="Velg måltid">＋</button></article>`;
}
function mealPlanMonthHtml(allPlans){
  const monthKey=mealPlanMonthKey();
  mealPlanMonth=monthKey;
  const [year,month]=monthKey.split('-').map(Number);
  const first=new Date(year,month-1,1,12);
  const last=new Date(year,month,0,12);
  const firstMondayOffset=(first.getDay()+6)%7;
  const cellCount=Math.ceil((firstMondayOffset+last.getDate())/7)*7;
  const plans=allPlans.filter(plan=>String(plan.date||'').startsWith(`${monthKey}-`)).map(plan=>MealPlanningEngine.normalizePlan(plan,AppState.recipes||[]));
  const plannedDays=new Set(plans.map(plan=>plan.date)).size;
  const monthCost=plans.reduce((sum,plan)=>sum+num(plan.estimatedCost),0);
  const typeCounts=plans.reduce((acc,plan)=>{const key=String(plan.mealType||'Måltid');acc[key]=(acc[key]||0)+1;return acc;},{});
  const commonTypes=['Frokost','Lunsj','Middag'].map(type=>typeCounts[type]?`${typeCounts[type]} ${type.toLocaleLowerCase('nb-NO')}`:'').filter(Boolean).join(' · ');
  const status=`${countText(plans.length,'måltid')} · ca. ${UI.money(monthCost)} · ${countText(plannedDays,'dag')} planlagt${commonTypes?` · ${commonTypes}`:''}`;
  const cells=[];
  for(let i=0;i<cellCount;i++){
    const day=i-firstMondayOffset+1;
    if(day<1||day>last.getDate())cells.push(mealPlanMonthDayHtml('',[],false));
    else{
      const date=`${monthKey}-${String(day).padStart(2,'0')}`;
      cells.push(mealPlanMonthDayHtml(date,plans.filter(plan=>plan.date===date),true));
    }
  }
  const monthLabel=first.toLocaleDateString('nb-NO',{month:'long',year:'numeric'});
  return `<section class="mealplan-control mealplan-month-control" aria-label="Månedsnavigasjon og status"><div class="mealplan-week-nav"><button type="button" class="btn secondary small" id="mealplanPrevMonth">‹ Forrige måned</button><button type="button" class="btn secondary small" id="mealplanCurrentMonth">Denne måneden</button><button type="button" class="btn secondary small" id="mealplanNextMonth">Neste måned ›</button></div><div class="mealplan-status">${status}</div></section>`+
    `<div class="mealplan-month-title">${escapeHtml(monthLabel)}</div>`+
    `<section class="mealplan-month" aria-label="Matplan ${escapeHtml(monthLabel)}"><div class="mealplan-month-weekdays"><span>Man</span><span>Tir</span><span>Ons</span><span>Tor</span><span>Fre</span><span>Lør</span><span>Søn</span></div><div class="mealplan-month-grid">${cells.join('')}</div></section>`;
}
function mealPlanEditActions(viewToggle,scope){
  if(!mealPlanEditMode){
    const copyLabel=scope==='month'?'Kopier forrige måned':'Kopier forrige uke';
    const copyId=scope==='month'?'copyPreviousMonthBtn':'copyPreviousWeekBtn';
    return `${viewToggle}<button class="btn secondary" id="${copyId}">${copyLabel}</button><button class="btn primary" id="updateShoppingFromMealPlanBtn">Generer handleliste</button><button class="btn secondary" id="mealplanEditModeBtn">Rediger plan</button>`;
  }
  const count=mealPlanSelectedIds.size;
  const clearLabel=scope==='month'?'Tøm måned':'Tøm uke';
  return `${viewToggle}<span class="mealplan-selection-count">${count} valgt</span><button class="btn danger" id="mealplanDeleteSelectedBtn" ${count?'':'disabled'}>Slett valgte</button><button class="btn secondary" id="mealplanClearScopeBtn">${clearLabel}</button><button class="btn primary" id="mealplanEditDoneBtn">Ferdig</button>`;
}
function mealPlanScopePlans(allPlans){
  return mealPlanView==='month'
    ? allPlans.filter(plan=>String(plan.date||'').startsWith(`${mealPlanMonthKey()}-`))
    : MealPlanningEngine.plansForWeek(allPlans,mealPlanWeekStart);
}
function mealPlanExitEditMode(){
  mealPlanEditMode=false;
  mealPlanSelectedIds.clear();
}
function mealplan() {
  const allPlans=AppState.allMealPlans||AppState.mealPlans||[];
  const viewToggle=`<div class="mealplan-view-toggle tabs-inline" role="tablist" aria-label="Matplanvisning"><button type="button" class="mealplan-view-btn ${mealPlanView==='week'?'active':''}" data-view="week" role="tab" aria-selected="${mealPlanView==='week'}">Uke</button><button type="button" class="mealplan-view-btn ${mealPlanView==='month'?'active':''}" data-view="month" role="tab" aria-selected="${mealPlanView==='month'}">Måned</button></div>`;
  if(mealPlanView==='month'){
    const monthKey=mealPlanMonthKey();
    const monthDate=new Date(`${monthKey}-01T12:00:00`);
    const subtitle=monthDate.toLocaleDateString('nb-NO',{month:'long',year:'numeric'});
    const actions=mealPlanEditActions(viewToggle,'month');
    return UI.pageHeader('Matplan',subtitle,actions)+mealPlanMonthHtml(allPlans);
  }
  const anchor=mealPlanAnchorDate();
  const start=MealPlanningEngine.startOfWeek(anchor);
  mealPlanWeekStart=MealPlanningEngine.isoDate(start);
  mealPlanMonth=String(mealPlanWeekStart).slice(0,7);
  const weekPlans=MealPlanningEngine.plansForWeek(allPlans,mealPlanWeekStart).map(x=>MealPlanningEngine.normalizePlan(x,AppState.recipes||[]));
  const daysWithMeals=new Set(weekPlans.map(x=>x.date)).size;
  const weekCost=weekPlans.reduce((sum,plan)=>sum+num(plan.estimatedCost),0);
  const missingItems=ShoppingEngine.applyPantry(ShoppingEngine.mergeMealPlanIngredients(weekPlans,AppState.recipes||[]),AppState.pantryItems||[]);
  const weekEnd=MealPlanningEngine.addDays(start,6);
  const weekNo=mealPlanIsoWeek(mealPlanWeekStart);
  const rangeLabel=`${start.toLocaleDateString('nb-NO',{day:'numeric',month:'short'})}–${weekEnd.toLocaleDateString('nb-NO',{day:'numeric',month:'short'})}`;
  const status=`${countText(weekPlans.length,'måltid')} · ca. ${UI.money(weekCost)} · ${countText(missingItems.length,'vare')} mangler · ${countText(7-daysWithMeals,'dag')} uten måltid`;
  const days=Array.from({length:7},(_,index)=>{
    const date=MealPlanningEngine.isoDate(MealPlanningEngine.addDays(start,index));
    return mealPlanDayHtml(date,weekPlans.filter(plan=>plan.date===date));
  }).join('');
  const actions=mealPlanEditActions(viewToggle,'week');
  return UI.pageHeader('Matplan',`Uke ${weekNo} · ${rangeLabel}`,actions)+
    `<section class="mealplan-control" aria-label="Ukenavigasjon og status"><div class="mealplan-week-nav"><button type="button" class="btn secondary small" id="mealplanPrevWeek">‹ Forrige uke</button><button type="button" class="btn secondary small" id="mealplanCurrentWeek">Denne uken</button><button type="button" class="btn secondary small" id="mealplanNextWeek">Neste uke ›</button></div><div class="mealplan-status">${status}</div></section>`+
    `<section class="mealplan-week" aria-label="Matplan uke ${weekNo}">${days}</section>`;
}

function shopping() {
  const items=AppState.shoppingItems||[];
  const purchasedAll=items.filter(x=>x.checked&&!x.atHome);
  const activeItems=items.filter(x=>!x.checked&&!x.atHome);
  const localDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('nb-NO'):'—';
  const isoDate=value=>String(value||'').slice(0,10);
  const isoWeek=value=>{
    const date=new Date(`${isoDate(value)}T12:00:00`);
    if(Number.isNaN(date.getTime()))return '';
    const target=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=target.getUTCDay()||7;
    target.setUTCDate(target.getUTCDate()+4-day);
    const yearStart=new Date(Date.UTC(target.getUTCFullYear(),0,1));
    const week=Math.ceil((((target-yearStart)/86400000)+1)/7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
  };
  const isoWeekRangeLabel=weekKey=>{
    const match=String(weekKey||'').match(/^(\d{4})-W(\d{2})$/);
    if(!match)return 'Ukjent periode';
    const year=Number(match[1]),week=Number(match[2]);
    const jan4=new Date(Date.UTC(year,0,4,12));
    const jan4Day=jan4.getUTCDay()||7;
    const monday=new Date(jan4);monday.setUTCDate(jan4.getUTCDate()-(jan4Day-1)+(week-1)*7);
    const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
    const fmt=date=>date.toLocaleDateString('nb-NO',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','');
    return `${fmt(monday)}–${fmt(sunday)}`;
  };
  const today=new Date().toISOString().slice(0,10);
  if(!shoppingHistoryValue){
    if(shoppingHistoryMode==='day')shoppingHistoryValue=today;
    if(shoppingHistoryMode==='week')shoppingHistoryValue=isoWeek(today);
    if(shoppingHistoryMode==='month')shoppingHistoryValue=today.slice(0,7);
  }
  const historyMatches=x=>{
    const date=isoDate(x.purchaseDate);
    if(shoppingHistoryMode==='all')return true;
    if(shoppingHistoryMode==='day')return date===shoppingHistoryValue;
    if(shoppingHistoryMode==='week')return isoWeek(date)===shoppingHistoryValue;
    if(shoppingHistoryMode==='month')return date.slice(0,7)===shoppingHistoryValue;
    return true;
  };
  const purchased=[...purchasedAll].filter(historyMatches).sort((a,b)=>{
    if(shoppingHistorySort==='date_asc')return String(a.purchaseDate||'').localeCompare(String(b.purchaseDate||''))||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'});
    if(shoppingHistorySort==='name')return String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'});
    if(shoppingHistorySort==='store')return String(a.store||'').localeCompare(String(b.store||''),'nb-NO',{sensitivity:'base'})||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'});
    if(shoppingHistorySort==='price_desc')return num(b.price)-num(a.price)||String(b.purchaseDate||'').localeCompare(String(a.purchaseDate||''));
    if(shoppingHistorySort==='price_asc')return num(a.price)-num(b.price)||String(b.purchaseDate||'').localeCompare(String(a.purchaseDate||''));
    if(shoppingHistorySort==='week_desc')return isoWeek(b.purchaseDate).localeCompare(isoWeek(a.purchaseDate))||String(b.purchaseDate||'').localeCompare(String(a.purchaseDate||''));
    return String(b.purchaseDate||'').localeCompare(String(a.purchaseDate||''))||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'});
  });
  const active=[...activeItems].sort((a,b)=>String(a.category||'').localeCompare(String(b.category||''),'nb-NO',{sensitivity:'base'})||String(a.name||'').localeCompare(String(b.name||''),'nb-NO',{sensitivity:'base'}));
  const purchaseToggle=item=>`<label class="shopping-check shopping-purchase-check" title="Marker som kjøpt"><input class="shopping-state-toggle" type="checkbox" data-id="${item.id}" data-field="checked"><span>Kjøpt</span></label>`;
  const reopenToggle=item=>item.purchasedVia==='pb2-mobile'?'<span class="badge success">Mobilimport</span>':`<button class="btn secondary small shopping-reopen" type="button" data-id="${item.id}">Tilbake til aktiv</button>`;
  const activeRows=active.map(x=>({crudId:x.id,className:'shopping-row',cells:[
    `<strong class="shopping-item-name">${escapeHtml(x.name)}</strong>`,
    ShoppingEngine.quantityDisplay(x),escapeHtml(x.category||''),
    `<div class="shopping-store-cell"><span>${escapeHtml(x.store||'Ikke valgt')}</span></div>`,
    UI.money(x.price||0),purchaseToggle(x)
  ]}));
  const purchasedRowsFor=rows=>rows.map(x=>({crudId:x.id,className:'shopping-row is-purchased-history',cells:[
    localDate(x.purchaseDate),`<strong class="shopping-item-name">${escapeHtml(x.name)}</strong>`,ShoppingEngine.quantityDisplay(x),escapeHtml(x.category||''),escapeHtml(x.store||'—'),`${UI.money(x.price||0)}${x.purchasedVia==='pb2-mobile'&&x.actualPriceKnown!==true?'<small class="shopping-history-price-note">Estimert</small>':''}`,reopenToggle(x)
  ]}));
  const activeColumns=[
    {label:'Vare',key:'name',width:'28%'},{label:'Mengde',key:'quantity',width:'19%'},{label:'Kategori',key:'category',width:'14%'},{label:'Butikk',key:'store',width:'18%'},{label:'Pris',key:'price',align:'right',width:'11%'},{label:'Kjøpt',key:'checked',align:'center',width:'10%'}
  ];
  const purchasedColumns=[
    {label:'Dato',key:'date',width:'12%'},{label:'Vare',key:'name',width:'25%'},{label:'Mengde',key:'quantity',width:'17%'},{label:'Kategori',key:'category',width:'13%'},{label:'Butikk',key:'store',width:'13%'},{label:'Pris',key:'price',align:'right',width:'9%'},{label:'Status',key:'status',align:'center',width:'11%'}
  ];
  const activeEstimated=total(active,x=>x.price);
  const activeCategories=new Set(active.map(x=>x.category).filter(Boolean)).size;
  const purchasedTotal=total(purchased,x=>x.price);
  const purchasedAllTotal=total(purchasedAll,x=>x.price);
  const mainTabs=`<div class="page-view-tabs shopping-view-tabs tabs-inline" role="tablist" aria-label="Handlelistevisning"><button class="shopping-view-tab ${shoppingView==='active'?'active':''}" data-view="active" role="tab" aria-selected="${shoppingView==='active'}">Aktiv <span>${active.length}</span></button><button class="shopping-view-tab ${shoppingView==='purchased'?'active':''}" data-view="purchased" role="tab" aria-selected="${shoppingView==='purchased'}">Kjøpt <span>${purchasedAll.length}</span></button></div>`;
  const historyPeriodControl=`<select id="shoppingHistoryModeSelect" aria-label="Periode"><option value="all" ${shoppingHistoryMode==='all'?'selected':''}>Alle perioder</option><option value="day" ${shoppingHistoryMode==='day'?'selected':''}>Dag</option><option value="week" ${shoppingHistoryMode==='week'?'selected':''}>Uke</option><option value="month" ${shoppingHistoryMode==='month'?'selected':''}>Måned</option></select>`;
  const historyValueControl=shoppingHistoryMode==='day'?`<input class="shopping-history-value" id="shoppingHistoryValue" type="date" value="${escapeHtml(shoppingHistoryValue)}" aria-label="Velg dag">`:shoppingHistoryMode==='week'?`<input class="shopping-history-value" id="shoppingHistoryValue" type="week" value="${escapeHtml(shoppingHistoryValue)}" aria-label="Velg uke">`:shoppingHistoryMode==='month'?`<input class="shopping-history-value" id="shoppingHistoryValue" type="month" value="${escapeHtml(shoppingHistoryValue)}" aria-label="Velg måned">`:'';
  const historySortControl=`<select id="shoppingHistorySort" aria-label="Sorter kjøpte varer"><option value="date_desc" ${shoppingHistorySort==='date_desc'?'selected':''}>Nyeste kjøp</option><option value="date_asc" ${shoppingHistorySort==='date_asc'?'selected':''}>Eldste kjøp</option><option value="week_desc" ${shoppingHistorySort==='week_desc'?'selected':''}>Nyeste uke</option><option value="name" ${shoppingHistorySort==='name'?'selected':''}>Vare A–Å</option><option value="store" ${shoppingHistorySort==='store'?'selected':''}>Butikk A–Å</option><option value="price_desc" ${shoppingHistorySort==='price_desc'?'selected':''}>Høyeste pris</option><option value="price_asc" ${shoppingHistorySort==='price_asc'?'selected':''}>Laveste pris</option></select>`;
  const historyToolbar=UI.tableToolbar(historyPeriodControl+historyValueControl+historySortControl,'',{className:'shopping-history-toolbar'});
  const actions='<button class="btn secondary" id="updateShoppingFromMealPlanBtn">Oppdater fra matplan</button><button class="btn primary" id="sendShoppingToMobileBtn">▣ Mobiloverføring</button>'+UI.button('＋ Manuell vare');
  if(shoppingView==='purchased'){
    const periodText=shoppingHistoryMode==='all'?'Hele historikken':shoppingHistoryMode==='day'?localDate(shoppingHistoryValue):shoppingHistoryMode==='week'?shoppingHistoryValue.replace('-W',' · uke '):periodLabel(shoppingHistoryValue);
    const weekMap=new Map();
    purchased.forEach(item=>{const key=isoWeek(item.purchaseDate)||'unknown';if(!weekMap.has(key))weekMap.set(key,[]);weekMap.get(key).push(item);});
    const weekGroups=[...weekMap.entries()].sort(([a],[b])=>shoppingHistorySort==='date_asc'?String(a).localeCompare(String(b)):String(b).localeCompare(String(a)));
    const historyGroups=weekGroups.length?weekGroups.map(([weekKey,weekItems],index)=>{
      const weekNo=weekKey==='unknown'?'—':String(weekKey).split('-W')[1];
      const weekTotal=total(weekItems,item=>item.price);
      const table=UI.table(purchasedColumns,purchasedRowsFor(weekItems),{stickyHeader:true,wrapClass:'shopping-table-wrap',className:'shopping-table shopping-history-table',emptyText:'Ingen kjøpte varer i denne uken.'});
      return `<details class="shopping-history-week" ${index===0?'open':''}><summary><span class="shopping-history-week-chevron" aria-hidden="true">›</span><strong>Uke ${weekNo}</strong><span class="shopping-history-week-range">${escapeHtml(isoWeekRangeLabel(weekKey))}</span><span class="shopping-history-week-meta">${countText(weekItems.length,'vare')} · ${UI.money(weekTotal)}</span></summary><div class="shopping-history-week-body">${table}</div></details>`;
    }).join(''):'<div class="table-state table-empty shopping-history-empty">Ingen kjøpte varer i valgt periode.</div>';
    return UI.pageHeader('Handleliste','Aktive innkjøp og permanent historikk over varer som er kjøpt',actions)+
      `<div class="kpi-grid">${UI.kpi('Kjøpt i utvalg',countText(purchased.length,'vare'),periodText)}${UI.kpi('Sum i utvalg',UI.money(purchasedTotal),'Bokført kjøpsverdi')}${UI.kpi('Kjøpt totalt',countText(purchasedAll.length,'vare'),'Hele historikken')}${UI.kpi('Historisk sum',UI.money(purchasedAllTotal),'Alle registrerte kjøp')}</div>`+
      mainTabs+UI.card('Kjøpshistorikk',historyToolbar+`<div class="shopping-history-groups">${historyGroups}</div>`);
  }
  const table=UI.table(activeColumns,activeRows,{stickyHeader:true,wrapClass:'shopping-table-wrap',className:'shopping-table shopping-active-table',emptyText:'Ingen varer gjenstår å handle. Legg til en vare eller oppdater fra matplanen.'});
  return UI.pageHeader('Handleliste','Aktivlisten viser bare varer som fortsatt skal kjøpes',actions)+
    `<div class="kpi-grid">${UI.kpi('Estimert totalsum',UI.money(activeEstimated),'Varer som gjenstår å kjøpe')}${UI.kpi('Gjenstår',countText(active.length,'vare'),`Fordelt på ${activeCategories} kategorier`)}${UI.kpi('Kjøpt',countText(purchasedAll.length,'vare'),'Flyttes automatisk til historikk')}${UI.kpi('Kjøpshistorikk',UI.money(purchasedAllTotal),'Samlet registrert kjøpsverdi')}</div>`+
    mainTabs+UI.card('Aktiv handleliste',table);
}

function pantry() {
  const localDate=v=>v?new Date(v+'T00:00:00').toLocaleDateString('nb-NO'):'';
  const items=AppState.pantryItems||[];
  const rows=items.map(x=>[x.name,x.quantity,x.unit||'',localDate(x.purchaseDate),localDate(x.expiryDate),`${x.minimum||0} ${x.unit||''}`.trim(),x.location||'']);
  const now=new Date(); now.setHours(0,0,0,0);
  const soon=new Date(now); soon.setDate(soon.getDate()+5);
  const expiring=items.filter(x=>x.expiryDate && new Date(x.expiryDate+'T00:00:00')>=now && new Date(x.expiryDate+'T00:00:00')<=soon).length;
  const below=items.filter(x=>num(x.quantity)<num(x.minimum)).length;
  const locations=new Set(items.map(x=>x.location).filter(Boolean)).size;
  const analysisWeeks=num(AppState.settings?.pantryAnalysisWeeks)||8;
  const analysis=PantryAnalysisEngine.analyze({pantry:items,mealPlans:AppState.mealPlans||[],recipes:AppState.recipes||[],weeks:analysisWeeks});
  const analysisRows=analysis.rows.map(x=>[
    x.name,
    x.weeklyUsage>0?x.weeklyDisplay:'–',
    x.currentDisplay,
    x.weeksLeft==null?'–':`${x.weeksLeft} uker`,
    x.recommended>0?x.recommendedDisplay:'–',
    `<span class="${x.tone}">${x.status}</span>`,
    x.suggestion
  ]);
  const tabs=`<div class="page-view-tabs pantry-view-tabs tabs-inline" role="tablist" aria-label="Matlagervisning"><button class="pantry-view-tab ${pantryView==='stock'?'active':''}" data-view="stock" role="tab" aria-selected="${pantryView==='stock'}">Beholdning <span>${items.length}</span></button><button class="pantry-view-tab ${pantryView==='analysis'?'active':''}" data-view="analysis" role="tab" aria-selected="${pantryView==='analysis'}">Lageranalyse <span>${analysis.attentionCount}</span></button></div>`;
  const analysisControls=`<div class="card-toolbar pantry-analysis-toolbar"><label class="field compact-field"><span>Analyseperiode</span><select id="pantryAnalysisWeeks"><option value="4" ${analysisWeeks===4?'selected':''}>4 uker</option><option value="8" ${analysisWeeks===8?'selected':''}>8 uker</option><option value="12" ${analysisWeeks===12?'selected':''}>12 uker</option></select></label><p class="muted">Basert på ${analysis.planCount} planlagte måltider i perioden. Forslag legges ikke automatisk i handlelisten.</p></div>`;
  const header=UI.pageHeader('Matlager','Hold oversikt over kjøleskap, fryser og skap','<button class="btn secondary" id="scanPantryBtn">▣ Skann vare</button>'+UI.button('＋ Legg til vare'));
  const kpis=`<div class="kpi-grid">${UI.kpi('Varer registrert',`${items.length}`,`På ${locations} plasseringer`)}${UI.kpi('Snart utløpt',countText(expiring,'vare'),'Innen 5 dager','warning-text')}${UI.kpi('Under minimum',countText(below,'vare'),'Bør legges til handlelisten',below?'negative':'positive')}${UI.kpi('Lagerforslag',countText(analysis.attentionCount,'vare'),`${analysis.usedItemCount} varer med registrert bruk`,analysis.attentionCount?'warning-text':'positive')}</div>`;
  if(pantryView==='analysis'){
    const analysisTable=analysisRows.length
      ?UI.table(['Vare','Bruk per uke','På lager','Rekker','Anbefalt minimum','Status','Forslag'],analysisRows,{stickyHeader:true,emptyText:'Ingen analysedata tilgjengelig.'})
      :UI.emptyState('Ingen analysedata','Legg inn varer i Matlager og bruk oppskrifter i Matplan for å bygge datagrunnlag.');
    return header+kpis+tabs+UI.card('Lageranalyse',analysisControls+analysisTable);
  }
  const stockTable=UI.table(['Vare','Mengde','Enhet','Kjøpt','Utløper','Minimum','Plassering'],rows,{stickyHeader:true,emptyText:'Matlageret er tomt. Skann eller legg til en vare for å komme i gang.'});
  return header+kpis+tabs+UI.card('Beholdning',UI.tableToolbar('<input class="search" type="search" placeholder="Søk i beholdning" aria-label="Søk i beholdning">')+stockTable);
}

function health() {
  const h=AppState.health||FinanceEngine.health(AppState.sourceData||{},AppState.selectedPeriod||activePeriod,{});
  const tips=buildSavingsTips();
  const activeTips=tips.filter(t=>t.status==='active');
  const scoreClass=h.score>=70?'success':h.score>=50?'warning':'danger';
  const dimensions=(h.dimensions||[]).map(item=>`<article class="card health-dimension ${item.available?'':'health-unavailable'}"><div class="health-dimension-head"><strong>${item.label}</strong><span>${item.available?Math.round(item.score)+'/100':'Ikke beregnet'}</span></div>${item.available?UI.progress(Math.round(item.score),item.score>=70?'success':item.score>=50?'warning':''):'<div class="health-empty-bar"></div>'}<div class="health-dimension-meta"><span>${item.display}</span><span>${item.available?`${item.weight} % vekt`:''}</span></div><p class="muted">${item.summary}</p></article>`).join('');
  const strengths=(h.strengths||[]).map(x=>`<div class="health-list-item positive"><span>＋</span><div><strong>${x.title}</strong><small>${x.text}</small></div><b>${x.score}</b></div>`).join('')||UI.emptyState('Ingen tydelige styrker','Det er ikke nok grunnlag til å peke ut tydelige styrker ennå.');
  const risks=(h.risks||[]).map(x=>`<div class="health-list-item negative"><span>−</span><div><strong>${x.title}</strong><small>${x.text}</small></div><b>${x.score}</b></div>`).join('')||UI.emptyState('Ingen tydelige risikoområder','Ingen tydelige risikoområder er identifisert.');
  const missing=h.missing?.length?`<p class="health-missing">Mangler datagrunnlag for: ${h.missing.join(', ')}.</p>`:'';
  const summary=`<div class="health-summary-grid"><div><span>Kontantstrømmargin</span><strong>${(h.metrics.cashFlowMargin*100).toLocaleString('nb-NO',{maximumFractionDigits:1})} %</strong></div><div><span>Sparerate</span><strong>${(h.metrics.savingsRate*100).toLocaleString('nb-NO',{maximumFractionDigits:1})} %</strong></div><div><span>Gjeld / årsinntekt</span><strong>${h.metrics.debtRatio.toLocaleString('nb-NO',{maximumFractionDigits:1})} ×</strong></div><div><span>Negative måneder</span><strong>${h.metrics.negativeMonths}</strong></div><div><span>Aktive sparetips</span><strong>${activeTips.length}</strong></div></div>`;
  const interpretation=`<div class="health-interpret-section"><h4>Det som trekker opp</h4>${strengths}</div><div class="health-interpret-divider"></div><div class="health-interpret-section"><h4>Det som trekker ned</h4>${risks}</div>`;
  return UI.pageHeader('Økonomihelse','Et forklarbart helhetsbilde basert på registrerte økonomidata')+
    `<div class="health-page-stack">`+
      `<section class="card health-hero"><div class="health-score-wrap"><div class="health-score ${scoreClass}" style="--health-score:${h.score}"><div><strong>${h.score}</strong><span>av 100</span></div></div><div class="health-hero-copy"><span class="badge ${scoreClass}">${h.status}</span><h2>Økonomien din er ${h.status.toLowerCase()}</h2><p class="muted">Datadekning: ${h.confidence} %. ${h.note}</p>${missing}</div></div>${summary}</section>`+
      `<div class="health-two-column">`+
        `<div class="health-dimensions-stack">${dimensions}</div>`+
        `<div class="health-insight-stack">`+
          UI.card('Tolkning',interpretation)+
          `<section class="card health-method"><div class="card-header"><h3>Hvordan scoren beregnes</h3></div><div class="card-body"><p class="muted">Scoren normaliseres etter tilgjengelig datagrunnlag. Kontantstrøm, gjeld/renter, budsjett, sparing og 12-måneders robusthet vurderes separat. Manglende data gir ikke automatisk null poeng, men reduserer datadekningen.</p></div></section>`+
        `</div>`+
      `</div>`+
    `</div>`;
}

function reports() {
  const metrics=AppState.finance?.metrics||{};
  const expenseTotal=num(metrics.actualExpenses);
  const byCategory=AppState.finance?.byCategory?.actual||{};
  const categoryRows=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>`<div class="list-item"><span>${name}</span><strong>${pct(value,expenseTotal)} %</strong></div>${UI.progress(pct(value,expenseTotal))}`).join('') || UI.emptyState('Ingen faktiske utgifter','Betalte utgifter i valgt periode vil vises her.');
  const debt=num(metrics.debt);
  const actualCashFlow=num(metrics.actualCashFlow);
  const plannedIncome=num(metrics.plannedIncome);
  const plannedExpenses=num(metrics.plannedExpenses);
  const actualIncome=num(metrics.actualIncome);
  const actualExpenses=num(metrics.actualExpenses);
  const incomeVariance=actualIncome-plannedIncome;
  const expenseVariance=plannedExpenses-actualExpenses;
  const planVsActual=`<div class="report-compare-row"><span>Inntekter</span><strong>${UI.money(actualIncome)}</strong><small>Plan ${UI.money(plannedIncome)}</small><b class="${incomeVariance>=0?'positive':'negative'}">${incomeVariance>=0?'+':''}${UI.money(incomeVariance)}</b></div><div class="report-compare-row"><span>Utgifter</span><strong>${UI.money(actualExpenses)}</strong><small>Plan ${UI.money(plannedExpenses)}</small><b class="${expenseVariance>=0?'positive':'negative'}">${expenseVariance>=0?'+':''}${UI.money(expenseVariance)}</b></div>`;
  return UI.pageHeader('Rapporter','Faktiske tall og nøkkeltall for valgt periode','<button class="btn secondary" id="exportReportBtn">Eksporter rapport</button>')+
    `<div class="kpi-grid">${UI.kpi('Faktiske inntekter',UI.money(actualIncome),periodLabel(AppState.selectedPeriod))}${UI.kpi('Faktiske utgifter',UI.money(actualExpenses),periodLabel(AppState.selectedPeriod))}${UI.kpi('Kontantstrøm',UI.money(actualCashFlow),'Faktisk mottatt minus faktisk betalt',actualCashFlow>=0?'positive':'negative')}${UI.kpi('Total gjeld',UI.money(debt),'Registrert restgjeld')}</div>`+
    `<div class="reports-page-stack">`+
      `<div class="card-grid">${UI.card('Utgifter per kategori',categoryRows)}${UI.card('Kontantstrøm',`<div class="report-primary-value ${actualCashFlow>=0?'positive':'negative'}">${UI.money(actualCashFlow)}</div><p class="muted">Faktisk mottatt minus faktisk betalt i valgt periode.</p><div class="list-item"><span>Ubetalte utgifter</span><strong>${UI.money(metrics.unpaidExpenses)}</strong></div>`)}${UI.card('Gjeld og renter',`<div class="report-primary-value">${UI.money(debt)}</div><div class="list-item"><span>Terminbeløp i perioden</span><strong>${UI.money(metrics.loanPayments)}</strong></div><div class="list-item"><span>Rentekostnader</span><strong>${UI.money(metrics.interest)}</strong></div>`)}</div>`+
      UI.card('Plan mot faktisk',planVsActual)+
    `</div>`;
}

function forecast() {
  const projection=AppState.forecast12||AppState.baselineForecast||{months:[],totals:{},debtStart:0,debtEnd:0,savingsEnd:0};
  const baseline=AppState.baselineForecast||projection;
  const assumptions=AppState.settings?.forecastAssumptions||{incomeGrowth:0,expenseGrowth:0,extraDebtPayment:0,savingsGrowth:0};
  const rows=(projection.months||[]).map(row=>[periodLabel(row.period),UI.money(row.income),UI.money(row.expenses),`<strong class="${row.cashFlow>=0?'positive':'negative'}">${UI.money(row.cashFlow)}</strong>`,UI.money(row.debt)]);
  const debtReduction=Math.max(0,num(projection.debtStart)-num(projection.debtEnd));
  const assumptionEffect=num(projection.totals?.cashFlow)-num(baseline.totals?.cashFlow);
  return UI.pageHeader('Prognoser','Måned-for-måned fremskrivning av de neste 12 månedene','<button class="btn secondary" id="forecastAssumptionsBtn">Juster forutsetninger</button>')+
    `<div class="kpi-grid">${UI.kpi('Forventet 12-månedersresultat',UI.money(projection.totals?.cashFlow),'Faktiske frekvenser og kommende forfall',num(projection.totals?.cashFlow)>=0?'positive':'negative')}${UI.kpi('Gjeld om 12 måneder',UI.money(projection.debtEnd),`Estimert reduksjon ${UI.money(debtReduction)}`)}${UI.kpi('Sparemål om 12 måneder',UI.money(projection.savingsEnd),'Basert på aktive månedlige sparebeløp')}${UI.kpi('Effekt av forutsetninger',UI.money(assumptionEffect),'Forskjell mot grunnprognosen',assumptionEffect>=0?'positive':'negative')}</div>`+
    `<div class="forecast-page-stack">`+
      UI.card('Månedsprognose',UI.table(['Måned','Inntekter','Utgifter','Resultat','Restgjeld'],rows))+
      UI.card('Aktive forutsetninger',`<div class="list-item"><span>Årlig inntektsvekst</span><strong>${num(assumptions.incomeGrowth).toFixed(1)} %</strong></div><div class="list-item"><span>Årlig utgiftsvekst</span><strong>${num(assumptions.expenseGrowth).toFixed(1)} %</strong></div><div class="list-item"><span>Ekstra nedbetaling</span><strong>${UI.money(assumptions.extraDebtPayment)}/mnd</strong></div><div class="list-item"><span>Økt månedlig sparing</span><strong>${num(assumptions.savingsGrowth).toFixed(1)} %</strong></div>`,'<span class="badge">Beregnet</span>')+
    `</div>`;
}

function savingsPeriodWindow(period, calendarWeek='') {
  const match=String(period||'').match(/^(\d{4})-(\d{2})$/);
  if(!match) return null;
  const year=Number(match[1]), month=Number(match[2]);
  const monthStart=new Date(year,month-1,1);
  const monthEnd=new Date(year,month,0);
  let start=new Date(monthStart), end=new Date(monthEnd);
  if(calendarWeek){
    const weekMatch=String(calendarWeek).match(/^(\d{4})-W(\d{2})$/);
    if(weekMatch){
      const weekYear=Number(weekMatch[1]), week=Number(weekMatch[2]);
      const jan4=new Date(weekYear,0,4);
      const jan4Day=jan4.getDay()||7;
      const monday=new Date(weekYear,0,4-(jan4Day-1)+(week-1)*7);
      const sunday=new Date(monday); sunday.setDate(sunday.getDate()+6);
      start=new Date(Math.max(monthStart.getTime(),monday.getTime()));
      end=new Date(Math.min(monthEnd.getTime(),sunday.getTime()));
    }
  }
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  const today=new Date(); today.setHours(23,59,59,999);
  const totalDays=Math.max(1,Math.round((end-start)/86400000)+1);
  const elapsedDays=today<start?0:today>end?totalDays:Math.max(1,Math.round((today-start)/86400000)+1);
  const remainingDays=Math.max(0,totalDays-elapsedDays);
  return {start,end,today,totalDays,elapsedDays,remainingDays,progress:Math.min(1,Math.max(0,elapsedDays/totalDays)),isPast:today>end,isFuture:today<start,isCurrent:today>=start&&today<=end};
}
function previousMonthPeriods(period,count=3){
  const parts=FinanceEngine.periodParts(period);
  if(parts.isYear) return [];
  return Array.from({length:count},(_,index)=>FinanceEngine.addMonths(period,-(index+1))).reverse();
}
function categoryActual(finance,category){
  const wanted=FinanceEngine.categoryKey(category);
  const key=Object.keys(finance?.byCategory?.actual||{}).find(name=>FinanceEngine.categoryKey(name)===wanted);
  return num(key?finance.byCategory.actual[key]:0);
}
function buildSavingsTips() {
  const tips=[];
  const states=AppState.settings?.savingsTipStates||{};
  const add=tip=>tips.push({...tip,status:states[tip.id]||'active',kind:tip.kind||'Mulighet',annual:tip.annual??num(tip.monthly)*12});
  const selected=AppState.selectedPeriod||activePeriod;
  const selectedParts=FinanceEngine.periodParts(selected);
  const finance=AppState.finance||{};
  const benchmark=Math.max(0,num(AppState.settings?.loanBenchmarkRate ?? 4.8));

  (AppState.loans||[]).forEach(loan=>{
    if(num(loan.nominal)>benchmark+0.15){
      const annual=Math.max(0,num(loan.balance)*(num(loan.nominal)-benchmark)/100);
      add({id:`loan-rate-${loan.id}`,category:'Renter',priority:annual>=6000?'Høy':'Middels',kind:'Mulighet',title:`Vurder renten på ${loan.name}`,description:`Registrert rente er ${num(loan.nominal).toFixed(2)} %. Referanserenten din er ${benchmark.toFixed(2)} %. Et faktisk tilbud må innhentes før besparelsen kan bekreftes.`,monthly:annual/12,annual,confidence:'Middels',action:'Åpne rentesimulator'});
    }
    if(num(loan.payment)>0&&num(loan.balance)>0){
      const current=amortizeLoan(loan.balance,loan.nominal,loan.payment),boosted=amortizeLoan(loan.balance,loan.nominal,loan.payment+1000);
      if(current&&boosted&&current.interest-boosted.interest>1000){
        const lifetime=current.interest-boosted.interest;
        add({id:`loan-extra-${loan.id}`,category:'Gjeld',priority:lifetime>=25000?'Høy':'Middels',kind:'Langsiktig tiltak',title:`Kortere nedbetaling av ${loan.name}`,description:`1 000 kr ekstra per måned kan redusere samlet rente med omtrent ${UI.money(lifetime)} over resterende lånetid.`,monthly:0,annual:0,lifetime,confidence:'Høy',action:'Åpne rentesimulator',metricText:`${UI.money(lifetime)} totalt`});
      }
    }
  });

  if(!selectedParts.isYear){
    (finance.budgets||[]).filter(row=>!row.isUnbudgeted&&num(row.planned)>0).forEach(row=>{
      const window=savingsPeriodWindow(selected,row.calendarWeek);
      if(!window||window.isFuture) return;
      const planned=num(row.planned), actual=num(row.actual), expected=num(row.forecast);
      const projected=window.progress>0?actual/window.progress:actual;
      const conservativeProjection=Math.max(projected,expected);
      const projectedExcess=Math.max(0,conservativeProjection-planned);
      const remaining=Math.max(0,planned-actual);
      const allowance=window.remainingDays>0?remaining/window.remainingDays:0;
      const usedPct=planned>0?actual/planned:0;
      const timePct=window.progress;
      const paceAhead=usedPct-timePct;
      const periodName=row.calendarWeek?row.periodLabel:'måneden';
      const idSuffix=`${FinanceEngine.categoryKey(row.category)}-${row.calendarWeek||selected}`;

      if(window.isCurrent&&projectedExcess>=Math.max(150,planned*.05)){
        const priority=projectedExcess>=Math.max(1000,planned*.2)?'Høy':'Middels';
        add({id:`budget-risk-${idSuffix}`,category:'Budsjett',priority,kind:'Tidlig varsling',title:`${row.category} ligger an til å gå over budsjett`,description:`${Math.round(timePct*100)} % av ${periodName} har gått, mens ${Math.round(usedPct*100)} % av budsjettet er brukt. Med dagens tempo er forventet sluttforbruk omtrent ${UI.money(conservativeProjection)}, ca. ${UI.money(projectedExcess)} over planen. Du har ${UI.money(remaining)} igjen, tilsvarende omtrent ${UI.money(allowance)} per dag.`,monthly:projectedExcess,annual:0,confidence:actual>0?'Høy':'Middels',action:'Se budsjett',metricText:`${UI.money(remaining)} igjen`});
      } else if(window.isCurrent&&paceAhead>=.12&&remaining>0){
        add({id:`budget-watch-${idSuffix}`,category:'Budsjett',priority:'Lav',kind:'Tidlig varsling',title:`Følg med på ${row.category}`,description:`Forbruket ligger ${Math.round(paceAhead*100)} prosentpoeng foran tidsforløpet. Du kan bruke omtrent ${UI.money(allowance)} per dag resten av ${periodName} for å holde planen.`,monthly:0,annual:0,confidence:'Middels',action:'Se budsjett',metricText:`${UI.money(allowance)}/dag`});
      } else if(window.isPast&&actual>planned){
        const excess=actual-planned;
        add({id:`budget-past-${idSuffix}`,category:'Budsjett',priority:excess>=1000?'Middels':'Lav',kind:'Observasjon',title:`${row.category} endte over budsjett`,description:`Perioden er avsluttet og faktisk forbruk ble ${UI.money(excess)} høyere enn planlagt. Dette vises som observasjon, ikke som et tiltak for inneværende periode.`,monthly:0,annual:0,confidence:'Høy',action:'Se budsjett',metricText:`${UI.money(excess)} over`});
      }
    });

    const previous=previousMonthPeriods(selected,3).map(period=>FinanceEngine.build(AppState.sourceData||{},period));
    const budgetedCategories=new Set((finance.budgets||[]).filter(row=>!row.isUnbudgeted).map(row=>FinanceEngine.categoryKey(row.category)));
    Object.entries(finance.byCategory?.actual||{}).forEach(([category,current])=>{
      if(budgetedCategories.has(FinanceEngine.categoryKey(category))) return;
      const history=previous.map(item=>categoryActual(item,category)).filter(value=>value>0);
      if(history.length<2) return;
      const average=history.reduce((sum,value)=>sum+value,0)/history.length;
      const window=savingsPeriodWindow(selected);
      const projected=window&&window.progress>0?num(current)/window.progress:num(current);
      const increase=projected-average;
      if(average>=300&&increase>=Math.max(300,average*.2)){
        add({id:`trend-${FinanceEngine.categoryKey(category)}-${selected}`,category:'Utgiftstrend',priority:increase>=1500?'Høy':'Middels',kind:'Observasjon',title:`${category} øker raskere enn normalt`,description:`Forventet forbruk denne måneden er omtrent ${UI.money(projected)}, mot et gjennomsnitt på ${UI.money(average)} de siste ${history.length} månedene.`,monthly:0,annual:0,confidence:history.length>=3?'Høy':'Middels',action:'Se utgifter',metricText:`+${UI.money(increase)}`});
      }
    });
  }

  const annualExpenses=AppState.annualFinance?.expenses||[];
  annualExpenses.filter(x=>/abonnement|mobil|internett|stream|telefon/i.test(`${x.description} ${x.category}`)).forEach(x=>{
    const annual=num(x.amount);
    if(annual>=3600)add({id:`subscription-${x.sourceId||x.id}`,category:'Abonnement',priority:annual>=12000?'Høy':'Middels',kind:'Mulighet',title:`Gå gjennom ${x.description}`,description:`Registrert årskostnad er omtrent ${UI.money(annual)}. Sammenlign med faktisk bruk og tilgjengelige alternativer før du endrer avtalen.`,monthly:0,annual:0,confidence:'Høy',action:'Se utgift',metricText:`${UI.money(annual)}/år`});
  });
  annualExpenses.filter(x=>/forsik/i.test(`${x.description} ${x.category}`)).forEach(x=>{
    const annual=num(x.amount);
    add({id:`insurance-${x.sourceId||x.id}`,category:'Forsikring',priority:annual>=12000?'Høy':'Middels',kind:'Mulighet',title:'Sammenlign forsikringstilbud',description:`Registrert årskostnad er omtrent ${UI.money(annual)}. Appen kjenner ikke markedsprisen, så mulig besparelse vises først når alternativer er sammenlignet.`,monthly:0,annual:0,confidence:'Høy',action:'Se utgifter',metricText:`${UI.money(annual)}/år`});
  });

  const recipes=(AppState.recipes||[]).filter(r=>num(r.servings)>0&&num(r.price)>0).map(r=>({...r,perPortion:num(r.price)/num(r.servings)})).sort((a,b)=>b.perPortion-a.perPortion);
  if(recipes.length>=2){
    const expensive=recipes[0],cheap=recipes.at(-1),servings=Math.max(2,num(expensive.servings));
    const saving=Math.max(0,(expensive.perPortion-cheap.perPortion)*servings);
    if(saving>=25)add({id:'meal-swap',category:'Mat',priority:saving>=150?'Høy':'Middels',kind:'Mulighet',title:`Rimeligere alternativ til ${expensive.name}`,description:`${expensive.name} koster omtrent ${UI.money(expensive.perPortion)} per porsjon, mens ${cheap.name} koster ${UI.money(cheap.perPortion)}. Forskjellen er ca. ${UI.money(saving)} per tilberedning med ${servings} porsjoner.`,monthly:0,annual:0,confidence:'Høy',action:'Se oppskrifter',metricText:`${UI.money(saving)}/måltid`});
  }

  const rank={Høy:3,Middels:2,Lav:1};
  return tips.sort((a,b)=>(rank[b.priority]-rank[a.priority])+(num(b.monthly)-num(a.monthly))/100000+(num(b.annual)-num(a.annual))/1000000);
}
function savingtips() {
  const all=buildSavingsTips();
  const states=AppState.settings?.savingsTipStates||{};
  const active=all.filter(t=>t.status==='active');
  const completed=all.filter(t=>t.status==='completed');
  const later=all.filter(t=>t.status==='later');
  const hiddenCount=Object.values(states).filter(status=>status==='hidden').length;
  const visible=savingsTipFilter==='completed'?completed:savingsTipFilter==='later'?later:active;
  const monthly=total(active,t=>t.monthly);
  const annual=total(active,t=>t.annual||t.monthly*12);
  const top=active[0];
  const cards=visible.map(t=>`<article class="card saving-tip-card" data-tip-id="${t.id}"><div class="saving-tip-head"><div><span class="badge ${t.priority==='Høy'?'warning':''}">${t.priority}</span><span class="saving-tip-category">${t.category}</span></div><span class="saving-tip-confidence">${t.confidence} sikkerhet</span></div><h3>${t.title}</h3><p class="muted">${t.description}</p><div class="tip-saving">${t.metricText?`<strong>${t.metricText}</strong><span>${t.kind}</span>`:`<strong>${UI.money(t.monthly||0)}/mnd</strong><span>${UI.money(t.annual||num(t.monthly)*12)}/år</span>`}</div><div class="card-actions saving-tip-actions">${t.status!=='active'?`<button class="btn secondary small tip-activate" data-tip="${t.id}">Gjør aktivt</button>`:`<button class="btn primary small tip-action" data-action="${t.action}">${t.action}</button><button class="btn secondary small tip-later" data-tip="${t.id}">Påminn senere</button><button class="btn secondary small tip-hide" data-tip="${t.id}">Skjul</button><button class="btn secondary small tip-complete" data-tip="${t.id}">Gjennomført</button>`}</div></article>`).join('');
  const canReset=hiddenCount>0 || later.length>0 || completed.length>0;
  const empty=`<div class="saving-tips-empty">${UI.emptyState('Ingen tips i denne visningen',savingsTipFilter==='active'?'Ingen aktive forslag akkurat nå.':savingsTipFilter==='later'?'Ingen tips er satt til senere.':'Ingen tips er markert som gjennomført.')}${canReset?'<div class="saving-tips-reset"><button class="btn secondary small" id="resetSavingsTipsBtn">Vis alle tips igjen</button></div>':''}</div>`;
  const tabs=`<div class="page-view-tabs saving-view-tabs tabs-inline" role="tablist" aria-label="Sparetipsvisning"><button class="saving-filter ${savingsTipFilter==='active'?'active':''}" data-filter="active" role="tab" aria-selected="${savingsTipFilter==='active'}">Aktive <span>${active.length}</span></button><button class="saving-filter ${savingsTipFilter==='later'?'active':''}" data-filter="later" role="tab" aria-selected="${savingsTipFilter==='later'}">Senere <span>${later.length}</span></button><button class="saving-filter ${savingsTipFilter==='completed'?'active':''}" data-filter="completed" role="tab" aria-selected="${savingsTipFilter==='completed'}">Gjennomført <span>${completed.length}</span></button></div>`;
  const body=(cards?`<div class="card-grid saving-tips-grid">${cards}</div>`:empty)+`<p class="saving-tips-note muted">Estimater er basert på egne registrerte data.</p>`;
  return UI.pageHeader('Sparetips','Konkrete forslag basert på registrerte økonomi- og matdata','<button class="btn secondary" id="savingTipSettingsBtn">Analyseinnstillinger</button>')+`<div class="kpi-grid">${UI.kpi('Mulig besparelse',UI.money(monthly)+'/mnd','Konservativt estimat fra aktive tips','positive')}${UI.kpi('Årlig potensial',UI.money(annual),`${active.length} aktive tips`,'positive')}${UI.kpi('Største spareområde',top?top.category:'Ingen',top?top.title:'Ingen aktive forslag')}${UI.kpi('Gjennomført',countText(completed.length,'tips'),'Markert som gjennomført')}</div>`+tabs+UI.card('Sparetips',body);
}

function calculateWhatIf(values={}) {
  const projection=FinanceEngine.project(AppState.sourceData||{},AppState.selectedPeriod||activePeriod,12,values);
  const baseline=AppState.baselineForecast||FinanceEngine.project(AppState.sourceData||{},AppState.selectedPeriod||activePeriod,12,{});
  const first=projection.months?.[0]||{};
  const baselineFirst=baseline.months?.[0]||{};
  return {
    income:first.income||0,
    expenses:first.expenses||0,
    result:first.cashFlow||0,
    debt12:projection.debtEnd||0,
    savings12:projection.savingsEnd||0,
    interest12:num(projection.totals?.interest),
    projection,
    baseline:{
      result:baselineFirst.cashFlow||0,
      debt12:baseline.debtEnd||0,
      savings12:baseline.savingsEnd||0,
      interest12:num(baseline.totals?.interest),
      projection:baseline
    }
  };
}

function whatif() {
  const saved=AppState.settings?.whatIfScenario||{rateChange:1,incomeChange:0,expenseChange:0,foodChange:-10,extraDebt:1000,extraSaving:0};
  const r=calculateWhatIf(saved);
  const scenarioForm=`<div class="form-grid whatif-scenario-form" id="whatIfForm"><label class="field"><span>Renteendring (prosentpoeng)</span><input name="rateChange" type="number" step="0.1" value="${num(saved.rateChange)}"></label><label class="field"><span>Endring i inntekt (%)</span><input name="incomeChange" type="number" step="0.5" value="${num(saved.incomeChange)}"></label><label class="field"><span>Endring i øvrige utgifter (%)</span><input name="expenseChange" type="number" step="0.5" value="${num(saved.expenseChange)}"></label><label class="field"><span>Endring i matkostnad (%)</span><input name="foodChange" type="number" step="1" value="${num(saved.foodChange)}"></label><label class="field"><span>Ekstra nedbetaling per måned</span><input name="extraDebt" type="number" step="100" min="0" value="${num(saved.extraDebt)}"></label><label class="field"><span>Ekstra sparing per måned</span><input name="extraSaving" type="number" step="100" min="0" value="${num(saved.extraSaving)}"></label><div class="whatif-form-actions"><button class="btn primary" id="saveWhatIfBtn">Lagre scenario</button></div></div><p class="muted whatif-simulation-note">Kun simulering – påvirker ikke budsjett, regnskap eller registrerte transaksjoner.</p>`;
  return UI.pageHeader('Hva hvis?','Test økonomiske endringer uten å påvirke faktiske data','<button class="btn secondary" id="resetWhatIfBtn">Nullstill scenario</button>')+
    `<div class="whatif-layout">`+
      `<section class="card"><div class="card-header"><h3>Scenario</h3><span class="badge">Kun simulering</span></div><div class="card-body">${scenarioForm}</div></section>`+
      `<section class="card"><div class="card-header"><h3>Effekt av scenario</h3><span class="badge success">Beregnet</span></div><div class="card-body" id="whatIfResults">${whatIfResultHtml(r)}</div></section>`+
    `</div>`;
}

function whatIfDelta(value,baseline,inverse=false){
  const delta=num(value)-num(baseline);
  const good=inverse?delta<=0:delta>=0;
  const sign=delta>0?'+':'';
  return `<strong class="${delta===0?'':good?'positive':'negative'}">${sign}${UI.money(delta)}</strong>`;
}

function whatIfCompareCard(label,baseline,scenario,inverse=false){
  const scenarioClass=scenario===0?'':inverse?(scenario<=baseline?'positive':'negative'):(scenario>0?'positive':scenario<0?'negative':'');
  return `<div class="whatif-result-card"><span>${label}</span><div class="whatif-result-main"><strong class="${scenarioClass}">${UI.money(scenario)}</strong>${whatIfDelta(scenario,baseline,inverse)}</div><small>Baseline ${UI.money(baseline)}</small></div>`;
}

function whatIfResultHtml(r){
  const b=r.baseline||{};
  const rows=(r.projection?.months||[]).map((row,index)=>{
    const base=b.projection?.months?.[index]||{};
    const delta=num(row.cashFlow)-num(base.cashFlow);
    const debtDelta=num(row.debt)-num(base.debt);
    return [periodLabel(row.period),UI.money(row.income),UI.money(row.expenses),`<strong class="${row.cashFlow===0?'':row.cashFlow>0?'positive':'negative'}">${UI.money(row.cashFlow)}</strong>`,`<span class="${delta===0?'':delta>0?'positive':'negative'}">${delta>0?'+':''}${UI.money(delta)}</span>`,`<span class="${debtDelta===0?'':debtDelta<0?'positive':'negative'}">${UI.money(row.debt)}</span>`];
  });
  return `<div class="whatif-result-grid">${whatIfCompareCard('Månedlig resultat',b.result,r.result)}${whatIfCompareCard('Renter neste 12 mnd',b.interest12,r.interest12,true)}${whatIfCompareCard('Gjeld om 12 måneder',b.debt12,r.debt12,true)}${whatIfCompareCard('Sparing om 12 måneder',b.savings12,r.savings12)}</div><div class="whatif-projection"><h4>Scenario – neste 12 måneder</h4>${UI.table(['Måned','Inntekter','Utgifter','Resultat','Mot baseline','Gjeld'],rows,{stickyHeader:true,emptyText:'Ingen prognosedata tilgjengelig.'})}</div>`;
}

function categorySettingsCard() {
  const active=(AppState.categories||[]).filter(x=>x.active!==false);
  const rows=active.map(x=>[x.name,x.type,x.standard?'<span class="badge">Standard</span>':'Egendefinert',`<span class="category-color" style="background:${x.color||'#4f6ef7'}"></span>${x.color||'#4f6ef7'}`,x.id]);
  return UI.card('Kategorier',`<div class="settings-card-head"><div><p class="muted">Bare kategorier som er i aktiv bruk vises her.</p></div><div class="header-actions"><button class="btn secondary" id="addStandardCategoryBtn">＋ Standardkategori</button><button class="btn primary" id="newCategoryBtn">＋ Ny kategori</button></div></div>${UI.table(['Navn','Type','Rolle','Farge'],rows.map(x=>x.slice(0,4)),{stickyHeader:true,emptyText:'Ingen aktive kategorier.'})}`);
}

function general() {
  return UI.pageHeader('Kategori','Kategorier')+
    `<div class="settings-general-grid settings-general-categories-only">`+
      `<div class="settings-general-categories">${categorySettingsCard()}</div>`+
    `</div>`;
}
function dataSettings() {
  const state=AppState.settings?.kassalUi||{};
  const connectionState=state.lastError?'Feil':state.hasToken?'Tilkoblet':'Ikke konfigurert';
  const connectionTone=state.lastError?'danger':state.hasToken?'success':'';

  const kassalBody=`<div class="settings-integration-status"><span class="badge ${connectionTone}">${connectionState}</span><label class="field checkbox-field"><input id="kassalEnabled" type="checkbox" ${state.enabled!==false?'checked':''}><span>API aktivert</span></label></div>
  <label class="field"><span>API-nøkkel</span><input id="kassalToken" type="password" placeholder="${state.maskedToken||'Lim inn Bearer token'}"><small class="muted">Lagres kryptert lokalt.</small></label>
  <div class="header-actions card-form-actions settings-kassal-actions"><button class="btn primary" id="saveKassalConfig">Lagre</button><button class="btn secondary" id="testKassalConfig">Test tilkobling</button><button class="btn danger" id="clearKassalToken">Fjern nøkkel</button></div>
  <details class="settings-advanced">
    <summary>Avanserte innstillinger</summary>
    <div class="form-grid settings-kassal-form settings-advanced-body">
      <label class="field"><span>Base URL</span><input id="kassalBaseUrl" value="${state.baseUrl||'https://kassal.app/api/v1/'}"></label>
      <label class="field"><span>Maks søkeresultater</span><input id="kassalResultSize" type="number" min="1" max="50" value="${num(state.resultSize||20)}"></label>
      <label class="field checkbox-field"><input id="kassalUseCache" type="checkbox" ${state.useCache!==false?'checked':''}><span>Bruk lokal cache</span></label>
      <div class="settings-status-list"><div class="list-item"><span>Nøkkel lagret</span><strong>${state.hasToken?'Ja':'Nei'}</strong></div><div class="list-item"><span>Sist vellykket test</span><strong>${state.lastTest||'Ikke testet'}</strong></div><div class="list-item"><span>Sist feil</span><strong class="${state.lastError?'negative':''}">${state.lastError||'Ingen'}</strong></div></div>
      <p class="muted settings-api-note">Klienten begrenser seg til 55 kall per minutt for å holde seg under API-grensen på 60.</p>
    </div>
  </details>`;

  const mobileBody=`<section class="settings-section mobile-app-settings">
    <div class="settings-section-head"><div><h4>Android-app</h4><p class="muted">Installer Handleliste-appen og overfør handlelisten med QR.</p></div><span class="badge success">v0.4.0</span></div>
    <div class="mobile-app-install-grid">
      <div id="mobileAppInstallQr" class="mobile-app-install-qr"></div>
      <div class="mobile-app-install-copy"><strong>Installer på Android</strong><p class="muted">Skann QR-koden med telefonens kamera, eller last ned APK direkte.</p><button class="btn primary" id="openMobileAppDownloadBtn" type="button">Last ned APK</button></div>
    </div>
  </section>`;

  return UI.pageHeader('Integrasjoner','Eksterne tjenester og tilkoblinger')+
    `<div class="settings-integrations-grid">`+
      `<div class="settings-data-integration">${UI.card('Kassalapp',kassalBody)}</div>`+
      `<div class="settings-data-integration">${UI.card('Handleliste-app',mobileBody)}</div>`+
    `</div>`;
}

function maintenance() {
  const enabled=AppState.settings?.autoBackup!==false;
  const actions=[
    ['budgets','Budsjett','Alle budsjettposter'],
    ['incomes','Inntekter','Alle registrerte inntekter'],
    ['expenses','Utgifter','Alle registrerte utgifter'],
    ['loans','Lån','Alle registrerte lån'],
    ['goals','Sparemål','Alle sparemål'],
    ['recipes','Oppskrifter','Alle lagrede oppskrifter'],
    ['mealPlans','Matplan','Alle planlagte måltider'],
    ['shoppingItems','Handleliste','Aktive, kjøpte og importerte mobilhandleturer'],
    ['pantryItems','Matlager','Alle varer i matlageret'],
    ['apiCache','Produktcache','Lokalt mellomlagrede produktdata']
  ];
  const options=actions.map(([store,name])=>`<option value="${store}">${name}</option>`).join('');
  const descriptions=Object.fromEntries(actions.map(([store,,description])=>[store,description]));

  const dataCard=UI.card('Data og sikkerhetskopi',
    `<section class="maintenance-card-section">`+
      `<div class="maintenance-section-copy"><h4>Sikkerhetskopi</h4><p class="muted">Lokal backup etter dataendringer.</p></div>`+
      `<div class="maintenance-backup-status"><span>Automatisk backup</span><button class="toggle ${enabled?'on':''}" id="autoBackupToggle" role="switch" aria-checked="${enabled}" aria-label="Automatisk sikkerhetskopi"></button></div>`+
      `<div class="maintenance-backup-select">`+
        `<label class="field"><span>Gjenopprett sikkerhetskopi</span><select id="backupSelect"><option value="">Laster sikkerhetskopier …</option></select></label>`+
        `<button class="btn secondary" id="restoreSelectedBackupBtn" type="button" disabled>Gjenopprett</button>`+
      `</div>`+
    `</section>`+
    `<div class="maintenance-section-divider"></div>`+
    `<section class="maintenance-card-section">`+
      `<div class="maintenance-section-copy"><h4>Eksport og import</h4><p class="muted">Eksporter eller importer alle appdata.</p></div>`+
      `<div class="maintenance-inline-actions"><button class="btn primary" id="exportDataBtn">Eksporter data</button><button class="btn secondary" id="importDataBtn">Importer data</button></div>`+
    `</section>`
  );

  const maintenanceCard=UI.card('Datavedlikehold',
    `<section class="maintenance-card-section">`+
      `<div class="maintenance-section-copy"><h4>Rydd enkeltområde</h4><p class="muted">Velg området som skal tømmes.</p></div>`+
      `<div class="maintenance-select-row">`+
        `<label class="field maintenance-module-field"><span>Område</span><select id="maintenanceModuleSelect">${options}</select></label>`+
        `<button class="btn secondary" id="clearSelectedModuleBtn" type="button">Tøm valgt område</button>`+
      `</div>`+
      `<p class="muted maintenance-module-description" id="maintenanceModuleDescription">${escapeHtml(descriptions[actions[0][0]])}</p>`+
    `</section>`+
    `<div class="maintenance-section-divider"></div>`+
    `<section class="maintenance-card-section maintenance-danger-block">`+
      `<div class="maintenance-danger-title"><h4>Nullstill hele appen</h4><span class="badge danger">Faresone</span></div>`+
      `<p class="negative"><strong>Alle brukerdata, innstillinger og cache slettes.</strong></p>`+
      `<p class="muted">Backup opprettes først. API-nøkkel fjernes.</p>`+
      `<div class="maintenance-danger-action"><button class="btn danger" id="resetApplicationBtn">Nullstill hele appen</button></div>`+
    `</section>`
  );

  const updateCard=UI.card('Om og oppdateringer',
    `<div class="about-update-list">`+
      `<div class="list-item"><span>Installert versjon</span><strong id="installedAppVersion">${desktopUpdateState.currentVersion?`v${desktopUpdateState.currentVersion}`:'Henter …'}</strong></div>`+
      `<div class="list-item"><span>Nyeste versjon</span><strong id="latestAppVersion">${desktopUpdateState.latestVersion?`v${desktopUpdateState.latestVersion}`:'—'}</strong></div>`+
      `<div class="list-item"><span>Status</span><strong id="appUpdateStatus">${escapeHtml(updateStatusLabel())}</strong></div>`+
    `</div>`+
    `<div class="settings-update-actions"><button class="btn primary" id="releaseInfoBtn" type="button" ${desktopUpdateState.latestVersion?'':'disabled'}>Release-info</button><button class="btn secondary" id="checkForUpdatesBtn" type="button">Se etter oppdatering</button></div>`
  );

  const compact=AppState.settings?.compactTables===true;
  const reduced=AppState.settings?.reducedMotion===true;
  const displayCard=UI.card('Visningsinnstillinger',
    `<div class="setting-row"><div><strong>Lys eller mørk modus</strong></div><button class="btn secondary" id="inlineThemeBtn">Bytt tema</button></div>`+
    `<div class="setting-row"><div><strong>Kompakt tabellvisning</strong></div><button class="toggle ${compact?'on':''}" id="compactTablesToggle" role="switch" aria-checked="${compact}" aria-label="Kompakt tabellvisning"></button></div>`+
    `<div class="setting-row"><div><strong>Reduserte animasjoner</strong></div><button class="toggle ${reduced?'on':''}" id="reducedMotionToggle" role="switch" aria-checked="${reduced}" aria-label="Reduserte animasjoner"></button></div>`
  );

  return UI.pageHeader('Vedlikehold','Backup, dataflyt og rydding')+
    `<div class="maintenance-settings-grid">`+
      `<div class="maintenance-data-column">${dataCard}</div>`+
      `<div class="maintenance-tools-column">${maintenanceCard}</div>`+
      `<div class="maintenance-update-column">${updateCard}</div>`+
    `</div>`+
    `<div class="maintenance-settings-grid maintenance-settings-second-row">`+
      `<div class="maintenance-display-column">${displayCard}</div>`+
    `</div>`+
    `<script type="application/json" id="maintenanceDescriptions">${escapeHtml(JSON.stringify(descriptions))}</script>`;
}
const pageRenderers = {dashboard,budget,income,expenses,loans,savings,mealplan,recipes,ingredients,shopping,pantry,foodeconomy:foodEconomy,health,reports,forecast,savingtips,whatif,general,data:dataSettings,maintenance};
function showToast(message){ const t=document.getElementById('toast'); t.textContent=message; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2400); }
function applyRecipeFilters() {
  const input=document.getElementById('recipeSearchInput');
  recipeSearchQuery=input?.value||'';
  const query=recipeSearchQuery.trim().toLocaleLowerCase('nb-NO');
  content.querySelectorAll('.recipe-card').forEach(card=>{
    const text=String(card.dataset.recipeSearch||card.textContent||'').toLocaleLowerCase('nb-NO');
    const matches=!query||text.includes(query);
    card.hidden=!matches;
    card.style.display=matches?'':'none';
  });
}
function wireSearch() {
  content.querySelectorAll('input.search').forEach(input => {
    if(input.closest('.recipe-toolbar')){input.addEventListener('input',applyRecipeFilters);return;}
    const scope = input.closest('.card') || content;
    const tableRows = [...scope.querySelectorAll('tbody tr')];
    const targets = tableRows;
    input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase('nb-NO');
      targets.forEach(target => {
        const text = target.textContent.toLocaleLowerCase('nb-NO');
        target.hidden = query && !text.includes(query);
      });
    });
  });
}


function actionModal(title, body, onSave, saveLabel='Lagre') {
  const wrapper=document.createElement('div'); wrapper.className='modal-backdrop';
  wrapper.innerHTML=`<section class="modal"><header class="modal-header"><div><div class="eyebrow">Verktøy</div><h2>${title}</h2></div><button class="icon-btn ghost action-close">×</button></header><form><div class="modal-body form-grid">${body}</div><footer class="modal-footer"><button type="button" class="btn secondary action-cancel">Avbryt</button><button type="submit" class="btn primary">${saveLabel}</button></footer></form></section>`;
  document.body.appendChild(wrapper);
  const form=wrapper.querySelector('form');
  let dirty=false;
  const closeNow=()=>{document.removeEventListener('keydown',onKeydown);wrapper.remove();};
  const requestClose=async()=>{
    if(!dirty){closeNow();return;}
    const discard=await window.AppConfirm?.({title:'Forkast endringer?',message:'Du har ulagrede endringer.',confirmLabel:'Forkast',help:'Endringene blir ikke lagret.'});
    if(discard)closeNow();
  };
  const onKeydown=e=>{if(e.key==='Escape'){e.preventDefault();requestClose();}};
  wrapper.querySelector('.action-close').addEventListener('click',requestClose);
  wrapper.querySelector('.action-cancel').addEventListener('click',requestClose);
  form.addEventListener('input',()=>{dirty=true;});
  form.addEventListener('change',()=>{dirty=true;});
  form.addEventListener('submit',async e=>{e.preventDefault();const ok=await onSave(new FormData(e.currentTarget),wrapper);if(ok!==false){dirty=false;closeNow();}});
  document.addEventListener('keydown',onKeydown);
  wrapper.querySelector('input,select')?.focus(); return wrapper;
}

function amortizeLoan(balance, annualRate, payment) {
  const monthlyRate=num(annualRate)/100/12; let remaining=num(balance), interest=0, months=0;
  if(remaining<=0) return {months:0,interest:0};
  if(payment<=remaining*monthlyRate) return null;
  while(remaining>0.01 && months<1200){const i=remaining*monthlyRate; interest+=i; remaining-=Math.min(remaining,Math.max(0,payment-i)); months++;}
  return {months,interest};
}

function openLoanSimulator(){
  if(!AppState.loans.length){showToast('Registrer et lån først');return;}
  const options=AppState.loans.map(l=>`<option value="${l.id}">${l.name}</option>`).join('');
  const modal=actionModal('Rentesimulator',`<label class="field"><span>Lån</span><select name="loanId">${options}</select></label><label class="field"><span>Ny nominell rente (%)</span><input name="rate" type="number" step="0.01" min="0" required></label><label class="field"><span>Ekstra innbetaling per måned</span><input name="extra" type="number" step="100" min="0" value="0"></label><div class="card loan-simulation-card"><div class="card-body" id="loanSimulationResult"><p class="muted">Velg rente og ekstra innbetaling.</p></div></div>`,()=>true,'Lukk');
  const form=modal.querySelector('form'), result=modal.querySelector('#loanSimulationResult');
  const update=()=>{const loan=AppState.loans.find(x=>String(x.id)===form.loanId.value)||AppState.loans[0]; if(!form.rate.value)form.rate.value=num(loan.nominal).toFixed(2); const rate=num(form.rate.value),extra=num(form.extra.value),payment=num(loan.payment)+extra; const current=amortizeLoan(loan.balance,loan.nominal,loan.payment),next=amortizeLoan(loan.balance,rate,payment); if(!next){result.innerHTML='<p class="negative">Terminbeløpet dekker ikke rentene med valgt rente.</p>';return;} const saved=current?current.interest-next.interest:0; result.innerHTML=`<div class="list-item"><span>Nytt terminbeløp</span><strong>${UI.money(payment)}</strong></div><div class="list-item"><span>Estimert nedbetalingstid</span><strong>${Math.floor(next.months/12)} år ${next.months%12} mnd</strong></div><div class="list-item"><span>Gjenstående renter</span><strong>${UI.money(next.interest)}</strong></div><div class="list-item"><span>Forskjell mot dagens plan</span><strong class="${saved>=0?'positive':'negative'}">${UI.money(saved)}</strong></div>`;};
  form.addEventListener('input',update); form.loanId.addEventListener('change',()=>{const l=AppState.loans.find(x=>String(x.id)===form.loanId.value); form.rate.value=num(l.nominal).toFixed(2);update();}); update();
}

function openForecastAssumptions(){
  const a=AppState.settings?.forecastAssumptions||{incomeGrowth:0,expenseGrowth:0,extraDebtPayment:0,savingsGrowth:0};
  actionModal('Juster forutsetninger',`<label class="field"><span>Årlig inntektsvekst (%)</span><input name="incomeGrowth" type="number" step="0.1" value="${num(a.incomeGrowth)}"></label><label class="field"><span>Årlig utgiftsvekst (%)</span><input name="expenseGrowth" type="number" step="0.1" value="${num(a.expenseGrowth)}"></label><label class="field"><span>Ekstra nedbetaling per måned</span><input name="extraDebtPayment" type="number" step="100" min="0" value="${num(a.extraDebtPayment)}"></label><label class="field"><span>Økning i månedlig sparing (%)</span><input name="savingsGrowth" type="number" step="0.1" value="${num(a.savingsGrowth)}"></label>`,async data=>{await Backend.setSetting('forecastAssumptions',{incomeGrowth:num(data.get('incomeGrowth')),expenseGrowth:num(data.get('expenseGrowth')),extraDebtPayment:num(data.get('extraDebtPayment')),savingsGrowth:num(data.get('savingsGrowth'))}); await Backend.loadSnapshot(activePeriod); renderPage(); showToast('Forutsetninger lagret'); return true;});
}

async function toggleSetting(key,className){const next=!(AppState.settings?.[key]===true); await Backend.setSetting(key,next); await Backend.loadSnapshot(activePeriod); document.documentElement.classList.toggle(className,next); renderPage(); showToast(next?'Aktivert':'Deaktivert');}

function navigateTipAction(action){
  let target=null;
  if(/rentesimulator/i.test(action)) target=['economy','loans'];
  else if(/budsjett/i.test(action)) target=['economy','budget'];
  else if(/utgift/i.test(action)) target=['economy','expenses'];
  else if(/oppskrift/i.test(action)) target=['food','recipes'];
  else if(/ingrediens/i.test(action)) target=['food','ingredients'];
  if(target) navigateTo(...target);
  if(/rentesimulator/i.test(action))openLoanSimulator();
}



function normalizeRemoteImage(value){
  const raw=typeof value==='string'?value:(value?.url||value?.large||value?.medium||value?.small||value?.png||value?.svg||'');
  if(!raw)return '';
  if(raw.startsWith('//'))return `https:${raw}`;
  if(raw.startsWith('/'))return `https://kassal.app${raw}`;
  return raw;
}
function normalizeKassalDate(value){
  if(!value)return '';
  if(typeof value==='string')return value;
  return value.date||value.datetime||value.value||'';
}
const kassalNumber = value => PricingEngine.number(value);
const extractKassalPrice = product => PricingEngine.extractProductPrice(product);
const extractKassalUnitPrice = product => PricingEngine.extractUnitPrice(product);
function normalizeKassalProducts(payload){
  return PricingEngine.normalizeProducts(payload,{normalizeImage:normalizeRemoteImage,normalizeDate:normalizeKassalDate});
}
window.kassalNumber=kassalNumber;
window.extractKassalPrice=extractKassalPrice;
window.normalizeKassalProducts=normalizeKassalProducts;

function productImagePlaceholder(className='product-image-placeholder'){
  return `<div class="${className} product-image-empty" aria-label="Ingen produktbilde">
    <span class="product-image-empty-icon" aria-hidden="true">📷</span>
    <span class="product-image-empty-slash" aria-hidden="true"></span>
  </div>`;
}

function ingredientProductHasImage(value){
  const url=String(value||'').trim();
  if(!url)return false;
  const lower=url.toLowerCase();
  return ![
    'placeholder','no-image','no_image','noimage',
    'image-not-found','image_not_found','missing-image','missing_image',
    'default-product','default_product'
  ].some(token=>lower.includes(token));
}

function productCardHtml(p,index){
  const unit=p.unitPrice?`${p.unitPrice.toLocaleString('nb-NO',{maximumFractionDigits:2})} kr/${p.unitPriceUnit||p.unit}`:'';
  const labels=(p.labels||[]).slice(0,2).map(l=>`<span class="badge">${l.display_name||l.name||l}</span>`).join('');
  const secondary=[p.brand,p.packageSize?`${p.packageSize} ${p.unit}`:''].filter(Boolean).join(' · ');
  return `<article class="card api-product-card" data-index="${index}">${ingredientProductHasImage(p.image)?`<button class="product-detail-trigger image-button" data-index="${index}"><img class="product-image-with-fallback" src="${p.image}" alt="${p.eName}" loading="lazy" referrerpolicy="no-referrer"></button>`:`<button class="product-detail-trigger image-button" data-index="${index}">${productImagePlaceholder('product-image-placeholder')}</button>`}<div class="api-product-body"><div class="product-card-meta"><span>${p.store||'Ukjent butikk'}</span>${p.category?`<span>${p.category}</span>`:''}</div><button class="product-title-button product-detail-trigger" data-index="${index}"><h3>${p.eName}</h3></button>${secondary?`<p class="muted product-secondary">${secondary}</p>`:''}${labels?`<div class="product-labels">${labels}</div>`:''}<div class="product-price-row"><strong>${p.price?UI.money(p.price):'Pris mangler'}</strong>${unit?`<span>${unit}</span>`:''}</div><div class="product-actions"><button class="btn primary small add-api-pantry" data-index="${index}">Til matlager</button><button class="btn secondary small add-api-shopping" data-index="${index}">Til handleliste</button></div></div></article>`;
}
async function cachedApi(key,ttl,loader){const cfg=AppState.settings?.kassalUi||{};if(cfg.useCache!==false){const cached=(await BudgetDB.getAll('apiCache')).find(x=>x.key===key&&Date.now()-new Date(x.savedAt).getTime()<ttl);if(cached)return cached.payload;}const payload=await loader();if(cfg.useCache!==false){const all=await BudgetDB.getAll('apiCache');const old=all.find(x=>x.key===key);await BudgetDB.put('apiCache',{...(old||{}),key,payload,savedAt:new Date().toISOString()});}return payload;}
async function cachedKassalSearch(params){
  const selectedStores=params.stores||[];
  const singleStore=selectedStores.length===1?selectedStores[0]:'';
  const serverParams={
    search:params.search||'',
    sort:(selectedStores.length>1&&['price_asc','price_desc'].includes(params.sort))?'date_desc':(params.sort||'date_desc'),
    vendor:params.vendor||'',
    brand:params.brand||'',
    category_id:params.category_id||'',
    category:params.category_id?'':(params.category||''),
    store:singleStore,
    excl_allergens:params.excl_allergens||[],
    incl_allergens:params.incl_allergens||[],
    price_min:selectedStores.length>1?'':params.price_min,
    price_max:selectedStores.length>1?'':params.price_max,
    unique:true,
    exclude_without_ean:true,
    size:params.size,
    page:params.page
  };
  return cachedApi(`products-browser-v6:${JSON.stringify(serverParams)}`,3600000,()=>window.budgetApp.kassal.searchProducts(serverParams));
}
window.searchKassalProductsForUi = async function(params = {}) {
  const payload = await cachedKassalSearch(params);
  return normalizeKassalProducts(payload);
};

window.enrichKassalProductPrices = async function(products = []) {
  return PricingEngine.enrichProducts(products,{
    cached:cachedApi,
    pricesBulk:payload=>window.budgetApp.kassal.pricesBulk(payload),
    getProductById:id=>window.budgetApp.kassal.getProductById(id),
    normalize:normalizeKassalProducts
  });
};


window.expandKassalProductsByStore = async function(products = [], maxStoresPerProduct = 3) {
  const source=(products||[]).filter(Boolean).map(product=>({...product}));
  if(!source.length)return [];
  const eans=[...new Set(source.map(product=>String(product.ean||'').trim()).filter(Boolean))];
  const rowsByEan=new Map();
  for(let offset=0;offset<eans.length;offset+=100){
    const chunk=eans.slice(offset,offset+100);
    try{
      const payload=await cachedApi(`ingredient-store-prices-v1:${[...chunk].sort().join(',')}`,15*60*1000,
        ()=>window.budgetApp.kassal.pricesBulk({eans:chunk,days:1,aggregation:'min'}));
      (Array.isArray(payload?.data)?payload.data:[]).forEach(row=>rowsByEan.set(String(row?.ean||''),row));
    }catch(error){console.warn('Kunne ikke hente butikkpriser for ingrediensprodukter',error);}
  }
  const result=[],seen=new Set(),limit=Math.max(1,Number(maxStoresPerProduct)||1);
  source.forEach(product=>{
    const row=rowsByEan.get(String(product.ean||''));
    const choices=(Array.isArray(row?.stores)?row.stores:[])
      .map(store=>({code:String(store?.store||'').trim(),name:String(store?.name||store?.store||'').trim(),
        price:num(store?.current_price),unitPrice:num(store?.current_unit_price),
        unitPriceUnit:String(store?.current_unit_price_unit||'').trim()}))
      .filter(choice=>choice.price>0&&choice.name).sort((a,b)=>a.price-b.price).slice(0,limit);
    const variants=choices.length?choices.map(choice=>({...product,price:choice.price,
      unitPrice:choice.unitPrice||product.unitPrice||0,
      unitPriceUnit:choice.unitPriceUnit||product.unitPriceUnit||product.unit,
      store:choice.name,storeCode:choice.code})):[product];
    variants.forEach(candidate=>{
      const key=`${candidate.ean||candidate.id||candidate.eName}::${candidate.storeCode||candidate.store||''}::${candidate.price||''}`;
      if(!seen.has(key)){seen.add(key);result.push(candidate);}
    });
  });
  return result;
};

function responseMeta(payload,page,size){const meta=payload?.meta||{};return {page:num(meta.current_page||meta.page||page)||1,lastPage:num(meta.last_page||meta.total_pages||1)||1,total:num(meta.total||meta.total_count||0),perPage:num(meta.per_page||meta.size||size)||size};}
async function loadKassalTaxonomy(){
  const categoryHolder=document.getElementById('kassalCategories');
  try{
    const payload=await cachedApi('kassal-categories-all-v3',7*24*3600000,()=>window.budgetApp.kassal.getCategories({size:100}));
    const rows=(Array.isArray(payload?.data)?payload.data:Array.isArray(payload)?payload:[])
      .filter(c=>c?.name&&c?.id!=null)
      .sort((a,b)=>String(a.name).localeCompare(String(b.name),'nb-NO'));
    kassalBrowser.categories=rows;
    kassalBrowser.categoryMap={};
    rows.forEach(c=>{kassalBrowser.categoryMap[String(c.name).trim().toLocaleLowerCase('nb-NO')]=String(c.id);});
    if(categoryHolder&&rows.length){
      categoryHolder.innerHTML=rows.map(c=>`<label class="check-row"><input type="checkbox" name="category_filter" value="${escapeHtml(c.name)}"><span>${escapeHtml(c.name)}</span></label>`).join('');
    }
  }catch(e){
    kassalBrowser.categories=[];kassalBrowser.categoryMap={};
    console.warn('Kunne ikke hente Kassalapp-kategorier – bruker lokal fallback',e);
  }
  wireFilterSelectAll('categorySelectAll','category_filter',true);
  wireFilterSelectAll('storeSelectAll','store_filter',false);
  wireFilterSelectAll('allergenSelectAll','excl_allergens',false);
}
function wireFilterSelectAll(masterId,name,single=false){const master=document.getElementById(masterId),items=[...document.querySelectorAll(`[name="${name}"]`)];if(!master)return;const sync=()=>{master.checked=!items.some(x=>x.checked);};master.addEventListener('change',()=>{if(master.checked)items.forEach(x=>x.checked=false);});items.forEach(item=>item.addEventListener('change',()=>{if(single&&item.checked)items.forEach(x=>{if(x!==item)x.checked=false;});sync();}));sync();}
function buildProductParams(page=1){
  const form=document.getElementById('kassalBrowserForm'),fd=new FormData(form);
  const selectedCategory=[...form.querySelectorAll('[name="category_filter"]:checked')].map(x=>String(x.value||'').trim()).filter(Boolean)[0]||'';
  const categoryId=selectedCategory?kassalBrowser.categoryMap[String(selectedCategory).toLocaleLowerCase('nb-NO')]||'':'';
  return {
    search:String(fd.get('search')||'').trim(),
    sort:fd.get('sort')||'date_desc',
    category:selectedCategory,
    category_id:categoryId,
    stores:[...form.querySelectorAll('[name="store_filter"]:checked')].map(x=>x.value),
    price_min:fd.get('price_min')||'',
    price_max:fd.get('price_max')||'',
    excl_allergens:[...form.querySelectorAll('[name="excl_allergens"]:checked')].map(x=>KASSAL_ALLERGEN_CODES[x.value]||String(x.value||'').toLocaleLowerCase('nb-NO')),
    unique:true,
    exclude_without_ean:true,
    size:num(fd.get('size')||24),
    page
  };
}
function paginationHtml(current,last){if(last<=1)return '';const start=Math.max(1,current-2),end=Math.min(last,current+2);let html=`<button class="btn secondary small product-page" data-page="${current-1}" ${current<=1?'disabled':''}>‹ Forrige</button>`;for(let i=start;i<=end;i++)html+=`<button class="btn ${i===current?'primary':'secondary'} small product-page" data-page="${i}">${i}</button>`;html+=`<button class="btn secondary small product-page" data-page="${current+1}" ${current>=last?'disabled':''}>Neste ›</button>`;return html;}
async function showProductDetails(index){const base=kassalBrowser.products[num(index)];if(!base)return;actionModal('Produktdetaljer',`<div id="productDetailBody" class="product-detail-body"><p class="muted">Henter full produktinformasjon …</p></div>`,async()=>true,'Lukk');const holder=document.getElementById('productDetailBody');holder?.closest('.modal')?.classList.add('product-detail-modal');try{const payload=await cachedApi(`kassal-product:${base.id}`,3600000,()=>window.budgetApp.kassal.getProductById(base.id));const p=normalizeKassalProducts(payload)[0]||base;let history='';if(p.ean){try{const hp=await cachedApi(`kassal-history:${p.ean}`,3600000,()=>window.budgetApp.kassal.pricesBulk({eans:[p.ean],days:30,aggregation:'min'}));const item=hp?.data?.[0];if(item){history=`<h3>Priser og historikk</h3><div class="detail-grid">${(item.stores||[]).map(x=>`<div><span>${x.name||x.store}</span><strong>${x.current_price?UI.money(x.current_price):'–'}</strong></div>`).join('')}</div><p class="muted">${(item.price_history||[]).length} historikkpunkter siste 30 dager.</p>`;}}catch{}}
    const allergens=(p.allergens||[]).map(a=>`${a.display_name||a.code}: ${a.contains||''}`).join(', ');
    const nutrition=(Array.isArray(p.nutrition)?p.nutrition:[]).map(item=>`<div><span>${escapeHtml(item.display_name||item.code||'')}</span><strong>${Number.isFinite(Number(item.amount))?escapeHtml(item.amount):'–'} ${escapeHtml(item.unit||'')}</strong></div>`).join('');
    holder.innerHTML=`<div class="product-detail-hero">${p.image?`<div class="product-detail-image-wrap"><img class="product-detail-image-with-fallback" src="${p.image}" alt="${p.eName}"></div>`:`<div class="product-detail-image-wrap">${productImagePlaceholder('product-detail-placeholder')}</div>`}<div><h2>${p.eName}</h2><p class="muted">${[p.brand,p.vendor,p.category,p.ean?`EAN ${p.ean}`:''].filter(Boolean).join(' · ')}</p><div class="big-price">${p.price?UI.money(p.price):'Pris mangler'}</div></div></div><h3>Produktinformasjon</h3><div class="detail-grid"><div><span>Butikk</span><strong>${p.store||'–'}</strong></div><div><span>Pakning</span><strong>${p.packageSize} ${p.unit}</strong></div><div><span>Enhetspris</span><strong>${p.unitPrice?`${p.unitPrice} ${p.unitPriceUnit||''}`:'–'}</strong></div><div><span>Sist oppdatert</span><strong>${p.updatedAt||'–'}</strong></div></div>${p.ingredients?`<h3>Ingredienser</h3><p>${typeof p.ingredients==='string'?p.ingredients:JSON.stringify(p.ingredients)}</p>`:''}${allergens?`<h3>Allergener</h3><p>${allergens}</p>`:''}${nutrition?`<h3>Næringsinnhold</h3><div class="detail-grid">${nutrition}</div>`:''}${history}`;
    const detailImg=holder.querySelector('.product-detail-image-with-fallback');
    if(detailImg){
      const replaceDetail=()=>{detailImg.parentElement.innerHTML=productImagePlaceholder('product-detail-placeholder');};
      detailImg.addEventListener('error',replaceDetail,{once:true});
      if(detailImg.complete && detailImg.naturalWidth===0)replaceDetail();
    }

  }catch(e){holder.innerHTML=`<p class="negative">${e.message}</p>`;}}
function wireProductImageFallbacks(holder){
  holder?.querySelectorAll('.product-image-with-fallback').forEach(img=>{
    const replace=()=>{
      const parent=img.parentElement;
      if(!parent)return;
      parent.innerHTML=productImagePlaceholder('product-image-placeholder');
    };
    img.addEventListener('error',replace,{once:true});
    if(img.complete && img.naturalWidth===0)replace();
  });
}

function wireProductCardActions(holder){wireProductImageFallbacks(holder);holder.querySelectorAll('.product-detail-trigger').forEach(btn=>btn.addEventListener('click',()=>showProductDetails(btn.dataset.index)));holder.querySelectorAll('.add-api-pantry').forEach(btn=>btn.addEventListener('click',async()=>{const p=kassalBrowser.products[num(btn.dataset.index)];const existing=(await BudgetDB.getAll('pantryItems')).find(x=>String(x.kassalProductId)===String(p.id));const record={...(existing||{}),name:p.eName,quantity:existing?.quantity||1,unit:p.unit||'stk',purchaseDate:existing?.purchaseDate||new Date().toISOString().slice(0,10),expiryDate:existing?.expiryDate||'',minimum:existing?.minimum||0,location:existing?.location||'Skap',price:p.price,store:p.store,kassalProductId:p.id,ean:p.ean,brand:p.brand,image:p.image,packageSize:p.packageSize,packageUnit:p.unit,apiSource:'Kassalapp',apiUpdatedAt:new Date().toISOString()};existing?await BudgetDB.put('pantryItems',record):await BudgetDB.add('pantryItems',record);await Backend.automaticBackup();await Backend.loadSnapshot(activePeriod);showToast(existing?'Matlagervare oppdatert':'Produkt lagt til i matlager');}));holder.querySelectorAll('.add-api-shopping').forEach(btn=>btn.addEventListener('click',async()=>{const p=kassalBrowser.products[num(btn.dataset.index)];const result=await CRUD.addShoppingWithPantryGate({name:p.eName,quantity:1,unit:p.unit||'stk',category:p.category||'Dagligvare',recipe:'',price:p.price,unitPrice:p.price,atHome:false,checked:false,kassalProductId:p.id,ean:p.ean||'',store:p.store,packageSize:p.packageSize,packageUnit:p.unit,createdAt:new Date().toISOString()},{mergeExact:true});if(!result.added){showToast('Varen ble ikke lagt til');return;}await Backend.automaticBackup();await Backend.loadSnapshot(activePeriod);showToast(result.need.state==='ADD_REMAINDER'?`Matlager dekker noe av behovet – ${result.addedQuantity} lagt til`:'Produkt lagt til i handlelisten');}));}
async function applyKassalBrowserFilters(products,params){
  let filtered=[...(products||[])];
  const stores=params.stores||[];

  // Ett butikkvalg håndteres direkte av /products?store=...
  // Flere butikker må sammenlignes over samme EAN via prices-bulk.
  if(stores.length>1&&filtered.length){
    const requested=new Set(stores.map(x=>String(x).toUpperCase()));
    const eans=[...new Set(filtered.map(x=>String(x.ean||'')).filter(Boolean))];
    const storeByEan=new Map();

    for(let offset=0;offset<eans.length;offset+=100){
      const chunk=eans.slice(offset,offset+100);
      const payload=await cachedApi(`kassal-browser-prices-v2:${chunk.join(',')}`,15*60*1000,()=>window.budgetApp.kassal.pricesBulk({eans:chunk,days:1,aggregation:'min'}));
      (Array.isArray(payload?.data)?payload.data:[]).forEach(row=>{
        const choices=(Array.isArray(row?.stores)?row.stores:[])
          .map(store=>({
            code:String(store?.store||'').toUpperCase(),
            name:store?.name||store?.store||'',
            price:num(store?.current_price),
            unitPrice:num(store?.current_unit_price),
            unitPriceUnit:store?.current_unit_price_unit||''
          }))
          .filter(entry=>requested.has(entry.code)&&entry.price>0)
          .sort((a,b)=>a.price-b.price);
        if(choices.length)storeByEan.set(String(row.ean||''),choices);
      });
    }

    filtered=filtered.filter(product=>{
      const choices=storeByEan.get(String(product.ean||''));
      if(!choices?.length)return false;
      const best=choices[0];
      product.price=best.price;
      product.unitPrice=best.unitPrice||product.unitPrice||0;
      product.unitPriceUnit=best.unitPriceUnit||product.unitPriceUnit||product.unit;
      product.store=best.name;
      product.storeCode=best.code;
      product.priceOptions=choices.map(choice=>({...product,price:choice.price,unitPrice:choice.unitPrice||product.unitPrice,unitPriceUnit:choice.unitPriceUnit||product.unitPriceUnit,store:choice.name,storeCode:choice.code}));
      return true;
    });

    const min=num(params.price_min),max=num(params.price_max);
    if(min>0)filtered=filtered.filter(x=>num(x.price)>=min);
    if(max>0)filtered=filtered.filter(x=>num(x.price)<=max);
    if(params.sort==='price_asc')filtered.sort((a,b)=>num(a.price)-num(b.price));
    if(params.sort==='price_desc')filtered.sort((a,b)=>num(b.price)-num(a.price));
  }

  return filtered;
}
function kassalBufferKey(params){
  const stable={
    search:params.search||'',
    sort:params.sort||'date_desc',
    category:params.category||'',
    category_id:params.category_id||'',
    stores:[...(params.stores||[])].sort(),
    price_min:params.price_min||'',
    price_max:params.price_max||'',
    excl_allergens:[...(params.excl_allergens||[])].sort(),
    size:params.size
  };
  return JSON.stringify(stable);
}

async function bufferedKassalBrowserPage(params,uiPage=1){
  const size=Math.max(1,num(params.size)||24);
  const key=kassalBufferKey(params);
  let state=kassalBrowser.buffers.get(key);
  if(!state){
    state={products:[],nextApiPage:1,apiLastPage:null,exhausted:false,seen:new Set()};
    kassalBrowser.buffers.set(key,state);
  }
  const needed=uiPage*size;
  while(state.products.length<needed&&!state.exhausted){
    const apiPage=state.nextApiPage;
    const requestParams={...params,page:apiPage};
    const payload=await cachedKassalSearch(requestParams);
    const meta=responseMeta(payload,apiPage,size);
    state.apiLastPage=meta.lastPage;
    const filtered=await applyKassalBrowserFilters(normalizeKassalProducts(payload),params);
    filtered.forEach(product=>{
      const id=String(product.ean||product.id||`${product.eName}:${product.storeCode}`);
      if(state.seen.has(id))return;
      state.seen.add(id);
      state.products.push(product);
    });
    state.nextApiPage=apiPage+1;
    state.exhausted=apiPage>=meta.lastPage||!(normalizeKassalProducts(payload).length);
  }

  if(params.stores?.length&&params.sort==='price_asc')state.products.sort((a,b)=>num(a.price)-num(b.price));
  if(params.stores?.length&&params.sort==='price_desc')state.products.sort((a,b)=>num(b.price)-num(a.price));

  const start=(uiPage-1)*size;
  const products=state.products.slice(start,start+size);
  const knownPages=Math.max(1,Math.ceil(state.products.length/size));
  const lastPage=state.exhausted?knownPages:Math.max(uiPage+1,knownPages);
  return {products,page:uiPage,lastPage,total:state.exhausted?state.products.length:null,exhausted:state.exhausted};
}

async function runKassalBrowserSearch(page=1){
  const requestId=++kassalBrowser.requestId;
  const grid=document.getElementById('kassalProductGrid'),status=document.getElementById('kassalResultStatus'),pager=document.getElementById('kassalPagination');
  if(!grid)return;
  kassalBrowser.loading=true;status.textContent='Henter produkter …';grid.classList.add('loading');grid.setAttribute('aria-busy','true');if(!grid.children.length)grid.innerHTML='<div class="product-loading-state"><span class="table-spinner" aria-hidden="true"></span><span>Henter produkter …</span></div>';
  try{
    const params=buildProductParams(page);
    if(params.search&&params.search.length<3)throw new Error('Produktsøk må inneholde minst 3 tegn.');
    const buffered=await bufferedKassalBrowserPage(params,page);
    if(requestId!==kassalBrowser.requestId)return;
    kassalBrowser.products=buffered.products;
    kassalBrowser.page=buffered.page;kassalBrowser.lastPage=buffered.lastPage;kassalBrowser.total=buffered.total||0;
    grid.innerHTML=kassalBrowser.products.length?kassalBrowser.products.map(productCardHtml).join(''):UI.emptyState('Ingen produkter funnet','Prøv et bredere søk eller færre filtre.');
    const activeFilters=(params.category?1:0)+(params.stores?.length||0)+(params.excl_allergens?.length||0)+(params.price_min?1:0)+(params.price_max?1:0);
    const totalText=buffered.total!=null?`${buffered.total.toLocaleString('nb-NO')} filtrerte treff · `:'';
    status.textContent=`${totalText}side ${buffered.page}${buffered.exhausted?` av ${buffered.lastPage}`:''} · ${kassalBrowser.products.length} vist${activeFilters?` · ${activeFilters} aktive filtre`:''}`;
    pager.innerHTML=paginationHtml(buffered.page,buffered.lastPage);pager.querySelectorAll('.product-page').forEach(btn=>btn.addEventListener('click',()=>runKassalBrowserSearch(num(btn.dataset.page))));wireProductCardActions(grid);
  }catch(e){if(requestId!==kassalBrowser.requestId)return;status.textContent='Kunne ikke hente produkter';grid.innerHTML=`<div class="card"><div class="card-body"><p class="negative">${e.message}</p></div></div>`;}
  finally{if(requestId===kassalBrowser.requestId){kassalBrowser.loading=false;grid.classList.remove('loading');grid.removeAttribute('aria-busy');}}
}

async function openRecipeUrlImport(){
  actionModal('Importer oppskrift fra nett',`<div class="recipe-import-intro" style="grid-column:1/-1"><p>Lim inn lenken til en oppskrift. Appen leser standardisert Recipe/JSON-LD og åpner resultatet for kontroll før lagring.</p></div><label class="field" style="grid-column:1/-1"><span>Nettadresse</span><input name="url" type="url" placeholder="https://…" autocomplete="off" required></label><div class="recipe-import-support" style="grid-column:1/-1"><strong>Første versjon støtter:</strong><span>schema.org Recipe og JSON-LD</span><small>Nettsider uten strukturert oppskriftsdata kan legges til senere med egne parsere.</small></div>`,async(data,wrapper)=>{
    const url=String(data.get('url')||'').trim();
    const submit=wrapper.querySelector('[type="submit"]');
    try{
      submit.disabled=true;submit.textContent='Henter oppskrift …';
      if(!window.budgetApp?.importRecipeUrl)throw new Error('Importmotoren er ikke tilgjengelig. Start appen på nytt.');
      const result=await window.budgetApp.importRecipeUrl(url);
      const recipe=result?.recipe;
      if(!recipe)throw new Error('Fant ingen oppskrift på siden.');
      setTimeout(()=>window.CRUD.open('recipes',null,recipe),0);
      showToast(`${recipe.name} importert til redigering · ${recipe.ingredients.length} ingredienser`);
      return true;
    }catch(error){showToast(error.message||'Kunne ikke importere oppskriften');return false;}
    finally{submit.disabled=false;submit.textContent='Importer';}
  },'Importer');
}


let stopBarcodeCamera=null;
function closeBarcodeModal(){
  if(stopBarcodeCamera){stopBarcodeCamera();stopBarcodeCamera=null;}
  document.getElementById('barcodeModalBackdrop')?.remove();
}
function barcodeLocationKey(product){return `barcode-location:${product.ean||product.productId||product.name}`;}
function rememberedBarcodeLocation(product){
  try{return localStorage.getItem(barcodeLocationKey(product))||'';}catch(_){return '';}
}
function rememberBarcodeLocation(product,location){
  try{if(location)localStorage.setItem(barcodeLocationKey(product),location);}catch(_){}
}
function barcodeProductHtml(product){
  const packageText=product.packageQuantity&&product.packageUnit?`${product.packageQuantity} ${product.packageUnit}`:'–';
  return `<div class="barcode-product"><h3 class="barcode-product-name">${escapeHtml(product.name||'Ukjent produkt')}</h3><div class="barcode-product-body">${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:''}<div class="barcode-product-lines"><div><span>Merke:</span> ${escapeHtml(product.brand||'–')}</div><div><span>Pakning:</span> ${escapeHtml(packageText)}</div><div><span>Butikk:</span> ${escapeHtml(product.store||'–')}</div><div><span>Pris:</span> <strong>${num(product.price)>0?UI.money(product.price):'Ikke funnet'}</strong></div></div></div></div>`;
}
function barcodeStoreKey(product){
  return String(product?.storeCode||product?.store||'').trim().toLowerCase();
}
function barcodePriceOptions(product){
  const source=Array.isArray(product?.priceOptions)&&product.priceOptions.length?product.priceOptions:[product];
  const seen=new Set();
  return source.filter(option=>{
    const key=`${barcodeStoreKey(option)}:${num(option.price)}`;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
function chooseBarcodeStoreOption(product,sessionStoreKey=''){
  const options=barcodePriceOptions(product);
  const preferred=sessionStoreKey&&options.find(option=>barcodeStoreKey(option)===sessionStoreKey);
  return preferred||options.find(option=>num(option.price)>0)||options[0]||product;
}
async function matchingOpenShoppingItem(product){
  const all=await BudgetDB.getAll('shoppingItems');
  return all.find(x=>!x.checked&&((product.ean&&String(x.ean)===String(product.ean))||String(x.kassalProductId||'')===String(product.productId||'')))||null;
}
async function upsertScannedPantryProduct(product,{quantity=1,unit='',purchaseDate='',expiryDate='',location=''}={}){
  const all=await BudgetDB.getAll('pantryItems');
  const existing=all.find(x=>(product.ean&&String(x.ean)===String(product.ean))||String(x.kassalProductId||'')===String(product.productId||''));
  const resolvedLocation=location||existing?.location||rememberedBarcodeLocation(product)||'Skap';
  const now=new Date().toISOString();
  const history=[...(existing?.priceHistory||[])];
  if(num(product.price)>0) history.push({date:now,price:num(product.price),store:product.store||''});
  const record={...(existing||{}),name:product.name,quantity:(existing?num(existing.quantity):0)+Math.max(0.01,num(quantity)||1),unit:unit||existing?.unit||product.packageUnit||'stk',purchaseDate:purchaseDate||new Date().toISOString().slice(0,10),expiryDate:expiryDate||existing?.expiryDate||'',minimum:existing?.minimum||0,location:resolvedLocation,price:product.price,store:product.store,kassalProductId:product.productId,ean:product.ean,brand:product.brand,image:product.image,category:product.category,packageSize:product.packageQuantity,packageUnit:product.packageUnit,priceHistory:history.slice(-50),apiSource:'Kassalapp',apiUpdatedAt:now};
  existing?await BudgetDB.put('pantryItems',record):await BudgetDB.add('pantryItems',record);
  rememberBarcodeLocation(product,resolvedLocation);
  return record;
}
async function receiveScannedShoppingProduct(product){
  const shopping=await matchingOpenShoppingItem(product);
  const now=new Date().toISOString();
  if(shopping){
    const quantity=Math.max(0.01,num(shopping.quantity)||1);
    const unit=shopping.unit||product.packageUnit||'stk';
    const pantryRecord=await upsertScannedPantryProduct(product,{quantity,unit,purchaseDate:new Date().toISOString().slice(0,10)});
    const unitPrice=num(product.price)||num(shopping.unitPrice)||0;
    const totalPrice=unitPrice>0?unitPrice*quantity:num(shopping.price)||0;
    await CRUD.updateShoppingState(shopping.id,{checked:true,atHome:false,purchaseDate:pantryRecord.purchaseDate,actualUnitPrice:unitPrice,price:totalPrice,scannedAt:now});
    return {matched:true,name:shopping.name||product.name,quantity,unit,location:pantryRecord.location};
  }
  const accepted=await window.AppConfirm?.({title:'Ikke på aktiv handleliste',message:`${product.name||'Varen'} finnes ikke på Aktiv handleliste. Legge den direkte i Matlager?`,confirmLabel:'Legg i Matlager',help:'Varen registreres som beholdning, men opprettes ikke som et kjøp fra handlelisten.'});
  if(!accepted)return {matched:false,added:false};
  const pantryRecord=await upsertScannedPantryProduct(product,{quantity:1,unit:product.packageUnit||'stk',purchaseDate:new Date().toISOString().slice(0,10)});
  await Backend.automaticBackup();await Backend.loadSnapshot(activePeriod);renderPage();
  return {matched:false,added:true,name:product.name,quantity:1,unit:pantryRecord.unit,location:pantryRecord.location};
}
async function saveScannedProduct(product,target,form,options={}){
  const quantity=Math.max(0.01,num(form.get('quantity'))||1);
  const now=new Date().toISOString();
  if(target==='pantry'){
    const record=await upsertScannedPantryProduct(product,{quantity,unit:form.get('unit')||product.packageUnit||'stk',purchaseDate:form.get('purchaseDate')||new Date().toISOString().slice(0,10),expiryDate:form.get('expiryDate')||'',location:form.get('location')||''});
    if(form.get('completeShopping')==='on'){
      const shopping=await matchingOpenShoppingItem(product);
      if(shopping) await CRUD.updateShoppingState(shopping.id,{checked:true,atHome:false,purchaseDate:record.purchaseDate,actualUnitPrice:num(product.price),price:num(product.price)*Math.max(1,num(shopping.quantity)||1),scannedAt:now});
    }
  }else{
    const record={name:product.name,quantity,unit:form.get('unit')||product.packageUnit||'stk',category:product.category||'Dagligvare',recipe:'',price:num(product.price)*quantity,unitPrice:num(product.price),atHome:false,checked:false,kassalProductId:product.productId,ean:product.ean,store:product.store,image:product.image,brand:product.brand,packageSize:product.packageQuantity,packageUnit:product.packageUnit,createdAt:now};
    const gated=await CRUD.addShoppingWithPantryGate(record,{mergeExact:true});
    if(!gated.added){showToast('Varen ble ikke lagt til');return;}
  }
  await Backend.automaticBackup();await Backend.loadSnapshot(activePeriod);renderPage();showToast(target==='pantry'?'Produkt lagt i matlager':'Produkt lagt på handlelisten');
  if(!options.keepOpen) closeBarcodeModal();
}
function openBarcodeScanner(target='pantry',initialShoppingMode='add'){
  closeBarcodeModal();
  const wrap=document.createElement('div');wrap.id='barcodeModalBackdrop';wrap.className='modal-backdrop';
  const shoppingModes=target==='shopping'?`<div class="barcode-shopping-modes tabs-inline" role="tablist" aria-label="Skannemodus"><button type="button" class="barcode-shopping-mode ${initialShoppingMode==='add'?'active':''}" data-mode="add" role="tab" aria-selected="${initialShoppingMode==='add'}">Legg til på listen</button><button type="button" class="barcode-shopping-mode ${initialShoppingMode==='receive'?'active':''}" data-mode="receive" role="tab" aria-selected="${initialShoppingMode==='receive'}">Registrer kjøpte varer</button></div>`:'';
  wrap.innerHTML=`<section class="modal large-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><h2>Skann vare</h2></div><button class="icon-btn ghost" id="closeBarcodeScanner">×</button></header><div class="modal-body">${shoppingModes}<div class="barcode-layout"><div><div class="barcode-camera companion-camera"><div class="companion-pairing" id="companionPairing"><div class="companion-qr-shell" id="companionQr" aria-label="QR-kode for mobilkamera"></div><strong>Skann QR-koden</strong></div><video id="barcodeVideo" playsinline muted></video><div class="barcode-scan-guide" id="barcodeScanGuide" hidden aria-hidden="true"><span></span></div></div><p class="muted" id="barcodeStatus">Kobler til kamera …</p></div><div class="barcode-result"><label class="field"><span>EAN / strekkode</span><div class="inline-actions"><input id="barcodeManualInput" inputmode="numeric" autocomplete="off"><button class="btn secondary" id="barcodeLookupBtn" type="button">Slå opp</button></div></label><div id="barcodeResult"></div></div></div></div><footer class="modal-footer"><button class="btn secondary" id="barcodeCancelBtn">Lukk</button></footer></section>`;
  document.body.appendChild(wrap);
  const status=wrap.querySelector('#barcodeStatus'),result=wrap.querySelector('#barcodeResult'),input=wrap.querySelector('#barcodeManualInput');
  const video=wrap.querySelector('#barcodeVideo'),pairing=wrap.querySelector('#companionPairing'),qr=wrap.querySelector('#companionQr'),scanGuide=wrap.querySelector('#barcodeScanGuide');
  let sessionStoreKey='';
  let shoppingScanMode=target==='shopping'?(initialShoppingMode==='receive'?'receive':'add'):'add';
  const showProduct=async scannedProduct=>{
    const options=barcodePriceOptions(scannedProduct);
    let product=chooseBarcodeStoreOption(scannedProduct,sessionStoreKey);
    const openShopping=target==='pantry'?await matchingOpenShoppingItem(product):null;
    const remembered=rememberedBarcodeLocation(product)||'Skap';
    const locationOptions=['Kjøleskap','Fryser','Skap'].map(x=>`<option ${x===remembered?'selected':''}>${x}</option>`).join('');
    const storeOptions=options.map((option,index)=>`<option value="${index}" ${option===product?'selected':''}>${escapeHtml(option.store||'Ukjent butikk')} – ${num(option.price)>0?UI.money(option.price):'Pris mangler'}</option>`).join('');
    const fallback=sessionStoreKey&&barcodeStoreKey(product)!==sessionStoreKey;
    result.innerHTML=`<div id="barcodeProductSummary">${barcodeProductHtml(product)}</div><form id="barcodeSaveForm" class="form-grid barcode-save-grid">${options.length>1?`<label class="field barcode-store-field"><span>Butikk og pris</span><select id="barcodeStoreSelect">${storeOptions}</select>${fallback?`<small class="muted">Valgt butikk finnes ikke. Et tilgjengelig alternativ er valgt.</small>`:''}</label>`:`<div class="barcode-store-spacer"></div>`}<label class="field"><span>Mengde</span><input name="quantity" type="number" min="1" step="1" inputmode="numeric" value="1"></label><label class="field"><span>Enhet</span><input name="unit" value="${escapeHtml(product.packageUnit||'stk')}"></label>${target==='pantry'?`<label class="field"><span>Plassering</span><select name="location">${locationOptions}</select></label><label class="field"><span>Innkjøpsdato</span><input name="purchaseDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label class="field"><span>Utløpsdato</span><input name="expiryDate" type="date"></label>${openShopping?`<label class="check-field wide"><input type="checkbox" name="completeShopping" checked><span>Marker samme vare som kjøpt på handlelisten</span></label>`:''}`:''}<button class="btn primary" type="submit">${target==='pantry'?'Legg i matlager':'Legg på handlelisten'}</button></form>`;
    const storeSelect=result.querySelector('#barcodeStoreSelect');
    if(storeSelect)storeSelect.addEventListener('change',()=>{
      product=options[num(storeSelect.value)]||product;
      sessionStoreKey=barcodeStoreKey(product);
      const summary=result.querySelector('#barcodeProductSummary');
      if(summary)summary.innerHTML=barcodeProductHtml(product);
    });
    result.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const submit=e.currentTarget.querySelector('[type="submit"]');
      if(submit)submit.disabled=true;
      try{
        if(!sessionStoreKey)sessionStoreKey=barcodeStoreKey(product);
        await saveScannedProduct(product,target,new FormData(e.currentTarget),{keepOpen:true});
        input.value='';
        result.innerHTML='';
        status.textContent='Vare lagret.';
        await startRemoteDecode();
      }catch(error){
        status.textContent=error.message||'Kunne ikke lagre produktet.';
        if(submit)submit.disabled=false;
      }
    });
  };
  let companion=null,stopRemoteDecode=null,lookupBusy=false,closed=false;
  const startRemoteDecode=async()=>{
    if(closed||!video.classList.contains('is-connected')||stopRemoteDecode)return;
    stopRemoteDecode=await BarcodeEngine.startFromVideo(video,lookup,error=>{if(error&&!closed)status.textContent=error.message||'Strekkoden kunne ikke leses.';},{widthRatio:0.82,heightRatio:0.34});
  };
  const lookup=async code=>{if(lookupBusy)return;lookupBusy=true;try{status.textContent='Slår opp produkt …';const product=await BarcodeEngine.lookup(code);input.value=product.ean||code;stopRemoteDecode?.();stopRemoteDecode=null;if(target==='shopping'&&shoppingScanMode==='receive'){status.textContent='Registrerer kjøpt vare …';const received=await receiveScannedShoppingProduct(product);input.value='';if(received.matched){result.innerHTML=`${barcodeProductHtml(product)}<div class="barcode-receive-success"><strong>Registrert kjøpt</strong><span>Flyttet fra Aktiv til Kjøpt · ${escapeHtml(String(received.quantity))} ${escapeHtml(received.unit)} lagt i ${escapeHtml(received.location)}</span></div>`;status.textContent='Vare registrert.';}else if(received.added){result.innerHTML=`${barcodeProductHtml(product)}<div class="barcode-receive-success"><strong>Lagt direkte i Matlager</strong><span>${escapeHtml(received.location)}</span></div>`;status.textContent='Lagt i Matlager.';}else{result.innerHTML='<p class="muted">Varen ble ikke registrert.</p>';status.textContent='Klar.';}await startRemoteDecode();return;}await showProduct(product);status.textContent='Produkt funnet.';}catch(error){status.textContent=error.message||'Kunne ikke slå opp produktet.';if(video.classList.contains('is-connected'))await startRemoteDecode();}finally{lookupBusy=false;}};
  const cleanup=()=>{closed=true;stopRemoteDecode?.();stopRemoteDecode=null;companion?.close?.();companion=null;};
  const showPairing=()=>{pairing.hidden=false;video.classList.remove('is-connected');scanGuide.hidden=true;};
  const showVideo=()=>{pairing.hidden=true;video.classList.add('is-connected');scanGuide.hidden=false;};
  wrap.querySelectorAll('.barcode-shopping-mode').forEach(btn=>btn.addEventListener('click',async()=>{shoppingScanMode=btn.dataset.mode==='receive'?'receive':'add';wrap.querySelectorAll('.barcode-shopping-mode').forEach(option=>{const active=option===btn;option.classList.toggle('active',active);option.setAttribute('aria-selected',String(active));});input.value='';result.innerHTML='';status.textContent='Klar.';stopRemoteDecode?.();stopRemoteDecode=null;if(video.classList.contains('is-connected'))await startRemoteDecode();}));
  wrap.querySelector('#barcodeLookupBtn').addEventListener('click',()=>lookup(input.value));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup(input.value);}});
  wrap.querySelector('#closeBarcodeScanner').addEventListener('click',()=>{cleanup();closeBarcodeModal();});
  wrap.querySelector('#barcodeCancelBtn').addEventListener('click',()=>{cleanup();closeBarcodeModal();});

  (async()=>{
    try{
      companion=new window.CompanionEngine({
        video,
        onStatus:text=>{if(!closed)status.textContent=text;},
        onError:error=>{if(!closed)status.textContent=error.message||'Kunne ikke koble til mobilkamera.';},
        onConnected:async()=>{if(closed)return;showVideo();status.textContent='Kamera tilkoblet.';await startRemoteDecode();},
        onDisconnected:()=>{if(closed)return;stopRemoteDecode?.();stopRemoteDecode=null;showPairing();status.textContent='Kamera frakoblet.';}
      });
      const session=await companion.createSession();
      if(closed)return;
      qr.innerHTML=await window.budgetApp.generateQr(session.pairUrl);
      showPairing();status.textContent='Skann QR-koden.';
    }catch(error){if(!closed)status.textContent=error.message||'Kunne ikke opprette kameratilkobling.';}
  })();
}


function pb2Number(value){
  if(value===null||value===undefined||value==='')return null;
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:null;
}

function uniqueShoppingMatch(items,predicate){
  const matches=(items||[]).filter(predicate);
  return matches.length===1?matches[0]:null;
}

async function importShoppingTripPb2(payload){
  const version=Number(payload?.v);
  if(version!==1&&version!==2)throw new Error('PB2-versjonen støttes ikke.');
  const isCompact=version===2;
  const sourceListUid=String(isCompact?payload?.id:payload?.sid||'').trim();
  if(isCompact&&!sourceListUid)throw new Error('Handleturen mangler liste-ID.');
  const lines=Array.isArray(payload?.i)?payload.i:[];
  const legacyTripUid=String(payload?.id||'').trim();
  const tripUid=isCompact?`pb2-${sourceListUid}`:legacyTripUid;
  if(!tripUid)throw new Error('Handleturen mangler ID.');
  const completedDate=isCompact?new Date().toISOString().slice(0,10):mobileTransferDate(payload?.da||payload?.ca);
  const allTrips=await BudgetDB.getAll('shoppingTrips');
  const source=sourceListUid?allTrips.find(x=>x.type==='pb1-source'&&String(x.sourceListUid||'')===sourceListUid):null;
  const previous=allTrips.find(x=>x.type==='pb2-return'&&String(x.tripUid||'')===tripUid);
  const sourceItems=Array.isArray(source?.items)?source.items:[];
  const shopping=await BudgetDB.getAll('shoppingItems');
  const importedIds=[];
  const imported=[];

  for(const line of lines){
    const lineUid=String(isCompact?line?.i:line?.li||'').trim();
    const name=String(isCompact?line?.n:line?.n||'').trim();
    const unit=String(isCompact?line?.u:line?.u||'').trim();
    const ean=String(isCompact?'':line?.e||'').trim();
    let current=lineUid?shopping.find(item=>String(item.mobileItemUid||'')===lineUid):null;
    let sourceLine=lineUid?sourceItems.find(item=>String(item.uid||item.id||'')===lineUid):null;

    if(!current&&sourceLine?.shoppingItemId)current=shopping.find(item=>Number(item.id)===Number(sourceLine.shoppingItemId))||null;
    // Legacy PB2 beholder gamle sikre fallbacker. PB2 v2 trenger dem ikke når kompakt linje-ID finnes.
    if(!isCompact&&!current&&ean){
      current=uniqueShoppingMatch(shopping,item=>!item.checked&&String(item.ean||'')===ean);
      if(!sourceLine)sourceLine=uniqueShoppingMatch(sourceItems,item=>String(item.ean||'')===ean);
    }
    if(!current&&!sourceLine&&name){
      const normName=name.toLocaleLowerCase('nb-NO').trim();
      const normUnit=unit.toLocaleLowerCase('nb-NO').trim();
      current=uniqueShoppingMatch(shopping,item=>!item.checked&&String(item.name||'').toLocaleLowerCase('nb-NO').trim()===normName&&(!normUnit||String(item.unit||'').toLocaleLowerCase('nb-NO').trim()===normUnit));
      sourceLine=uniqueShoppingMatch(sourceItems,item=>String(item.name||'').toLocaleLowerCase('nb-NO').trim()===normName&&(!normUnit||String(item.unit||'').toLocaleLowerCase('nb-NO').trim()===normUnit));
    }

    const expected=pb2Number(sourceLine?.expectedPrice)??pb2Number(current?.expectedPrice)??pb2Number(current?.price)??(!isCompact?pb2Number(line?.ep):null);
    const actual=isCompact?pb2Number(line?.p):pb2Number(line?.ap);
    const quantity=pb2Number(line?.q)??pb2Number(sourceLine?.qty)??pb2Number(current?.quantity)??1;
    const base=current||{};
    const record={
      ...base,
      name:name||sourceLine?.name||base.name||'Ukjent vare',
      quantity:quantity>0?quantity:1,
      unit:unit||sourceLine?.unit||base.unit||'stk',
      category:String((isCompact?line?.c:line?.c)||sourceLine?.category||base.category||'Mat'),
      store:String((isCompact?line?.s:line?.s)||sourceLine?.store||base.store||''),
      ean:ean||String(sourceLine?.ean||base.ean||''),
      mobileItemUid:lineUid||String(sourceLine?.uid||base.mobileItemUid||mobileTransferShortId('i')),
      mobileListUid:sourceListUid||String(base.mobileListUid||''),
      mobileTripUid:tripUid,
      expectedPrice:expected,
      actualPrice:actual,
      actualPriceKnown:actual!==null,
      price:actual!==null?actual:(expected??0),
      checked:true,atHome:false,purchaseDate:completedDate,purchasedVia:'pb2-mobile',
      pb2ImportedAt:new Date().toISOString(),updatedAtSystem:new Date().toISOString()
    };
    if(current?.id){record.id=current.id;await BudgetDB.put('shoppingItems',record);importedIds.push(Number(current.id));}
    else{record.source=record.source||'pb2-mobile';record.createdAt=record.createdAt||new Date().toISOString();const id=await BudgetDB.add('shoppingItems',record);record.id=id;shopping.push(record);importedIds.push(Number(id));}
    imported.push(record);
  }

  const expenses=await BudgetDB.getAll('expenses');
  for(const expense of expenses)if(expense.source==='shopping-list'&&importedIds.includes(Number(expense.shoppingItemId)))await BudgetDB.remove('expenses',expense.id);

  const actualTotal=isCompact?pb2Number(payload?.t):(pb2Number(payload?.at)??pb2Number(previous?.actualTotal));
  const expectedTotal=pb2Number(source?.expectedTotal)??(!isCompact?pb2Number(payload?.et):null)??pb2Number(previous?.expectedTotal);
  const tripExpense=expenses.find(x=>x.source==='shopping-trip'&&String(x.shoppingTripUid||'')===tripUid)||null;
  if(actualTotal!==null&&actualTotal>0){
    const expenseRecord={
      ...(tripExpense||{}),description:`Handletur: ${String(source?.label||'Dagligvarer')}`,
      amount:actualTotal,dueDate:completedDate,category:'Mat',frequency:'Engangs',status:'Betalt',automatic:false,type:'Engangs',
      note:`Importert fra mobil${expectedTotal!==null?` · forventet ${expectedTotal.toFixed(2)} kr`:''}`,
      shoppingTripUid:tripUid,sourceListUid:sourceListUid||'',source:'shopping-trip',updatedAtSystem:new Date().toISOString()
    };
    tripExpense?.id?await BudgetDB.put('expenses',expenseRecord):await BudgetDB.add('expenses',expenseRecord);
  }

  const tripRecord={
    ...(previous||{}),type:'pb2-return',tripUid,sourceListUid:sourceListUid||'',label:String(source?.label||'Handletur'),
    currency:'NOK',expectedTotal,actualTotal,items:lines,importedItemCount:imported.length,
    importedAt:previous?.importedAt||new Date().toISOString(),lastImportedAt:new Date().toISOString(),updatedAtSystem:new Date().toISOString()
  };
  previous?.id?await BudgetDB.put('shoppingTrips',tripRecord):await BudgetDB.add('shoppingTrips',tripRecord);

  await Backend.automaticBackup();
  await Backend.loadSnapshot(activePeriod);
  renderPage();
  return {imported:imported.length,alreadyImported:Boolean(previous),actualTotal,expectedTotal,sourceMatched:Boolean(source)};
}

async function openShoppingMobileTransfer(initialView='send'){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="modal large-modal shopping-mobile-transfer-modal" role="dialog" aria-modal="true">
    <header class="modal-header">
      <div><div class="eyebrow">Handleliste-app</div><h2>Mobiloverføring</h2></div>
      <button class="icon-btn ghost shopping-mobile-transfer-close" type="button">×</button>
    </header>
    <div class="modal-body">
      <div class="page-view-tabs tabs-inline mobile-transfer-tabs" role="tablist" aria-label="Mobiloverføring">
        <button class="mobile-transfer-tab ${initialView==='receive'?'':'active'}" data-view="send" role="tab">Send til mobil</button>
        <button class="mobile-transfer-tab ${initialView==='receive'?'active':''}" data-view="receive" role="tab">Motta fra mobil</button>
        <button class="mobile-transfer-tab" data-view="scan" role="tab">Skann vare</button>
      </div>
      <div id="mobileTransferContent"></div>
    </div>
    <footer class="modal-footer"><button class="btn secondary shopping-mobile-transfer-close" type="button">Lukk</button></footer>
  </section>`;
  document.body.appendChild(wrap);
  const holder=wrap.querySelector('#mobileTransferContent');
  let closed=false,currentView=initialView==='receive'?'receive':'send',unsubscribeTransfer=null;
  let pendingSentItems=[];

  const clearSentActiveItems=async()=>{
    if(!pendingSentItems.length)return 0;
    let removed=0;
    for(const sent of pendingSentItems){
      const current=await BudgetDB.get('shoppingItems',sent.shoppingItemId);
      if(!current||current.checked||current.atHome)continue;
      if(String(current.mobileItemUid||'')!==String(sent.mobileItemUid||''))continue;
      if(String(current.mobileListUid||'')!==String(sent.mobileListUid||''))continue;
      await BudgetDB.remove('shoppingItems',current.id);
      removed++;
    }
    pendingSentItems=[];
    if(removed){
      await currentShoppingListUid({renew:true});
      await Backend.automaticBackup();
      await Backend.loadSnapshot(activePeriod);
      renderPage();
    }
    return removed;
  };

  const stopTransfer=async()=>{try{await window.budgetApp.stopMobileTransfer();}catch(_){} };
  const close=()=>{if(closed)return;closed=true;unsubscribeTransfer?.();unsubscribeTransfer=null;void stopTransfer();document.removeEventListener('keydown',onKey);wrap.remove();};
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
  wrap.querySelectorAll('.shopping-mobile-transfer-close').forEach(btn=>btn.addEventListener('click',close));
  document.addEventListener('keydown',onKey);

  const setActiveTab=view=>wrap.querySelectorAll('.mobile-transfer-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
  const formatExpiry=timestamp=>new Date(timestamp).toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'});

  const showTripPreview=async payload=>{
    const compact=Number(payload?.v)===2;
    const sourceListUid=String(compact?payload?.id:payload?.sid||'').trim();
    const trips=await BudgetDB.getAll('shoppingTrips');
    const source=sourceListUid?trips.find(x=>x.type==='pb1-source'&&String(x.sourceListUid||'')===sourceListUid):null;
    const actual=compact?pb2Number(payload?.t):pb2Number(payload?.at);
    const expected=pb2Number(source?.expectedTotal)??(!compact?pb2Number(payload?.et):null);
    const items=Array.isArray(payload?.i)?payload.i:[];
    holder.innerHTML=`<div class="mobile-transfer-preview">
      <div class="mobile-transfer-preview-head"><div><h3>${escapeHtml(source?.label||payload?.l||'Fullført handletur')}</h3><p class="muted">${items.length} kjøpte varer</p></div><span class="badge success">PB2 v${Number(payload?.v)||1}</span></div>
      <div class="shopping-mobile-export-summary"><div><span>Forventet</span><strong>${expected!==null?UI.money(expected):'—'}</strong></div><div><span>Faktisk</span><strong>${actual!==null?UI.money(actual):'Ikke registrert'}</strong></div></div>
      <div class="mobile-transfer-preview-note">${source?'Koblet til den opprinnelige desktop-handlelisten.':'Fant ikke lokal kildeliste. Bare entydig varematching kan importeres.'}</div>
      <div class="mobile-transfer-preview-actions"><button class="btn secondary" id="receiveAnotherTrip" type="button">Motta på nytt</button><button class="btn primary" id="importPb2Btn" type="button">Importer handletur</button></div>
      <p class="negative" id="pb2ImportError"></p>
    </div>`;
    holder.querySelector('#receiveAnotherTrip').addEventListener('click',()=>void renderReceive());
    holder.querySelector('#importPb2Btn').addEventListener('click',async()=>{
      const btn=holder.querySelector('#importPb2Btn');btn.disabled=true;
      try{
        const result=await importShoppingTripPb2(payload);
        if(closed)return;
        holder.innerHTML=`<div class="mobile-transfer-import-success"><div class="mobile-transfer-success-mark">✓</div><h3>${result.alreadyImported?'Handleturen er oppdatert':'Handleturen er importert'}</h3><p>${result.imported} kjøpte varer er registrert i Kjøpt.</p><p>${result.actualTotal!==null?`Faktisk totalsum ${UI.money(result.actualTotal)} er bokført som én Mat-utgift.`:'Faktisk totalsum mangler, så ingen regnskapsutgift er opprettet.'}</p><button class="btn primary" id="pb2DoneBtn" type="button">Ferdig</button></div>`;
        holder.querySelector('#pb2DoneBtn').addEventListener('click',close);
      }catch(error){
        const target=holder.querySelector('#pb2ImportError');if(target)target.textContent=error.message||'Kunne ikke importere handleturen.';btn.disabled=false;
      }
    });
  };

  const renderSend=async()=>{
    await stopTransfer();currentView='send';setActiveTab('send');
    const prepared=await activeShoppingForMobile();
    pendingSentItems=prepared.items.map(item=>({shoppingItemId:Number(item.shoppingItemId),mobileItemUid:String(item.id||''),mobileListUid:String(prepared.listUid||'')}));
    if(!prepared.items.length){holder.innerHTML='<div class="empty-state">Handlelisten er tom.</div>';return;}
    holder.innerHTML=`<div class="shopping-mobile-export-layout">
      <div class="shopping-mobile-export-qr" id="shoppingMobileExportQr"><span class="muted">Starter lokal overføring …</span></div>
      <div class="shopping-mobile-export-copy"><h3>Send handlelisten direkte</h3><p>PC og telefon må være koblet til samme Wi-Fi/LAN. Åpne <strong>Handleliste</strong> på telefonen, velg <strong>Motta fra PC</strong> og skann QR-koden.</p>
      <div class="shopping-mobile-export-summary"><div><span>Varer</span><strong>${prepared.items.length}</strong></div><div><span>Estimert total</span><strong>${UI.money(total(prepared.items,item=>item.price||0))}</strong></div></div>
      <div class="mobile-transfer-local-status" id="mobileTransferSendStatus">Klargjør lokal forbindelse …</div>
      <p class="muted">QR-koden inneholder bare lokal adresse og en engangsnøkkel. Selve handlelisten overføres direkte fra Personlig Budsjett til telefonen.</p><p class="negative" id="shoppingMobileExportError"></p></div></div>`;
    try{
      const data=await shoppingPb1Data();
      const session=await window.budgetApp.startMobileTransferSend(data);
      if(closed||currentView!=='send')return;
      holder.querySelector('#shoppingMobileExportQr').innerHTML=await window.budgetApp.generateQr(session.url);
      holder.querySelector('#mobileTransferSendStatus').textContent=`Klar på ${session.address}. QR-koden utløper kl. ${formatExpiry(session.expiresAt)}.`;
    }catch(error){
      const target=holder.querySelector('#shoppingMobileExportError');if(target)target.textContent=error.message||'Kunne ikke starte lokal overføring.';
    }
  };

  const renderReceive=async()=>{
    await stopTransfer();currentView='receive';setActiveTab('receive');
    holder.innerHTML=`<div class="shopping-mobile-export-layout">
      <div class="shopping-mobile-export-qr" id="shoppingMobileReceiveQr"><span class="muted">Starter lokal mottaker …</span></div>
      <div class="shopping-mobile-export-copy"><h3>Motta fullført handletur</h3><p>PC og telefon må være på samme Wi-Fi/LAN. Åpne den fullførte handleturen på telefonen, velg <strong>Send til PC</strong> og skann QR-koden.</p>
      <div class="mobile-transfer-local-status" id="mobileTransferReceiveStatus">Klargjør lokal forbindelse …</div>
      <p class="muted">Telefonen sender handleturen direkte til Personlig Budsjett. Ingen ekstern server, skytjeneste eller filoverføring brukes.</p><p class="negative" id="pb2ReceiveError"></p></div></div>`;
    try{
      const session=await window.budgetApp.startMobileTransferReceive();
      if(closed||currentView!=='receive')return;
      holder.querySelector('#shoppingMobileReceiveQr').innerHTML=await window.budgetApp.generateQr(session.url);
      holder.querySelector('#mobileTransferReceiveStatus').textContent=`Venter på telefonen via ${session.address}. QR-koden utløper kl. ${formatExpiry(session.expiresAt)}.`;
    }catch(error){
      const target=holder.querySelector('#pb2ReceiveError');if(target)target.textContent=error.message||'Kunne ikke starte lokal mottaker.';
    }
  };

  unsubscribeTransfer=window.budgetApp.onMobileTransferStatus(async event=>{
    if(closed||!event)return;
    if(event.type==='sent'&&currentView==='send'){
      const removed=await clearSentActiveItems();
      const target=holder.querySelector('#mobileTransferSendStatus');
      if(target){target.classList.add('success');target.textContent=removed?`✓ Handlelisten er hentet av telefonen. ${removed} varer er fjernet fra Aktiv.`:'✓ Handlelisten er hentet av telefonen.';}
    }else if(event.type==='received'&&currentView==='receive'&&event.payload){
      await stopTransfer();
      if(!closed&&currentView==='receive')await showTripPreview(event.payload);
    }else if(event.type==='expired'){
      const target=holder.querySelector(currentView==='send'?'#shoppingMobileExportError':'#pb2ReceiveError');
      if(target)target.textContent='Mobiloverføringen utløp. Åpne fanen på nytt for å lage en ny QR-kode.';
    }
  });

  wrap.querySelectorAll('.mobile-transfer-tab').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.view==='scan'){close();setTimeout(()=>openBarcodeScanner('shopping'),0);return;}
    btn.dataset.view==='receive'?void renderReceive():void renderSend();
  }));
  if(currentView==='receive')await renderReceive();else await renderSend();
}

async function renderMobileAppInstallQr(){
  const qr=document.getElementById('mobileAppInstallQr');
  if(!qr)return;
  const url=mobileAppApkUrl();
  if(!mobileAppUrlConfigured()){
    qr.innerHTML='<div class="mobile-app-qr-placeholder">QR aktiveres når GitHub-adressen er satt.</div>';
    return;
  }
  try{
    qr.innerHTML=await window.budgetApp.generateQr(url);
  }catch(error){
    qr.innerHTML=`<div class="mobile-app-qr-placeholder negative">${escapeHtml(error.message||'Kunne ikke lage QR-kode.')}</div>`;
  }
}




function openReleaseInfoModal(){
  if(!desktopUpdateState.latestVersion){
    showToast('Ingen release-info tilgjengelig ennå');
    return;
  }
  const notes=releaseNoteItems(desktopUpdateState.releaseNotes).map(note=>`<li>${escapeHtml(note)}</li>`).join('');
  actionModal(`Release v${desktopUpdateState.latestVersion}`,
    `<div class="release-info-modal" style="grid-column:1/-1">
      <div class="release-info-summary"><strong>${escapeHtml(desktopUpdateState.releaseName||`Personlig Budsjett v${desktopUpdateState.latestVersion}`)}</strong></div>
      <h4>Hva er nytt</h4>
      <ul>${notes}</ul>
      <div class="update-progress-panel" id="updateProgressPanel" hidden>
        <div class="update-progress-copy"><strong id="updateProgressTitle">Forbereder oppdatering …</strong><span id="updateProgressPercent"></span></div>
        <div class="update-progress-track" aria-hidden="true"><span id="updateProgressBar"></span></div>
        <p class="muted" id="updateProgressDetail">Tar sikkerhetskopi før nedlasting.</p>
      </div>
    </div>`,
    null,
    'Lukk'
  );
  const modal=document.querySelector('.modal-backdrop:last-of-type');
  const form=modal?.querySelector('form');
  const submit=modal?.querySelector('button[type="submit"]');
  const cancel=modal?.querySelector('.action-cancel');
  if(cancel)cancel.style.display='none';
  const footer=submit?.parentElement;
  let updateBtn=null;

  const paintProgress=state=>{
    if(!modal?.isConnected)return;
    const panel=modal.querySelector('#updateProgressPanel');
    const title=modal.querySelector('#updateProgressTitle');
    const percent=modal.querySelector('#updateProgressPercent');
    const bar=modal.querySelector('#updateProgressBar');
    const detail=modal.querySelector('#updateProgressDetail');
    if(!panel||!title||!percent||!bar||!detail)return;

    const active=['backup','downloading','ready','installing','error'].includes(state.status);
    panel.hidden=!active;
    if(!active)return;

    if(state.status==='backup'){
      title.textContent='Tar sikkerhetskopi …';
      percent.textContent='';
      bar.style.width='0%';
      detail.textContent='Oppdateringen starter først når lokal backup er ferdig.';
    }else if(state.status==='downloading'){
      const pct=Math.max(0,Math.min(100,Math.round(Number(state.downloadPercent||0))));
      title.textContent='Laster ned oppdatering';
      percent.textContent=`${pct} %`;
      bar.style.width=`${pct}%`;
      detail.textContent='Du kan la dette vinduet stå åpent mens oppdateringen lastes ned.';
    }else if(state.status==='ready'){
      title.textContent='Oppdatering klar';
      percent.textContent='100 %';
      bar.style.width='100%';
      detail.textContent='Installerer og starter appen på nytt …';
    }else if(state.status==='installing'){
      title.textContent='Starter appen på nytt …';
      percent.textContent='';
      bar.style.width='100%';
      detail.textContent='Oppdateringen installeres nå.';
    }else if(state.status==='error'){
      title.textContent='Oppdateringen kunne ikke fullføres';
      percent.textContent='';
      detail.textContent=state.error||'Ukjent feil.';
    }
  };

  if(footer&&submit&&desktopUpdateState.updateAvailable){
    updateBtn=document.createElement('button');
    updateBtn.className='btn release-update-btn';
    updateBtn.id='releaseModalUpdateBtn';
    updateBtn.type='button';
    updateBtn.textContent='Oppdater';
    footer.insertBefore(updateBtn,submit);

    updateBtn.addEventListener('click',async()=>{
      updateBtn.disabled=true;
      if(submit)submit.disabled=true;
      try{
        applyDesktopUpdateState({status:'backup'});
        paintProgress(desktopUpdateState);
        await Backend.createUpdateBackup();
        applyDesktopUpdateState({status:'downloading',downloadPercent:0});
        paintProgress(desktopUpdateState);
        await window.budgetApp.downloadUpdate();
      }catch(error){
        applyDesktopUpdateState({status:'error',error:error.message||'Kunne ikke starte oppdateringen'});
        paintProgress(desktopUpdateState);
        updateBtn.disabled=false;
        if(submit)submit.disabled=false;
      }
    });
  }

  const stopUpdateStatus=window.budgetApp.onUpdateStatus?.(state=>{
    applyDesktopUpdateState(state||{});
    paintProgress(desktopUpdateState);
    if(desktopUpdateState.status==='ready'){
      if(updateBtn)updateBtn.disabled=true;
      if(submit)submit.disabled=true;
      setTimeout(async()=>{
        try{
          applyDesktopUpdateState({status:'installing'});
          paintProgress(desktopUpdateState);
          await window.budgetApp.installUpdate();
        }catch(error){
          applyDesktopUpdateState({status:'error',error:error.message||'Kunne ikke installere oppdateringen'});
          paintProgress(desktopUpdateState);
          if(submit)submit.disabled=false;
        }
      },900);
    }
  });

  paintProgress(desktopUpdateState);

  if(form&&submit){
    form.addEventListener('submit',event=>{
      event.preventDefault();
      stopUpdateStatus?.();
      modal.remove();
    },{once:true});
  }
}

function wirePageActions(){
  document.querySelectorAll('.ingredient-api-tab').forEach(btn=>btn.addEventListener('click',()=>{
    ingredientApiView=btn.dataset.view||'products';
    renderPage();
    if(ingredientApiView!=='products'){
      requestAnimationFrame(()=>{
        wirePriceChangeActions();
        if(priceChangeState.loaded)renderPriceChangeContent();
        else loadPriceChanges(false);
      });
    }
  }));
  if(ingredientApiView!=='products'){
    wirePriceChangeActions();
    loadPriceChanges(false);
  }

  const recipeImport=document.getElementById('importRecipeUrlBtn');if(recipeImport)recipeImport.addEventListener('click',openRecipeUrlImport);
  document.getElementById('recipeCategoryFilter')?.addEventListener('change',event=>{recipeCategoryFilter=event.target.value||'';renderPage();});
  document.getElementById('recipeFavoriteFilter')?.addEventListener('change',event=>{recipeFavoriteFilter=event.target.value||'all';renderPage();});
  document.getElementById('recipeSort')?.addEventListener('change',event=>{recipeSort=event.target.value||'recent';renderPage();});
  content.querySelectorAll('.recipe-card-favorite-toggle').forEach(btn=>btn.addEventListener('click',async event=>{event.stopPropagation();const id=Number(btn.dataset.id);const recipe=await BudgetDB.get('recipes',id);if(!recipe)return;await BudgetDB.put('recipes',{...recipe,favorite:!recipe.favorite,updatedAtSystem:new Date().toISOString()});await Backend.automaticBackup();await Backend.loadSnapshot(activePeriod);renderPage();showToast(recipe.favorite?'Fjernet fra favoritter':'Lagt til som favoritt');}));
  content.querySelectorAll('.recipe-open').forEach(btn=>btn.addEventListener('click',()=>CRUD.open('recipes',btn.dataset.id)));
  content.querySelectorAll('.recipe-add-plan').forEach(btn=>btn.addEventListener('click',()=>{const recipe=(AppState.recipes||[]).find(item=>Number(item.id)===Number(btn.dataset.id));if(!recipe)return;const allowed=['Frokost','Lunsj','Middag','Kveldsmat','Mellommåltid'];const pricing=PricingEngine.recipeCost(recipe.ingredients||[],Math.max(1,num(recipe.servings)||1));CRUD.open('mealplan',null,{name:recipe.name,date:new Date().toISOString().slice(0,10),mealType:allowed.includes(recipe.category)?recipe.category:'Middag',persons:Math.max(1,num(recipe.servings)||2),estimatedCost:pricing.total||num(recipe.price)});}));
  content.querySelectorAll('.recipe-card-image').forEach(img=>img.addEventListener('error',()=>{const host=img.closest('.recipe-card-media');if(host){img.remove();host.insertAdjacentHTML('afterbegin','<div class="recipe-card-image-placeholder" aria-hidden="true"><span>🍽️</span><small>Bilde ikke tilgjengelig</small></div>');}}));
  const apiGo=document.getElementById('goToApiSettingsBtn');if(apiGo)apiGo.addEventListener('click',()=>navigateTo('settings','data'));
  const browserForm=document.getElementById('kassalBrowserForm');if(browserForm){const searchInput=document.getElementById('kassalProductSearch'),sortSelect=document.getElementById('kassalSort');browserForm.addEventListener('submit',e=>{e.preventDefault();kassalBrowser.buffers.clear();kassalBrowser.params=buildProductParams(1);runKassalBrowserSearch(1);});if(searchInput){searchInput.disabled=false;searchInput.readOnly=false;searchInput.addEventListener('input',e=>{e.stopPropagation();});}sortSelect?.addEventListener('change',()=>{kassalBrowser.buffers.clear();kassalBrowser.params=buildProductParams(1);runKassalBrowserSearch(1);});loadKassalTaxonomy().then(()=>runKassalBrowserSearch(1)).catch(e=>{const status=document.getElementById('kassalResultStatus');if(status)status.textContent=e.message;});}
  wireSearch();
  const inline=document.getElementById('inlineThemeBtn'); if(inline) inline.addEventListener('click',toggleTheme);
  const loanSimulator=document.getElementById('loanSimulatorBtn'); if(loanSimulator) loanSimulator.addEventListener('click',openLoanSimulator);
  const scanPantry=document.getElementById('scanPantryBtn');if(scanPantry)scanPantry.addEventListener('click',()=>openBarcodeScanner('pantry'));
  const sendShoppingMobile=document.getElementById('sendShoppingToMobileBtn');if(sendShoppingMobile)sendShoppingMobile.addEventListener('click',()=>void openShoppingMobileTransfer());
  const pantryWeeks=document.getElementById('pantryAnalysisWeeks'); if(pantryWeeks) pantryWeeks.addEventListener('change',async()=>{await Backend.setSetting('pantryAnalysisWeeks',num(pantryWeeks.value));await Backend.loadSnapshot(activePeriod);renderPage();});
  document.querySelectorAll('.mealplan-view-btn').forEach(btn=>btn.addEventListener('click',()=>{mealPlanExitEditMode();mealPlanView=btn.dataset.view==='month'?'month':'week';if(mealPlanView==='month')mealPlanMonth=String(mealPlanWeekStart||mealPlanAnchorDate()).slice(0,7);renderPage();}));
  const shiftMealPlanMonth=delta=>{mealPlanSelectedIds.clear();const [year,month]=mealPlanMonthKey().split('-').map(Number);const next=new Date(year,month-1+delta,1,12);mealPlanMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;renderPage();};
  document.getElementById('mealplanPrevMonth')?.addEventListener('click',()=>shiftMealPlanMonth(-1));
  document.getElementById('mealplanNextMonth')?.addEventListener('click',()=>shiftMealPlanMonth(1));
  document.getElementById('mealplanCurrentMonth')?.addEventListener('click',()=>{mealPlanSelectedIds.clear();const now=new Date();mealPlanMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;renderPage();});
  document.querySelectorAll('.mealplan-open-week').forEach(btn=>btn.addEventListener('click',()=>{mealPlanExitEditMode();mealPlanWeekStart=MealPlanningEngine.isoDate(MealPlanningEngine.startOfWeek(btn.dataset.date));mealPlanMonth=String(btn.dataset.date).slice(0,7);mealPlanView='week';renderPage();}));
  const copyWeek=document.getElementById('copyPreviousWeekBtn'); if(copyWeek) copyWeek.addEventListener('click',async()=>{copyWeek.disabled=true;try{const result=await Backend.copyPreviousWeekTo(mealPlanWeekStart); if(!result.copied){showToast('Ingen nye måltider å kopiere fra forrige uke');return;} await Backend.loadSnapshot(activePeriod); renderPage(); showToast(`${result.copied} måltider kopiert`);}finally{copyWeek.disabled=false;}});
  const copyMonth=document.getElementById('copyPreviousMonthBtn'); if(copyMonth) copyMonth.addEventListener('click',async()=>{copyMonth.disabled=true;try{const result=await Backend.copyPreviousMonthTo(mealPlanMonthKey()); if(!result.copied){showToast('Ingen nye måltider å kopiere fra forrige måned');return;} await Backend.loadSnapshot(activePeriod); renderPage(); showToast(`${result.copied} måltider kopiert fra forrige måned`);}finally{copyMonth.disabled=false;}});
  const shiftMealPlanWeek=days=>{mealPlanSelectedIds.clear();mealPlanWeekStart=MealPlanningEngine.isoDate(MealPlanningEngine.addDays(mealPlanWeekStart,days));renderPage();};
  document.getElementById('mealplanPrevWeek')?.addEventListener('click',()=>shiftMealPlanWeek(-7));
  document.getElementById('mealplanNextWeek')?.addEventListener('click',()=>shiftMealPlanWeek(7));
  document.getElementById('mealplanCurrentWeek')?.addEventListener('click',()=>{mealPlanSelectedIds.clear();mealPlanWeekStart=MealPlanningEngine.isoDate(MealPlanningEngine.startOfWeek(new Date()));renderPage();});
  document.getElementById('mealplanEditModeBtn')?.addEventListener('click',()=>{mealPlanEditMode=true;mealPlanSelectedIds.clear();renderPage();});
  document.getElementById('mealplanEditDoneBtn')?.addEventListener('click',()=>{mealPlanExitEditMode();renderPage();});
  document.querySelectorAll('.mealplan-add').forEach(btn=>btn.addEventListener('click',()=>CRUD.open('mealplan',null,{date:btn.dataset.date,persons:2})));
  document.querySelectorAll('.mealplan-edit').forEach(btn=>btn.addEventListener('click',()=>{
    if(!mealPlanEditMode){CRUD.open('mealplan',btn.dataset.id);return;}
    const id=Number(btn.dataset.id);
    if(mealPlanSelectedIds.has(id))mealPlanSelectedIds.delete(id);else mealPlanSelectedIds.add(id);
    renderPage();
  }));
  const deleteMealPlans=async(ids,label)=>{
    const unique=[...new Set((ids||[]).map(Number).filter(Number.isFinite))];
    if(!unique.length)return;
    const accepted=await AppConfirm({title:label,message:`Vil du slette ${countText(unique.length,'måltid')}?`,confirmLabel:'Slett',help:'Denne handlingen kan ikke angres.'});
    if(!accepted)return;
    const result=await Backend.deleteMealPlans(unique);
    mealPlanSelectedIds.clear();
    await Backend.loadSnapshot(activePeriod);
    renderPage();
    showToast(`${result.deleted} måltider slettet`);
  };
  document.getElementById('mealplanDeleteSelectedBtn')?.addEventListener('click',()=>deleteMealPlans([...mealPlanSelectedIds],'Slett valgte måltider'));
  document.querySelectorAll('.mealplan-clear-day').forEach(btn=>btn.addEventListener('click',()=>{
    const ids=(AppState.allMealPlans||AppState.mealPlans||[]).filter(plan=>plan.date===btn.dataset.date).map(plan=>plan.id);
    deleteMealPlans(ids,`Tøm ${new Date(`${btn.dataset.date}T12:00:00`).toLocaleDateString('nb-NO',{weekday:'long',day:'numeric',month:'long'})}`);
  }));
  document.getElementById('mealplanClearScopeBtn')?.addEventListener('click',()=>{
    const plans=mealPlanScopePlans(AppState.allMealPlans||AppState.mealPlans||[]);
    deleteMealPlans(plans.map(plan=>plan.id),mealPlanView==='month'?'Tøm måned':'Tøm uke');
  });
  const updateShopping=document.getElementById('updateShoppingFromMealPlanBtn');if(updateShopping)updateShopping.addEventListener('click',async()=>{updateShopping.disabled=true;try{const allPlans=AppState.allMealPlans||AppState.mealPlans||[];const isMonth=mealPlanView==='month';const plans=isMonth?allPlans.filter(plan=>String(plan.date||'').startsWith(`${mealPlanMonthKey()}-`)):MealPlanningEngine.plansForWeek(allPlans,mealPlanWeekStart);const added=await rebuildShoppingFromMealPlan(plans);renderPage();if(isMonth)showToast(added?`${added} varer generert fra ${new Date(`${mealPlanMonthKey()}-01T12:00:00`).toLocaleDateString('nb-NO',{month:'long',year:'numeric'})}`:'Ingen varer mangler fra denne måneden');else showToast(added?`${added} varer generert fra uke ${mealPlanIsoWeek(mealPlanWeekStart)}`:'Ingen varer mangler fra denne uken');}catch(error){showToast(error.message||'Kunne ikke oppdatere handlelisten');}finally{updateShopping.disabled=false;}});
  document.querySelectorAll('.shopping-view-tab').forEach(btn=>btn.addEventListener('click',()=>{shoppingView=btn.dataset.view==='purchased'?'purchased':'active';renderPage();}));
  document.querySelectorAll('.pantry-view-tab').forEach(btn=>btn.addEventListener('click',()=>{pantryView=btn.dataset.view==='analysis'?'analysis':'stock';renderPage();}));
  const shoppingHistoryModeSelect=document.getElementById('shoppingHistoryModeSelect');if(shoppingHistoryModeSelect)shoppingHistoryModeSelect.addEventListener('change',()=>{shoppingHistoryMode=shoppingHistoryModeSelect.value||'all';shoppingHistoryValue='';renderPage();});
  const shoppingHistoryInput=document.getElementById('shoppingHistoryValue');if(shoppingHistoryInput)shoppingHistoryInput.addEventListener('change',()=>{shoppingHistoryValue=shoppingHistoryInput.value;renderPage();});
  const shoppingHistorySortSelect=document.getElementById('shoppingHistorySort');if(shoppingHistorySortSelect)shoppingHistorySortSelect.addEventListener('change',()=>{shoppingHistorySort=shoppingHistorySortSelect.value||'date_desc';renderPage();});
  document.querySelectorAll('.shopping-state-toggle').forEach(toggle=>toggle.addEventListener('change',async()=>{if(toggle.dataset.field!=='checked')return;toggle.disabled=true;try{await CRUD.updateShoppingState(toggle.dataset.id,{checked:toggle.checked,atHome:false});showToast(toggle.checked?'Vare flyttet til Kjøpt':'Vare åpnet igjen');}catch(error){toggle.checked=!toggle.checked;toggle.disabled=false;showToast(error.message||'Kunne ikke oppdatere varen');}}));
  document.querySelectorAll('.shopping-reopen').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await CRUD.updateShoppingState(btn.dataset.id,{checked:false,atHome:false});showToast('Vare flyttet tilbake til Aktiv');}catch(error){btn.disabled=false;showToast(error.message||'Kunne ikke åpne varen igjen');}}));
  const reportBtn=document.getElementById('exportReportBtn'); if(reportBtn) reportBtn.addEventListener('click',async()=>{const result=await Backend.exportReport(activePeriod,AppState); if(!result?.canceled)showToast('Rapport eksportert');});
  const assumptionsBtn=document.getElementById('forecastAssumptionsBtn'); if(assumptionsBtn) assumptionsBtn.addEventListener('click',openForecastAssumptions);
  const autoBackup=document.getElementById('autoBackupToggle'); if(autoBackup) autoBackup.addEventListener('click',async()=>{const next=AppState.settings?.autoBackup===false; await Backend.setSetting('autoBackup',next); await Backend.loadSnapshot(activePeriod); renderPage(); showToast(next?'Automatisk backup aktivert':'Automatisk backup deaktivert');});
  const compactToggle=document.getElementById('compactTablesToggle'); if(compactToggle) compactToggle.addEventListener('click',()=>toggleSetting('compactTables','compact-tables'));
  const motionToggle=document.getElementById('reducedMotionToggle'); if(motionToggle) motionToggle.addEventListener('click',()=>toggleSetting('reducedMotion','reduced-motion'));


  const updateTipState=async(id,status)=>{const states={...(AppState.settings?.savingsTipStates||{}),[id]:status};await Backend.setSetting('savingsTipStates',states);await Backend.loadSnapshot(activePeriod);renderPage();};
  content.querySelectorAll('.tip-hide').forEach(btn=>btn.addEventListener('click',()=>updateTipState(btn.dataset.tip,'hidden')));
  content.querySelectorAll('.tip-later').forEach(btn=>btn.addEventListener('click',()=>updateTipState(btn.dataset.tip,'later')));
  content.querySelectorAll('.tip-complete').forEach(btn=>btn.addEventListener('click',()=>updateTipState(btn.dataset.tip,'completed')));
  content.querySelectorAll('.tip-activate').forEach(btn=>btn.addEventListener('click',()=>updateTipState(btn.dataset.tip,'active')));
  content.querySelectorAll('.saving-filter').forEach(btn=>btn.addEventListener('click',()=>{savingsTipFilter=btn.dataset.filter;renderPage();}));
  content.querySelectorAll('.tip-action').forEach(btn=>btn.addEventListener('click',()=>navigateTipAction(btn.dataset.action)));
  content.querySelectorAll('.expense-breakdown-row').forEach(btn=>btn.addEventListener('click',()=>{expenseCategoryFilter=btn.dataset.expenseCategory||'';navigateTo('economy','expenses');}));
  content.querySelectorAll('.budget-category-link').forEach(btn=>btn.addEventListener('click',()=>{expenseCategoryFilter=btn.dataset.expenseCategory||'';navigateTo('economy','expenses');}));
  const clearExpenseFilter=document.getElementById('clearExpenseCategoryFilter');if(clearExpenseFilter)clearExpenseFilter.addEventListener('click',()=>{expenseCategoryFilter='';renderPage();});
  const resetTips=document.getElementById('resetSavingsTipsBtn'); if(resetTips) resetTips.addEventListener('click',async()=>{await Backend.setSetting('savingsTipStates',{});await Backend.loadSnapshot(activePeriod);renderPage();showToast('Alle tips vises igjen');});
  const tipSettings=document.getElementById('savingTipSettingsBtn'); if(tipSettings) tipSettings.addEventListener('click',()=>{const current=num(AppState.settings?.loanBenchmarkRate??4.8);actionModal('Analyseinnstillinger',`<label class="field"><span>Referanserente for lån (%)</span><input name="loanBenchmarkRate" type="number" step="0.05" min="0" value="${current}"></label><p class="muted" style="grid-column:1/-1">Brukes kun som lokal sammenligningsverdi. Appen henter ikke markedsrenter fra internett.</p>`,async data=>{await Backend.setSetting('loanBenchmarkRate',num(data.get('loanBenchmarkRate')));await Backend.loadSnapshot(activePeriod);renderPage();showToast('Analyseinnstillinger lagret');return true;});});
  const whatIfForm=document.getElementById('whatIfForm'); if(whatIfForm){const read=()=>Object.fromEntries([...whatIfForm.querySelectorAll('input')].map(i=>[i.name,num(i.value)])); const update=()=>{document.getElementById('whatIfResults').innerHTML=whatIfResultHtml(calculateWhatIf(read()));}; whatIfForm.querySelectorAll('input').forEach(i=>i.addEventListener('input',update)); document.getElementById('saveWhatIfBtn').addEventListener('click',async()=>{await Backend.setSetting('whatIfScenario',read());await Backend.loadSnapshot(activePeriod);showToast('Scenario lagret');});}
  const resetWhatIf=document.getElementById('resetWhatIfBtn'); if(resetWhatIf) resetWhatIf.addEventListener('click',async()=>{await Backend.setSetting('whatIfScenario',{rateChange:0,incomeChange:0,expenseChange:0,foodChange:0,extraDebt:0,extraSaving:0});await Backend.loadSnapshot(activePeriod);renderPage();showToast('Scenario nullstilt');});

  content.querySelectorAll('.chart-mode').forEach(btn=>btn.addEventListener('click',async()=>{chartMode=btn.dataset.mode;await Backend.setSetting('dashboardChartMode',chartMode);await Backend.loadSnapshot(activePeriod);renderPage();}));
  const comfortBtn=document.getElementById('comfortMarginBtn'); if(comfortBtn) comfortBtn.addEventListener('click',()=>{const current=num(AppState.settings?.comfortMarginPercent??15);actionModal('Komfortgrense',`<label class="field"><span>Ønsket spillerom av inntekt (%)</span><input name="comfort" type="number" min="0" max="90" step="1" value="${current}"></label><p class="muted" style="grid-column:1/-1">Komfortlinjen beregnes måned for måned som inntekt minus ønsket spillerom.</p>`,async data=>{await Backend.setSetting('comfortMarginPercent',Math.min(90,Math.max(0,num(data.get('comfort')))));await Backend.loadSnapshot(activePeriod);renderPage();showToast('Komfortgrense oppdatert');return true;});});

  const exportBtn=document.getElementById('exportDataBtn'); if(exportBtn) exportBtn.addEventListener('click',async()=>{ const r=await Backend.exportData(); if(!r?.canceled) showToast('Data eksportert'); });

  const saveKassal=document.getElementById('saveKassalConfig'); if(saveKassal) saveKassal.addEventListener('click',async()=>{try{const config={enabled:document.getElementById('kassalEnabled').checked,baseUrl:document.getElementById('kassalBaseUrl').value,token:document.getElementById('kassalToken').value};await window.budgetApp.kassal.saveConfig(config);const ui={...(AppState.settings?.kassalUi||{}),enabled:config.enabled,baseUrl:config.baseUrl,resultSize:num(document.getElementById('kassalResultSize').value)||20,useCache:document.getElementById('kassalUseCache').checked};const secure=await window.budgetApp.kassal.getConfig();await Backend.setSetting('kassalUi',{...ui,...secure});await Backend.loadSnapshot(activePeriod);renderPage();showToast('API-innstillinger lagret');}catch(e){showToast(e.message||'Kunne ikke lagre');}});
  const testKassal=document.getElementById('testKassalConfig'); if(testKassal) testKassal.addEventListener('click',async()=>{try{testKassal.disabled=true;const result=await window.budgetApp.kassal.test();const secure=await window.budgetApp.kassal.getConfig();await Backend.setSetting('kassalUi',{...(AppState.settings?.kassalUi||{}),...secure,lastTest:new Date(result.testedAt).toLocaleString('nb-NO'),lastError:''});await Backend.loadSnapshot(activePeriod);renderPage();showToast(`Tilkobling OK (${result.ms} ms)`);}catch(e){await Backend.setSetting('kassalUi',{...(AppState.settings?.kassalUi||{}),lastError:e.message});await Backend.loadSnapshot(activePeriod);renderPage();showToast(e.message);}});
  const clearKassal=document.getElementById('clearKassalToken'); if(clearKassal) clearKassal.addEventListener('click',async()=>{await window.budgetApp.kassal.clearToken();const secure=await window.budgetApp.kassal.getConfig();await Backend.setSetting('kassalUi',{...(AppState.settings?.kassalUi||{}),...secure});await Backend.loadSnapshot(activePeriod);renderPage();showToast('API-nøkkel fjernet');});


  applyDesktopUpdateState(desktopUpdateState);
  const releaseInfoBtn=document.getElementById('releaseInfoBtn');
  if(releaseInfoBtn)releaseInfoBtn.addEventListener('click',openReleaseInfoModal);

  const checkForUpdatesBtn=document.getElementById('checkForUpdatesBtn');
  if(checkForUpdatesBtn)checkForUpdatesBtn.addEventListener('click',async()=>{
    checkForUpdatesBtn.disabled=true;
    applyDesktopUpdateState({status:'checking'});
    try{
      const result=await window.budgetApp.checkForUpdates();
      applyDesktopUpdateState(result||{});
      if(result?.status==='development')showToast('Oppdateringssjekk testes i installert app');
      else if(result?.updateAvailable)showToast(`Ny versjon v${result.latestVersion} er tilgjengelig`);
      else if(result?.status==='current')showToast('Du har nyeste versjon');
      else if(result?.status==='error')showToast(result.error||'Kunne ikke se etter oppdatering');
    }catch(error){
      applyDesktopUpdateState({status:'error',error:error.message||'Kunne ikke se etter oppdatering'});
      showToast(error.message||'Kunne ikke se etter oppdatering');
    }finally{
      checkForUpdatesBtn.disabled=false;
    }
  });

  const openMobileDownload=document.getElementById('openMobileAppDownloadBtn');
  if(openMobileDownload) openMobileDownload.addEventListener('click',async()=>{
    try{await window.budgetApp.openExternal(mobileAppApkUrl());}
    catch(error){showToast(error.message||'Kunne ikke åpne nedlastingssiden');}
  });

  void renderMobileAppInstallQr();

  const importBtn=document.getElementById('importDataBtn'); if(importBtn) importBtn.addEventListener('click',async()=>{ if(await Backend.importData()){ await Backend.loadSnapshot(activePeriod); syncPeriodSelect(); renderPage(); showToast('Data importert'); } });
  const maintenanceSelect=document.getElementById('maintenanceModuleSelect');
  const maintenanceDescription=document.getElementById('maintenanceModuleDescription');
  const maintenanceDescriptionsNode=document.getElementById('maintenanceDescriptions');
  let maintenanceDescriptions={};
  try{maintenanceDescriptions=JSON.parse(maintenanceDescriptionsNode?.textContent||'{}');}catch(_){}
  if(maintenanceSelect&&maintenanceDescription){
    const syncMaintenanceDescription=()=>{maintenanceDescription.textContent=maintenanceDescriptions[maintenanceSelect.value]||'';};
    maintenanceSelect.addEventListener('change',syncMaintenanceDescription);
    syncMaintenanceDescription();
  }
  const clearSelectedModule=document.getElementById('clearSelectedModuleBtn');
  if(clearSelectedModule)clearSelectedModule.addEventListener('click',()=>{
    const store=maintenanceSelect?.value||'';
    const label=maintenanceSelect?.selectedOptions?.[0]?.textContent?.trim()||'Valgt område';
    if(!store)return;
    actionModal(`Tøm ${label}`,`<p style="grid-column:1/-1">Skriv <strong>SLETT</strong> for å bekrefte.</p><label class="field" style="grid-column:1/-1"><span>Bekreftelse</span><input name="confirm" autocomplete="off"></label>`,async data=>{
      if(String(data.get('confirm')||'').trim().toUpperCase()!=='SLETT'){showToast('Bekreftelsen stemmer ikke');return false;}
      await Backend.clearModule(store); await Backend.loadSnapshot(activePeriod); renderPage(); showToast(`${label} tømt`); return true;
    },'Slett');
  });
  const resetApp=document.getElementById('resetApplicationBtn'); if(resetApp) resetApp.addEventListener('click',()=>{
    actionModal('Nullstill hele appen',`<p class="negative" style="grid-column:1/-1"><strong>Alle data slettes. En sikkerhetskopi opprettes først.</strong></p><label class="field" style="grid-column:1/-1"><span>Skriv NULLSTILL</span><input name="confirm" autocomplete="off"></label>`,async data=>{
      if(String(data.get('confirm')||'').trim().toUpperCase()!=='NULLSTILL'){showToast('Bekreftelsen stemmer ikke');return false;}
      await Backend.resetApplication(); localStorage.removeItem('pb-theme'); location.reload(); return false;
    },'Nullstill');
  });
  const backupSelect=document.getElementById('backupSelect');
  const restoreSelectedBackupBtn=document.getElementById('restoreSelectedBackupBtn');
  if(backupSelect){
    Backend.listBackups().then(items=>{
      backupSelect.innerHTML=items.length
        ? `<option value="">Velg sikkerhetskopi …</option>`+items.slice(0,14).map(item=>`<option value="${escapeHtml(item.fileName)}">${new Date(item.createdAt).toLocaleString('nb-NO')} · ${Math.max(1,Math.round(item.size/1024))} kB</option>`).join('')
        : '<option value="">Ingen sikkerhetskopier tilgjengelig</option>';
      if(restoreSelectedBackupBtn)restoreSelectedBackupBtn.disabled=true;
    }).catch(error=>{
      backupSelect.innerHTML=`<option value="">${escapeHtml(error.message||'Kunne ikke laste sikkerhetskopier')}</option>`;
      if(restoreSelectedBackupBtn)restoreSelectedBackupBtn.disabled=true;
    });
    backupSelect.addEventListener('change',()=>{
      if(restoreSelectedBackupBtn)restoreSelectedBackupBtn.disabled=!backupSelect.value;
    });
  }
  if(restoreSelectedBackupBtn)restoreSelectedBackupBtn.addEventListener('click',async()=>{
    const file=backupSelect?.value||'';
    if(!file)return;
    if(await Backend.restoreBackup(file)){
      await Backend.loadSnapshot(activePeriod);
      syncPeriodSelect();
      renderPage();
      showToast('Sikkerhetskopi gjenopprettet');
    }
  });
}


const topbarUpdateAlert=document.getElementById('topbarUpdateAlert');
if(topbarUpdateAlert)topbarUpdateAlert.addEventListener('click',openReleaseInfoModal);

window.budgetApp.onUpdateStatus?.(payload=>applyDesktopUpdateState(payload||{}));
window.budgetApp.getUpdateState?.().then(state=>applyDesktopUpdateState(state||{})).catch(()=>{});

setTimeout(async()=>{
  try{
    const result=await window.budgetApp.checkForUpdates();
    applyDesktopUpdateState(result||{});
  }catch(error){
    applyDesktopUpdateState({status:'error',error:error.message||'Kunne ikke se etter oppdatering'});
  }
},2500);

function renderPage(){ content.innerHTML = pageRenderers[activePage](); wirePageActions(); CRUD.wire(); UI.initTableSorting(content); }

async function applyGlobalPeriod() {
  const year = document.getElementById('yearSelect').value;
  const month = document.getElementById('monthSelect').value;
  activePeriod = `${year}-${month}`;
  mealPlanWeekStart = '';
  mealPlanMonth = '';
  mealPlanEditMode = false;
  mealPlanSelectedIds.clear();
  await Backend.loadSnapshot(activePeriod);
  syncPeriodSelect();
  renderPage();
}
document.getElementById('yearSelect').addEventListener('change', applyGlobalPeriod);
document.getElementById('monthSelect').addEventListener('change', applyGlobalPeriod);

document.getElementById('primaryTabs').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>navigateTo(btn.dataset.section)));

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('pb-theme',theme);
}
function toggleTheme(){ setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'); }
setTheme(localStorage.getItem('pb-theme')||'light');

const backdrop=document.getElementById('modalBackdrop');
const quickName=document.getElementById('quickEntryName');
const quickAmount=document.getElementById('quickEntryAmount');
const quickCategory=document.getElementById('quickEntryCategory');
const quickCategoryField=document.getElementById('quickEntryCategoryField');
const quickDate=document.getElementById('quickEntryDate');

function quickCategoryTypes(type){
  if(type==='income') return ['Inntekt'];
  if(type==='expense') return ['Utgift','Mat'];
  return [];
}
let quickCategoryOptions=[];
const quickCategoryMenu=document.getElementById('quickEntryCategoryMenu');
function renderQuickCategoryMenu(query=''){
  if(quickCategory.disabled){ quickCategoryMenu.classList.add('hidden'); quickCategory.setAttribute('aria-expanded','false'); return; }
  const q=String(query||'').trim().toLocaleLowerCase('nb-NO');
  const matches=quickCategoryOptions.filter(name=>!q||name.toLocaleLowerCase('nb-NO').includes(q));
  quickCategoryMenu.innerHTML=matches.length
    ?`<div class="quick-category-count">${matches.length} ${matches.length===1?'kategori':'kategorier'}</div>`+matches.map(name=>`<button type="button" class="quick-category-option" role="option" data-value="${UI.escapeHtml?UI.escapeHtml(name):String(name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${name}</button>`).join('')
    :`<div class="quick-category-empty">Ingen kategorier funnet</div>`;
  quickCategoryMenu.classList.remove('hidden');
  quickCategory.setAttribute('aria-expanded','true');
  quickCategoryMenu.querySelectorAll('.quick-category-option').forEach(btn=>btn.addEventListener('click',()=>{
    quickCategory.value=btn.dataset.value;
    quickCategoryMenu.classList.add('hidden');
    quickCategory.setAttribute('aria-expanded','false');
    quickCategory.dispatchEvent(new Event('change',{bubbles:true}));
  }));
}
function populateQuickCategories(type){
  const allowed=quickCategoryTypes(type);
  const show=allowed.length>0;
  quickCategoryField.classList.toggle('hidden',!show);
  quickCategory.disabled=!show;
  quickCategory.value='';
  quickCategoryOptions=[];
  if(!show){ quickCategory.placeholder='Ikke relevant'; quickCategoryMenu.classList.add('hidden'); return; }
  quickCategory.placeholder='Søk eller velg kategori';
  quickCategoryOptions=[...(AppState.categories||[])]
    .filter(c=>c.active!==false && allowed.includes(String(c.type||'')))
    .map(c=>String(c.name||'').trim())
    .filter(Boolean)
    .sort((a,b)=>a.localeCompare(b,'nb-NO'));
  quickCategory.setAttribute('data-option-count',String(quickCategoryOptions.length));
}
function setQuickType(type){
  document.querySelectorAll('.quick-type').forEach(btn=>btn.classList.toggle('selected',btn.dataset.type===type));
  populateQuickCategories(type);
}
const openModal=()=>{
  const today=new Date().toISOString().slice(0,10);
  const basePeriod=(activePeriod||today.slice(0,7)).endsWith('-all')?`${(activePeriod||today).slice(0,4)}-${today.slice(5,7)}`:(activePeriod||today.slice(0,7));
  quickName.value=''; quickAmount.value=''; quickDate.value=today.startsWith(basePeriod)?today:`${basePeriod}-01`;
  setQuickType('expense');
  quickModalDirty=false;
  backdrop.classList.remove('hidden');
  requestAnimationFrame(()=>{ quickName.disabled=false; quickName.readOnly=false; quickName.focus(); });
};
let quickModalDirty=false;
const closeModal=()=>{quickModalDirty=false;backdrop.classList.add('hidden');};
const requestQuickClose=async()=>{
  if(!quickModalDirty){closeModal();return;}
  const discard=await window.AppConfirm?.({title:'Forkast endringer?',message:'Du har ulagrede endringer i hurtigregistreringen.',confirmLabel:'Forkast',help:'Endringene blir ikke lagret.'});
  if(discard)closeModal();
};
document.getElementById('quickAddBtn').addEventListener('click',openModal);
document.getElementById('closeModalBtn').addEventListener('click',requestQuickClose);
document.getElementById('cancelModalBtn').addEventListener('click',requestQuickClose);
document.getElementById('quickEntryForm').addEventListener('input',()=>{quickModalDirty=true;});
document.getElementById('quickEntryForm').addEventListener('change',()=>{quickModalDirty=true;});
document.querySelectorAll('.quick-type').forEach(btn=>btn.addEventListener('click',()=>{quickModalDirty=true;setQuickType(btn.dataset.type);}));
quickCategory.addEventListener('focus',()=>renderQuickCategoryMenu(quickCategory.value));
quickCategory.addEventListener('input',()=>renderQuickCategoryMenu(quickCategory.value));
quickCategory.addEventListener('keydown',event=>{
  if(event.key==='Escape'){ quickCategoryMenu.classList.add('hidden'); quickCategory.setAttribute('aria-expanded','false'); }
});
document.addEventListener('click',event=>{
  if(!quickCategoryField.contains(event.target)){ quickCategoryMenu.classList.add('hidden'); quickCategory.setAttribute('aria-expanded','false'); }
});

document.getElementById('saveEntryBtn').addEventListener('click',async()=>{
  const selected=document.querySelector('.quick-type.selected');
  const type=selected?.dataset.type||'expense';
  const entry={type,name:quickName.value.trim(),amount:Number(quickAmount.value),category:quickCategory.value,date:quickDate.value};
  if(!entry.name || !Number.isFinite(entry.amount) || entry.amount<0 || !entry.date){ showToast('Fyll ut navn, beløp og dato'); return; }
  if(quickCategoryTypes(type).length){
    const validCategory=quickCategoryOptions.find(name=>name.toLocaleLowerCase('nb-NO')===entry.category.toLocaleLowerCase('nb-NO'));
    if(!validCategory){ showToast('Velg en gyldig kategori'); quickCategory.focus(); renderQuickCategoryMenu(entry.category); return; }
    entry.category=validCategory;
  }
  await Backend.saveQuickEntry(entry); await Backend.loadSnapshot(activePeriod); syncPeriodSelect(); closeModal(); renderPage(); showToast('Lagret lokalt');
});

async function bootstrap(){
  try {
    await BudgetDB.open(); await Backend.ensureSeeded(); await Backend.loadSnapshot(activePeriod);
    syncPeriodSelect(); document.documentElement.classList.toggle('compact-tables',AppState.settings?.compactTables===true); document.documentElement.classList.toggle('reduced-motion',AppState.settings?.reducedMotion===true); syncPrimaryTabs(); renderSecondaryTabs(); renderPage();
    const version=await window.budgetApp?.getVersion?.(); const versionNode=document.getElementById('appVersion'); if(versionNode)versionNode.textContent=`v${version||'ukjent'}`;
  } catch(error) {
    console.error(error); content.innerHTML=`<section class="card"><h2>Kunne ikke starte databasen</h2><p>${error.message}</p></section>`;
  }
}
bootstrap();

document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && !backdrop.classList.contains('hidden')){
    event.preventDefault();
    requestQuickClose();
  }
});
