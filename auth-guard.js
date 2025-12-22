// ==================== ORDERINE ADMIN GUARD (ADMIN ONLY) ====================
(function () {
  try {
    // 🔒 JALANKAN GUARD HANYA DI admin.html
    if (!location.pathname.endsWith("admin.html")) {
      console.log("⏭️ Admin Guard skipped on:", location.pathname);
      return;
    }

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

    const now = new Date();

    // ❌ SUBSCRIPTION EXPIRED
    if (activeUser.premiumExpire) {
      const expireDate = new Date(activeUser.premiumExpire);

      if (now > expireDate) {
        activeUser.isExpired = true;

        // update activeUser
        localStorage.setItem("activeUser", JSON.stringify(activeUser));

        // 🔑 SIMPAN USER UNTUK PROSES RENEW
        localStorage.setItem(
          "pendingPlanUser",
          JSON.stringify({
            email: activeUser.email,
            restoID: activeUser.restoID,
            role: activeUser.role,
            currentPlan: activeUser.premiumPlan
          })
        );

        alert(
          activeUser.premiumPlan === "trial"
            ? "❌ Free trial has expired.\nPlease upgrade to continue."
            : "❌ Subscription expired.\nPlease renew your plan."
        );

        // ⛔ LOGOUT PAKSA
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("activeUser");

        location.replace("plans.html");
        return;
      }
    }

    // ❌ PAYMENT BELUM LUNAS (KECUALI TRIAL)
    if (activeUser.premiumPlan !== "trial" && activeUser.isPaid !== true) {
      alert("❌ Payment not confirmed.\nPlease complete your payment.");
      location.replace("payment.html");
      return;
    }

    // ✅ ADMIN AMAN
    console.log(
      "🛡️ Admin Guard OK:",
      activeUser.email,
      "| Role:",
      activeUser.role,
      "| Resto:",
      activeUser.restoID
    );
  } catch (err) {
    console.error("🛑 Admin Guard Fatal Error:", err);
    localStorage.clear();
    location.replace("login.html");
  }
})();
