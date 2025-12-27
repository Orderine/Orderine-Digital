// ==================== ORDERINE ADMIN GUARD (ADMIN ONLY) ====================
(function () {
  try {
    // 🔒 JALANKAN GUARD HANYA DI admin.html
    if (!location.pathname.endsWith("admin.html")) {
      console.log("⏭️ Admin Guard skipped on:", location.pathname);
      return;
    }

    // ==================== LOAD SESSION ====================
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");

    // ❌ BELUM LOGIN
    if (!isLoggedIn || !activeUser || !activeUser.email) {
      console.warn("🚫 Admin Guard: Not logged in");
      location.replace("login.html");
      return;
    }

    // ❌ ROLE INVALID
    if (!["owner", "admin"].includes(activeUser.role)) {
      alert("❌ Access denied.");
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    // ❌ TIDAK TERIKAT RESTO
    if (!activeUser.restoID) {
      alert("❌ No restaurant assigned.");
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    // ==================== SUBSCRIPTION GUARD ====================
    const now = new Date();

    // ❌ TIDAK PUNYA PLAN SAMA SEKALI
    if (!activeUser.premiumPlan) {
      forceRenew(activeUser, "❌ Subscription inactive.\nPlease choose a plan.");
      return;
    }

    // ❌ PLAN ADA TAPI EXPIRE TIDAK ADA (DATA RUSAK)
    if (!activeUser.premiumExpire) {
      console.warn("⚠️ premiumExpire missing");
      forceRenew(activeUser, "❌ Subscription data invalid.\nPlease renew your plan.");
      return;
    }

    const expireDate = new Date(activeUser.premiumExpire);

    // ❌ EXPIRED
    if (now > expireDate) {
      activeUser.isExpired = true;
      localStorage.setItem("activeUser", JSON.stringify(activeUser));

      const msg =
        activeUser.premiumPlan === "trial"
          ? "❌ Free trial has expired.\nPlease upgrade to continue."
          : "❌ Subscription expired.\nPlease renew your plan.";

      forceRenew(activeUser, msg);
      return;
    }

    // ==================== ADMIN AMAN ====================
    console.log(
      "🛡️ Admin Guard OK:",
      activeUser.email,
      "| Role:",
      activeUser.role,
      "| Resto:",
      activeUser.restoID,
      "| Plan:",
      activeUser.premiumPlan
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
