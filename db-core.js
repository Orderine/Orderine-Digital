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
  const DEBUG_DB = false;

  const DB_NAME = "MenuvaDB";
  const DB_VERSION = 27;

  let dbOpeningPromise = null;
  let dbInstance = null;

  /* ======================================================
     OPEN DATABASE
  ====================================================== */
   function ensureStore(db, tx, name, options, indexes = []) {

  let store;

  if (!db.objectStoreNames.contains(name)) {
    store = db.createObjectStore(name, options);
  } else {
    store = tx.objectStore(name);
  }

  indexes.forEach(idx => {
    if (!store.indexNames.contains(idx.name)) {
      store.createIndex(idx.name, idx.keyPath, idx.options || { unique:false });
    }
  });

  return store;
}

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

        /* ======================================================
           CORE SYSTEM
        ====================================================== */

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


        /* ======================================================
           SECURITY / AUDIT
        ====================================================== */

        if (!db.objectStoreNames.contains("void_logs")) {

          const v = db.createObjectStore("void_logs", { keyPath: "id" });

          v.createIndex("type", "type", { unique:false });
          v.createIndex("createdAt", "createdAt", { unique:false });

        }


        /* ======================================================
           MULTI BRANCH
        ====================================================== */

         if (!db.objectStoreNames.contains("branches")) {

         const b = db.createObjectStore("branches",{ keyPath:"id" });

         b.createIndex("restoId","restoId",{unique:false});
         b.createIndex("isMain","isMain",{unique:false});

         }

         const tx = e.target.transaction;

   ensureStore(db, tx, "restoBranches",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" }
  ]
);

/* ======================================================
   MENU SYSTEM
====================================================== */

ensureStore(db, tx, "menuData",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"category", keyPath:"category" },
    { name:"active", keyPath:"active" }
  ]
);

/* ======================================================
   MENU PROMO
====================================================== */

ensureStore(db, tx, "menuPromo",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"isActive", keyPath:"isActive" }
  ]
);

/* ======================================================
   ROOM SYSTEM
====================================================== */

ensureStore(db, tx, "rooms",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"active", keyPath:"active" }
  ]
);

ensureStore(db, tx, "meetingRooms",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"active", keyPath:"active" }
  ]
);

ensureStore(db, tx, "roomPackages",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"roomId", keyPath:"roomId" },
    { name:"active", keyPath:"active" }
  ]
);

/* ======================================================
   MENU VOUCHER
====================================================== */

ensureStore(db, tx, "menuVoucher",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" }, // 🔥 TAMBAH
    { name:"isActive", keyPath:"isActive" }
  ]
);

/* ======================================================
   TABLE SYSTEM
====================================================== */

ensureStore(db, tx, "restaurantTables",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"zone", keyPath:"zone" },
    { name:"capacity", keyPath:"capacity" },
    { name:"active", keyPath:"active" }
  ]
);

ensureStore(db, tx, "tableStatus",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"tableId", keyPath:"tableId" },
    { name:"status", keyPath:"status" }
  ]
);

ensureStore(db, tx, "tableWalkins",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" }, // 🔥 TAMBAH
    { name:"tableId", keyPath:"tableId" }
  ]
);

/* ======================================================
   TABLE LAYOUT
====================================================== */

ensureStore(db, tx, "restaurantLayouts",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" } // 🔥 TAMBAH
  ]
);

/* ======================================================
   RESERVATION
====================================================== */

ensureStore(db, tx, "reservations",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"date", keyPath:"date" },
    { name:"status", keyPath:"status" }
  ]
);

ensureStore(db, tx, "reservationSlots",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" }, // 🔥 TAMBAH
    { name:"slot", keyPath:"slot" }
  ]
);

ensureStore(db, tx, "reservationSettings",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" } // 🔥 TAMBAH
  ]
);

/* ======================================================
   ORDER SYSTEM
====================================================== */

ensureStore(db, tx, "ordersData",
  { keyPath:"id", autoIncrement:true },
  [
    { name:"status", keyPath:"status" },
    { name:"branchId", keyPath:"branchId" },
    { name:"orderTime", keyPath:"orderTime" }
  ]
);

