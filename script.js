import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCvwbZu-8vJWa3lQ4Ter-Sc3RxhCHrhVg",
  authDomain: "icewearcraft-77dda.firebaseapp.com",
  databaseURL: "https://icewearcraft-77dda-default-rtdb.firebaseio.com",
  projectId: "icewearcraft-77dda",
  storageBucket: "icewearcraft-77dda.firebasestorage.app",
  messagingSenderId: "1051069942733",
  appId: "1:1051069942733:web:f9f093b28d2c29b792d284",
  measurementId: "G-V3HEX7BLRQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentRole = "user";
let currentData = {};

const $ = id => document.getElementById(id);

function clean(v){
  return String(v || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function isAdmin(){ return currentRole === "admin"; }
function isVip(){ return currentRole === "vip" || currentRole === "admin"; }

async function createUserProfile(user){
  const ref = doc(db,"users",user.uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref,{
      email:user.email,
      role:"user",
      points:0,
      founderNumber:"",
      founderStatus:"Member",
      createdAt:serverTimestamp()
    });
  }
}

async function loadUser(user){
  currentUser = user;
  await createUserProfile(user);

  const snap = await getDoc(doc(db,"users",user.uid));
  currentData = snap.exists() ? snap.data() : {};
  currentRole = currentData.role || "user";

  $("auth").style.display = "none";
  $("app").style.display = "block";
  $("adminBtn").style.display = isAdmin() ? "block" : "none";

  await showTab("home");
}

window.signUp = async function(){
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if(!email || !password) return alert("Enter email and password.");

  try{
    const result = await createUserWithEmailAndPassword(auth,email,password);
    await createUserProfile(result.user);

    await addDoc(collection(db,"vip_requests"),{
      uid:result.user.uid,
      email,
      status:"pending",
      createdAt:serverTimestamp()
    });

    alert("Account created. Membership request submitted.");
  }catch(err){
    alert("SIGNUP ERROR: " + err.message);
  }
};

window.login = async function(){
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if(!email || !password) return alert("Enter email and password.");

  try{
    const result = await signInWithEmailAndPassword(auth,email,password);
    await loadUser(result.user);
  }catch(err){
    alert("LOGIN ERROR: " + err.message);
  }
};

window.logout = async function(){
  await signOut(auth);
  currentUser = null;
  currentRole = "user";
  currentData = {};
  $("auth").style.display = "flex";
  $("app").style.display = "none";
};

onAuthStateChanged(auth, async user=>{
  if(user) await loadUser(user);
});

window.showTab = async function(tab){
  document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));
  const btnMap = {
    home:"homeBtn",
    wallet:"walletBtn",
    commercials:"commercialsBtn",
    drops:"dropsBtn",
    vip:"vipBtn",
    admin:"adminBtn"
  };
  if(btnMap[tab] && $(btnMap[tab])) $(btnMap[tab]).classList.add("active");

  if(tab === "home") return renderHome();
  if(tab === "wallet") return renderWallet();
  if(tab === "commercials") return renderCommercials();
  if(tab === "drops") return renderDrops();
  if(tab === "vip") return renderVip();
  if(tab === "admin") return renderAdmin();
};

async function renderHome(){
  const usersSnap = await getDocs(collection(db,"users"));

  $("content").innerHTML = `
    <div class="hero">
      <p class="eyebrow">GLACIER COLLECTION #001</p>
      <h1>Welcome, ${clean(currentUser.email.split("@")[0])}</h1>
      <p>The official IcewearCraft VIP app for commercials, apparel drops, rewards, and private updates.</p>
      <button onclick="showTab('drops')">View Drops</button>
    </div>

    <div class="card">
      <p class="eyebrow">FOUNDING MEMBERS</p>
      <h2>${usersSnap.size}/100 Claimed</h2>
      <p>Founding Members receive priority access to Glacier Collection releases.</p>
    </div>

    <div class="card">
      <h2>Founder Pass</h2>
      <p>Founder #${clean(currentData.founderNumber || "----")}</p>
      <p>Status: ${clean(currentData.founderStatus || currentRole)}</p>
      <p>XP: ${clean(currentData.points || 0)}</p>
    </div>
  `;
}

function renderWallet(){
  $("content").innerHTML = `
    <div class="hero">
      <p class="eyebrow">DIGITAL MEMBERSHIP CARD</p>
      <h1>❄️ Glacier Wallet</h1>
      <p>${clean(currentUser.email)}</p>
    </div>

    <div class="card">
      <h2>VIP Level</h2>
      <h1>${isAdmin() ? "Glacier Black" : isVip() ? "Founder" : "Member"}</h1>
    </div>

    <div class="card">
      <h2>Points</h2>
      <h1>${clean(currentData.points || 0)}</h1>
    </div>

    <div class="card">
      <h2>Referral Code</h2>
      <h1>ICE-${clean(currentData.founderNumber || "0000")}</h1>
    </div>
  `;
}

