/* ================================
   TABLE ENGINE ORDERINE
================================ */

let currentTableFilter = "all";
let currentSearch = "";
let editingTableId = null;

let selectedShape = null;
let pressTimer = null;

let activeDrag = null;
let touchMoved = false;

function initLayoutEditor(){

const map = document.getElementById("tableEditorMap");
const deleteBtn = document.getElementById("deleteShapeBtn");

if(!map) return;

let isDragging = false;

/* =========================
   SELECT (DESKTOP + MOBILE)
========================= */

map.addEventListener("click",function(e){

document
.querySelectorAll(".layout-shape")
.forEach(el=>el.classList.remove("selected"));

if(e.target.classList.contains("layout-shape")){

selectedShape = e.target;
selectedShape.classList.add("selected");

if(deleteBtn) deleteBtn.style.display = "block";

}else{

selectedShape = null;

if(deleteBtn) deleteBtn.style.display = "none";

}

});

/* =========================
   TOUCH (LONG PRESS DELETE)
========================= */

map.addEventListener("touchstart",function(e){

/* 🔥 JANGAN GANGGU DRAG */
if(e.target.closest(".dragging")) return;

if(!e.target.classList.contains("layout-shape")) return;

selectedShape = e.target;
isDragging = false;

document
.querySelectorAll(".layout-shape")
.forEach(el=>el.classList.remove("selected"));

selectedShape.classList.add("selected");

/* LONG PRESS */
pressTimer = setTimeout(function(){

if(!touchMoved){

navigator.vibrate?.(40);

if(confirm("Delete this shape?")){
selectedShape.remove();
selectedShape = null;
if(deleteBtn) deleteBtn.style.display = "none";
}

}

},800);

});

map.addEventListener("touchmove",function(){
isDragging = true;
clearTimeout(pressTimer);
});

map.addEventListener("touchend",function(){
clearTimeout(pressTimer);
});

/* =========================
   DELETE BUTTON
========================= */

if(deleteBtn){
deleteBtn.onclick = function(){

if(!selectedShape) return;

if(confirm("Delete this shape?")){

selectedShape.remove();
selectedShape = null;
deleteBtn.style.display = "none";

}

};
}

/* =========================
   DELETE KEY (DESKTOP)
========================= */

document.addEventListener("keydown",function(e){

if(e.key === "Delete" && selectedShape){

selectedShape.remove();
selectedShape = null;

if(deleteBtn) deleteBtn.style.display = "none";

}

});

}

const GRID_SIZE = 20;

const ZONE_COLORS = {

indoor: "rgba(16,185,129,0.25)",

outdoor: "rgba(59,130,246,0.25)",

vip: "rgba(168,85,247,0.25)",

bar: "rgba(249,115,22,0.25)"

};


/* ================================
   FILTER TABLE
================================ */

function filterTables(zone){

currentTableFilter = zone;

renderTables();

}


/* ================================
   SEARCH TABLE
================================ */

function searchTables(){

currentSearch =
document
.getElementById("tableSearchInput")
.value
.toLowerCase();

renderTables();

}


/* ================================
   AUTO TABLE NAME GENERATOR
================================ */

async function generateTableName(){

const tables =
await MENUVA_DB.getAll("restaurantTables");

const next = tables.length + 1;

return "T" + String(next).padStart(2,"0");

}


/* ================================
   SAVE / UPDATE TABLE
================================ */

