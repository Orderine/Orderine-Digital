// =====================================================
// ORDERINE – REGISTER PAGE (ENTERPRISE CLEAN)
// 100% IndexedDB – NO localStorage
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
    new Date(date.getTime() + days * 86400000);

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  /* ================== GET SELECTED PLAN FROM SESSION ================== */
  const getSelectedPlanFromSession = async () => {
    const session = await MENUVA_DB.getSession();
    return session?.temp?.selectedPlan || null;
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

    /* ================== IDS ================== */

    const userID = generateID("USER");
    const restoID = generateID("RESTO");

    /* ================== PLAN ================== */

    const selectedPlan = await getSelectedPlanFromSession();
    const now = new Date();

    let premiumPlan = "trial";
    let subscriptionStatus = "trial";
    let isPaid = false;
    let premiumExpire = addDays(now, 14);

    if (selectedPlan) {
      premiumPlan = selectedPlan;
      subscriptionStatus = "pending";

      if (premiumPlan === "monthly") {
        premiumExpire = addMonths(now, 1);
      } else if (premiumPlan === "6month") {
        premiumExpire = addMonths(now, 6);
      } else if (premiumPlan === "yearly") {
        premiumExpire = addMonths(now, 12);
      }
    }

    /* ================== USER OBJECT ================== */

    const newUser = {
      userID,
      email,
      password,
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
      id: restoID,
      ownerID: userID,
      restoName: "My Restaurant",
      createdAt: now.toISOString()
    };

    try {

      await saveUser(newUser);
      await saveResto(resto);

      /* ================== CLEAN TEMP SESSION ================== */

      const session = await MENUVA_DB.getSession();

      if (session?.temp?.selectedPlan) {
        const cleanedSession = {
          ...session,
          temp: {}
        };
        await MENUVA_DB.setSession(cleanedSession);
      }

      /* ================== FLOW CONTROL ================== */

      if (premiumPlan === "trial") {
        alert("✅ Trial 14 hari aktif.\nSilakan login.");
        location.href = "login.html";
      } else {

        await MENUVA_DB.setSession({
          id: "active",
          email,
          restoID,
          role: "owner",
          temp: {
            pendingPaymentPlan: premiumPlan
          },
          createdAt: now.toISOString()
        });

        alert("🧾 Akun berhasil dibuat.\nSilakan lanjutkan pembayaran.");
        location.href = "plans.html";
      }

    } catch (err) {
      console.error("❌ Register error:", err);
      errorMsg.textContent = "❌ Gagal registrasi. Coba lagi.";
    }
  });

  /* ================== 👁️ TOGGLE PASSWORD ================== */

  togglePassword?.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "🙈" : "👁️";
  });

});
