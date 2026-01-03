import { db } from "./db.js";

/* =========================
   CREATE ADMIN
========================= */
export async function createAdmin({ email, passwordHash, role }) {
  // ❗ Cegah email duplikat
  const existing = await getAdminByEmail(email);
  if (existing) throw new Error("ADMIN_ALREADY_EXISTS");

  const admin = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role,
    status: "active",
    createdAt: Date.now()
  };

  await db.add("admins", admin);
  return admin;
}

/* =========================
   GET ADMIN BY EMAIL
========================= */
export async function getAdminByEmail(email) {
  const admins = await db.getAll("admins");
  return admins.find(a => a.email === email) || null;
}

/* =========================
   GET ADMIN BY ID
========================= */
export async function getAdminById(id) {
  return db.get("admins", id);
}

/* =========================
   LIST ALL ADMINS
========================= */
export async function getAllAdmins() {
  return db.getAll("admins");
}

/* =========================
   DISABLE ADMIN
========================= */
export async function disableAdmin(id) {
  const admin = await getAdminById(id);
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  admin.status = "disabled";
  await db.update("admins", admin);
  return admin;
}

/* =========================
   ENABLE ADMIN
========================= */
export async function enableAdmin(id) {
  const admin = await getAdminById(id);
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  admin.status = "active";
  await db.update("admins", admin);
  return admin;
}