async function saveTable(){

const nameInput =
document.getElementById("tableNameInput");

let name = nameInput.value;

const capacity =
parseInt(
document.getElementById("tableCapacityInput").value
);

const zone =
document.getElementById("tableZoneInput").value;

const category =
document.getElementById("tableCategoryInput")?.value || "";

const notes =
document.getElementById("tableNotesInput")?.value || "";

const active =
document.getElementById("tableActiveToggle").checked;

const image =
document.getElementById("tableImagePreview")?.src || "";


/* AUTO NAME */

if(!name){

name = await generateTableName();

}


/* SESSION */

const session = await MENUVA_DB.getSession();

const restoId = session?.restoId || "default";

/* DEFAULT POSITION */

let posX = 100;
let posY = 100;

const tables =
await MENUVA_DB.getAll("restaurantTables");


/* =========================
   EDIT TABLE → pakai posisi lama
========================= */

if(editingTableId){

const existing =
tables.find(t => t.id === editingTableId);

if(existing){

posX = existing.x || 100;
posY = existing.y || 100;

}

}

/* =========================
   CREATE TABLE → auto grid
========================= */

else{

const count = tables.length;

const cols = 5;      // meja per baris
const spacingX = 90; // jarak horizontal
const spacingY = 90; // jarak vertical

posX = 80 + (count % cols) * spacingX;
posY = 80 + Math.floor(count / cols) * spacingY;

}


/* TABLE OBJECT */

const tableData = {

id: editingTableId || "TB_" + Date.now(),

restoId,

name,

capacity,

zone,

category,

notes,

image,

/* POSITION */

x: posX,
y: posY,

shape: getTableShape(capacity),


status: "available",

currentGuest: null,

active,

createdAt: Date.now()

};

/* SAVE OR UPDATE */

if(editingTableId){

await MENUVA_DB.update(
"restaurantTables",
tableData
);

editingTableId = null;

}else{

await MENUVA_DB.add(
"restaurantTables",
tableData
);

}


clearTableForm();

renderTables();

renderTableMap();

}

async function renderTableMap(){

const session =
await MENUVA_DB.getSession();

const restoId =
session?.restoId || "default";

const tables =
await MENUVA_DB.getAll("restaurantTables");

/* FILTER RESTO */

const filtered =
tables.filter(t => t.restoId === restoId);

const map =
document.getElementById("tableEditorMap");

if(!map) return;

map.innerHTML = "";

/* RENDER */

filtered.forEach(table=>{

const node =
document.createElement("div");

node.className =
"table-node "
+ (table.shape || "circle") + " "
+ table.zone;
   
node.innerText = table.name;

node.style.left =
(table.x || 100) + "px";

node.style.top =
(table.y || 100) + "px";

node.dataset.id = table.id;

enableTableDrag(node);

map.appendChild(node);

});

}

function enableTableDrag(node){

let offsetX = 0;
let offsetY = 0;

const map = document.getElementById("tableEditorMap");

/* =========================
   DESKTOP
========================= */

node.onmousedown = function(e){

if(activeDrag) return;
activeDrag = node;

e.stopPropagation();

const rect = map.getBoundingClientRect();

offsetX = e.clientX - node.offsetLeft;
offsetY = e.clientY - node.offsetTop;

node.classList.add("dragging");

document.onmousemove = function(e){

let x = e.clientX - rect.left - offsetX;
let y = e.clientY - rect.top - offsetY;

/* 🔥 BOUNDARY */
x = Math.max(0, Math.min(x, map.clientWidth - node.offsetWidth));
y = Math.max(0, Math.min(y, map.clientHeight - node.offsetHeight));

/* SNAP GRID */
x = snapToGrid(x);
y = snapToGrid(y);

node.style.left = x + "px";
node.style.top = y + "px";

};

document.onmouseup = async function(){

document.onmousemove = null;

activeDrag = null;
node.classList.remove("dragging");

/* SAVE POSITION */
const id = node.dataset.id;

const tables =
await MENUVA_DB.getAll("restaurantTables");

const table =
tables.find(t=>t.id===id);

if(table){

table.x = parseInt(node.style.left);
table.y = parseInt(node.style.top);

await MENUVA_DB.update(
"restaurantTables",
table
);

}

};

};

}

 async function generateAutoLayout(){

const session = await MENUVA_DB.getSession();
const restoId = session?.restoId || "default";

const tables = await MENUVA_DB.getAll("restaurantTables");

/* FILTER RESTO */

const filtered =
tables.filter(t => t.restoId === restoId);

if(!filtered.length) return;

/* MAP SIZE */

const map =
document.getElementById("tableEditorMap");

const width = map.clientWidth;

/* GRID CONFIG */

const spacingX = 120;
const spacingY = 120;

const cols =
Math.floor(width / spacingX) || 4;

/* LOOP TABLES */

for(let i=0;i<filtered.length;i++){

let table = filtered[i];

let col = i % cols;
let row = Math.floor(i / cols);

table.x = 60 + col * spacingX;
table.y = 60 + row * spacingY;

/* SAVE */

await MENUVA_DB.update(
"restaurantTables",
table
);

}

/* RELOAD MAP */

renderTableMap();

}

