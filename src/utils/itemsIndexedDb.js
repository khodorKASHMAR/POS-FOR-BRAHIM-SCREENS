const DB_NAME = 'items-indexed-DB'
const DB_VERSION = 1

const STORE_NAMES = ['meta', 'categories', 'items', 'images', 'categoryItemsPages']

let dbPromise = null
let idbUnavailable = false
let warnedUnavailable = false

function warnUnavailable(error) {
  if (!warnedUnavailable) {
    warnedUnavailable = true
    console.warn('[itemsIndexedDb] IndexedDB unavailable; using memory-only cache.', error)
  }
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createStores(db) {
  if (!db.objectStoreNames.contains('meta')) {
    db.createObjectStore('meta', { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains('categories')) {
    db.createObjectStore('categories', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('items')) {
    const itemsStore = db.createObjectStore('items', { keyPath: 'id' })
    itemsStore.createIndex('byBarcode', 'barcode', { unique: false })
  }
  if (!db.objectStoreNames.contains('images')) {
    db.createObjectStore('images', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('categoryItemsPages')) {
    db.createObjectStore('categoryItemsPages', { keyPath: 'categoryItemsPageKey' })
  }
}


/**
 * @returns {Promise<IDBDatabase | null>}
 */
export async function openItemsCacheDb() {
  if (idbUnavailable || typeof indexedDB === 'undefined') {
    return null
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        createStores(db)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        idbUnavailable = true
        warnUnavailable(request.error)
        resolve(null)
      }
    })
  }
  return dbPromise
}

export function isItemsIndexedDbAvailable() {
  return !idbUnavailable && typeof indexedDB !== 'undefined'
}

async function withStore(storeName, mode, fn) {
  const db = await openItemsCacheDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    Promise.resolve(fn(store))
      .then((result) => {
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      .catch(reject)
  })
}

export async function idbGet(storeName, key) {
  return withStore(storeName, 'readonly', (store) => promisify(store.get(key)))
}

export async function idbPut(storeName, value) {
  return withStore(storeName, 'readwrite', (store) => promisify(store.put(value)))
}

export async function idbDelete(storeName, key) {
  return withStore(storeName, 'readwrite', (store) => promisify(store.delete(key)))
}

export async function idbGetAll(storeName) {
  return withStore(storeName, 'readonly', (store) => promisify(store.getAll()))
}

export async function idbBulkPut(storeName, records) {
  if (!records?.length) return
  const db = await openItemsCacheDb()
  if (!db) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const record of records) {
      store.put(record)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbClearStore(storeName) {
  return withStore(storeName, 'readwrite', (store) => promisify(store.clear()))
}

export async function idbClearAllStores() {
  for (const name of STORE_NAMES) {
    await idbClearStore(name)
  }
}

if (import.meta.env.DEV) {
  window.__posItemsCacheDb = {
    openItemsCacheDb,
    idbGet,
    idbGetAll,
    idbClearAllStores
  }
}
