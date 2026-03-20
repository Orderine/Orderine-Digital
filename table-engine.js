/* ================================
   TABLE ENGINE ORDERINE (FIXED)
================================ */

(function () {
  const originalFunctions = {};
  const stats = {};

  function wrapFunction(obj, key) {
    const original = obj[key];
    if (typeof original !== "function") return;

    originalFunctions[key] = original;

    obj[key] = async function (...args) {
      const start = performance.now();

      const result = await original.apply(this, args);

      const duration = performance.now() - start;

      if (!stats[key]) {
        stats[key] = { count: 0, total: 0 };
      }

      stats[key].count++;
      stats[key].total += duration;

      return result;
    };
  }

  // scan global functions
  for (const key in window) {
    try {
      wrapFunction(window, key);
    } catch (e) {}
  }

  // tampilkan hasil setelah load
  window.addEventListener("load", () => {
    setTimeout(() => {
      console.table(
        Object.entries(stats)
          .map(([name, data]) => ({
            function: name,
            calls: data.count,
            totalMs: data.total.toFixed(2),
            avgMs: (data.total / data.count).toFixed(2),
          }))
          .sort((a, b) => b.totalMs - a.totalMs)
      );
    }, 2000);
  });
})();

setInterval(() => {
  console.log("🔥 Function call stats:", stats);
}, 5000);

