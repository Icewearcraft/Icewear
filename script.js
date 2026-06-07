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
   SIGN UP
======================== */
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(window.auth, email, password)
    .then(async (userCredential) => {
      currentUser = userCredential.user;

      // create Firestore user profile
      await setDoc(doc(window.db, "users", currentUser.uid), {
        email: currentUser.email,
        role: "user"
      });

      alert("Account created");
    })
    .catch(err => alert(err.message));
}

/* ========================
   LOGIN
======================== */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
    currentUser = userCredential.user;

    // load role from Firestore
    const userRef = doc(window.db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      currentUser.role = userSnap.data().role;
    } else {
      currentUser.role = "user";
    }

    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    document.getElementById("welcome").innerText =
      "Welcome " + currentUser.email;

    // admin control
    const adminBtn = document.getElementById("adminBtn");

    if (currentUser.role === "admin") {
      adminBtn.style.display = "inline-block";
    } else {
      adminBtn.style.display = "none";
    }

    showTab("home");
  } catch (err) {
    alert(err.message);
  }
}

/* ========================
   AUTO LOGIN
======================== */
onAuthStateChanged(window.auth, async (user) => {
  if (user) {
    currentUser = user;

    const userRef = doc(window.db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    currentUser.role = userSnap.exists()
      ? userSnap.data().role
      : "user";

    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    document.getElementById("welcome").innerText =
      "Welcome " + user.email;

    const adminBtn = document.getElementById("adminBtn");

    if (currentUser.role === "admin") {
      adminBtn.style.display = "inline-block";
    } else {
      adminBtn.style.display = "none";
    }

    showTab("home");
  }
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

  // Must be logged in
  if (!currentUser) {
    content.innerHTML = "<p>Please log in</p>";
    return;
  }

  const isAdmin = currentUser.role === "admin";
  const isVip = currentUser.role === "vip";

  // BLOCK ACCESS if not VIP or admin
  if (!isAdmin && !isVip) {
    content.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <h2>🔒 VIP ACCESS LOCKED</h2>
        <p>This section is for VIP members only.</p>
        <p>Contact admin to upgrade access.</p>
      </div>
    `;
    return;
  }

  try {
    const q = query(
      collection(window.db, "vip_posts"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      content.innerHTML = "<p>No VIP content yet</p>";
      return;
    }

    let html = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      html += `
        <div class="vip-card">
          <h3>${data.title}</h3>
          <p>${data.text}</p>
        </div>
      `;
    });

    content.innerHTML = html;

  } catch (err) {
    console.error(err);
    content.innerHTML = "<p>Error loading VIP content</p>";
  }
}

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

    content.innerHTML = `
      <h3>Admin Panel</h3>

      <input id="vipTitle" placeholder="VIP Title">

      <textarea id="vipText"
        style="width:100%; height:120px; margin-top:10px;"
        placeholder="VIP Content"></textarea>

      <button onclick="createVIP()">Post VIP</button>
    `;
  }
}

/* ========================
   CREATE VIP POST
======================== */
async function createVIP() {
  const title = document.getElementById("vipTitle").value;
  const text = document.getElementById("vipText").value;

  if (!title || !text) {
    alert("Fill in all fields");
    return;
  }

  await addDoc(collection(window.db, "vip_posts"), {
    title,
    text,
    createdAt: new Date()
  });

  alert("VIP post created");
  showTab("vip");
}

/* expose functions */
window.login = login;
window.signUp = signUp;
window.logout = logout;
window.showTab = showTab;
window.createVIP = createVIP;
