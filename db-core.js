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
  const DB_VERSION = 24;

  let dbOpeningPromise = null;
  let dbInstance = null;

  /* ======================================================
     OPEN DATABASE
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

          /* ======================================================
           MENU SYSTEM
        ====================================================== */

        if (!db.objectStoreNames.contains("menuData")) {

          const menu = db.createObjectStore("menuData",{ keyPath:"id" });

          menu.createIndex("restoId","restoId",{unique:false});
          menu.createIndex("category","category",{unique:false});
          menu.createIndex("active","active",{unique:false});

        }


        /* ======================================================
           MENU PROMO
        ====================================================== */

        if (!db.objectStoreNames.contains("menuPromo")) {

          const promo = db.createObjectStore("menuPromo",{keyPath:"id"});

          promo.createIndex("restoId","restoId",{unique:false});
          promo.createIndex("isActive","isActive",{unique:false});

        }

         /* ======================================================
   ROOM SYSTEM (NEW 🔥)
====================================================== */

if (!db.objectStoreNames.contains("rooms")) {

  const r = db.createObjectStore("rooms",{ keyPath:"id" });

  r.createIndex("restoId","restoId",{unique:false});
  r.createIndex("active","active",{unique:false});

}

if (!db.objectStoreNames.contains("meetingRooms")) {

  const mr = db.createObjectStore("meetingRooms",{ keyPath:"id" });

  mr.createIndex("restoId","restoId",{unique:false});
  mr.createIndex("active","active",{unique:false});

}

if (!db.objectStoreNames.contains("roomPackages")) {

  const rp = db.createObjectStore("roomPackages",{ keyPath:"id" });

  rp.createIndex("restoId","restoId",{unique:false});
  rp.createIndex("roomId","roomId",{unique:false});
  rp.createIndex("active","active",{unique:false});

}


        /* ======================================================
           MENU VOUCHER
        ====================================================== */

        if (!db.objectStoreNames.contains("menuVoucher")) {

          const voucher = db.createObjectStore("menuVoucher",{keyPath:"id"});

          voucher.createIndex("restoId","restoId",{unique:false});
          voucher.createIndex("isActive","isActive",{unique:false});

        }


        /* ======================================================
           TABLE SYSTEM
        ====================================================== */

        if (!db.objectStoreNames.contains("restaurantTables")) {

          const tables = db.createObjectStore("restaurantTables",{keyPath:"id"});

          tables.createIndex("restoId","restoId",{unique:false});
          tables.createIndex("zone","zone",{unique:false});
          tables.createIndex("capacity","capacity",{unique:false});
          tables.createIndex("active","active",{unique:false});

        }

        if (!db.objectStoreNames.contains("tableStatus")) {

          const ts = db.createObjectStore("tableStatus",{keyPath:"id"});

          ts.createIndex("restoId","restoId",{unique:false});
          ts.createIndex("tableId","tableId",{unique:false});
          ts.createIndex("status","status",{unique:false});

        }

        if (!db.objectStoreNames.contains("tableWalkins")) {

          const w = db.createObjectStore("tableWalkins",{keyPath:"id"});

          w.createIndex("restoId","restoId",{unique:false});
          w.createIndex("tableId","tableId",{unique:false});

        }

         /* ================================
   TABLE LAYOUT (NEW)
================================ */

if (!db.objectStoreNames.contains("restaurantLayouts")) {

  const layout = db.createObjectStore("restaurantLayouts",{keyPath:"id"});

  layout.createIndex("restoId","restoId",{unique:false});

}


      /* ======================================================
   RESERVATION SYSTEM
====================================================== */

if (!db.objectStoreNames.contains("reservations")) {

  const r = db.createObjectStore("reservations",{keyPath:"id"});

  r.createIndex("restoId","restoId",{unique:false});
  r.createIndex("date","date",{unique:false});
  r.createIndex("status","status",{unique:false});

}

if (!db.objectStoreNames.contains("reservationSlots")) {

  const rs = db.createObjectStore("reservationSlots",{keyPath:"id"});

  rs.createIndex("restoId","restoId",{unique:false});
  rs.createIndex("slot","slot",{unique:false});

}

/* ✅ TAMBAHKAN INI */

if (!db.objectStoreNames.contains("reservationSettings")) {

  const set = db.createObjectStore("reservationSettings",{keyPath:"id"});

  set.createIndex("restoId","restoId",{unique:false});

}
         

        /* ======================================================
           ORDER SYSTEM
        ====================================================== */

        if (!db.objectStoreNames.contains("ordersData")) {

          const orders = db.createObjectStore("ordersData",{
            keyPath:"id",
            autoIncrement:true
          });

          orders.createIndex("status","status",{unique:false});
          orders.createIndex("orderTime","orderTime",{unique:false});

        }

        if (!db.objectStoreNames.contains("orderItems")) {

          const oi = db.createObjectStore("orderItems",{keyPath:"id"});

          oi.createIndex("orderId","orderId",{unique:false});

        }


        /* ======================================================
           PAYMENT SYSTEM
        ====================================================== */

        if (!db.objectStoreNames.contains("payments")) {

          const p = db.createObjectStore("payments",{keyPath:"id"});

          p.createIndex("orderId","orderId",{unique:false});
          p.createIndex("method","method",{unique:false});

        }


        /* ======================================================
           INVENTORY
        ====================================================== */

        if (!db.objectStoreNames.contains("inventoryItems")) {

          const inv = db.createObjectStore("inventoryItems",{keyPath:"id"});

          inv.createIndex("restoId","restoId",{unique:false});

        }

        if (!db.objectStoreNames.contains("inventoryLogs")) {

          const log = db.createObjectStore("inventoryLogs",{keyPath:"id"});

          log.createIndex("itemId","itemId",{unique:false});

        }


        /* ======================================================
           ANALYTICS
        ====================================================== */

        if (!db.objectStoreNames.contains("dailyStats")) {

          const stats = db.createObjectStore("dailyStats",{keyPath:"id"});

          stats.createIndex("restoId","restoId",{unique:false});
          stats.createIndex("date","date",{unique:false});

        }


        /* ======================================================
           LEGACY SUPPORT
        ====================================================== */

        if (!db.objectStoreNames.contains("promoData"))
          db.createObjectStore("promoData",{keyPath:"id",autoIncrement:true});

        if (!db.objectStoreNames.contains("flipbookData")) {

          const flip = db.createObjectStore("flipbookData",{keyPath:"id",autoIncrement:true});

          flip.createIndex("type","type",{unique:false});
          flip.createIndex("refId","refId",{unique:false});

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
