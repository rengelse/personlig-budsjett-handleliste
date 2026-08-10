(() => {
  'use strict';

  const number = value => Number(value || 0);

  function storeName(code, stores = []) {
    const found=(stores||[]).find(([value])=>String(value)===String(code));
    return found?.[1] || code || 'Ukjent butikk';
  }

  function productMetaMap(products = []) {
    const map=new Map();
    for(const product of products){
      const ean=String(product?.ean||'').trim();
      if(!ean)continue;
      const old=map.get(ean)||{};
      map.set(ean,{
        ean,
        id:product.id||old.id||null,
        name:product.eName||product.name||old.name||'Ukjent produkt',
        brand:product.brand||old.brand||'',
        image:product.image||old.image||'',
        category:product.category||old.category||'',
        packageSize:number(product.packageSize||product.weight)||old.packageSize||0,
        unit:product.unit||product.weight_unit||old.unit||''
      });
    }
    return map;
  }

  function changesFromBulk(payload, products = [], options = {}) {
    const direction=options.direction==='up'?'up':'down';
    const storeLabels=options.storeLabels||[];
    const meta=productMetaMap(products);
    const rows=Array.isArray(payload?.data)?payload.data:[];
    const out=[];

    for(const row of rows){
      const ean=String(row?.ean||'');
      const product=meta.get(ean)||{
        ean,
        name:row?.name||'Ukjent produkt',
        brand:'',
        image:'',
        category:'',
        packageSize:number(row?.weight),
        unit:row?.weight_unit||''
      };
      const history=Array.isArray(row?.price_history)?row.price_history:[];
      const stores=Array.isArray(row?.stores)?row.stores:[];

      for(const current of stores){
        const code=String(current?.store||'');
        const currentPrice=number(current?.current_price);
        if(!code || !(currentPrice>0))continue;

        const points=history
          .filter(x=>String(x?.store||'')===code && number(x?.price)>0 && x?.date)
          .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
        if(!points.length)continue;

        // Baseline = earliest observed price in requested window.
        // This avoids inventing a value for a date with no observation.
        const baseline=points[0];
        const oldPrice=number(baseline.price);
        if(!(oldPrice>0))continue;

        const diff=Number((currentPrice-oldPrice).toFixed(2));
        if(Math.abs(diff)<0.01)continue;
        if(direction==='down' && diff>=0)continue;
        if(direction==='up' && diff<=0)continue;

        const percent=Number(((diff/oldPrice)*100).toFixed(1));
        const changeDate=[...points].reverse().find(point=>Math.abs(number(point.price)-oldPrice)>=0.01)?.date || points.at(-1)?.date || baseline.date;

        out.push({
          ...product,
          storeCode:code,
          store:storeName(code,storeLabels),
          oldPrice,
          currentPrice,
          diff,
          percent,
          baselineDate:baseline.date,
          changeDate
        });
      }
    }
    return out;
  }

  function filterAndSort(items = [], filters = {}) {
    let rows=[...items];
    const search=String(filters.search||'').trim().toLocaleLowerCase('nb-NO');
    if(search)rows=rows.filter(x=>[x.name,x.brand,x.store,x.category].some(v=>String(v||'').toLocaleLowerCase('nb-NO').includes(search)));
    if(filters.store)rows=rows.filter(x=>x.storeCode===filters.store);
    if(filters.category)rows=rows.filter(x=>String(x.category||'')===String(filters.category));
    const minAbs=number(filters.minChange);
    if(minAbs>0)rows=rows.filter(x=>Math.abs(number(x.diff))>=minAbs);
    const minPct=number(filters.minPercent);
    if(minPct>0)rows=rows.filter(x=>Math.abs(number(x.percent))>=minPct);
    const maxPrice=number(filters.maxPrice);
    if(maxPrice>0)rows=rows.filter(x=>number(x.currentPrice)<=maxPrice);

    switch(filters.sort){
      case 'pct': rows.sort((a,b)=>Math.abs(number(b.percent))-Math.abs(number(a.percent))); break;
      case 'price_asc': rows.sort((a,b)=>number(a.currentPrice)-number(b.currentPrice)); break;
      case 'price_desc': rows.sort((a,b)=>number(b.currentPrice)-number(a.currentPrice)); break;
      case 'date': rows.sort((a,b)=>String(b.changeDate||'').localeCompare(String(a.changeDate||''))); break;
      default: rows.sort((a,b)=>Math.abs(number(b.diff))-Math.abs(number(a.diff))); break;
    }
    return rows;
  }

  const api={changesFromBulk,filterAndSort,productMetaMap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.PriceChangeEngine=api;
})();