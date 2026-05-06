// ========================================
// 🧠 O-ONE BRANCH ENGINE (CLEAN FIX VERSION)
// ========================================

let ACTIVE_BRANCH_ID = null;
let CACHED_RESTO_ID = null;

// ========================================
// 🔐 SAFE GET BRANCHES
// ========================================

let BRANCH_CACHE = null;

// ======================
// 🔥 GET ALL BRANCH BY RESTO
// ======================
async function getBranchesByResto(restoId) {

let branches = await getBranchesByResto(restoId);

// 🔥 HANDLE EMPTY GLITCH (IndexedDB delay)
if (branches.length === 0) {
  console.warn("⚠️ Empty fetch, retrying...");
  await new Promise(r => setTimeout(r, 80));
  branches = await getBranchesByResto(restoId);
}
  
  const all = await MENUVA_DB.getAll("branches");

  const filtered = all.filter(b => b.restoId === restoId);

  console.log("📦 getBranchesByResto:", filtered);

  return filtered;

  console.log("📦 RAW DB:", all);
}

async function getBranchesSafe(restoId) {

  // ⚡ 1. CACHE HIT
  if (BRANCH_CACHE && BRANCH_CACHE.restoId === restoId) {
    console.log("⚡ USING CACHE");
    return BRANCH_CACHE.data;
  }

  let branches = await getBranchesByResto(restoId);

  // 🔁 2. RETRY (ANTI RACE CONDITION)
  if (branches.length > 0 && !branches.some(b => b.isMain)) {
    console.warn("⏳ Suspicious state, retrying fetch...");
    await new Promise(r => setTimeout(r, 50));
    branches = await getBranchesByResto(restoId);
  }

  // 🔥 3. NORMALISASI DATA
  let changed = false;

  branches = branches.map(b => {
    const isMainNormalized = (
      b.isMain === true ||
      b.isMain === "true" ||
      b.isMain === 1 ||
      b.name === "Main Branch" ||
      b.id?.startsWith("main_")
    );

    if (b.isMain !== isMainNormalized) {
      changed = true;
    }

    return {
      ...b,
      isMain: isMainNormalized
    };
  });

  // 💾 4. SYNC KE DB (HANYA JIKA BERUBAH)
  if (changed) {
    console.log("♻️ Normalizing DB...");
    for (const b of branches) {
      await MENUVA_DB.update("branches", b);
    }
  }

  // 🔥 5. HANDLE DUPLICATE MAIN
  const mains = branches.filter(b => b.isMain);

  if (mains.length > 1) {
    console.warn("⚠️ MULTIPLE MAIN DETECTED → AUTO FIX");

    const keep = mains[0];

    for (const m of mains.slice(1)) {
      await MENUVA_DB.delete("branches", m.id);
    }

    branches = branches.filter(b => b.id === keep.id || !b.isMain);
  }

  // 🔍 6. DETEK MAIN
  let mainBranch = branches.find(b => b.isMain === true);

  // 🚨 7. AUTO CREATE (LAST DEFENSE)
  if (!mainBranch && branches.length === 0) {
    console.warn("🚨 MAIN BRANCH HILANG → AUTO CREATE");

    const main = {
      id: "main_" + restoId,
      restoId,
      ownerId: window.activeUser.email.toLowerCase(),
      name: "Main Branch",
      isMain: true,
      createdAt: Date.now()
    };

    await MENUVA_DB.add("branches", main);

    branches = [main, ...branches];
  }

  // 💾 8. SAVE CACHE (🔥 INI YANG BIKIN CEPAT)
  BRANCH_CACHE = {
    restoId,
    data: branches
  };

  console.log("📦 FINAL BRANCHES:", branches);

  return branches;
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

if (!session?.branchId) {
  await MENUVA_DB.setSession({
    ...session,
    email,
    restoId,
    branchId: mainBranch.id,
    role: session?.role || "super_admin"
  });
}

if (restos.filter(r => r.ownerEmail === email).length > 1) {
  console.warn("🚫 Duplicate resto detected");
}

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

  const container = document.getElementById("branchList");
  if (!container) return;

  container.innerHTML = "";

  if (!branches.length) {
    container.innerHTML = `<div class="empty-branch">No Branch Found</div>`;
    return;
  }

 branches.forEach(b => {

  const item = document.createElement("div");
  item.className = `branch-card ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}`;

  item.innerHTML = `
    <div class="branch-header">
      <div class="branch-name">
        ${b.isMain ? "🏢 " : ""}${b.name || b.namaRestoran || "No Name"}
      </div>
      <div class="branch-status ${b.id === ACTIVE_BRANCH_ID ? "active" : ""}">
        ${b.id === ACTIVE_BRANCH_ID ? "ACTIVE" : "IDLE"}
      </div>
    </div>

    <div class="branch-body">
      <div class="branch-info">ID: ${b.id}</div>
    </div>

    <div class="branch-footer">
      <span class="branch-tag">NODE</span>
      ${!b.isMain ? `<button class="delete-btn">×</button>` : ""}
    </div>
  `;

  // 🔥 CLICK CARD = ACTIVE
  item.onclick = () => {
    BranchEngine.setActive(b.id);
  };

  // ❌ DELETE
  const delBtn = item.querySelector(".delete-btn");
  if (delBtn) {
    delBtn.onclick = (e) => {
      e.stopPropagation();
      BranchEngine.delete(b.id);
    };
  }

  container.appendChild(item);
});
}

