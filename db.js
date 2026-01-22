// =====================================================
// Menuva DB Adapter — CORE AWARE (NO VERSION, NO OPEN)
// SINGLE SOURCE OF TRUTH: db-core.js
// =====================================================

/* ==================== ENSURE CORE READY ==================== */
function ensureDB() {
  if (!window.MENUVA_DB || !window.MENUVA_DB.openDB) {
    throw new Error("MENUVA_DB not ready");
  }
  return window.MENUVA_DB;
}

async function withStore(store, mode, callback) {
  const DB = ensureDB();
  await DB.openDB();

  return new Promise((resolve, reject) => {
    const tx = DB._db
      ? DB._db.transaction(store, mode)
      : DB.openDB().then(db => db.transaction(store, mode));

    const objectStore = tx.objectStore(store);
    const req = callback(objectStore);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ==================== USERS ==================== */
export async function saveUser(user) {
  return withStore("users", "readwrite", store =>
    store.put(user)
  );
}

export async function getUserByEmail(email) {
  return withStore("users", "readonly", store =>
    store.get(email)
  );
}

export async function getAllUsers() {
  return withStore("users", "readonly", store =>
    store.getAll()
  );
}

const SESSION_KEY = "active";

/* ==================== SESSION ==================== */
export async function setSession(user) {
  return withStore("session", "readwrite", store =>
    store.put({
      id: SESSION_KEY,
      ...user,
      loginAt: Date.now()
    })
  );
}

export async function getSession() {
  return withStore("session", "readonly", store =>
    store.get(SESSION_KEY)
  );
}

export async function clearSession() {
  return withStore("session", "readwrite", store =>
    store.delete(SESSION_KEY)
  );
}

/* ==================== INVITES ==================== */
export async function saveInvite(invite) {
  return withStore("invites", "readwrite", store =>
    store.put(invite)
  );
}

export async function getInviteByToken(token) {
  return withStore("invites", "readonly", store =>
    store.get(token)
  );
}

export async function markInviteUsed(token) {
  const invite = await getInviteByToken(token);
  if (!invite) return false;

  return withStore("invites", "readwrite", store =>
    store.put({
      ...invite,
      isUsed: true,
      usedAt: new Date().toISOString()
    })
  );
}

/* ==================== RESTO ==================== */
export async function saveResto(resto) {
  return withStore("restos", "readwrite", store =>
    store.put(resto)
  );
}

export async function getResto(restoID) {
  return withStore("restos", "readonly", store =>
    store.get(restoID)
  );
}

/* ==================== UTIL ==================== */
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ==================== GENERIC DB ADAPTER ==================== */
/**
 * NOTE:
 * Ini SATU-SATUNYA "db" yang boleh diimport di layer atas.
 * Jangan pernah shadow dengan: const db = await ...
 */
export const db = {
  add(store, data) {
    return withStore(store, "readwrite", s => s.put(data));
  },
  get(store, key) {
    return withStore(store, "readonly", s => s.get(key));
  },
  getAll(store) {
    return withStore(store, "readonly", s => s.getAll());
  },
  update(store, data) {
    return withStore(store, "readwrite", s => s.put(data));
  },
  delete(store, key) {
    return withStore(store, "readwrite", s => s.delete(key));
  }
};



