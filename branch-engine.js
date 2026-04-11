// ========================================
// 🧠 O-ONE BRANCH ENGINE (CLEAN FIX VERSION)
// ========================================

let ACTIVE_BRANCH_ID = null;
let CACHED_RESTO_ID = null;
// ========================================
// 🔐 SAFE GET BRANCHES
// ========================================

let BRANCH_CACHE = null;

async function getBranchesSafe(restoId) {
  try {

    if (BRANCH_CACHE) return BRANCH_CACHE;

    const all = await MENUVA_DB.getAll("branches");
    BRANCH_CACHE = all.filter(b => b.restoId === restoId);

    return BRANCH_CACHE;

  } catch (err) {
    console.error("❌ getBranchesSafe error:", err);
    return [];
  }
}
// ========================================
// 🔐 GET / ENSURE RESTO + MAIN BRANCH (FINAL)
// ========================================
async function getRestoId() {

  if (CACHED_RESTO_ID) return CACHED_RESTO_ID;

  const session = await MENUVA_DB.getSession();

  if (session?.restoId && session?.branchId) {
    CACHED_RESTO_ID = session.restoId;
    return CACHED_RESTO_ID;
  }

  const email = session?.email || window.activeUser?.email;

  if (!email) {
    console.warn("⛔ Email not found");
    return null;
  }

  const restos = await MENUVA_DB.getAll("restos");
  let resto = restos.find(r => r.ownerEmail === email);

  if (!resto) {
    const newRestoId = "RESTO-" + uid();

    resto = {
      id: newRestoId,
      ownerEmail: email,
      createdAt: Date.now()
    };

    await MENUVA_DB.add("restos", resto);
  }

  const restoId = resto.id;

  let branches = await getBranchesSafe(restoId);
  let mainBranch = branches.find(b => b.isMain);

  if (!mainBranch) {
    const mainId = uid("branch");

    mainBranch = {
      id: mainId,
      restoId,
      name: "Main Branch",
      isMain: true,
      createdAt: Date.now()
    };

    await MENUVA_DB.add("branches", mainBranch);
  }

  await MENUVA_DB.setSession({
    ...session,
    email,
    restoId,
    branchId: mainBranch.id,
    role: session?.role || "super_admin"
  });

  CACHED_RESTO_ID = restoId;
  return restoId;
}

function openAddBranch() {
  document.getElementById("addBranchModal").style.display = "block";
}

// ========================================
// 📦 LOAD ACTIVE BRANCH
// ========================================

async function loadActiveBranch() {

  const session = await MENUVA_DB.getSession();
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  if (!branches.length) {
    ACTIVE_BRANCH_ID = null;
    return null;
  }

  let active =
    session?.branchId ||
    localStorage.getItem("active_branch");

  if (!branches.find(b => b.id === active)) {
    active = branches[0].id;
  }

  ACTIVE_BRANCH_ID = active;

  // 🔐 sync biar gak mismatch
  await MENUVA_DB.setSession({
    ...session,
    branchId: active
  });

  return ACTIVE_BRANCH_ID;
}
// ========================================
// 🎨 RENDER BRANCH LIST
// ========================================

async function renderBranchList() {

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const filtered = branches;

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

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  if (!branches.find(b => b.id === branchId)) {
    console.warn("❌ Invalid branchId");
    return;
  }

  ACTIVE_BRANCH_ID = branchId;

  const session = await MENUVA_DB.getSession();

  await MENUVA_DB.setSession({
    ...session,
    branchId
  });

  localStorage.setItem("active_branch", branchId);

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

  await MENUVA_DB.add("branches", {
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

  await MENUVA_DB.delete("branches", branchId);

  // 🔥 FIX UTAMA
  if (branchId === ACTIVE_BRANCH_ID) {
    const remaining = await getBranchesSafe(restoId);
    ACTIVE_BRANCH_ID = remaining[0]?.id || null;
  }

  // 🔐 sync session
  const session = await MENUVA_DB.getSession();
  await MENUVA_DB.setSession({
    ...session,
    branchId: ACTIVE_BRANCH_ID
  });

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

  await MENUVA_DB.update("branches", branch);

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
  await getRestoId();
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
