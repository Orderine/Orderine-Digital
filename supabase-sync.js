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

// ====================== RESTO ID ======================
function extractRestoId(snapshot) {
  for (const item of snapshot) {
    if (typeof item.restoId === "string" && item.restoId.trim() !== "") {
      return item.restoId;
    }
  }
  return null;
}

// ====================== SPLIT SNAPSHOT ======================
function splitSnapshot(snapshot) {
  return {
    core: snapshot.filter(x => x.restoId),
    promo: snapshot.filter(x => Array.isArray(x.menuPromo) && x.menuPromo.length),
    menu: snapshot.filter(x => Array.isArray(x.menuData) && x.menuData.length),
    other: snapshot.filter(
      x => !x.restoId && !x.menuPromo && !x.menuData
    )
  };
}

// ====================== PUSH ======================
async function pushSnapshotToSupabase() {
  const snapshot = await dumpIndexedDB();
  const restoId = extractRestoId(snapshot);

  if (!restoId) {
    alert("❌ restoId tidak ditemukan");
    return;
  }

  const sections = splitSnapshot(snapshot);

  for (const [section, data] of Object.entries(sections)) {
    if (!data.length) continue;

    console.log("⬆️ Push section:", section, data.length);

    const { error } = await supabase
      .from("menuva_snapshots")
      .insert({
        resto_id: restoId,
        section,
        data
      });

    if (error) {
      console.error("❌ Gagal push", section, error);
      alert("Gagal sync bagian: " + section);
      return;
    }
  }

  console.log("✅ ALL SNAPSHOT PARTS PUSHED");
  alert("Sync online selesai (split mode)");
}

// ====================== MERGE SECTIONS ======================
function mergeSections(rows) {
  const snapshot = [];

  rows.forEach(row => {
    if (Array.isArray(row.data)) {
      snapshot.push(...row.data);
    } else if (typeof row.data === "object") {
      snapshot.push(row.data);
    }
  });

  return snapshot;
}

// ====================== PULL & RESTORE ======================
async function pullSnapshotFromSupabase(restoId) {
  const { data: rows, error } = await supabase
    .from("menuva_snapshots")
    .select("section, data")
    .eq("resto_id", restoId);

  if (error || !rows || !rows.length) {
    console.warn("⚠️ Data tidak ditemukan");
    return;
  }

  const snapshot = mergeSections(rows);
  console.log("📥 MERGED SNAPSHOT:", snapshot.length);

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
