const { app, BrowserWindow, ipcMain, dialog, safeStorage , shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const zlib = require('zlib');
const http = require('http');
const os = require('os');
const { DEFAULT_BASE_URL, cleanBaseUrl, buildProductQuery, extractNextUrl } = require('./kassal-query');
const { parseKassalWeeklyHtml } = require('./kassal-weekly-parser');
const { importRecipeFromUrl } = require('./recipe-import');

const QRCodeMatrix = require('./vendor/QRCode');
const QRErrorCorrectLevel = require('./vendor/QRCode/QRErrorCorrectLevel');

function createQrSvgDataUrl(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('QR-innhold mangler.');
  const qr = new QRCodeMatrix(-1, QRErrorCorrectLevel.M);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  const cells = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) cells.push(`<rect x="${col + quiet}" y="${row + quiet}" width="1" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${cells.join('')}</g></svg>`;
  return svg;
}

const backupDir = () => path.join(app.getPath('userData'), 'backups');
const apiConfigPath = () => path.join(app.getPath('userData'), 'api-config.json');
let apiConfigCache = null;
let requestQueue = Promise.resolve();
const apiCalls = [];
const paginationUrls = new Map();

async function readApiConfig({ refresh = false } = {}) {
  if (apiConfigCache && !refresh) return { ...apiConfigCache };
  try {
    const raw = JSON.parse(await fs.readFile(apiConfigPath(), 'utf8'));
    let token = '';
    if (raw.token) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Sikker nøkkellagring er ikke tilgjengelig på dette systemet.');
      token = safeStorage.decryptString(Buffer.from(raw.token, 'base64'));
    }
    apiConfigCache = { enabled: raw.enabled !== false, baseUrl: cleanBaseUrl(raw.baseUrl), token };
  } catch (error) {
    if (error?.code !== 'ENOENT' && /Sikker nøkkellagring/.test(error?.message || '')) throw error;
    apiConfigCache = { enabled: false, baseUrl: DEFAULT_BASE_URL, token: '' };
  }
  return { ...apiConfigCache };
}

