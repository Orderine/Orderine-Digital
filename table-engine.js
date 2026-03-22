/* ================================
   TABLE ENGINE ORDERINE (FIXED)
================================ */
let currentTableFilter = "all";
let currentSearch = "";
let editingTableId = null;

let selectedShape = null;
let pressTimer = null;

let activeDrag = null;
let touchMoved = false;

const ROW_HEIGHT = 120;
const VISIBLE_COUNT = 20;

let TABLE_VIEW = {
  data: [],
  start: 0
};

let CURRENT_LAYOUT = {
  tables: [],
  shapes: []
};

const GRID_SIZE = 20;

const ZONE_COLORS = {
  indoor: "rgba(16,185,129,0.25)",
  outdoor: "rgba(59,130,246,0.25)",
  vip: "rgba(168,85,247,0.25)",
  bar: "rgba(249,115,22,0.25)"
};

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

  // 🔥 bikin index biar super cepat
  TABLE_INDEX = Object.create(null);
  for(const t of TABLE_CACHE){
    TABLE_INDEX[t.id] = t;
  }
}

let TABLE_INDEX = {};

/* =========================
   INIT LAYOUT EDITOR
========================= */

function initLayoutEditor(){

  const map = document.getElementById("tableEditorMap");
  const deleteBtn = document.getElementById("deleteShapeBtn");

  if(!map) return;

  let isDragging = false;

  /* SELECT */
  map.addEventListener("click", function(e){

    if(e.target.closest("#deleteShapeBtn")) return;

    const shape = e.target.closest(".layout-shape");

    map.querySelectorAll(".layout-shape")
      .forEach(el => el.classList.remove("selected"));

    if(shape){
      selectedShape = shape;
      selectedShape.classList.add("selected");
      if(deleteBtn) deleteBtn.style.display = "flex";
    }else{
      selectedShape = null;
      if(deleteBtn) deleteBtn.style.display = "none";
    }

  });

   map.addEventListener("pointerdown", function(e){

  const shape = e.target.closest(".layout-shape");

  if(shape){
    selectedShape = shape;

    map.querySelectorAll(".layout-shape")
      .forEach(el => el.classList.remove("selected"));

    shape.classList.add("selected");

    const deleteBtn = document.getElementById("deleteShapeBtn");
    if(deleteBtn) deleteBtn.style.display = "flex";
  }

});

  /* LONG PRESS DELETE */
  map.addEventListener("touchstart", function(e){

    if(e.target.closest(".dragging")) return;

    const shape = e.target.closest(".layout-shape");
    if(!shape) return;

    selectedShape = shape;
    isDragging = false;

    pressTimer = setTimeout(() => {

      if(!isDragging){
        navigator.vibrate?.(40);

        if(confirm("Delete this shape?")){
          selectedShape.remove();
          selectedShape = null;
          if(deleteBtn) deleteBtn.style.display = "none";
        }
      }

    }, 400);

  });

  map.addEventListener("touchmove", (e) => {
  isDragging = true;
  clearTimeout(pressTimer);
});
   
  map.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  });

  /* DELETE BUTTON */
  if(deleteBtn){
    deleteBtn.onclick = () => {
      if(!selectedShape) return;

      if(confirm("Delete this shape?")){
        selectedShape.remove();
        selectedShape = null;
        deleteBtn.style.display = "none";
      }
    };
  }

  /* DELETE KEY */
  document.addEventListener("keydown", function(e){
    if(e.key === "Delete" && selectedShape){
      selectedShape.remove();
      selectedShape = null;
      if(deleteBtn) deleteBtn.style.display = "none";
    }
  });

}

/* =========================
   FILTER + SEARCH
========================= */

function filterTables(zone){
  currentTableFilter = zone;
  renderTables();
}

let searchTimer = null;

function searchTables(){

  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {

    currentSearch = document
      .getElementById("tableSearchInput")
      .value.toLowerCase();

    requestAnimationFrame(() => renderTables());

  }, 250);
}

