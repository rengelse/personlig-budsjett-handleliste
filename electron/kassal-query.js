'use strict';

const DEFAULT_BASE_URL = 'https://kassal.app/api/v1/';

function cleanBaseUrl(value) {
  const url = new URL(String(value || DEFAULT_BASE_URL));
  if (url.protocol !== 'https:' || url.hostname !== 'kassal.app') {
    throw new Error('Base URL må bruke https://kassal.app/.');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function buildProductQuery(params = {}) {
  const q = new URLSearchParams();
  const allowedText = ['search', 'sort', 'vendor', 'brand', 'category', 'store'];
  allowedText.forEach(key => {
    if (params[key] !== undefined && String(params[key]).trim() !== '') q.set(key, String(params[key]).trim());
  });
  ['has_labels', 'excl_allergens', 'incl_allergens'].forEach(key => {
    const values = Array.isArray(params[key]) ? params[key] : [];
    values
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .forEach(value => q.append(`${key}[]`, value));
  });

  const categoryId = Number(params.category_id);
  if (Number.isInteger(categoryId) && categoryId > 0) q.set('category_id', String(categoryId));

  const priceMin = Number(params.price_min);
  if (params.price_min !== undefined && params.price_min !== '' && Number.isFinite(priceMin) && priceMin >= 0) {
    q.set('price_min', String(priceMin));
  }

  const priceMax = Number(params.price_max);
  if (params.price_max !== undefined && params.price_max !== '' && Number.isFinite(priceMax) && priceMax >= 0) {
    q.set('price_max', String(priceMax));
  }

  const requestedSize = Number(params.size || 24);
  const size = Number.isFinite(requestedSize) ? Math.min(100, Math.max(1, Math.trunc(requestedSize))) : 24;
  q.set('size', String(size));

  q.set('unique', params.unique === true ? '1' : '0');
  if (params.exclude_without_ean !== undefined) {
    q.set('exclude_without_ean', params.exclude_without_ean === true ? '1' : '0');
  }
  return q;
}

function extractNextUrl(payload) {
  return payload?.links?.next || payload?.meta?.next_page_url || payload?.next_page_url || null;
}

module.exports = { DEFAULT_BASE_URL, cleanBaseUrl, buildProductQuery, extractNextUrl };
