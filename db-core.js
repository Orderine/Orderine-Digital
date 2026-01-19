/* ================== MENUVA DB CORE (SINGLE SOURCE) ================== */

export const DB_NAME = "MenuvaDB";
export const STORE_NAME = "menuvaData";
export const DB_VERSION = 14; // 🔥 NAIK VERSION (WAJIB & SATU TEMPAT)

let dbInstance = null;

export function openMenuvaDB() {
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

      // ================= PROMO (SAFE ADD) =================
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

      // 🔥 AUTO HANDLE VERSION CHANGE (ALL TABS)
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
