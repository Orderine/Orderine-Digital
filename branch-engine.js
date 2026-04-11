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

    if (BRANCH_CACHE && BRANCH_CACHE.length) return BRANCH_CACHE;

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

// ========================================
// 🧩 UI HANDLER (PRO CLEAN)
// ========================================

function openAddBranch() {
  const modal = document.getElementById("addBranchModal");

  if (!modal) {
    const name = prompt("Enter branch name:");
    if (!name) return;
    BranchEngine.create(name);
    return;
  }

  modal.style.display = "block";

  // auto focus
  const input = document.getElementById("branchNameInput");
  if (input) input.focus();
}

function closeAddBranch() {
  const modal = document.getElementById("addBranchModal");
  if (modal) modal.style.display = "none";

  const input = document.getElementById("branchNameInput");
  if (input) input.value = "";
}

async function submitAddBranch() {
  const input = document.getElementById("branchNameInput");

  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    alert("Branch name required");
    return;
  }

  await BranchEngine.create(name);

  closeAddBranch();
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
  <div class="branch-item ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}">

    <div onclick="console.log('klik', '${b.id}'); BranchEngine.setActive('${b.id}')">
      ${b.isMain ? "🏢 " : ""}${b.name}
    </div>

    <div>
      ${b.id === ACTIVE_BRANCH_ID ? "ACTIVE" : "IDLE"}
      ${!b.isMain ? `<button onclick="BranchEngine.delete('${b.id}')">❌</button>` : ""}
    </div>

  </div>
`).join("");
}

// ========================================
// 🏷️ SHOW ACTIVE BRANCH NAME
// ========================================

async function renderActiveBranchLabel() {
  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const active = branches.find(b => b.id === ACTIVE_BRANCH_ID);

  const el = document.getElementById("activeBranchLabel");

  if (!el) return;

  el.innerText = active
    ? `🏢 ${active.name}`
    : "No Active Branch";
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

  BRANCH_CACHE = null; // 🔥 INI KUNCI NYA

  await renderBranchList();
  await renderActiveBranchLabel();

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

  // 🔥 RESET CACHE
  BRANCH_CACHE = null;

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

  // 🔥 RESET CACHE
  BRANCH_CACHE = null;

  if (branchId === ACTIVE_BRANCH_ID) {
    const remaining = await getBranchesSafe(restoId);
    ACTIVE_BRANCH_ID = remaining[0]?.id || null;
  }

  const session = await MENUVA_DB.getSession();
  await MENUVA_DB.setSession({
    ...session,
    branchId: ACTIVE_BRANCH_ID
  });

  await renderBranchList();
  await renderActiveBranchLabel();
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

  // 🔥 RESET CACHE
  BRANCH_CACHE = null;

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
  await renderActiveBranchLabel();
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

window.openAddBranch = openAddBranch;
window.closeAddBranch = closeAddBranch;
window.submitAddBranch = submitAddBranch;
