console.log("IcewearCraft app loaded");

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

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

function getVideoEmbed(url) {
  if (!url) return "";

  const safeUrl = clean(url);

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    return `
      <div class="video-wrap">
        <iframe src="https://www.youtube.com/embed/${clean(videoId)}?rel=0&modestbranding=1" allowfullscreen></iframe>
      </div>
    `;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    return `
      <div class="video-wrap">
        <iframe src="https://www.youtube.com/embed/${clean(videoId)}?rel=0&modestbranding=1" allowfullscreen></iframe>
      </div>
    `;
  }

  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];
    return `
      <div class="video-wrap">
        <iframe src="https://player.vimeo.com/video/${clean(videoId)}" allowfullscreen></iframe>
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

  return `<a class="link-btn" href="${safeUrl}" target="_blank">Watch Commercial</a>`;
}

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

  return snap.data().role || "user";
}

async function signUp() {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password.");
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
    alert("Enter email and password.");
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

function updateAdminUI() {
  $("adminBtn").style.display = isAdmin() ? "inline-block" : "none";
}

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
        <p>Welcome to the IcewearCraft VIP app — private commercials, early drops, clothing previews, loyalty access, and community updates.</p>
        <div class="pill-row">
          <span>❄️ THCa VIP</span>
          <span>👕 Apparel Drops</span>
          <span>🎬 Commercials</span>
        </div>
      </div>

      ${isVipUser() ? `
        <div class="vip-membership-card">
          <img src="icon.png" class="vip-card-logo" alt="IcewearCraft">
          <p class="eyebrow">❄️ ICEWEARCRAFT VIP</p>
          <h2>VIP ACTIVE</h2>

          <div class="vip-card-row">
            <span>Member</span>
            <strong>${clean(currentUser.email)}</strong>
          </div>

          <div class="vip-card-row">
            <span>Status</span>
            <strong>Access Granted</strong>
          </div>

          <div class="vip-card-row">
            <span>Collection</span>
            <strong>Glacier #001</strong>
          </div>

          <div class="vip-card-row">
            <span>Tier</span>
            <strong>Glacier Black</strong>
          </div>

          <div class="vip-card-row">
            <span>Member ID</span>
            <strong>${clean(currentUser.uid.slice(0, 8).toUpperCase())}</strong>
          </div>

          <p class="vip-card-footer">Build Slow. Smoke Better.</p>
        </div>
      ` : `
        <div class="card">
          <h3>Current Status</h3>
          <p><strong>Your Role:</strong> ${clean(currentUser.role)}</p>
          <p>Your account is active, but VIP access has not been unlocked yet.</p>
          <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
        </div>
      `}
    `;
  }

  if (tab === "vip") await renderVipLounge();
  if (tab === "commercials") await renderCommercials();
  if (tab === "drops") await renderDrops();
  if (tab === "community") await renderCommunity();
  if (tab === "admin") await renderAdmin();
}

async function renderVipLounge() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 VIP Locked</h2>
        <p>VIP members only. DM “Menu” or contact IcewearCraft for access.</p>
        <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
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
    html += `<div class="card centered"><h3>No VIP posts yet</h3><p>Add your first VIP update from the Control Center.</p></div>`;
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

async function renderCommercials() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 Commercials Locked</h2>
        <p>Commercials are for VIP members only.</p>
        <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
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
    html += `<div class="card centered"><h3>No commercials yet</h3><p>Add a YouTube, Vimeo, or MP4 link from the Control Center.</p></div>`;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div class="vip-card commercial-card">
        <h3>${clean(data.title)}</h3>
        ${getVideoEmbed(data.videoUrl)}
        <p>${clean(data.description || "")}</p>

        ${isAdmin() ? `
          <button onclick="editCommercial('${docSnap.id}')">✏️ Edit Commercial</button>
          <button class="delete-btn" onclick="deleteCommercial('${docSnap.id}')">🗑 Delete Commercial</button>
        ` : ""}
      </div>
    `;
  });

  $("content").innerHTML = html;
}

async function renderDrops() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 Drops Locked</h2>
        <p>Early drop previews are for VIP members only.</p>
        <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
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
    html += `<div class="card centered"><h3>No drops yet</h3><p>Add apparel drops from the Control Center.</p></div>`;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div class="vip-card">
        ${data.imageUrl ? `<img src="${clean(data.imageUrl)}" class="drop-image" alt="${clean(data.title)}">` : ""}
        <h3>${clean(data.title)}</h3>
        <p>${clean(data.description)}</p>

        ${isAdmin() ? `
          <button onclick="editDrop('${docSnap.id}')">✏️ Edit Drop</button>
          <button onclick="deleteDrop('${docSnap.id}')">🗑 Delete Drop</button>
        ` : ""}

        <p><strong>Price:</strong> ${clean(data.price || "TBA")}</p>

        ${data.link ? `<a class="link-btn" href="${clean(data.link)}" target="_blank">❄️ Reserve Yours</a>` : ""}
      </div>
    `;
  });

  $("content").innerHTML = html;
}