function createTableCard(table){

  const statusColor = getTableStatusColor(table.status);
  const opacity = table.active ? "1" : "0.4";

  const card = document.createElement("div");
  card.className = "terminal-card table-card";
  card.style.opacity = opacity;

  card.innerHTML = `
    ${table.image ? `<img src="${table.image}" class="table-card-image">` : ""}

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

async function renderTables(){

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  let filtered = TABLE_CACHE.filter(t => t.restoId === restoId);

  if(currentTableFilter !== "all"){
    filtered = filtered.filter(t => t.zone === currentTableFilter);
  }

  if(currentSearch){
    const keyword = currentSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(keyword)
    );
  }

  // 🔥 SIMPAN KE VIEW (bukan langsung render semua)
  TABLE_VIEW.data = filtered;

  updateVisibleTables(); // render sebagian
  updateTableStats(filtered);
}

function initVirtualScroll(){
  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  grid.addEventListener("scroll", () => {
    requestAnimationFrame(updateVisibleTables);
  });
}

function updateVisibleTables(){

  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  const scrollTop = grid.scrollTop;

  const start = Math.floor(scrollTop / ROW_HEIGHT);
  TABLE_VIEW.start = start;

  renderVisibleTables();
}

function renderVisibleTables(){

  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  const data = TABLE_VIEW.data;
  const start = TABLE_VIEW.start;
  const end = start + VISIBLE_COUNT;

  const visible = data.slice(start, end);

  const fragment = document.createDocumentFragment();

  visible.forEach(table => {
    fragment.appendChild(createTableCard(table));
  });

  grid.innerHTML = "";
  grid.appendChild(fragment);
}

/* =========================
   AUTO NAME
========================= */

async function generateTableName(){
  return "T" + String(tables.length + 1).padStart(2,"0");
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

  if(!name) name = await generateTableName();

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  let posX = 100;
  let posY = 100;

  if(editingTableId){
    const existing = TABLE_CACHE.find(t => t.id === editingTableId);
    if(existing){
      posX = existing.x || 100;
      posY = existing.y || 100;
    }
  } else {
    const count = TABLE_CACHE.length;
    const cols = 5;

    posX = 80 + (count % cols) * 90;
    posY = 80 + Math.floor(count / cols) * 90;
  }

  const tableData = {
    id: editingTableId || "TB_" + Date.now(),
    restoId,
    name,
    capacity,
    zone,
    category,
    notes,
    image,
    shape: getTableShape(capacity),
    status: "available",
    currentGuest: null,
    active,
    createdAt: Date.now(),
    x: posX,
    y: posY
  };

  if(editingTableId){
    await MENUVA_DB.update("restaurantTables", tableData);
    editingTableId = null;
  }else{
    await MENUVA_DB.add("restaurantTables", tableData);
  }

  clearTableForm();
  renderTables();
  renderTableMap();

}

let cachedLayout = null;
let cachedRestoId = null;
let NODE_CACHE = {};
let TABLE_NODE_LIST = [];

async function renderTableMap() {

  const map = document.getElementById("tableEditorMap");
  if (!map) return;

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  // 🔥 cache layout
  if (!cachedLayout || cachedRestoId !== restoId) {
    cachedLayout = await MENUVA_DB.get(
      "restaurantLayouts",
      "layout_" + restoId
    );
    cachedRestoId = restoId;
  }

  const tablesLayout = cachedLayout?.tables || [];
  CURRENT_LAYOUT.tables = tablesLayout;
  CURRENT_LAYOUT.shapes = cachedLayout?.shapes || [];

  // 🔥 hashmap cepat
  const layoutMap = Object.create(null);
  for (const t of tablesLayout) {
    layoutMap[t.tableId] = t;
  }

  const fragment = document.createDocumentFragment();

  // 🔥 reset list reference
  TABLE_NODE_LIST = [];

  for (const table of TABLE_CACHE) {

    let node = NODE_CACHE[table.id];

    // ✅ CREATE ONCE ONLY
    if (!node) {
      node = document.createElement("div");

      node.className = `table-node ${table.shape || "circle"} ${table.zone}`;
      node.dataset.id = table.id;

      node.innerHTML = table.image
        ? `<div class="table-visual">
             <img src="${table.image}" class="table-img" loading="lazy">
             <div class="table-label">${table.name}</div>
           </div>`
        : `<div class="table-visual">
             <div class="table-fallback"></div>
             <div class="table-label">${table.name}</div>
           </div>`;

      NODE_CACHE[table.id] = node;
    }

    const layoutTable = layoutMap[table.id];

    const x = layoutTable?.x ?? table.x ?? 100;
    const y = layoutTable?.y ?? table.y ?? 100;
    const rotation = layoutTable?.rotation ?? 0;

    node.dataset.rotate = rotation;

    node.style.transform =
      `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;

    fragment.appendChild(node);
    TABLE_NODE_LIST.push(node);
  }

  // 🔥 SUPER FAST DOM SWAP
  map.replaceChildren(fragment);

  // 🔥 init drag sekali
  enableTableDragForContainer(map);
}

/* =========================
   DRAG TABLE (CLEAN)
========================= */

