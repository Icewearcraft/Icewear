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

window.showScreen = function(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(btn => {
    btn.classList.remove("active");
  });

  const map = {
    home: "Home",
    wallet: "Wallet",
    commercials: "Videos",
    apparel: "Apparel",
    community: "VIP",
    admin: "Admin"
  };

  document.querySelectorAll(".bottom-nav button").forEach(btn => {
    if (btn.textContent.trim() === map[id]) {
      btn.classList.add("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
};

async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      points: 0,
      referralCode: "ICE-" + user.uid.slice(0, 5).toUpperCase(),
      createdAt: serverTimestamp()
    });
  }
}

window.signUp = async function() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(result.user);
  } catch (error) {
    alert(error.message);
  }
};

window.login = async function() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
};

window.logout = async function() {
  await signOut(auth);
};

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    currentRole = "user";

    document.getElementById("authScreen").style.display = "grid";
    document.getElementById("app").style.display = "none";
    return;
  }

  currentUser = user;
  await createUserProfile(user);

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const data = userSnap.data() || {};

  currentRole = data.role || "user";

  document.getElementById("authScreen").style.display = "none";
  document.getElementById("app").style.display = "block";

  const name = user.email.split("@")[0];

  document.getElementById("welcomeText").textContent = `Welcome, ${name}`;
  document.getElementById("walletEmail").textContent = user.email;
  document.getElementById("vipStatus").textContent =
    currentRole === "admin" ? "Founder" : currentRole.toUpperCase();

  document.getElementById("topRole").textContent =
    currentRole === "admin" ? "Founder Access" : `${currentRole.toUpperCase()} Access`;

  document.getElementById("refCode").textContent =
    data.referralCode || "ICE-" + user.uid.slice(0, 5).toUpperCase();

  document.getElementById("pointsText").textContent = data.points || 920;

  document.getElementById("adminNavBtn").style.display =
    currentRole === "admin" ? "block" : "none";

  loadCommercials();
  loadDrops();
  loadVipPosts();
});

window.addVipPost = async function() {
  const title = document.getElementById("postTitle").value.trim();
  const text = document.getElementById("postText").value.trim();

  if (!title || !text) {
    alert("Add a title and message.");
    return;
  }

  await addDoc(collection(db, "vip_posts"), {
    title,
    text,
    createdAt: serverTimestamp()
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postText").value = "";

  alert("VIP post added.");
  loadVipPosts();
};

window.addCommercial = async function() {
  const title = document.getElementById("commercialTitle").value.trim();
  const videoUrl = document.getElementById("commercialUrl").value.trim();
  const description = document.getElementById("commercialDesc").value.trim();

  if (!title || !videoUrl) {
    alert("Add a title and video URL.");
    return;
  }

  await addDoc(collection(db, "commercials"), {
    title,
    videoUrl,
    description,
    createdAt: serverTimestamp()
  });

  document.getElementById("commercialTitle").value = "";
  document.getElementById("commercialUrl").value = "";
  document.getElementById("commercialDesc").value = "";

  alert("Commercial added.");
  loadCommercials();
};

window.addDrop = async function() {
  const title = document.getElementById("dropTitle").value.trim();
  const price = document.getElementById("dropPrice").value.trim();
  const description = document.getElementById("dropDesc").value.trim();

  if (!title || !description) {
    alert("Add a title and description.");
    return;
  }

  await addDoc(collection(db, "drops"), {
    title,
    price,
    description,
    createdAt: serverTimestamp()
  });

  document.getElementById("dropTitle").value = "";
  document.getElementById("dropPrice").value = "";
  document.getElementById("dropDesc").value = "";

  alert("Drop added.");
  loadDrops();
};

async function loadCommercials() {
  const box = document.getElementById("commercialList");
  box.innerHTML = "";

  const q = query(collection(db, "commercials"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    box.innerHTML = `
      <div class="glass-card">
        <h2>Glacier Collection Trailer</h2>
        <p>Built Slow. Designed Cold.</p>
      </div>
    `;
    return;
  }

  snap.forEach(item => {
    const c = item.data();

    box.innerHTML += `
      <div class="glass-card">
        <p class="small-label">Commercial</p>
        <h2>${c.title || "Untitled Commercial"}</h2>
        <p>${c.description || ""}</p>
        <a class="video-link" href="${c.videoUrl}" target="_blank">Play Video</a>
      </div>
    `;
  });
}

async function loadDrops() {
  const box = document.getElementById("dropList");
  box.innerHTML = "";

  const q = query(collection(db, "drops"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    box.innerHTML = `
      <div class="glass-card">
        <p class="small-label">Upcoming</p>
        <h2>Glacier Collection</h2>
        <p>No public drops yet. VIP members will see new releases here first.</p>
      </div>
    `;
    return;
  }

  snap.forEach(item => {
    const d = item.data();

    box.innerHTML += `
      <div class="glass-card">
        <p class="small-label">${d.price || "VIP Price"}</p>
        <h2>${d.title || "Untitled Drop"}</h2>
        <p>${d.description || ""}</p>
      </div>
    `;
  });
}

async function loadVipPosts() {
  const box = document.getElementById("vipPostList");
  box.innerHTML = "";

  if (currentRole !== "vip" && currentRole !== "admin") {
    box.innerHTML = `
      <div class="glass-card">
        <p class="small-label">Locked</p>
        <h2>VIP Access Required</h2>
        <p>Upgrade to VIP to unlock exclusive updates, early drops, and private content.</p>
      </div>
    `;
    return;
  }

  const q = query(collection(db, "vip_posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    box.innerHTML = `
      <div class="glass-card">
        <p class="small-label">VIP Lounge</p>
        <h2>No posts yet</h2>
        <p>Your exclusive VIP updates will appear here.</p>
      </div>
    `;
    return;
  }

  snap.forEach(item => {
    const p = item.data();

    box.innerHTML += `
      <div class="glass-card">
        <p class="small-label">VIP Update</p>
        <h2>${p.title || "VIP Update"}</h2>
        <p>${p.text || ""}</p>
      </div>
    `;
  });
}
