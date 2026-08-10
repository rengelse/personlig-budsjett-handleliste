const dns = require('dns/promises');
const net = require('net');

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/');
}

function stripHtml(value = '') {
  return decodeHtmlEntities(String(value).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function isPrivateIp(address) {
  if (!address) return true;
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

async function validatePublicUrl(input) {
  let url;
  try { url = new URL(String(input || '').trim()); } catch { throw new Error('Ugyldig nettadresse.'); }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new Error('Bare HTTP- og HTTPS-adresser støttes.');
  if (!url.hostname || url.hostname === 'localhost') throw new Error('Lokale adresser er ikke tillatt.');
  const results = await dns.lookup(url.hostname, { all: true });
  if (!results.length || results.some(item => isPrivateIp(item.address))) throw new Error('Adressen peker til et lokalt eller privat nettverk.');
  return url;
}

function typeIncludesRecipe(value) {
  const types = Array.isArray(value) ? value : [value];
  return types.some(type => String(type || '').toLowerCase().split('/').pop() === 'recipe');
}

function findRecipeNode(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findRecipeNode(item); if (found) return found; }
    return null;
  }
  if (typeof value !== 'object') return null;
  if (typeIncludesRecipe(value['@type'])) return value;
  if (value['@graph']) { const found = findRecipeNode(value['@graph']); if (found) return found; }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') { const found = findRecipeNode(child); if (found) return found; }
  }
  return null;
}

function extractJsonLdScripts(html) {
  const scripts = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) scripts.push(match[1].trim());
  return scripts;
}

function parseRecipeJsonLd(html) {
  const errors = [];
  for (const raw of extractJsonLdScripts(html)) {
    const candidates = [raw, decodeHtmlEntities(raw)];
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate.replace(/^\s*<!--|-->\s*$/g, ''));
        const recipe = findRecipeNode(parsed);
        if (recipe) return recipe;
      } catch (error) { errors.push(error.message); }
    }
  }
  throw new Error(errors.length ? 'Fant strukturert data, men ingen gyldig Recipe-oppføring.' : 'Nettsiden inneholder ikke støttet Recipe/JSON-LD-data.');
}

function imageUrl(image) {
  if (Array.isArray(image)) return imageUrl(image[0]);
  if (typeof image === 'string') return image;
  if (image && typeof image === 'object') return image.url || image.contentUrl || '';
  return '';
}

function isoDurationToText(value) {
  const raw = String(value || '').trim();
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(raw);
  if (!match) return stripHtml(raw);
  const parts = [];
  if (Number(match[1])) parts.push(`${Number(match[1])} d`);
  if (Number(match[2])) parts.push(`${Number(match[2])} t`);
  if (Number(match[3])) parts.push(`${Number(match[3])} min`);
  if (Number(match[4]) && !parts.length) parts.push(`${Number(match[4])} sek`);
  return parts.join(' ');
}

function instructionText(value) {
  if (!value) return [];
  if (typeof value === 'string') return [stripHtml(value)];
  if (Array.isArray(value)) return value.flatMap(instructionText).filter(Boolean);
  if (typeof value === 'object') {
    if (Array.isArray(value.itemListElement)) return instructionText(value.itemListElement);
    return instructionText(value.text || value.name || value.description || '');
  }
  return [];
}

const UNIT_MAP = new Map([
  ['g','g'],['gram','g'],['grams','g'],['kg','kg'],['kilogram','kg'],
  ['ml','ml'],['milliliter','ml'],['dl','dl'],['cl','cl'],['l','l'],['liter','l'],
  ['stk','stk'],['stykk','stk'],['stykke','stk'],['pk','stk'],['pakke','stk'],['pakker','stk'],
  ['boks','stk'],['bokser','stk'],['beger','stk'],['pose','stk'],['poser','stk'],
  ['ss','ss'],['spiseskje','ss'],['ts','ts'],['teskje','ts']
]);

