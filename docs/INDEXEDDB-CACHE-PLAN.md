# IndexedDB catalog cache — implementation plan

Use this document as the full brief for a **new Cursor session** to implement persistent local caching on top of the existing **Solution B** architecture.

---

## Goal

Persist the POS catalog cache in the browser so that:

1. **Lean item metadata** survives browser refresh and laptop restart.
2. **Base64 item images** survive refresh (with LRU eviction caps).
3. **Categories** survive refresh.
4. Cache is **scoped per logged-in user** (different users on the same machine do not share catalog data).
5. Network is used only for **misses**, **stale data**, and **mutations** (create/update/delete).

Do **not** change the backend API contract unless noted in “Optional backend follow-up”.

---

## Current state (baseline)

### Already implemented (in-memory only)

| File | Role |
|------|------|
| `src/utils/itemCache.js` | Two `Map`s: lean items + LRU images (500 entries / ~50 MB) |
| `src/store/state.js` | Pinia store: `loadItemsPage`, `searchItems`, `findItemByBarcodeRemote`, `ensureItemImages`, CRUD patch helpers |
| `src/services/ItemService.js` | `getUserItems({ categoryId, query, page, size })`, `getItemByBarcode`, `getItemImages` |
| `src/services/CategoryService.js` | `getUserCategories()` |
| `src/pages/Pos.vue`, `PosMobile.vue` | Infinite scroll + category filter |
| `src/pages/AddItems.vue`, `AddItemsMobile.vue` | Same + CRUD dialogs |

### Lean item shape (cache metadata)

```js
{
  id, nameAr, nameEn, sellingPrice, sellingCurrency,
  barcode, categoryId, hasImage
}
```

### Image shape (separate store)

```js
{ id, image } // base64 data URL or null
```

### What is lost today on refresh

- All cached items
- All cached images
- Category list (re-fetched on mount)
- Page cursors (`state.pages`) — which pages were loaded per category

---

## Architecture target

```
┌─────────────────────────────────────────────────────────────┐
│  Vue components (Pos, AddItems, HomeItemCard, cart, …)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Pinia store (state.js) — same public API as today          │
│  loadItemsPage / searchItems / getItem / ensureItemImages   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌─────────▼──────────┐
│ itemCache.js   │  read/write sync   │ indexedDbCache.js  │
│ (memory Maps)  │◄──────────────────►│ (IndexedDB layer)  │
└────────────────┘                    └─────────┬──────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │ Browser IndexedDB       │
                                    │ DB: pos-catalog-v1      │
                                    └─────────────────────────┘
```

**Pattern:** memory-first for speed; IndexedDB as write-through / read-through backing store.

---

## IndexedDB schema

**Database name:** `pos-catalog-v1`  
**Scope key:** `userId` (UUID string from auth; see “User scoping” below)

### Object stores

| Store | Key | Value | Indexes |
|-------|-----|-------|---------|
| `meta` | `{userId}:meta` | `{ userId, catalogVersion, lastSyncAt, schemaVersion }` | — |
| `categories` | `{userId}:{categoryId}` | `{ id, nameAr, nameEn, itemCount }` | — |
| `items` | `{userId}:{itemId}` | lean item object | `byBarcode` on `[userId, barcode]` (unique where barcode non-empty) |
| `images` | `{userId}:{itemId}` | `{ id, image, size, cachedAt }` | — |
| `pages` | `{userId}:{pageKey}` | `{ pageKey, ids[], page, totalPages, totalItems }` | — |

**Notes:**

- Composite string keys (`userId:itemId`) avoid cross-user leakage without separate DBs per user.
- `byBarcode` index enables local barcode lookup without scanning all items.
- Images keep `size` for LRU eviction across memory + disk.
- `pages` restores infinite-scroll cursors after refresh (optional but recommended).

### Schema version

- `schemaVersion: 1` in `meta`.
- On upgrade, bump version and migrate or clear stores (document migration steps).

---

## New files to create

### 1. `src/utils/indexedDb.js`

Low-level IDB wrapper (no Vue/Pinia dependency):

- `openCatalogDb()` → Promise<IDBDatabase>
- `idbGet(store, key)`, `idbPut(store, value)`, `idbDelete(store, key)`
- `idbGetAll(store, userIdPrefix?)`, `idbBulkPut(store, records[])`
- Handle `onupgradeneeded` to create stores + indexes
- Graceful failure: if IDB unavailable (private mode, old browser), return null and log once

