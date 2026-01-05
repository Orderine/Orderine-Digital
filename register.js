// =====================================================
// ORDERINE – REGISTER PAGE (ES MODULE)
// FINAL – STABLE – READY FOR GITHUB PAGES
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

  const generateTrialCode = (len = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < len; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
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

    /* ===== DUPLICATE CHECK ===== */
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      errorMsg.textContent = "❌ Email sudah terdaftar";
      return;
    }

    /* ===== ID GENERATION (❗ WAJIB ADA) ===== */
    const userID = generateID("USER");
    const restoID = generateID("RESTO");

    /* ===== TRIAL 14 HARI ===== */
    const now = new Date();
    const trialExpire = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000
    );

    /* ===== USER OBJECT ===== */
    const newUser = {
      userID,
      email,
      password,

      role: "owner",
      restoID,

      premiumPlan: "trial",
      premiumStart: now.toISOString(),
      premiumExpire: trialExpire.toISOString(),

      subscriptionStatus: "trial",
      isPaid: false,

      trialCode: generateTrialCode(),
      createdAt: now.toISOString()
    };

    /* ===== RESTO OBJECT ===== */
    const resto = {
      restoID,
      ownerID: userID,
      restoName: "My Restaurant",
      createdAt: now.toISOString()
    };

    try {
      await saveUser(newUser);
      await saveResto(resto);

      // bersihkan state lama
      localStorage.removeItem("pendingPlanUser");
      localStorage.removeItem("selectedPlan");
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isLoggedIn");

      alert(
        "✅ Registrasi berhasil!\n\nTrial 14 hari aktif.\nSilakan login."
      );

      location.href = "login.html";
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
