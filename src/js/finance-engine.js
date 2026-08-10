(() => {
  const n = value => Number(value || 0);
  const sum = (items, getter = x => x) => (items || []).reduce((total, item) => total + n(getter(item)), 0);
  const monthKey = value => /^\d{4}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 7) : '';

  function periodParts(period) {
    const [yearText, scopeText] = String(period || '').split('-');
    const year = Number(yearText) || new Date().getFullYear();
    const isYear = scopeText === 'all';
    const month = isYear ? null : Math.min(12, Math.max(1, Number(scopeText) || new Date().getMonth() + 1));
    return { year, month, isYear };
  }
  function makePeriod(year, month = null) { return month ? `${year}-${String(month).padStart(2, '0')}` : `${year}-all`; }
  function monthsForPeriod(period) {
    const { year, month, isYear } = periodParts(period);
    return isYear ? Array.from({ length: 12 }, (_, index) => makePeriod(year, index + 1)) : [makePeriod(year, month)];
  }
  function normalizedFrequency(value) {
    const frequency = String(value || 'Engangs').trim().toLowerCase();
    if (frequency === 'fast') return 'månedlig';
    if (frequency === 'periodisk') return 'kvartalsvis';
    return frequency;
  }
  function monthDiff(start, year, month) { return (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth()); }
  function monthBounds(year, month) {
    return { first:new Date(year, month - 1, 1, 12), last:new Date(year, month, 0, 12) };
  }
  function parseDate(value) {
    const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function occurrenceDates(record, dateKey, year, month) {
    const start = parseDate(record?.[dateKey]);
    if (!start) return [];
    const end = parseDate(record.endDate || record.end_date);
    const { first, last } = monthBounds(year, month);
    if (start > last || (end && end < first)) return [];
    const frequency = normalizedFrequency(record.frequency);
    if (frequency === 'ukentlig') {
      const upper = end && end < last ? end : last;
      const anchor = start > first ? start : first;
      const elapsed = Math.max(0, Math.ceil((anchor - start) / 86400000));
      const offset = (7 - (elapsed % 7)) % 7;
      const current = new Date(anchor); current.setDate(anchor.getDate() + offset);
      const dates = [];
      while (current <= upper) { dates.push(new Date(current)); current.setDate(current.getDate() + 7); }
      return dates;
    }
    const diff = monthDiff(start, year, month);
    if (diff < 0) return [];
    let occurs = false;
    if (frequency === 'månedlig') occurs = true;
    else if (frequency === 'kvartalsvis') occurs = diff % 3 === 0;
    else if (frequency === 'halvårlig') occurs = diff % 6 === 0;
    else if (frequency === 'årlig') occurs = diff % 12 === 0;
    else occurs = start.getFullYear() === year && start.getMonth() + 1 === month;
    if (!occurs) return [];
    const day = Math.min(start.getDate(), new Date(year, month, 0).getDate());
    const occurrence = frequency === 'engangs' || frequency === 'variabel' ? new Date(start) : new Date(year, month - 1, day, 12);
    return end && occurrence > end ? [] : [occurrence];
  }
  function occurrenceCount(record, dateKey, year, month) { return occurrenceDates(record, dateKey, year, month).length; }
  function defaultOccurrenceStatus(record, sourceType, dates = []) {
    const recurring = !['engangs','variabel'].includes(normalizedFrequency(record.frequency));
    if (!recurring) {
      if (sourceType === 'income') return ['mottatt','betalt'].includes(String(record.status || '').toLowerCase()) ? 'Mottatt' : 'Forventet';
      return record.status || 'Ubetalt';
    }
    const today = new Date(); today.setHours(23,59,59,999);
    const completed = dates.filter(date => date <= today).length;
    if (sourceType === 'income') return completed === 0 ? 'Forventet' : completed === dates.length ? 'Mottatt' : 'Delvis';
    return record.status || 'Ubetalt';
  }
  function defaultActualAmount(record, sourceType, dates, amount, status) {
    const recurring = !['engangs','variabel'].includes(normalizedFrequency(record.frequency));
    if (!recurring) return ['mottatt','betalt'].includes(String(status || '').toLowerCase()) ? amount : 0;
    const today = new Date(); today.setHours(23,59,59,999);
    const completed = dates.filter(date => date <= today).length;
    if (sourceType === 'income') return n(record.amount) * completed;
    return ['betalt'].includes(String(status || '').toLowerCase()) ? amount : 0;
  }
  function overrideMap(overrides) {
    const map = new Map();
    (overrides || []).forEach(item => map.set(`${item.sourceType}:${item.sourceId}:${item.period}`, item));
    return map;
  }
  function expand(records, dateKey, period, sourceType = '', overrides = []) {
    const lookup = overrideMap(overrides);
    return (records || []).flatMap(record => monthsForPeriod(period).flatMap(periodKey => {
      const { year, month } = periodParts(periodKey);
      const dates = occurrenceDates(record, dateKey, year, month);
      const count = dates.length;
      if (!count) return [];
      const override = lookup.get(`${sourceType}:${record.id}:${periodKey}`);
      const baseAmount = n(record.amount);
      const amount = override && override.amount !== '' && override.amount != null ? n(override.amount) : baseAmount * count;
      const status = override?.status || defaultOccurrenceStatus(record, sourceType, dates);
      const automaticActual = defaultActualAmount(record, sourceType, dates, amount, status);
      const actualAmount = override && override.actualAmount !== '' && override.actualAmount != null
        ? Math.min(amount, Math.max(0, n(override.actualAmount)))
        : override
          ? (['mottatt','betalt'].includes(String(status).toLowerCase()) ? amount : 0)
          : Math.min(amount, automaticActual);
      const generatedDate = dates[0].toISOString().slice(0, 10);
      const occurrenceDate = override?.date || generatedDate;
      return [{
        ...record,
        [dateKey]: occurrenceDate,
        baseAmount,
        amount,
        actualAmount,
        status,
        occurrenceCount: count,
        occurrencePeriod: periodKey,
        occurrenceOverrideId: override?.id || null,
        hasOccurrenceOverride: Boolean(override)
      }];
    }));
  }
  function aggregateBySource(records) {
    const grouped = new Map();
    (records || []).forEach(record => {
      const key = record.id ?? `${record.name || record.description}-${record.date || record.dueDate}`;
      const current = grouped.get(key) || { ...record, amount: 0, occurrenceCount: 0 };
      current.amount += n(record.amount);
      current.occurrenceCount += n(record.occurrenceCount || 1);
      if (current.status && record.status && current.status !== record.status) current.status = 'Blandet';
      grouped.set(key, current);
    });
    return [...grouped.values()];
  }
  function isFixed(expense) { return String(expense.type || '').toLowerCase() === 'fast'; }
  function categoryKey(value) { return String(value || 'Ukategorisert').trim().toLocaleLowerCase('nb-NO'); }
  function categoryLabel(value) { return String(value || 'Ukategorisert').trim() || 'Ukategorisert'; }
  function isoWeekKey(value) {
    const date = value instanceof Date ? new Date(value) : parseDate(value);
    if (!date) return '';
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
  }
  function budgetsForPeriod(records, period) {
    const rows = [];
    (records || []).forEach(item => {
      let occurrences = [];
      if (item.startDate) {
        occurrences = monthsForPeriod(period).flatMap(periodKey => {
          const { year, month } = periodParts(periodKey);
          return occurrenceDates(item, 'startDate', year, month).map(date => ({ date, period:periodKey }));
        });
      } else {
        const key = monthKey(item.month);
        const { year, month, isYear } = periodParts(period);
        if (key && (isYear ? key.startsWith(`${year}-`) : key === makePeriod(year, month))) {
          occurrences = [{ date:parseDate(`${key}-01`), period:key }];
        }
      }
      occurrences.filter(entry => entry.date).forEach(entry => rows.push({
        ...item,
        category:categoryLabel(item.category),
        planned:n(item.planned),
        month:entry.period,
        occurrenceDate:entry.date.toISOString().slice(0,10),
        calendarWeek:item.calendarWeek || '',
        periodLabel:item.calendarWeek ? `Uke ${Number(String(item.calendarWeek).split('W')[1])}` : (periodParts(period).isYear ? entry.period : 'Hele måneden'),
        sourceIds:item.id != null ? [item.id] : []
      }));
    });
    return rows;
  }
  function categoryTotals(expenses) {
    const totals = new Map();
    const labels = new Map();
    (expenses || []).forEach(expense => {
      const label = categoryLabel(expense.category);
      const key = categoryKey(label);
      labels.set(key, labels.get(key) || label);
      totals.set(key, n(totals.get(key)) + n(expense.amount));
    });
    return { totals, labels };
  }
  function categoryObject(categoryMap) {
    return Object.fromEntries([...categoryMap.totals.entries()].map(([key,value]) => [categoryMap.labels.get(key) || key, value]));
  }
  function annualReserve(expenses, selectedPeriod) {
    const { isYear } = periodParts(selectedPeriod);
    const activeAnnual = (expenses || []).filter(item => normalizedFrequency(item.frequency) === 'årlig');
    const monthly = sum(activeAnnual, item => n(item.amount) / 12);
    return isYear ? monthly * 12 : monthly;
  }

  function loanMonthlyBreakdown(loan, openingBalance = n(loan.balance)) {
    const balance = Math.max(0, n(openingBalance));
    const monthlyRate = Math.max(0, n(loan.nominal)) / 100 / 12;
    const fee = Math.max(0, n(loan.fee));
    const scheduledPayment = Math.max(0, n(loan.payment));
    const interest = balance * monthlyRate;
    const interestOnly = n(loan.interestOnlyMonths) > 0;
    const principal = interestOnly ? 0 : Math.max(0, Math.min(balance, scheduledPayment - interest - fee));
    const totalPayment = Math.min(balance + interest + fee, scheduledPayment || (interest + fee));
    return { openingBalance: balance, interest, principal, fee, totalPayment, closingBalance: Math.max(0, balance - principal) };
  }
  function normalizedText(value) { return String(value || '').trim().toLocaleLowerCase('nb-NO'); }
  function loanScheduleForPeriod(loans, selectedPeriod, manualExpenses = []) {
    // Låneutgifter registreres manuelt under Utgifter. Lånemodulen skal derfor
    // aldri opprette syntetiske utgiftsposter eller påvirke kontantstrøm direkte.
    return [];
  }


  function addMonths(period, offset) {
    const { year, month, isYear } = periodParts(period);
    const baseMonth = isYear ? 1 : month;
    const date = new Date(year, baseMonth - 1 + offset, 1, 12);
    return makePeriod(date.getFullYear(), date.getMonth() + 1);
  }
  function projectionStartPeriod(period) {
    const { year, month, isYear } = periodParts(period);
    return makePeriod(year, isYear ? 1 : month);
  }
  function project(data, selectedPeriod, monthCount = 12, assumptions = {}) {
    const startPeriod = projectionStartPeriod(selectedPeriod);
    const ordinaryLoans = data.loans || [];
    const balances = new Map((data.loans || []).map(loan => [loan.id, Math.max(0, n(loan.balance))]));
    const goals = (data.goals || []).map(goal => ({ ...goal, projectedCurrent:goalValueAtPeriod(goal, startPeriod) }));
    const extraDebt = Math.max(0, n(assumptions.extraDebtPayment ?? assumptions.extraDebt));
    const incomeGrowth = n(assumptions.incomeGrowth ?? assumptions.incomeChange);
    const expenseGrowth = n(assumptions.expenseGrowth ?? assumptions.expenseChange);
    const foodChange = n(assumptions.foodChange);
    const rateChange = n(assumptions.rateChange);
    const savingsGrowth = n(assumptions.savingsGrowth);
    const extraSaving = Math.max(0, n(assumptions.extraSaving));
    const rows = [];

    for (let index = 0; index < monthCount; index += 1) {
      const period = addMonths(startPeriod, index);
      const base = build({ ...data, loans:ordinaryLoans }, period);
      const incomeFactor = Math.pow(1 + incomeGrowth / 100, index / 12);
      const expenseFactor = Math.pow(1 + expenseGrowth / 100, index / 12);
      const adjustedIncome = base.metrics.plannedIncome * incomeFactor;
      const baseFood = base.metrics.foodForecast;
      const adjustedOrdinaryExpenses = Math.max(0, base.metrics.plannedExpenses - baseFood) * expenseFactor;
      const adjustedFood = baseFood * expenseFactor * (1 + foodChange / 100);

      const eligible = (data.loans || []).filter(loan => n(loan.payment) > 0 && n(balances.get(loan.id)) > 0).sort((a,b)=>n(b.nominal)-n(a.nominal));
      const extraTarget = eligible[0]?.id;
      let loanPayments = 0, interest = 0, principal = 0, fees = 0;
      eligible.forEach(loan => {
        const openingBalance = n(balances.get(loan.id));
        const paymentBoost = loan.id === extraTarget ? extraDebt : 0;
        const adjustedLoan = {
          ...loan,
          balance:openingBalance,
          nominal:Math.max(0, n(loan.nominal) + rateChange),
          payment:Math.max(0, n(loan.payment) + paymentBoost),
          interestOnlyMonths:Math.max(0, n(loan.interestOnlyMonths) - index)
        };
        const breakdown = loanMonthlyBreakdown(adjustedLoan, openingBalance);
        balances.set(loan.id, breakdown.closingBalance);
        loanPayments += paymentBoost;
        interest += breakdown.interest;
        principal += breakdown.principal;
        fees += breakdown.fee;
      });

      goals.forEach(goal => {
        const monthly = n(goal.monthly) * (1 + savingsGrowth / 100) + extraSaving;
        goal.projectedCurrent += monthly;
      });
      const expenses = adjustedOrdinaryExpenses + adjustedFood + loanPayments;
      rows.push({
        period, income:adjustedIncome, ordinaryExpenses:adjustedOrdinaryExpenses, food:adjustedFood,
        loanPayments, expenses, cashFlow:adjustedIncome-expenses, interest, principal, fees,
        debt:[...balances.values()].reduce((a,b)=>a+n(b),0), savings:sum(goals,g=>g.projectedCurrent)
      });
    }
    return {
      startPeriod, months:rows,
      totals:{
        income:sum(rows,r=>r.income), expenses:sum(rows,r=>r.expenses), cashFlow:sum(rows,r=>r.cashFlow),
        food:sum(rows,r=>r.food), loanPayments:sum(rows,r=>r.loanPayments), interest:sum(rows,r=>r.interest),
        principal:sum(rows,r=>r.principal), fees:sum(rows,r=>r.fees)
      },
      debtStart:sum(data.loans,l=>l.balance), debtEnd:rows.at(-1)?.debt ?? sum(data.loans,l=>l.balance),
      savingsEnd:rows.at(-1)?.savings ?? sum(data.goals,g=>goalValueAtPeriod(g, startPeriod))
    };
  }



  function goalValueAtPeriod(goal, period) {
    const base = Math.max(0, n(goal.current ?? goal.startAmount));
    const created = parseDate(goal.createdAt || goal.startDate);
    if (!created) return Math.min(Math.max(0, n(goal.target)), base);
    const parts = periodParts(period);
    const targetMonth = parts.isYear ? 12 : parts.month;
    const elapsed = Math.max(0, (parts.year - created.getFullYear()) * 12 + (targetMonth - 1 - created.getMonth()));
    const projected = base + elapsed * Math.max(0, n(goal.monthly));
    return Math.min(Math.max(0, n(goal.target)), projected);
  }

  function goalTargetDate(goal, period, extraMonthly = 0) {
    const current = goalValueAtPeriod(goal, period);
    const remaining = Math.max(0, n(goal.target) - current);
    const monthly = Math.max(0, n(goal.monthly) + n(extraMonthly));
    if (remaining <= 0) return { months:0, date:null, reached:true };
    if (monthly <= 0) return { months:null, date:null, reached:false };
    const months = Math.ceil(remaining / monthly);
    const parts = periodParts(period);
    const start = new Date(parts.year, (parts.isYear ? 11 : parts.month - 1), 1, 12);
    start.setMonth(start.getMonth() + months);
    return { months, date:start, reached:false };
  }

  function clamp(value, minimum = 0, maximum = 100) { return Math.min(maximum, Math.max(minimum, n(value))); }
  function interpolate(value, points) {
    const ordered = [...points].sort((a,b)=>a[0]-b[0]);
    if (value <= ordered[0][0]) return ordered[0][1];
    if (value >= ordered.at(-1)[0]) return ordered.at(-1)[1];
    for (let i=1;i<ordered.length;i+=1) {
      const [x2,y2]=ordered[i], [x1,y1]=ordered[i-1];
      if (value <= x2) return y1 + ((value-x1)/(x2-x1))*(y2-y1);
    }
    return ordered.at(-1)[1];
  }
  function health(data, selectedPeriod, options = {}) {
    const { year } = periodParts(selectedPeriod);
    const annual = build(data, `${year}-all`);
    const outlook = project(data, selectedPeriod, 12, {});
    const annualIncome = n(annual.metrics.plannedIncome);
    const annualExpenses = n(annual.metrics.plannedExpenses);
    const monthlyExpenses = annualExpenses / 12;
    const debt = n(annual.metrics.debt);
    const debtRatio = annualIncome > 0 ? debt / annualIncome : 0;
    const interestRatio = annualIncome > 0 ? n(outlook.totals.interest) / annualIncome : 0;
    const cashFlowMargin = annualIncome > 0 ? n(outlook.totals.cashFlow) / annualIncome : 0;
    const savingsAnnual = sum(data.goals || [], goal => Math.max(0, n(goal.monthly)) * 12);
    const savingsRate = annualIncome > 0 ? savingsAnnual / annualIncome : 0;
    const negativeMonths = (outlook.months || []).filter(row => n(row.cashFlow) < 0).length;
    const budgetPlanned = n(annual.metrics.budgetPlanned);
    const budgetActual = n(annual.metrics.budgetActual);
    const budgetRatio = budgetPlanned > 0 ? budgetActual / budgetPlanned : 0;
    const budgetCoverage = annualExpenses > 0 ? Math.max(0, 1 - n(annual.metrics.unbudgetedActual) / annualExpenses) : 0;

    const dimensions = [];
    const add = item => dimensions.push({ available:true, ...item, score:clamp(item.score) });
    const unavailable = item => dimensions.push({ available:false, score:null, ...item });


    if (annualIncome > 0) add({
      id:'cashflow', label:'Kontantstrøm', weight:28, value:cashFlowMargin,
      score:interpolate(cashFlowMargin*100, [[-10,0],[0,20],[5,50],[10,72],[20,100]]),
      display:`${(cashFlowMargin*100).toLocaleString('nb-NO',{maximumFractionDigits:1})} % margin`,
      summary:cashFlowMargin>=.2?'Godt månedlig spillerom':cashFlowMargin>=.1?'Positiv og sunn kontantstrøm':cashFlowMargin>=0?'Lite spillerom i økonomien':'Utgiftene overstiger inntektene'
    }); else unavailable({id:'cashflow',label:'Kontantstrøm',weight:28,display:'Mangler inntekter',summary:'Registrer inntekter for å beregne kontantstrøm.'});

    if (annualIncome > 0) {
      const debtScore = debt <= 0 ? 100 : interpolate(debtRatio, [[0,100],[1,92],[2,75],[4,45],[6,20],[8,0]]);
      const interestScore = debt <= 0 ? 100 : interpolate(interestRatio*100, [[0,100],[5,100],[10,65],[20,20],[25,0]]);
      add({ id:'debt', label:'Gjeld og renter', weight:24, value:debtRatio,
        score:(debtScore+interestScore)/2,
        display:debt<=0?'Ingen registrert gjeld':`${debtRatio.toLocaleString('nb-NO',{maximumFractionDigits:1})} × årsinntekt`,
        summary:debt<=0?'Ingen registrert gjeld':interestRatio<=.05?'Rentebelastningen er lav':interestRatio<=.1?'Rentebelastningen bør følges':'En stor del av inntekten går til renter'
      });
    } else unavailable({id:'debt',label:'Gjeld og renter',weight:24,display:'Mangler inntekter',summary:'Årsinntekt kreves for å vurdere gjeldsbelastningen.'});

    if (budgetPlanned > 0) {
      const adherence = interpolate(budgetRatio, [[0,100],[.9,100],[1,88],[1.15,50],[1.5,0]]);
      add({ id:'budget', label:'Budsjett', weight:18, value:budgetRatio,
        score:adherence*.75 + clamp(budgetCoverage*100)*.25,
        display:`${(budgetRatio*100).toLocaleString('nb-NO',{maximumFractionDigits:0})} % brukt`,
        summary:budgetRatio<=1?'Faktisk forbruk er innenfor budsjettet':'Faktisk forbruk overstiger budsjettet'
      });
    } else unavailable({id:'budget',label:'Budsjett',weight:18,display:'Ikke opprettet',summary:'Opprett budsjettposter for å få en budsjettvurdering.'});

    if (annualIncome > 0 && (data.goals || []).length) add({
      id:'savings', label:'Sparing', weight:18, value:savingsRate,
      score:interpolate(savingsRate*100, [[0,15],[5,45],[10,72],[20,100]]),
      display:`${(savingsRate*100).toLocaleString('nb-NO',{maximumFractionDigits:1})} % sparerate`,
      summary:savingsRate>=.2?'Svært sterk planlagt sparing':savingsRate>=.1?'God planlagt sparing':savingsRate>0?'Sparingen er moderat':'Ingen månedlig sparing er registrert'
    }); else unavailable({id:'savings',label:'Sparing',weight:18,display:'Mangler mål eller inntekt',summary:'Registrer sparemål med månedlig beløp for å beregne sparerate.'});

    add({ id:'outlook', label:'12-måneders robusthet', weight:12, value:negativeMonths,
      score:interpolate(negativeMonths, [[0,100],[1,80],[3,50],[6,20],[12,0]]),
      display:`${negativeMonths} negative måneder`,
      summary:negativeMonths===0?'Ingen negative måneder i prognosen':negativeMonths<=2?'Noen få stramme måneder i prognosen':'Flere måneder har negativ forventet kontantstrøm'
    });

    const available = dimensions.filter(item=>item.available);
    const availableWeight = sum(available,item=>item.weight);
    const score = availableWeight ? Math.round(sum(available,item=>item.score*item.weight)/availableWeight) : 0;
    const confidence = Math.round(availableWeight);
    const status = score>=85?'Svært sterk':score>=70?'God':score>=55?'Stabil':score>=40?'Bør forbedres':'Sårbar';
    const strengths = available.filter(item=>item.score>=75).sort((a,b)=>b.score-a.score).slice(0,4).map(item=>({title:item.label,text:item.summary,score:Math.round(item.score)}));
    const risks = available.filter(item=>item.score<60).sort((a,b)=>a.score-b.score).slice(0,4).map(item=>({title:item.label,text:item.summary,score:Math.round(item.score)}));
    const missing = dimensions.filter(item=>!item.available).map(item=>item.label);
    return {
      score,status,confidence,dimensions,strengths,risks,missing,
      metrics:{monthlyExpenses,cashFlowMargin,debtRatio,interestRatio,savingsRate,negativeMonths,budgetRatio,budgetCoverage,annualIncome,annualExpenses,debt},
      note:'Scoren er et internt oversiktsverktøy, ikke en kredittscore eller finansiell rådgivning.',
      activeTips:n(options.activeTips)
    };
  }

  function build(data, selectedPeriod) {
    const { isYear } = periodParts(selectedPeriod);
    const overrides = data.occurrenceOverrides || [];
    const incomesExpanded = expand(data.incomes, 'date', selectedPeriod, 'income', overrides);
    const manualExpensesExpanded = expand(data.expenses, 'dueDate', selectedPeriod, 'expense', overrides);
    const loanExpensesExpanded = loanScheduleForPeriod(data.loans, selectedPeriod, manualExpensesExpanded);
    const expensesExpanded = [...manualExpensesExpanded, ...loanExpensesExpanded];
    const incomes = isYear ? aggregateBySource(incomesExpanded) : incomesExpanded;
    const expenses = isYear ? aggregateBySource(expensesExpanded) : expensesExpanded;
    const paidExpensesExpanded = expensesExpanded.filter(x => n(x.actualAmount) > 0).map(x => ({ ...x, amount:n(x.actualAmount) }));
    const unpaidExpensesExpanded = expensesExpanded.map(x => ({ ...x, amount:Math.max(0, n(x.amount) - n(x.actualAmount)) })).filter(x => x.amount > 0);
    const paidExpenses = isYear ? aggregateBySource(paidExpensesExpanded) : paidExpensesExpanded;
    const unpaidExpenses = isYear ? aggregateBySource(unpaidExpensesExpanded) : unpaidExpensesExpanded;
    const budgets = budgetsForPeriod(data.budgets, selectedPeriod);
    const actualCategoryMap = categoryTotals(paidExpensesExpanded);
    const plannedCategoryMap = categoryTotals(expensesExpanded);
    const expenseInstanceKey = item => `${item.id ?? item.description}:${item.occurrencePeriod || monthKey(item.dueDate)}:${item.dueDate || ''}`;
    const coveredActual = new Set();
    const coveredForecast = new Set();
    const matchesBudget = (expense, budget) => {
      if (categoryKey(expense.category) !== categoryKey(budget.category)) return false;
      const expensePeriod = expense.occurrencePeriod || monthKey(expense.dueDate);
      if (expensePeriod !== budget.month) return false;
      return !budget.calendarWeek || isoWeekKey(expense.dueDate) === budget.calendarWeek;
    };
    const budgetRows = budgets.map(budget => {
      const actualMatches = paidExpensesExpanded.filter(expense => matchesBudget(expense, budget));
      const forecastMatches = expensesExpanded.filter(expense => matchesBudget(expense, budget));
      actualMatches.forEach(item => coveredActual.add(expenseInstanceKey(item)));
      forecastMatches.forEach(item => coveredForecast.add(expenseInstanceKey(item)));
      const actual = sum(actualMatches, item => item.amount);
      const forecast = sum(forecastMatches, item => item.amount);
      return {
        ...budget,
        actual,
        forecast,
        variance:n(budget.planned) - actual,
        forecastVariance:n(budget.planned) - forecast,
        isUnbudgeted:false
      };
    });
    const unmatchedActual = paidExpensesExpanded.filter(item => !coveredActual.has(expenseInstanceKey(item)));
    const unmatchedForecast = expensesExpanded.filter(item => !coveredForecast.has(expenseInstanceKey(item)));
    const unmatchedActualMap = categoryTotals(unmatchedActual);
    const unmatchedForecastMap = categoryTotals(unmatchedForecast);
    const unbudgetedKeys = new Set([...unmatchedActualMap.totals.keys(), ...unmatchedForecastMap.totals.keys()]);
    const unbudgetedRows = [...unbudgetedKeys].map(key => {
      const category = unmatchedActualMap.labels.get(key) || unmatchedForecastMap.labels.get(key) || 'Ukategorisert';
      const actual = n(unmatchedActualMap.totals.get(key));
      const forecast = n(unmatchedForecastMap.totals.get(key));
      return { category, periodLabel:'Ikke budsjettert', planned:0, actual, forecast, variance:-actual, forecastVariance:-forecast, isUnbudgeted:true, sourceIds:[] };
    });
    const budgetByCategory = [...budgetRows, ...unbudgetedRows].sort((a,b) => {
      const categoryCompare = a.category.localeCompare(b.category,'nb');
      return categoryCompare || String(a.month || '').localeCompare(String(b.month || '')) || String(a.calendarWeek || '').localeCompare(String(b.calendarWeek || ''));
    });
    const actualByCategory = categoryObject(actualCategoryMap);
    const plannedByCategory = categoryObject(plannedCategoryMap);
    const plannedIncome = sum(incomesExpanded, x => x.amount);
    const actualIncome = sum(incomesExpanded, x => x.actualAmount);
    const plannedExpenses = sum(expensesExpanded, x => x.amount);
    const actualExpenses = sum(paidExpensesExpanded, x => x.amount);
    const unpaidExpensesTotal = sum(unpaidExpensesExpanded, x => x.amount);
    const fixedExpenses = sum(expensesExpanded.filter(isFixed), x => x.amount);
    const variableExpenses = plannedExpenses - fixedExpenses;
    const debt = sum(data.loans, loan => loan.balance);
    const loanPayments = sum(loanExpensesExpanded, item => item.amount);
    const interest = sum(loanExpensesExpanded, item => item.interestAmount);
    const principal = sum(loanExpensesExpanded, item => item.principalAmount);
    const loanFees = sum(loanExpensesExpanded, item => item.feeAmount);
    const findCategoryValue = (object, wanted) => {
      const match = Object.keys(object || {}).find(key => categoryKey(key) === categoryKey(wanted));
      return n(match ? object[match] : 0);
    };
    const foodActual = findCategoryValue(actualByCategory, 'Mat');
    const foodForecast = findCategoryValue(plannedByCategory, 'Mat');
    const foodBudget = sum(budgetByCategory.filter(item => categoryKey(item.category) === categoryKey('Mat')), item => item.planned);
    const budgetPlanned = sum(budgetByCategory, item => item.planned);
    const budgetActual = sum(budgetByCategory, item => item.actual);
    const budgetForecast = sum(budgetByCategory, item => item.forecast);
    const unbudgetedActual = sum(budgetByCategory.filter(item => item.isUnbudgeted), item => item.actual);
    return {
      selectedPeriod,
      period: periodParts(selectedPeriod),
      incomes, expenses, paidExpenses, unpaidExpenses, budgets: budgetByCategory, loanExpenses:loanExpensesExpanded,
      metrics: {
        plannedIncome, actualIncome, plannedExpenses, actualExpenses, unpaidExpenses: unpaidExpensesTotal,
        expectedCashFlow: plannedIncome - plannedExpenses,
        actualCashFlow: actualIncome - actualExpenses,
        fixedExpenses, variableExpenses, loanPayments, interest, principal, loanFees, debt,
        annualReserve: annualReserve(data.expenses, selectedPeriod),
        foodBudget, foodActual, foodForecast,
        budgetPlanned, budgetActual, budgetForecast,
        budgetRemaining: budgetPlanned - budgetActual,
        unbudgetedActual
      },
      byCategory: { actual: actualByCategory, planned: plannedByCategory },
      helpers: { normalizedFrequency }
    };
  }

  window.FinanceEngine = { build, project, health, goalValueAtPeriod, goalTargetDate, addMonths, projectionStartPeriod, expand, aggregateBySource, periodParts, makePeriod, monthsForPeriod, normalizedFrequency, occurrenceDates, occurrenceCount, defaultOccurrenceStatus, defaultActualAmount, categoryKey, isoWeekKey, sum, loanMonthlyBreakdown, loanScheduleForPeriod, normalizedText };
})();