**Do not** add a heavy library unless needed; native IDB is enough. Optional: `idb` npm package (~1 KB) if you prefer promises — keep bundle small.

### 2. `src/utils/catalogPersistence.js`

Domain layer between `itemCache.js` and IndexedDB:

- `loadCatalogFromDisk(userId)` → hydrates memory Maps + returns `{ categories, pages, meta }`
- `persistItem(userId, item)`, `persistItemsBulk(userId, items[])`
- `persistCategory(userId, category)`, `persistCategoriesBulk(userId, categories[])`
- `persistImage(userId, itemId, image)`, `removeItem(userId, itemId)`, `removeCategory(userId, categoryId)`
- `persistPageState(userId, pageKey, pageState)`
- `clearCatalogForUser(userId)` — on logout
- `evictImagesOnDisk(userId, maxEntries, maxChars)` — mirror in-memory LRU rules

### 3. `src/composables/useCatalogBootstrap.js` (optional)

Hook called once after login / app init:

- Resolve `userId`
- `await loadCatalogFromDisk(userId)`
- If meta missing or stale → background refresh categories + first page (do not block UI)

---

## Changes to existing files

### `src/utils/itemCache.js`

Add optional persistence hooks (keep sync API for callers):

- After `setCachedItem` → debounced `persistItem` (e.g. 300 ms batch)
- After `setCachedItemImage` → debounced `persistImage`
- After `removeCachedItem` → `removeItem` on disk
- Export `hydrateFromRecords(items[], images[])` for bootstrap

**Important:** do not make every read async. Reads stay sync from memory; disk is loaded at startup.

### `src/store/state.js`

| Action | IndexedDB behavior |
|--------|-------------------|
| App init / after login | `loadCatalogFromDisk(userId)` then set `categories`, `pages`, bump `itemCacheVersion` |
| `loadCategories` | After API success → `persistCategoriesBulk` |
| `loadItemsPage` | After page fetch → `persistItemsBulk` + `persistPageState` |
| `searchItems` | Persist results items (same as today’s memory cache) |
| `addItemCache` / `removeItemFromCache` | Persist patch |
| `addCategoryCache` / `removeCategoryCache` | Persist patch |
| `ensureItemImages` | After fetch → persist images |
| `invalidateItemImageCache` | Delete image from disk store |
| Logout | `clearCatalogForUser(userId)` + clear memory Maps |

Add action: `bootstrapCatalog()` called from `App.vue` or login success handler.

### `src/pages/LoginPage.vue` / `LoginMobile.vue`

After successful login → call `state.bootstrapCatalog()` before navigating to POS.

### Logout path

Find where token/user is cleared → call `clearCatalogForUser` + memory clear.

---

## User scoping

1. Identify where the logged-in user id is available (JWT payload, `/user/me`, or existing store).
2. If not stored today, add `userId` to Pinia state on login (do not persist userId inside catalog meta only — use it in every key).
3. On login as a **different** user, clear previous user’s memory cache and load the new user’s IDB partition (keys are prefixed, so no wipe needed unless same browser profile switches users — then call `clearCatalogForUser(oldUserId)` optionally).

---

## Sync / staleness strategy (v1 — simple)

Without backend `updatedSince` (Solution D):

| Event | Behavior |
|-------|----------|
| Login / bootstrap | Load IDB → show immediately → fetch categories from API → merge |
| Open POS | If `lastSyncAt` older than e.g. **24 h**, soft-refresh categories in background |
| Create/update/delete item | Patch memory + IDB (already done for memory; extend to IDB) |
| Another till adds item | Not visible until manual refresh or periodic category/item refetch (document limitation) |
| User clears site data | IDB wiped; full re-fetch (expected) |

**Do not** re-fetch full catalog after every receipt (already removed).

### Optional backend follow-up (Solution D — separate task)

- Add `lastModifiedDate` to item/category API responses.
- Add `GET /item/changes?since=ISO` for delta sync.
- Store `catalogVersion` / `lastSyncAt` in IDB `meta`.

---

## Image persistence rules

Reuse existing caps from `itemCache.js`:

