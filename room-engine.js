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
const AMENITIES_BY_TYPE = {

  hotel:[
    "wifi",
    "tv",
    "ac",
    "bathtub",
    "minibar",
    "breakfast"
  ],

  meeting:[
    "wifi",
    "projector",
    "whiteboard",
    "sound_system",
    "coffee_break"
  ],

  package:[
    "guide",
    "transport",
    "meal",
    "ticket",
    "insurance"
  ]

};


   
function drawRooms(containerId,list){

  const box=document.getElementById(containerId);
  if(!box) return;

  box.innerHTML="";

  const frag=document.createDocumentFragment();

  list.forEach(room=>{
     const isHotel = room.type==="hotel";
     const isMeeting = room.type==="meeting";
     const isPackage = room.type==="package";

    const card=el("div","room-card");

     /* ===============================
   COLLECT USED ROOM NUMBERS
================================ */

const usedNumbers = new Set();

list.forEach(r=>{
  if(Array.isArray(r.roomNumbers)){
    r.roomNumbers.forEach(n=>usedNumbers.add(n));
  }
});

    /* ===============================
       NORMALIZE DATA (anti bug lama)
    =============================== */

    room.images = Array.isArray(room.images) ? room.images : [];
    room.amenities = Array.isArray(room.amenities) ? room.amenities : [];

     if(room.name === "New hotel" || room.name === "New meeting" || room.name === "New package"){
  room.name = "";
}

     if(typeof room.status !== "string" || room.status === ""){
  room.status = "available";
   }

    /* ===============================
       GALLERY
    =============================== */

    const gallery=el("div","room-gallery");

let imgs=[];

if(room.images.length>0){
  imgs=room.images;
}
else if(room.image){
  imgs=[room.image];
}

let index=0;

const img=document.createElement("img");
img.className="room-img";
img.src=imgs[0] || "";

gallery.appendChild(img);

/* ARROWS */

if(imgs.length>1){

  const prev=document.createElement("button");
  prev.className="gallery-prev";
  prev.textContent="‹";

  const next=document.createElement("button");
  next.className="gallery-next";
  next.textContent="›";

  prev.onclick=()=>{
    index--;
    if(index<0) index=imgs.length-1;
    img.src=imgs[index];
  };

  next.onclick=()=>{
    index++;
    if(index>=imgs.length) index=0;
    img.src=imgs[index];
  };

  gallery.append(prev,next);

}

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

    if(room.images.length >= 5){
      alert("Max 5 images per room");
      break;
    }

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

if(isHotel){
  name.placeholder="Room Name";
}
else if(isMeeting){
  name.placeholder="Meeting Room Name";
}
else if(isPackage){
  name.placeholder="Wedding package, buffet name, etc.";
}

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
================================ */

if(isHotel){

  /* ROOM TYPE */

  const roomType=document.createElement("select");

  [
    "",
    "Standard",
    "Deluxe",
    "Suite",
    "Family",
    "Presidential"
  ].forEach(v=>{

    const o=document.createElement("option");
    o.value=v;
    o.textContent=v || "Room Type";

    if(room.roomType===v) o.selected=true;

    roomType.appendChild(o);

  });

  roomType.onchange=async()=>{

    room.roomType = roomType.value;

    await MENUVA_DB.update(STORE,room);

  };


  /* SMOKING OPTION */

  const smoking=document.createElement("select");

  ["Non Smoking","Smoking"].forEach(v=>{

    const o=document.createElement("option");
    o.value=v;
    o.textContent=v;

    if(room.smoking===v) o.selected=true;

    smoking.appendChild(o);

  });

  smoking.onchange=async()=>{

    room.smoking = smoking.value;

    await MENUVA_DB.update(STORE,room);

  };


  /* BED TYPE */

  const bed=document.createElement("select");

  [
    "",
    "Single Bed",
    "Twin Bed",
    "Queen Bed",
    "King Bed"
  ].forEach(v=>{

    const o=document.createElement("option");
    o.value=v;
    o.textContent=v || "Bed Type";

    if(room.bed===v) o.selected=true;

    bed.appendChild(o);

  });

  bed.onchange=async()=>{

    room.bed = bed.value;

    await MENUVA_DB.update(STORE,room);

  };

  card.append(roomType,smoking,bed);

}
    /* ===============================
       CAPACITY
    =============================== */

    if(isHotel || isMeeting){

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
   HOTEL EXTRA OPTIONS
================================ */

if(isHotel){

  /* ROOM SIZE */

  const size=el("input");
  size.type="number";
  size.placeholder="Room size (m²)";
  size.value=room.size||"";

  size.onchange=async()=>{

    room.size=parseInt(size.value||0);

    await MENUVA_DB.update(STORE,room);

  };

  card.append(size);


  /* ROOM VIEW */

  const view=document.createElement("select");

  ["","Garden View","Pool View","City View","Ocean View","Mountain View"]
  .forEach(v=>{

    const o=document.createElement("option");
    o.value=v;
    o.textContent=v || "Room view";

    if(room.view===v) o.selected=true;

    view.appendChild(o);

  });

  view.onchange=async()=>{

    room.view=view.value;

    await MENUVA_DB.update(STORE,room);

  };

  card.append(view);


  /* EXTRA BED */

  const extra=document.createElement("select");

  ["No Extra Bed","Extra Bed Available"].forEach(v=>{

    const o=document.createElement("option");
    o.value=v;
    o.textContent=v;

    if(room.extraBed===v) o.selected=true;

    extra.appendChild(o);

  });

  extra.onchange=async()=>{

    room.extraBed=extra.value;

    await MENUVA_DB.update(STORE,room);

  };

  card.append(extra);

     /* FLOOR */

const floor = el("input");
floor.type = "number";
floor.placeholder = "Floor";
floor.value = room.floor || 1;

floor.onchange = async()=>{
  room.floor = parseInt(floor.value || 1);
  await MENUVA_DB.update(STORE,room);
};

card.append(floor);

/* ===============================
   INVENTORY + SMART GENERATOR
================================ */

const inv = el("input");
inv.type = "number";
inv.placeholder = "Total rooms";

if(typeof room.inventory === "number"){
  inv.value = room.inventory;
}else{
  inv.value = 1;
  room.inventory = 1;
}

inv.onchange = async()=>{

  let val = parseInt(inv.value);

  if(isNaN(val) || val < 1){
    val = 1;
  }

  room.inventory = val;

  if(!Array.isArray(room.roomNumbers)){
    room.roomNumbers = [];
  }

  const floorNum = room.floor || 1;

  /* REMOVE OLD NUMBERS FROM USED SET */
  room.roomNumbers.forEach(n=>usedNumbers.delete(n));

  const numbers = [];

  let index = 1;

  while(numbers.length < val){

    const candidate = (floorNum * 100 + index).toString();

    if(!usedNumbers.has(candidate)){
      numbers.push(candidate);
      usedNumbers.add(candidate);
    }

    index++;

    if(index > 99) break;
  }

  room.roomNumbers = numbers;

  await MENUVA_DB.update(STORE,room);

  renderRooms();

};

card.append(inv);

  /* ===============================
   ROOM NUMBERS EDITABLE TAGS
================================ */

if(Array.isArray(room.roomNumbers) && room.roomNumbers.length){

  const list=document.createElement("div");
  list.className="room-number-list";

  room.roomNumbers.forEach((num,i)=>{

    const tag=document.createElement("span");
    tag.className="room-number-tag";

    const txt=document.createElement("span");
    txt.textContent=num;

    const edit=document.createElement("button");
    edit.textContent="✎";
    edit.className="room-edit-btn";

    edit.onclick=()=>{

      const newNum=prompt("Edit Room Number",num);

      if(!newNum) return;

      const clean=newNum.trim();

      if(!clean) return;

      /* DUPLICATE CHECK */

      const allNumbers=[];

      document.querySelectorAll(".room-number-tag span")
      .forEach(el=>allNumbers.push(el.textContent));

      if(allNumbers.includes(clean)){
        alert("Room number already exists");
        return;
      }

      room.roomNumbers[i]=clean;

      MENUVA_DB.update(STORE,room);

      renderRooms();

    };

    tag.append(txt,edit);

    list.appendChild(tag);

  });

  card.append(list);

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
================================ */

const amenBox = el("div","room-amenities");

room.amenities.forEach(a=>{

  const label=document.createElement("label");

  const cb=document.createElement("input");
  cb.type="checkbox";
  cb.checked=true;

  cb.onchange=async()=>{

    if(!cb.checked){

      room.amenities = room.amenities.filter(x=>x!==a);

      await MENUVA_DB.update(STORE,room);

      renderRooms();

    }

  };

  const del=document.createElement("span");
  del.textContent=" ✕";
  del.style.cursor="pointer";

  del.onclick=async()=>{

    room.amenities = room.amenities.filter(x=>x!==a);

    await MENUVA_DB.update(STORE,room);

    renderRooms();

  };

  label.append(cb," "+a,del);

  amenBox.appendChild(label);

});

card.append(amenBox);


/* ===============================
   ADD AMENITY
================================ */

const addBox = document.createElement("div");
addBox.className="amenity-add-box";

const addInput = document.createElement("input");
addInput.placeholder="Ac,Tv,Etc.";

const addBtn = document.createElement("button");
addBtn.textContent="Add";

addBtn.onclick = async()=>{

  const val = addInput.value.trim().toLowerCase();

  if(!val) return;

  if(!room.amenities.includes(val)){

    room.amenities.push(val);

    await MENUVA_DB.update(STORE,room);

    renderRooms();

  }

  addInput.value="";

};

addBox.append(addInput,addBtn);

card.append(addBox);

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
