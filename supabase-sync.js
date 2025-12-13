// ====================== SUPABASE SYNC (SAFE MODE) ======================
console.log("🧩 supabase-sync.js LOADED (SAFE MODE)");

const SUPABASE_URL = "https://yscjjisqvlbedtuomrmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L69H0-PapAm3jMWrTyYayQ_4kOd2MMD";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ====================== INDEXEDDB DUMP ======================
async function dumpIndexedDB() {
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

// ====================== PUSH (MANUAL ONLY) ======================
async function pushSnapshotToSupabase() {
  const snapshot = await dumpIndexedDB();

  if (!snapshot.length) {
    console.warn("⚠️ Snapshot kosong");
    return;
  }

  const restoId = snapshot.find(
    x => typeof x.restoId === "string" && x.restoId && x.restoId !== "null"
  )?.restoId;

  if (!restoId) {
    alert("❌ restoId tidak ditemukan");
    return;
  }

  const payload = {
    version: "orderine-indexeddb-v1",
    snapshot
  };

  const { error } = await supabase
    .from("menuva_data")
    .upsert({
      resto_id: restoId,
      data: payload
    });

  if (error) {
    console.error("❌ PUSH ERROR:", error);
  } else {
    console.log("✅ PUSH OK:", restoId);
  }
}

// ====================== PULL (NO AUTO RELOAD) ======================
async function pullSnapshotFromSupabase(restoId) {
  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .maybeSingle(); // ⬅️ PENTING

  if (error || !data) {
    console.warn("⚠️ Data tidak ditemukan");
    return;
  }

  const snapshot = data.data.snapshot;

  const req = indexedDB.open("MenuvaDB", 10);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("menuvaData", "readwrite");
    const store = tx.objectStore("menuvaData");

    store.clear().onsuccess = () => {
      snapshot.forEach(item => store.put(item));
      console.log("✅ RESTORE OK:", snapshot.length);
    };
  };
}

// ====================== EXPOSE MANUAL ======================
window.dumpIndexedDB = dumpIndexedDB;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;