async function writeApiConfig(config) {
  const token = String(config.token || '');
  if (token && !safeStorage.isEncryptionAvailable()) {
    throw new Error('API-nøkkelen kan ikke lagres fordi Electron safeStorage ikke er tilgjengelig.');
  }
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const encoded = token ? safeStorage.encryptString(token).toString('base64') : '';
  const stored = { enabled: config.enabled !== false, baseUrl, token: encoded };
  await fs.writeFile(apiConfigPath(), JSON.stringify(stored, null, 2), 'utf8');
  apiConfigCache = { enabled: stored.enabled, baseUrl, token };
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function parseRetryAfter(response) {
  const raw = response.headers.get('retry-after');
  if (!raw) return 1500;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : 1500;
}

async function enterRateWindow() {
  while (true) {
    const now = Date.now();
    while (apiCalls.length && now - apiCalls[0] >= 60000) apiCalls.shift();
    if (apiCalls.length < 55) {
      apiCalls.push(now);
      return;
    }
    await wait(Math.max(250, 60000 - (now - apiCalls[0]) + 25));
  }
}

async function performKassalRequest(endpoint, options = {}, retryCount = 0) {
  const config = await readApiConfig();
  if (!config.enabled) throw new Error('Kassalapp API er deaktivert.');
  if (!config.token) throw new Error('API-nøkkel mangler.');
  await enterRateWindow();

  const target = new URL(String(endpoint).replace(/^\//, ''), config.baseUrl);
  if (target.protocol !== 'https:' || target.hostname !== 'kassal.app') throw new Error('API-kall til ukjent vert ble blokkert.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(target, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (response.status === 429 && retryCount < 1) {
      await wait(parseRetryAfter(response));
      return performKassalRequest(endpoint, options, retryCount + 1);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const error = new Error(response.status === 429 ? 'Rate limit nådd. Prøv igjen om litt.' : `Kassalapp svarte ${response.status}. ${body.slice(0, 180)}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Kassalapp-kallet brukte for lang tid og ble avbrutt.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function kassalRequest(endpoint, options = {}) {
  const operation = requestQueue.then(() => performKassalRequest(endpoint, options));
  requestQueue = operation.catch(() => {});
  return operation;
}


async function kassalPublicHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://kassal.app/api/v1/health', { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Kassalapp health svarte ${response.status}.`);
    return response.json().catch(() => ({ ok:true }));
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Kassalapp health brukte for lang tid.');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function paginatedProductRequest(params = {}) {
  const desiredPage = Math.max(1, Number(params.page || 1));
  const query = buildProductQuery(params);
  const cacheKey = query.toString();
  if (!paginationUrls.has(cacheKey)) paginationUrls.set(cacheKey, new Map([[1, `products?${cacheKey}`]]));
  const pageMap = paginationUrls.get(cacheKey);
  let currentPage = desiredPage;
  while (currentPage > 1 && !pageMap.has(currentPage)) currentPage -= 1;
  let payload = await kassalRequest(pageMap.get(currentPage));
  while (currentPage < desiredPage) {
    const nextUrl = extractNextUrl(payload);
    if (!nextUrl) break;
    currentPage += 1;
    pageMap.set(currentPage, nextUrl);
    payload = await kassalRequest(nextUrl);
  }
  return payload;
}

async function ensureBackupDir() { await fs.mkdir(backupDir(), { recursive: true }); }
function safeStamp() { return `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`; }
async function pruneBackups(retention = 14) {
  await ensureBackupDir();
  const keep = Math.min(365, Math.max(1, Number(retention || 14)));
  const files = (await fs.readdir(backupDir())).filter(x => x.endsWith('.json')).sort().reverse();
  await Promise.all(files.slice(keep).map(name => fs.unlink(path.join(backupDir(), name)).catch(() => {})));
}

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(__dirname, '..', 'src', 'assets', 'app-icon.png'),
    width: 1500, height: 950, minWidth: 1100, minHeight: 720,
    backgroundColor: '#0f172a', show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow = win;
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
}

ipcMain.handle('app:version', () => app.getVersion());

const UPDATE_PROVIDER={
  provider:'github',
  owner:'rengelse',
  repo:'Personlig-Budsjett-Releases'
};

autoUpdater.autoDownload=false;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.allowPrerelease=false;

let updateState={
  status:'idle',
  currentVersion:'',
  latestVersion:'',
  updateAvailable:false,
  releaseName:'',
  releaseNotes:'',
  error:''
};

function normalizeReleaseNotes(value){
  if(Array.isArray(value)){
    return value.map(item=>typeof item==='string'?item:String(item?.note||'')).filter(Boolean).join('\n');
  }
  return String(value||'');
}

function updatePayload(extra={}){
  return {
    ...updateState,
    currentVersion:app.getVersion(),
    provider:UPDATE_PROVIDER,
    ...extra
  };
}

function broadcastUpdate(extra={}){
  const payload=updatePayload(extra);
  for(const win of BrowserWindow.getAllWindows()){
    if(!win.isDestroyed())win.webContents.send('app:update:status',payload);
  }
  return payload;
}

autoUpdater.on('checking-for-update',()=>{
  updateState={...updateState,status:'checking',currentVersion:app.getVersion(),error:''};
  broadcastUpdate();
});

autoUpdater.on('update-available',info=>{
  updateState={
    ...updateState,
    status:'available',
    currentVersion:app.getVersion(),
    latestVersion:String(info?.version||''),
    updateAvailable:true,
    releaseName:String(info?.releaseName||`Personlig Budsjett v${info?.version||''}`),
    releaseNotes:normalizeReleaseNotes(info?.releaseNotes),
    error:''
  };
  broadcastUpdate();
});

autoUpdater.on('update-not-available',info=>{
  updateState={
    ...updateState,
    status:'current',
    currentVersion:app.getVersion(),
    latestVersion:String(info?.version||app.getVersion()),
    updateAvailable:false,
    releaseName:String(info?.releaseName||''),
    releaseNotes:normalizeReleaseNotes(info?.releaseNotes),
    error:''
  };
  broadcastUpdate();
});

autoUpdater.on('download-progress',progress=>{
  const percent=Math.max(0,Math.min(100,Number(progress?.percent||0)));
  updateState={
    ...updateState,
    status:'downloading',
    updateAvailable:true,
    downloadPercent:percent,
    transferred:Number(progress?.transferred||0),
    total:Number(progress?.total||0),
    error:''
  };
  broadcastUpdate();
});

autoUpdater.on('update-downloaded',info=>{
  updateState={
    ...updateState,
    status:'ready',
    latestVersion:String(info?.version||updateState.latestVersion||''),
    updateAvailable:true,
    downloadPercent:100,
    error:''
  };
  broadcastUpdate();
});

autoUpdater.on('error',error=>{
  updateState={...updateState,status:'error',error:String(error?.message||error||'Ukjent oppdateringsfeil')};
  broadcastUpdate();
});

ipcMain.handle('app:update:state',()=>updatePayload());

ipcMain.handle('app:update:check',async()=>{
  if(!app.isPackaged){
    updateState={
      ...updateState,
      status:'development',
      currentVersion:app.getVersion(),
      updateAvailable:false,
      error:''
    };
    return broadcastUpdate();
  }
  try{
    await autoUpdater.checkForUpdates();
    return updatePayload();
  }catch(error){
    updateState={...updateState,status:'error',error:String(error?.message||error||'Kunne ikke se etter oppdatering')};
    return broadcastUpdate();
  }
});

ipcMain.handle('app:update:download',async()=>{
  if(!app.isPackaged)throw new Error('Oppdatering kan bare installeres fra den installerte appen.');
  if(!updateState.updateAvailable)throw new Error('Ingen ny oppdatering er tilgjengelig.');
  updateState={...updateState,status:'downloading',downloadPercent:0,error:''};
  broadcastUpdate();
  try{
    await autoUpdater.downloadUpdate();
    return updatePayload();
  }catch(error){
    updateState={...updateState,status:'error',error:String(error?.message||error||'Kunne ikke laste ned oppdateringen')};
    broadcastUpdate();
    throw error;
  }
});

ipcMain.handle('app:update:install',()=>{
  if(updateState.status!=='ready')throw new Error('Oppdateringen er ikke ferdig nedlastet.');
  updateState={...updateState,status:'installing',error:''};
  broadcastUpdate();
  setImmediate(()=>autoUpdater.quitAndInstall(true,true));
  return {ok:true};
});


const MOBILE_TRANSFER_TIMEOUT_MS = 5 * 60 * 1000;
const MOBILE_TRANSFER_MAX_BODY = 256 * 1024;
let mobileTransferServer = null;
let mobileTransferSession = null;
let mobileTransferTimer = null;

function privateIpv4Score(address) {
  if (/^192\.168\./.test(address)) return 40;
  if (/^10\./.test(address)) return 30;
  const m = address.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return 20;
  return 0;
}

function localIpv4Candidates() {
  const result = [];
  const interfaces = os.networkInterfaces();
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.internal || entry.family !== 'IPv4') continue;
      const address = String(entry.address || '').trim();
      if (!address || /^169\.254\./.test(address)) continue;
      const nameLower = String(name || '').toLowerCase();
      let score = privateIpv4Score(address);
      if (/wi-?fi|wireless|wlan/.test(nameLower)) score += 50;
      if (/ethernet|lan/.test(nameLower)) score += 25;
      if (/vpn|virtual|vmware|hyper-v|vethernet|tailscale|zerotier|docker|wsl/.test(nameLower)) score -= 80;
      result.push({ name, address, score });
    }
  }
  return result.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function mobileTransferEmit(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mobile-transfer:status', payload);
}

function clearMobileTransferTimer() {
  if (mobileTransferTimer) clearTimeout(mobileTransferTimer);
  mobileTransferTimer = null;
}

function resetMobileTransferSession({ notify = false, reason = 'stopped' } = {}) {
  clearMobileTransferTimer();
  const hadSession = Boolean(mobileTransferSession);
  mobileTransferSession = null;
  if (notify && hadSession) mobileTransferEmit({ type: reason });
}

async function stopMobileTransferServer({ notify = false, reason = 'stopped' } = {}) {
  resetMobileTransferSession({ notify, reason });
  const server = mobileTransferServer;
  mobileTransferServer = null;
  if (!server?.listening) return;
  await new Promise(resolve => server.close(() => resolve()));
}

async function ensureMobileTransferServer() {
  if (mobileTransferServer?.listening) return mobileTransferServer;
  mobileTransferServer = http.createServer(async (req, res) => {
    try {
      const host = String(req.headers.host || '127.0.0.1');
      const url = new URL(req.url || '/', `http://${host}`);
      const match = url.pathname.match(/^\/pb\/(send|receive)\/([A-Za-z0-9_-]{12,80})$/);
      const session = mobileTransferSession;
      if (!match || !session || match[1] !== session.mode || match[2] !== session.token) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: false, error: 'Ugyldig eller utløpt mobiloverføring.' }));
        return;
      }
      if (Date.now() > session.expiresAt) {
        resetMobileTransferSession({ notify: true, reason: 'expired' });
        res.writeHead(410, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: false, error: 'Mobiloverføringen er utløpt.' }));
        return;
      }
      if (session.consumed) {
        res.writeHead(410, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: false, error: 'Mobiloverføringen er allerede brukt.' }));
        return;
      }

      if (session.mode === 'send' && req.method === 'GET') {
        session.consumed = true;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(session.payload));
        mobileTransferEmit({ type: 'sent', mode: 'send' });
        return;
      }

      if (session.mode === 'receive' && req.method === 'POST') {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MOBILE_TRANSFER_MAX_BODY) throw new Error('Handleturen er for stor.');
          chunks.push(chunk);
        }
        let payload;
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch (_) { throw new Error('Handleturen inneholder ugyldig JSON.'); }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Handleturen er ugyldig.');
        const version = Number(payload.v);
        if (version !== 1 && version !== 2) throw new Error(`PB2-versjon ${payload.v ?? 'mangler'} støttes ikke.`);
        if (!Array.isArray(payload.i)) throw new Error('Handleturen mangler varelinjer.');
        if (version === 2 && !String(payload.id || '').trim()) throw new Error('Handleturen mangler liste-ID.');
        session.consumed = true;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true }));
        mobileTransferEmit({ type: 'received', mode: 'receive', payload });
        return;
      }

      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: session.mode === 'send' ? 'GET' : 'POST' });
      res.end(JSON.stringify({ ok: false, error: 'Metoden støttes ikke.' }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: String(error?.message || error || 'Mobiloverføring feilet.') }));
    }
  });
  await new Promise((resolve, reject) => {
    const onError = error => { mobileTransferServer?.off('listening', onListening); reject(error); };
    const onListening = () => { mobileTransferServer?.off('error', onError); resolve(); };
    mobileTransferServer.once('error', onError);
    mobileTransferServer.once('listening', onListening);
    mobileTransferServer.listen(0, '0.0.0.0');
  });
  return mobileTransferServer;
}

