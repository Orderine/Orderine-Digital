// ====================== SUBSCRIPTION GUARD (STANDALONE) ======================
(async function () {

  const DB_NAME = "orderine_db";
  const STORE = "admins";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getLoggedInAdmin() {
    const db = await openDB();

    return new Promise(resolve => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const admin = req.result.find(a => a.isLoggedIn);
        resolve(admin || null);
      };
      req.onerror = () => resolve(null);
    });
  }

  async function forceLogout(reason = "") {
    console.warn("⛔ AUTO LOGOUT:", reason);

    const admin = await getLoggedInAdmin();
    if (admin) {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      admin.isLoggedIn = false;
      tx.objectStore(STORE).put(admin);
    }

    localStorage.clear();
    sessionStorage.clear();

    location.replace("expired.html");
  }

  // ====================== MAIN FLOW ======================
  const admin = await getLoggedInAdmin();

  if (!admin) {
    location.replace("login.html");
    return;
  }

  const sub = admin.subscription;

  if (!sub || !sub.end_date) {
    await forceLogout("Subscription invalid");
    return;
  }

  const now = Date.now();
  const expired =
    sub.status !== "active" || now > sub.end_date;

  if (expired) {
    await forceLogout("Trial expired");
    return;
  }

  console.log("✅ Subscription aktif");

})();
