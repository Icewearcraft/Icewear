console.log("IcewearCraft app loaded");

/* =========================
   FIREBASE IMPORTS
========================= */
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
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

/* =========================
   GLOBAL STATE
========================= */

let currentUser = null;

/* =========================
   SMALL HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function clean(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isVipUser() {
  return currentUser && (currentUser.role === "vip" || currentUser.role === "admin");
}

function isAdmin() {
  return currentUser && currentUser.role === "admin";
}

function showMessage(title, text) {
  $("content").innerHTML = `
    <div class="card centered">
      <h2>${clean(title)}</h2>
      <p>${clean(text)}</p>
    </div>
  `;
}

/* =========================
   VIDEO EMBED HELPER
========================= */

function getVideoEmbed(url) {
  if (!url) return "";

  const safeUrl = clean(url);

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];

    return `
      <div class="video-wrap">
        <iframe
        src="https://www.youtube.com/embed/${clean(videoId)}?rel=0&modestbranding=1"
          title="IcewearCraft Commercial"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];

    return `
      <div class="video-wrap">
        <iframe
         src="https://www.youtube.com/embed/${clean(videoId)}?rel=0&modestbranding=1"
          title="IcewearCraft Commercial"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];

    return `
      <div class="video-wrap">
        <iframe
          src="https://player.vimeo.com/video/${clean(videoId)}"
          title="IcewearCraft Commercial"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  if (url.endsWith(".mp4") || url.includes(".mp4?")) {
    return `
      <video class="video-player" controls playsinline>
        <source src="${safeUrl}" type="video/mp4">
      </video>
    `;
  }

  return `
    <a class="link-btn" href="${safeUrl}" target="_blank">
      Watch Commercial
    </a>
  `;
}

/* =========================
   USER PROFILE
========================= */

async function createUserProfile(user) {
  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      createdAt: serverTimestamp()
    });
  }
}

async function loadUserRole(user) {
  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      createdAt: serverTimestamp()
    });

    return "user";
  }

  const data = snap.data();
  return data.role || "user";
}

/* =========================
   AUTH
========================= */

async function signUp() {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
    await createUserProfile(userCredential.user);

    alert("Account created. You can now enter the Glacier.");
  } catch (err) {
    alert("SIGNUP ERROR: " + err.message);
  }
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(window.auth, email, password);

    currentUser = userCredential.user;

    await createUserProfile(currentUser);

    currentUser.role = await loadUserRole(currentUser);

    openApp();
  } catch (err) {
    alert("LOGIN ERROR: " + err.message);
  }
}

function openApp() {
  $("auth").style.display = "none";
  $("app").style.display = "block";

  $("welcome").innerText = `Welcome, ${currentUser.email}`;

  updateAdminUI();
  showTab("home");
}

async function logout() {
  await signOut(window.auth);

  currentUser = null;

  $("auth").style.display = "block";
  $("app").style.display = "none";
}

onAuthStateChanged(window.auth, async (user) => {
  if (!user) return;

  currentUser = user;

  await createUserProfile(currentUser);

  currentUser.role = await loadUserRole(currentUser);

  openApp();
});

/* =========================
   UI ROLE CONTROL
========================= */

function updateAdminUI() {
  if (isAdmin()) {
    $("adminBtn").style.display = "inline-block";
  } else {
    $("adminBtn").style.display = "none";
  }
}

/* =========================
   TABS
========================= */

async function showTab(tab) {
  if (!currentUser) {
    showMessage("Login Required", "Please log in first.");
    return;
  }

  if (tab === "home") {
    $("content").innerHTML = `
      <div class="hero-card">
        <p class="eyebrow">Glacier Access</p>
        <h1>Build slow. Smoke better.</h1>
        <p>
          Welcome to the IcewearCraft VIP app — private commercials, early drops,
          clothing previews, loyalty access, and community updates.
        </p>

        <div class="pill-row">
          <span>❄️ THCa VIP</span>
          <span>👕 Apparel Drops</span>
          <span>🎬 Commercials</span>
        </div>
      </div>

      <div class="card">
        <h3>Current Status</h3>
        <p><strong>Your Role:</strong> ${clean(currentUser.role)}</p>
        <p>
          ${isVipUser()
            ? "You have VIP access."
            : "Your account is active, but VIP access has not been unlocked yet."}
        </p>
      </div>
    `;
  }

  if (tab === "vip") {
    await renderVipLounge();
  }

  if (tab === "commercials") {
    await renderCommercials();
  }

  if (tab === "drops") {
    await renderDrops();
  }

  if (tab === "community") {
    $("content").innerHTML = `
      <div class="card centered">
        <h2>🌨 IcewearCraft Community</h2>
        <p>Coming soon: referrals, loyalty points, reviews, and VIP feedback.</p>
      </div>
    `;
  }

  if (tab === "admin") {
    await renderAdmin();
  }
}

/* =========================
   VIP LOUNGE
========================= */

async function renderVipLounge() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 VIP Locked</h2>
        <p>VIP members only. DM “Menu” or contact IcewearCraft for access.</p>
      </div>
    `;

    return;
  }

  const q = query(collection(window.db, "vip_posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let html = `
    <div class="section-title">
      <p class="eyebrow">VIP Lounge</p>
      <h2>Private Updates</h2>
    </div>
  `;

  if (snapshot.empty) {
    html += `
      <div class="card centered">
        <h3>No VIP posts yet</h3>
        <p>Add your first VIP update from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div class="vip-card">
        <h3>${clean(data.title)}</h3>
        <p>${clean(data.text)}</p>
      </div>
    `;
  });

  $("content").innerHTML = html;
}

/* =========================
   COMMERCIALS
========================= */

async function renderCommercials() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 Commercials Locked</h2>
        <p>Commercials are for VIP members only.</p>
      </div>
    `;

    return;
  }

  const q = query(collection(window.db, "commercials"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let html = `
    <div class="section-title">
      <p class="eyebrow">VIP Theater</p>
      <h2>IcewearCraft Commercials</h2>
      <p>Private visuals, drop trailers, and campaign previews.</p>
    </div>
  `;

  if (snapshot.empty) {
    html += `
      <div class="card centered">
        <h3>No commercials yet</h3>
        <p>Add a YouTube, Vimeo, or MP4 link from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div class="vip-card commercial-card">
        <h3>${clean(data.title)}</h3>
        ${getVideoEmbed(data.videoUrl)}
        <p>${clean(data.description || "")}</p>
        ${isAdmin() ? `

  <button onclick="deleteCommercial('${docSnap.id}')">

    🗑 Delete Commercial

  </button>

` : ""}
      </div>
    `;
  });

  $("content").innerHTML = html;
}

/* =========================
   CLOTHING / PRODUCT DROPS
========================= */

async function renderDrops() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 Drops Locked</h2>
        <p>Early drop previews are for VIP members only.</p>
      </div>
    `;

    return;
  }

  const q = query(collection(window.db, "drops"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let html = `
  <div class="featured-drop">
    <p class="eyebrow">❄️ GLACIER COLLECTION</p>
    <h2>Limited Release</h2>
    <p>VIP Access First</p>
    <p>Built Slow. Designed Cold.</p>
    <span>Available Now</span>
  </div>

  <div class="section-title">
    <p class="eyebrow">Glacier Collection</p>
    <h2>VIP Drop Preview</h2>
  </div>
`;

  if (snapshot.empty) {
    html += `
      <div class="card centered">
        <h3>No drops yet</h3>
        <p>Add apparel drops from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
  <div class="vip-card">

    ${data.imageUrl ? `
      <img
        src="${clean(data.imageUrl)}"
        class="drop-image"
        alt="${clean(data.title)}"
      >
    ` : ""}

    <h3>${clean(data.title)}</h3>

    <p>${clean(data.description)}</p>

    <p>
      <strong>Price:</strong>
      ${clean(data.price || "TBA")}
    </p>

  ${data.preorderlink ? `
  <a
    class="link-btn"
    href="${clean(data.preorderlink)}"
    target="_blank"
  >
    ❄️ Reserve Yours
  </a>
` : ""}
  </div>
`;
  });

  $("content").innerHTML = html;
}

/* =========================
   ADMIN PANEL
========================= */

async function renderAdmin() {
  if (!isAdmin()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>Access Denied</h2>
        <p>Admin only.</p>
      </div>
    `;

    return;
  }

  const usersSnap = await getDocs(collection(window.db, "users"));

  let usersHtml = "";

  usersSnap.forEach((docSnap) => {
    const user = docSnap.data();

    usersHtml += `
      <div class="admin-user">
        <p><strong>${clean(user.email)}</strong></p>
        <p>Role: ${clean(user.role || "user")}</p>

        <div class="admin-actions">
          <button onclick="promoteToVIP('${docSnap.id}')">Make VIP</button>
          <button onclick="makeAdmin('${docSnap.id}')">Make Admin</button>
          <button onclick="makeUser('${docSnap.id}')">Make User</button>
        </div>
      </div>
    `;
  });

  $("content").innerHTML = `
    <div class="section-title">
      <p class="eyebrow">Control Center</p>
      <h2>Admin Panel</h2>
    </div>

    <div class="admin-grid">
      <div class="card">
        <h3>Create VIP Post</h3>

        <input id="vipTitle" placeholder="Post Title" />
        <textarea id="vipText" placeholder="VIP message"></textarea>

        <button onclick="createVIPPost()">Post to VIP Lounge</button>
      </div>

      <div class="card">
        <h3>Add Commercial</h3>

        <input id="commercialTitle" placeholder="Commercial Title" />
<input id="commercialUrl" placeholder="YouTube, Vimeo, or MP4 Link" />
<input id="commercialFile" type="file" accept="video/mp4,video/*" />
<textarea id="commercialDescription" placeholder="Commercial description"></textarea>

        <button onclick="createCommercial()">Add Commercial</button>
      </div>

      <div class="card">
        <h3>Add Clothing Drop</h3>

        <input id="dropTitle" placeholder="Drop Name" />
        <input id="dropPrice" placeholder="Price, example: $45" />
       <input id="dropImage" placeholder="Product Image URL" />
        <input id="dropLink" placeholder="Order Link, optional" />
        <textarea id="dropDescription" placeholder="Drop description"></textarea>

        <button onclick="createDrop()">Add Drop</button>
      </div>
    </div>

    <div class="card">
      <h3>Users</h3>
      ${usersHtml || "<p>No users found.</p>"}
    </div>
  `;
}

