(() => {
  'use strict';

  function number(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (Array.isArray(value)) return number(value[0]?.price ?? value[0]?.unit_price ?? value[0]);
    if (typeof value === 'object') return number(value.price ?? value.current_price ?? value.unit_price ?? value.amount ?? value.value);
    return 0;
  }

  function normalizeUnit(unit) {
    const raw = String(unit || '').trim().toLocaleLowerCase('nb-NO');
    if (['kg','kilogram','kilograms'].includes(raw)) return 'kg';
    if (['g','gram','grams'].includes(raw)) return 'g';
    if (['l','liter','litre'].includes(raw)) return 'l';
    if (['dl','desiliter'].includes(raw)) return 'dl';
    if (['ml','milliliter'].includes(raw)) return 'ml';
    if (['stk','stk.','stykk','piece','pcs','pk','pakke','boks','beger','pose'].includes(raw)) return 'stk';
    return raw || 'stk';
  }

  function baseQuantity(quantity, unit) {
    const amount = number(quantity);
    const normalized = normalizeUnit(unit);
    if (normalized === 'kg' || normalized === 'l') return amount * 1000;
    if (normalized === 'dl') return amount * 100;
    return amount;
  }

  function compatibleUnits(a, b) {
    const one = normalizeUnit(a), two = normalizeUnit(b);
    const weight = new Set(['g','kg']);
    const volume = new Set(['ml','dl','l']);
    return one === two || (weight.has(one) && weight.has(two)) || (volume.has(one) && volume.has(two));
  }

  function extractProductPrice(product) {
    const current = product?.current_price;
    return number(current)
      || number(current?.price)
      || number(current?.[0]?.price)
      || number(product?.price)
      || number(product?.price_history?.[0]?.price);
  }

  function extractUnitPrice(product) {
    const current = product?.current_price;
    return number(product?.current_unit_price)
      || number(product?.unit_price)
      || number(current?.unit_price)
      || number(current?.[0]?.unit_price);
  }

  function normalizeProducts(payload, adapters = {}) {
    const data = payload?.data ?? payload;
    const parent = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    const rawList = Array.isArray(data)
      ? data
      : (Array.isArray(parent?.products)
        ? parent.products
        : (Array.isArray(payload?.products) ? payload.products : (parent ? [parent] : [])));
    const list = Array.isArray(rawList) ? rawList : [];
    const imageFn = adapters.normalizeImage || (value => value || '');
    const dateFn = adapters.normalizeDate || (value => value?.date || value?.datetime || value?.value || value || '');
    return list.map(raw => {
      const merged = parent && Array.isArray(parent.products)
        ? { ...raw, ean: raw.ean || parent.ean || '', allergens: raw.allergens || parent.allergens || [], nutrition: raw.nutrition || parent.nutrition || [] }
        : raw;
      raw = merged;
      const stores = Array.isArray(raw.store) ? raw.store.filter(Boolean) : [raw.store].filter(Boolean);
      const categories = Array.isArray(raw.category) ? raw.category.filter(Boolean) : [raw.category].filter(Boolean);
      const primaryStore = stores[0] || {};
      const deepestCategory = [...categories].sort((a,b)=>number(b?.depth)-number(a?.depth))[0] || {};
      return {
        id: raw.id,
        eName: raw.name || 'Ukjent produkt',
        ean: raw.ean || '',
        brand: raw.brand || '',
        vendor: raw.vendor || '',
        image: imageFn(raw.image),
        price: extractProductPrice(raw),
        unitPrice: extractUnitPrice(raw),
        unitPriceUnit: raw.current_unit_price_unit || raw.weight_unit || '',
        store: primaryStore.name || primaryStore.code || '',
        storeCode: primaryStore.code || '',
        stores,
        unit: normalizeUnit(raw.weight_unit || 'stk'),
        packageSize: number(raw.weight) || 1,
        category: deepestCategory.name || '',
        categoryId: deepestCategory.id || '',
        categories,
        labels: Array.isArray(raw.labels) ? raw.labels : [],
        allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
        nutrition: Array.isArray(raw.nutrition) ? raw.nutrition : [],
        ingredients: raw.ingredients || '',
        updatedAt: dateFn(raw.updated_at),
        url: raw.url || '',
        raw
      };
    });
  }

  function ingredientCost(item) {
    const packagePrice = number(item?.packagePrice ?? item?.price);
    const packageQty = baseQuantity(item?.packageQuantity ?? item?.packageSize, item?.packageUnit ?? item?.unit);
    const usedQty = baseQuantity(item?.usedQuantity ?? item?.quantity, item?.usedUnit ?? item?.unit);
    if (!(packagePrice > 0) || !(packageQty > 0) || !(usedQty > 0)) return 0;
    if (!compatibleUnits(item?.packageUnit ?? item?.unit, item?.usedUnit ?? item?.unit)) return 0;
    return packagePrice * usedQty / packageQty;
  }

  function recipeCost(ingredients, servings = 1) {
    const total = (ingredients || []).reduce((sum, item) => sum + ingredientCost(item), 0);
    const count = Math.max(1, number(servings) || 1);
    return { total: Number(total.toFixed(2)), perServing: Number((total / count).toFixed(2)) };
  }

  function unitCost(product) {
    const quantity = baseQuantity(product?.packageSize ?? product?.packageQuantity, product?.unit ?? product?.packageUnit);
    return quantity > 0 ? number(product?.price ?? product?.packagePrice) / quantity : Infinity;
  }

  function cheapestCompatible(products, ingredient) {
    return (products || [])
      .filter(product => number(product?.price ?? product?.packagePrice) > 0)
      .filter(product => compatibleUnits(product?.unit ?? product?.packageUnit, ingredient?.usedUnit ?? ingredient?.unit))
      .sort((a,b) => unitCost(a) - unitCost(b))[0] || null;
  }

  function sum(items, selector) { return (items || []).reduce((acc, item) => acc + number(selector ? selector(item) : item), 0); }
  function shoppingSummary(items) {
    const relevant = (items || []).filter(item => !item.atHome);
    const byStore = new Map();
    relevant.forEach(item => {
      const store = item.store || 'Ikke valgt';
      byStore.set(store, (byStore.get(store) || 0) + number(item.price));
    });
    return {
      estimated: sum(relevant, item => item.price),
      purchased: sum(relevant.filter(item => item.checked), item => item.price),
      remainingCount: relevant.filter(item => !item.checked).length,
      byStore: [...byStore.entries()].map(([store, value]) => ({ store, value })).sort((a,b)=>b.value-a.value)
    };
  }

  function recipeSummary(recipes) {
    const priced = (recipes || []).map(recipe => ({
      name: recipe.name,
      total: number(recipe.price),
      servings: Math.max(1, number(recipe.servings) || 1)
    })).filter(recipe => recipe.total > 0);
    return {
      priced,
      averagePerServing: priced.length ? sum(priced, recipe => recipe.total / recipe.servings) / priced.length : 0,
      byPerServingDesc: [...priced].sort((a,b)=>(b.total/b.servings)-(a.total/a.servings))
    };
  }

  async function enrichProducts(products, dependencies = {}) {
    const enriched = (products || []).map(product => ({ ...product }));
    const missing = enriched.filter(product => !(number(product.price) > 0));
    if (!missing.length) return enriched;
    const cached = dependencies.cached;
    const pricesBulk = dependencies.pricesBulk;
    const getProductById = dependencies.getProductById;
    const normalize = dependencies.normalize || normalizeProducts;
    const byEan = new Map(missing.filter(product => product.ean).map(product => [String(product.ean), product]));
    const eans = [...byEan.keys()];
    if (pricesBulk) {
      for (let offset = 0; offset < eans.length; offset += 100) {
        const chunk = eans.slice(offset, offset + 100);
        try {
          const load = () => pricesBulk({ eans: chunk, days: 1, aggregation: 'min' });
          const payload = cached ? await cached(`kassal-prices-bulk-v3:${chunk.join(',')}`, 30*60*1000, load) : await load();
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          rows.forEach(row => {
            const product = byEan.get(String(row?.ean || ''));
            if (!product) return;
            const best = (Array.isArray(row?.stores) ? row.stores : [])
              .map(store => ({ store, price:number(store?.current_price), unitPrice:number(store?.current_unit_price) }))
              .filter(entry => entry.price > 0)
              .sort((a,b)=>a.price-b.price)[0];
            if (!best) return;
            product.price = best.price;
            product.unitPrice = best.unitPrice || product.unitPrice || 0;
            product.unitPriceUnit = best.store?.current_unit_price_unit || product.unitPriceUnit || product.unit;
            product.store = best.store?.name || best.store?.store || product.store;
            product.storeCode = best.store?.store || product.storeCode;
            if (number(row?.weight) > 0) product.packageSize = number(row.weight);
            if (row?.weight_unit) product.unit = normalizeUnit(row.weight_unit);
          });
        } catch (error) { console.warn('Kunne ikke hente bulkpriser fra Kassalapp', error); }
      }
    }
    if (getProductById) {
      for (const product of enriched.filter(item => !(number(item.price) > 0) && item.id)) {
        try {
          const load = () => getProductById(product.id);
          const payload = cached ? await cached(`kassal-product-price-v3:${product.id}`, 30*60*1000, load) : await load();
          const detailed = normalize(payload)[0];
          if (detailed && number(detailed.price) > 0) Object.assign(product, detailed);
        } catch (error) { console.warn(`Kunne ikke hente detaljpris for produkt ${product.id}`, error); }
      }
    }
    return enriched;
  }

  const api = { number, normalizeUnit, baseQuantity, compatibleUnits, extractProductPrice, extractUnitPrice, normalizeProducts, ingredientCost, recipeCost, unitCost, cheapestCompatible, shoppingSummary, recipeSummary, enrichProducts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.PricingEngine = api;
})();
