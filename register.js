// =====================================================
// ORDERINE – REGISTER PAGE (ES MODULE)
// FINAL – CLEAR & SYNC WITH PLANS + AUTH-GUARD
// =====================================================

import {
  saveUser,
  getUserByEmail,
  saveResto,
  generateID
} from "./db.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const errorMsg = document.getElementById("errorMsg");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");

  if (!registerForm) return;

  /* ================== UTILS ================== */
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addDays = (date, days) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  /* ================== REGISTER ================== */
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = passwordInput.value;

    /* ===== VALIDATION ===== */
    if (!isValidEmail(email)) {
      errorMsg.textContent = "❌ Format email tidak valid";
      return;
    }

    if (password.length < 6) {
      errorMsg.textContent = "❌ Password minimal 6 karakter";
      return;
    }

    if (await getUserByEmail(email)) {
      errorMsg.textContent = "❌ Email sudah terdaftar";
      return;
    }

    /* ================== ID ================== */
    const userID = generateID("USER");
    const restoID = generateID("RESTO");

    /* ================== PLAN LOGIC (CORE FIX) ================== */
    const selectedPlan = JSON.parse(
      localStorage.getItem("selectedPlan")
    );

    const now = new Date();

    let premiumPlan = "trial";
    let subscriptionStatus = "trial";
    let isPaid = false;
    let premiumExpire = addDays(now, 14); // default TRIAL 14 hari

    if (selectedPlan?.type) {
      premiumPlan = selectedPlan.type;
      subscriptionStatus = "pending";
      isPaid = false;

      if (selectedPlan.type === "monthly") {
        premiumExpire = addMonths(now, 1);
      } else if (selectedPlan.type === "6month") {
        premiumExpire = addMonths(now, 6);
      } else if (selectedPlan.type === "yearly") {
        premiumExpire = addMonths(now, 12);
      }
    }

    /* ================== USER OBJECT ================== */
    const newUser = {
      userID,
      email,
      password, // NOTE: plain text (hash later)

      role: "owner",
      restoID,

      premiumPlan,
      premiumStart: now.toISOString(),
      premiumExpire: premiumExpire.toISOString(),

      subscriptionStatus,
      isPaid,

      createdAt: now.toISOString()
    };

    /* ================== RESTO OBJECT ================== */
    const resto = {
      restoID,
      ownerID: userID,
      restoName: "My Restaurant",
      createdAt: now.toISOString()
    };

    try {
      await saveUser(newUser);
      await saveResto(resto);

      // bersihkan state session lama
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isLoggedIn");

      // ⚠️ JANGAN hapus selectedPlan di sini
      // (dipakai di plans/payment flow)

      if (premiumPlan === "trial") {
        alert("✅ Trial 14 hari aktif.\nSilakan login.");
        location.href = "login.html";
      } else {
        alert("🧾 Akun dibuat.\nSilakan lanjutkan pembayaran.");
        location.href = "plans.html";
      }
    } catch (err) {
      console.error("❌ Register error:", err);
      errorMsg.textContent = "❌ Gagal registrasi";
    }
  });

  /* ================== 👁️ TOGGLE PASSWORD ================== */
  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      togglePassword.textContent = show ? "🙈" : "👁️";
    });
  }
});
