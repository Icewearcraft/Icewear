let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = null;

/* SIGN UP */
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (users.find(u => u.email === email)) {
    alert("User already exists");
    return;
  }

  users.push({
    email,
    password
  });

  localStorage.setItem("users", JSON.stringify(users));
  alert("Account created");
}

/* LOGIN */
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

  document.getElementById("welcome").innerText =
    "Welcome " + currentUser.email;

  showTab("home");
}

/* LOGOUT */
function logout() {
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

/* TAB SYSTEM */
function showTab(tab) {
  const content = document.getElementById("content");

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
    content.innerHTML = "<h3>Admin</h3><p>Next step will add posting system</p>";
  }
}
