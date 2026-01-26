/* ================== MENUVA DB CORE (GLOBAL SINGLE SOURCE) ================== */
(function () {
  if (window.MENUVA_DB) return;

  const DB_NAME = "MenuvaDB";
  const DB_VERSION = 17; // ⬅️ NAIK VERSION (WAJIB)

  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.warn(`🔁 MenuvaDB upgrade → v${DB_VERSION}`);

        /* ================= USERS ================= */
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "email" });
        }

        /* ================= SESSION ================= */
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session", { keyPath: "id" });
        }

        /* ================= INVITES ================= */
        if (!db.objectStoreNames.contains("invites")) {
          db.createObjectStore("invites", { keyPath: "token" });
        }

        /* ================= RESTOS ================= */
        if (!db.objectStoreNames.contains("restos")) {
          db.createObjectStore("restos", { keyPath: "id" });
        }

        /* ================= MENU DATA (NEW) ================= */
        if (!db.objectStoreNames.contains("menuData")) {
          const menu = db.createObjectStore("menuData", {
            keyPath: "id",
            autoIncrement: true
          });
          menu.createIndex("category", "category", { unique: false });
          menu.createIndex("active", "active", { unique: false });
        }

        /* ================= FLIPBOOK / GALLERY (NEW) ================= */
        if (!db.objectStoreNames.contains("flipbookData")) {
          const flipbook = db.createObjectStore("flipbookData", {
            keyPath: "id",
            autoIncrement: true
          });
          flipbook.createIndex("type", "type", { unique: false }); // room | menu
          flipbook.createIndex("refId", "refId", { unique: false }); // menuId
        }

        /* ================= ORDERS ================= */
        if (!db.objectStoreNames.contains("ordersData")) {
          const orders = db.createObjectStore("ordersData", {
            keyPath: "id",
            autoIncrement: true
          });
          orders.createIndex("status", "status", { unique: false });
          orders.createIndex("orderTime", "orderTime", { unique: false });
        }

        /* ================= PROMO ================= */
        if (!db.objectStoreNames.contains("promoData")) {
          db.createObjectStore("promoData", {
            keyPath: "id",
            autoIncrement: true
          });
        }

        console.log("✅ MenuvaDB schema ensured");
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;

        dbInstance.onversionchange = () => {
          dbInstance.close();
          console.warn("🔁 DB version changed → reload");
          location.reload();
        };

        console.log("✅ MenuvaDB ready v" + DB_VERSION);
        resolve(dbInstance);
      };
    });
  }

  async function withStore(storeName, mode, callback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  window.MENUVA_DB = {
    NAME: DB_NAME,
    VERSION: DB_VERSION,

    // 🔑 KONTRAK STORE (PEGANGAN SEMUA HALAMAN)
    STORES: [
      "users",
      "session",
      "invites",
      "restos",
      "menuData",
      "flipbookData",
      "ordersData",
      "promoData"
    ],

    openDB,

    add(store, data) {
      return withStore(store, "readwrite", s => s.put(data));
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

    /* 🔐 SESSION API (GLOBAL) */
    setSession(user) {
      return withStore("session", "readwrite", s =>
        s.put({ id: "active", ...user, loginAt: Date.now() })
      );
    },

    getSession() {
      return withStore("session", "readonly", s =>
        s.get("active")
      );
    },

    clearSession() {
      return withStore("session", "readwrite", s =>
        s.delete("active")
      );
    }
  };
})(); // ⬅️ INI WAJIB ADA


