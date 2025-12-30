// ==================== ORDERINE AUTH GUARD PRO ====================
(function () {
  try {
    const page = location.pathname.split("/").pop();

    // ==================== LOAD SESSION (LEGACY SAFE) ====================
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");

    // ==================== PUBLIC PAGES ====================
    const publicPages = [
      "login.html",
      "admin-login.html",
      "invite.html"
    ];

    if (publicPages.includes(page)) return;

    // ==================== BASIC AUTH CHECK ====================
    if (!isLoggedIn || !activeUser || !activeUser.email) {
      location.replace("login.html");
      return;
    }

    if (!["owner", "admin"].includes(activeUser.role)) {
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    if (!activeUser.restoID) {
      localStorage.clear();
      location.replace("login.html");
      return;
    }

    // ==================== ROLE → PAGE RULE ====================
    const staffAllowedPages = [
      "recieves.html", // typo disengaja
      "order.html",
      "book.html",
      "room.html"
    ];

    // ❌ STAFF BLOK ADMIN DASHBOARD
    if (
      activeUser.role === "admin" &&
      page === "admin.html"
    ) {
      location.replace("recieves.html");
      return;
    }

    // ❌ STAFF BLOK PAGE LAIN
    if (
      activeUser.role === "admin" &&
      !staffAllowedPages.includes(page)
    ) {
      location.replace("recieves.html");
      return;
    }

    // ==================== SUBSCRIPTION GUARD (LEGACY, UNCHANGED) ====================
    const now = new Date();

    const isPaidUser =
      activeUser.isPaid === true ||
      activeUser.paymentStatus === "success" ||
      activeUser.subscriptionStatus === "active";

    if (isPaidUser) {
      console.log("💳 Paid user detected, skip subscription block");
      return;
    }

    // ⚠️ TRIAL MODE
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
    console.error("🛑 Auth Guard Pro Fatal Error:", err);
    localStorage.clear();
    location.replace("login.html");
  }

  // ==================== FORCE RENEW HANDLER (LEGACY SAFE) ====================
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
