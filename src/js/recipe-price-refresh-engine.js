(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.RecipePriceRefreshEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const num=value=>typeof PricingEngine!=='undefined'?PricingEngine.number(value):Number(value)||0;
  const norm=value=>String(value||'').trim().toLocaleLowerCase('nb-NO');

  function recipeIdsForPlans(plans=[],recipes=[]){
    const ids=new Set();
    for(const plan of plans||[]){
      const recipe=(recipes||[]).find(r=>Number(r.id)===Number(plan?.recipeId)) ||
        (recipes||[]).find(r=>norm(r.name)===norm(plan?.name));
      if(recipe?.id!=null)ids.add(Number(recipe.id));
    }
    return ids;
  }

  function collectEans(plans=[],recipes=[]){
    const recipeIds=recipeIdsForPlans(plans,recipes);
    const eans=new Set();
    for(const recipe of recipes||[]){
      if(!recipeIds.has(Number(recipe.id)))continue;
      for(const ingredient of recipe.ingredients||[]){
        const ean=String(ingredient?.ean||'').trim();
        if(ean)eans.add(ean);
      }
    }
    return [...eans];
  }

  function chooseStorePrice(row,preferredStore=''){
    const stores=(Array.isArray(row?.stores)?row.stores:[])
      .map(store=>({
        raw:store,
        code:String(store?.store||store?.code||'').trim(),
        name:String(store?.name||store?.store||store?.code||'').trim(),
        price:num(store?.current_price),
        unitPrice:num(store?.current_unit_price)
      }))
      .filter(entry=>entry.price>0);
    if(!stores.length)return null;
    const wanted=norm(preferredStore);
    const preferred=wanted?stores.find(entry=>norm(entry.name)===wanted||norm(entry.code)===wanted):null;
    return preferred||stores.sort((a,b)=>a.price-b.price)[0];
  }

  function applyRows(recipes=[],plans=[],rowsByEan=new Map(),nowIso=new Date().toISOString()){
    const recipeIds=recipeIdsForPlans(plans,recipes);
    const updatedRecipes=[];
    const changedRecipes=[];
    let changedIngredients=0;

    for(const recipe of recipes||[]){
      if(!recipeIds.has(Number(recipe.id))){updatedRecipes.push(recipe);continue;}
      let changed=false;
      const ingredients=(recipe.ingredients||[]).map(ingredient=>{
        const ean=String(ingredient?.ean||'').trim();
        const row=ean?rowsByEan.get(ean):null;
        if(!row)return ingredient;
        const choice=chooseStorePrice(row,ingredient.store);
        if(!choice)return ingredient;
        const nextPrice=Number(choice.price.toFixed(2));
        const previousPrice=num(ingredient.packagePrice);
        const checkedAt=String(row?._priceFetchedAt||nowIso);
        const next={...ingredient,packagePrice:nextPrice,priceUpdatedAt:checkedAt};
        if(choice.name)next.store=choice.name;
        if(num(row?.weight)>0)next.packageQuantity=num(row.weight);
        if(row?.weight_unit&&typeof PricingEngine!=='undefined')next.packageUnit=PricingEngine.normalizeUnit(row.weight_unit);
        const priceChanged=Math.abs(previousPrice-nextPrice)>0.000001;
        const metadataChanged=norm(next.store)!==norm(ingredient.store)||
          Math.abs(num(next.packageQuantity)-num(ingredient.packageQuantity))>0.000001||
          norm(next.packageUnit)!==norm(ingredient.packageUnit)||
          String(ingredient.priceUpdatedAt||'')!==checkedAt;
        if(priceChanged){
          if(previousPrice>0)next.previousPackagePrice=previousPrice;
          changedIngredients++;
        }
        if(priceChanged||metadataChanged)changed=true;
        return next;
      });
      if(!changed){updatedRecipes.push(recipe);continue;}
      const cost=typeof PricingEngine!=='undefined'?PricingEngine.recipeCost(ingredients,recipe.servings||1):{total:num(recipe.price),perServing:num(recipe.pricePerServing)};
      const nextRecipe={...recipe,ingredients,price:cost.total,pricePerServing:cost.perServing,priceUpdatedAt:nowIso};
      updatedRecipes.push(nextRecipe);
      changedRecipes.push(nextRecipe);
    }
    return {recipes:updatedRecipes,changedRecipes,changedIngredients};
  }

  const api={recipeIdsForPlans,collectEans,chooseStorePrice,applyRows};
  if(typeof window!=='undefined')window.RecipePriceRefreshEngine=api;
  return api;
});
