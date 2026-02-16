/* ======================================================
   MENUVA DB CORE (GLOBAL SINGLE SOURCE OF TRUTH)
   ⚠️ DO NOT MODIFY FROM PAGE LEVEL
====================================================== */

(function () {
  if (window.MENUVA_DB) return;

  /* ======================================================
     INTERNAL GUARD FLAG
  ====================================================== */
  window.__MENUVA_INTERNAL__ = true;
  window.__MENUVA_DEV__ = false;


  const DB_NAME = "MenuvaDB";
  const DB_VERSION = 18;

  let dbOpeningPromise = null;
  let dbInstance = null;

  /* ======================================================
     OPEN DB (INTERNAL ONLY)
  ====================================================== */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpeningPromise) return dbOpeningPromise;

  dbOpeningPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbOpeningPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      console.warn(`🔁 MenuvaDB upgrade → v${DB_VERSION}`);

      if (!db.objectStoreNames.contains("users"))
        db.createObjectStore("users", { keyPath: "email" });

      if (!db.objectStoreNames.contains("session"))
        db.createObjectStore("session", { keyPath: "id" });

      if (!db.objectStoreNames.contains("restos"))
        db.createObjectStore("restos", { keyPath: "id" });

      if (!db.objectStoreNames.contains("admin_invites"))
        db.createObjectStore("admin_invites", { keyPath: "id" });

      if (!db.objectStoreNames.contains("admins"))
        db.createObjectStore("admins", { keyPath: "id" });

      if (!db.objectStoreNames.contains("void_logs")) {
        const v = db.createObjectStore("void_logs", { keyPath: "id" });
        v.createIndex("type", "type", { unique: false });
        v.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("menuData")) {
        const menu = db.createObjectStore("menuData", {
          keyPath: "id",
          autoIncrement: true
        });
        menu.createIndex("category", "category", { unique: false });
        menu.createIndex("active", "active", { unique: false });
      }

      if (!db.objectStoreNames.contains("ordersData")) {
        const orders = db.createObjectStore("ordersData", {
          keyPath: "id",
          autoIncrement: true
        });
        orders.createIndex("status", "status", { unique: false });
        orders.createIndex("orderTime", "orderTime", { unique: false });
      }

      if (!db.objectStoreNames.contains("promoData"))
        db.createObjectStore("promoData", {
          keyPath: "id",
          autoIncrement: true
        });

      if (!db.objectStoreNames.contains("flipbookData")) {
        const flip = db.createObjectStore("flipbookData", {
          keyPath: "id",
          autoIncrement: true
        });
        flip.createIndex("type", "type", { unique: false });
        flip.createIndex("refId", "refId", { unique: false });
      }

      console.log("✅ MenuvaDB schema ensured");
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      dbOpeningPromise = null;

      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn("🔁 DB version changed → reload");
        location.reload();
      };

      resolve(dbInstance);
    };
  });

   const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => {
    console.error("⏳ IndexedDB open timeout");
    dbOpeningPromise = null;
    reject(new Error("DB open timeout"));
  }, 12000) // 12 detik
);

return Promise.race([dbOpeningPromise, timeoutPromise]);
}

  /* ======================================================
     SAFE STORE ACCESS
  ====================================================== */
 async function withStore(storeName, mode, callback) {
  if (!MENUVA_DB.STORES.includes(storeName)) {
    throw new Error(`🚫 Illegal store access: ${storeName}`);
  }

  let db = await openDB();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("⚠️ DB retrying due to error:", err);

    dbInstance = null; // force reopen
    db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

  /* ======================================================
     PUBLIC API (ONLY THIS IS ALLOWED)
  ====================================================== */
  window.MENUVA_DB = {
    NAME: DB_NAME,
    VERSION: DB_VERSION,

    STORES: [
      "users",
      "session",
      "restos",
      "admin_invites",
      "admins",
      "void_logs",
      "menuData",
      "ordersData",
      "promoData",
      "flipbookData"
    ],

    openDB,

    add(store, data) {
      return withStore(store, "readwrite", s => s.put(data));
    },

     update(store, data) {return this.add(store, data);
   },

    get(store, key) {
      return withStore(store, "readonly", s => s.get(key));
    },

    getAll(store) {
      return withStore(store, "readonly", s => s.getAll());
    },

    delete(store, key) {
      return withStore(store, "readwrite", s => s.delete(key));
    },

    /* ===== SESSION ===== */
    setSession(user) {
      return withStore("session", "readwrite", s =>
        s.put({ id: "active", ...user, loginAt: Date.now() })
      );
    },

    getSession() {
      return withStore("session", "readonly", s => s.get("active"));
    },

    clearSession() {
      return withStore("session", "readwrite", s => s.delete("active"));
    }
  };
})();

/* ======================================================
   MENUVA POLICY GUARD (HARD LOCK)
====================================================== */
(function enforcePolicy() {

  /* ---- indexedDB ---- */
  const _open = indexedDB.open;
  indexedDB.open = function (...args) {
    if (window.__MENUVA_INTERNAL__ || window.__MENUVA_DEV__) {
      return _open.apply(indexedDB, args);
    }
    throw new Error("🚫 Direct indexedDB access forbidden. Use MENUVA_DB.");
  };

  indexedDB.deleteDatabase = function () {
    throw new Error("🚫 Database deletion forbidden.");
  };

  /* ---- localStorage ---- */
  ["getItem", "setItem", "removeItem", "clear"].forEach(fn => {
    const original = localStorage[fn];
    localStorage[fn] = function (...args) {
     if (window.__MENUVA_DEV__) {
    return original.apply(localStorage, args);
    }
    throw new Error("🚫 localStorage is forbidden. Use MENUVA_DB.");
};

  });

})();





