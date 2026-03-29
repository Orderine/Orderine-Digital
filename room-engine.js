/* ======================================================
   ROOM ENGINE – MENUVA
   Ultra Light Engine
   Flipbook + Room + Package
====================================================== */

(function(){

if(window.ROOM_ENGINE) return;

const STORE = "promoData";
const FLIP  = "flipbookData";

/* ======================================================
   UTIL
====================================================== */

function uid(prefix="id"){
  return prefix + "_" + Math.random().toString(36).slice(2,9);
}

function el(tag,cls){
  const e=document.createElement(tag);
  if(cls) e.className=cls;
  return e;
}

async function resizeImage(file,maxSize){

  return new Promise(resolve=>{

    const img=new Image();
    const reader=new FileReader();

    reader.onload=e=>{

      img.src=e.target.result;

      img.onload=()=>{

        const canvas=document.createElement("canvas");
        const ctx=canvas.getContext("2d");

        let w=img.width;
        let h=img.height;

        if(w>maxSize){
          h=h*(maxSize/w);
          w=maxSize;
        }

        canvas.width=w;
        canvas.height=h;

        ctx.drawImage(img,0,0,w,h);

        const data=canvas.toDataURL("image/jpeg",0.82);

        console.log("📦 image converted");

        resolve(data);

      };

    };

    reader.readAsDataURL(file);

  });

}

/* ======================================================
   FLIPBOOK ENGINE
====================================================== */

async function loadFlipbook(type, container){

  if(!container) return;

  const data = await MENUVA_DB.getAll(FLIP);

  if(!Array.isArray(data)) return;

  const list = data.filter(x => x.type === type);

  container.innerHTML = "";

  const frag = document.createDocumentFragment();

  const MAX_RENDER = 30; // batasi render agar tidak berat
  const slice = list.slice(0, MAX_RENDER);

  slice.forEach(img => {

    const card = el("div","flip-card");

    const image = el("img");
    image.loading = "lazy";
    image.decoding = "async";

    // ==============================
    // SOURCE IMAGE (safe fallback)
    // ==============================
    if(img.file instanceof Blob){

      const url = URL.createObjectURL(img.file);
      image.src = url;

      image.onload = () => {
        URL.revokeObjectURL(url); // cegah memory leak
      };

    }
    else if(typeof img.url === "string"){

      image.src = img.url; // fallback base64 lama

    }
    else{

      image.src = ""; // fallback terakhir

    }

    // ==============================
    // DELETE BUTTON
    // ==============================
    const del = el("button","flip-del");
    del.textContent = "✕";

    del.onclick = async () => {

      try{

        await MENUVA_DB.delete(FLIP, img.id);
        card.remove();

      }catch(err){

        console.error("❌ gagal hapus flipbook:", err);

      }

    };

    card.appendChild(image);
    card.appendChild(del);

    frag.appendChild(card);

  });

  container.appendChild(frag);

}

async function uploadFlipbook(type,input){

  const files = [...input.files];
  if(!files.length) return;

  const progressBox = document.getElementById("flipUploadProgress");
  const progressBar = document.getElementById("flipUploadBar");
  const progressText = document.getElementById("flipUploadText");

  if(progressBox) progressBox.style.display = "block";

  const total = files.length;
  let done = 0;

  console.log("🚀 Upload started:", total,"files");

  for(const f of files){

    /* =========================
       FILE SIZE GUARD (10MB)
    ========================= */

    if(f.size > 10 * 1024 * 1024){

      console.warn("⚠️ File to large (max 10MB):", f.name);

      alert("File "+f.name+" File size is too large. 10MB MAX.");

      continue;

    }

    console.log("📦 Processing:", f.name);

    const optimized = await optimizeImage(f,1200,0.7);

    await MENUVA_DB.add("flipbookData",{
      id: uid("flip"),
      type: type,
      file: optimized,
      createdAt: Date.now()
    });

    done++;

    const percent = Math.round((done/total)*100);

    if(progressBar) progressBar.style.width = percent + "%";
    if(progressText) progressText.textContent = "Uploading " + done + " / " + total;

    console.log("⬆️ Saved to DB:", f.name);

  }

  console.log("🎉 Upload finished");

  if(progressText) progressText.textContent = "Upload complete";
  if(progressBar) progressBar.style.width = "100%";

  setTimeout(()=>{

    if(progressBox) progressBox.style.display="none";
    if(progressBar) progressBar.style.width="0%";

  },1200);

  loadFlipbook(
    type,
    type==="ruangan"
      ? document.getElementById("flipbookRuanganPreview")
      : document.getElementById("flipbookMenuPreview")
  );

}
  async function optimizeImage(file, maxWidth = 1200, quality = 0.7){

  console.log("🖼️ Start processing:", file.name);

  return new Promise(resolve => {

    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => img.src = e.target.result;

    img.onload = () => {

      let w = img.width;
      let h = img.height;

      if(w > maxWidth){
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(img,0,0,w,h);

      canvas.toBlob(blob => {

        console.log("✅ Converted to WebP:", file.name,
          "| size:", Math.round(blob.size/1024),"KB");

        resolve(blob);

      },"image/webp",quality);

    };

    reader.readAsDataURL(file);

  });

}

/* ======================================================
   ROOM ENGINE (OPTIMIZED)
====================================================== */

async function renderRooms(){

  const data = await MENUVA_DB.getAll(STORE);

  const hotel   = data.filter(x=>x.type==="hotel");
  const meeting = data.filter(x=>x.type==="meeting");
  const pack    = data.filter(x=>x.type==="package");

  drawRooms("roomHotelContainer",hotel);
  drawRooms("meetingRoomContainer",meeting);
  drawRooms("packageContainer",pack);

}

/* ======================================================
   DRAW ROOMS
====================================================== */
function drawRooms(containerId,list){

  const box=document.getElementById(containerId);
  if(!box) return;

  box.innerHTML="";

  const frag=document.createDocumentFragment();

  list.forEach(room=>{

    const card=el("div","room-card");

    /* ===============================
       NORMALIZE DATA (anti bug lama)
    =============================== */

    room.images = Array.isArray(room.images) ? room.images : [];
    room.amenities = Array.isArray(room.amenities) ? room.amenities : [];

    /* ===============================
       GALLERY
    =============================== */

    const gallery=el("div","room-gallery");

    const imgs = room.images.length
      ? room.images
      : (room.image ? [room.image] : []);

    imgs.forEach(src=>{

      const gimg=document.createElement("img");
      gimg.className="room-img";
      gimg.src=src;

      gallery.appendChild(gimg);

    });

    /* ===============================
       IMAGE UPLOAD
    =============================== */

    const upload=document.createElement("input");
    upload.type="file";
    upload.accept="image/*";
    upload.multiple=true;

    upload.onchange=async()=>{

      const files=[...upload.files];
      if(!files.length) return;

      for(const file of files){

        const resized=await resizeImage(file,900);

        room.images.push(resized);

      }

      await MENUVA_DB.update(STORE,room);

      renderRooms();

    };

    /* ===============================
       NAME
    =============================== */

    const name=el("input");
    name.value=room.name||"";
    name.placeholder="Room name";

    name.onchange=async()=>{
      room.name=name.value;
      await MENUVA_DB.update(STORE,room);
    };

    /* ===============================
       PRICE
    =============================== */

    const price=el("input");
    price.type="text";

    price.value=formatRupiah(room.price);
    price.placeholder="Rp 1.200.000";

    price.onfocus=()=>{
      price.value=room.price || "";
    };

    price.onblur=async()=>{

      const val=parseRupiah(price.value);

      room.price=val;

      price.value=formatRupiah(val);

      await MENUVA_DB.update(STORE,room);

    };

    card.append(gallery,upload,name,price);

    /* ===============================
       HOTEL OPTIONS
    =============================== */

    if(room.type==="hotel"){

      const type=document.createElement("select");

      ["Non Smoking","Smoking"].forEach(v=>{

        const o=document.createElement("option");
        o.value=v;
        o.textContent=v;

        if(room.roomType===v) o.selected=true;

        type.appendChild(o);

      });

      type.onchange=async()=>{
        room.roomType=type.value;
        await MENUVA_DB.update(STORE,room);
      };

      const bed=document.createElement("select");

      ["Single Bed","Twin Bed","Queen Bed","King Bed"].forEach(v=>{

        const o=document.createElement("option");
        o.value=v;
        o.textContent=v;

        if(room.bed===v) o.selected=true;

        bed.appendChild(o);

      });

      bed.onchange=async()=>{
        room.bed=bed.value;
        await MENUVA_DB.update(STORE,room);
      };

      card.append(type,bed);

    }

    /* ===============================
       CAPACITY
    =============================== */

    if(room.type==="hotel" || room.type==="meeting"){

      const cap=el("input");
      cap.type="number";
      cap.value=room.capacity||"";
      cap.placeholder="2";

      cap.onchange=async()=>{

        room.capacity=parseInt(cap.value||1);

        await MENUVA_DB.update(STORE,room);

      };

      card.append(cap);

    }

    /* ===============================
       NOTE
    =============================== */

    const note=document.createElement("textarea");
    note.value=room.note||"";
    note.placeholder="Free breakfast, etc";

    note.onchange=async()=>{
      room.note=note.value;
      await MENUVA_DB.update(STORE,room);
    };

    card.append(note);

    /* ===============================
       AMENITIES
    =============================== */

    const amenBox=el("div","room-amenities");

    const amenList=[
      "wifi",
      "tv",
      "ac",
      "bathtub",
      "minibar",
      "breakfast"
    ];

    amenList.forEach(a=>{

      const label=document.createElement("label");

      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.value=a;

      if(room.amenities.includes(a))
        cb.checked=true;

      cb.onchange=async()=>{

        if(cb.checked){

          if(!room.amenities.includes(a)){
            room.amenities.push(a);
          }

        }else{

          room.amenities = room.amenities.filter(x=>x!==a);

        }

        await MENUVA_DB.update(STORE,room);

      };

      label.append(cb," "+a);

      amenBox.appendChild(label);

    });

    card.append(amenBox);

    /* ===============================
       DELETE
    =============================== */

    const del=el("button","room-del");
    del.textContent="Delete";

    del.onclick=async()=>{

      await MENUVA_DB.delete(STORE,room.id);

      card.remove();

    };

    card.append(del);

    frag.appendChild(card);

  });

  box.appendChild(frag);

}

function formatRupiah(num){

  if(!num) return "";

  return new Intl.NumberFormat("id-ID",{
    style:"currency",
    currency:"IDR",
    maximumFractionDigits:0
  }).format(num);

}

function parseRupiah(str){

  if(!str) return 0;

  return parseInt(str.replace(/[^\d]/g,"")) || 0;

}
   
/* ======================================================
   ADD ROOM
====================================================== */

async function addRoom(type){

 const data={
  id:uid("room"),
  type:type,

  name:"New "+type,
  price:0,

  image:"",        // tetap biarkan (backward compatible)
  images:[],       // MULTI IMAGE
  amenities:[],    // CHECKLIST

  description:"",
  note:"",

  bed:"Single Bed",
  smoking:"Non Smoking",
  capacity:2,

  createdAt:Date.now()
};
   
  await MENUVA_DB.add(STORE,data);

  renderRooms();

}

/* ======================================================
   SETTINGS
====================================================== */

async function loadSettings(){

  const data=await MENUVA_DB.get("promoData","system_settings");
  if(!data) return;

  const order=document.getElementById("toggleOrderPage");
  const room=document.getElementById("toggleRoomPage");

  if(order) order.checked=data.orderEnabled;
  if(room) room.checked=data.roomEnabled;

}

async function saveSettings(){

  const order=document.getElementById("toggleOrderPage")?.checked;
  const room=document.getElementById("toggleRoomPage")?.checked;

  await MENUVA_DB.update("promoData",{
    id:"system_settings",
    orderEnabled:order,
    roomEnabled:room
  });

}

/* ======================================================
   INIT
====================================================== */

function initFlipbooks(){

  const roomBox=document.getElementById("flipbookRuanganPreview");
  const menuBox=document.getElementById("flipbookMenuPreview");

  loadFlipbook("ruangan",roomBox);
  loadFlipbook("menu",menuBox);

}

function initUpload(){

  const roomInput=document.getElementById("flipbookRuanganUpload");
  const menuInput=document.getElementById("flipbookMenuUpload");

  roomInput?.addEventListener("change",()=>uploadFlipbook("ruangan",roomInput));
  menuInput?.addEventListener("change",()=>uploadFlipbook("menu",menuInput));

}

function initToggle(){

  const order=document.getElementById("toggleOrderPage");
  const room=document.getElementById("toggleRoomPage");

  order?.addEventListener("change",saveSettings);
  room?.addEventListener("change",saveSettings);

}

/* ======================================================
   GLOBAL API
====================================================== */

window.tambahRoom=addRoom;

window.tambahGambar=function(type){

  if(type==="ruangan")
    document.getElementById("flipbookRuanganUpload")?.click();

  if(type==="menu")
    document.getElementById("flipbookMenuUpload")?.click();

};

/* ======================================================
   BOOT
====================================================== */

async function boot(){

  initUpload();
  initFlipbooks();
  initToggle();

  await loadSettings();

  renderRooms();

}

document.addEventListener("DOMContentLoaded",boot);

window.ROOM_ENGINE={
  renderRooms,
  addRoom
};

})();
