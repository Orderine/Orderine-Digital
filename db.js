// =====================================================
// Menuva DB Adapter — CORE AWARE (NO VERSION, NO OPEN)
// SINGLE SOURCE OF TRUTH: db-core.js
// =====================================================

/* ==================== ENSURE CORE READY ==================== */
function ensureDB() {
  const core = window.MENUVA_DB;

  if (!core) {
    throw new Error("MENUVA_DB not ready (db-core.js missing)");
  }

  if (typeof core.add !== "function") {
    throw new Error("MENUVA_DB invalid (adapter methods missing)");
  }

  return core;
}

/* ==================== USERS ==================== */
export async function saveUser(user) {
  return ensureDB().add("users", user);
}

export async function getUserByEmail(email) {
  return ensureDB().get("users", email);
}

export async function getAllUsers() {
  return ensureDB().getAll("users");
}

/* ==================== SESSION ==================== */
export async function setSession(user) {
  return ensureDB().add("session", {
    id: "active",
    user,
    loginAt: Date.now()
  });
}

export async function getSession() {
  const res = await ensureDB().get("session", "active");
  return res?.user || null;
}

export async function clearSession() {
  return ensureDB().delete("session", "active");
}

/* ==================== INVITES ==================== */
export async function saveInvite(invite) {
  return ensureDB().add("invites", invite);
}

export async function getInviteByToken(token) {
  return ensureDB().get("invites", token);
}

export async function markInviteUsed(token) {
  const invite = await ensureDB().get("invites", token);
  if (!invite) return false;

  return ensureDB().update("invites", {
    ...invite,
    isUsed: true,
    usedAt: new Date().toISOString()
  });
}

/* ==================== RESTO ==================== */
export async function saveResto(resto) {
  return ensureDB().add("restos", resto);
}

export async function getResto(restoID) {
  return ensureDB().get("restos", restoID);
}

/* ==================== UTIL ==================== */
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ==================== GENERIC DB ADAPTER ==================== */
/**
 * NOTE:
 * Ini SATU-SATUNYA "db" yang boleh diimport di layer atas.
 * Jangan pernah shadow dengan: const db = await ...
 */
export const db = {
  add(store, data) {
    return ensureDB().add(store, data);
  },
  get(store, key) {
    return ensureDB().get(store, key);
  },
  getAll(store) {
    return ensureDB().getAll(store);
  },
  update(store, data) {
    return ensureDB().update(store, data);
  },
  delete(store, key) {
    return ensureDB().delete(store, key);
  }
};