function parseFraction(value) {
  const raw = String(value || '').trim().replace(',', '.');
  if (/^\d+\s+\d+\/\d+$/.test(raw)) {
    const [whole, fraction] = raw.split(/\s+/); const [a,b] = fraction.split('/').map(Number); return Number(whole) + a / b;
  }
  if (/^\d+\/\d+$/.test(raw)) { const [a,b] = raw.split('/').map(Number); return b ? a / b : 0; }
  const unicode = {'½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,'⅛':0.125};
  if (unicode[raw]) return unicode[raw];
  const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : 0;
}

function parseIngredientLine(line) {
  const originalText = stripHtml(line);
  const match = /^(?:(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[½¼¾⅓⅔⅛])\s*)?(?:(g|gram|kg|kilogram|ml|dl|cl|l|liter|stk|stykk|stykke|pk|pakke|pakker|boks|bokser|beger|pose|poser|ss|spiseskje|ts|teskje)\b\s*)?(.*)$/i.exec(originalText);
  const quantity = parseFraction(match?.[1]);
  const rawUnit = String(match?.[2] || '').toLowerCase();
  const unit = UNIT_MAP.get(rawUnit) || (quantity ? 'stk' : '');
  const ingredientName = stripHtml(match?.[3] || originalText).replace(/^av\s+/i, '').trim();
  return {
    ingredientName: ingredientName || originalText,
    productName: '', productId: null, ean: '', brand: '', store: '', image: '',
    usedQuantity: quantity || 0, usedUnit: unit || 'stk',
    packagePrice: 0, packageQuantity: quantity || 1, packageUnit: unit || 'stk',
    cost: 0, originalText, matchStatus: 'unmatched'
  };
}

function mapCategory(value) {
  const raw = (Array.isArray(value) ? value[0] : value) || '';
  const text = String(raw).toLowerCase();
  if (/frokost|breakfast/.test(text)) return 'Frokost';
  if (/lunsj|lunch/.test(text)) return 'Lunsj';
  if (/middag|dinner|hovedrett|main/.test(text)) return 'Middag';
  if (/dessert/.test(text)) return 'Dessert';
  if (/bakst|baking|bread|cake/.test(text)) return 'Bakst';
  if (/snack/.test(text)) return 'Snack';
  return 'Annet';
}

function normalizeRecipe(node, sourceUrl) {
  const rawIngredients = Array.isArray(node.recipeIngredient) ? node.recipeIngredient : Array.isArray(node.ingredients) ? node.ingredients : [];
  const yields = Array.isArray(node.recipeYield) ? node.recipeYield.join(' ') : String(node.recipeYield || '');
  const servingsMatch = yields.match(/\d+(?:[.,]\d+)?/);
  const instructions = instructionText(node.recipeInstructions);
  const totalTime = isoDurationToText(node.totalTime) || [isoDurationToText(node.prepTime), isoDurationToText(node.cookTime)].filter(Boolean).join(' + ');
  return {
    name: stripHtml(node.name || ''),
    description: stripHtml(node.description || ''),
    category: mapCategory(node.recipeCategory || node.recipeCuisine),
    servings: servingsMatch ? Math.max(1, Number(servingsMatch[0].replace(',', '.'))) : 2,
    time: totalTime,
    ingredients: rawIngredients.map(parseIngredientLine),
    instructions: instructions.map((step, index) => `${index + 1}. ${step}`).join('\n\n'),
    tags: [...new Set([...(Array.isArray(node.keywords) ? node.keywords : String(node.keywords || '').split(',')), ...(Array.isArray(node.recipeCategory) ? node.recipeCategory : [node.recipeCategory])].map(stripHtml).filter(Boolean))],
    allergens: [], favorite: false, price: 0, pricePerServing: 0,
    image: imageUrl(node.image), sourceUrl, sourceName: (() => { try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { return ''; } })(),
    importedAt: new Date().toISOString(), importFormat: 'schema.org/Recipe JSON-LD'
  };
}

async function importRecipeFromUrl(input) {
  const url = await validatePublicUrl(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 PersonligBudsjettRecipeImporter/1.0' }
    });
    if (!response.ok) throw new Error(`Nettsiden svarte ${response.status}.`);
    await validatePublicUrl(response.url);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_HTML_BYTES) throw new Error('Nettsiden er for stor til å importeres.');
    const html = await response.text();
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) throw new Error('Nettsiden er for stor til å importeres.');
    const node = parseRecipeJsonLd(html);
    const recipe = normalizeRecipe(node, response.url || url.href);
    if (!recipe.name) throw new Error('Oppskriften mangler navn.');
    if (!recipe.ingredients.length) throw new Error('Oppskriften inneholder ingen ingredienser.');
    return { ok: true, recipe, diagnostics: { ingredientCount: recipe.ingredients.length, instructionCount: instructionText(node.recipeInstructions).length, format: recipe.importFormat } };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Importen brukte for lang tid og ble avbrutt.');
    throw error;
  } finally { clearTimeout(timeout); }
}

module.exports = { importRecipeFromUrl, parseRecipeJsonLd, normalizeRecipe, parseIngredientLine, isoDurationToText, findRecipeNode };