// ========================================
// 🏷️ SHOW ACTIVE BRANCH NAME
// ========================================

async function renderActiveBranchLabel() {
  const label = document.getElementById("activeBranchLabel");
  if (!label) return;

  const restoId = await getRestoId();
  const branches = await getBranchesSafe(restoId);

  const active = branches.find(b => b.id === ACTIVE_BRANCH_ID);

  if (!active) {
    label.innerText = "No Active Branch";
    label.classList.remove("active");
    return;
  }

  label.innerHTML = `
    <span class="label-left">ACTIVE</span>
    <span class="label-right">${active.name}</span>
  `;

  label.classList.add("active");
}

// ========================================
// 🔄 SET ACTIVE
// ========================================
async function setActiveBranch(branchId) {
  if (!branchId) return;

  console.log("🔥 SWITCH:", branchId);

  try {
    const restoId = await getRestoId();

    // =========================
    // 🔥 VALIDASI
    // =========================
    const branches = await getBranchesSafe(restoId);
    if (!branches.find(b => b.id === branchId)) {
      console.warn("❌ Invalid branchId");
      return;
    }

    // =========================
    // 🔐 SET STATE
    // =========================
    ACTIVE_BRANCH_ID = branchId;
    window.activeBranchId = branchId;

    localStorage.setItem("active_branch", branchId);

    const session = await MENUVA_DB.getSession();
    await MENUVA_DB.setSession({
      ...session,
      branchId
    });

    // =========================
    // 🧹 RESET GLOBAL STATE
    // =========================
    BRANCH_CACHE = null;

    // 🔥 RESET SEMUA STATE YANG TERGANTUNG BRANCH
    window.menuData = [];
    window.menuPromo = [];
    window.menuCategories = [];
    window.activeCategoryName = null;

    window.rooms = [];
    window.tables = [];
    window.orders = [];

    // =========================
    // 🎨 UI UPDATE (RINGAN SAJA)
    // =========================
    await renderBranchList();
    await renderActiveBranchLabel();

    // =========================
    // 📡 EVENT (INI KUNCI UTAMA)
    // =========================
    emitBranchChange(branchId);

  } catch (err) {
    console.error("❌ switch error:", err);
  }
}
// ========================================
// ➕ CREATE
// ========================================