/* =========================
   ADMIN CREATE FUNCTIONS
========================= */

async function createVIPPost() {
  if (!isAdmin()) return;

  const title = $("vipTitle").value.trim();
  const text = $("vipText").value.trim();

  if (!title || !text) {
    alert("Fill in the VIP title and message.");
    return;
  }

  await addDoc(collection(window.db, "vip_posts"), {
    title,
    text,
    createdAt: serverTimestamp()
  });

  alert("VIP post created.");
  showTab("vip");
}

async function createCommercial() {

  alert("1. Function started");

  if (!isAdmin()) return;

  const title = $("commercialTitle").value.trim();
  const videoUrl = $("commercialUrl").value.trim();
  const videoFile = $("commercialFile").files[0];
  const description = $("commercialDescription").value.trim();

  if (!title) {
    alert("Add a title.");
    return;
  }

  alert("2. Fields loaded");

  let finalVideoUrl = videoUrl;

  if (videoFile) {

    alert("3. Uploading file");

    const videoRef = ref(
      window.storage,
      `commercials/${Date.now()}-${videoFile.name}`
    );

    await uploadBytes(videoRef, videoFile);

    alert("4. Upload complete");

    finalVideoUrl = await getDownloadURL(videoRef);

    alert("5. URL created");
  }

  await addDoc(collection(window.db, "commercials"), {
    title,
    videoUrl: finalVideoUrl,
    description,
    createdAt: serverTimestamp()
  });

  alert("6. Saved to Firestore");

  showTab("commercials");
}

  
async function createDrop() {
  if (!isAdmin()) return;

 const title = $("dropTitle").value.trim();
const price = $("dropPrice").value.trim();
const imageUrl = $("dropImage").value.trim();
const link = $("dropLink").value.trim();
const description = $("dropDescription").value.trim();

  if (!title || !description) {
    alert("Add a drop name and description.");
    return;
  }

await addDoc(collection(window.db, "drops"), {
  title,
  price,
  imageUrl,
  link,
  description,
  createdAt: serverTimestamp()
});

  alert("Drop added.");
  showTab("drops");
}

