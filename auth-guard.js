// ==================== ORDERINE AUTH GUARD (FINAL) ====================
import { getSession, clearSession } from "./db.js";

document.addEventListener("DOMContentLoaded", () => {
  runAuthGuard();
});

async function runAuthGuard() {
  try {
    const page = location.pathname.split("/").pop();

    // ==================== PUBLIC PAGES ====================
    const PUBLIC_PAGES = [
      "login.html",
      "admin-login.html",
      "accept-invite.html",
      "plans.html"
    ];

    if (PUBLIC_PAGES.includes(page)) {
      console.log("🔓 Public page:", page);
      return;
    }

    // ==================== LOAD SESSION ====================
    const activeUser = await getSession();

    if (!activeUser || !activeUser.email) {
      console.warn("⛔ No active session");
      return redirectLogin();
    }

    // ==================== BASIC VALIDATION ====================
    if (!["owner", "admin"].includes(activeUser.role)) {
      console.warn("⛔ Invalid role");
      return hardLogout();
    }

    if (!activeUser.restoID) {
      console.warn("⛔ Missing restoID");
      return hardLogout();
    }

    // ==================== SUBSCRIPTION CHECK (UNIVERSAL) ====================
    if (!activeUser.premiumExpire) {
      console.warn("⛔ Missing premiumExpire");
      return forceRenew(activeUser, "❌ Subscription invalid.");
    }

    const now = Date.now();
    const expire = new Date(activeUser.premiumExpire).getTime();

    if (now > expire) {
      return forceRenew(
        activeUser,
        "⏱ Subscription expired. Please renew to continue."
      );
    }

    // ==================== OWNER ====================
    if (activeUser.role === "owner") {
      console.log("👑 Owner access granted");
      return;
    }

    // ==================== ADMIN ====================
    const permissions = Array.isArray(activeUser.permissions)
      ? activeUser.permissions
      : [];

    const PAGE_RULES = {
      "recievers.html": ["orders", "payments"],
      "order.html": ["orders"],
      "book.html": ["orders"],
      "menu-manager.html": ["menu", "stock"],
      "room-manager.html": ["room"]
    };

    // ❌ Admin tidak boleh ke admin.html
    if (page === "admin.html") {
      return safeRedirect();
    }

    // ❌ Page tidak dikenal
    if (!PAGE_RULES[page]) {
      return safeRedirect();
    }

    // ❌ Permission check
    const requiredPerms = PAGE_RULES[page];
    const hasAccess = requiredPerms.some(p =>
      permissions.includes(p)
    );

    if (!hasAccess) {
      console.warn("⛔ Permission denied:", page);
      return safeRedirect();
    }

  } catch (err) {
    console.error("🛑 AUTH GUARD CRASH:", err);
    await hardLogout();
  }
}

// ==================== HELPERS ====================
async function redirectLogin() {
  await clearSession();
  location.replace("login.html");
}

async function hardLogout() {
  await clearSession();
  location.replace("login.html");
}

function safeRedirect() {
  location.replace("recievers.html");
}

async function forceRenew(user, message) {
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
  await clearSession();
  location.replace("plans.html");
}

