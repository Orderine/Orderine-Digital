// =====================================================
// Menuva IndexedDB — SINGLE SOURCE OF TRUTH (SAFE VERSION)
// =====================================================

const DB_NAME = "MenuvaDB";
const DB_VERSION = 12;

let dbInstance = null;
let dbOpening = null; // prevent double open

// =====================================================
// OPEN DATABASE (SAFE, SINGLETON)
// =====================================================
export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpening) return dbOpening;

  dbOpening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "email" });
      }

      if (!db.objectStoreNames.contains("invites")) {
        db.createObjectStore("invites", { keyPath: "token" });
      }

      if (!db.objectStoreNames.contains("session")) {
        db.createObjectStore("session", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("restos")) {
        db.createObjectStore("restos", { keyPath: "restoID" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // auto close protection
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });

  return dbOpening;
}

// =====================================================
// USERS
// =====================================================
export async function saveUser(user) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("users", "readwrite");
    tx.objectStore("users").put(user);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

export async function getUserByEmail(email) {
  const db = await openDB();
  return new Promise((res) => {
    const req = db.transaction("users", "readonly")
      .objectStore("users")
      .get(email);
    req.onsuccess = () => res(req.result || null);
  });
}

export async function getAllUsers() {
  const db = await openDB();
  return new Promise((res) => {
    const req = db.transaction("users", "readonly")
      .objectStore("users")
      .getAll();
    req.onsuccess = () => res(req.result || []);
  });
}

// =====================================================
// SESSION (LOGIN STATE) — BULLETPROOF
// =====================================================
export async function setSession(user) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").put({
      id: "active",
      user,
      loginAt: Date.now()
    });
    tx.oncomplete = () => res(true);
  });
}

export async function getSession() {
  const db = await openDB();
  return new Promise((res) => {
    const req = db.transaction("session", "readonly")
      .objectStore("session")
      .get("active");
    req.onsuccess = () => res(req.result?.user || null);
  });
}

export async function clearSession() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").delete("active");
    tx.oncomplete = () => res(true);
  });
}

// =====================================================
// INVITES (ADMIN)
// =====================================================
export async function saveInvite(invite) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("invites", "readwrite");
    tx.objectStore("invites").put(invite);
    tx.oncomplete = () => res(true);
  });
}

export async function getInviteByToken(token) {
  const db = await openDB();
  return new Promise((res) => {
    const req = db.transaction("invites", "readonly")
      .objectStore("invites")
      .get(token);
    req.onsuccess = () => res(req.result || null);
  });
}

export async function markInviteUsed(token) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("invites", "readwrite");
    const store = tx.objectStore("invites");
    const req = store.get(token);

    req.onsuccess = () => {
      if (!req.result) return res(false);
      store.put({
        ...req.result,
        isUsed: true,
        usedAt: new Date().toISOString()
      });
    };

    tx.oncomplete = () => res(true);
  });
}

// =====================================================
// RESTO
// =====================================================
export async function saveResto(resto) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("restos", "readwrite");
    tx.objectStore("restos").put(resto);
    tx.oncomplete = () => res(true);
  });
}

export async function getResto(restoID) {
  const db = await openDB();
  return new Promise((res) => {
    const req = db.transaction("restos", "readonly")
      .objectStore("restos")
      .get(restoID);
    req.onsuccess = () => res(req.result || null);
  });
}

// =====================================================
// UTIL
// =====================================================
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

// =====================================================
// GENERIC DB ADAPTER (SAFE)
// =====================================================
export const db = {
  async add(store, data) {
    const dbi = await openDB();
    return new Promise((res, rej) => {
      const tx = dbi.transaction(store, "readwrite");
      const req = tx.objectStore(store).put(data);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  },

  async get(store, key) {
    const dbi = await openDB();
    return new Promise((res) => {
      const req = dbi.transaction(store, "readonly")
        .objectStore(store)
        .get(key);
      req.onsuccess = () => res(req.result || null);
    });
  },

  async getAll(store) {
    const dbi = await openDB();
    return new Promise((res) => {
      const req = dbi.transaction(store, "readonly")
        .objectStore(store)
        .getAll();
      req.onsuccess = () => res(req.result || []);
    });
  },

  async update(store, data) {
    const dbi = await openDB();
    return new Promise((res) => {
      const tx = dbi.transaction(store, "readwrite");
      tx.objectStore(store).put(data);
      tx.oncomplete = () => res(true);
    });
  },

  async delete(store, key) {
    const dbi = await openDB();
    return new Promise((res) => {
      const tx = dbi.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => res(true);
    });
  }
};

