// ====================== SUPABASE SYNC ======================
console.log("🧩 supabase-sync.js LOADED");

// ====================== INIT SUPABASE ======================
const SUPABASE_URL = "https://yscjjisqvlbedtuomrmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L69H0-PapAm3jMWrTyYayQ_4kOd2MMD";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ====================== INDEXEDDB HELPERS ======================

function dumpIndexedDB() {
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

function clearIndexedDB() {
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

function restoreIndexedDB(snapshot) {
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

// ====================== UTIL ======================

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

// ====================== PUSH ======================

async function pushSnapshotToSupabase() {
  const snapshot = await dumpIndexedDB();
  if (!snapshot.length) return alert("Snapshot kosong");

  const restoId = extractRestoId(snapshot);
  if (!restoId) return alert("Resto ID tidak ditemukan");

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
    console.log("✅ Sync sukses:", restoId);
    alert("Sync online sukses");
  }
}

// ====================== PULL ======================

async function pullSnapshotFromSupabase(restoId) {
  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .single();

  if (error || !data?.data?.snapshot) {
    console.error(error);
    alert("❌ Snapshot tidak ditemukan");
    return;
  }

  await clearIndexedDB();
  await restoreIndexedDB(data.data.snapshot);

  console.log("✅ Restore selesai:", data.data.snapshot.length);
  location.reload();
}

// ====================== EXPOSE (PALING BAWAH) ======================

window.dumpIndexedDB = dumpIndexedDB;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;
