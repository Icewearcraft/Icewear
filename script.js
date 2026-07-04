console.log("IcewearCraft v3 loaded");

/* =========================
   FIREBASE IMPORTS
========================= */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
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
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   GLOBAL STATE
========================= */

let currentUser = null;

/* =========================
   HELPERS
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

function isAdmin() {
  return currentUser && currentUser.role === "admin";
}

function isVipUser() {
  return currentUser && (
    currentUser.role === "vip" ||
    currentUser.role === "admin"
  );
}

function updateAdminUI() {
  const adminBtn = $("adminBtn");
  const ordersBtn = $("ordersBtn");

  if (ordersBtn) {
    ordersBtn.style.display = isVipUser() ? "flex" : "none";
  }

  if (adminBtn) {
    adminBtn.style.display = isAdmin() ? "flex" : "none";
  }
}

function lockedScreen(title, message) {
  $("content").innerHTML = `
    <div class="locked">
      <h2>${clean(title)}</h2>
      <p>${clean(message)}</p>
      <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
    </div>
  `;
}

/* =========================
   USER SYSTEM
========================= */

async function createUserProfile(user) {
  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      points: 0,
      founderNumber: "",
      founderStatus: "",
      createdAt: serverTimestamp()
    });
  }
}

async function loadUserData(user) {
  await createUserProfile(user);

  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  currentUser = {
    uid: user.uid,
    email: user.email,
    role: "user",
    points: 0,
    founderNumber: "",
    founderStatus: "",
    ...(snap.exists() ? snap.data() : {})
  };
}

async function refreshCurrentUser() {
  const authUser = window.auth.currentUser;
  if (!authUser) return;

  const userRef = doc(window.db, "users", authUser.uid);
  const snap = await getDoc(userRef);

  currentUser = {
    uid: authUser.uid,
    email: authUser.email,
    role: "user",
    points: 0,
    founderNumber: "",
    founderStatus: "",
    ...(snap.exists() ? snap.data() : {})
  };
}


/* =========================
   FOUNDER SYSTEM
========================= */

async function assignFounderNumber() {
  if (!currentUser || !isVipUser()) return;

  const userRef = doc(window.db, "users", currentUser.uid);
  const counterRef = doc(window.db, "settings", "founderCounter");

  await runTransaction(window.db, async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (userSnap.exists() && userSnap.data().founderNumber) {
      return;
    }

    const counterSnap = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().lastNumber || 0) + 1;
    }

    const founderNumber = String(nextNumber).padStart(4, "0");

    transaction.set(counterRef, {
      lastNumber: nextNumber
    }, { merge: true });

    transaction.set(userRef, {
      founderNumber,
      founderStatus: currentUser.role === "admin"
        ? "Lifetime Founder"
        : "Founding Member"
    }, { merge: true });
  });
}

/* =========================
   AUTH
========================= */

async function signUp() {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password to request membership.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      window.auth,
      email,
      password
    );

    await loadUserData(userCredential.user);

    await addDoc(collection(window.db, "vip_requests"), {
      uid: userCredential.user.uid,
      email: email,
      status: "pending",
      type: "membership_request",
      createdAt: serverTimestamp()
    });

    alert("Membership request sent. IcewearCraft will review your access.");

    await signOut(window.auth);

    $("auth").style.display = "block";
    $("app").style.display = "none";

  } catch (err) {
    alert("REQUEST ERROR: " + err.message);
  }
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      window.auth,
      email,
      password
    );

    await loadUserData(userCredential.user);
    await openApp();
  } catch (err) {
    alert("LOGIN ERROR: " + err.message);
  }
}

async function logout() {
  await signOut(window.auth);

  currentUser = null;

  $("auth").style.display = "block";
  $("app").style.display = "none";
}

async function openApp() {
  $("auth").style.display = "none";
  $("app").style.display = "block";

  await refreshCurrentUser();

  if (isVipUser()) {
    try {
      await assignFounderNumber();
      await refreshCurrentUser();
    } catch (err) {
      console.error("Founder number error:", err);
    }
  }

$("welcome").innerText =
  `Welcome, ${currentUser?.email || window.auth.currentUser?.email || "Member"}`;

  updateAdminUI();

  await showTab("home");
}

/* =========================
   NAVIGATION
========================= */

async function showTab(tab) {

  try {

    switch (tab) {

      case "home":
  await renderHome();
  break;

      case "vip":
        await renderVipLounge();
        break;

      case "commercials":
        await renderCommercials();
        break;

      case "drops":
        await renderDrops();
        break;

      case "community":
        await renderCommunity();
        break;

      case "rewards":
        await renderRewards();
        break;

    case "orders":
  await renderOrders();
  break;

case "admin":
  await renderAdmin();
  break;

    }

  } catch (err) {
    alert("ERROR:\n\n" + err.message);
    console.error(err);
  }
}

