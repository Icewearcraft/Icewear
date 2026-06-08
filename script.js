console.log("SCRIPT RUNNING");

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ========================
   GLOBAL STATE
======================== */
let currentUser = null;

/* ========================
   SAFETY CHECK
======================== */
if (!window.auth || !window.db) {
  console.error("Firebase not initialized. Check index.html script order.");
}

/* ========================
   CREATE USER PROFILE (NO DUPLICATES, NO OVERWRITES)
======================== */
async function createUserProfile(user) {
  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      createdAt: new Date()
    });
  }
}

/* ========================
   LOAD ROLE (SOURCE OF TRUTH)
======================== */
async function loadUserRole(user) {
  const userRef = doc(window.db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  console.log("🔥 UID:", user.uid);
  console.log("🔥 EXISTS:", userSnap.exists());

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      createdAt: new Date()
    });
    return "user";
  }

  const data = userSnap.data();

  console.log("🔥 ROLE FROM FIRESTORE:", data?.role);

  return data?.role || "user";
}

/* ========================
   ADMIN UI (ONLY CONTROL POINT)
======================== */
console.log("ADMIN TAB OPENED");
console.log("currentUser:", currentUser);

const userRef = doc(window.db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);

const roleFromDb = userSnap.data()?.role;

alert("ROLE FROM DB = " + roleFromDb);
alert("ROLE FROM MEMORY = " + currentUser?.role);

if (roleFromDb !== "admin") {
  content.innerHTML = "<h3>Access Denied</h3>";
  return;
}
/* ========================
   SIGN UP
======================== */
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(window.auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;

      await createUserProfile(user);

      alert("Account created");
    })
    .catch(err => alert(err.message));
}

/* ========================
   LOGIN
======================== */
alert("NEW CODE LOADED");
async function login() {
  try {
    console.log("LOGIN CLICKED");

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userCredential = await signInWithEmailAndPassword(
      window.auth,
      email,
      password
    );

    const user = userCredential.user;
    currentUser = user;

    await createUserProfile(user);

    
    currentUser.role = await loadUserRole(user);
alert("ROLE = " + currentUser.role);
    console.log("🔥 FINAL ROLE:", currentUser.role);

    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    document.getElementById("welcome").innerText =
      "Welcome " + user.email;

    updateAdminUI();
    showTab("home");

  } catch (err) {
    console.error(err);
    alert("LOGIN ERROR: " + err.message);
  }
}

/* ========================
   AUTO LOGIN
======================== */
onAuthStateChanged(window.auth, async (user) => {
  if (!user) return;

  currentUser = user;

  await createUserProfile(user);

  currentUser.role = await loadUserRole(user);

  console.log("🔥 AUTO ROLE:", currentUser.role);

  document.getElementById("auth").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("welcome").innerText =
    "Welcome " + user.email;

  updateAdminUI();
  showTab("home");
});

/* ========================
   LOGOUT
======================== */
function logout() {
  signOut(window.auth);

  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

/* ========================
   TABS
======================== */
async function showTab(tab) {
  const content = document.getElementById("content");

  if (tab === "home") {
    content.innerHTML = "<h3>Home</h3><p>Welcome to IcewearCraft</p>";
  }

  if (tab === "vip") {

    if (!currentUser) {
      content.innerHTML = "<p>Please log in</p>";
      return;
    }

    if (currentUser.role !== "admin" && currentUser.role !== "vip") {
      content.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <h2>🔒 VIP LOCKED</h2>
          <p>VIP members only</p>
        </div>
      `;
      return;
    }

    const q = query(collection(window.db, "vip_posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    let html = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      html += `
        <div class="vip-card">
          <h3>${data.title}</h3>
          <p>${data.text}</p>
        </div>
      `;
    });

    content.innerHTML = html;
  }

  if (tab === "community") {
    content.innerHTML = "<h3>Community</h3><p>Coming soon</p>";
  }

  if (tab === "admin") {

    if (!currentUser || currentUser.role !== "admin") {
      content.innerHTML = "<h3>Access Denied</h3>";
      return;
    }

    const q = collection(window.db, "users");
    const snapshot = await getDocs(q);

    let html = "<h3>Admin Panel</h3>";

    snapshot.forEach(docSnap => {
      const user = docSnap.data();

      html += `
        <div style="padding:10px; border:1px solid #ccc; margin-bottom:10px;">
          <p><b>${user.email}</b></p>
          <p>Role: ${user.role}</p>

          <button onclick="promoteToVIP('${docSnap.id}')">
            Promote to VIP
          </button>
        </div>
      `;
    });

    content.innerHTML = html;
  }
}

/* ========================
   VIP FUNCTIONS
======================== */
async function createVIP() {
  const title = document.getElementById("vipTitle").value;
  const text = document.getElementById("vipText").value;

  if (!title || !text) return alert("Fill in all fields");

  await addDoc(collection(window.db, "vip_posts"), {
    title,
    text,
    createdAt: new Date()
  });

  alert("VIP post created");
  showTab("vip");
}

async function promoteToVIP(uid) {
  if (!currentUser || currentUser.role !== "admin") return;

  await setDoc(doc(window.db, "users", uid), {
    role: "vip"
  }, { merge: true });

  alert("User promoted to VIP");
}

/* ========================
   BUTTON HOOKS
======================== */
window.login = login;
window.signUp = signUp;
window.logout = logout;
window.showTab = showTab;
window.createVIP = createVIP;
window.promoteToVIP = promoteToVIP;

window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  if (loginBtn) loginBtn.addEventListener("click", login);
  if (signupBtn) signupBtn.addEventListener("click", signUp);
});