async function startMobileTransferSession(mode, payload = null) {
  if (mode !== 'send' && mode !== 'receive') throw new Error('Ugyldig mobiloverføring.');
  if (mode === 'send' && (!payload || typeof payload !== 'object')) throw new Error('Handlelisten mangler.');
  const server = await ensureMobileTransferServer();
  const candidates = localIpv4Candidates();
  if (!candidates.length) throw new Error('Fant ingen lokal nettverksadresse. Koble PC-en til samme Wi-Fi/LAN som telefonen.');
  resetMobileTransferSession();
  const token = crypto.randomBytes(12).toString('base64url');
  const expiresAt = Date.now() + MOBILE_TRANSFER_TIMEOUT_MS;
  mobileTransferSession = { mode, token, payload, expiresAt, consumed: false };
  mobileTransferTimer = setTimeout(() => resetMobileTransferSession({ notify: true, reason: 'expired' }), MOBILE_TRANSFER_TIMEOUT_MS);
  const port = server.address().port;
  const address = candidates[0].address;
  return { mode, url: `http://${address}:${port}/pb/${mode}/${token}`, address, port, expiresAt };
}

ipcMain.handle('mobile-transfer:start-send', (_event, payload) => startMobileTransferSession('send', payload));
ipcMain.handle('mobile-transfer:start-receive', () => startMobileTransferSession('receive'));
ipcMain.handle('mobile-transfer:stop', async () => { await stopMobileTransferServer(); return { ok: true }; });