async function renderCommercials(){
  const snap = await getDocs(query(collection(db,"commercials"),orderBy("createdAt","desc")));

  let html = `
    <div class="hero">
      <p class="eyebrow">COMMERCIALS</p>
      <h1>Brand Visuals</h1>
      <p>Premium IcewearCraft commercials, campaign videos, and drop trailers.</p>
    </div>
  `;

  snap.forEach(docSnap=>{
    const v = docSnap.data();
    html += `
      <div class="card">
        <h2>${clean(v.title)}</h2>
        <p>${clean(v.description)}</p>
        ${v.videoUrl ? videoEmbed(v.videoUrl) : ""}
      </div>
    `;
  });

  if(snap.empty) html += `<div class="card"><p>No commercials added yet.</p></div>`;
  $("content").innerHTML = html;
}

function videoEmbed(url){
  const safe = clean(url);

  if(url.includes("youtube.com/watch?v=")){
    const id = url.split("v=")[1].split("&")[0];
    return `<iframe class="video-frame" src="https://www.youtube.com/embed/${clean(id)}" allowfullscreen></iframe>`;
  }

  if(url.includes("youtu.be/")){
    const id = url.split("youtu.be/")[1].split("?")[0];
    return `<iframe class="video-frame" src="https://www.youtube.com/embed/${clean(id)}" allowfullscreen></iframe>`;
  }

  if(url.includes(".mp4")){
    return `<video class="video-frame" controls playsinline src="${safe}"></video>`;
  }

  return `<a class="btn" href="${safe}" target="_blank">Play Video</a>`;
}

async function renderDrops(){
  const snap = await getDocs(query(collection(db,"drops"),orderBy("createdAt","desc")));

  let html = `
    <div class="hero">
      <p class="eyebrow">APPAREL</p>
      <h1>Cold By Design</h1>
      <p>Limited IcewearCraft apparel built as conversation pieces for the brand.</p>
    </div>
  `;

  snap.forEach(docSnap=>{
    const d = docSnap.data();
    html += `
      <div class="card">
        <h2>${clean(d.title)}</h2>
        ${d.imageUrl ? `<img class="drop-img" src="${clean(d.imageUrl)}">` : ""}
        <p>${clean(d.description)}</p>
        <h2>${clean(d.price || "TBA")}</h2>
        <button onclick="reserveDrop('${docSnap.id}','${clean(d.title)}')">Reserve</button>
      </div>
    `;
  });

  if(snap.empty) html += `<div class="card"><p>No drops added yet.</p></div>`;
  $("content").innerHTML = html;
}

window.reserveDrop = async function(id,title){
  await addDoc(collection(db,"orders"),{
    uid:currentUser.uid,
    email:currentUser.email,
    dropId:id,
    product:title,
    status:"Reserved",
    createdAt:serverTimestamp()
  });

  alert("Reservation saved.");
};

async function renderVip(){
  const snap = await getDocs(query(collection(db,"vip_posts"),orderBy("createdAt","desc")));

  let html = `
    <div class="hero">
      <p class="eyebrow">VIP LOUNGE</p>
      <h1>Private Updates</h1>
      <p>Founder announcements, release notes, and private IcewearCraft updates.</p>
    </div>
  `;

  snap.forEach(docSnap=>{
    const p = docSnap.data();
    html += `<div class="card"><h2>${clean(p.title)}</h2><p>${clean(p.text)}</p></div>`;
  });

  if(snap.empty) html += `<div class="card"><p>No VIP posts yet.</p></div>`;
  $("content").innerHTML = html;
}

