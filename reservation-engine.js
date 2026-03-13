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