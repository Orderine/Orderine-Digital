/* ================== MENUVA DB CORE (SINGLE SOURCE + DUAL MODE) ================== */

/*
  - Bisa dipakai oleh:
    ✅ ES Module (import)
    ✅ Legacy script (window.MENUVA_DB)
  - Admin.html TIDAK perlu refactor
  - Halaman lain pakai import
*/

const DB_NAME = "MenuvaDB";
const STORE_NAME = "menuvaData";
const DB_VERSION = 14; // 🔥 SATU-SATUNYA TEMPAT UBAH VERSION

let dbInstance = null;

/* ================== OPEN DB ================== */
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

      // ================= MAIN STORE (ADMIN EXISTING) =================
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "restoId" });
      }

      // ================= ORDERS =================
      if (!db.objectStoreNames.contains("ordersData")) {
        const orders = db.createObjectStore("ordersData", {
          keyPath: "id",
          autoIncrement: true
        });
        orders.createIndex("status", "status", { unique: false });
        orders.createIndex("orderTime", "orderTime", { unique: false });
      }

      // ================= USERS / SESSION =================
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "email" });
      }

      // ================= PROMO =================
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

      // 🔥 HANDLE MULTI TAB / VERSION CHANGE
      dbInstance.onversionchange = () => {
        console.warn("🔁 DB version changed → reload page");
        dbInstance.close();
        location.reload();
      };

      console.log("✅ MenuvaDB ready v" + DB_VERSION);
      resolve(dbInstance);
    };
  });
}

/* ================== GLOBAL (LEGACY ADMIN SUPPORT) ================== */
if (typeof window !== "undefined") {
  window.MENUVA_DB = {
    NAME: DB_NAME,
    STORE: STORE_NAME,
    VERSION: DB_VERSION,
    open: openMenuvaDB
  };
}

/* ================== MODULE EXPORT ================== */
export {
  DB_NAME,
  STORE_NAME,
  DB_VERSION,
  openMenuvaDB
};