/* =========================
   ADMIN ROLE FUNCTIONS
========================= */

async function promoteToVIP(uid) {
  if (!isAdmin()) return;

  await setDoc(doc(window.db, "users", uid), {
    role: "vip"
  }, { merge: true });

  alert("User is now VIP.");
  showTab("admin");
}

async function makeAdmin(uid) {
  if (!isAdmin()) return;

  await setDoc(doc(window.db, "users", uid), {
    role: "admin"
  }, { merge: true });

  alert("User is now Admin.");
  showTab("admin");
}

async function makeUser(uid) {
  if (!isAdmin()) return;

  await setDoc(doc(window.db, "users", uid), {
    role: "user"
  }, { merge: true });

  alert("User is now a regular user.");
  showTab("admin");
}

/* =========================
   BUTTON HOOKS
========================= */

window.addEventListener("DOMContentLoaded", () => {
  $("loginBtn").addEventListener("click", login);
  $("signupBtn").addEventListener("click", signUp);
});

/* =========================
   EXPOSE TO HTML BUTTONS
========================= */

window.showTab = showTab;
window.logout = logout;
window.createVIPPost = createVIPPost;
window.createCommercial = createCommercial;
window.createDrop = createDrop;
window.promoteToVIP = promoteToVIP;
window.makeAdmin = makeAdmin;
window.makeUser = makeUser;
