/* ================== MENUVA DB CORE (GLOBAL SINGLE SOURCE) ================== */
(function () {
  if (window.MENUVA_DB) return;

  const DB_NAME = "MenuvaDB";
  const DB_VERSION = 15;

  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.warn(`🔁 MenuvaDB upgrade → v${DB_VERSION}`);

        /* ===== USERS ===== */
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "email" });
        }

        /* ===== SESSION ===== */
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session", { keyPath: "id" });
        }

        /* ===== INVITES ===== */
        if (!db.objectStoreNames.contains("invites")) {
          db.createObjectStore("invites", { keyPath: "token" });
        }

        /* ===== RESTOS ===== */
        if (!db.objectStoreNames.contains("restos")) {
          db.createObjectStore("restos", { keyPath: "id" });
        }

        /* ===== ORDERS (LEGACY / EXISTING) ===== */
        if (!db.objectStoreNames.contains("ordersData")) {
          const orders = db.createObjectStore("ordersData", {
            keyPath: "id",
            autoIncrement: true
          });
          orders.createIndex("status", "status", { unique: false });
          orders.createIndex("orderTime", "orderTime", { unique: false });
        }

        /* ===== PROMO ===== */
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

  /* ===== GLOBAL SINGLE SOURCE ===== */
  window.MENUVA_DB = {
    openDB,
    DB_NAME,
    DB_VERSION
  };
})();