const observer = new MutationObserver((mutations) => {
  console.log("⚠️ DOM berubah:", mutations.length);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

let currentTableFilter = "all";
let currentSearch = "";
let editingTableId = null;

let selectedShape = null;
let pressTimer = null;

let activeDrag = null;
let touchMoved = false;

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

let TABLE_CACHE = [];

async function loadTablesOnce(){
  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");
  TABLE_CACHE = tables.filter(t => t.restoId === restoId);
}

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

function searchTables(){
  currentSearch = document
    .getElementById("tableSearchInput")
    .value.toLowerCase();

  renderTables();
}

async function renderTables(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

 const tables = TABLE_CACHE;

  let filtered = tables.filter(t => t.restoId === restoId);

  if(currentTableFilter !== "all"){
    filtered = filtered.filter(t => t.zone === currentTableFilter);
  }

  if(currentSearch){
    const keyword = currentSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(keyword)
    );
  }

  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  // 🔥 pakai fragment biar gak berat
  const fragment = document.createDocumentFragment();

  filtered.forEach(table => {

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

        <div class="table-actions">
          <button data-edit="${table.id}">Edit</button>
          <button data-delete="${table.id}">Delete</button>
        </div>

      </div>
    `;

    // 🔥 event delegation ringan (no inline onclick)
    card.querySelector("[data-edit]")?.addEventListener("click", () => editTable(table.id));
    card.querySelector("[data-delete]")?.addEventListener("click", () => deleteTable(table.id));

    fragment.appendChild(card);
  });

  // 🔥 clear sekali aja
  grid.innerHTML = "";
  grid.appendChild(fragment);

  updateTableStats(filtered);
}
/* =========================
   AUTO NAME
========================= */

async function generateTableName(){
  const tables = await MENUVA_DB.getAll("restaurantTables");
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

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");

  let posX = 100;
  let posY = 100;

  if(editingTableId){
    const existing = tables.find(t => t.id === editingTableId);
    if(existing){
      posX = existing.x || 100;
      posY = existing.y || 100;
    }
  } else {
    const count = tables.length;
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

/* =========================
   TABLE MAP RENDER
========================= */

async function renderTableMap(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const filtered = TABLE_CACHE; // 🔥 pakai cache langsung

  const layout = await MENUVA_DB.get("restaurantLayouts", "layout_" + restoId);

  CURRENT_LAYOUT.tables = layout?.tables || [];
  CURRENT_LAYOUT.shapes = layout?.shapes || [];

  const map = document.getElementById("tableEditorMap");
  if(!map) return;

  // 🔥 clear dulu
  map.innerHTML = "";

  // 🔥 bikin hashmap sekali
  const layoutMap = {};
  CURRENT_LAYOUT.tables.forEach(t => {
    layoutMap[t.tableId] = t;
  });

  const fragment = document.createDocumentFragment();

  filtered.forEach(table => {

    const layoutTable = layoutMap[table.id];

    const node = document.createElement("div");

    node.className = `table-node ${table.shape || "circle"} ${table.zone}`;
    node.dataset.id = table.id;

    node.innerHTML = `
      <div class="table-visual">
        ${table.image
          ? `<img src="${table.image}" class="table-img" loading="lazy">`
          : `<div class="table-fallback"></div>`}
        <div class="table-label">${table.name}</div>
      </div>
    `;

    const x = layoutTable?.x ?? table.x ?? 100;
    const y = layoutTable?.y ?? table.y ?? 100;

    const rotation = layoutTable?.rotation ?? 0;
    node.dataset.rotate = rotation;

    node.style.transform =
      `translate(${x}px, ${y}px) rotate(${rotation}deg)`;

    enableTableDrag(node);

    fragment.appendChild(node);
  });

  map.appendChild(fragment);
}

/* =========================
   DRAG TABLE (CLEAN)
========================= */

function enableTableDrag(node){

  // 🔥 prevent double init
  if(node.dataset.dragInit) return;
  node.dataset.dragInit = "1";

  const map = document.getElementById("tableEditorMap");

  let offsetX = 0;
  let offsetY = 0;
  let lastTap = 0;
  let mapRect = null;

  function move(x,y){
    x = Math.max(0, Math.min(x, map.clientWidth - node.offsetWidth));
    y = Math.max(0, Math.min(y, map.clientHeight - node.offsetHeight));

    x = snapToGrid(x);
    y = snapToGrid(y);

    node.style.transform =
      `translate(${x}px, ${y}px) rotate(${node.dataset.rotate || 0}deg)`;
  }

  /* ================= DESKTOP ================= */
  node.addEventListener("mousedown", e => {

    if(activeDrag) return;
    activeDrag = node;

    const rect = node.getBoundingClientRect();
    mapRect = map.getBoundingClientRect(); // 🔥 cache sekali

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    node.classList.add("dragging");

    function onMove(e){
      e.preventDefault();

      move(
        e.clientX - mapRect.left - offsetX,
        e.clientY - mapRect.top - offsetY
      );
    }

    function onUp(){
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      activeDrag = null;
      node.classList.remove("dragging");

      updateMemory();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);

  });

  /* ================= MOBILE ================= */
  node.addEventListener("touchstart", e => {

    e.preventDefault();

    if(activeDrag) return;
    activeDrag = node;

    touchMoved = false;

    const touch = e.touches[0];
    const rect = node.getBoundingClientRect();
    mapRect = map.getBoundingClientRect(); // 🔥 cache

    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    node.classList.add("dragging");

    function onMove(e){
      e.preventDefault(); // 🔥 WAJIB

      touchMoved = true;

      const touch = e.touches[0];

      move(
        touch.clientX - mapRect.left - offsetX,
        touch.clientY - mapRect.top - offsetY
      );
    }

    function onEnd(){

      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);

      activeDrag = null;
      node.classList.remove("dragging");

      updateMemory();

      // 🔥 double tap rotate
      const now = Date.now();
      if(!touchMoved && now - lastTap < 250){
        rotateTable(node);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }

    document.addEventListener("touchmove", onMove, { passive:false });
    document.addEventListener("touchend", onEnd);

  });

  /* ================= ROTATE ================= */
  node.addEventListener("dblclick", () => {
    if(node.classList.contains("dragging")) return;
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
  node.style.transform = `rotate(${angle}deg)`;

  updateMemory();

  setTimeout(() => isRotating = false, 200);

}

/* =========================
   MEMORY
========================= */

function updateMemory(){

  const tableNodes = document.querySelectorAll(".table-node");

  CURRENT_LAYOUT.tables = Array.from(tableNodes).map(node => ({
    tableId: node.dataset.id,
    x: parseInt(node.style.left) || 0,
    y: parseInt(node.style.top) || 0,
    rotation: parseInt(node.dataset.rotate) || 0
  }));

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

  let offsetX = 0;
  let offsetY = 0;

  node.addEventListener("mousedown", e => {

    const rect = node.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    function move(e){
      const rect = map.getBoundingClientRect();

      let x = e.clientX - rect.left - offsetX;
      let y = e.clientY - rect.top - offsetY;

      x = snapToGrid(x);
      y = snapToGrid(y);

      node.style.transform = `translate(${x}px, ${y}px) rotate(${node.dataset.rotate || 0}deg)`;
    }

    function up(){
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      updateMemory();
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);

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

  const session = await MENUVA_DB.getSession();
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

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");
  const filtered = tables.filter(t => t.restoId === restoId);

  const map = document.getElementById("tableEditorMap");

  const spacing = 120;
  const cols = Math.floor(map.clientWidth / spacing) || 4;

  for(let i=0;i<filtered.length;i++){

    const t = filtered[i];

    t.x = (i % cols) * spacing + 40;
    t.y = Math.floor(i / cols) * spacing + 40;

    await MENUVA_DB.update("restaurantTables", t);

  }

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

  const session = await MENUVA_DB.getSession();
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

async function loadDepositSetting(){

  const data = await MENUVA_DB.get(
    "reservationSettings",
    "reservation_settings"
  );

  if(!data) return;

  document.getElementById("depositToggle").checked = data.depositEnabled;
  document.getElementById("depositBankName").value = data.bankName || "";
  document.getElementById("depositAccountNumber").value = data.accountNumber || "";
  document.getElementById("depositAccountHolder").value = data.accountHolder || "";
  document.getElementById("depositAmount").value = data.depositAmount || "";

  if(data.qrImage){
    const preview = document.getElementById("depositQRPreview");
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
  node.style.transform = `rotate(${angle}deg)`;

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

document.addEventListener("DOMContentLoaded", async function(){

  if(typeof renderTables !== "function"){
    console.error("❌ renderTables NOT FOUND");
    return;
  }

 await loadTablesOnce();

await Promise.all([
  renderTables(),
  renderTableMap(),
  loadDepositSetting()
]);
});
