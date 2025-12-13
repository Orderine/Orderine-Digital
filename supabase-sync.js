// ====================== SUPABASE SYNC ======================
console.log("🧩 supabase-sync.js LOADED");

// ====================== INIT SUPABASE ======================
const SUPABASE_URL = "https://yscjjisqvlbedtuomrmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L69H0-PapAm3jMWrTyYayQ_4kOd2MMD";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ====================== INDEXEDDB DUMP ======================
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

// ====================== EXTRACT RESTO ID ======================
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

// ====================== PUSH SNAPSHOT ======================
async function pushSnapshotToSupabase() {
  const snapshot = await dumpIndexedDB();
  if (!snapshot.length) {
    console.warn("⚠️ Snapshot kosong");
    return;
  }

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
    console.error("❌ Push gagal:", error);
  } else {
    console.log("✅ Push sukses:", restoId);
  }
}

// ====================== TEST PULL ======================
async function testPullSnapshot(restoId) {
  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .single();

  if (error) {
    console.error("❌ Supabase error:", error);
    return;
  }

  console.group("📥 SUPABASE SNAPSHOT");
  console.log("Resto ID:", restoId);
  console.log("Snapshot count:", data.data.snapshot.length);
  console.groupEnd();
}

// ====================== CLEAR INDEXEDDB ======================
function testClearIndexedDB() {
  const req = indexedDB.open("MenuvaDB", 10);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("menuvaData", "readwrite");
    const store = tx.objectStore("menuvaData");

    store.clear().onsuccess = () => {
      console.log("🧹 IndexedDB CLEARED");
    };
  };
}

// ====================== RESTORE SNAPSHOT ======================
async function restoreSnapshot(restoId) {
  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .single();

  if (error || !data?.data?.snapshot) {
    console.error("❌ Snapshot tidak ditemukan");
    return;
  }

  const snapshot = data.data.snapshot;

  const req = indexedDB.open("MenuvaDB", 10);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("menuvaData", "readwrite");
    const store = tx.objectStore("menuvaData");

    snapshot.forEach(item => store.put(item));

    tx.oncomplete = () => {
      console.log("✅ Snapshot restored:", snapshot.length);
      location.reload();
    };
  };
}

// ====================== ALIAS LEGACY ======================
// biar console & test step 4 jalan

window.dumpIndexedDB = dumpMenuvaData;
window.testPullSnapshot = testPullSnapshot;
window.testClearIndexedDB = testClearIndexedDB;
window.restoreSnapshot = restoreSnapshot;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;

console.log("✅ supabase-sync.js READY");

