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

async function pullSnapshotFromSupabase(restoId) {
  console.warn("⚠️ RESTORE ONLINE DIMULAI:", restoId);

  // STEP 1: ambil daftar row TANPA data besar
  const { data: rows, error } = await supabase
    .from("menuva_snapshots")
    .select("id, section")
    .eq("resto_id", restoId);

  if (error || !rows || !rows.length) {
    console.warn("⚠️ Data tidak ditemukan");
    return;
  }

  let merged = [];

  // STEP 2: ambil data SATU-SATU (anti hang)
  for (const row of rows) {
    const { data: rowData, error: rowError } = await supabase
      .from("menuva_snapshots")
      .select("data")
      .eq("id", row.id)
      .single();

    if (rowError || !rowData?.data) continue;

    const payload = rowData.data;

    if (Array.isArray(payload)) {
      merged.push(...payload);
    } else if (payload.snapshot && Array.isArray(payload.snapshot)) {
      merged.push(...payload.snapshot);
    } else if (typeof payload === "object") {
      merged.push(payload);
    }
  }

  if (!merged.length) {
    console.warn("⚠️ Snapshot kosong");
    return;
  }

  console.log("📥 MERGED SNAPSHOT:", merged.length);

  // STEP 3: sanitize + pastikan ID (ANTI IndexedDB ERROR)
  const safeSnapshot = merged
    .filter(x => x && typeof x === "object")
    .map((item, index) => {
      if (item.id === undefined || item.id === null) {
        item.id = Date.now() + index; // fallback ID aman
      }
      return item;
    });

  // STEP 4: RESTORE KE INDEXEDDB
  const req = indexedDB.open("MenuvaDB", 10);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("menuvaData", "readwrite");
    const store = tx.objectStore("menuvaData");

    store.clear().onsuccess = () => {
      safeSnapshot.forEach(item => store.put(item));

      tx.oncomplete = () => {
        console.log("✅ RESTORE OK:", safeSnapshot.length);
      };
    };
  };
}

async function restoreFromOnline(restoId) {
  console.warn("⚠️ RESTORE ONLINE DIMULAI:", restoId);

  await pullSnapshotFromSupabase(restoId);

  alert("✅ RESTORE ONLINE BERHASIL\nHalaman akan dimuat ulang");
  location.reload();
}

function openRestorePopup() {
  document.getElementById("restoreModal").classList.remove("hidden");
}

function closeRestorePopup() {
  document.getElementById("restoreModal").classList.add("hidden");
}

async function confirmRestore() {
  const restoId = document.getElementById("restoreRestoId").value.trim();

  if (!restoId) {
    alert("❌ No Telp Resto wajib diisi");
    return;
  }

  const yakin = confirm(
    "INI AKAN MENGHAPUS SEMUA DATA LOKAL.\n\nLANJUTKAN?"
  );

  if (!yakin) return;

  closeRestorePopup();

  console.log("🔥 RESTORE START:", restoId);
  await pullSnapshotFromSupabase(restoId);
}


// ====================== EXPOSE ======================
window.dumpIndexedDB = dumpIndexedDB;
window.pushSnapshotToSupabase = pushSnapshotToSupabase;
window.pullSnapshotFromSupabase = pullSnapshotFromSupabase;





