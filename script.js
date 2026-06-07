let currentUser = null;

const ADMIN_EMAIL = "icewearcraft@gmail.com";

/* -------------------------
   SIGN UP (FIREBASE)
------------------------- */
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(window.auth, email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      alert("Account created");
    })
    .catch(err => alert(err.message));
}

/* -------------------------
   LOGIN (FIREBASE)
------------------------- */
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(window.auth, email, password)
    .then(userCredential => {
      currentUser = userCredential.user;

      document.getElementById("auth").style.display = "none";
      document.getElementById("app").style.display = "block";

      document.getElementById("welcome").innerText =
        "Welcome " + currentUser.email;

      const adminBtn = document.getElementById("adminBtn");

      if (
        currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        adminBtn.style.display = "inline-block";
      } else {
        adminBtn.style.display = "none";
      }

      showTab("home");
    })
    .catch(err => alert(err.message));
}

/* -------------------------
   AUTO LOGIN
------------------------- */
onAuthStateChanged(window.auth, (user) => {
  if (user) {
    currentUser = user;

    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    document.getElementById("welcome").innerText =
      "Welcome " + user.email;

    const adminBtn = document.getElementById("adminBtn");

    if (
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) {
      adminBtn.style.display = "inline-block";
    } else {
      adminBtn.style.display = "none";
    }

    showTab("home");
  } else {
    currentUser = null;

    document.getElementById("auth").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
});

/* -------------------------
   LOGOUT
------------------------- */
function logout() {
  signOut(window.auth);
}

/* -------------------------
   TABS
------------------------- */
function showTab(tab) {
  const content = document.getElementById("content");

  if (!content) return;

  if (tab === "home") {
    content.innerHTML =
      "<h3>Home</h3><p>Welcome to IcewearCraft</p>";
  }

  if (tab === "vip") {
    const vip =
      JSON.parse(localStorage.getItem("vip_content")) || [];

    if (vip.length === 0) {
      content.innerHTML = "<p>No VIP content yet</p>";
      return;
    }

    content.innerHTML = vip.map(p => `
      <div class="vip-card">
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </div>
    `).join("");
  }

  if (tab === "community") {
    content.innerHTML =
      "<h3>Community</h3><p>Coming soon</p>";
  }

  if (tab === "admin") {
    if (
      !currentUser ||
      currentUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
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

/* -------------------------
   VIP POSTS (LOCAL FOR NOW)
------------------------- */
function createVIP() {
  const title = document.getElementById("vipTitle").value;
  const text = document.getElementById("vipText").value;

  if (!title || !text) {
    alert("Fill all fields");
    return;
  }

  let vip =
    JSON.parse(localStorage.getItem("vip_content")) || [];

  vip.push({ title, text });

  localStorage.setItem("vip_content", JSON.stringify(vip));

  alert("VIP post created");

  showTab("vip");
}
