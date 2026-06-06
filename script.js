let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = null;

function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Fill in fields");
    return;
  }

  if (users.find(u => u.email === email)) {
    alert("User already exists");
    return;
  }

  users.push({ email, password });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created");
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  currentUser = users.find(u => u.email === email && u.password === password);

  if (!currentUser) {
    alert("Invalid login");
    return;
  }

  document.getElementById("auth").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("welcome").innerText = "Welcome " + currentUser.email;

  showTab("home");
}

function logout() {
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

function showTab(tab) {
  const content = document.getElementById("content");

  if (!content) return;

  if (tab === "home") {
    content.innerHTML = "<h3>Home</h3><p>Welcome to IcewearCraft</p>";
  }

  if (tab === "vip") {
    const vip = JSON.parse(localStorage.getItem("vip_content")) || [];

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
    content.innerHTML = "<h3>Community</h3><p>Coming soon</p>";
  }

  if (tab === "admin") {
    content.innerHTML = `
      <h3>Admin Panel</h3>

      <input id="vipTitle" placeholder="VIP Title">

      <textarea id="vipText" style="width:100%; height:120px; margin-top:10px;"
      placeholder="VIP Content"></textarea>

      <button onclick="createVIP()">Post VIP</button>
    `;
  }
}

function createVIP() {
  const title = document.getElementById("vipTitle").value;
  const text = document.getElementById("vipText").value;

  let vip = JSON.parse(localStorage.getItem("vip_content")) || [];

  vip.push({ title, text });

  localStorage.setItem("vip_content", JSON.stringify(vip));

  alert("VIP post created");

  showTab("vip");
}