function enableTableDragForContainer(map){
   if(map._dragInitialized) return; // 🔥 penting
  map._dragInitialized = true;

  let activeNode = null;
  let offsetX = 0;
  let offsetY = 0;
  let lastTap = 0;

  // 🔥 pakai pointer events (1 sistem semua device)
  map.addEventListener("pointerdown", (e) => {

    const node = e.target.closest(".table-node");
    if (!node) return;

    if (activeNode) return;
    activeNode = node;

    const rect = node.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    node.classList.add("dragging");

    node.setPointerCapture(e.pointerId);

  });

  map.addEventListener("pointermove", (e) => {

    if (!activeNode) return;

    const mapRect = map.getBoundingClientRect();

    let x = e.clientX - mapRect.left - offsetX;
    let y = e.clientY - mapRect.top - offsetY;

    // 🔥 boundary
    x = Math.max(0, Math.min(x, map.clientWidth - activeNode.offsetWidth));
    y = Math.max(0, Math.min(y, map.clientHeight - activeNode.offsetHeight));

    // 🔥 snap
    x = snapToGrid(x);
    y = snapToGrid(y);

    activeNode.style.transform =
      `translate3d(${x}px, ${y}px, 0) rotate(${activeNode.dataset.rotate || 0}deg)`;

  });

  map.addEventListener("pointerup", (e) => {

    if (!activeNode) return;

    activeNode.classList.remove("dragging");
    activeNode.releasePointerCapture(e.pointerId);

    updateMemory();

    // 🔥 DOUBLE TAP (ANDROID FIX)
    const now = Date.now();
    if (now - lastTap < 250) {
      rotateTable(activeNode);
      lastTap = 0;
    } else {
      lastTap = now;
    }

    activeNode = null;

  });

  /* ================= ROTATE DESKTOP ================= */
  map.addEventListener("dblclick", (e) => {
    const node = e.target.closest(".table-node");
    if (!node) return;
    if (node.classList.contains("dragging")) return;

    rotateTable(node);
  });

}
   
/* =========================
   ROTATE TABLE
========================= */

let isRotating = false;