async function createBranch(name) {

  if (!name) return alert("Branch name required");

  const restoId = await getRestoId();

  const newBranch = {
    id: uid("branch"),
    restoId,
    name,

    profile: {
      logo: "",
      address: "",
      phone: "",
      currency: "IDR"
    },

    isMain: false,
    createdAt: Date.now()
  };

  await MENUVA_DB.add("branches", newBranch);

  // 🔥 WAIT UNTIL DATA BENAR-BENAR ADA
  let retry = 0;
  let exists = false;

  while (retry < 5 && !exists) {
    const all = await getBranchesByResto(restoId);
    exists = all.some(b => b.id === newBranch.id);

    if (!exists) {
      await new Promise(r => setTimeout(r, 50));
      retry++;
    }
  }

  if (!exists) {
    console.error("❌ Branch not persisted!");
  }

  // 🔥 RESET CACHE SETELAH VALID
  BRANCH_CACHE = null;

  await renderBranchList();

  console.log("🆕 Creating branch:", newBranch);
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

  console.log("🗑️ Delete request:", branch.name, branchId);

if (!confirm(`Delete branch "${branch.name}" ?`)) {
  console.log("❌ Delete cancelled");
  return;
}

 console.log("✅ Delete confirmed");

  await MENUVA_DB.delete("branches", branchId);

  // 🔥 RESET CACHE
 BRANCH_CACHE = null;
const remaining = await getBranchesSafe(restoId);

if (branchId === ACTIVE_BRANCH_ID) {
  ACTIVE_BRANCH_ID = remaining[0]?.id || null;
}

if (branch.restoId !== restoId) {
  throw new Error("🚫 Cross-resto delete blocked");
}

const session = await MENUVA_DB.getSession();

await MENUVA_DB.setSession({
  ...session,
  branchId: ACTIVE_BRANCH_ID
});

  await renderBranchList();
  await renderActiveBranchLabel();

if (ACTIVE_BRANCH_ID) {
  window.activeBranchId = ACTIVE_BRANCH_ID;
  emitBranchChange(ACTIVE_BRANCH_ID);
}
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
  console.warn("⚠️ withBranch is deprecated, use getMyData()");
  return data.filter(d =>
    d.branchId === ACTIVE_BRANCH_ID &&
    d.restoId === CACHED_RESTO_ID
  );
}

// ========================================
// 🧰 DATA ACCESS (NEW)
// ========================================

function getContext() {
  if (!ACTIVE_BRANCH_ID || !CACHED_RESTO_ID) {
    throw new Error("🚫 Branch context missing");
  }

  return {
    branchId: ACTIVE_BRANCH_ID,
    restoId: CACHED_RESTO_ID
  };
}

function withContext(data) {
  const ctx = getContext();

  return {
    ...data,
    branchId: ctx.branchId,
    restoId: ctx.restoId,
    createdAt: Date.now()
  };
}

async function getMyData(store) {
  const ctx = getContext();

  const all = await MENUVA_DB.getAll(store);

  return all.filter(d =>
    d.branchId === ctx.branchId &&
    d.restoId === ctx.restoId
  );
}

// ========================================
// 🚀 INIT
// ========================================

async function initBranchEngine() {
  await getRestoId();
  await loadActiveBranch();
  await renderBranchList();
  await renderActiveBranchLabel();

  if (ACTIVE_BRANCH_ID) {
    window.activeBranchId = ACTIVE_BRANCH_ID;
    emitBranchChange(ACTIVE_BRANCH_ID);
  }

  console.log("🚀 Branch Engine Ready");
}

function emitBranchChange(branchId) {
  window.activeBranchId = branchId;

  window.dispatchEvent(new CustomEvent("branchChanged", {
    detail: { branchId }
  }));
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

  // 🔥 TAMBAHAN WAJIB
  getData: getMyData,
  withContext: withContext,

  filter: withBranch
};

window.openAddBranch = openAddBranch;
window.closeAddBranch = closeAddBranch;
window.submitAddBranch = submitAddBranch;