/* ================================
   SMART TABLE SHAPE
================================ */

function getTableShape(capacity){

if(capacity <= 2){

return "small-circle";

}

if(capacity <= 4){

return "circle";

}

if(capacity <= 6){

return "oval";

}

return "rectangle";

}

/* ================================
   CLEAR FORM
================================ */

function clearTableForm(){

document.getElementById("tableNameInput").value = "";

document.getElementById("tableCapacityInput").value = "";

document.getElementById("tableZoneInput").value = "indoor";

if(document.getElementById("tableCategoryInput"))
document.getElementById("tableCategoryInput").value = "dining";

if(document.getElementById("tableNotesInput"))
document.getElementById("tableNotesInput").value = "";

document.getElementById("tableActiveToggle").checked = true;

const preview =
document.getElementById("tableImagePreview");

if(preview){

preview.src = "";
preview.style.display = "none";

}

editingTableId = null;

}


/* ================================
   EDIT TABLE
================================ */

async function editTable(id){

const tables =
await MENUVA_DB.getAll("restaurantTables");

const table =
tables.find(t=>t.id===id);

if(!table) return;

editingTableId = id;

document.getElementById("tableNameInput").value =
table.name;

document.getElementById("tableCapacityInput").value =
table.capacity;

document.getElementById("tableZoneInput").value =
table.zone;

if(document.getElementById("tableCategoryInput"))
document.getElementById("tableCategoryInput").value =
table.category || "";

if(document.getElementById("tableNotesInput"))
document.getElementById("tableNotesInput").value =
table.notes || "";

document.getElementById("tableActiveToggle").checked =
table.active;

const preview =
document.getElementById("tableImagePreview");

if(preview && table.image){

preview.src = table.image;

preview.style.display = "block";

}

}


/* ================================
   DELETE TABLE
================================ */

async function deleteTable(id){

if(!confirm("Delete this table?")) return;

await MENUVA_DB.delete(
"restaurantTables",
id
);

renderTables();

renderTableMap();

}


/* ================================
   IMAGE PREVIEW
================================ */

function previewTableImage(event){

const file = event.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = function(e){

const preview =
document.getElementById("tableImagePreview");

preview.src = e.target.result;

preview.style.display = "block";

}

reader.readAsDataURL(file);

}


/* ================================
   STATUS COLOR
================================ */

function getTableStatusColor(status){

switch(status){

case "available":
return "#10b981";

case "reserved":
return "#f59e0b";

case "occupied":
return "#ef4444";

case "cleaning":
return "#3b82f6";

case "disabled":
return "#6b7280";

default:
return "#9ca3af";

}

}


/* ================================
   RENDER TABLES
================================ */

async function renderTables(){

const session =
await MENUVA_DB.getSession();

const restoId =
session?.restoId || "default";


const tables =
await MENUVA_DB.getAll("restaurantTables");


let filtered =
tables.filter(t => t.restoId === restoId);


/* FILTER ZONE */

if(currentTableFilter !== "all"){

filtered =
filtered.filter(t =>
t.zone === currentTableFilter
);

}


/* SEARCH */

if(currentSearch){

filtered =
filtered.filter(t =>
t.name.toLowerCase()
.includes(currentSearch)
);

}


/* GRID */

const grid =
document.getElementById("tablePreviewGrid");

let html = "";


/* LOOP */

filtered.forEach(table => {

const statusColor =
getTableStatusColor(table.status);

const opacity =
table.active ? "1" : "0.4";

html += `

<div class="terminal-card table-card"
style="opacity:${opacity}">

${table.image ? `
<img 
src="${table.image}"
class="table-card-image">
` : ""}

<div class="terminal-card-header">

<span class="terminal-title">
${table.name}
</span>

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

<div class="table-status"
style="background:${statusColor}">

${table.status}

</div>

<div class="table-actions">

<button onclick="editTable('${table.id}')">
Edit
</button>

<button onclick="deleteTable('${table.id}')">
Delete
</button>

</div>

</div>

</div>

`;

});


grid.innerHTML = html;


/* UPDATE STATS */

updateTableStats(filtered);

}


