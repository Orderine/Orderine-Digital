// ====================== SUPABASE SYNC (PUSH & PULL) ======================
console.log("🧩 supabase-sync.js LOADED");

// ====================== INIT SUPABASE ======================
const SUPABASE_URL = "https://yscjjisqvlbedtuomrmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L69H0-PapAm3jMWrTyYayQ_4kOd2MMD";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ====================== INDEXEDDB HELPERS ======================
function dumpMenuvaData() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("MenuvaDB", 10);
    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("menuvaData", "readonly");
      const store = tx.objectStore("menuvaData");

      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

function clearMenuvaData() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("MenuvaDB", 10);
    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("menuvaData", "readwrite");
      const store = tx.objectStore("menuvaData");

      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    };
  });
}

function insertSnapshot(snapshot) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("MenuvaDB", 10);
    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("menuvaData", "readwrite");
      const store = tx.objectStore("menuvaData");

      snapshot.forEach(item => store.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// ====================== SUPABASE ACTIONS ======================
function extractRestoId(snapshot) {
  for (const item of snapshot) {
    if (
      typeof item.restoId === "string" &&
      item.restoId.trim() !== "" &&
      item.restoId !== "null"
    ) {
      return item.restoId;
    }
  }
  return null;
}

async function pushSnapshotToSupabase() {
  const snapshot = await dumpMenuvaData();
  const restoId = extractRestoId(snapshot);

  if (!restoId) {
    alert("❌ Resto ID tidak ditemukan");
    return;
  }

  const payload = {
    version: "orderine-indexeddb-v1",
    restoId,
    snapshot
  };

  const { error } = await supabase
    .from("menuva_data")
    .upsert({
      resto_id: restoId,
      data: payload,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);
    alert("❌ Sync gagal");
  } else {
    alert("✅ Sync online sukses");
  }
}

async function pullSnapshotFromSupabase(restoId) {
  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .limit(1);

  if (error) {
    console.error("❌ Supabase error:", error);
    alert("Gagal load data online");
    return;
  }

  if (!data || data.length === 0) {
    console.warn("❌ Data tidak ditemukan untuk resto:", restoId);
    alert("Data online belum ada");
    return;
  }

  const snapshot = data[0].data.snapshot;

  console.log("📥 Snapshot diterima:", snapshot.length, "records");

  // CLEAR + RESTORE
  await clearMenuvaData();
  await insertSnapshot(snapshot);

  console.log("✅ Restore IndexedDB sukses");
  location.reload();
}

// ====================== EXPOSE KE CONSOLE ======================
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;
window.dumpIndexedDB = dumpMenuvaData;

