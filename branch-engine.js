// ========================================
// 🧠 O-ONE BRANCH ENGINE (STABLE VERSION)
// ========================================

let ACTIVE_BRANCH_ID = null;

// ========================================
// 🔐 GET / ENSURE RESTO ID (SINGLE SOURCE)
// ========================================

async function getBranchesSafe(restoId) {
  try {
    let data = [];

    if (MENUVA_DB.getByIndex) {
      data = await MENUVA_DB.getByIndex("branchData", "restoId", restoId);
    }

    if (!data || data.length === 0) {
      const all = await MENUVA_DB.getAll("branchData");
      data = all.filter(b => b.restoId === restoId);
    }

    return data;

  } catch (err) {
    console.error("❌ getBranchesSafe error:", err);
    return [];
  }
}

async function getRestoId() {
  const session = await MENUVA_DB.getSession();

  if (session?.restoId) return session.restoId;

  const email = session?.email || window.activeUser?.email;

  if (!email) {
    console.warn("⛔ Email not found, cannot generate restoId");
    return null;
  }

  const restoId = generateRestoIdFromEmail(email);

  await MENUVA_DB.setSession({
    ...session,
    email,
    restoId
  });

  console.log("✅ restoId ensured:", restoId);

  return restoId;
}

// ========================================
// 🔥 INIT BRAND & DEFAULT BRANCH
// ========================================

async function initBrandAndBranch() {

  const session = await MENUVA_DB.getSession();
  const restoId = await getRestoId();

  if (!restoId) {
    throw new Error("❌ Failed init: restoId not available");
  }

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  // 🚨 FIRST INIT (NO BRANCH YET)
  const branches = await getBranchesSafe(restoId);

   if (branches.length === 0) {

    const defaultBranchId = uid("branch");

    // ✅ CREATE MAIN BRANCH
    await MENUVA_DB.addBranch({
      id: defaultBranchId,
      restoId,
      name: "Main Branch",
      isMain: true,
      createdAt: Date.now()
    });

    // ✅ SAVE SESSION
    await MENUVA_DB.setSession({
      ...session,
      restoId,
      branchId: defaultBranchId,
      role: session?.role || "super_admin"
    });

    console.log("🔥 Brand & Main Branch Created");
  }

  return restoId;
}

// ========================================
// 📦 LOAD ACTIVE BRANCH
// ========================================

async function loadActiveBranch() {

  const session = await MENUVA_DB.getSession();
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

const branches = await getBranchesSafe(session?.restoId);

let active =
  session?.branchId ||
  localStorage.getItem("active_branch");

if (!branches.find(b => b.id === active)) {
  active = branches[0]?.id;
}

ACTIVE_BRANCH_ID = active;
}

// ========================================
// 🎨 RENDER BRANCH LIST
// ========================================

async function renderBranchList() {

  const restoId = await getRestoId();
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  // ✅ FILTER BY RESTO (VERY IMPORTANT)
  const filtered = (branches || []).filter(b => b.restoId === restoId);

  const container = document.getElementById("branchList");

  if (!container) {
    console.warn("⚠️ branchList container not found");
    return;
  }

  if (!filtered.length) {
    container.innerHTML = `<div class="branch-empty">No Branch Found</div>`;
    return;
  }

  container.innerHTML = filtered.map(b => `
    <div class="branch-item ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}"
         onclick="BranchEngine.setActive('${b.id}')">

      <div class="branch-name">
        ${b.isMain ? "🏢 " : ""}${b.name}
      </div>

      <div class="branch-status">
        ${b.id === ACTIVE_BRANCH_ID ? "ACTIVE" : "IDLE"}
      </div>

    </div>
  `).join("");
}

// ========================================
// 🔄 SET ACTIVE BRANCH
// ========================================

async function setActiveBranch(branchId) {

  if (!branchId) return;

  ACTIVE_BRANCH_ID = branchId;

  const session = await MENUVA_DB.getSession();

  await MENUVA_DB.setSession({
    ...session,
    branchId
  });

  localStorage.setItem("active_branch", branchId);

  console.log("🔥 ACTIVE BRANCH:", branchId);

  await renderBranchList();

  // 🔥 GLOBAL REFRESH
  if (typeof reloadAllData === "function") {
    reloadAllData();
  }
}

// ========================================
// ➕ CREATE NEW BRANCH
// ========================================

async function createBranch(name) {

  if (!name) {
    alert("Branch name required");
    return;
  }

  const session = await MENUVA_DB.getSession();
  const restoId = await getRestoId();

  const newBranch = {
    id: uid("branch"),
    restoId,
    name,
    isMain: false,
    createdAt: Date.now()
  };

  await MENUVA_DB.addBranch(newBranch);

  console.log("✅ Branch Created:", name);

  await renderBranchList();
}

// ========================================
// ❌ DELETE BRANCH
// ========================================

async function deleteBranch(branchId) {

  const restoId = await getRestoId();
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const branch = branches.find(
    b => b.id === branchId && b.restoId === restoId
  );

  if (!branch) return;

  // 🚨 PROTECT MAIN
  if (branch.isMain) {
    alert("Main branch cannot be deleted");
    return;
  }

  if (!confirm("Delete this branch?")) return;

  await MENUVA_DB.deleteBranch(branchId);

  console.log("🗑 Branch Deleted:", branchId);

  // 🚨 SWITCH IF ACTIVE DELETED
  if (branchId === ACTIVE_BRANCH_ID) {
    const remaining = await getBranchesSafe(restoId);
      .filter(b => b.restoId === restoId);

    ACTIVE_BRANCH_ID = remaining[0]?.id;

    if (ACTIVE_BRANCH_ID) {
      await setActiveBranch(ACTIVE_BRANCH_ID);
    }
  }

  await renderBranchList();
}

// ========================================
// ✏️ UPDATE BRANCH NAME
// ========================================

async function updateBranch(branchId, newName) {

  if (!newName) return;

  const restoId = await getRestoId();
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const branch = branches.find(
    b => b.id === branchId && b.restoId === restoId
  );

  if (!branch) return;

  branch.name = newName;

  await MENUVA_DB.updateBranch(branch);

  console.log("✏️ Branch Updated:", newName);

  await renderBranchList();
}

// ========================================
// 🧰 HELPER FILTER (GLOBAL)
// ========================================

function withBranch(data) {

  if (!ACTIVE_BRANCH_ID) return data;

  return data.filter(d => d.branchId === ACTIVE_BRANCH_ID);
}

// ========================================
// 🚀 INIT ENGINE
// ========================================

async function initBranchEngine() {

  await initBrandAndBranch();
  await loadActiveBranch();
  await renderBranchList();

  console.log("🚀 Branch Engine Ready");
}

// ========================================
// 🌍 GLOBAL EXPORT
// ========================================

window.BranchEngine = {
  init: initBranchEngine,
  create: createBranch,
  delete: deleteBranch,
  update: updateBranch,
  setActive: setActiveBranch,
  getActive: () => ACTIVE_BRANCH_ID,
  getRestoId,
  filter: withBranch
};