function rotateTable(node){

  if(isRotating) return;
  isRotating = true;

  let angle = parseInt(node.dataset.rotate || 0);
  angle += 90;

  node.dataset.rotate = angle;

  // 🔥 AMBIL POSISI LAMA
  const transform = node.style.transform;
  const match = transform.match(/translate3d\(([^,]+),([^,]+)/);

  const x = match ? match[1] : "0px";
  const y = match ? match[2] : "0px";

  // 🔥 GABUNG translate + rotate
  node.style.transform =
    `translate3d(${x}, ${y}, 0) rotate(${angle}deg)`;

  updateMemory();

  setTimeout(() => isRotating = false, 200);
}

/* =========================
   MEMORY
========================= */

function updateMemory(){

  CURRENT_LAYOUT.tables = TABLE_NODE_LIST.map(node => {

    const transform = node.style.transform;
    const match = transform.match(/translate3d\(([^,]+),([^,]+)/);

    const x = match ? parseInt(match[1]) : 0;
    const y = match ? parseInt(match[2]) : 0;

    return {
      tableId: node.dataset.id,
      x,
      y,
      rotation: parseInt(node.dataset.rotate) || 0
    };
  });

  CURRENT_LAYOUT.shapes = getLayoutData();
}

/* =========================
   UTIL
========================= */

function snapToGrid(value){
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getTableShape(capacity){
  if(capacity <= 2) return "small-circle";
  if(capacity <= 4) return "circle";
  if(capacity <= 6) return "oval";
  return "rectangle";
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
  const layoutPanel = document.getElementById("layoutEditorPanel");

  if(tablePanel) tablePanel.style.display = mode === "table" ? "block" : "none";
  if(layoutPanel) layoutPanel.style.display = mode === "layout" ? "block" : "none";

  document.querySelectorAll(".mode-switch button")
    .forEach(btn => btn.classList.remove("active"));

  if(mode === "table"){
    document.querySelector(".mode-switch button:nth-child(1)")?.classList.add("active");
  }else{
    document.querySelector(".mode-switch button:nth-child(2)")?.classList.add("active");
  }

}

function addLayoutShape(type){

  const map = document.getElementById("tableEditorMap");
  if(!map) return;

  const shape = document.createElement("div");

  shape.className = "layout-shape " + type;
  shape.dataset.type = type;

  shape.style.left = "120px";
  shape.style.top = "120px";
  shape.style.width = "100px";
  shape.style.height = "60px";
  shape.style.zIndex = 1;

  const resize = document.createElement("div");
  resize.className = "resize-handle";

  shape.appendChild(resize);

  enableShapeDrag(shape);
  enableShapeResize(shape, resize);

  shape.ondblclick = () => rotateShape(shape);

  map.appendChild(shape);

}

function enableShapeDrag(node){

  const map = document.getElementById("tableEditorMap");

  let active = false;
  let offsetX = 0;
  let offsetY = 0;

  node.addEventListener("pointerdown", (e) => {

    active = true;

    const rect = node.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    node.setPointerCapture(e.pointerId);

  });

  node.addEventListener("pointermove", (e) => {

    if(!active) return;

    const mapRect = map.getBoundingClientRect();

    let x = e.clientX - mapRect.left - offsetX;
    let y = e.clientY - mapRect.top - offsetY;

    x = snapToGrid(x);
    y = snapToGrid(y);

    // 🔥 PAKAI TRANSFORM SAJA (jangan left/top)
    node.style.transform =
      `translate(${x}px, ${y}px) rotate(${node.dataset.rotate || 0}deg)`;

  });

  node.addEventListener("pointerup", (e) => {

    active = false;
    node.releasePointerCapture(e.pointerId);

    updateMemory();
  });
}

function enableShapeResize(node, handle){

  handle.onmousedown = function(e){

    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    const startWidth = node.offsetWidth;
    const startHeight = node.offsetHeight;

    document.onmousemove = function(e){

      node.style.width = startWidth + (e.clientX - startX) + "px";
      node.style.height = startHeight + (e.clientY - startY) + "px";

    };

    document.onmouseup = function(){
      document.onmousemove = null;
      updateMemory();
    };

  };

}

function getLayoutData(){
  const map = document.getElementById("tableEditorMap");
  if(!map) return [];

  const shapes = map.querySelectorAll(".layout-shape");

  return Array.from(shapes).map(shape => ({
    type: shape.dataset.type || "",
    x: parseInt(shape.style.left) || 0,
    y: parseInt(shape.style.top) || 0,
    width: shape.offsetWidth,
    height: shape.offsetHeight,
    rotation: parseInt(shape.dataset.rotate || 0),
    zIndex: shape.style.zIndex || 1
  }));

}

function renderLayoutShapes(layout){

  const map = document.getElementById("tableEditorMap");
  if(!map) return;

  layout.forEach(item => {

    const shape = document.createElement("div");

    shape.className = "layout-shape " + item.type;
    shape.dataset.type = item.type;

    shape.style.left = item.x + "px";
    shape.style.top = item.y + "px";
    shape.style.width = item.width + "px";
    shape.style.height = item.height + "px";
    shape.style.zIndex = item.zIndex || 1;

    if(item.rotation){
      shape.dataset.rotate = item.rotation;
      shape.style.transform = `rotate(${item.rotation}deg)`;
    }

    const resize = document.createElement("div");
    resize.className = "resize-handle";

    shape.appendChild(resize);

    enableShapeDrag(shape);
    enableShapeResize(shape, resize);

    shape.ondblclick = () => rotateShape(shape);

    map.appendChild(shape);

  });

}

async function saveLayout(){

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  const layout = {
    id: "layout_" + restoId,
    restoId,
    tables: CURRENT_LAYOUT.tables,
    shapes: CURRENT_LAYOUT.shapes,
    updatedAt: Date.now()
  };

  await MENUVA_DB.add("restaurantLayouts", layout);

  alert("Layout saved bro 🔥");

}

async function generateAutoLayout(){

  const session = await getSessionCached();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");
  const filtered = tables.filter(t => t.restoId === restoId);

  const map = document.getElementById("tableEditorMap");

  const spacing = 120;
  const cols = Math.floor(map.clientWidth / spacing) || 4;

  const updates = filtered.map((t, i) => {
    t.x = (i % cols) * spacing + 40;
    t.y = Math.floor(i / cols) * spacing + 40;
    return MENUVA_DB.update("restaurantTables", t);
  });

  await Promise.all(updates); // 🔥 GAS POL

  renderTableMap();
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

function rotateShape(node){

  let angle = parseInt(node.dataset.rotate || 0);
  angle += 90;

  node.dataset.rotate = angle;

  const transform = node.style.transform;
  const match = transform.match(/translate\(([^,]+),([^,]+)/);

  const x = match ? match[1] : "0px";
  const y = match ? match[2] : "0px";

  node.style.transform =
    `translate(${x}, ${y}) rotate(${angle}deg)`;

  updateMemory();
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

  // 🔥 update cache
  TABLE_CACHE = TABLE_CACHE.filter(t => t.id !== id);
  delete TABLE_INDEX[id];

  renderTables();
  renderTableMap();
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

  alert("Deposit setting cleared bro 🧹");

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

initVirtualScroll();

await Promise.all([
  renderTables(),
  renderTableMap(),
  loadDepositSetting()
   
]);
   console.timeEnd("⚡ TOTAL INIT");
});
