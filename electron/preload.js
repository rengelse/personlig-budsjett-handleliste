const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('budgetApp', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('app:update:check'),
  downloadUpdate: () => ipcRenderer.invoke('app:update:download'),
  installUpdate: () => ipcRenderer.invoke('app:update:install'),
  getUpdateState: () => ipcRenderer.invoke('app:update:state'),
  onUpdateStatus: callback => {
    if(typeof callback!=='function') return () => {};
    const handler=(_event,payload)=>callback(payload);
    ipcRenderer.on('app:update:status',handler);
    return ()=>ipcRenderer.removeListener('app:update:status',handler);
  },
  generateQr: value => ipcRenderer.invoke('qr:generate', value),
  encodeShoppingListPb1: payload => ipcRenderer.invoke('pb1:encode-shopping-list', payload),
  decodeShoppingTripPb2: value => ipcRenderer.invoke('pb2:decode-shopping-trip', value),
  startMobileTransferSend: payload => ipcRenderer.invoke('mobile-transfer:start-send', payload),
  startMobileTransferReceive: () => ipcRenderer.invoke('mobile-transfer:start-receive'),
  stopMobileTransfer: () => ipcRenderer.invoke('mobile-transfer:stop'),
  onMobileTransferStatus: callback => {
    if(typeof callback!=='function') return () => {};
    const handler=(_event,payload)=>callback(payload);
    ipcRenderer.on('mobile-transfer:status',handler);
    return ()=>ipcRenderer.removeListener('mobile-transfer:status',handler);
  },
  openExternal: url => ipcRenderer.invoke('external:open', url),
  exportData: payload => ipcRenderer.invoke('data:export', payload),
  exportReport: payload => ipcRenderer.invoke('report:export', payload),
  importData: () => ipcRenderer.invoke('data:import'),
  saveAutoBackup: (payload, retention) => ipcRenderer.invoke('backup:save', { payload, retention }),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: fileName => ipcRenderer.invoke('backup:restore', fileName),
  importRecipeUrl: url => ipcRenderer.invoke('recipe:import-url', url),
  kassal: {
    getConfig: () => ipcRenderer.invoke('kassal:config:get'),
    saveConfig: config => ipcRenderer.invoke('kassal:config:save', config),
    clearToken: () => ipcRenderer.invoke('kassal:config:clear-token'),
    test: () => ipcRenderer.invoke('kassal:test'),
    searchProducts: params => ipcRenderer.invoke('kassal:search-products', params),
    getProductById: id => ipcRenderer.invoke('kassal:product-id', id),
    getProductByEan: ean => ipcRenderer.invoke('kassal:product-ean', ean),
    getCategories: params => ipcRenderer.invoke('kassal:categories', params),
    pricesBulk: payload => ipcRenderer.invoke('kassal:prices-bulk', payload),
    weeklyPriceChanges: request => ipcRenderer.invoke('kassal:weekly-price-changes', request)
  }
});
