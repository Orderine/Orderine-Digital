/* ================================
   TABLE ENGINE ORDERINE (FIXED)
================================ */
let currentTableFilter = "all";
let currentSearch = "";
let editingTableId = null;


let SESSION_CACHE = null;

async function getSessionCached(){
  if(SESSION_CACHE) return SESSION_CACHE;

  SESSION_CACHE = await MENUVA_DB.getSession();
  return SESSION_CACHE;
}

let TABLE_CACHE = [];

async function loadTablesOnce(){
  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");

  TABLE_CACHE = tables.filter(t => t.restoId === restoId);

  // ✅ FIX: pakai global, bukan local
  TABLE_INDEX = Object.create(null);
  for(const t of TABLE_CACHE){
    TABLE_INDEX[t.id] = t;
  }
}

let TABLE_INDEX = {};

function filterTables(zone){
  currentTableFilter = zone;
  scheduleRender();
}

let searchTimer = null;

function searchTables(){

  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {

    currentSearch = document
      .getElementById("tableSearchInput")
      .value.toLowerCase();

    scheduleRender();

  }, 250);
}

function createTableCard(table){

  const statusColor = getTableStatusColor(table.status);
  const opacity = table.active ? "1" : "0.4";

  const card = document.createElement("div");
  card.className = "terminal-card table-card";
  card.style.opacity = opacity;

  card.innerHTML = `
    ${table.image ? `<img src="${table.image}" 
     class="table-card-image"
     loading="lazy"
     decoding="async">` : ""}

    <div class="terminal-card-header">
      <span class="terminal-title">${table.name}</span>
    </div>

    <div class="terminal-card-body table-info">
      <div class="table-meta">
        <span>👥 ${table.capacity} Pax</span>
        <span>📍 ${table.zone}</span>
      </div>

      <div class="table-meta">
        <span>🍽 ${table.category || "-"}</span>
      </div>

      <div class="table-notes">
        ${table.notes || ""}
      </div>

      <div class="table-status" style="background:${statusColor}">
        ${table.status}
      </div>
    </div>
  `;

  return card;
}

let TABLE_DOM_CACHE = new Map();

async function renderTables(){
   const grid = document.getElementById("tablePreviewGrid");
if(!grid) return;

// 🔥 RESET kalau mismatch (anti bug DOM nyangkut)
if(TABLE_DOM_CACHE.size > TABLE_CACHE.length){
  grid.innerHTML = "";
  TABLE_DOM_CACHE.clear();
}

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  // ================= FILTER =================
  let filtered = TABLE_CACHE;

  if (restoId) {
    filtered = filtered.filter(t => t.restoId === restoId);
  }

  if(currentTableFilter !== "all"){
    filtered = filtered.filter(t => t.zone === currentTableFilter);
  }

  if(currentSearch){
    const keyword = currentSearch.toLowerCase();
    filtered = filtered.filter(t =>
      (t.name || "").toLowerCase().includes(keyword)
    );
  }

  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  // ================= OPTIMIZE START =================
  // 🔥 pakai requestAnimationFrame biar gak ganggu scroll
  requestAnimationFrame(() => {

    const existingIds = new Set();

    // ================= ADD / UPDATE =================
    for (const table of filtered) {
      existingIds.add(table.id);

      let card = TABLE_DOM_CACHE.get(table.id);

      // 🆕 create kalau belum ada
      if (!card) {
        card = createTableCardOptimized(table);
        TABLE_DOM_CACHE.set(table.id, card);
        grid.appendChild(card);
      } else {
        // 🔄 update ringan (tanpa re-create DOM)
        updateTableCard(card, table);
      }
    }

    // ================= REMOVE UNUSED =================
  const filtered = [];

for(const t of TABLE_CACHE){

  if(t.restoId !== restoId) continue;

  if(currentTableFilter !== "all" && t.zone !== currentTableFilter) continue;

  if(currentSearch){
    if(!(t.name || "").toLowerCase().includes(currentSearch)) continue;
  }

  filtered.push(t);
}

    updateTableStats(filtered);

  });
}

let renderScheduled = false;

function scheduleRender(){
  if(renderScheduled) return;

  renderScheduled = true;

  requestAnimationFrame(() => {
    renderScheduled = false;
    renderTables();
  });
}

function createTableCardOptimized(table){

  const card = document.createElement("div");
  card.className = "terminal-card table-card";

  const title = document.createElement("span");
  const meta1 = document.createElement("div");
  const meta2 = document.createElement("div");
  const notes = document.createElement("div");
  const status = document.createElement("div");

  title.className = "terminal-title";
  meta1.className = "table-meta";
  meta2.className = "table-meta";
  notes.className = "table-notes";
  status.className = "table-status";

  card.append(title, meta1, meta2, notes, status);

  // 🔥 simpan reference (NO querySelector lagi)
  card._refs = { title, meta1, meta2, notes, status };

  updateTableCard(card, table);

  return card;
}

