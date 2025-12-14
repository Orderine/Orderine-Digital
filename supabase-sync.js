// ====================== SUPABASE SYNC (SAFE MODE) ======================
console.log("🧩 supabase-sync.js LOADED (SAFE MODE)");

// ====================== SUPABASE INIT ======================
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

// ====================== RESTO ID EXTRACT ======================
function extractRestoId(snapshot) {
  for (const item of snapshot) {
    if (
      typeof item?.restoId === "string" &&
      item.restoId.trim() !== "" &&
      item.restoId !== "null"
    ) {
      return item.restoId;
    }
  }
  return null;
}

// ====================== SNAPSHOT SANITIZER ======================
function sanitizeSnapshot(snapshot) {
  return snapshot.map(item => {
    const clean = {};

    for (const key in item) {
      const value = item[key];

      // ❌ buang function & undefined
      if (typeof value === "function" || value === undefined) continue;

      // ❌ buang data DOM / event
      if (value instanceof HTMLElement) continue;

      // ❌ buang string super besar (>200KB)
      if (typeof value === "string" && value.length > 200_000) continue;

      clean[key] = value;
    }

    return clean;
  });
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

// ====================== PUSH SNAPSHOT (SAFE SPLIT MODE) ======================
async function pushSnapshotToSupabase() {
  console.group("⬆️ PUSH SNAPSHOT");

  const rawSnapshot = await dumpIndexedDB();
  if (!rawSnapshot.length) {
    console.warn("⚠️ IndexedDB kosong");
    console.groupEnd();
    return;
  }

  const restoId = extractRestoId(rawSnapshot);
  if (!restoId) {
    alert("❌ restoId tidak ditemukan");
    console.groupEnd();
    return;
  }

  const sanitized = sanitizeSnapshot(rawSnapshot);
  const sections = splitSnapshot(sanitized);

  for (const [section, data] of Object.entries(sections)) {
    if (!data.length) continue;

    console.log(`⬆️ Push section [${section}]`, data.length);

    const { error } = await supabase
      .from("menuva_snapshots")
      .insert({
        resto_id: restoId,
        section,
        data
      });

    if (error) {
      console.error("❌ PUSH FAILED:", section, error);
      alert("Gagal sync bagian: " + section);
      console.groupEnd();
      return;
    }
  }

  console.log("✅ ALL SNAPSHOT PARTS PUSHED");
  alert("Sync online selesai (SAFE MODE)");
  console.groupEnd();
}

// ====================== PULL SNAPSHOT (SINGLE JSON) ======================
async function pullSnapshotFromSupabase(restoId) {
  console.group("📥 PULL SNAPSHOT");

  const { data, error } = await supabase
    .from("menuva_data")
    .select("data")
    .eq("resto_id", restoId)
    .maybeSingle();

  if (error || !data?.data?.snapshot) {
    console.warn("⚠️ Data tidak ditemukan");
    console.groupEnd();
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
      console.groupEnd();
    };
  };
}

// ====================== EXPOSE MANUAL ======================
window.dumpIndexedDB = dumpIndexedDB;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;
