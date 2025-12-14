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
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

// ====================== HELPERS ======================
function extractRestoId(snapshot) {
  for (const item of snapshot) {
    if (item?.restoId && item.restoId !== "null") {
      return item.restoId;
    }
  }
  return null;
}

function sanitizeSnapshot(snapshot) {
  return snapshot.filter(x => x && typeof x === "object");
}

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

function mergeSections(rows) {
  let snapshot = [];
  rows.forEach(row => {
    if (Array.isArray(row.data)) snapshot.push(...row.data);
    else if (row.data?.snapshot) snapshot.push(...row.data.snapshot);
    else if (typeof row.data === "object") snapshot.push(row.data);
  });
  return sanitizeSnapshot(snapshot);
}

// ====================== PUSH ======================
async function pushSnapshotToSupabase() {
  const restoId = getActiveRestoId();
  if (!restoId) {
    alert("❌ restoId aktif tidak ditemukan");
    return;
  }

  const snapshot = await dumpIndexedDB();
  if (!snapshot.length) {
    alert("⚠️ IndexedDB kosong, tidak ada data untuk sync");
    return;
  }

  const sections = splitSnapshot(snapshot);

  for (const [section, data] of Object.entries(sections)) {
    if (!data.length) continue;

    const { error } = await supabase
      .from("menuva_snapshots")
      .insert({
        resto_id: restoId,
        section,
        data
      });

    if (error) {
      console.error("❌ PUSH ERROR:", section, error);
      return;
    }

    console.log("⬆️ Push section:", section, data.length);
  }

  console.log("✅ ALL SNAPSHOT PARTS PUSHED");
  alert("Sync online selesai");
}

function getActiveRestoId() {
  // PRIORITAS 1: dari localStorage admin
  const fromLocal = localStorage.getItem("menuva_resto_phone");
  if (fromLocal) return fromLocal;

  // PRIORITAS 2: dari IndexedDB snapshot
  // (fallback, bukan utama)
  console.warn("⚠️ restoId fallback ke snapshot");
  return null;
}

// ====================== PULL ======================
async function pullSnapshotFromSupabase(restoId) {
  const { data, error } = await supabase
    .from("menuva_snapshots")
    .select("section, data")
    .eq("resto_id", restoId);

  if (error || !data?.length) {
    console.warn("⚠️ Data tidak ditemukan");
    return;
  }

  const snapshot = mergeSections(data);
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

// ====================== EXPOSE ======================
window.dumpIndexedDB = dumpIndexedDB;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;

