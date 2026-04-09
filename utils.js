// ========================================
// 🧠 O-ONE CORE UTILS ENGINE
// ========================================

(function(){

  // ========================================
  // 🔥 UID GENERATOR (UNIQUE ID)
  // ========================================
  function uid(prefix = "id"){
    return (
      prefix + "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substring(2, 8)
    );
  }

  // ========================================
  // 🕒 TIME HELPERS
  // ========================================
  function now(){
    return Date.now();
  }

  function formatDate(timestamp){
    const d = new Date(timestamp);
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function formatDateTime(timestamp){
    const d = new Date(timestamp);
    return d.toLocaleString("id-ID");
  }

  // ========================================
  // 💾 LOCAL STORAGE SAFE
  // ========================================
  function saveLS(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch(err){
      console.error("❌ saveLS failed:", err);
    }
  }

  function getLS(key){
    try{
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    }catch(err){
      console.error("❌ getLS failed:", err);
      return null;
    }
  }

  function removeLS(key){
    try{
      localStorage.removeItem(key);
    }catch(err){
      console.error("❌ removeLS failed:", err);
    }
  }

  // ========================================
  // 🧪 SAFE EXECUTION
  // ========================================
  function safeCall(fn, ...args){
    try{
      if(typeof fn === "function"){
        return fn(...args);
      }
    }catch(err){
      console.error("❌ safeCall error:", err);
    }
  }

  async function safeAwait(fn, ...args){
    try{
      if(typeof fn === "function"){
        return await fn(...args);
      }
    }catch(err){
      console.error("❌ safeAwait error:", err);
    }
  }

  // ========================================
  // 🔍 ARRAY HELPERS
  // ========================================
  function groupBy(arr, key){
    return arr.reduce((acc, item)=>{
      const k = item[key];
      if(!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  function uniqueBy(arr, key){
    const map = new Map();
    arr.forEach(item => map.set(item[key], item));
    return Array.from(map.values());
  }

  function sortBy(arr, key, asc = true){
    return [...arr].sort((a,b)=>{
      if(a[key] < b[key]) return asc ? -1 : 1;
      if(a[key] > b[key]) return asc ? 1 : -1;
      return 0;
    });
  }

  // ========================================
  // 🔎 SEARCH / FILTER
  // ========================================
  function searchBy(arr, keyword, keys = []){
    if(!keyword) return arr;

    keyword = keyword.toLowerCase();

    return arr.filter(item =>
      keys.some(k =>
        String(item[k] || "")
          .toLowerCase()
          .includes(keyword)
      )
    );
  }

  // ========================================
  // 🎛️ DEBOUNCE (PERFORMANCE)
  // ========================================
  function debounce(fn, delay = 300){
    let timer;
    return (...args)=>{
      clearTimeout(timer);
      timer = setTimeout(()=> fn(...args), delay);
    };
  }

  // ========================================
  // 🧱 DEEP CLONE
  // ========================================
  function clone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  // ========================================
  // 🔢 FORMAT NUMBER
  // ========================================
  function formatCurrency(num){
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(num || 0);
  }

  // ========================================
  // 🔐 SIMPLE VALIDATION
  // ========================================
  function isEmpty(val){
    return val === null || val === undefined || val === "";
  }

  // ========================================
  // 🌍 GLOBAL EXPORT
  // ========================================
  window.uid = uid;
  window.now = now;
  window.formatDate = formatDate;
  window.formatDateTime = formatDateTime;

  window.saveLS = saveLS;
  window.getLS = getLS;
  window.removeLS = removeLS;

  window.safeCall = safeCall;
  window.safeAwait = safeAwait;

  window.groupBy = groupBy;
  window.uniqueBy = uniqueBy;
  window.sortBy = sortBy;

  window.searchBy = searchBy;

  window.debounce = debounce;

  window.clone = clone;

  window.formatCurrency = formatCurrency;

  window.isEmpty = isEmpty;

  console.log("🧠 O-One Utils Ready");

})();