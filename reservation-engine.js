/* =====================================
   ORDERINE RESERVATION ENGINE
   FULL SYNC WITH menu.html
===================================== */


/* =====================================
   GLOBAL SAFETY
===================================== */

if(typeof tables === "undefined") window.tables = [];
if(typeof reservations === "undefined") window.reservations = [];


/* =====================================
   TIME UTILITIES
===================================== */

function timeToMinutes(time){

const [h,m] = time.split(":").map(Number);

return h*60 + m;

}

function minutesToTime(minutes){

const h = String(Math.floor(minutes/60)).padStart(2,"0");
const m = String(minutes%60).padStart(2,"0");

return `${h}:${m}`;

}


/* =====================================
   DINING DURATION
===================================== */

function getDiningDuration(guests){

if(guests<=2) return 90;
if(guests<=4) return 120;
if(guests<=6) return 150;
if(guests<=8) return 180;

return 180;

}


/* =====================================
   TIME OVERLAP
===================================== */

function isTimeOverlap(startA,endA,startB,endB){

const a1 = timeToMinutes(startA);
const a2 = timeToMinutes(endA);

const b1 = timeToMinutes(startB);
const b2 = timeToMinutes(endB);

return a1 < b2 && a2 > b1;

}


/* =====================================
   TABLE AVAILABILITY
===================================== */

function isTableAvailable(tableId,start,end,date,reservations){

for(const r of reservations){

if(r.date !== date) continue;

if(!r.tables.includes(tableId)) continue;

if(isTimeOverlap(start,end,r.startTime,r.endTime)){
return false;
}

}

return true;

}


/* =====================================
   GET AVAILABLE TABLES
===================================== */

function getAvailableTables(start,end,date,tables,reservations){

return tables.filter(table =>

isTableAvailable(
table.id,
start,
end,
date,
reservations
)

);

}


/* =====================================
   TABLE COMBINATION ENGINE
===================================== */

function findTableCombination(tables,guests){

const results=[];

function search(combo,startIndex){

const capacity =
combo.reduce((s,t)=>s+t.capacity,0);

if(capacity>=guests){

results.push(combo);
return;

}

for(let i=startIndex;i<tables.length;i++){

search([...combo,tables[i]],i+1);

}

}

search([],0);

return results;

}


/* =====================================
   BEST COMBINATION
===================================== */

function findBestCombination(combos,guests){

let best=null;
let bestScore=Infinity;

combos.forEach(combo=>{

const score=calculateTableScore(combo,guests);

if(score<bestScore){

bestScore=score;
best=combo;

}

});

return best;

}


/* =====================================
   TIME SLOT GENERATOR
===================================== */

function generateTimeSlots(open,close,interval){

const slots=[];

let current=timeToMinutes(open);
const end=timeToMinutes(close);

while(current<end){

slots.push(minutesToTime(current));

current+=interval;

}

return slots;

}


/* =====================================
   SLOT STATUS ENGINE
===================================== */

function getSlotStatus({

slot,
guests,
tables,
reservations

}){

if(!tables || !reservations) return "FULL";

const date =
document.getElementById("resDate")?.value;

if(!date) return "AVAILABLE";

const duration =
getDiningDuration(guests);

const start=slot;

const end =
minutesToTime(
timeToMinutes(slot)+duration
);

const availableTables =
getAvailableTables(
start,
end,
date,
tables,
reservations
);

const combos =
findTableCombination(
availableTables,
guests
);

if(combos.length===0)
return "FULL";

if(combos.length<=2)
return "LIMITED";

return "AVAILABLE";

}


/* =====================================
   CREATE RESERVATION
===================================== */

function createReservation({

date,
startTime,
guests,
name,
phone,
tables,
reservations,
forcedTables

}){

const duration =
getDiningDuration(guests);

const endTime =
minutesToTime(
timeToMinutes(startTime)+duration
);

let availableTables;

if(forcedTables){

availableTables =
tables.filter(t =>
forcedTables.includes(t.id)
);

}else{

availableTables =
getAvailableTables(
startTime,
endTime,
date,
tables,
reservations
);

}

const combos =
findTableCombination(
availableTables,
guests
);

if(combos.length===0){

return {
success:false,
reason:"NO_TABLE"
};

}

const best =
findBestCombination(
combos,
guests
);

const reservation={

id:"RSV-"+Date.now(),

date,

startTime,
endTime,

duration,

guests,

tables:
best.map(t=>t.id),

name,
phone,

status:"CONFIRMED",

checkIn:false,

createdAt:Date.now()

};

return {

success:true,
reservation

};

}


/* =====================================
   AUTO RELEASE (NO SHOW)
===================================== */

function autoReleaseTables(reservations){

const now=new Date();

reservations.forEach(r=>{

if(r.status!=="CONFIRMED") return;

if(r.checkIn) return;

const [h,m]=
r.startTime.split(":").map(Number);

const resTime=new Date();

resTime.setHours(h);
resTime.setMinutes(m);
resTime.setSeconds(0);

const diff=(now-resTime)/60000;

if(diff>15){

r.status="NO_SHOW";

}

});

}


/* =====================================
   TABLE SCORE
===================================== */

function calculateTableScore(combo,guests){

const capacity=
combo.reduce((s,t)=>s+t.capacity,0);

const waste=capacity-guests;

const tableCount=combo.length;

const priority=
combo.reduce((s,t)=>s+(t.priority||1),0);

return (waste*10)+tableCount+priority;

}