/* ================================
   TABLE STATS
================================ */

function updateTableStats(tables){

const total =
tables.length;

const active =
tables.filter(t=>t.active).length;

const available =
tables.filter(t=>t.status==="available").length;

const stats =
document.getElementById("tableStats");

if(!stats) return;

stats.innerHTML = `
Total Tables : ${total} |
Active : ${active} |
Available : ${available}
`;

}

function previewDepositQR(event){

const file = event.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = function(e){

const preview =
document.getElementById("depositQRPreview");

preview.src = e.target.result;

preview.style.display = "block";

}

reader.readAsDataURL(file);

}

async function saveDepositSetting(){

const session = await MENUVA_DB.getSession();

const restoId = session?.restoId || "default";

const depositEnabled =
document.getElementById("depositToggle").checked;

const bankName =
document.getElementById("depositBankName").value;

const accountNumber =
document.getElementById("depositAccountNumber").value;

const accountHolder =
document.getElementById("depositAccountHolder").value;

const depositAmount =
parseInt(
document.getElementById("depositAmount").value
) || 0;

const qrImage =
document.getElementById("depositQRPreview").src || "";

const data = {

id:"reservation_settings",

restoId,

depositEnabled,

bankName,

accountNumber,

accountHolder,

depositAmount,

qrImage,

updatedAt:Date.now()

};

await MENUVA_DB.add(
"reservationSettings",
data
);

alert("Deposit setting saved");

}

async function loadDepositSetting(){

const data =
await MENUVA_DB.get(
"reservationSettings",
"reservation_settings"
);

if(!data) return;

document.getElementById("depositToggle").checked =
data.depositEnabled || false;

document.getElementById("depositBankName").value =
data.bankName || "";

document.getElementById("depositAccountNumber").value =
data.accountNumber || "";

document.getElementById("depositAccountHolder").value =
data.accountHolder || "";

document.getElementById("depositAmount").value =
data.depositAmount || "";

if(data.qrImage){

const preview =
document.getElementById("depositQRPreview");

preview.src = data.qrImage;

preview.style.display = "block";

}

}

function snapToGrid(value){

return Math.round(value / GRID_SIZE) * GRID_SIZE;

}

function enableShapeDrag(node){

let offsetX = 0;
let offsetY = 0;

const map = document.getElementById("tableEditorMap");

/* =========================
   DESKTOP
========================= */

node.onmousedown = function(e){

if(activeDrag) return;
activeDrag = node;

e.stopPropagation();

const rect = map.getBoundingClientRect();

offsetX = e.clientX - nodeRect.left;
offsetY = e.clientY - nodeRect.top;

node.classList.add("dragging");

document.onmousemove = function(e){

let x = e.clientX - rect.left - offsetX;
let y = e.clientY - rect.top - offsetY;

/* 🔥 BOUNDARY */
x = Math.max(0, Math.min(x, map.clientWidth - node.offsetWidth));
y = Math.max(0, Math.min(y, map.clientHeight - node.offsetHeight));

/* SNAP */
x = snapToGrid(x);
y = snapToGrid(y);

node.style.left = x + "px";
node.style.top = y + "px";

};

document.onmouseup = function(){

document.onmousemove = null;

activeDrag = null;
node.classList.remove("dragging");

};

};

/* =========================
   MOBILE (FIX FINAL)
========================= */

node.ontouchstart = function(e){

if(activeDrag) return;
activeDrag = node;

e.stopPropagation();
// ❌ jangan pakai preventDefault di sini

touchMoved = false; // 🔥 detect drag vs hold

clearTimeout(pressTimer);

const touch = e.touches[0];
const rect = map.getBoundingClientRect();
const nodeRect = node.getBoundingClientRect(); // 🔥 FIX OFFSET

offsetX = touch.clientX - nodeRect.left;
offsetY = touch.clientY - nodeRect.top;

node.classList.add("dragging");

document.ontouchmove = function(e){

touchMoved = true; // 🔥 berarti ini drag

e.preventDefault(); // ✅ TARO DI SINI (bukan di start)

const touch = e.touches[0];

let x = touch.clientX - rect.left - offsetX;
let y = touch.clientY - rect.top - offsetY;

/* 🔥 BOUNDARY */
x = Math.max(0, Math.min(x, map.clientWidth - node.offsetWidth));
y = Math.max(0, Math.min(y, map.clientHeight - node.offsetHeight));

/* SNAP */
x = snapToGrid(x);
y = snapToGrid(y);

node.style.left = x + "px";
node.style.top = y + "px";

};

document.ontouchend = function(){

document.ontouchmove = null;

activeDrag = null;
node.classList.remove("dragging");

};
};

}

