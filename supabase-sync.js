// ====================== SUPABASE SYNC (PUSH) ======================

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
