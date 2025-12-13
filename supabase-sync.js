// ====================== SUPABASE SYNC (PUSH) ======================
console.log("🧩 supabase-sync.js LOADED");

// 1️⃣ INIT SUPABASE
const SUPABASE_URL = "https://yscjjisqvlbedtuomrmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L69H0-PapAm3jMWrTyYayQ_4kOd2MMD";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// 2️⃣ DUMP MENUVA DATA (ALL RECORDS)
async function dumpMenuvaData() {
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

// 3️⃣ AMBIL RESTO ID (NO TLP)
function extractRestoId(snapshot) {
  // cari record yang punya restoId valid
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

// 4️⃣ PUSH KE SUPABASE
async function pushSnapshotToSupabase() {
  const snapshot = await dumpMenuvaData();
  if (!snapshot.length) {
    console.warn("⚠️ Snapshot kosong");
    return;
  }

  const restoId = extractRestoId(snapshot);
  if (!restoId) {
    alert("❌ Resto ID (no tlp) tidak ditemukan");
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
    console.error("❌ Sync gagal:", error);
    alert("Sync ke Supabase gagal");
  } else {
    console.log("✅ Sync ke Supabase sukses:", restoId);
    alert("Sync online sukses");
  }
}

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
  console.log("Payload:", data.data);
  console.log("Snapshot count:", data.data.snapshot.length);
  console.groupEnd();
}

async function testClearIndexedDB() {
  const req = indexedDB.open("MenuvaDB", 10);

  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("menuvaData", "readwrite");
    const store = tx.objectStore("menuvaData");

    store.clear().onsuccess = () => {
      console.log("🧹 IndexedDB menuvaData CLEARED");
    };
  };
}

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
      console.log("✅ Snapshot restored:", snapshot.length, "records");
      location.reload();
    };
  };
}

window.testPullSnapshot = testPullSnapshot;
window.testClearIndexedDB = testClearIndexedDB;
window.restoreSnapshot = restoreSnapshot;
window.dumpIndexedDB = dumpIndexedDB;

// ====================== ALIAS & GLOBAL EXPOSE ======================

// alias biar konsisten dengan step-step sebelumnya
const dumpIndexedDB = dumpMenuvaData;

// expose ke window untuk console testing
window.dumpIndexedDB = dumpIndexedDB;
window.testPullSnapshot = testPullSnapshot;
window.testClearIndexedDB = testClearIndexedDB;
window.restoreSnapshot = restoreSnapshot;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;