function rotateShape(node){

let angle =
node.dataset.rotate
? parseInt(node.dataset.rotate)
: 0;

angle += 90;

node.dataset.rotate = angle;

node.style.transform =
"rotate(" + angle + "deg)";

}

function addLayoutShape(type){

const map =
document.getElementById("tableEditorMap");

const shape =
document.createElement("div");

shape.className = "layout-shape " + type;

shape.style.left = "120px";
shape.style.top = "120px";

shape.style.zIndex = 1;

/* RESIZE HANDLE */

const resize =
document.createElement("div");

resize.className = "resize-handle";

shape.appendChild(resize);

/* ENABLE DRAG */

enableShapeDrag(shape);

/* ENABLE RESIZE */

enableShapeResize(shape,resize);

/* DOUBLE CLICK ROTATE */

shape.ondblclick = function(){
rotateShape(shape);
};

map.appendChild(shape);

}


function enableShapeResize(node,handle){

/* DESKTOP */
handle.onmousedown = function(e){

e.stopPropagation();

const startX = e.clientX;
const startY = e.clientY;

const startWidth = node.offsetWidth;
const startHeight = node.offsetHeight;

document.onmousemove = function(e){

let newWidth = startWidth + (e.clientX - startX);
let newHeight = startHeight + (e.clientY - startY);

node.style.width = newWidth + "px";
node.style.height = newHeight + "px";

};

document.onmouseup = function(){
document.onmousemove = null;
};

};

/* MOBILE */
handle.ontouchstart = function(e){

e.stopPropagation();

const touch = e.touches[0];

const startX = touch.clientX;
const startY = touch.clientY;

const startWidth = node.offsetWidth;
const startHeight = node.offsetHeight;

document.ontouchmove = function(e){

const touch = e.touches[0];

let newWidth = startWidth + (touch.clientX - startX);
let newHeight = startHeight + (touch.clientY - startY);

node.style.width = newWidth + "px";
node.style.height = newHeight + "px";

};

document.ontouchend = function(){
document.ontouchmove = null;
};

};

}

const toggle = document.getElementById("tableActiveToggle");
const text = document.getElementById("tableActiveText");

function updateToggleUI(){
  if(toggle.checked){
    text.innerText = "ACTIVE";
    text.style.color = "#10b981";
  } else {
    text.innerText = "INACTIVE";
    text.style.color = "#ef4444";
  }
}

toggle.addEventListener("change", updateToggleUI);

// init
updateToggleUI();

/* ================================
   INIT
================================ */

document.addEventListener(
"DOMContentLoaded",
async function(){

/* LOAD TABLE LIST */
await renderTables();

/* LOAD TABLE LAYOUT MAP */
await renderTableMap();

/* LOAD DEPOSIT SETTINGS */
await loadDepositSetting();

/* INIT MAP EVENTS */
initLayoutEditor();

}
);
