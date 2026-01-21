// =====================================================
// Menuva DB Adapter — CORE AWARE (NO VERSION, NO OPEN)
// SINGLE SOURCE OF TRUTH: db-core.js
// =====================================================

/* ==================== ENSURE CORE ==================== */
function ensureDB() {
  if (!window.MENUVA_DB) {
    throw new Error("MENUVA_DB not ready (db-core.js missing)");
  }
  return window.MENUVA_DB;
}

/* ==================== USERS ==================== */
export async function saveUser(user) {
  const db = ensureDB();
  return db.add("users", user);
}

export async function getUserByEmail(email) {
  const db = ensureDB();
  return db.get("users", email);
}

export async function getAllUsers() {
  const db = ensureDB();
  return db.getAll("users");
}

/* ==================== SESSION ==================== */
export async function setSession(user) {
  const db = ensureDB();
  return db.add("session", {
    id: "active",
    user,
    loginAt: Date.now()
  });
}

export async function getSession() {
  const db = ensureDB();
  const res = await db.get("session", "active");
  return res?.user || null;
}

export async function clearSession() {
  const db = ensureDB();
  return db.delete("session", "active");
}

/* ==================== INVITES ==================== */
export async function saveInvite(invite) {
  const db = ensureDB();
  return db.add("invites", invite);
}

export async function getInviteByToken(token) {
  const db = ensureDB();
  return db.get("invites", token);
}

export async function markInviteUsed(token) {
  const db = ensureDB();
  const invite = await db.get("invites", token);
  if (!invite) return false;

  return db.update("invites", {
    ...invite,
    isUsed: true,
    usedAt: new Date().toISOString()
  });
}

/* ==================== RESTO ==================== */
export async function saveResto(resto) {
  const db = ensureDB();
  return db.add("restos", resto);
}

export async function getResto(restoID) {
  const db = ensureDB();
  return db.get("restos", restoID);
}

/* ==================== UTIL ==================== */
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ==================== GENERIC DB ==================== */
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
