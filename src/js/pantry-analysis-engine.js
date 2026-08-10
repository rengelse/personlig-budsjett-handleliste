(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PantryAnalysisEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const num=value=>typeof PricingEngine!=='undefined'?PricingEngine.number(value):Number(value||0);
  const round=(value,decimals=2)=>Number(num(value).toFixed(decimals));
  const dateOnly=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';

  function addDays(value,days){
    const date=value instanceof Date?new Date(value):new Date(`${dateOnly(value)||new Date().toISOString().slice(0,10)}T12:00:00`);
    date.setDate(date.getDate()+days);
    return date;
  }
  function plansInWindow(plans=[],weeks=8,referenceDate=new Date()){
    const end=new Date(referenceDate);end.setHours(23,59,59,999);
    const start=addDays(end,-Math.max(1,num(weeks))*7);start.setHours(0,0,0,0);
    return (plans||[]).filter(plan=>{
      const value=dateOnly(plan?.date);if(!value)return false;
      const date=new Date(`${value}T12:00:00`);
      return date>=start&&date<=end;
    });
  }
  function bufferWeeksFor(stock){
    const location=String(stock?.location||'').toLocaleLowerCase('nb-NO');
    const expiry=dateOnly(stock?.expiryDate);
    if(expiry){
      const days=(new Date(`${expiry}T12:00:00`)-new Date())/86400000;
      if(days<=10)return .5;
      if(days<=21)return 1;
    }
    if(location.includes('kjøl'))return 1;
    if(location.includes('frys'))return 3;
    return 3;
  }
  function displayQuantity(quantity,unit){
    const value=num(quantity);const normalized=typeof PricingEngine!=='undefined'?PricingEngine.normalizeUnit(unit):String(unit||'');
    if(normalized==='g'&&value>=1000)return `${round(value/1000,2)} kg`;
    if(normalized==='ml'&&value>=1000)return `${round(value/1000,2)} l`;
    return `${round(value,2)} ${normalized||'stk'}`.trim();
  }
  function stockQuantity(stock,targetUnit){
    if(typeof ShoppingEngine!=='undefined'&&ShoppingEngine.pantryItemBaseQuantity)return ShoppingEngine.pantryItemBaseQuantity(stock,targetUnit);
    const quantity=num(stock?.quantity);const packageSize=num(stock?.packageSize||stock?.packageQuantity);
    if((stock?.ean||stock?.kassalProductId)&&packageSize>0)return PricingEngine.baseQuantity(quantity*packageSize,stock?.packageUnit||stock?.unit);
    return PricingEngine.baseQuantity(quantity,stock?.unit);
  }
  function matchingUsage(stock,usageItems=[]){
    return usageItems.find(item=>{
      if(stock?.ean&&item?.ean&&String(stock.ean)===String(item.ean))return true;
      if(stock?.kassalProductId&&item?.kassalProductId&&String(stock.kassalProductId)===String(item.kassalProductId))return true;
      return ShoppingEngine.normalizedIngredientName(stock)===ShoppingEngine.normalizedIngredientName(item);
    })||null;
  }
  function recommendationStatus(current,recommended,weekly){
    if(!(weekly>0))return {status:'Lite datagrunnlag',tone:'muted',suggestion:'Ingen tydelig bruk registrert i perioden.'};
    if(current<recommended*.5)return {status:'Lav beholdning',tone:'negative',suggestion:'Vurder å fylle opp lageret.'};
    if(current<recommended)return {status:'Under anbefalt',tone:'warning-text',suggestion:'Litt ekstra på lager kan være nyttig.'};
    if(current>recommended*2.5)return {status:'Høy beholdning',tone:'warning-text',suggestion:'Unngå å kjøpe mer før beholdningen er brukt ned.'};
    return {status:'God beholdning',tone:'positive',suggestion:'Beholdningen samsvarer med normal bruk.'};
  }
  function analyze({pantry=[],mealPlans=[],recipes=[],weeks=8,referenceDate=new Date()}={}){
    const periodPlans=plansInWindow(mealPlans,weeks,referenceDate);
    const usage=ShoppingEngine.mergeMealPlanIngredients(periodPlans,recipes);
    const rows=(pantry||[]).map(stock=>{
      const match=matchingUsage(stock,usage);
      const unit=match?.unit||ShoppingEngine.canonicalUnit(stock?.packageUnit||stock?.unit||'stk');
      const totalUsed=num(match?.totalNeed);
      const weeklyUsage=totalUsed/Math.max(1,num(weeks));
      const current=stockQuantity(stock,unit);
      const bufferWeeks=bufferWeeksFor(stock);
      const packageSize=match?.packageQuantity||PricingEngine.baseQuantity(stock?.packageSize||1,stock?.packageUnit||stock?.unit||unit)||1;
      const rawRecommended=weeklyUsage*bufferWeeks;
      const recommended=weeklyUsage>0?Math.ceil(rawRecommended/packageSize)*packageSize:0;
      const weeksLeft=weeklyUsage>0?current/weeklyUsage:null;
      const state=recommendationStatus(current,recommended,weeklyUsage);
      return {
        key:stock?.ean||stock?.kassalProductId||ShoppingEngine.normalizedIngredientName(stock),
        name:stock?.name||match?.name||'',unit,totalUsed:round(totalUsed),weeklyUsage:round(weeklyUsage),current:round(current),
        recommended:round(recommended),bufferWeeks,weeksLeft:weeksLeft==null?null:round(weeksLeft,1),status:state.status,tone:state.tone,suggestion:state.suggestion,
        currentDisplay:displayQuantity(current,unit),weeklyDisplay:displayQuantity(weeklyUsage,unit),recommendedDisplay:displayQuantity(recommended,unit),
        packageDisplay:displayQuantity(packageSize,unit),location:stock?.location||'',usageCount:match?.recipeNames?.size||0
      };
    }).sort((a,b)=>{
      const rank={'Lav beholdning':0,'Under anbefalt':1,'God beholdning':2,'Høy beholdning':3,'Lite datagrunnlag':4};
      return (rank[a.status]??9)-(rank[b.status]??9)||b.weeklyUsage-a.weeklyUsage;
    });
    return {weeks,planCount:periodPlans.length,usedItemCount:rows.filter(row=>row.weeklyUsage>0).length,attentionCount:rows.filter(row=>['Lav beholdning','Under anbefalt'].includes(row.status)).length,rows};
  }
  return {plansInWindow,bufferWeeksFor,displayQuantity,stockQuantity,matchingUsage,analyze};
});
