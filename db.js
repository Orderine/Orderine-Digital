// db.js
const DB_NAME = "MenuvaDB";
const DB_VERSION = 11; // ⬅️ NAIKKAN
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      const db = e.target.result;

      // ✅ STORE LAMA (JANGAN DIHAPUS)
      if (!db.objectStoreNames.contains("menuvaData")) {
        db.createObjectStore("menuvaData", { keyPath: "id" });
      }

      // ➕ STORE BARU UNTUK MULTI ADMIN
      if (!db.objectStoreNames.contains("admins")) {
        db.createObjectStore("admins", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };

    request.onerror = () => reject(request.error);
  });
}

function withStore(store, mode, cb) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const st = tx.objectStore(store);
      const req = cb(st);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export const db = {
  add: (store, data) => withStore(store, "readwrite", s => s.add(data)),
  get: (store, key) => withStore(store, "readonly", s => s.get(key)),
  getAll: store => withStore(store, "readonly", s => s.getAll()),
  update: (store, data) => withStore(store, "readwrite", s => s.put(data)),
  delete: (store, key) => withStore(store, "readwrite", s => s.delete(key))
};
