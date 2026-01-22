// =====================================================
// Menuva DB Adapter — SINGLE SOURCE: db-core.js
// =====================================================

function ensureDB() {
  if (!window.MENUVA_DB) {
    throw new Error("MENUVA_DB not ready");
  }
  return window.MENUVA_DB;
}

/* ==================== USERS ==================== */
export function saveUser(user) {
  return ensureDB().add("users", user);
}

export function getUserByEmail(email) {
  return ensureDB().get("users", email);
}

export function getAllUsers() {
  return ensureDB().getAll("users");
}

/* ==================== SESSION ==================== */
const SESSION_KEY = "active";

export function setSession(user) {
  return ensureDB().add("session", {
    id: SESSION_KEY,
    ...user,
    loginAt: Date.now()
  });
}

export function getSession() {
  return ensureDB().get("session", SESSION_KEY);
}

export function clearSession() {
  return ensureDB().delete("session", SESSION_KEY);
}

/* ==================== INVITES ==================== */
export function saveInvite(invite) {
  return ensureDB().add("invites", invite);
}

export function getInviteByToken(token) {
  return ensureDB().get("invites", token);
}

export async function markInviteUsed(token) {
  const invite = await getInviteByToken(token);
  if (!invite) return false;

  return saveInvite({
    ...invite,
    isUsed: true,
    usedAt: new Date().toISOString()
  });
}

/* ==================== RESTO ==================== */
export function saveResto(resto) {
  return ensureDB().add("restos", resto);
}

export function getResto(restoID) {
  return ensureDB().get("restos", restoID);
}

/* ==================== UTIL ==================== */
export function generateID(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ==================== GENERIC DB ==================== */
export const db = {
  add: (store, data) => ensureDB().add(store, data),
  get: (store, key) => ensureDB().get(store, key),
  getAll: (store) => ensureDB().getAll(store),
  update: (store, data) => ensureDB().update(store, data),
  delete: (store, key) => ensureDB().delete(store, key)
};
