<script>
// ==================== ORDERINE ADMIN GUARD ====================
(function () {
  try {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");

    // ❌ Tidak login
    if (!isLoggedIn || !activeUser || !activeUser.email) {
      console.warn("🚫 Admin Guard: Not logged in");
      location.replace("login.html");
      return;
    }

    const now = new Date();

    // ❌ Expired
    if (activeUser.premiumExpire) {
      const expireDate = new Date(activeUser.premiumExpire);

      if (now > expireDate) {
        activeUser.isExpired = true;
        localStorage.setItem("activeUser", JSON.stringify(activeUser));

        alert(
          activeUser.premiumPlan === "trial"
            ? "❌ Free trial has expired.\nPlease upgrade to continue."
            : "❌ Subscription expired.\nPlease renew your plan."
        );

        location.replace("plans.html");
        return;
      }
    }

    // ❌ Payment belum lunas (kecuali trial)
    if (
      activeUser.premiumPlan !== "trial" &&
      activeUser.isPaid !== true
    ) {
      alert("❌ Payment not confirmed.\nPlease complete your payment.");
      location.replace("payment.html");
      return;
    }

    console.log("🛡️ Admin Guard: Access granted", activeUser.email);
  } catch (err) {
    console.error("Admin Guard Error:", err);
    location.replace("login.html");
  }
})();
</script>
