// ==================== ORDERINE ADMIN GUARD (ADMIN ONLY) ====================
(function () {
  try {
    // 🔒 JALANKAN GUARD HANYA DI admin.html
    if (!location.pathname.endsWith("admin.html")) return;

    // ==================== LOAD SESSION ====================
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");

    // ❌ BELUM LOGIN
    if (!isLoggedIn || !activeUser || !activeUser.email) {
      location.replace("login.html");
      return;
    }

    // ❌ ROLE INVALID
    if (!["owner", "admin"].includes(activeUser.role)) {
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    // ❌ TIDAK TERIKAT RESTO
    if (!activeUser.restoID) {
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    // ==================== SUBSCRIPTION GUARD (FIXED) ====================
    const now = new Date();

    /*
      👉 RULE BARU:
      - Kalau user SUDAH LOGIN & ROLE VALID
      - DAN pernah bayar (isPaid / paymentSuccess)
      - MAKA JANGAN DIBLOK walau plan belum sinkron
    */

    const isPaidUser =
      activeUser.isPaid === true ||
      activeUser.paymentStatus === "success" ||
      activeUser.subscriptionStatus === "active";

    // ✅ USER PAID → LEWATKAN SEMUA CEK PLAN
    if (isPaidUser) {
      console.log("💳 Paid user detected, skip subscription block");
      return;
    }

    // ⚠️ TRIAL MODE (BOLEH MASUK)
    if (activeUser.premiumPlan === "trial") {
      if (!activeUser.premiumExpire) return;

      const expireDate = new Date(activeUser.premiumExpire);
      if (now <= expireDate) return;

      forceRenew(
        activeUser,
        "❌ Free trial has expired.\nPlease upgrade to continue."
      );
      return;
    }

    // ❌ BELUM PAID & BUKAN TRIAL
    forceRenew(
      activeUser,
      "❌ Subscription inactive.\nPlease choose a plan."
    );
  } catch (err) {
    console.error("🛑 Admin Guard Fatal Error:", err);
    localStorage.clear();
    location.replace("login.html");
  }

  // ==================== FORCE RENEW HANDLER ====================
  function forceRenew(user, message) {
    localStorage.setItem(
      "pendingPlanUser",
      JSON.stringify({
        email: user.email,
        restoID: user.restoID,
        role: user.role,
        currentPlan: user.premiumPlan || null
      })
    );

    alert(message);

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("activeUser");

    location.replace("plans.html");
  }
})();
