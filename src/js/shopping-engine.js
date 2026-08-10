(() => {
  'use strict';

  const num = value => typeof PricingEngine !== 'undefined' ? PricingEngine.number(value) : Number(value || 0);
  const norm = value => String(value || '').trim().toLocaleLowerCase('nb-NO');
  const round = (value, decimals = 3) => Number(num(value).toFixed(decimals));

  function ingredientName(item) {
    return item?.ingredientName || item?.name || item?.productName || '';
  }

  function normalizedIngredientName(item) {
    return norm(ingredientName(item))
      .replace(/[(),]/g, ' ')
      .replace(/\b(malt|finhakket|hakket|revet|skivet|fersk|tørket|etter smak|til steking)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function productKey(item) {
    return norm(item?.ean || item?.productId || item?.kassalProductId || normalizedIngredientName(item));
  }

  function findRecipe(plan, recipes) {
    return (recipes || []).find(r => Number(r.id) === Number(plan?.recipeId)) ||
      (recipes || []).find(r => norm(r.name) === norm(plan?.name));
  }

  function canonicalQuantity(quantity, unit) {
    return PricingEngine.baseQuantity(quantity, unit);
  }

  function canonicalUnit(unit) {
    const normalized = PricingEngine.normalizeUnit(unit);
    if (['kg','g'].includes(normalized)) return 'g';
    if (['l','dl','ml'].includes(normalized)) return 'ml';
    return normalized || 'stk';
  }

  function mergeMealPlanIngredients(plans, recipes) {
    const merged = new Map();
    for (const plan of plans || []) {
      const recipe = findRecipe(plan, recipes);
      if (!recipe) continue;
      const servings = Math.max(1, num(recipe.servings) || 1);
      const factor = Math.max(.01, num(plan.persons) || servings) / servings;
      for (const ingredient of recipe.ingredients || []) {
        const key = productKey(ingredient);
        if (!key) continue;
        const sourceQty = num(ingredient.usedQuantity ?? ingredient.quantity);
        const sourceUnit = ingredient.usedUnit || ingredient.unit || ingredient.packageUnit || 'stk';
        if (!(sourceQty > 0)) continue;
        const baseQty = canonicalQuantity(sourceQty, sourceUnit) * factor;
        const baseUnit = canonicalUnit(sourceUnit);
        const packageQuantity = num(ingredient.packageQuantity ?? ingredient.packageSize) || 1;
        const packageUnit = ingredient.packageUnit || ingredient.unit || sourceUnit;
        const packageBaseQuantity = canonicalQuantity(packageQuantity, packageUnit);
        const packagePrice = num(ingredient.packagePrice ?? ingredient.price);
        const current = merged.get(key) || {
          key,
          name: ingredient.productName || ingredientName(ingredient),
          ingredientName: ingredientName(ingredient),
          totalNeed: 0,
          unit: baseUnit,
          category: ingredient.category || 'Dagligvare',
          recipeNames: new Set(),
          packagePrice,
          packageQuantity: packageBaseQuantity,
          packageUnit: canonicalUnit(packageUnit),
          store: ingredient.store || '',
          kassalProductId: ingredient.productId || ingredient.kassalProductId || null,
          ean: ingredient.ean || '',
          source: 'mealplan-generated'
        };
        if (!PricingEngine.compatibleUnits(current.unit, baseUnit)) continue;
        current.totalNeed += baseQty;
        current.recipeNames.add(recipe.name);
        if (!(current.packagePrice > 0) && packagePrice > 0) current.packagePrice = packagePrice;
        if (!(current.packageQuantity > 0) && packageBaseQuantity > 0) current.packageQuantity = packageBaseQuantity;
        merged.set(key, current);
      }
    }
    return [...merged.values()].map(item => ({ ...item, totalNeed: round(item.totalNeed) }));
  }

  function pantryItemBaseQuantity(stock, targetUnit) {
    if (!PricingEngine.compatibleUnits(stock?.unit, targetUnit)) return 0;
    const quantity = num(stock?.quantity);
    if (!(quantity > 0)) return 0;
    const packageSize = num(stock?.packageSize ?? stock?.packageQuantity);
    const packageUnit = stock?.packageUnit || stock?.unit;
    // API products in Matlager store quantity as number of packages.
    if ((stock?.kassalProductId || stock?.ean) && packageSize > 0) {
      return canonicalQuantity(quantity * packageSize, packageUnit);
    }
    return canonicalQuantity(quantity, stock?.unit);
  }

  function pantryMatches(item, stock) {
    if (item?.ean && stock?.ean && String(item.ean) === String(stock.ean)) return true;
    if (item?.kassalProductId && stock?.kassalProductId && String(item.kassalProductId) === String(stock.kassalProductId)) return true;
    return normalizedIngredientName(item) === normalizedIngredientName(stock) || norm(item?.name) === norm(stock?.name);
  }

  function pantryQuantity(item, pantry) {
    return (pantry || [])
      .filter(stock => pantryMatches(item, stock))
      .reduce((sum, stock) => sum + pantryItemBaseQuantity(stock, item.unit), 0);
  }


  function matchingPantryItems(item, pantry) {
    return (pantry || []).filter(stock => pantryMatches(item, stock));
  }

  function shoppingNeed(item, pantry) {
    const requested = Math.max(0, num(item?.quantity ?? item?.requiredQuantity ?? item?.totalNeed));
    const exactProduct = Boolean(item?.ean || item?.kassalProductId || item?.productId);
    const matches = matchingPantryItems(item, pantry);
    let inStock = 0;
    let unit = item?.unit || item?.requiredUnit || item?.packageUnit || 'stk';

    if (exactProduct) {
      // Explicit product additions represent package counts in the shopping flow.
      inStock = matches.reduce((sum, stock) => sum + Math.max(0, num(stock?.quantity)), 0);
      unit = requested === 1 ? 'pakke' : 'pakker';
    } else {
      const unitFactor = Math.max(0.000001, canonicalQuantity(1, unit));
      const stockBase = pantryQuantity(item, pantry);
      inStock = stockBase / unitFactor;
    }

    const remaining = Math.max(0, requested - inStock);
    const state = inStock <= 0 ? 'ADD_FULL' : remaining > 0 ? 'ADD_REMAINDER' : 'CONFIRM_ALREADY_STOCKED';
    return { state, requested:round(requested), inStock:round(inStock), remaining:round(remaining), unit, matches };
  }

  function applyPantry(items, pantry) {
    return (items || []).map(item => {
      const inStock = pantryQuantity(item, pantry);
      const required = Math.max(0, num(item.totalNeed ?? item.quantity) - inStock);
      const packageQuantity = num(item.packageQuantity) || 1;
      const packageCount = required > 0 ? Math.ceil(required / packageQuantity) : 0;
      const purchaseQuantity = packageCount * packageQuantity;
      const leftoverAfterPurchase = Math.max(0, purchaseQuantity - required);
      const price = num(item.packagePrice) > 0 ? num(item.packagePrice) * packageCount : 0;
      return {
        ...item,
        inStock: round(inStock),
        required: round(required),
        packageCount,
        purchaseQuantity: round(purchaseQuantity),
        leftoverAfterPurchase: round(leftoverAfterPurchase),
        price: Number(price.toFixed(2))
      };
    }).filter(item => item.required > 0);
  }

  function buildGeneratedRecords(plans, recipes, pantry, options = {}) {
    const purchaseDate = options.purchaseDate || new Date().toISOString().slice(0, 10);
    return applyPantry(mergeMealPlanIngredients(plans, recipes), pantry).map(item => ({
      name: item.name,
      quantity: item.required,
      unit: item.unit,
      totalNeed: item.totalNeed,
      inStock: item.inStock,
      requiredQuantity: item.required,
      requiredUnit: item.unit,
      packageCount: item.packageCount,
      packageSize: item.packageQuantity,
      packageUnit: item.packageUnit,
      purchaseQuantity: item.purchaseQuantity,
      leftoverAfterPurchase: item.leftoverAfterPurchase,
      category: item.category,
      recipe: [...item.recipeNames].join(', '),
      price: item.price,
      packagePrice: item.packagePrice,
      atHome: false,
      checked: false,
      purchaseDate,
      store: item.store,
      kassalProductId: item.kassalProductId,
      ean: item.ean,
      source: item.source,
      createdAt: options.createdAt || new Date().toISOString()
    }));
  }

  function quantityDisplay(item) {
    const required = `${round(item?.requiredQuantity ?? item?.quantity)} ${item?.requiredUnit || item?.unit || ''}`.trim();
    if (num(item?.packageCount) > 0 && num(item?.packageSize) > 0) {
      return `Behov ${required} · kjøp ${item.packageCount} ${item.packageCount === 1 ? 'pakke' : 'pakker'} à ${round(item.packageSize)} ${item.packageUnit || item.unit || ''}`;
    }
    return required;
  }

  function summary(items) {
    const pricing = PricingEngine.shoppingSummary(items || []);
    const categories = new Set((items || []).map(item => item.category).filter(Boolean));
    return {
      ...pricing,
      totalCount: (items || []).length,
      categoryCount: categories.size,
      packageCount: (items || []).reduce((sum,item)=>sum+num(item.packageCount || 0),0),
      atHomeCount: (items || []).filter(item => item.atHome).length,
      checkedCount: (items || []).filter(item => item.checked && !item.atHome).length,
      openCount: (items || []).filter(item => !item.atHome && !item.checked).length
    };
  }

  function expenseRecord(item, itemId, existing = null, today = new Date().toISOString().slice(0,10)) {
    const shouldBook = Boolean(item?.checked && !item?.atHome && num(item?.price) > 0);
    if (!shouldBook) return null;
    return {
      ...(existing || {}),
      description: `Handleliste: ${item.name}`,
      amount: num(item.price),
      dueDate: item.purchaseDate || today,
      category: 'Mat',
      frequency: 'Engangs',
      status: 'Betalt',
      automatic: false,
      type: 'Engangs',
      note: `Automatisk bokført fra handlelisten${item.recipe ? ` · ${item.recipe}` : ''}`,
      shoppingItemId: Number(itemId),
      source: 'shopping-list',
      updatedAtSystem: new Date().toISOString()
    };
  }

  const api = { normalizedIngredientName, productKey, findRecipe, canonicalQuantity, canonicalUnit, mergeMealPlanIngredients, pantryItemBaseQuantity, pantryQuantity, pantryMatches, matchingPantryItems, shoppingNeed, applyPantry, buildGeneratedRecords, quantityDisplay, summary, expenseRecord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ShoppingEngine = api;
})();
