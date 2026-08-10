(() => {
  const DB_NAME = 'personlig-budsjett';
  const DB_VERSION = 5;
  const STORES = [
    'settings','incomes','expenses','loans','goals','budgets','recipes',
    'ingredients','mealPlans','shoppingItems','shoppingTrips','pantryItems','categories','apiCache','occurrenceOverrides'
  ];

  let dbPromise;

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Databasefeil'));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Transaksjonsfeil'));
      tx.onabort = () => reject(tx.error || new Error('Transaksjonen ble avbrutt'));
    });
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        ['accounts','transfers'].forEach(name => { if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name); });
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            if (['incomes','expenses'].includes(name)) {
              store.createIndex('date', 'date', { unique: false });
              store.createIndex('category', 'category', { unique: false });
              store.createIndex('status', 'status', { unique: false });
            }
            if (name === 'settings') store.createIndex('key', 'key', { unique: true });
            if (name === 'occurrenceOverrides') {
              store.createIndex('source', ['sourceType','sourceId'], { unique: false });
              store.createIndex('sourcePeriod', ['sourceType','sourceId','period'], { unique: true });
              store.createIndex('period', 'period', { unique: false });
            }
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Kunne ikke åpne databasen'));
    });
    return dbPromise;
  }

  async function getAll(storeName) {
    const db = await open();
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).getAll());
  }

  async function get(storeName, id) {
    const db = await open();
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).get(id));
  }

  async function add(storeName, value) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    const id = await requestToPromise(tx.objectStore(storeName).add(value));
    await transactionDone(tx);
    return id;
  }

  async function put(storeName, value) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    const id = await requestToPromise(tx.objectStore(storeName).put(value));
    await transactionDone(tx);
    return id;
  }

  async function remove(storeName, id) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    await transactionDone(tx);
  }

  async function clear(storeName) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    await transactionDone(tx);
  }

  async function replaceAll(storeName, values) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    values.forEach(value => store.put(value));
    await transactionDone(tx);
  }

  async function count(storeName) {
    const db = await open();
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).count());
  }

  async function exportAll() {
    const result = { schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), stores: {} };
    for (const name of STORES) result.stores[name] = await getAll(name);
    return result;
  }

  const REQUIRED_IMPORT_STORES = [
    'settings','incomes','expenses','loans','goals','budgets','recipes',
    'ingredients','mealPlans','shoppingItems','pantryItems','categories'
  ];

  function validateImport(payload) {
    if (!payload || typeof payload !== 'object' || !payload.stores || typeof payload.stores !== 'object') {
      throw new Error('Ugyldig backupfil: mangler stores.');
    }
    const version = Number(payload.schemaVersion);
    if (!Number.isInteger(version) || version < 1 || version > DB_VERSION) {
      throw new Error(`Backupfilen har en ukjent databaseversjon (${payload.schemaVersion ?? 'mangler'}).`);
    }
    for (const name of REQUIRED_IMPORT_STORES) {
      if (!Array.isArray(payload.stores[name])) throw new Error(`Backupfilen mangler gyldig datasett: ${name}.`);
    }
    for (const [name, values] of Object.entries(payload.stores)) {
      if (STORES.includes(name) && !Array.isArray(values)) throw new Error(`Ugyldig datatype i datasett: ${name}.`);
    }
    return version;
  }

  async function importAll(payload) {
    validateImport(payload);
    const db = await open();
    const tx = db.transaction(STORES, 'readwrite');
    for (const name of STORES) {
      const store = tx.objectStore(name);
      store.clear();
      const values = Array.isArray(payload.stores[name]) ? payload.stores[name] : [];
      values.forEach(value => store.put(value));
    }
    await transactionDone(tx);
  }

  async function clearAll() {
    const db = await open();
    const tx = db.transaction(STORES, 'readwrite');
    STORES.forEach(name => tx.objectStore(name).clear());
    await transactionDone(tx);
  }

  window.BudgetDB = { DB_VERSION, STORES, open, getAll, get, add, put, remove, clear, clearAll, replaceAll, count, exportAll, validateImport, importAll };
})();
