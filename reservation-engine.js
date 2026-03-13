/* ================================
   ORDERINE RESERVATION ENGINE
   Core Logic
================================ */

/* ================================
   TIME OVERLAP CHECK
================================ */

function isTimeOverlap(startA, endA, startB, endB) {

  return startA < endB && endA > startB;

}


/* ================================
   CHECK TABLE AVAILABILITY
================================ */

function isTableAvailable(tableId, start, end, reservations) {

  for (const r of reservations) {

    if (!r.tables.includes(tableId)) continue;

    if (isTimeOverlap(start, end, r.startTime, r.endTime)) {
      return false;
    }

  }

  return true;

}


/* ================================
   GET AVAILABLE TABLES
================================ */

function getAvailableTables(start, end, tables, reservations) {

  return tables.filter(table =>
    isTableAvailable(table.id, start, end, reservations)
  );

}


/* ================================
   TABLE COMBINATION ENGINE
================================ */

function findTableCombination(tables, guests) {

  const results = [];

  function search(combo, startIndex) {

    const capacity =
      combo.reduce((sum, t) => sum + t.capacity, 0);

    if (capacity >= guests) {
      results.push(combo);
      return;
    }

    for (let i = startIndex; i < tables.length; i++) {

      search([...combo, tables[i]], i + 1);

    }

  }

  search([], 0);

  return results;

}

/* ================================
   TEST DATA
================================ */

const tables = [

    { id:"T1", capacity:2 },
    { id:"T2", capacity:2 },
   
    { id:"T3", capacity:4 },
    { id:"T4", capacity:4 },
   
    { id:"T5", capacity:6 }
   
   ];
   
   
   const reservations = [
   
    {
      id:"R1",
      date:"2026-03-14",
      startTime:"18:00",
      endTime:"19:30",
      tables:["T3"],
      guests:4
    }
   
   ];

   /* ================================
   ENGINE TEST
================================ */

const start = "18:30";
const end = "20:00";
const guests = 5;

const availableTables =
  getAvailableTables(start, end, tables, reservations);

console.log("Available Tables:", availableTables);


const combos =
  findTableCombination(availableTables, guests);


console.log("Possible Table Combos:", combos);


/* ================================
   GENERATE TIME SLOTS
================================ */

function generateTimeSlots(open, close, interval) {

  const slots = [];

  let current = open;

  while (current < close) {

    slots.push(current);

    const [h,m] = current.split(":").map(Number);

    const date = new Date(0,0,0,h,m);
    date.setMinutes(date.getMinutes() + interval);

    const nh = String(date.getHours()).padStart(2,"0");
    const nm = String(date.getMinutes()).padStart(2,"0");

    current = `${nh}:${nm}`;

  }

  return slots;

}

console.log("---- SLOT TEST ----");

const slots =
  generateTimeSlots("17:00","22:00",30);

console.log(slots);


/* ================================
   SLOT AVAILABILITY ENGINE
================================ */

function checkSlotAvailability(slot, duration, tables, reservations, guests){

  const start = slot;

  const [h,m] = slot.split(":").map(Number);

  const date = new Date(0,0,0,h,m);
  date.setMinutes(date.getMinutes() + duration);

  const end =
    String(date.getHours()).padStart(2,"0") +
    ":" +
    String(date.getMinutes()).padStart(2,"0");

  const availableTables =
    getAvailableTables(start,end,tables,reservations);

  const combos =
    findTableCombination(availableTables,guests);

  if(combos.length === 0) return "FULL";

  if(combos.length <= 2) return "LIMITED";

  return "AVAILABLE";

}

console.log("---- SLOT STATUS TEST ----");

const daySlots =
  generateTimeSlots("17:00","22:00",30);

daySlots.forEach(slot=>{

  const status =
    checkSlotAvailability(
      slot,
      90,
      tables,
      reservations,
      4
    );

  console.log(slot,"→",status);

});

/* ================================
   FIND BEST TABLE COMBINATION
================================ */

function findBestCombination(combos, guests){

  let best = null;
  let smallestWaste = Infinity;

  combos.forEach(combo=>{

    const capacity =
      combo.reduce((sum,t)=>sum+t.capacity,0);

    const waste = capacity - guests;

    if(waste < smallestWaste){

      smallestWaste = waste;
      best = combo;

    }

  });

  return best;

}

console.log("---- BEST TABLE TEST ----");

const testStart = "18:30";
const testEnd = "20:00";
const testGuests = 5;

const availableTables2 =
  getAvailableTables(testStart,testEnd,tables,reservations);

const combos2 =
  findTableCombination(availableTables2,testGuests);

const best =
  findBestCombination(combos2,testGuests);

console.log("BEST TABLE COMBO:");

console.log(
  best.map(t=>t.id).join(" + ")
);


/* ================================
   CREATE RESERVATION
================================ */

function createReservation({
  date,
  startTime,
  duration,
  guests,
  name,
  phone
}){

  const [h,m] = startTime.split(":").map(Number);

  const d = new Date(0,0,0,h,m);
  d.setMinutes(d.getMinutes() + duration);

  const endTime =
    String(d.getHours()).padStart(2,"0") +
    ":" +
    String(d.getMinutes()).padStart(2,"0");


  const availableTables =
    getAvailableTables(startTime,endTime,tables,reservations);

  const combos =
    findTableCombination(availableTables,guests);

  if(combos.length === 0){

    console.log("❌ NO TABLE AVAILABLE");

    return null;

  }

  const best =
    findBestCombination(combos,guests);


  const reservation = {

    id: "RSV-" + Date.now(),

    date,

    startTime,
    endTime,

    guests,

    tables: best.map(t=>t.id),

    name,
    phone,

    status: "CONFIRMED",

    createdAt: Date.now()

  };

  reservations.push(reservation);

  return reservation;

}

console.log("---- CREATE RESERVATION TEST ----");

const newReservation =
  createReservation({

    date:"2026-03-14",

    startTime:"18:30",

    duration:90,

    guests:5,

    name:"John Doe",

    phone:"08123456789"

  });

console.log(newReservation);

