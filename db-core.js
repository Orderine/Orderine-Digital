/* ================== MENUVA DB CORE (GLOBAL SINGLE SOURCE) ================== */
(function () {
  if (window.MENUVA_DB) return; // 🔒 prevent double load

  const DB_NAME = "MenuvaDB";
  const STORE_NAME = "menuvaData";
  const DB_VERSION = 15;

  let dbInstance = null;

  function openMenuvaDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("❌ IndexedDB open failed");
        reject(request.error);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.warn(`🔁 MenuvaDB upgrade → v${DB_VERSION}`);

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("ordersData")) {
          const orders = db.createObjectStore("ordersData", {
            keyPath: "id",
            autoIncrement: true
          });
          orders.createIndex("status", "status", { unique: false });
          orders.createIndex("orderTime", "orderTime", { unique: false });
        }

        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "email" });
        }

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
          console.warn("🔁 DB version changed → reload");
          dbInstance.close();
          location.reload();
        };

        console.log("✅ MenuvaDB ready v" + DB_VERSION);
        resolve(dbInstance);
      };
    });
  }

  // 🌍 GLOBAL SINGLE SOURCE
  window.MENUVA_DB = {
    NAME: DB_NAME,
    STORE: STORE_NAME,
    VERSION: DB_VERSION,
    open: openMenuvaDB
  };
})();

