// ====================== SUBSCRIPTION GUARD ======================
// NOTE: hanya dipasang di halaman ADMIN

(async function subscriptionGuard() {
  try {
    // 1️⃣ ambil admin yang sedang login
    const admin = await getLoggedInAdmin();

    if (!admin) {
      // tidak login → lempar ke login
      location.replace("login.html");
      return;
    }

    const sub = admin.subscription;

    // 2️⃣ validasi subscription
    if (!sub || !sub.end_date) {
      forceLogout("Subscription tidak valid");
      return;
    }

    const now = Date.now();

    // 3️⃣ cek expired
    const isExpired =
      sub.status !== "active" || now > sub.end_date;

    if (isExpired) {
      forceLogout("Subscription expired");
      return;
    }

    // 4️⃣ expose global (opsional)
    window.currentSubscription = sub;

    console.log("✅ Subscription aktif:", sub.plan);

  } catch (err) {
    console.error("Subscription guard error:", err);
    forceLogout("Subscription guard failure");
  }
})();