ipcMain.handle('qr:generate', (_event, value) => createQrSvgDataUrl(value));
ipcMain.handle('pb1:encode-shopping-list', (_event, payload = {}) => {
  const listId = String(payload.id || '').trim();
  const rows = Array.isArray(payload.i) ? payload.i : [];
  const items = rows.map(item => {
    const out = {
      i: String(item?.i || '').trim(),
      n: String(item?.n || '').trim(),
      q: Number(item?.q || 0),
      u: String(item?.u || '').trim(),
      c: String(item?.c || '').trim(),
      s: String(item?.s || '').trim()
    };
    const price = Number(item?.p);
    if (Number.isFinite(price) && price > 0) out.p = price;
    return out;
  }).filter(item => item.i && item.n);

  if (!listId) throw new Error('Handlelisten mangler ID.');
  if (!items.length) throw new Error('Handlelisten er tom.');
  const json = JSON.stringify({ v: 2, id: listId, i: items });
  const compressed = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
  return `PB1:${compressed.toString('base64url')}`;
});

ipcMain.handle('pb2:decode-shopping-trip', (_event, value) => {
  const raw = String(value || '').trim();
  if (!raw.startsWith('PB2:')) throw new Error('QR-koden er ikke en PB2-handletur.');
  const encoded = raw.slice(4).trim();
  if (!encoded) throw new Error('PB2-koden mangler innhold.');
  let payload;
  try {
    const json = zlib.gunzipSync(Buffer.from(encoded, 'base64url')).toString('utf8');
    payload = JSON.parse(json);
  } catch (_) {
    throw new Error('PB2-koden kunne ikke dekodes.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('PB2-dataene er ugyldige.');
  const version = Number(payload.v);
  if (version !== 1 && version !== 2) throw new Error(`PB2-versjon ${payload.v ?? 'mangler'} støttes ikke.`);
  if (!String(payload.id || '').trim()) throw new Error(version === 2 ? 'PB2-handleturen mangler liste-ID.' : 'PB2-handleturen mangler ID.');
  if (!Array.isArray(payload.i)) throw new Error('PB2-handleturen mangler gyldige varelinjer.');
  if (version === 2) {
    for (const item of payload.i) {
      if (!String(item?.i || '').trim() || !String(item?.n || '').trim()) throw new Error('PB2 v2 inneholder en ugyldig varelinje.');
    }
  }
  return payload;
});

ipcMain.handle('external:open', async (_event, value) => {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Ugyldig nettadresse.');
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('data:export', async (_event, payload) => {
  const result = await dialog.showSaveDialog({ title: 'Eksporter Personlig Budsjett', defaultPath: `personlig-budsjett-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { canceled: false, filePath: result.filePath };
});
ipcMain.handle('data:import', async () => {
  const result = await dialog.showOpenDialog({ title: 'Importer Personlig Budsjett', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const raw = await fs.readFile(result.filePaths[0], 'utf8');
  return { canceled: false, data: JSON.parse(raw), filePath: result.filePaths[0] };
});
ipcMain.handle('report:export', async (_event, payload) => {
  const result = await dialog.showSaveDialog({ title: 'Eksporter økonomirapport', defaultPath: `personlig-budsjett-rapport-${payload.period || new Date().toISOString().slice(0, 7)}.csv`, filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, '\ufeff' + payload.csv, 'utf8');
  return { canceled: false, filePath: result.filePath };
});
ipcMain.handle('backup:save', async (_event, request) => {
  const payload = request?.payload ?? request;
  const retention = request?.retention ?? 14;
  await ensureBackupDir();
  const fileName = `auto-backup-${safeStamp()}.json`;
  await fs.writeFile(path.join(backupDir(), fileName), JSON.stringify(payload, null, 2), 'utf8');
  await pruneBackups(retention);
  return { ok: true, fileName };
});
ipcMain.handle('backup:list', async () => {
  await ensureBackupDir();
  const names = (await fs.readdir(backupDir())).filter(x => x.endsWith('.json')).sort().reverse();
  return Promise.all(names.map(async name => { const stat = await fs.stat(path.join(backupDir(), name)); return { fileName: name, createdAt: stat.mtime.toISOString(), size: stat.size }; }));
});
ipcMain.handle('backup:restore', async (_event, fileName) => {
  const raw = await fs.readFile(path.join(backupDir(), path.basename(fileName)), 'utf8');
  return { data: JSON.parse(raw) };
});

ipcMain.handle('kassal:config:get', async () => {
  const config = await readApiConfig();
  return { enabled: config.enabled, baseUrl: config.baseUrl, hasToken: Boolean(config.token), maskedToken: config.token ? `••••••••${config.token.slice(-4)}` : '', encryptionAvailable: safeStorage.isEncryptionAvailable() };
});
ipcMain.handle('kassal:config:save', async (_event, config) => {
  const current = await readApiConfig();
  await writeApiConfig({ enabled: config.enabled, baseUrl: config.baseUrl, token: config.token || current.token });
  return { ok: true };
});
ipcMain.handle('kassal:config:clear-token', async () => { const current = await readApiConfig(); await writeApiConfig({ ...current, token: '' }); return { ok: true }; });
ipcMain.handle('kassal:test', async () => {
  const started = Date.now();
  let apiAvailable = true;
  try { await kassalPublicHealth(); } catch { apiAvailable = false; }
  const data = await paginatedProductRequest({ search: 'lettmelk', sort: 'price_asc', size: 1, page: 1 });
  return { ok: true, apiAvailable, tokenValid:true, ms: Date.now() - started, count: Array.isArray(data?.data) ? data.data.length : Array.isArray(data) ? data.length : 0, testedAt: new Date().toISOString() };
});


async function fetchKassalWeeklyList(kind='down', maxPages=30) {
  const pathName=kind==='up'?'prishopp':'nedsatt';
  const items=[],seen=new Set();
  let fetched=0;
  for(let page=1;page<=Math.max(1,Math.min(40,Number(maxPages)||30));page++){
    const url=`https://kassal.app/varer/${pathName}?sortering=diff_asc${page>1?`&page=${page}`:''}`;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    let response;
    try{
      response=await fetch(url,{signal:controller.signal,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 PersonligBudsjett/0.5'}});
    }finally{clearTimeout(timeout);}
    if(!response?.ok)throw new Error(`Kassalapp ukeliste svarte ${response?.status||'ukjent feil'}.`);
    const rows=parseKassalWeeklyHtml(await response.text());
    fetched++;
    let added=0;
    for(const row of rows){
      const key=`${row.ean}:${row.oldPrice}:${row.currentPrice}`;
      if(seen.has(key))continue;
      seen.add(key);items.push(row);added++;
    }
    if(!rows.length||added===0)break;
  }
  return {items,pagesFetched:fetched,source:`https://kassal.app/varer/${pathName}`};
}
ipcMain.handle('kassal:weekly-price-changes', async (_event, request={}) => {
  return fetchKassalWeeklyList(request?.kind==='up'?'up':'down',request?.maxPages||30);
});

ipcMain.handle('kassal:search-products', async (_event, params = {}) => paginatedProductRequest(params));
ipcMain.handle('kassal:product-id', async (_event, id) => kassalRequest(`products/id/${encodeURIComponent(id)}`));
ipcMain.handle('kassal:product-ean', async (_event, ean) => kassalRequest(`products/ean/${encodeURIComponent(String(ean).replace(/\D/g,''))}`));
ipcMain.handle('kassal:categories', async (_event, params = {}) => {
  const q = new URLSearchParams();
  ['parent_id', 'search', 'size'].forEach(key => { if (params[key] !== undefined && params[key] !== '') q.set(key, String(params[key])); });
  return kassalRequest(`categories${q.toString() ? `?${q.toString()}` : ''}`);
});
ipcMain.handle('kassal:prices-bulk', async (_event, payload) => kassalRequest('products/prices-bulk', { method: 'POST', body: JSON.stringify(payload) }));
ipcMain.handle('recipe:import-url', async (_event, url) => importRecipeFromUrl(url));

app.whenReady().then(() => {
  const ses = require('electron').session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'media'));
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'media');
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', () => { resetMobileTransferSession(); if (mobileTransferServer?.listening) mobileTransferServer.close(); mobileTransferServer = null; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