- `MAX_IMAGE_ENTRIES = 500`
- `MAX_IMAGE_CHARS = 50 * 1024 * 1024`

When persisting images:

1. Update memory LRU (existing).
2. Write to IDB `images` store.
3. Run eviction: delete oldest entries from **both** memory and IDB until under caps.

Images can be large; use `idbPut` per image, not one giant blob.

---

## Barcode lookup flow (after IDB)

1. Scan → `findCachedItemByBarcode` in memory (unchanged).
2. On miss → `findItemByBarcodeRemote` → upsert memory + IDB.
3. Optional enhancement: query IDB `byBarcode` index on memory miss before API (only needed if memory was cleared but IDB still warm — e.g. future memory-only eviction).

---

## Error handling

| Case | Behavior |
|------|----------|
| IDB blocked / private mode | Log warning; app works in-memory only (current behavior) |
| IDB quota exceeded | Evict oldest images first; then oldest unused items; toast optional |
| Corrupt record | Skip record; refetch from API on next access |
| DB open fails | Same as blocked |

---

## Implementation phases (recommended order)

### Phase 1 — Foundation (half day)

- [ ] Create `indexedDb.js` with schema v1
- [ ] Create `catalogPersistence.js` with CRUD for items + categories
- [ ] Unit-test IDB layer manually in dev (simple dev-only page or console helpers)

### Phase 2 — Bootstrap (half day)

- [ ] `loadCatalogFromDisk` hydrates memory
- [ ] Wire `bootstrapCatalog()` on login
- [ ] Wire `clearCatalogForUser` on logout
- [ ] Verify: login → refresh browser → items/categories still visible offline

### Phase 3 — Write-through (1 day)

- [ ] Debounced persist on all store mutations
- [ ] Persist `pages` cursors
- [ ] Persist images in `ensureItemImages`
- [ ] Verify: browse category → refresh → same grid without API (offline)

### Phase 4 — Eviction + quota (half day)

- [ ] Disk LRU for images aligned with memory
- [ ] Quota exceeded handling

### Phase 5 — Polish (half day)

- [ ] Loading indicator only when IDB empty (first visit)
- [ ] `npm run build` + manual mobile/desktop pass
- [ ] `npm run graphify:update`

---

## Testing checklist

- [ ] Login as user A, load POS, refresh → catalog still there
- [ ] Logout, login as user B → user A data not shown
- [ ] Create item → appears in UI → refresh → still there
- [ ] Update item price → refresh → new price
- [ ] Delete item → refresh → gone
- [ ] Barcode scan hit from cache after refresh
- [ ] Category switch loads images from IDB when already cached
- [ ] Clear site data → app still works, re-fetches from API
- [ ] Add item with empty English name (optional field) still caches correctly

---

## Files reference (do not break)

Backend (unchanged for v1):

- `GET /item/user-items?categoryId&query&page&size=50`
- `GET /item/barcode/{barcode}`
- `POST /item/images` body: `UUID[]`
- `GET /category/user-categories`

Frontend critical paths:

- `src/utils/itemCache.js`
- `src/store/state.js`
- `src/components/HomeItemCard.vue` — uses `getItemImage`
- `src/composables/useBarcodeCart.js` — barcode resolution
- `src/composables/useInfiniteScroll.js` — paging

---

## Prompt to paste into a new Cursor session

```
Implement IndexedDB persistence for the POS catalog cache per the plan at:
pos-screens/docs/INDEXEDDB-CACHE-PLAN.md

Context:
- Vue 3 + Pinia POS frontend (pos-screens)
- Solution B already implemented: lean paged catalog, in-memory itemCache.js, on-demand base64 images
- Run graphify before exploring; npm run graphify:update after code changes
- Scope cache by logged-in userId
- Memory-first reads; IndexedDB write-through + bootstrap on login
- Do not refetch full catalog after receipts
- Match existing LRU limits for images (500 entries / 50MB)
- Graceful fallback if IndexedDB unavailable

Start with Phase 1 and 2, then continue through Phase 5 unless I say stop.
```

---

## Out of scope for this task

- Electron / real filesystem `C:\cache`
- Backend `updatedSince` sync (Solution D)
- Service worker / Cache API for API responses
- Compressing base64 images before storage
