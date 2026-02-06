// =====================================================
// ORDERINE – REGISTER PAGE (ES MODULE)
// FINAL – SYNC WITH DB-CORE + AUTH-GUARD (ENTERPRISE CLEAN)
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

  // 🔥 FIX: Ambil selectedPlan dari SESSION (bukan localStorage)
  const safeGetSelectedPlan = async () => {
    const session = await MENUVA_DB.getSession();
    return session?.selectedPlan || null;
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
    const selectedPlan = await safeGetSelectedPlan();
    const now = new Date();

    let premiumPlan = "trial";
    let subscriptionStatus = "trial";
    let isPaid = false;
    let premiumExpire = addDays(now, 14);

    if (selectedPlan?.type) {
      premiumPlan = selectedPlan.type;
      subscriptionStatus = "pending";

      if (premiumPlan === "monthly") {
        premiumExpire = addMonths(now, 1);
      } else if (premiumPlan === "6month") {
        premiumExpire = addMonths(now, 6);
      } else if (premiumPlan === "yearly") {
        premiumExpire = addMonths(now, 12);
      }
    }

    /* ================== USER ================== */
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

    /* ================== RESTO ================== */
    const resto = {
      id: restoID,
      ownerID: userID,
      restoName: "My Restaurant",
      createdAt: now.toISOString()
    };

    try {
      await saveUser(newUser);
      await saveResto(resto);

      // 🔥 Hapus selectedPlan dari session setelah dipakai
      const session = await MENUVA_DB.getSession();
      if (session?.selectedPlan) {
        delete session.selectedPlan;
        await MENUVA_DB.setSession(session);
      }

      if (premiumPlan === "trial") {
        alert("✅ Trial 14 hari aktif.\nSilakan login.");
        location.href = "login.html";
      } else {
        // 🔥 Simpan pending plan user ke SESSION (bukan localStorage)
        await MENUVA_DB.setSession({
          email,
          restoID,
          role: "owner",
          selectedPlan: premiumPlan,
          createdAt: now.toISOString(),
          status: "pending_payment"
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