/* =========================
   HOME
========================= */

async function renderHome() {
  await refreshCurrentUser();

  const usersSnap = await getDocs(collection(window.db, "users"));
  const memberCount = usersSnap.size;

  $("content").innerHTML = `
    <section class="home-v2">

      <div class="home-hero">
        <p class="eyebrow">ICEWEARCRAFT™</p>
        <h1>Current Temperature</h1>
        <div class="temperature">-12°</div>
        <p>Glacier Collection // 001 Active</p>
      </div>

      <div class="founder-counter-card">
        <p class="eyebrow">FOUNDING MEMBERS</p>

        <h2>${memberCount}/100 Claimed</h2>

        <div class="member-progress">
          <div style="width:${Math.min(memberCount,100)}%"></div>
        </div>

        <p>
          Early access is limited to the first 100 members.
        </p>
      </div>
<div class="drop-countdown-card">
  <p class="eyebrow">NEXT DROP</p>

  <h2>Glacier Collection // 001</h2>

  <div class="countdown-grid">
    <div>
      <strong id="dropDays">--</strong>
      <span>Days</span>
    </div>

    <div>
      <strong id="dropHours">--</strong>
      <span>Hours</span>
    </div>

    <div>
      <strong id="dropMinutes">--</strong>
      <span>Minutes</span>
    </div>
  </div>

  <p>Founding Members receive first access to every Glacier Collection release.</p>
</div>
      <div class="founder-pass">

        <div class="founder-pass-top">

          <div>
            <p>ICEWEARCRAFT™</p>
            <h2>FOUNDER PASS</h2>
          </div>

          <span>❄️</span>

        </div>

        <div class="founder-pass-number">
          #${clean(currentUser?.founderNumber || "----")}
        </div>

        <div class="founder-pass-row">
          <span>Status</span>
          <strong>${clean(currentUser?.founderStatus || "Member")}</strong>
        </div>

        <div class="founder-pass-row">
          <span>Role</span>
          <strong>${clean(currentUser?.role || "user")}</strong>
        </div>

        <div class="founder-pass-row">
          <span>XP</span>
          <strong>${clean(currentUser?.points || 0)}</strong>
        </div>

      </div>

      <div class="experience-card dark-card" onclick="showTab('commercials')">
        <p class="eyebrow">COMMERCIAL THEATER</p>
        <h2>Watch the Launch Film</h2>
        <p>Private visuals for Founding Members.</p>
        <button>▶ Enter Theater</button>
      </div>

      <div class="experience-card" onclick="showTab('drops')">
        <p class="eyebrow">FEATURED DROP</p>
        <h2>Midnight Frost Tee</h2>
        <p>Premium black tee. Cold By Design graphic. VIP release.</p>
        <button>❄ View Drop</button>
      </div>

    </section>
  `;
}
`;
startDropCountdown();
function startDropCountdown() {
  const dropDate = new Date("2026-08-01T12:00:00").getTime();

  function update() {
    const now = Date.now();
    const distance = dropDate - now;

    if (distance <= 0) return;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);

    if ($("dropDays")) $("dropDays").innerText = days;
    if ($("dropHours")) $("dropHours").innerText = hours;
    if ($("dropMinutes")) $("dropMinutes").innerText = minutes;
  }

  update();
  setInterval(update, 60000);
}

/* =========================
   VIDEO HELPER
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
   VIP LOUNGE
========================= */

async function renderVipLounge() {
  if (!isVipUser()) {
    lockedScreen(
      "🔒 VIP Locked",
      "VIP members only. DM “Menu” or contact IcewearCraft for access."
    );
    return;
  }

  const q = query(
    collection(window.db, "vip_posts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  let html = `
    <div class="section-title">
      <p class="eyebrow">VIP Lounge</p>
      <h2>Private Updates</h2>
      <p>Founder notes, private alerts, and exclusive IcewearCraft updates.</p>
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

        ${isAdmin() ? `
          <button onclick="editVIPPost('${docSnap.id}')">✏️ Edit Post</button>
          <button onclick="deleteVIPPost('${docSnap.id}')">🗑 Delete Post</button>
        ` : ""}
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
    lockedScreen(
      "🔒 Commercial Theater Locked",
      "Commercial Theater is for Founding Members only."
    );
    return;
  }

  const q = query(
    collection(window.db, "commercials"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  let html = `
    <section class="theater-page">

      <div class="theater-hero">
        <p class="eyebrow">COMMERCIAL THEATER</p>
        <h1>Private Screenings</h1>
        <p>Launch films, campaign previews, and IcewearCraft visuals for Founding Members.</p>
      </div>

      <div class="theater-list">
  `;

  if (snapshot.empty) {
    html += `
      <div class="theater-empty">
        <h3>No films loaded yet</h3>
        <p>Add your first commercial from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap, index) => {
    const data = docSnap.data();

    html += `
      <div class="theater-card">
        <div class="now-playing">
          ${index === 0 ? "NOW PLAYING" : "ICEWEARCRAFT FILM"}
        </div>

        <div class="theater-video">
          ${getVideoEmbed(data.videoUrl)}
        </div>

        <div class="theater-info">
          <p class="eyebrow">GLACIER VISUAL</p>
          <h2>${clean(data.title)}</h2>
          <p>${clean(data.description || "Private IcewearCraft commercial release.")}</p>

          ${isAdmin() ? `
            <div class="admin-actions">
              <button onclick="editCommercial('${docSnap.id}')">✏️ Edit Film</button>
              <button onclick="deleteCommercial('${docSnap.id}')">🗑 Delete Film</button>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </section>
  `;

  $("content").innerHTML = html;
}

/* =========================
   DROPS
========================= */

async function renderDrops() {
  if (!isVipUser()) {
    lockedScreen(
      "🔒 Drops Locked",
      "Early drop previews are for Founding Members only."
    );
    return;
  }

  const q = query(
    collection(window.db, "drops"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  let html = `
    <div class="drops-hero">
      <p class="eyebrow">GLACIER COLLECTION // 001</p>
      <h1>Member Drop Preview</h1>
      <p>Early access for Founding Members.</p>
    </div>

    <div class="drops-grid">
  `;

  if (snapshot.empty) {
    html += `
      <div class="drop-empty">
        <h3>No drops yet</h3>
        <p>Add your first Glacier Collection piece from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const orderLink =
      data.link ||
      data.preorderLink ||
      data.preorderlink ||
      "";

    html += `
      <div class="drop-card">

        ${
          data.imageUrl
            ? `
              <div class="drop-image-wrap">
                <img
                  src="${clean(data.imageUrl)}"
                  class="drop-image-large"
                  alt="${clean(data.title)}">
              </div>
            `
            : `
              <div class="drop-image-placeholder">
                ❄️
              </div>
            `
        }

        <div class="drop-info">
          <p class="drop-label">ICEWEARCRAFT™</p>

          <h2>${clean(data.title)}</h2>

          <p class="drop-description">
            ${clean(data.description)}
          </p>

          <div class="drop-meta">
            <span>Price</span>
            <strong>${clean(data.price || "TBA")}</strong>
          </div>

          ${
            orderLink
              ? `
               <button class="drop-reserve-btn" onclick="openReservation('${docSnap.id}', '${clean(data.title)}')">
  ❄️ Claim Founder Reservation
</button>
              `
              : `
                <button class="drop-reserve-btn">
                  ❄️ Coming Soon
                </button>
              `
          }

          ${
            isAdmin()
              ? `
                <div class="admin-actions">
                  <button onclick="editDrop('${docSnap.id}')">✏️ Edit Drop</button>
                  <button onclick="deleteDrop('${docSnap.id}')">🗑 Delete Drop</button>
                </div>
              `
              : ""
          }
        </div>

      </div>
    `;
  });

  html += `</div>`;

  $("content").innerHTML = html;
}

/* =========================
   COMMUNITY
========================= */

async function renderCommunity() {
  if (!isVipUser()) {
    lockedScreen(
      "🔒 Community Locked",
      "Community updates are for VIP members only."
    );
    return;
  }

  const q = query(
    collection(window.db, "community_posts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  let html = `
    <div class="section-title">
      <p class="eyebrow">Community</p>
      <h2>IcewearCraft Updates</h2>
      <p>Founder notes, VIP alerts, loyalty updates, and community announcements.</p>
    </div>
  `;

  if (snapshot.empty) {
    html += `
      <div class="card centered">
        <h3>No community posts yet</h3>
        <p>Add your first community update from the Control Center.</p>
      </div>
    `;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div class="vip-card">
        <h3>${clean(data.title)}</h3>
        <p>${clean(data.text)}</p>

        ${isAdmin() ? `
          <button onclick="editCommunityPost('${docSnap.id}')">✏️ Edit Post</button>
          <button onclick="deleteCommunityPost('${docSnap.id}')">🗑 Delete Post</button>
        ` : ""}
      </div>
    `;
  });

  $("content").innerHTML = html;
}

/* =========================
   REWARDS
========================= */
async function renderRewards() {
  if (!isVipUser()) {
    lockedScreen(
      "🔒 Rewards Locked",
      "Glacier Progress is for Founding Members only."
    );
    return;
  }

  await refreshCurrentUser();

  const points = Number(currentUser?.points || 0);

  let tier = "Ice Starter";
  let nextTier = "Frost Member";
  let nextGoal = 250;

  if (points >= 250) {
    tier = "Frost Member";
    nextTier = "Glacier Black";
    nextGoal = 500;
  }

  if (points >= 500) {
    tier = "Glacier Black";
    nextTier = "Diamond Founder";
    nextGoal = 1000;
  }

  if (points >= 1000) {
    tier = "Diamond Founder";
    nextTier = "Max Status";
    nextGoal = 1000;
  }

  const progress = Math.min((points / nextGoal) * 100, 100);
  const remaining = Math.max(nextGoal - points, 0);

  $("content").innerHTML = `
    <section class="glacier-progress">

      <div class="progress-hero">
        <p class="eyebrow">GLACIER STATUS</p>
        <h1>${tier}</h1>
        <p>Founder #${clean(currentUser?.founderNumber || "----")}</p>
      </div>

      <div class="status-card">
        <div class="status-top">
          <div>
            <span>Current XP</span>
            <h2>${points}</h2>
          </div>

          <div class="status-badge">
            ❄️ Verified Founder
          </div>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>

        <div class="status-row">
          <span>${tier}</span>
          <strong>${nextTier}</strong>
        </div>

        <p class="status-note">
          ${remaining > 0 ? `${remaining} XP until ${nextTier}.` : "Maximum Glacier status unlocked."}
        </p>
      </div>

      <div class="unlock-card">
        <h2>Founder Unlocks</h2>

        <div class="unlock-item active">
          <span>✓</span>
          <div>
            <h3>Founder Card</h3>
            <p>Verified Glacier identity.</p>
          </div>
        </div>

        <div class="unlock-item active">
          <span>✓</span>
          <div>
            <h3>Commercial Theater</h3>
            <p>Private campaign previews.</p>
          </div>
        </div>

        <div class="unlock-item ${points >= 250 ? "active" : ""}">
          <span>${points >= 250 ? "✓" : "□"}</span>
          <div>
            <h3>Early Drop Access</h3>
            <p>Unlocks at 250 XP.</p>
          </div>
        </div>

        <div class="unlock-item ${points >= 500 ? "active" : ""}">
          <span>${points >= 500 ? "✓" : "□"}</span>
          <div>
            <h3>Glacier Black</h3>
            <p>Unlocks at 500 XP.</p>
          </div>
        </div>

        <div class="unlock-item ${points >= 1000 ? "active" : ""}">
          <span>${points >= 1000 ? "✓" : "□"}</span>
          <div>
            <h3>Diamond Founder</h3>
            <p>Unlocks at 1000 XP.</p>
          </div>
        </div>
      </div>

    </section>
  `;
}

/* =========================
   VIP REQUESTS
========================= */

async function requestVipAccess(){

if(!currentUser){

alert("Please login first.");

return;

}

await addDoc(

collection(window.db,"vip_requests"),

{

uid:currentUser.uid,

email:currentUser.email,

status:"pending",

createdAt:serverTimestamp()

}

);

alert("VIP Request Sent.");

}

async function approveVipRequest(requestId,uid){

if(!isAdmin()) return;

await setDoc(

doc(window.db,"users",uid),

{

role:"vip"

},

{

merge:true

}

);

await updateDoc(

doc(window.db,"vip_requests",requestId),

{

status:"approved"

}

);

alert("VIP Approved");

showTab("admin");

}

async function renderOrders() {



  if (!isVipUser()) {
    lockedScreen("🔒 Orders Locked", "Only Founding Members can track orders.");
    return;
  }

  const q = query(collection(window.db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  function getStep(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("production")) return 2;
    if (s.includes("quality")) return 3;
    if (s.includes("ready") || s.includes("shipped")) return 4;
    return 1;
  }

  let html = `
    <section class="orders-page">
      <div class="orders-hero">
        <p class="eyebrow">GLACIER ORDERS</p>
        <h1>Product Journey</h1>
        <p>Track reservations, production, quality check, and delivery status.</p>
      </div>
  `;

  let found = false;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!isAdmin() && data.email !== currentUser.email) return;

    found = true;
    const step = getStep(data.status);

    html += `
      <div class="order-card">
        <div class="order-top">
          <div>
            <p class="eyebrow">RESERVED DROP</p>
            <h2>${clean(data.product)}</h2>
          </div>
          <span class="order-status">${clean(data.status || "Reserved")}</span>
        </div>

        <div class="order-details">
          <div><span>Customer</span><strong>${clean(data.email)}</strong></div>
          <div><span>Size</span><strong>${clean(data.size || "Not listed")}</strong></div>
          <div><span>ETA</span><strong>${clean(data.eta || "TBA")}</strong></div>
        </div>

        <div class="order-progress">
          <div class="order-step ${step >= 1 ? "active" : ""}"><span>❄</span><p>Reserved</p></div>
          <div class="order-line ${step >= 2 ? "active" : ""}"></div>
          <div class="order-step ${step >= 2 ? "active" : ""}"><span>🧵</span><p>Production</p></div>
          <div class="order-line ${step >= 3 ? "active" : ""}"></div>
          <div class="order-step ${step >= 3 ? "active" : ""}"><span>✅</span><p>Quality</p></div>
          <div class="order-line ${step >= 4 ? "active" : ""}"></div>
          <div class="order-step ${step >= 4 ? "active" : ""}"><span>📦</span><p>Ready</p></div>
        </div>

        ${isAdmin() ? `
          <div class="admin-actions">
            <button onclick="editOrderStatus('${docSnap.id}')">✏️ Update Status</button>
            <button onclick="deleteOrder('${docSnap.id}')">🗑 Delete Order</button>
          </div>
        ` : ""}
      </div>
    `;
  });

  if (!found) {
    html += `<div class="order-empty"><h3>No Orders Yet</h3><p>Your reserved Glacier Collection piece will appear here.</p></div>`;
  }

  html += `</section>`;
  $("content").innerHTML = html;
}

/* =========================
   ADMIN PANEL
========================= */

async function openReservation(dropId, productName) {
  if (!isVipUser()) {
    lockedScreen("🔒 VIP Required", "Only Founding Members can reserve Glacier Collection pieces.");
    return;
  }

  $("content").innerHTML = `
    <section class="reservation-page">

      <div class="reservation-hero">
        <p class="eyebrow">GLACIER COLLECTION // 001</p>
        <h1>Claim Founder Reservation</h1>
        <p>Founder #${clean(currentUser?.founderNumber || "----")}</p>
      </div>

      <div class="reservation-card">
        <div class="reservation-product">
          <div>
            <p class="eyebrow">RESERVING</p>
            <h2>${clean(productName)}</h2>
            <p>Cold by Design. VIP by Access.</p>
          </div>
          <span>❄️</span>
        </div>

        <input id="reserveSize" placeholder="Size, example: Large" />
        <input id="reserveColor" placeholder="Color, example: Black" />
        <input id="reserveName" placeholder="Full Name" />
        <input id="reserveAddress" placeholder="Shipping Address" />

        <div class="reservation-summary">
          <div>
            <span>Status</span>
            <strong>Preorder Received</strong>
          </div>
          <div>
            <span>ETA</span>
            <strong>4–5 weeks</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>Not collected yet</strong>
          </div>
        </div>

        <button class="drop-reserve-btn" onclick="submitReservation('${dropId}', '${clean(productName)}')">
          ❄️ Secure Founder Reservation
        </button>

        <button class="secondary-btn" onclick="showTab('drops')">
          Back to Drops
        </button>
      </div>

    </section>
  `;
}

       

async function submitReservation(dropId, productName) {
  const size = $("reserveSize").value.trim();
  const color = $("reserveColor").value.trim();
  const name = $("reserveName").value.trim();
  const address = $("reserveAddress").value.trim();

  if (!size || !color || !name || !address) {
    alert("Fill out all reservation details.");
    return;
  }

  await addDoc(collection(window.db, "orders"), {
    uid: currentUser.uid,
    email: currentUser.email,
    founderNumber: currentUser.founderNumber || "",
    product: productName,
    dropId,
    size,
    color,
    name,
    address,
    eta: "4–5 weeks",
    status: "Preorder Received",
    createdAt: serverTimestamp()
  });

  alert(`Founder #${currentUser.founderNumber || "----"} reservation secured.`);

  showTab("orders");
}

async function renderAdmin() {
  try {
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
    const requestsSnap = await getDocs(collection(window.db, "vip_requests"));
    const ordersSnap = await getDocs(collection(window.db, "orders"));

    $("content").innerHTML = `
      <div class="section-title">
        <p class="eyebrow">ICEWEARCRAFT™ CONTROL CENTER</p>
        <h2>Admin Dashboard</h2>
        <p>Manage the Glacier system from one place.</p>
      </div>

      <div class="admin-dashboard">

        <div class="admin-tile" onclick="showAdminPanel('members')">
          <span>👥</span>
          <h3>Members</h3>
          <p>${usersSnap.size} total users</p>
        </div>

        <div class="admin-tile" onclick="showAdminPanel('requests')">
          <span>📩</span>
          <h3>VIP Requests</h3>
          <p>${requestsSnap.size} applications</p>
        </div>

        <div class="admin-tile" onclick="showAdminPanel('dropsAdmin')">
          <span>👕</span>
          <h3>Drops</h3>
          <p>Add apparel releases</p>
        </div>

        <div class="admin-tile" onclick="showAdminPanel('media')">
          <span>🎬</span>
          <h3>Media</h3>
          <p>Upload commercials</p>
        </div>

        <div class="admin-tile" onclick="showAdminPanel('posts')">
          <span>❄️</span>
          <h3>VIP Posts</h3>
          <p>Private updates</p>
        </div>

        <div class="admin-tile" onclick="showAdminPanel('ordersAdmin')">
          <span>📦</span>
          <h3>Orders</h3>
          <p>${ordersSnap.size} total orders</p>
        </div>

      </div>

     <div id="adminPanel" class="admin-panel">
  <p class="admin-hint">Loading members...</p>
</div>
    `;
     await showAdminPanel("members");
  } catch (err) {
    alert("ADMIN ERROR: " + err.message);
    console.error(err);
  }
}

async function showAdminPanel(panel) {
  if (!isAdmin()) return;

  if (panel === "posts") {
    $("adminPanel").innerHTML = `
      <div class="card">
        <h3>❄️ Create VIP Post</h3>
        <input id="vipTitle" placeholder="Post Title" />
        <textarea id="vipText" placeholder="VIP message"></textarea>
        <button onclick="createVIPPost()">Post to VIP Lounge</button>
      </div>
    `;
  }

  if (panel === "media") {
    $("adminPanel").innerHTML = `
      <div class="card">
        <h3>🎬 Add Commercial</h3>
        <input id="commercialTitle" placeholder="Commercial Title" />
        <input id="commercialUrl" placeholder="YouTube, Vimeo, or MP4 Link" />
        <input id="commercialFile" type="file" accept="video/*" />
        <textarea id="commercialDescription" placeholder="Commercial description"></textarea>
        <button onclick="createCommercial()">Add Commercial</button>
      </div>
    `;
  }

  if (panel === "dropsAdmin") {
    $("adminPanel").innerHTML = `
      <div class="card">
        <h3>👕 Add Clothing Drop</h3>
        <input id="dropTitle" placeholder="Drop Name" />
        <input id="dropPrice" placeholder="Price, example: $45" />
        <input id="dropImage" placeholder="Product Image URL" />
        <input id="dropLink" placeholder="Order Link, optional" />
        <textarea id="dropDescription" placeholder="Drop description"></textarea>
        <button onclick="createDrop()">Add Drop</button>
      </div>
    `;
  }

  if (panel === "ordersAdmin") {
    $("adminPanel").innerHTML = `
      <div class="card">
        <h3>📦 Add Customer Order</h3>
        <input id="orderEmail" placeholder="Customer Email" />
        <input id="orderProduct" placeholder="Product Name" />
        <input id="orderSize" placeholder="Size, example: Large" />
        <input id="orderEta" placeholder="ETA, example: 4–5 weeks" />
        <select id="orderStatus">
          <option>Preorder Received</option>
          <option>Processing</option>
          <option>In Production</option>
          <option>Quality Check</option>
          <option>Ready / Shipped</option>
        </select>
        <button onclick="createOrder()">Add Order</button>
      </div>
    `;
  }

  if (panel === "requests") {
    const requestsSnap = await getDocs(
      query(collection(window.db, "vip_requests"), orderBy("createdAt", "desc"))
    );

    let html = `<div class="card"><h3>📩 VIP Requests</h3>`;

    requestsSnap.forEach((docSnap) => {
      const req = docSnap.data();
      html += `
        <div class="admin-user">
          <p><strong>${clean(req.email)}</strong></p>
          <p>Status: ${clean(req.status || "pending")}</p>
          ${req.status !== "approved" ? `
            <button onclick="approveVipRequest('${docSnap.id}', '${req.uid}')">Approve VIP</button>
          ` : `<p>✅ Approved</p>`}
        </div>
      `;
    });

    html += `</div>`;
    $("adminPanel").innerHTML = html;
  }

  if (panel === "members") {
    const usersSnap = await getDocs(collection(window.db, "users"));

    let html = `<div class="card"><h3>👥 Members & Rewards</h3>`;

    usersSnap.forEach((docSnap) => {
      const user = docSnap.data();
      html += `
        <div class="admin-user">
          <p><strong>${clean(user.email)}</strong></p>
          <p>Role: ${clean(user.role || "user")}</p>
          <p>Founder: #${clean(user.founderNumber || "Not assigned")}</p>
          <p>Points: ${clean(user.points || 0)}</p>
          <div class="admin-actions">
            <button onclick="promoteToVIP('${docSnap.id}')">Make VIP</button>
            <button onclick="makeAdmin('${docSnap.id}')">Make Admin</button>
            <button onclick="makeUser('${docSnap.id}')">Make User</button>
            <button onclick="addPoints('${docSnap.id}')">Add Points</button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    $("adminPanel").innerHTML = html;
  }
}

/* =========================
   CREATE ACTIONS
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

async function createCommunityPost() {
  if (!isAdmin()) return;

  const title = $("communityTitle").value.trim();
  const text = $("communityText").value.trim();

  if (!title || !text) {
    alert("Add a title and message.");
    return;
  }

  await addDoc(collection(window.db, "community_posts"), {
    title,
    text,
    createdAt: serverTimestamp()
  });

  alert("Community post created.");
  showTab("community");
}

async function createCommercial() {
  if (!isAdmin()) return;

  const title = $("commercialTitle").value.trim();
  const videoUrl = $("commercialUrl").value.trim();
  const description = $("commercialDescription").value.trim();
  const fileInput = $("commercialFile");
  const videoFile = fileInput ? fileInput.files[0] : null;

  if (!title) {
    alert("Add a title.");
    return;
  }

  if (!videoUrl && !videoFile) {
    alert("Add a video link or upload a video file.");
    return;
  }

  let finalVideoUrl = videoUrl;

  if (videoFile) {
    const videoRef = ref(window.storage, `commercials/${Date.now()}-${videoFile.name}`);
    await uploadBytes(videoRef, videoFile);
    finalVideoUrl = await getDownloadURL(videoRef);
  }

  await addDoc(collection(window.db, "commercials"), {
    title,
    videoUrl: finalVideoUrl,
    description,
    createdAt: serverTimestamp()
  });

  alert("Commercial added.");
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

async function createOrder() {
  if (!isAdmin()) return;

  const email = $("orderEmail").value.trim();
  const product = $("orderProduct").value.trim();
  const size = $("orderSize").value.trim();
  const eta = $("orderEta").value.trim();
  const status = $("orderStatus").value;

  if (!email || !product) {
    alert("Add customer email and product.");
    return;
  }

  await addDoc(collection(window.db, "orders"), {
    email,
    product,
    size,
    eta: eta || "4–5 weeks",
    status,
    createdAt: serverTimestamp()
  });

  alert("Order added.");
  showTab("orders");
}

/* =========================
   EDIT / DELETE ACTIONS
========================= */

async function editVIPPost(id) {
  if (!isAdmin()) return;

  const title = prompt("Edit VIP post title:");
  if (title === null) return;

  const text = prompt("Edit VIP post message:");
  if (text === null) return;

  await updateDoc(doc(window.db, "vip_posts", id), {
    title: title.trim(),
    text: text.trim()
  });

  alert("VIP post updated.");
  showTab("vip");
}

async function deleteVIPPost(id) {
  if (!isAdmin()) return;
  if (!confirm("Delete this VIP post?")) return;

  await deleteDoc(doc(window.db, "vip_posts", id));

  alert("VIP post deleted.");
  showTab("vip");
}

async function editCommunityPost(id) {
  if (!isAdmin()) return;

  const title = prompt("Edit community post title:");
  if (title === null) return;

  const text = prompt("Edit community post message:");
  if (text === null) return;

  await updateDoc(doc(window.db, "community_posts", id), {
    title: title.trim(),
    text: text.trim()
  });

  alert("Community post updated.");
  showTab("community");
}

async function deleteCommunityPost(id) {
  if (!isAdmin()) return;
  if (!confirm("Delete this community post?")) return;

  await deleteDoc(doc(window.db, "community_posts", id));

  alert("Community post deleted.");
  showTab("community");
}

async function editCommercial(id) {
  if (!isAdmin()) return;

  const title = prompt("Edit commercial title:");
  if (title === null) return;

  const videoUrl = prompt("Edit video URL:");
  if (videoUrl === null) return;

  const description = prompt("Edit description:");
  if (description === null) return;

  await updateDoc(doc(window.db, "commercials", id), {
    title: title.trim(),
    videoUrl: videoUrl.trim(),
    description: description.trim()
  });

  alert("Commercial updated.");
  showTab("commercials");
}

async function deleteCommercial(id) {
  if (!isAdmin()) return;
  if (!confirm("Delete this commercial?")) return;

  await deleteDoc(doc(window.db, "commercials", id));

  alert("Commercial deleted.");
  showTab("commercials");
}

async function editDrop(id) {
  if (!isAdmin()) return;

  const title = prompt("Edit drop title:");
  if (title === null) return;

  const price = prompt("Edit drop price:");
  if (price === null) return;

  const imageUrl = prompt("Edit image URL:");
  if (imageUrl === null) return;

  const link = prompt("Edit order link:");
  if (link === null) return;

  const description = prompt("Edit drop description:");
  if (description === null) return;

  await updateDoc(doc(window.db, "drops", id), {
    title: title.trim(),
    price: price.trim(),
    imageUrl: imageUrl.trim(),
    link: link.trim(),
    description: description.trim()
  });

  alert("Drop updated.");
  showTab("drops");
}

async function deleteDrop(id) {
  if (!isAdmin()) return;
  if (!confirm("Delete this drop?")) return;

  await deleteDoc(doc(window.db, "drops", id));

  alert("Drop deleted.");
  showTab("drops");
}

async function editOrderStatus(id) {
  if (!isAdmin()) return;

  const status = prompt(
    "Update status: Preorder Received, Processing, In Production, Quality Check, Ready / Shipped"
  );

  if (status === null) return;

  await updateDoc(doc(window.db, "orders", id), {
    status: status.trim()
  });

  alert("Order status updated.");
  showTab("orders");
}

async function deleteOrder(id) {
  if (!isAdmin()) return;
  if (!confirm("Delete this order?")) return;

  await deleteDoc(doc(window.db, "orders", id));

  alert("Order deleted.");
  showTab("orders");
}

/* =========================
   USER ROLE / POINT ACTIONS
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

async function addPoints(uid) {
  if (!isAdmin()) return;

  const amount = prompt("How many points do you want to add?");
  if (amount === null) return;

  const pointsToAdd = Number(amount);

  if (!pointsToAdd || pointsToAdd <= 0) {
    alert("Enter a valid point amount.");
    return;
  }

  const userRef = doc(window.db, "users", uid);
  const snap = await getDoc(userRef);
  const currentPoints = snap.exists() ? Number(snap.data().points || 0) : 0;

  await setDoc(userRef, {
    points: currentPoints + pointsToAdd
  }, { merge: true });

  alert(`${pointsToAdd} points added.`);
  showTab("admin");
}

/* =========================
   STARTUP / EXPORTS
========================= */

onAuthStateChanged(window.auth, async (user) => {
  if (!user) {
    $("auth").style.display = "block";
    $("app").style.display = "none";
    return;
  }

  try {
    await loadUserData(user);
    await openApp();
  } catch (err) {
    console.error("Auth state error:", err);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = $("loginBtn");
  const signupBtn = $("signupBtn");

  if (loginBtn) loginBtn.onclick = login;
  if (signupBtn) signupBtn.onclick = signUp;
});

window.login = login;
window.signUp = signUp;
window.logout = logout;
window.showTab = showTab;

window.requestVipAccess = requestVipAccess;
window.approveVipRequest = approveVipRequest;

window.createVIPPost = createVIPPost;
window.editVIPPost = editVIPPost;
window.deleteVIPPost = deleteVIPPost;

window.createCommercial = createCommercial;
window.editCommercial = editCommercial;
window.deleteCommercial = deleteCommercial;

window.createDrop = createDrop;
window.editDrop = editDrop;
window.deleteDrop = deleteDrop;

window.createCommunityPost = createCommunityPost;
window.editCommunityPost = editCommunityPost;
window.deleteCommunityPost = deleteCommunityPost;

window.addPoints = addPoints;
window.promoteToVIP = promoteToVIP;
window.makeAdmin = makeAdmin;
window.makeUser = makeUser;

window.createOrder = createOrder;
window.editOrderStatus = editOrderStatus;
window.deleteOrder = deleteOrder;
window.showAdminPanel = showAdminPanel;
window.openReservation = openReservation;
window.submitReservation = submitReservation;
