// ========================================
// 🧠 O-ONE BRANCH ENGINE (CLEAN FIX VERSION)
// ========================================

let ACTIVE_BRANCH_ID = null;

// ========================================
// 🔐 SAFE GET BRANCHES
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

// ========================================
// 🔐 GET / ENSURE RESTO ID
// ========================================

async function getRestoId() {
  const session = await MENUVA_DB.getSession();

  if (session?.restoId) return session.restoId;

  const email = session?.email || window.activeUser?.email;

  if (!email) {
    console.warn("⛔ Email not found");
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
    throw new Error("❌ restoId not available");
  }

  const branches = await getBranchesSafe(restoId);

  if (branches.length === 0) {

    const defaultBranchId = uid("branch");

    await MENUVA_DB.addBranch({
      id: defaultBranchId,
      restoId,
      name: "Main Branch",
      isMain: true,
      createdAt: Date.now()
    });

    await MENUVA_DB.setSession({
      ...session,
      restoId,
      branchId: defaultBranchId,
      role: session?.role || "super_admin"
    });

    console.log("🔥 Main Branch Created");
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

  let active =
    session?.branchId ||
    localStorage.getItem("active_branch");

  if (!branches.find(b => b.id === active)) {
    active = branches[0]?.id;
  }

  ACTIVE_BRANCH_ID = active;

  return ACTIVE_BRANCH_ID;
}

// ========================================
// 🎨 RENDER BRANCH LIST
// ========================================

async function renderBranchList() {

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const filtered = (branches || []).filter(b => b.restoId === restoId);

  const container = document.getElementById("branchList");

  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div>No Branch Found</div>`;
    return;
  }

  container.innerHTML = filtered.map(b => `
    <div class="branch-item ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}"
         onclick="BranchEngine.setActive('${b.id}')">

      <div>${b.isMain ? "🏢 " : ""}${b.name}</div>
      <div>${b.id === ACTIVE_BRANCH_ID ? "ACTIVE" : "IDLE"}</div>

    </div>
  `).join("");
}

// ========================================
// 🔄 SET ACTIVE
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

  if (typeof reloadAllData === "function") {
    reloadAllData();
  }
}

// ========================================
// ➕ CREATE
// ========================================

async function createBranch(name) {

  if (!name) return alert("Branch name required");

  const restoId = await getRestoId();

  await MENUVA_DB.addBranch({
    id: uid("branch"),
    restoId,
    name,
    isMain: false,
    createdAt: Date.now()
  });

  await renderBranchList();
}

// ========================================
// ❌ DELETE
// ========================================

async function deleteBranch(branchId) {

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const branch = branches.find(
    b => b.id === branchId && b.restoId === restoId
  );

  if (!branch) return;

  if (branch.isMain) {
    return alert("Main branch cannot be deleted");
  }

  if (!confirm("Delete this branch?")) return;

  await MENUVA_DB.deleteBranch(branchId);

  if (branchId === ACTIVE_BRANCH_ID) {
    const remaining = await getBranchesSafe(restoId);
    ACTIVE_BRANCH_ID = remaining[0]?.id;
  }

  await renderBranchList();
}

// ========================================
// ✏️ UPDATE
// ========================================

async function updateBranch(branchId, newName) {

  if (!newName) return;

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const branch = branches.find(
    b => b.id === branchId && b.restoId === restoId
  );

  if (!branch) return;

  branch.name = newName;

  await MENUVA_DB.updateBranch(branch);

  await renderBranchList();
}

// ========================================
// 🧰 FILTER
// ========================================

function withBranch(data) {
  if (!ACTIVE_BRANCH_ID) return data;
  return data.filter(d => d.branchId === ACTIVE_BRANCH_ID);
}

// ========================================
// 🚀 INIT
// ========================================

async function initBranchEngine() {
  await initBrandAndBranch();
  await loadActiveBranch();
  await renderBranchList();
  console.log("🚀 Branch Engine Ready");
}

// ========================================
// 🌍 EXPORT
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