ensureStore(db, tx, "orderItems",
  { keyPath:"id" },
  [
    { name:"orderId", keyPath:"orderId" }
  ]
);

/* ======================================================
   PAYMENT
====================================================== */

ensureStore(db, tx, "payments",
  { keyPath:"id" },
  [
    { name:"orderId", keyPath:"orderId" },
    { name:"method", keyPath:"method" }
  ]
);

/* ======================================================
   INVENTORY
====================================================== */

ensureStore(db, tx, "inventoryItems",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" }
  ]
);

ensureStore(db, tx, "inventoryLogs",
  { keyPath:"id" },
  [
    { name:"itemId", keyPath:"itemId" }
  ]
);

/* ======================================================
   ANALYTICS
====================================================== */

ensureStore(db, tx, "dailyStats",
  { keyPath:"id" },
  [
    { name:"restoId", keyPath:"restoId" },
    { name:"branchId", keyPath:"branchId" },
    { name:"date", keyPath:"date" }
  ]
);

/* ======================================================
   LEGACY
====================================================== */

ensureStore(db, tx, "promoData",
  { keyPath:"id", autoIncrement:true },
  []
);

ensureStore(db, tx, "flipbookData",
  { keyPath:"id", autoIncrement:true },
  [
    { name:"type", keyPath:"type" },
    { name:"refId", keyPath:"refId" }
  ]
);

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

    const timeoutPromise = new Promise((_, reject)=>
      setTimeout(()=>{

        if(DEBUG_DB) console.warn("⏳ IndexedDB open timeout");

        dbOpeningPromise=null;

        reject(new Error("DB open timeout"));

      },12000)
    );

    return Promise.race([dbOpeningPromise, timeoutPromise]);

  }


  /* ======================================================
     SAFE STORE ACCESS
  ====================================================== */

  async function withStore(storeName,mode,callback){

    if(!MENUVA_DB.STORES.includes(storeName)){
      throw new Error(`🚫 Illegal store access: ${storeName}`);
    }

    let db = await openDB();

    try{

      return await new Promise((resolve,reject)=>{

        const tx=db.transaction(storeName,mode);

        const store=tx.objectStore(storeName);

        const request=callback(store);

        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);

      });

    }catch(err){

      console.warn("⚠️ DB retrying due to error:",err);

      dbInstance=null;

      db=await openDB();

      return new Promise((resolve,reject)=>{

        const tx=db.transaction(storeName,mode);

        const store=tx.objectStore(storeName);

        const request=callback(store);

        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);

      });

    }

  }


  /* ======================================================
     PUBLIC API
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

  "branches",
  "restoBranches",
  "void_logs",

  "menuData",
  "menuPromo",
  "menuVoucher",

   "rooms",
   "meetingRooms",
   "roomPackages",

  "restaurantTables",
  "tableStatus",
  "tableWalkins",

  "reservations",
  "reservationSlots",
  "reservationSettings",

  "ordersData",
  "orderItems",
  "payments",

  "inventoryItems",
  "inventoryLogs",

  "promoData",
  "flipbookData",

  "dailyStats",

  // 🔥 TAMBAH INI
  "restaurantLayouts"

],

    openDB,

    add(store,data){
      return withStore(store,"readwrite",s=>s.put(data));
    },

    update(store,data){
      return this.add(store,data);
    },

    get(store,key){
      return withStore(store,"readonly",s=>s.get(key));
    },

    getAll(store){
      return withStore(store,"readonly",s=>s.getAll());
    },

    delete(store,key){
      return withStore(store,"readwrite",s=>s.delete(key));
    },

    /* ===== SESSION ===== */

    setSession(user){

      return withStore("session","readwrite",s=>
        s.put({id:"active",...user,loginAt:Date.now()})
      );

    },

    getSession(){
      return withStore("session","readonly",s=>s.get("active"));
    },

    clearSession(){
      return withStore("session","readwrite",s=>s.delete("active"));
    }

  };

})();