async function renderAdmin(){
  if(!isAdmin()){
    $("content").innerHTML = `<div class="card"><h2>Access Denied</h2><p>Admin only.</p></div>`;
    return;
  }

  const usersSnap = await getDocs(collection(db,"users"));
  const dropsSnap = await getDocs(query(collection(db,"drops"),orderBy("createdAt","desc")));
  const commercialsSnap = await getDocs(query(collection(db,"commercials"),orderBy("createdAt","desc")));
  const vipSnap = await getDocs(query(collection(db,"vip_posts"),orderBy("createdAt","desc")));

  let members = "";
  usersSnap.forEach(docSnap=>{
    const u = docSnap.data();
    members += `
      <div class="member-row">
        <strong>${clean(u.email)}</strong>
        <p>Role: ${clean(u.role || "user")}</p>
        <p>Points: ${clean(u.points || 0)}</p>
        <button onclick="setRole('${docSnap.id}','vip')">Make VIP</button>
        <button onclick="setRole('${docSnap.id}','admin')">Make Admin</button>
        <button onclick="setRole('${docSnap.id}','user')">Make User</button>
        <button onclick="addMemberPoints('${docSnap.id}')">Add Points</button>
      </div>
    `;
  });

  let drops = "";
  dropsSnap.forEach(docSnap=>{
    const d = docSnap.data();
    drops += `
      <div class="member-row">
        <strong>${clean(d.title)}</strong>
        <p>${clean(d.price || "TBA")}</p>
        <button onclick="editDrop('${docSnap.id}')">Edit Drop</button>
        <button onclick="deleteDrop('${docSnap.id}')">Delete Drop</button>
      </div>
    `;
  });

  let commercials = "";
  commercialsSnap.forEach(docSnap=>{
    const c = docSnap.data();
    commercials += `
      <div class="member-row">
        <strong>${clean(c.title)}</strong>
        <p>${clean(c.description || "")}</p>
        <button onclick="editCommercial('${docSnap.id}')">Edit Video</button>
        <button onclick="deleteCommercial('${docSnap.id}')">Delete Video</button>
      </div>
    `;
  });

  let posts = "";
  vipSnap.forEach(docSnap=>{
    const p = docSnap.data();
    posts += `
      <div class="member-row">
        <strong>${clean(p.title)}</strong>
        <p>${clean(p.text || "")}</p>
        <button onclick="editVipPost('${docSnap.id}')">Edit Post</button>
        <button onclick="deleteVipPost('${docSnap.id}')">Delete Post</button>
      </div>
    `;
  });

  $("content").innerHTML = `
    <div class="hero">
      <p class="eyebrow">FOUNDER PANEL</p>
      <h1>Admin Dashboard</h1>
      <p>Create, edit, delete, and manage IcewearCraft members, drops, videos, and VIP posts.</p>
    </div>

    <div class="card">
      <h2>Members</h2>
      ${members || "<p>No members found.</p>"}
    </div>

    <div class="card">
      <h2>Add Drop</h2>
      <input id="dropTitle" placeholder="Drop title">
      <input id="dropPrice" placeholder="Price">
      <input id="dropImage" placeholder="Image URL">
      <textarea id="dropDesc" placeholder="Description"></textarea>
      <button onclick="addDrop()">Add Drop</button>
    </div>

    <div class="card">
      <h2>Manage Drops</h2>
      ${drops || "<p>No drops yet.</p>"}
    </div>

    <div class="card">
      <h2>Add Commercial</h2>
      <input id="commercialTitle" placeholder="Title">
      <input id="commercialUrl" placeholder="Video URL">
      <textarea id="commercialDesc" placeholder="Description"></textarea>
      <button onclick="addCommercial()">Add Commercial</button>
    </div>

    <div class="card">
      <h2>Manage Commercials</h2>
      ${commercials || "<p>No commercials yet.</p>"}
    </div>

    <div class="card">
      <h2>Add VIP Post</h2>
      <input id="vipTitle" placeholder="Title">
      <textarea id="vipText" placeholder="Message"></textarea>
      <button onclick="addVipPost()">Post</button>
    </div>

    <div class="card">
      <h2>Manage VIP Posts</h2>
      ${posts || "<p>No VIP posts yet.</p>"}
    </div>

    <button onclick="logout()">Logout</button>
  `;
}

window.addMemberPoints = async function(uid){
  const amount = Number(prompt("How many points?"));
  if(!amount) return;

  const ref = doc(db,"users",uid);
  const snap = await getDoc(ref);
  const oldPoints = snap.exists() ? Number(snap.data().points || 0) : 0;

  await setDoc(ref,{points: oldPoints + amount},{merge:true});
  alert("Points added.");
  renderAdmin();
};

window.editDrop = async function(id){
  const title = prompt("New drop title:");
  const price = prompt("New price:");
  const imageUrl = prompt("New image URL:");
  const description = prompt("New description:");

  await updateDoc(doc(db,"drops",id),{
    title,
    price,
    imageUrl,
    description
  });

  alert("Drop updated.");
  renderAdmin();
};

window.deleteDrop = async function(id){
  if(!confirm("Delete this drop?")) return;
  await deleteDoc(doc(db,"drops",id));
  alert("Drop deleted.");
  renderAdmin();
};

window.editCommercial = async function(id){
  const title = prompt("New commercial title:");
  const videoUrl = prompt("New video URL:");
  const description = prompt("New description:");

  await updateDoc(doc(db,"commercials",id),{
    title,
    videoUrl,
    description
  });

  alert("Commercial updated.");
  renderAdmin();
};

window.deleteCommercial = async function(id){
  if(!confirm("Delete this commercial?")) return;
  await deleteDoc(doc(db,"commercials",id));
  alert("Commercial deleted.");
  renderAdmin();
};

window.editVipPost = async function(id){
  const title = prompt("New post title:");
  const text = prompt("New message:");

  await updateDoc(doc(db,"vip_posts",id),{
    title,
    text
  });

  alert("VIP post updated.");
  renderAdmin();
};

window.deleteVipPost = async function(id){
  if(!confirm("Delete this VIP post?")) return;
  await deleteDoc(doc(db,"vip_posts",id));
  alert("VIP post deleted.");
  renderAdmin();
};