function updateTableCard(card, table){

  const r = card._refs;

  r.title.textContent = table.name;
  r.meta1.textContent = `👥 ${table.capacity} Pax • 📍 ${table.zone}`;
  r.meta2.textContent = `🍽 ${table.category || "-"}`;
  r.notes.textContent = table.notes || "";

  r.status.textContent = table.status;
  r.status.style.background = getTableStatusColor(table.status);

  card.style.opacity = table.active ? "1" : "0.4";
}

window.previewTableImage = async function(event){

  const file = event.target.files[0];
  if(!file) return;

  const preview = document.getElementById("tableImagePreview");
  if(!preview) return;

  const bitmap = await createImageBitmap(file); // 🔥 lebih cepat

  requestAnimationFrame(() => {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const MAX_WIDTH = 800;
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);

    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    preview.src = canvas.toDataURL("image/webp", 0.7);
    preview.style.display = "block";
  });
};
/* =========================
   AUTO NAME
========================= */

function generateTableName(){

  let max = 0;

  for(const t of TABLE_CACHE){
    const num = parseInt((t.name || "").replace("T","")) || 0;
    if(num > max) max = num;
  }

  return "T" + String(max + 1).padStart(2,"0");
}

/* =========================
   SAVE TABLE
========================= */

async function saveTable(){

  let name = document.getElementById("tableNameInput").value;
  const capacity = parseInt(document.getElementById("tableCapacityInput").value);
  const zone = document.getElementById("tableZoneInput").value;

  const category = document.getElementById("tableCategoryInput")?.value || "";
  const notes = document.getElementById("tableNotesInput")?.value || "";
  const active = document.getElementById("tableActiveToggle").checked;
  const image = document.getElementById("tableImagePreview")?.src || "";

  if(!name) name = generateTableName(); // 🔥 sekarang sync function

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  const tableData = {
    id: editingTableId || "TB_" + Date.now(),
    restoId,
    name,
    capacity,
    zone,
    category,
    notes,
    image,
    status: "available",
    currentGuest: null,
    active,
    createdAt: Date.now()
  };

  if(editingTableId){

    await MENUVA_DB.update("restaurantTables", tableData);

    // 🔥 update cache langsung
    const index = TABLE_CACHE.findIndex(t => t.id === editingTableId);
    if(index !== -1) TABLE_CACHE[index] = tableData;

    TABLE_INDEX[tableData.id] = tableData;

    editingTableId = null;

  }else{

    await MENUVA_DB.add("restaurantTables", tableData);

    // 🔥 push ke cache
    TABLE_CACHE.push(tableData);
    TABLE_INDEX[tableData.id] = tableData;
  }

  clearTableForm();

  scheduleRender(); // 🔥 TANPA reload DB
}

function openTableEditor(){
  showEditor("table");

  const panel = document.getElementById("tableEditorPanel");
  if(panel){
    panel.scrollIntoView({ behavior:"smooth" });
  }
}

function showEditor(mode){

  const tablePanel = document.getElementById("tableEditorPanel");

  if(tablePanel) tablePanel.style.display = mode === "table" ? "block" : "none";

  document.querySelectorAll(".mode-switch button")
    .forEach(btn => btn.classList.remove("active"));

  if(mode === "table"){
    document.querySelector(".mode-switch button:nth-child(1)")?.classList.add("active");
  }else{
    document.querySelector(".mode-switch button:nth-child(2)")?.classList.add("active");
  }
}

function previewDepositQR(event){

  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = function(e){
    const preview = document.getElementById("depositQRPreview");
    preview.src = e.target.result;
    preview.style.display = "block";
  };

  reader.readAsDataURL(file);
}

async function saveDepositSetting(){

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  const data = {
    id:"reservation_settings",
    restoId,
    depositEnabled: document.getElementById("depositToggle").checked,
    bankName: document.getElementById("depositBankName").value,
    accountNumber: document.getElementById("depositAccountNumber").value,
    accountHolder: document.getElementById("depositAccountHolder").value,
    depositAmount: parseInt(document.getElementById("depositAmount").value) || 0,
    qrImage: document.getElementById("depositQRPreview").src || "",
    updatedAt: Date.now()
  };

  await MENUVA_DB.add("reservationSettings", data);

  alert("Deposit setting saved");

}

let cachedDeposit = null;

