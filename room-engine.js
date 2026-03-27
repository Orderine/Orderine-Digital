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

/* ======================================================
   FLIPBOOK ENGINE
====================================================== */

async function loadFlipbook(type,container){

  const data = await MENUVA_DB.getAll(FLIP);

  const list = data.filter(x=>x.type===type);

  container.innerHTML="";

  const frag=document.createDocumentFragment();

  list.forEach(img=>{

    const card=el("div","flip-card");

    const image=el("img");
    image.src=img.url;
    image.loading="lazy";

    const del=el("button","flip-del");
    del.textContent="✕";

    del.onclick=async()=>{

      await MENUVA_DB.delete(FLIP,img.id);
      card.remove();

    };

    card.appendChild(image);
    card.appendChild(del);

    frag.appendChild(card);

  });

  container.appendChild(frag);

}

async function uploadFlipbook(type,input){

  const files=[...input.files];

  if(!files.length) return;

  for(const f of files){

    const reader=new FileReader();

    reader.onload=async(e)=>{

      await MENUVA_DB.add(FLIP,{
        id:uid("flip"),
        type:type,
        url:e.target.result,
        createdAt:Date.now()
      });

    };

    reader.readAsDataURL(f);

  }

  setTimeout(initFlipbooks,300);

}

/* ======================================================
   ROOM ENGINE
====================================================== */

async function renderRooms(){

  const data=await MENUVA_DB.getAll(STORE);

  const hotel=data.filter(x=>x.type==="hotel");
  const meeting=data.filter(x=>x.type==="meeting");
  const pack=data.filter(x=>x.type==="package");

  drawRooms("roomHotelContainer",hotel);
  drawRooms("meetingRoomContainer",meeting);
  drawRooms("packageContainer",pack);

}

function drawRooms(containerId,list){

  const box=document.getElementById(containerId);

  if(!box) return;

  box.innerHTML="";

  const frag=document.createDocumentFragment();

  list.forEach(room=>{

    const card=el("div","room-card");

    const name=el("input");
    name.value=room.name||"";

    const price=el("input");
    price.type="number";
    price.value=room.price||0;

    const del=el("button","room-del");
    del.textContent="Delete";

    del.onclick=async()=>{

      await MENUVA_DB.delete(STORE,room.id);
      card.remove();

    };

    name.onchange=async()=>{

      room.name=name.value;
      await MENUVA_DB.update(STORE,room);

    };

    price.onchange=async()=>{

      room.price=parseInt(price.value||0);
      await MENUVA_DB.update(STORE,room);

    };

    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(del);

    frag.appendChild(card);

  });

  box.appendChild(frag);

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