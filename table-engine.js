/* ================================
   TABLE ENGINE ORDERINE (CLEAN)
================================ */

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

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", async () => {
  await renderTables();
  await renderTableMap();
  await loadDepositSetting();
  initLayoutEditor();
});

/* ================================
   UTIL
================================ */
function snapToGrid(v){
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/* ================================
   INIT LAYOUT EDITOR
================================ */
function initLayoutEditor(){

  const map = document.getElementById("tableEditorMap");
  const deleteBtn = document.getElementById("deleteShapeBtn");

  if(!map) return;

  let isDragging = false;

  /* SELECT */
  map.addEventListener("click", e => {

    if(e.target.closest("#deleteShapeBtn")) return;

    const shape = e.target.closest(".layout-shape");

    document.querySelectorAll(".layout-shape")
      .forEach(el => el.classList.remove("selected"));

    if(shape){
      selectedShape = shape;
      shape.classList.add("selected");
      if(deleteBtn) deleteBtn.style.display = "flex";
    }else{
      selectedShape = null;
      if(deleteBtn) deleteBtn.style.display = "none";
    }
  });

  /* LONG PRESS DELETE */
  map.addEventListener("touchstart", e => {

    const shape = e.target.closest(".layout-shape");
    if(!shape) return;

    selectedShape = shape;
    isDragging = false;

    pressTimer = setTimeout(()=>{
      if(!isDragging){
        if(confirm("Delete this shape?")){
          shape.remove();
          selectedShape = null;
        }
      }
    },700);
  });

  map.addEventListener("touchmove", ()=>{
    isDragging = true;
    clearTimeout(pressTimer);
  });

  map.addEventListener("touchend", ()=>{
    clearTimeout(pressTimer);
  });

  /* DELETE BTN */
  if(deleteBtn){
    deleteBtn.onclick = ()=>{
      if(!selectedShape) return;
      if(confirm("Delete this shape?")){
        selectedShape.remove();
        selectedShape = null;
        deleteBtn.style.display = "none";
      }
    };
  }

  /* DELETE KEY */
  document.addEventListener("keydown", e=>{
    if(e.key === "Delete" && selectedShape){
      selectedShape.remove();
      selectedShape = null;
    }
  });
}

/* ================================
   TABLE CRUD
================================ */
async function generateTableName(){
  const tables = await MENUVA_DB.getAll("restaurantTables");
  return "T" + String(tables.length + 1).padStart(2,"0");
}

function getTableShape(cap){
  if(cap <= 2) return "small-circle";
  if(cap <= 4) return "circle";
  if(cap <= 6) return "oval";
  return "rectangle";
}

async function saveTable(){

  let name = document.getElementById("tableNameInput").value;
  const capacity = parseInt(document.getElementById("tableCapacityInput").value);
  const zone = document.getElementById("tableZoneInput").value;

  if(!name) name = await generateTableName();

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tableData = {
    id: editingTableId || "TB_" + Date.now(),
    restoId,
    name,
    capacity,
    zone,
    shape: getTableShape(capacity),
    status:"available",
    active:true,
    createdAt:Date.now()
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

function clearTableForm(){
  document.getElementById("tableNameInput").value="";
  document.getElementById("tableCapacityInput").value="";
  editingTableId=null;
}

/* ================================
   RENDER TABLE MAP
================================ */
async function renderTableMap(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");
  const filtered = tables.filter(t=>t.restoId===restoId);

  const layout = await MENUVA_DB.get("restaurantLayouts","layout_"+restoId);

  CURRENT_LAYOUT.tables = layout?.tables || [];
  CURRENT_LAYOUT.shapes = layout?.shapes || [];

  const map = document.getElementById("tableEditorMap");
  if(!map) return;

  map.innerHTML = "";

  renderLayoutShapes(CURRENT_LAYOUT.shapes);

  filtered.forEach(table=>{

    const layoutData = CURRENT_LAYOUT.tables.find(t=>t.tableId===table.id);

    const node = document.createElement("div");
    node.className = `table-node ${table.shape} ${table.zone}`;

    node.dataset.id = table.id;

    const x = layoutData?.x ?? 100;
    const y = layoutData?.y ?? 100;

    node.style.left = x+"px";
    node.style.top = y+"px";

    const rot = layoutData?.rotation || 0;
    if(rot){
      node.style.transform = `rotate(${rot}deg)`;
      node.dataset.rotate = rot;
    }

    node.innerHTML = `
  <div class="table-visual">

    ${
      table.image
      ? `<img src="${table.image}" class="table-img">`
      : `<div class="table-fallback"></div>`
    }

    <div class="table-label">
      ${table.name}
    </div>

  </div>
`;

    enableTableDrag(node);
    enableTableRotate(node);

    map.appendChild(node);
  });
}

/* ================================
   DRAG TABLE
================================ */
function enableTableDrag(node){

  const map = document.getElementById("tableEditorMap");

  let offsetX, offsetY;

  function move(x,y){
    x = Math.max(0, Math.min(x, map.clientWidth - node.offsetWidth));
    y = Math.max(0, Math.min(y, map.clientHeight - node.offsetHeight));

    node.style.left = snapToGrid(x)+"px";
    node.style.top = snapToGrid(y)+"px";
  }

  node.onmousedown = e=>{
    if(activeDrag) return;
    activeDrag = node;

    const rect = node.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.onmousemove = e=>{
      const rectMap = map.getBoundingClientRect();
      move(e.clientX - rectMap.left - offsetX,
           e.clientY - rectMap.top - offsetY);
    };

    document.onmouseup = ()=>{
      document.onmousemove=null;
      activeDrag=null;
      updateMemory();
    };
  };

  node.ontouchstart = e=>{
    if(activeDrag) return;
    activeDrag = node;

    const touch = e.touches[0];
    const rect = node.getBoundingClientRect();

    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    document.ontouchmove = e=>{
      const t = e.touches[0];
      const rectMap = map.getBoundingClientRect();

      move(t.clientX - rectMap.left - offsetX,
           t.clientY - rectMap.top - offsetY);
    };

    document.ontouchend = ()=>{
      document.ontouchmove=null;
      activeDrag=null;
      updateMemory();
    };
  };
}

/* ================================
   ROTATE TABLE
================================ */
function enableTableRotate(node){

  let lastTap = 0;

  node.ondblclick = ()=>{
    rotateTable(node);
  };

  node.ontouchend = ()=>{
    const now = Date.now();
    if(now - lastTap < 250){
      rotateTable(node);
    }
    lastTap = now;
  };
}

function rotateTable(node){

  let angle = parseInt(node.dataset.rotate || 0);
  angle += 90;

  node.dataset.rotate = angle;
  node.style.transform = `rotate(${angle}deg)`;

  updateMemory();
}

/* ================================
   MEMORY
================================ */
function updateMemory(){

  const nodes = document.querySelectorAll(".table-node");

  CURRENT_LAYOUT.tables = Array.from(nodes).map(n=>({
    tableId:n.dataset.id,
    x:parseInt(n.style.left)||0,
    y:parseInt(n.style.top)||0,
    rotation:parseInt(n.dataset.rotate)||0
  }));

  CURRENT_LAYOUT.shapes = getLayoutData();
}

/* ================================
   SHAPES
================================ */
function addLayoutShape(type){

  const map = document.getElementById("tableEditorMap");

  const shape = document.createElement("div");
  shape.className = "layout-shape " + type;

  shape.style.left="100px";
  shape.style.top="100px";

  enableShapeDrag(shape);

  map.appendChild(shape);
}

function enableShapeDrag(node){

  node.onmousedown = e=>{
    if(activeDrag) return;
    activeDrag = node;

    document.onmousemove = e=>{
      node.style.left = e.clientX+"px";
      node.style.top = e.clientY+"px";
    };

    document.onmouseup = ()=>{
      document.onmousemove=null;
      activeDrag=null;
    };
  };
}

function getLayoutData(){
  return Array.from(document.querySelectorAll(".layout-shape")).map(s=>({
    type:s.classList[1],
    x:parseInt(s.style.left)||0,
    y:parseInt(s.style.top)||0
  }));
}

function renderLayoutShapes(layout){

  const map = document.getElementById("tableEditorMap");

  layout.forEach(item=>{
    const shape = document.createElement("div");
    shape.className="layout-shape "+item.type;
    shape.style.left=item.x+"px";
    shape.style.top=item.y+"px";

    enableShapeDrag(shape);
    map.appendChild(shape);
  });
}

/* ================================
   SAVE LAYOUT
================================ */
async function saveLayout(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const layout = {
    id:"layout_"+restoId,
    restoId,
    tables:CURRENT_LAYOUT.tables,
    shapes:CURRENT_LAYOUT.shapes
  };

  await MENUVA_DB.add("restaurantLayouts", layout);

  alert("Layout saved 🔥");
}

/* ================================
   RENDER TABLE LIST
================================ */
async function renderTables(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const tables = await MENUVA_DB.getAll("restaurantTables");

  const grid = document.getElementById("tablePreviewGrid");
  if(!grid) return;

  const filtered = tables.filter(t => t.restoId === restoId);

  let html = "";

  filtered.forEach(table => {

    html += `
      <div class="terminal-card table-card">

        <div class="terminal-card-header">
          <span>${table.name}</span>
        </div>

        <div class="terminal-card-body">

          <div>👥 ${table.capacity} Pax</div>
          <div>📍 ${table.zone}</div>

          <div style="margin-top:8px;">
            <button onclick="editTable('${table.id}')">Edit</button>
            <button onclick="deleteTable('${table.id}')">Delete</button>
          </div>

        </div>
      </div>
    `;

  });

  grid.innerHTML = html;
}

async function deleteTable(id){
  if(!confirm("Delete this table?")) return;

  await MENUVA_DB.delete("restaurantTables", id);

  renderTables();
  renderTableMap();
}

/* ================================
   LOAD DEPOSIT SETTING (SAFE)
================================ */
async function loadDepositSetting(){

  try{

    const data = await MENUVA_DB.get(
      "reservationSettings",
      "reservation_settings"
    );

    if(!data) return;

    const toggle = document.getElementById("depositToggle");
    const bank = document.getElementById("depositBankName");
    const accNum = document.getElementById("depositAccountNumber");
    const accName = document.getElementById("depositAccountHolder");
    const amount = document.getElementById("depositAmount");
    const preview = document.getElementById("depositQRPreview");

    if(toggle) toggle.checked = data.depositEnabled || false;
    if(bank) bank.value = data.bankName || "";
    if(accNum) accNum.value = data.accountNumber || "";
    if(accName) accName.value = data.accountHolder || "";
    if(amount) amount.value = data.depositAmount || "";

    if(preview && data.qrImage){
      preview.src = data.qrImage;
      preview.style.display = "block";
    }

  }catch(err){
    console.error("❌ loadDepositSetting error:", err);
  }
}

/* ================================
   SAVE DEPOSIT SETTING (SAFE)
================================ */
async function saveDepositSetting(){

  const session = await MENUVA_DB.getSession();
  const restoId = session?.restoId || "default";

  const data = {
    id: "reservation_settings",
    restoId,
    depositEnabled: document.getElementById("depositToggle")?.checked || false,
    bankName: document.getElementById("depositBankName")?.value || "",
    accountNumber: document.getElementById("depositAccountNumber")?.value || "",
    accountHolder: document.getElementById("depositAccountHolder")?.value || "",
    depositAmount: parseInt(document.getElementById("depositAmount")?.value) || 0,
    qrImage: document.getElementById("depositQRPreview")?.src || "",
    updatedAt: Date.now()
  };

  await MENUVA_DB.add("reservationSettings", data);

  alert("Deposit setting saved bro 🔥");
}
