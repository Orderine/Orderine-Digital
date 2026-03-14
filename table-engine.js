function openTableEditor(){

document
.getElementById("tableEditorPanel")
.style.display="block";

}



function saveTable(){

const name =
document.getElementById("tableNameInput").value;

const capacity =
document.getElementById("tableCapacityInput").value;

const zone =
document.getElementById("tableZoneInput").value;

const active =
document.getElementById("tableActiveToggle").checked;


let tables =
JSON.parse(localStorage.getItem("restaurantTables")) || [];


const newTable = {

id:"TB"+Date.now(),

name:name,

capacity:parseInt(capacity),

zone:zone,

active:active,

status:"available"

};


tables.push(newTable);

localStorage.setItem(
"restaurantTables",
JSON.stringify(tables)
);


renderTables();

}

function renderTables(){

    let tables =
    JSON.parse(localStorage.getItem("restaurantTables")) || [];
    
    
    const grid =
    document.getElementById("tablePreviewGrid");
    
    
    grid.innerHTML="";
    
    
    tables.forEach(table=>{
    
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

    document.addEventListener(
"DOMContentLoaded",
renderTables
);

