// ==================== ORDERINE AUTH GUARD (INDEXEDDB VERSION) ====================
import { getSession, clearSession } from "./db.js";

(async function authGuard() {
  try {
    const page = location.pathname.split("/").pop();

    // ==================== PUBLIC PAGES ====================
    const publicPages = [
      "login.html",
      "admin-login.html",
      "accept-invite.html",
      "plans.html"
    ];

    if (publicPages.includes(page)) return;

    // ==================== LOAD SESSION (INDEXEDDB) ====================
    const activeUser = await getSession();

    if (!activeUser || !activeUser.email) {
      redirectLogin();
      return;
    }

    // ==================== ROLE BASIC CHECK ====================
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

    // ==================== SUBSCRIPTION CHECK (ADMIN ONLY) ====================
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
    await clearSession();
    location.replace("login.html");
  }

  // ==================== HELPERS ====================
  function safeRedirect(user) {
    if (user.redirect) {
      location.replace(
        "coming-soon.html?role=" + (user.adminType || "admin")
      );
      return;
    }

    // fallback paling aman
    location.replace("recievers.html");
  }

  function redirectLogin() {
    clearSession();
    location.replace("login.html");
  }

  function hardLogout() {
    clearSession();
    location.replace("login.html");
  }

  function forceRenew(user, message) {
    // ⚠️ masih pakai localStorage sementara
    // nanti gampang dipindah ke IndexedDB / Supabase
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
    clearSession();
    location.replace("plans.html");
  }
})();