async function renderCommunity() {
  if (!isVipUser()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>🔒 Community Locked</h2>
        <p>Community updates are for VIP members only.</p>
        <button onclick="requestVipAccess()">❄️ Request VIP Access</button>
      </div>
    `;
    return;
  }

  const q = query(collection(window.db, "community_posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let html = `
    <div class="section-title">
      <p class="eyebrow">Community</p>
      <h2>IcewearCraft Updates</h2>
      <p>Founder notes, VIP alerts, loyalty updates, and community announcements.</p>
    </div>
  `;

  if (snapshot.empty) {
    html += `<div class="card centered"><h3>No community posts yet</h3><p>Add your first community update from the Control Center.</p></div>`;
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

async function renderAdmin() {
  if (!isAdmin()) {
    $("content").innerHTML = `<div class="locked"><h2>Access Denied</h2><p>Admin only.</p></div>`;
    return;
  }

  const usersSnap = await getDocs(collection(window.db, "users"));
  const requestsSnap = await getDocs(query(collection(window.db, "vip_requests"), orderBy("createdAt", "desc")));

  let requestsHtml = "";
  requestsSnap.forEach((docSnap) => {
    const req = docSnap.data();
    requestsHtml += `
      <div class="admin-user">
        <p><strong>${clean(req.email)}</strong></p>
        <p>Status: ${clean(req.status || "pending")}</p>
        <div class="admin-actions">
          ${req.status !== "approved" ? `
            <button onclick="approveVipRequest('${docSnap.id}', '${req.uid}')">Approve VIP</button>
          ` : `<span style="color:green;font-weight:bold;">✅ Approved</span>`}
        </div>
      </div>
    `;
  });

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
        <h3>Create Community Post</h3>
        <input id="communityTitle" placeholder="Post Title" />
        <textarea id="communityText" placeholder="Community announcement"></textarea>
        <button onclick="createCommunityPost()">Publish Community Post</button>
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
      <h3>VIP Requests</h3>
      ${requestsHtml || "<p>No VIP requests yet.</p>"}
    </div>

    <div class="card">
      <h3>Users</h3>
      ${usersHtml || "<p>No users found.</p>"}
    </div>
  `;
}

async function requestVipAccess() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  await addDoc(collection(window.db, "vip_requests"), {
    uid: currentUser.uid,
    email: currentUser.email,
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("VIP access request sent.");
}

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

async function editVIPPost(id) {
  if (!isAdmin()) return;

  const newTitle = prompt("Edit VIP post title:");
  if (newTitle === null) return;

  const newText = prompt("Edit VIP post message:");
  if (newText === null) return;

  if (!newTitle.trim() || !newText.trim()) {
    alert("Title and message cannot be empty.");
    return;
  }

  await updateDoc(doc(window.db, "vip_posts", id), {
    title: newTitle.trim(),
    text: newText.trim()
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

async function editCommunityPost(id) {
  if (!isAdmin()) return;

  const newTitle = prompt("Edit community post title:");
  if (newTitle === null) return;

  const newText = prompt("Edit community post message:");
  if (newText === null) return;

  if (!newTitle.trim() || !newText.trim()) {
    alert("Title and message cannot be empty.");
    return;
  }

  await updateDoc(doc(window.db, "community_posts", id), {
    title: newTitle.trim(),
    text: newText.trim()
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

async function createCommercial() {
  if (!isAdmin()) return;

  const title = $("commercialTitle").value.trim();
  const videoUrl = $("commercialUrl").value.trim();
  const fileInput = $("commercialFile");
  const videoFile = fileInput ? fileInput.files[0] : null;
  const description = $("commercialDescription").value.trim();

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

async function editCommercial(id) {
  if (!isAdmin()) return;

  const newTitle = prompt("Edit commercial title:");
  if (newTitle === null) return;

  const newVideoUrl = prompt("Edit video URL:");
  if (newVideoUrl === null) return;

  const newDescription = prompt("Edit description:");
  if (newDescription === null) return;

  if (!newTitle.trim() || !newVideoUrl.trim()) {
    alert("Title and video link cannot be empty.");
    return;
  }

  await updateDoc(doc(window.db, "commercials", id), {
    title: newTitle.trim(),
    videoUrl: newVideoUrl.trim(),
    description: newDescription.trim()
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

async function editDrop(id) {
  if (!isAdmin()) return;

  const newTitle = prompt("Edit drop title:");
  if (newTitle === null) return;

  const newPrice = prompt("Edit drop price:");
  if (newPrice === null) return;

  const newImageUrl = prompt("Edit image URL:");
  if (newImageUrl === null) return;

  const newLink = prompt("Edit order link:");
  if (newLink === null) return;

  const newDescription = prompt("Edit drop description:");
  if (newDescription === null) return;

  await updateDoc(doc(window.db, "drops", id), {
    title: newTitle.trim(),
    price: newPrice.trim(),
    imageUrl: newImageUrl.trim(),
    link: newLink.trim(),
    description: newDescription.trim()
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

async function approveVipRequest(requestId, uid) {
  if (!isAdmin()) return;

  await setDoc(doc(window.db, "users", uid), {
    role: "vip"
  }, { merge: true });

  await updateDoc(doc(window.db, "vip_requests", requestId), {
    status: "approved"
  });

  alert("VIP request approved.");
  showTab("admin");
}

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

window.addEventListener("DOMContentLoaded", () => {
  $("loginBtn").addEventListener("click", login);
  $("signupBtn").addEventListener("click", signUp);
});

window.showTab = showTab;
window.logout = logout;
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

window.requestVipAccess = requestVipAccess;
window.approveVipRequest = approveVipRequest;
window.promoteToVIP = promoteToVIP;
window.makeAdmin = makeAdmin;
window.makeUser = makeUser;
