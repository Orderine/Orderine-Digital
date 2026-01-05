// =====================================================
// ORDERINE – REGISTER PAGE (ES MODULE)
// FINAL VERSION – READY FOR GITHUB
// =====================================================

import {
  saveUser,
  getUserByEmail,
  saveResto,
  generateID
} from "./db.js";

/* ================== DOM READY ================== */
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const errorMsg = document.getElementById("errorMsg");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");

  if (!registerForm) return;

  /* ================== UTILS ================== */
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const generateTrialCode = (len = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  /* ================== REGISTER ================== */
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = document
      .getElementById("email")
      .value.trim()
      .toLowerCase();

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

    /* ===== DUPLICATE CHECK ===== */
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      errorMsg.textContent =
        "❌ Email sudah terdaftar. Silakan login.";
      return;
    }

    /* ===== TRIAL PLAN ===== */
    const now = new Date();
    const trialExpire = new Date(
      now.getTime() + 5 * 60 * 1000 // 5 menit (TEST MODE)
    );

    const restoID = generateID("RESTO");
    const userID = generateID("USER");

    /* ===== USER OBJECT ===== */
    const newUser = {
      userID,
      email,
      password, // NOTE: plain text (bisa di-hash nanti)

      role: "owner",
      restoID,

      premiumPlan: "trial",
      premiumStart: now.toISOString(),
      premiumExpire: trialExpire.toISOString(),

      subscriptionStatus: "trial",
      isPaid: false,

      adminType: null,
      permissions: [],

      trialCode: generateTrialCode(),
      createdAt: now.toISOString()
    };

    /* ===== RESTO OBJECT ===== */
    const resto = {
      restoID,
      ownerEmail: email,
      restoName: "My Restaurant",
      createdAt: now.toISOString()
    };

    try {
      await saveUser(newUser);
      await saveResto(resto);

      // bersihkan state lama (penting)
      localStorage.removeItem("pendingPlanUser");
      localStorage.removeItem("selectedPlan");
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isLoggedIn");

      alert(
        "✅ Registrasi berhasil!\n\nFree trial aktif.\nSilakan login."
      );

      window.location.href = "login.html";
    } catch (err) {
      console.error("❌ Register error:", err);
      errorMsg.textContent =
        "❌ Gagal registrasi. Coba lagi.";
    }
  });

  /* ================== 👁️ TOGGLE PASSWORD ================== */
  if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      togglePassword.textContent = show ? "🙈" : "👁️";
    });
  }
});
