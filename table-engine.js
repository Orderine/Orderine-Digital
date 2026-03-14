async function saveTable(){

const name =
document.getElementById("tableNameInput").value;

const capacity =
parseInt(
document.getElementById("tableCapacityInput").value
);

const zone =
document.getElementById("tableZoneInput").value;

const active =
document.getElementById("tableActiveToggle").checked;


const session = await MENUVA_DB.getSession();
const restoId = session?.restoId || "default";


const tableData = {

id: "TB_" + Date.now(),

restoId,

name,

capacity,

zone,

status: "available",

active,

createdAt: Date.now()

};


await MENUVA_DB.add(
"restaurantTables",
tableData
);


renderTables();

}

async function renderTables(){

const session = await MENUVA_DB.getSession();
const restoId = session?.restoId;

const tables =
await MENUVA_DB.getAll("restaurantTables");


const filtered =
tables.filter(t => t.restoId === restoId);


const grid =
document.getElementById("tablePreviewGrid");

grid.innerHTML = "";


filtered.forEach(table => {

grid.innerHTML += `

<div class="terminal-card">

<div class="terminal-card-header">

<span class="terminal-title">
${table.name}
</span>

</div>

<div class="terminal-card-body">

Capacity : ${table.capacity}<br>

Zone : ${table.zone}<br>

Status : ${table.status}

<br><br>

<button onclick="deleteTable('${table.id}')">
Delete
</button>

</div>

</div>

`;

});

}

async function deleteTable(id){

await MENUVA_DB.delete(
"restaurantTables",
id
);

renderTables();

}

document.addEventListener(
"DOMContentLoaded",
renderTables
);

