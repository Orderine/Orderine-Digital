// =====================================================
// Menuva IndexedDB — SINGLE SOURCE OF TRUTH
// =====================================================

const DB_NAME = "MenuvaDB";
const DB_VERSION = 1;

let dbInstance = null;

// =====================================================
// OPEN DATABASE
// =====================================================
export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

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
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

// =====================================================
// USERS
// =====================================================
export async function saveUser(user) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("users", "readwrite");
    tx.objectStore("users").put(user);
    tx.oncomplete = () => res(true);
  });
}

export async function getUserByEmail(email) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("users", "readonly");
    const req = tx.objectStore("users").get(email);
    req.onsuccess = () => res(req.result || null);
  });
}

export async function getAllUsers() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("users", "readonly");
    const req = tx.objectStore("users").getAll();
    req.onsuccess = () => res(req.result || []);
  });
}

// =====================================================
// SESSION (LOGIN STATE)
// =====================================================
export async function setSession(user) {
  const db = await openDB();
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").put({
    id: "active",
    user,
    loginAt: Date.now()
  });
}

export async function getSession() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("session", "readonly");
    const req = tx.objectStore("session").get("active");
    req.onsuccess = () => res(req.result?.user || null);
  });
}

export async function clearSession() {
  const db = await openDB();
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").delete("active");
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
    const tx = db.transaction("invites", "readonly");
    const req = tx.objectStore("invites").get(token);
    req.onsuccess = () => res(req.result || null);
  });
}

export async function markInviteUsed(token) {
  const db = await openDB();
  const tx = db.transaction("invites", "readwrite");
  const store = tx.objectStore("invites");

  const req = store.get(token);
  req.onsuccess = () => {
    const invite = req.result;
    if (invite) {
      invite.isUsed = true;
      invite.usedAt = new Date().toISOString();
      store.put(invite);
    }
  };
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
    const tx = db.transaction("restos", "readonly");
    const req = tx.objectStore("restos").get(restoID);
    req.onsuccess = () => res(req.result || null);
  });
}

// =====================================================
// UTIL
// =====================================================
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}