async function loadDepositSetting() {
  if (!cachedDeposit) {
    cachedDeposit = await MENUVA_DB.get(
      "reservationSettings",
      "reservation_settings"
    );
  }

  const data = cachedDeposit;
  if (!data) return;

  const el = (id) => document.getElementById(id);

  el("depositToggle").checked = data.depositEnabled;
  el("depositBankName").value = data.bankName || "";
  el("depositAccountNumber").value = data.accountNumber || "";
  el("depositAccountHolder").value = data.accountHolder || "";
  el("depositAmount").value = data.depositAmount || "";

  if (data.qrImage) {
    const preview = el("depositQRPreview");
    preview.src = data.qrImage;
    preview.style.display = "block";
  }
}
   
function updateTableStats(tables){

  const total = tables.length;
  const active = tables.filter(t => t.active).length;
  const available = tables.filter(t => t.status === "available").length;

  const stats = document.getElementById("tableStats");
  if(!stats) return;

  stats.innerHTML = `
    Total Tables : ${total} |
    Active : ${active} |
    Available : ${available}
  `;

}

function getTableStatusColor(status){

  switch(status){
    case "available": return "#10b981";
    case "reserved": return "#f59e0b";
    case "occupied": return "#ef4444";
    case "cleaning": return "#3b82f6";
    case "disabled": return "#6b7280";
    default: return "#9ca3af";
  }

}

function clearTableForm(){

  document.getElementById("tableNameInput").value = "";
  document.getElementById("tableCapacityInput").value = "";
  document.getElementById("tableZoneInput").value = "indoor";

  if(document.getElementById("tableCategoryInput"))
    document.getElementById("tableCategoryInput").value = "dining";

  if(document.getElementById("tableNotesInput"))
    document.getElementById("tableNotesInput").value = "";

  document.getElementById("tableActiveToggle").checked = true;

  const preview = document.getElementById("tableImagePreview");

  if(preview){
    preview.src = "";
    preview.style.display = "none";
  }

  editingTableId = null;

}
   
async function editTable(id){

  const tables = await MENUVA_DB.getAll("restaurantTables");
  const table = tables.find(t => t.id === id);

  if(!table) return;

  editingTableId = id;

  document.getElementById("tableNameInput").value = table.name;
  document.getElementById("tableCapacityInput").value = table.capacity;
  document.getElementById("tableZoneInput").value = table.zone;

  if(document.getElementById("tableCategoryInput"))
    document.getElementById("tableCategoryInput").value = table.category || "";

  if(document.getElementById("tableNotesInput"))
    document.getElementById("tableNotesInput").value = table.notes || "";

  document.getElementById("tableActiveToggle").checked = table.active;

  const preview = document.getElementById("tableImagePreview");

  if(preview && table.image){
    preview.src = table.image;
    preview.style.display = "block";
  }

  openTableEditor();

}

async function deleteTable(id){

  if(!confirm("Delete this table?")) return;

  await MENUVA_DB.delete("restaurantTables", id);

  // 🔥 hapus dari cache
  TABLE_CACHE = TABLE_CACHE.filter(t => t.id !== id);
  delete TABLE_INDEX[id];

  // 🔥 hapus DOM cache juga
  const el = TABLE_DOM_CACHE.get(id);
  if(el){
    el.remove();
    TABLE_DOM_CACHE.delete(id);
  }

  scheduleRender();
}

const depositToggle = document.getElementById("depositToggle");
const depositText = document.getElementById("depositToggleText");

function updateDepositToggleUI(){
  if(!depositToggle || !depositText) return;

  if(depositToggle.checked){
    depositText.innerText = "ENABLED";
    depositText.style.color = "#10b981";
  } else {
    depositText.innerText = "DISABLED";
    depositText.style.color = "#ef4444";
  }
}

depositToggle?.addEventListener("change", updateDepositToggleUI);

// init
updateDepositToggleUI();

async function clearDepositSetting(){

  if(!confirm("Delete / reset deposit setting?")) return;

  // reset UI
  document.getElementById("depositToggle").checked = false;
  document.getElementById("depositBankName").value = "";
  document.getElementById("depositAccountNumber").value = "";
  document.getElementById("depositAccountHolder").value = "";
  document.getElementById("depositAmount").value = "";

  const preview = document.getElementById("depositQRPreview");
  if(preview){
    preview.src = "";
    preview.style.display = "none";
  }

  updateDepositToggleUI();

  // hapus dari DB (optional tapi recommended)
  await MENUVA_DB.delete("reservationSettings", "reservation_settings");

  alert("Deposit setting cleared 🧹");

}

/* =========================
   INIT
========================= */
console.time("⚡ TOTAL INIT");
document.addEventListener("DOMContentLoaded", async function(){

  if(typeof renderTables !== "function"){
    console.error("❌ renderTables NOT FOUND");
    return;
  }

await loadTablesOnce();

await Promise.all([
  renderTables(),
  loadDepositSetting()
   
]);
   console.timeEnd("⚡ TOTAL INIT");
});
