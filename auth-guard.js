// ==================== ORDERINE AUTH GUARD (PRODUCTION READY) ====================
(function () {
  try {
    const page = location.pathname.split("/").pop();

    // ==================== LOAD SESSION ====================
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");

    // ==================== PUBLIC PAGES ====================
    const publicPages = [
      "login.html",
      "admin-login.html",
      "accept-invite.html",
      "plans.html"
    ];

    if (publicPages.includes(page)) return;

    // ==================== BASIC AUTH ====================
    if (!isLoggedIn || !activeUser || !activeUser.email) {
      redirectLogin();
      return;
    }

    if (!["owner", "admin"].includes(activeUser.role)) {
      hardLogout();
      return;
    }

    if (!activeUser.restoID) {
      hardLogout();
      return;
    }

    // ==================== OWNER ACCESS ====================
    if (activeUser.role === "owner") {
      // owner bebas akses semua halaman internal
      return;
    }

    // ==================== ADMIN ACCESS ====================
    const adminType = activeUser.adminType || "cashier";
    const permissions = activeUser.permissions || [];

    // ==================== PAGE → PERMISSION MAP ====================
    const PAGE_RULES = {
      "recievers.html": ["orders", "payments"],
      "order.html": ["orders"],
      "book.html": ["orders"],
      "menu-manager.html": ["menu", "stock"],
      "room-manager.html": ["room"]
    };

    // ❌ ADMIN BLOK DASHBOARD OWNER
    if (page === "admin.html") {
      safeRedirect(activeUser);
      return;
    }

    // ❌ PAGE TIDAK TERDAFTAR
    if (!PAGE_RULES[page]) {
      safeRedirect(activeUser);
      return;
    }

    // ❌ PERMISSION CHECK
    const requiredPerms = PAGE_RULES[page];
    const hasAccess = requiredPerms.some(p =>
      permissions.includes(p)
    );

    if (!hasAccess) {
      safeRedirect(activeUser);
      return;
    }

    // ==================== SUBSCRIPTION CHECK (ADMIN & OWNER) ====================
    if (activeUser.role === "owner") return;

    const now = new Date();

    const isPaidUser =
      activeUser.isPaid === true ||
      activeUser.paymentStatus === "success" ||
      activeUser.subscriptionStatus === "active";

    if (isPaidUser) return;

    // ⚠️ TRIAL MODE
    if (activeUser.premiumPlan === "trial") {
      if (!activeUser.premiumExpire) return;

      const expireDate = new Date(activeUser.premiumExpire);
      if (now <= expireDate) return;

      forceRenew(activeUser, "❌ Free trial has expired.");
      return;
    }

    // ❌ BELUM BAYAR
    forceRenew(activeUser, "❌ Subscription inactive.");

  } catch (err) {
    console.error("🛑 Auth Guard Fatal Error:", err);
    hardLogout();
  }

  // ==================== HELPERS ====================
  function safeRedirect(user) {
    if (user.redirect) {
      location.replace(user.redirect);
    } else {
      location.replace("recievers.html");
    }
  }

  function redirectLogin() {
    localStorage.clear();
    location.replace("login.html");
  }

  function hardLogout() {
    localStorage.clear();
    location.replace("login.html");
  }

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

