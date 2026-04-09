// ========================================
// 🧠 O-ONE BRANCH ENGINE
// ========================================

let ACTIVE_BRANCH_ID = null;

// ========================================
// 🔥 INIT BRAND & DEFAULT BRANCH
// ========================================

async function initBrandAndBranch(){

  const session = await MENUVA_DB.getSession();

  let restoId = session?.restoId;

  // 🚨 FIRST LOGIN
  if(!restoId){

    restoId = uid("resto");
    const defaultBranchId = uid("branch");

    // ✅ SAVE SESSION
    MENUVA_DB.setSession({
      ...session,
      restoId,
      branchId: defaultBranchId,
      role: "super_admin"
    });

    // ✅ CREATE MAIN BRANCH
    await MENUVA_DB.addBranch({
      id: defaultBranchId,
      restoId,
      name: "Main Branch",
      isMain: true,
      createdAt: Date.now()
    });

    console.log("🔥 Brand & Main Branch Created");
  }

  return restoId;
}

// ========================================
// 📦 LOAD ACTIVE BRANCH
// ========================================

async function loadActiveBranch(){

  const session = await MENUVA_DB.getSession();
  const branches = await MENUVA_DB.getBranches();

  ACTIVE_BRANCH_ID =
    session?.branchId ||
    localStorage.getItem("active_branch");

  // 🚨 FALLBACK SAFETY
  if(!ACTIVE_BRANCH_ID && branches.length){
    ACTIVE_BRANCH_ID = branches[0].id;
  }

  return ACTIVE_BRANCH_ID;
}

// ========================================
// 🎨 RENDER BRANCH LIST (CARD STYLE)
// ========================================

async function renderBranchList(){

  const branches = await MENUVA_DB.getBranches();
  const container = document.getElementById("branchList");

  if(!container){
    console.warn("⚠️ branchList container not found");
    return;
  }

  if(!branches.length){
    container.innerHTML = `<div class="branch-empty">No Branch Found</div>`;
    return;
  }

  container.innerHTML = branches.map(b => `
    <div class="branch-item ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}"
         onclick="setActiveBranch('${b.id}')">

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

async function setActiveBranch(branchId){

  if(!branchId) return;

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
  if(typeof reloadAllData === "function"){
    reloadAllData();
  }
}

// ========================================
// ➕ CREATE NEW BRANCH
// ========================================

async function createBranch(name){

  if(!name){
    alert("Branch name required");
    return;
  }

  const session = await MENUVA_DB.getSession();

  const newBranch = {
    id: uid("branch"),
    restoId: session.restoId,
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

async function deleteBranch(branchId){

  const branches = await MENUVA_DB.getBranches();

  const branch = branches.find(b => b.id === branchId);

  if(!branch) return;

  // 🚨 PROTECT MAIN BRANCH
  if(branch.isMain){
    alert("Main branch cannot be deleted");
    return;
  }

  if(!confirm("Delete this branch?")) return;

  await MENUVA_DB.deleteBranch(branchId);

  console.log("🗑 Branch Deleted:", branchId);

  // 🚨 IF ACTIVE DELETED → SWITCH
  if(branchId === ACTIVE_BRANCH_ID){
    const remaining = await MENUVA_DB.getBranches();
    ACTIVE_BRANCH_ID = remaining[0]?.id;

    await setActiveBranch(ACTIVE_BRANCH_ID);
  }

  await renderBranchList();
}

// ========================================
// ✏️ UPDATE BRANCH NAME
// ========================================

async function updateBranch(branchId, newName){

  if(!newName) return;

  const branches = await MENUVA_DB.getBranches();
  const branch = branches.find(b => b.id === branchId);

  if(!branch) return;

  branch.name = newName;

  await MENUVA_DB.updateBranch(branch);

  console.log("✏️ Branch Updated:", newName);

  await renderBranchList();
}

// ========================================
// 🧰 HELPER FILTER (WAJIB PAKAI DI ENGINE LAIN)
// ========================================

function withBranch(data){

  if(!ACTIVE_BRANCH_ID) return data;

  return data.filter(d => d.branchId === ACTIVE_BRANCH_ID);
}

// ========================================
// 🚀 INIT ENGINE
// ========================================

async function initBranchEngine(){

  await initBrandAndBranch();
  await loadActiveBranch();
  await renderBranchList();

  console.log("🚀 Branch Engine Ready");
}

// ========================================
// GLOBAL EXPORT (OPTIONAL)
// ========================================

window.BranchEngine = {
  init: initBranchEngine,
  create: createBranch,
  delete: deleteBranch,
  update: updateBranch,
  setActive: setActiveBranch,
  getActive: () => ACTIVE_BRANCH_ID,
  filter: withBranch
};
