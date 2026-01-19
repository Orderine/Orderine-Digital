/* ================== ORDERINE DB CORE ================== */
const DB_NAME = "ORDERINE_DB";
const DB_VERSION = 15; // 🔥 CUKUP UBAH DI SINI SAJA

let dbInstance = null;

function openOrderineDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("❌ DB open failed");
      reject(request.error);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      console.warn(`🔁 DB Upgrade → v${DB_VERSION}`);

      // ================= STORES =================
      if (!db.objectStoreNames.contains("restoData")) {
        db.createObjectStore("restoData", { keyPath: "restoId" });
      }

      if (!db.objectStoreNames.contains("menuData")) {
        db.createObjectStore("menuData", { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains("promoData")) {
        db.createObjectStore("promoData", { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains("ordersData")) {
        const orders = db.createObjectStore("ordersData", {
          keyPath: "id",
          autoIncrement: true
        });
        orders.createIndex("status", "status");
        orders.createIndex("orderTime", "orderTime");
      }

      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "username" });
      }

      console.log("✅ DB schema ensured");
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;

      dbInstance.onversionchange = () => {
        console.warn("🔁 DB version changed → reload");
        dbInstance.close();
        location.reload();
      };

      console.log("✅ DB ready v" + DB_VERSION);
      resolve(dbInstance);
    };
  });
}

/* ================= EXPORT ================= */
window.DB_CORE = {
  open: openOrderineDB,
  NAME: DB_NAME,
  VERSION: DB_VERSION
};
