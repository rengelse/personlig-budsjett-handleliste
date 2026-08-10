(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MealPlanningEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const num=value=>Number(value)||0;
  const text=value=>String(value??'').trim();
  const dateOnly=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value))?text(value):'';

  function isoDate(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function startOfWeek(value){
    const date=value instanceof Date?new Date(value):new Date(`${dateOnly(value)||isoDate(new Date())}T12:00:00`);
    const day=date.getDay()||7;
    date.setDate(date.getDate()-day+1);
    date.setHours(0,0,0,0);
    return date;
  }
  function endOfWeek(value){const date=startOfWeek(value);date.setDate(date.getDate()+7);return date;}
  function addDays(value,days){const date=value instanceof Date?new Date(value):new Date(`${dateOnly(value)}T12:00:00`);date.setDate(date.getDate()+days);return date;}
  function weekKey(value){return isoDate(startOfWeek(value));}
  function findRecipe(plan,recipes=[]){
    if(plan?.recipeId!=null){const byId=recipes.find(r=>Number(r.id)===Number(plan.recipeId));if(byId)return byId;}
    const key=text(plan?.name).toLocaleLowerCase('nb-NO');
    return recipes.find(r=>text(r.name).toLocaleLowerCase('nb-NO')===key)||null;
  }
  function recipeTotal(recipe){
    if(!recipe)return 0;
    if(typeof PricingEngine!=='undefined'&&PricingEngine.recipeCost)return PricingEngine.recipeCost(recipe.ingredients||[],recipe.servings||1).total;
    return num(recipe.price);
  }
  function estimatedCost(plan,recipes=[]){
    const recipe=findRecipe(plan,recipes);
    if(!recipe)return num(plan?.estimatedCost);
    const servings=Math.max(1,num(recipe.servings)||1);
    const persons=Math.max(1,num(plan?.persons)||servings);
    return recipeTotal(recipe)*(persons/servings);
  }
  function normalizePlan(plan,recipes=[]){
    const recipe=findRecipe(plan,recipes);
    const persons=Math.max(1,num(plan?.persons)||num(recipe?.servings)||1);
    return {
      ...plan,
      name:text(plan?.name)||text(recipe?.name),
      date:dateOnly(plan?.date),
      mealType:text(plan?.mealType)||'Middag',
      persons,
      recipeId:recipe?.id??plan?.recipeId??null,
      source:recipe?'recipe':(text(plan?.source)||'manual'),
      estimatedCost:Number(estimatedCost({...plan,persons},recipes).toFixed(2)),
      leftovers:Boolean(plan?.leftovers),
      freezerPortions:Math.max(0,num(plan?.freezerPortions))
    };
  }
  function plansForPeriod(plans=[],period=''){
    const prefix=text(period).replace(/-all$/,'');
    if(!prefix)return plans.slice();
    return plans.filter(plan=>text(plan.date).startsWith(prefix));
  }
  function plansForWeek(plans=[],value){
    const start=startOfWeek(value),end=endOfWeek(value);
    return plans.filter(plan=>{const d=new Date(`${dateOnly(plan.date)}T12:00:00`);return d>=start&&d<end;});
  }
  function summary(plans=[],recipes=[],options={}){
    const normalized=plans.map(plan=>normalizePlan(plan,recipes));
    const totalCost=normalized.reduce((sum,plan)=>sum+num(plan.estimatedCost),0);
    const persons=normalized.length?Math.max(...normalized.map(plan=>num(plan.persons))):0;
    const freezerPortions=normalized.reduce((sum,plan)=>sum+num(plan.freezerPortions),0);
    const leftovers=normalized.filter(plan=>plan.leftovers).length;
    const days=new Set(normalized.map(plan=>plan.date).filter(Boolean)).size;
    const monthlyBudget=num(options.monthlyBudget);
    const weeklyBudget=monthlyBudget/4.345;
    return {plans:normalized,totalCost,persons,freezerPortions,leftovers,days,weeklyBudget,budgetUsage:weeklyBudget>0?totalCost/weeklyBudget*100:0};
  }
  function duplicateKey(plan){return [dateOnly(plan?.date),text(plan?.mealType).toLocaleLowerCase('nb-NO'),text(plan?.name).toLocaleLowerCase('nb-NO')].join('|');}
  function copyWeek(plans=[],sourceDate,options={}){
    const source=plansForWeek(plans,sourceDate);
    const existing=new Set(plans.map(duplicateKey));
    const offset=Number(options.offsetDays)||7;
    const createdAt=options.createdAt||new Date().toISOString();
    const copies=[];
    for(const plan of source){
      const clone={...plan,date:isoDate(addDays(plan.date,offset)),copiedFrom:plan.id,createdAt};
      delete clone.id;
      const key=duplicateKey(clone);
      if(existing.has(key))continue;
      existing.add(key);copies.push(clone);
    }
    return {copies,sourceStart:isoDate(startOfWeek(sourceDate))};
  }
  function latestWeekDate(plans=[],period=''){
    const candidates=plansForPeriod(plans,period).map(p=>dateOnly(p.date)).filter(Boolean).sort();
    return candidates[candidates.length-1]||'';
  }
  return {isoDate,startOfWeek,endOfWeek,addDays,weekKey,findRecipe,estimatedCost,normalizePlan,plansForPeriod,plansForWeek,summary,duplicateKey,copyWeek,latestWeekDate};
});
