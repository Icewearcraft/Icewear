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
serverTimestamp,
runTransaction
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
emailjs.init("q37KvJ2sLr9iibhX0");
let currentUser = null;
let currentRole = "user";
let currentData = {};

const $ = (id) => document.getElementById(id);

function clean(value) {
  return String(value || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function isAdmin() {
  return currentRole === "admin";
}

function isVip() {
  return currentRole === "vip" || currentRole === "admin";
}



async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      points: 0,
      founderNumber: "",
      founderStatus: "Member",
      createdAt: serverTimestamp()
    });
  }
}

async function refreshCurrentUser() {
  if (!currentUser) return;

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  currentData = snap.exists() ? snap.data() : {};
  currentRole = currentData.role || "user";

  if ($("adminBtn")) $("adminBtn").style.display = isAdmin() ? "block" : "none";

  if ($("memberStatus")) {
    $("memberStatus").innerText = isAdmin()
      ? "Glacier Black Admin"
      : isVip()
        ? "Founder Access"
        : "Member Access";
  }
}

async function openApp(user) {
  currentUser = user;
  await createUserProfile(user);
  await refreshCurrentUser();

  $("auth").style.display = "none";
  $("app").style.display = "block";

  await showTab("home");
}

function openAuth() {
  currentUser = null;
  currentRole = "user";
  currentData = {};

  $("auth").style.display = "flex";
  $("app").style.display = "none";
}

window.signUp = async function () {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) return alert("Enter email and password.");

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    await createUserProfile(result.user);

    await addDoc(collection(db, "vip_requests"), {
      uid: result.user.uid,
      email,
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("Account created. Membership request submitted.");
    await openApp(result.user);
  } catch (err) {
    alert("SIGNUP ERROR: " + err.message);
  }
};

window.login = async function () {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) return alert("Enter email and password.");

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await openApp(result.user);
  } catch (err) {
    alert("LOGIN ERROR: " + err.message);
  }
};

window.logout = async function () {
  await signOut(auth);
  openAuth();
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await openApp(user);
  } else {
    openAuth();
  }
});


window.showTab = async function(tab){

  await refreshCurrentUser();
updateCartCount();

  
  document.querySelectorAll(".nav button").forEach(btn=>{
    btn.classList.remove("active");
  });

  const btnMap = {
    home:"homeBtn",
    wallet:"walletBtn",
    commercials:"commercialsBtn",
    drops:"dropsBtn",
    product: "dropsBtn",
    cart: "cartBtn",
    checkout:"checkoutBtn",
    orders:"ordersBtn",
    vip:"vipBtn",
    admin:"adminBtn",
    policies: "policiesBtn",
  };

  if(btnMap[tab] && $(btnMap[tab])){
    $(btnMap[tab]).classList.add("active");
  }

  switch(tab){
    case "home":
      return renderHome();

    case "wallet":
      return renderWallet();

    case "commercials":
      return renderCommercials();

    case "drops":
      return renderDrops();

      case "cart":
  return renderCart();

    case "checkout":
      return renderCheckout();

      case "product":
  return renderProduct();

      case "orders":
  return renderMyOrders();

    case "vip":
      return renderVip();

    case "admin":
      return renderAdmin();

      case "policies":
    return renderPolicies();
  }

};

async function renderHome() {
  const usersSnap = await getDocs(collection(db, "users"));

  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">GLACIER COLLECTION // 001</p>
      <h1>Welcome, ${clean(currentUser.email.split("@")[0])}</h1>
      <p>The official IcewearCraft VIP app for commercials, apparel drops, rewards, and private updates.</p>
      <button onclick="showTab('drops')">View Apparel</button>
      <button class="secondary" onclick="showTab('commercials')">Watch Videos</button>
    </div>

    <div class="card glow">
      <p class="eyebrow">FOUNDING MEMBERS</p>
      <h2>${usersSnap.size}/100 Claimed</h2>
      <p>Founding Members receive priority access to Glacier Collection releases.</p>
    </div>

    <div class="card">
      <p class="eyebrow">FOUNDER PASS</p>
      <h2>#${clean(currentData.founderNumber || "----")}</h2>
      <p>Status: ${clean(currentData.founderStatus || currentRole)}</p>
      <p>Role: ${clean(currentRole)}</p>
      <p>XP: ${clean(currentData.points || 0)}</p>
    </div>

    <div class="grid">
      <div class="card">
        <h2>🎬 Commercial Theater</h2>
        <p>Private brand visuals, campaign videos, and launch films.</p>
        <button onclick="showTab('commercials')">Enter Theater</button>
      </div>

      <div class="card">
        <h2>👕 Apparel Drops</h2>
        <p>Premium IcewearCraft pieces built as conversation starters.</p>
        <button onclick="showTab('drops')">View Drops</button>
      </div>
    </div>
  `;
}

function renderWallet() {
  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">DIGITAL MEMBERSHIP CARD</p>
      <h1>Glacier Wallet</h1>
      <p>${clean(currentUser.email)}</p>
    </div>

    <div class="card glow">
      <p class="eyebrow">VIP LEVEL</p>
      <h2>${isAdmin() ? "Glacier Black" : isVip() ? "Founder" : "Member"}</h2>
      <p>Founder #${clean(currentData.founderNumber || "----")}</p>
    </div>

    <div class="grid">
      <div class="card">
        <h2>${clean(currentData.points || 0)}</h2>
        <p>Current XP</p>
      </div>

      <div class="card">
        <h2>ICE-${clean(currentData.founderNumber || "0000")}</h2>
        <p>Referral Code</p>
      </div>
    </div>
  `;
}

async function renderCommercials() {
  const snap = await getDocs(query(collection(db, "commercials"), orderBy("createdAt", "desc")));

  let html = `
    <div class="hero fade">
      <p class="eyebrow">COMMERCIAL THEATER</p>
      <h1>Brand Visuals</h1>
      <p>Private IcewearCraft commercials, campaign previews, and launch films.</p>
    </div>
  `;

  if (snap.empty) {
    html += `<div class="card"><h2>No videos yet</h2><p>Add your first commercial from Admin.</p></div>`;
  }

  snap.forEach((docSnap) => {
    const video = docSnap.data();

    html += `
      <div class="card">
        <p class="eyebrow">ICEWEARCRAFT FILM</p>
        <h2>${clean(video.title)}</h2>
        <p>${clean(video.description || "")}</p>
        ${getVideoEmbed(video.videoUrl)}
      </div>
    `;
  });

  $("content").innerHTML = html;
}

function getVideoEmbed(url) {
  if (!url) return "";

  const safeUrl = clean(url);

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    return `<iframe class="video-frame" src="https://www.youtube.com/embed/${clean(videoId)}" allowfullscreen></iframe>`;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    return `<iframe class="video-frame" src="https://www.youtube.com/embed/${clean(videoId)}" allowfullscreen></iframe>`;
  }

  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];
    return `<iframe class="video-frame" src="https://player.vimeo.com/video/${clean(videoId)}" allowfullscreen></iframe>`;
  }

  if (url.includes(".mp4")) {
    return `<video class="video-frame" controls playsinline><source src="${safeUrl}" type="video/mp4"></video>`;
  }

  return `<a class="btn" href="${safeUrl}" target="_blank">Watch Video</a>`;
}

async function renderDrops() {
  const snap = await getDocs(query(collection(db, "drops"), orderBy("createdAt", "desc")));

  let html = `
    <div class="hero fade">
      <p class="eyebrow">APPAREL DROPS</p>
      <h1>Cold By Design</h1>
      <p>Premium IcewearCraft apparel built as conversation pieces for the brand.</p>
    </div>
  `;

  if (snap.empty) {
    html += `<div class="card"><h2>No drops yet</h2><p>Add your first apparel release from Admin.</p></div>`;
  }

  
const products = [];

snap.forEach((docSnap) => {
    products.push({
        id: docSnap.id,
        ...docSnap.data()
    });
});

products.sort((a,b)=>Number(b.featured)-Number(a.featured));

products.forEach((drop)=>{
    
  html += `
    <div class="card drop-card">
      <p class="eyebrow">GLACIER COLLECTION</p>
      <h2>${clean(drop.title)}</h2>

      ${drop.imageUrl ? `
        <img class="drop-img" src="${clean(drop.imageUrl)}" alt="${clean(drop.title)}">
      ` : ""}

      <p>${clean(drop.description || "")}</p>

      <div class="price">${clean(drop.price || "TBA")}</div>

      <p>
        <b>Availability:</b>
        ${
          Number(drop.inventory || 0) > 0
            ? `${clean(drop.inventory)} remaining`
            : "Sold Out"
        }
      </p>

      ${
        Number(drop.inventory || 0) > 0 && drop.active !== false
          ? `
            <button onclick="viewProduct('${drop.id}')">
              View Product
            </button>
          `
          : `
            <button disabled>
              Sold Out
            </button>
          `
      }
    </div>
  `;
});
    
  $("content").innerHTML = html;
}

function renderCart() {
  const cart = getCart();

  let html = `
    <div class="hero fade">
      <p class="eyebrow">ICEWEARCRAFT CART</p>
      <h1>Your Cart</h1>
      <p>Review your selected Glacier Collection pieces.</p>
    </div>
  `;

  if (cart.length === 0) {
    html += `
      <div class="card">
        <h2>Your cart is empty</h2>
        <p>Add an IcewearCraft piece to continue.</p>

        <button onclick="showTab('drops')">
          Shop Apparel
        </button>
      </div>
    `;

    $("content").innerHTML = html;
    updateCartCount();
    return;
  }

  let subtotal = 0;

  cart.forEach((item) => {
    const numericPrice = Number(
      String(item.price || "0").replace(/[^0-9.]/g, "")
    );

    const quantity = Number(item.quantity || 1);
    const itemTotal = numericPrice * quantity;

    subtotal += itemTotal;

    html += `
      <div class="card drop-card">

        ${
          item.imageUrl
            ? `
              <img
                class="drop-img"
                src="${clean(item.imageUrl)}"
                alt="${clean(item.product)}"
              >
            `
            : ""
        }

        <h2>${clean(item.product || "IcewearCraft Product")}</h2>

       ${item.color && item.color !== "Default"
  ? `<p><b>Color:</b> ${clean(item.color)}</p>`
  : ""
}

<p><b>Size:</b> ${clean(item.size || "Not selected")}</p>
<p><b>Price:</b> ${clean(item.price || "TBA")}</p>
        <p><b>Quantity:</b> ${quantity}</p>
        <p><b>Item Total:</b> $${itemTotal.toFixed(2)}</p>

        <button onclick="changeCartQuantity('${item.cartId}', 1)">
          + Quantity
        </button>

        <button onclick="changeCartQuantity('${item.cartId}', -1)">
          − Quantity
        </button>

        <button onclick="checkoutCartItem('${item.cartId}')">
          Checkout This Item
        </button>

        <button
          class="danger"
          onclick="removeCartItem('${item.cartId}')"
        >
          Remove
        </button>

      </div>
    `;
  });

  html += `
    <div class="card glow">
      <p class="eyebrow">CART SUMMARY</p>
      <h2>Subtotal: $${subtotal.toFixed(2)}</h2>
      <p>Taxes and shipping are handled separately.</p>

      <button onclick="showTab('drops')">
        Continue Shopping
      </button>

      <button class="danger" onclick="clearCart()">
        Clear Cart
      </button>
    </div>
  `;

  $("content").innerHTML = html;
  updateCartCount();
}

async function renderVip() {
  if (!isVip()) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>VIP Locked</h2>
        <p>Founding Member access required.</p>
      </div>
    `;
    return;
  }

  const snap = await getDocs(query(collection(db, "vip_posts"), orderBy("createdAt", "desc")));

  let html = `
    <div class="hero fade">
      <p class="eyebrow">VIP LOUNGE</p>
      <h1>Private Updates</h1>
      <p>Founder notes, private alerts, and exclusive IcewearCraft updates.</p>
    </div>
  `;

  if (snap.empty) {
    html += `<div class="card"><h2>No VIP posts yet</h2><p>Private updates will appear here.</p></div>`;
  }

  snap.forEach((docSnap) => {
    const post = docSnap.data();

    html += `
      <div class="card">
        <p class="eyebrow">FOUNDER UPDATE</p>
        <h2>${clean(post.title)}</h2>
        <p>${clean(post.text || "")}</p>
      </div>
    `;
  });

  $("content").innerHTML = html;
}

async function renderProduct() {
  const product = JSON.parse(
    localStorage.getItem("selectedProduct")
  );

  if (!product) {
    $("content").innerHTML = `
      <div class="card">
        <h2>No Product Selected</h2>
        <p>Go back to Apparel and choose a product.</p>

        <button onclick="showTab('drops')">
          Back to Apparel
        </button>
      </div>
    `;
    return;
  }

  const availableColors = Object.entries(
    product.colors || {}
  ).filter(([, imageUrl]) => imageUrl);

  const gallery = Array.isArray(product.gallery)
    ? product.gallery.filter(Boolean)
    : [];

  const startingImage =
    product.imageUrl ||
    availableColors[0]?.[1] ||
    gallery[0] ||
    "";

  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">GLACIER COLLECTION // 001</p>

      <h1>${clean(product.title)}</h1>

      <p>
        ${clean(
          product.description ||
          "Premium IcewearCraft apparel built for Founding Members."
        )}
      </p>
    </div>

    <div class="card drop-card">

      ${
        startingImage
          ? `
            <img
              id="mainProductImage"
              class="drop-img"
              src="${clean(startingImage)}"
              alt="${clean(product.title)}"
            >
          `
          : ""
      }

      ${
        gallery.length > 0
          ? `
            <div class="gallery-row">
              ${gallery
                .map(
                  (imageUrl) => `
                    <img
                      class="gallery-thumb"
                      src="${clean(imageUrl)}"
                      alt="${clean(product.title)}"
                      onclick="changeProductImage('${clean(imageUrl)}')"
                    >
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }

      <h2>${clean(product.title)}</h2>

      <div class="price">
        ${clean(product.price || "TBA")}
      </div>

      <p><b>Fit:</b> Relaxed premium streetwear fit</p>
      <p><b>Material:</b> Heavyweight cotton feel</p>
      <p><b>Shipping:</b> Pre-order ships in 4–5 weeks</p>

     

${
  availableColors.length > 0
    ? `
        <label>Color</label>

        <select id="productColor">
          ${availableColors
            .map(
              ([color, imageUrl]) => `
                <option
                  value="${clean(color)}"
                  data-image="${clean(imageUrl)}"
                >
                  ${clean(color)}
                </option>
              `
            )
            .join("")}
        </select>
      `
    : ""
}

<label>Size</label>

<select id="productSize">
  ${
    product.sizes
      ? Object.entries(product.sizes)
          .map(([size, stock]) => {
            const quantity = Number(stock || 0);

            return `
              <option
                value="${clean(size)}"
                ${quantity <= 0 ? "disabled" : ""}
              >
                ${clean(size)}${quantity <= 0 ? " — Sold Out" : ""}
              </option>
            `;
          })
          .join("")
      : `
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        `
  }
</select>

     <label>Quantity</label>

<select id="productQty">
  <option value="1">1</option>
</select>

      <button onclick="addCurrentProductToCart()">
        Add to Cart
      </button>

      <button
        class="secondary"
        onclick="buyNowFromProduct()"
      >
        Buy Now
      </button>

      <button
        class="secondary"
        onclick="showTab('drops')"
      >
        Back to Apparel
      </button>
    </div>
  `;

const sizeSelect = $("productSize");
const quantitySelect = $("productQty");

function updateProductQuantityOptions() {
  if (!sizeSelect || !quantitySelect) return;

  const selectedSize = sizeSelect.value;

  const availableStock = product.sizes
    ? Number(product.sizes[selectedSize] || 0)
    : Number(product.inventory || 0);

  quantitySelect.innerHTML = "";

  if (availableStock <= 0) {
    quantitySelect.innerHTML = `
      <option value="0">
        Sold Out
      </option>
    `;

    quantitySelect.disabled = true;
    return;
  }

  quantitySelect.disabled = false;

  const maximumQuantity = Math.min(availableStock, 5);

  for (let quantity = 1; quantity <= maximumQuantity; quantity++) {
    const option = document.createElement("option");

    option.value = quantity;
    option.textContent = quantity;

    quantitySelect.appendChild(option);
  }
}

if (sizeSelect) {
  sizeSelect.addEventListener(
    "change",
    updateProductQuantityOptions
  );

  updateProductQuantityOptions();
}
 
  const colorSelect = $("productColor");

  if (colorSelect) {
    colorSelect.addEventListener("change", () => {
      const selectedOption =
        colorSelect.options[colorSelect.selectedIndex];

      const imageUrl =
        selectedOption.dataset.image || product.imageUrl || "";

      window.changeProductImage(imageUrl);
    });

    colorSelect.dispatchEvent(new Event("change"));
  }
}

window.changeProductImage = function (imageUrl) {
  const mainImage = $("mainProductImage");

  if (mainImage && imageUrl) {
    mainImage.src = imageUrl;
  }
};

window.viewProduct = async function (dropId) {
  const snap = await getDoc(doc(db, "drops", dropId));

  if (!snap.exists()) {
    alert("Product not found.");
    return;
  }

  const data = snap.data();

  localStorage.setItem("selectedProduct", JSON.stringify({
  dropId,
  title: data.title || "",
  price: data.price || "TBA",
  imageUrl: data.imageUrl || "",
  description: data.description || "",
   gallery: data.gallery || [],
colors: data.colors || {},
sizes: data.sizes || null,
inventory: Number(data.inventory || 0)
}));

  showTab("product");
};

window.buyNowFromProduct = function () {
  const product = JSON.parse(
    localStorage.getItem("selectedProduct")
  );

  if (!product) {
    alert("No product selected.");
    return;
  }

  const colorElement = $("productColor");
  const sizeElement = $("productSize");
  const quantityElement = $("productQty");

  if (!sizeElement || !quantityElement) {
    alert("Please select a size and quantity.");
    return;
  }

  const color = colorElement
    ? colorElement.value
    : "Default";

  const size = sizeElement.value;
  const quantity = Number(quantityElement.value || 0);

  if (!size) {
    alert("Please select an available size.");
    return;
  }

  const availableStock = product.sizes
    ? Number(product.sizes[size] || 0)
    : Number(product.inventory || 0);

  if (availableStock <= 0) {
    alert(`Size ${size} is sold out.`);
    return;
  }

  if (quantity < 1) {
    alert("Please select a valid quantity.");
    return;
  }

  if (quantity > availableStock) {
    alert(
      `Only ${availableStock} item(s) are available in size ${size}.`
    );
    return;
  }

  const selectedColorImage =
    product.colors?.[color] ||
    product.imageUrl ||
    "";

  localStorage.setItem(
    "checkout",
    JSON.stringify({
      dropId: product.dropId,
      product: product.title,
      price: product.price,
      imageUrl: selectedColorImage,
      email: currentUser.email,
      color,
      size,
      quantity
    })
  );

  showTab("checkout");
};


async function renderCheckout(){

  const order = JSON.parse(localStorage.getItem("checkout"));

const numericPrice = Number(
  String(order?.price || "0").replace(/[^0-9.]/g, "")
);

const checkoutQuantity = Number(order?.quantity || 1);
const checkoutTotal = numericPrice * checkoutQuantity;
 
  if(!order){
    $("content").innerHTML = `
      <div class="card">
        <h2>No Item Selected</h2>
        <p>Go back to Apparel and choose a drop.</p>
      </div>
    `;
    return;
  }

  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">CHECKOUT</p>
      <h1>${clean(order.product)}</h1>
      <p>Review your order before placing it.</p>
    </div>

  <div class="card">
  <h2>Order Summary</h2>

  <p><b>Product:</b> ${clean(order.product)}</p>
${order.color && order.color !== "Default"
  ? `<p><b>Color:</b> ${clean(order.color)}</p>`
  : ""
}
  <p><b>Price:</b> ${clean(order.price)}</p>
  <p><b>Email:</b> ${clean(order.email)}</p>

<p><b>Size:</b> ${clean(order.size || "Not selected")}</p>
<p><b>Quantity:</b> ${clean(order.quantity || 1)}</p>

<input
  type="hidden"
  id="orderSize"
  value="${clean(order.size || "")}"
>

<input
  type="hidden"
  id="orderQty"
  value="${clean(order.quantity || 1)}"
>

<label>Quantity</label>
<select id="orderQty">
  ${[1, 2, 3, 4, 5]
    .map(
      (qty) => `
        <option
          value="${qty}"
          ${Number(order.quantity || 1) === qty ? "selected" : ""}
        >
          ${qty}
        </option>
      `
    )
    .join("")}
</select>

  <hr>

  <label>Full Name</label>
<input id="shipName" placeholder="Full Name">

<label>Phone Number</label>
<input id="shipPhone" placeholder="Phone Number">

<label>Shipping Address</label>
<input id="shipAddress" placeholder="Street Address">

<label>City</label>
<input id="shipCity" placeholder="City">

<label>State</label>
<input id="shipState" placeholder="State">

<label>ZIP Code</label>
<input id="shipZip" placeholder="ZIP Code">

 <label class="terms-check">
  <input type="checkbox" id="agreeTerms">
  <span>
    I agree to the IcewearCraft Pre-Order Policy, Refund Policy,
    Shipping Policy, and Terms of Service.
  </span>
</label>

<div class="card">
  <p class="eyebrow">PAYMENT INFORMATION</p>

  <p>
    No payment is collected today.
    After your reservation is reviewed,
    IcewearCraft will send you a secure payment link.
  </p>
</div>

<button
  id="placeOrderBtn"
  onclick="placeOrder()"
>
  Reserve Pre-Order
</button>
</div>
  `;
}

function renderPolicies() {
  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">ICEWEARCRAFT</p>
      <h1>Policies</h1>
      <p>Pre-order, shipping, returns, and customer support.</p>
    </div>

    <div class="card">
      <h2>Pre-Orders</h2>
      <p>All IcewearCraft apparel is made to order. Production typically takes 3–5 weeks before shipment.</p>

      <h2>Refunds</h2>
      <p>Orders may only be canceled before production begins.</p>

      <h2>Contact</h2>
      <p>Email: icewearcraft@icloud.com</p>
    </div>
  `;
}

async function renderMyOrders() {
  if (!currentUser) {
    $("content").innerHTML = `
      <div class="locked">
        <h2>Login Required</h2>
        <p>Please login to view your orders.</p>
      </div>
    `;
    return;
  }

  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );

  let html = `
    <div class="hero fade">
      <p class="eyebrow">MY ORDERS</p>
      <h1>Order History</h1>
      <p>Track your IcewearCraft pre-orders and reservations.</p>
    </div>
  `;

  let found = false;

  snap.forEach((docSnap) => {
    const o = docSnap.data();

    if (o.uid !== currentUser.uid && o.email !== currentUser.email) return;

    found = true;

    html += `
      <div class="card">
        <p class="eyebrow">GLACIER ORDER</p>
        <p>
  <b>Order Number:</b>
  ${clean(o.orderNumber || o.orderId || "Pending")}
</p>
        <h2>${clean(o.product || "Order")}</h2>
        <p><b>Color:</b> ${clean(o.color || "Default")}</p>
        <p><b>Price Each:</b> ${clean(o.price || "TBA")}</p>
<p>
  <b>Order Total:</b>
  $${Number(
    o.orderTotal ||
    Number(String(o.price || "0").replace(/[^0-9.]/g, "")) *
    Number(o.quantity || 1)
  ).toFixed(2)}
</p>
<p><b>Size:</b> ${clean(o.size || "Not selected")}</p>
        <p><b>Quantity:</b> ${clean(o.quantity || 1)}</p>
        <p><b>Status:</b> ${clean(o.status || "Reserved")}</p>
        <p>
  <b>Payment:</b>
  ${clean(o.paymentStatus || "Not Paid")}
</p>

${

  o.paymentLink &&

  o.paymentStatus !== "Paid" &&

  o.paymentStatus !== "Refunded"

    ? `

      <button

        onclick="openPaymentLink('${clean(o.paymentLink)}')"

      >

        Pay Securely

      </button>

      <p>

        You will be redirected to a secure payment page.

      </p>

    `

    : ""

        <p><b>ETA:</b> ${clean(o.eta || "4–5 Weeks")}</p>
      
        <p><b>Carrier:</b> ${clean(o.carrier || "Not shipped yet")}</p>
        <p><b>Tracking:</b> ${clean(o.trackingNumber || "Not added yet")}</p>

${o.trackingNumber ? `
<button onclick="trackPackage('${clean(o.carrier || "")}', '${clean(o.trackingNumber)}')">
Track Package
</button>
` : ""}

</div>
    `;
  });

  if (!found) {
    html += `
      <div class="card">
        <h2>No Orders Yet</h2>
        <p>Your IcewearCraft pre-orders will appear here after checkout.</p>
        <button onclick="showTab('drops')">Shop Apparel</button>
      </div>
    `;
  }

  $("content").innerHTML = html;
}

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

  const usersSnap = await getDocs(collection(db, "users"));
  const dropsSnap = await getDocs(query(collection(db, "drops"), orderBy("createdAt", "desc")));
  const commercialsSnap = await getDocs(query(collection(db, "commercials"), orderBy("createdAt", "desc")));
  const vipSnap = await getDocs(query(collection(db, "vip_posts"), orderBy("createdAt", "desc")));
  const ordersSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));

  let totalRevenue = 0;
let reservedCount = 0;
let packedCount = 0;
let shippedCount = 0;
let deliveredCount = 0;

ordersSnap.forEach((docSnap) => {
  const o = docSnap.data();
  const priceNumber = Number(String(o.price || "0").replace(/[^0-9.]/g, ""));
  const qtyNumber = Number(o.quantity || 1);

  totalRevenue += priceNumber * qtyNumber;

  const status = String(o.status || "Reserved").toLowerCase();

  if (status.includes("reserved") || status.includes("preorder")) reservedCount++;
  if (status.includes("packed")) packedCount++;
  if (status.includes("shipped")) shippedCount++;
  if (status.includes("delivered")) deliveredCount++;
});
  
  let members = "";
  usersSnap.forEach((docSnap) => {
    const u = docSnap.data();

    members += `
      <div class="member-row">
        <strong>${clean(u.email)}</strong>
        <p>Role: ${clean(u.role || "user")}</p>
        <p>Founder: #${clean(u.founderNumber || "----")}</p>
        <p>Points: ${clean(u.points || 0)}</p>
        <button onclick="setRole('${docSnap.id}', 'vip')">Make VIP</button>
        <button onclick="setRole('${docSnap.id}', 'admin')">Make Admin</button>
        <button onclick="setRole('${docSnap.id}', 'user')">Make User</button>
        <button onclick="addMemberPoints('${docSnap.id}')">Add Points</button>
      </div>
    `;
  });

  let drops = "";

dropsSnap.forEach((docSnap) => {
  const d = docSnap.data();

  drops += `
    <div class="member-row">
      <strong>${clean(d.title || "Product")}</strong>

      <p><b>Price:</b> ${clean(d.price || "TBA")}</p>
      <p>${clean(d.description || "")}</p>

      <div class="size-inventory">
        <h3>Inventory by Size</h3>

        ${
          d.sizes
            ? Object.entries(d.sizes)
                .map(
                  ([size, stock]) => `
                    <p><b>${clean(size)}:</b> ${clean(stock)}</p>
                  `
                )
                .join("")
            : `
                <p><b>Total Inventory:</b> ${clean(d.inventory || 0)}</p>
              `
        }
      </div>

      <p><b>Total Inventory:</b> ${clean(d.inventory || 0)}</p>

      <p>
        <b>Status:</b>
        ${
          d.active === false
            ? "Inactive"
            : Number(d.inventory || 0) <= 0
              ? "Sold Out"
              : "Active"
        }
      </p>

      <button onclick="editDrop('${docSnap.id}')">
        ✏️ Edit
      </button>

      <button onclick="toggleFeatured('${docSnap.id}', ${!d.featured})">
        ${d.featured ? "⭐ Featured" : "☆ Feature"}
      </button>

     

      <button onclick="toggleActive('${docSnap.id}', ${!d.active})">
        ${d.active === false ? "Activate" : "Deactivate"}
      </button>

      <button
        class="danger"
        onclick="deleteDrop('${docSnap.id}')"
      >
        Delete
      </button>
    </div>
  `;
});

  let commercials = "";
  commercialsSnap.forEach((docSnap) => {
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

  let vipPosts = "";
  vipSnap.forEach((docSnap) => {
    const p = docSnap.data();

    vipPosts += `
      <div class="member-row">
        <strong>${clean(p.title)}</strong>
        <p>${clean(p.text || "")}</p>
        <button onclick="editVipPost('${docSnap.id}')">Edit Post</button>
        <button onclick="deleteVipPost('${docSnap.id}')">Delete Post</button>
      </div>
    `;
  });

  let orders = "";
  ordersSnap.forEach((docSnap) => {
    const o = docSnap.data();

orders += `
  <div class="member-row order-card">
    <p class="eyebrow">ORDER</p>
    <p>
  <b>Order Number:</b>
  ${clean(o.orderNumber || o.orderId || "Pending")}
</p>
    <h2>${clean(o.product || "Order")}</h2>
    <p><b>Color:</b> ${clean(o.color || "Default")}</p>

    <p><b>Customer:</b> ${clean(o.shipName || "Not provided")}</p>
    <p><b>Email:</b> ${clean(o.email || "")}</p>
    <p><b>Phone:</b> ${clean(o.shipPhone || "Not provided")}</p>

    <p><b>Ship To:</b><br>
      ${clean(o.shipAddress || "")}<br>
      ${clean(o.shipCity || "")}, ${clean(o.shipState || "")} ${clean(o.shipZip || "")}
    </p>

    <p><b>Size:</b> ${clean(o.size || "N/A")}</p>
    <p><b>Quantity:</b> ${clean(o.quantity || 1)}</p>
    <p>
  <b>Order Total:</b>
  $${Number(
    o.orderTotal ||
    Number(String(o.price || "0").replace(/[^0-9.]/g, "")) *
    Number(o.quantity || 1)
  ).toFixed(2)}
</p>
    <p><b>Status:</b> ${clean(o.status || "Reserved")}</p>
    <p>
  <b>Payment:</b>
  ${clean(o.paymentStatus || "Not Paid")}
</p>
<p>
  <b>Payment Link:</b>
  ${
    o.paymentLink
      ? `<a href="${clean(o.paymentLink)}" target="_blank">Open Link</a>`
      : "Not added yet"
  }
</p>

<button
  onclick="addPaymentLink('${docSnap.id}')"
>
  Add Payment Link
</button>
    <p><b>ETA:</b> ${clean(o.eta || "4–5 Weeks")}</p>
    <p><b>Tracking:</b> ${clean(o.trackingNumber || "Not added yet")}</p>

    <button onclick="updateOrderStatus('${docSnap.id}', 'Reserved')">Reserved</button>
    <button onclick="updateOrderStatus('${docSnap.id}', 'Packed')">Packed</button>
    <button onclick="updateOrderStatus('${docSnap.id}', 'Shipped')">Shipped</button>
    <button onclick="updateOrderStatus('${docSnap.id}', 'Delivered')">Delivered</button>

    <button onclick="addTracking('${docSnap.id}')">Add Tracking</button>
    <button class="danger" onclick="deleteOrder('${docSnap.id}')">Delete Order</button>
  </div>
`;
  });

  $("content").innerHTML = `
    <div class="hero fade">
      <p class="eyebrow">FOUNDER PANEL</p>
      <h1>Admin Dashboard</h1>
      <p>Manage members, apparel, commercials, VIP posts, and orders.</p>
    </div>

   <div class="card"><h2>${usersSnap.size}</h2><p>Total Members</p></div>
<div class="card"><h2>${dropsSnap.size}</h2><p>Apparel Drops</p></div>
<div class="card"><h2>${commercialsSnap.size}</h2><p>Commercials</p></div>
<div class="card glow"><h2>${ordersSnap.size}</h2><p>Total Orders</p></div>

<div class="card"><h2>$${totalRevenue.toFixed(2)}</h2><p>Projected Revenue</p></div>
<div class="card"><h2>${reservedCount}</h2><p>Reserved</p></div>
<div class="card"><h2>${packedCount}</h2><p>Packed</p></div>
<div class="card"><h2>${shippedCount}</h2><p>Shipped</p></div>
<div class="card"><h2>${deliveredCount}</h2><p>Delivered</p></div>

   

    <div class="card"><h2>Manage Drops</h2>${drops || "<p>No drops yet.</p>"}</div>

    <div class="card">
      <h2>Add Commercial</h2>
      <input id="commercialTitle" placeholder="Title">
      <input id="commercialUrl" placeholder="Video URL">
      <textarea id="commercialDesc" placeholder="Description"></textarea>
      <button onclick="addCommercial()">Add Commercial</button>
    </div>

    <div class="card"><h2>Manage Commercials</h2>${commercials || "<p>No commercials yet.</p>"}</div>

    <div class="card">
      <h2>Add VIP Post</h2>
      <input id="vipTitle" placeholder="Title">
      <textarea id="vipText" placeholder="Message"></textarea>
      <button onclick="addVipPost()">Post</button>
    </div>

    <div class="card"><h2>Manage VIP Posts</h2>${vipPosts || "<p>No VIP posts yet.</p>"}</div>
    <div class="card"><h2>Members</h2>${members || "<p>No members found.</p>"}</div>
    <div class="card"><h2>Orders</h2>${orders || "<p>No orders yet.</p>"}</div>
    <div class="card"><button onclick="logout()">Logout</button></div>

    <div class="card">

<h2>New Product</h2>

<input id="dropTitle" placeholder="Product Name">

<input id="dropPrice" placeholder="$ Price">

<input id="dropImage" placeholder="Image URL">
<label>Available Colors</label>

<h3>Gallery</h3>

<input id="imgFront" placeholder="Front Image URL">

<input id="imgBack" placeholder="Back Image URL">

<input id="imgModel" placeholder="Model Image URL">

<input id="imgDetail" placeholder="Detail Image URL">

<input id="colorBlack" placeholder="Black Image URL">

<input id="colorWhite" placeholder="White Image URL">

<input id="colorGrey" placeholder="Ice Grey Image URL">

<input id="colorPurple" placeholder="Glacier Purple Image URL">
<h3>Inventory by Size</h3>

<input id="invXS" type="number" min="0" placeholder="XS Inventory">
<input id="invS" type="number" min="0" placeholder="S Inventory">
<input id="invM" type="number" min="0" placeholder="M Inventory">
<input id="invL" type="number" min="0" placeholder="L Inventory">
<input id="invXL" type="number" min="0" placeholder="XL Inventory">
<input id="invXXL" type="number" min="0" placeholder="XXL Inventory">

<select id="dropCategory">
  <option>Shirts</option>
  <option>Outerwear</option>
  <option>Accessories</option>
</select>

<select id="dropCollection">
  <option>Glacier Collection</option>
  <option>Founders Collection</option>
  <option>Limited Drop</option>
</select>

<textarea
id="dropDesc"
placeholder="Product Description">
</textarea>

<button onclick="addDrop()">
Publish Product
</button>

</div>
  `;
}

window.setRole = async function (uid, role) {
  await setDoc(doc(db, "users", uid), { role }, { merge: true });
  alert("Role updated.");
  await renderAdmin();
};

window.addMemberPoints = async function (uid) {
  const amount = Number(prompt("How many points?"));
  if (!amount) return;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const oldPoints = snap.exists() ? Number(snap.data().points || 0) : 0;

  await setDoc(ref, { points: oldPoints + amount }, { merge: true });

  alert("Points added.");
  await renderAdmin();
};

window.addDrop = async function () {
  const sizes = {
    XS: Number($("invXS").value || 0),
    S: Number($("invS").value || 0),
    M: Number($("invM").value || 0),
    L: Number($("invL").value || 0),
    XL: Number($("invXL").value || 0),
    XXL: Number($("invXXL").value || 0)
  };

  const totalInventory = Object.values(sizes).reduce(
    (total, quantity) => total + Number(quantity || 0),
    0
  );

const colors = {

  Black: $("colorBlack").value.trim(),

  White: $("colorWhite").value.trim(),

  "Ice Grey": $("colorGrey").value.trim(),

  "Glacier Purple": $("colorPurple").value.trim()

};

  const gallery = [
  $("imgFront").value.trim(),
  $("imgBack").value.trim(),
  $("imgModel").value.trim(),
  $("imgDetail").value.trim()
].filter(Boolean);
  
  await addDoc(collection(db, "drops"), {
    title: $("dropTitle").value.trim(),
    price: $("dropPrice").value.trim(),
    imageUrl: $("dropImage").value.trim(),
    colors,
    gallery,
    sizes,
    inventory: totalInventory,
    category: $("dropCategory").value,
    collection: $("dropCollection").value,
    description: $("dropDesc").value.trim(),
    active: totalInventory > 0,
    soldOut: totalInventory === 0,
    featured: false,
    createdAt: serverTimestamp()
  });

  alert("Product Published!");

  await renderAdmin();
};

window.editDrop = async function (id) {
  const ref = doc(db, "drops", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Product not found.");
    return;
  }

  const current = snap.data();
  const currentSizes = current.sizes || {};

const currentColors = current.colors || {};

const blackImage = prompt(
  "Black Image URL:",
  currentColors.Black || ""
);
if (blackImage === null) return;

const whiteImage = prompt(
  "White Image URL:",
  currentColors.White || ""
);
if (whiteImage === null) return;

const greyImage = prompt(
  "Ice Grey Image URL:",
  currentColors["Ice Grey"] || ""
);
if (greyImage === null) return;

const purpleImage = prompt(
  "Glacier Purple Image URL:",
  currentColors["Glacier Purple"] || ""
);
if (purpleImage === null) return;

const colors = {
  Black: blackImage.trim(),
  White: whiteImage.trim(),
  "Ice Grey": greyImage.trim(),
  "Glacier Purple": purpleImage.trim()
};
  
  const title = prompt("Product title:", current.title || "");
  if (title === null) return;

  const price = prompt("Price:", current.price || "");
  if (price === null) return;

  const imageUrl = prompt("Image URL:", current.imageUrl || "");
  if (imageUrl === null) return;

  const description = prompt(
    "Product description:",
    current.description || ""
  );
  if (description === null) return;

  const xs = prompt("XS inventory:", currentSizes.XS ?? 0);
  if (xs === null) return;

  const s = prompt("S inventory:", currentSizes.S ?? 0);
  if (s === null) return;

  const m = prompt("M inventory:", currentSizes.M ?? 0);
  if (m === null) return;

  const l = prompt("L inventory:", currentSizes.L ?? 0);
  if (l === null) return;

  const xl = prompt("XL inventory:", currentSizes.XL ?? 0);
  if (xl === null) return;

  const xxl = prompt("XXL inventory:", currentSizes.XXL ?? 0);
  if (xxl === null) return;

  const sizes = {
    XS: Math.max(0, Number(xs) || 0),
    S: Math.max(0, Number(s) || 0),
    M: Math.max(0, Number(m) || 0),
    L: Math.max(0, Number(l) || 0),
    XL: Math.max(0, Number(xl) || 0),
    XXL: Math.max(0, Number(xxl) || 0)
  };

  const totalInventory = Object.values(sizes).reduce(
    (total, stock) => total + stock,
    0
  );

  try {
    await updateDoc(ref, {
      title: title.trim(),
      price: price.trim(),
      imageUrl: imageUrl.trim(),
      description: description.trim(),
      colors,
      sizes,
      inventory: totalInventory,
      soldOut: totalInventory === 0,
      active: totalInventory > 0
    });

    alert("Product and size inventory updated.");
    await renderAdmin();
  } catch (err) {
    alert("UPDATE ERROR: " + err.message);
  }
};

window.deleteDrop = async function (id) {
  if (!confirm("Delete this drop?")) return;
  await deleteDoc(doc(db, "drops", id));
  alert("Drop deleted.");
  await renderAdmin();
};

window.addCommercial = async function () {
  await addDoc(collection(db, "commercials"), {
    title: $("commercialTitle").value.trim(),
    videoUrl: $("commercialUrl").value.trim(),
    description: $("commercialDesc").value.trim(),
    createdAt: serverTimestamp()
  });

  alert("Commercial added.");
  await renderAdmin();
};

window.editCommercial = async function (id) {
  const title = prompt("New commercial title:");
  if (title === null) return;

  const videoUrl = prompt("New video URL:");
  if (videoUrl === null) return;

  const description = prompt("New description:");
  if (description === null) return;

  await updateDoc(doc(db, "commercials", id), { title, videoUrl, description });

  alert("Commercial updated.");
  await renderAdmin();
};

window.deleteCommercial = async function (id) {
  if (!confirm("Delete this commercial?")) return;
  await deleteDoc(doc(db, "commercials", id));
  alert("Commercial deleted.");
  await renderAdmin();
};

window.addVipPost = async function () {
  await addDoc(collection(db, "vip_posts"), {
    title: $("vipTitle").value.trim(),
    text: $("vipText").value.trim(),
    createdAt: serverTimestamp()
  });

  alert("VIP post added.");
  await renderAdmin();
};

window.editVipPost = async function (id) {
  const title = prompt("New post title:");
  if (title === null) return;

  const text = prompt("New message:");
  if (text === null) return;

  await updateDoc(doc(db, "vip_posts", id), { title, text });

  alert("VIP post updated.");
  await renderAdmin();
};

window.deleteVipPost = async function (id) {
  if (!confirm("Delete this VIP post?")) return;
  await deleteDoc(doc(db, "vip_posts", id));
  alert("VIP post deleted.");
  await renderAdmin();
};

window.editOrder = async function (id) {
  const status = prompt("New order status:");
  if (status === null) return;

  const eta = prompt("New ETA:");
  if (eta === null) return;

  await updateDoc(doc(db, "orders", id), { status, eta });

  alert("Order updated.");
  await renderAdmin();
};

window.deleteOrder = async function (id) {
  if (
    !confirm(
      "Delete this order and return its quantity to inventory?"
    )
  ) {
    return;
  }

  try {
    const orderRef = doc(db, "orders", id);

    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error("Order not found.");
      }

      const orderData = orderSnap.data();
      const dropId = orderData.dropId;
      const size = orderData.size;
      const quantity = Number(orderData.quantity || 1);

      if (!dropId || !size) {
        transaction.delete(orderRef);
        return;
      }

      const dropRef = doc(db, "drops", dropId);
      const dropSnap = await transaction.get(dropRef);

      if (!dropSnap.exists()) {
        transaction.delete(orderRef);
        return;
      }

      const dropData = dropSnap.data();

      const sizes = {
        ...(dropData.sizes || {})
      };

      sizes[size] =
        Number(sizes[size] || 0) + quantity;

      const totalInventory = Object.values(sizes).reduce(
        (total, stock) => {
          return total + Number(stock || 0);
        },
        0
      );

      transaction.update(dropRef, {
        sizes,
        inventory: totalInventory,
        soldOut: false,
        active: true
      });

      transaction.delete(orderRef);
    });

    alert("Order deleted and inventory restored.");
    await renderAdmin();
  } catch (err) {
    alert("DELETE ORDER ERROR: " + err.message);
  }
};

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("icewearCart"));
    return Array.isArray(cart) ? cart : [];
  } catch (err) {
    console.error("Cart read error:", err);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("icewearCart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();

  const count = cart.reduce((total, item) => {
    return total + Number(item.quantity || 1);
  }, 0);

  const countElement = $("cartCount");

  if (countElement) {
    countElement.innerText = count;
  }
}

window.addCurrentProductToCart = function () {
  const product = JSON.parse(
    localStorage.getItem("selectedProduct")
  );

  if (!product) {
    alert("No product selected.");
    return;
  }

  const colorElement = $("productColor");
  const sizeElement = $("productSize");
  const quantityElement = $("productQty");

  if (!sizeElement || !quantityElement) {
    alert("Please select a size and quantity.");
    return;
  }

  const color = colorElement
    ? colorElement.value
    : "Default";

  const size = sizeElement.value;
  const quantity = Number(quantityElement.value || 1);

  if (!size || quantity < 1) {
    alert("Please select a valid size and quantity.");
    return;
  }

  const selectedColorImage =
    product.colors?.[color] ||
    product.imageUrl ||
    "";

  const cart = getCart();

  const existingItem = cart.find((item) => {
    return (
      item.dropId === product.dropId &&
      item.size === size &&
      item.color === color
    );
  });

 const availableStock = product.sizes
  ? Number(product.sizes[size] || 0)
  : Number(product.inventory || 0);

if (availableStock <= 0) {
  alert(`Size ${size} is sold out.`);
  return;
}

if (existingItem) {
  const combinedQuantity =
    Number(existingItem.quantity || 1) + quantity;

  if (combinedQuantity > availableStock) {
    alert(
      `You already have ${existingItem.quantity} in your cart. ` +
      `Only ${availableStock} item(s) are available in size ${size}.`
    );
    return;
  }

  existingItem.quantity = combinedQuantity;
} else {
  if (quantity > availableStock) {
    alert(
      `Only ${availableStock} item(s) are available in size ${size}.`
    );
    return;
  }

  cart.push({
    cartId: `${product.dropId}-${color}-${size}-${Date.now()}`,
    dropId: product.dropId,
    product: product.title,
    price: product.price,
    imageUrl: selectedColorImage,
    description: product.description || "",
    color,
    size,
    quantity
  });
}

  saveCart(cart);

  alert("Added to your cart.");
  showTab("cart");
};

window.removeCartItem = function (cartId) {
  const cart = getCart().filter((item) => item.cartId !== cartId);

  saveCart(cart);
  renderCart();
};

window.changeCartQuantity = async function (cartId, amount) {
  const cart = getCart();

  const item = cart.find(
    (cartItem) => cartItem.cartId === cartId
  );

  if (!item) {
    alert("Cart item not found.");
    return;
  }

  const newQuantity =
    Number(item.quantity || 1) + Number(amount);

  if (newQuantity <= 0) {
    const updatedCart = cart.filter(
      (cartItem) => cartItem.cartId !== cartId
    );

    saveCart(updatedCart);
    renderCart();
    return;
  }

  try {
    const dropSnap = await getDoc(
      doc(db, "drops", item.dropId)
    );

    if (!dropSnap.exists()) {
      alert("This product is no longer available.");
      return;
    }

    const dropData = dropSnap.data();

    const availableStock = dropData.sizes
      ? Number(dropData.sizes[item.size] || 0)
      : Number(dropData.inventory || 0);

    if (availableStock <= 0) {
      alert(`Size ${item.size} is sold out.`);
      return;
    }

    if (newQuantity > availableStock) {
      alert(
        `Only ${availableStock} item(s) remain in size ${item.size}.`
      );
      return;
    }

    item.quantity = newQuantity;

    saveCart(cart);
    renderCart();
  } catch (err) {
    alert("CART ERROR: " + err.message);
  }
};

window.checkoutCartItem = function (cartId) {
  const cart = getCart();
  const item = cart.find((cartItem) => cartItem.cartId === cartId);

  if (!item) {
    alert("Cart item not found.");
    return;
  }

  localStorage.setItem(
    "checkout",
   JSON.stringify({
  dropId: item.dropId,
  product: item.product,
  price: item.price,
  imageUrl: item.imageUrl || "",
  email: currentUser.email,
  color: item.color || "Default",
  size: item.size,
  quantity: Number(item.quantity || 1),
  cartId: item.cartId
})
  );

  showTab("checkout");
};

window.clearCart = function () {
  if (!confirm("Remove every item from your cart?")) return;

  saveCart([]);
  renderCart();
};


window.checkoutDrop = function (dropId, productName, price, imageUrl = "") {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  localStorage.setItem("checkout", JSON.stringify({
    dropId,
    product: productName,
    price,
    imageUrl,
    email: currentUser.email
  }));

  showTab("checkout");
};

window.placeOrder = async function () {
  const agree = document.getElementById("agreeTerms");

  if (!agree || !agree.checked) {
    alert("Please accept the Policies before placing your order.");
    return;
  }

  const order = JSON.parse(localStorage.getItem("checkout"));

  if (!order) {
    alert("No checkout found.");
    return;
  }

  const size = document.getElementById("orderSize").value;
  const quantity = Number(document.getElementById("orderQty").value);

  const shipName = document.getElementById("shipName").value.trim();
  const shipPhone = document.getElementById("shipPhone").value.trim();
  const shipAddress = document.getElementById("shipAddress").value.trim();
  const shipCity = document.getElementById("shipCity").value.trim();
  const shipState = document.getElementById("shipState").value.trim();
  const shipZip = document.getElementById("shipZip").value.trim();

  if (!shipName || !shipPhone || !shipAddress || !shipCity || !shipState || !shipZip) {
    alert("Please complete your shipping information.");
    return;
  }

const placeOrderButton = $("placeOrderBtn");

if (placeOrderButton?.disabled) {
  return;
}

if (placeOrderButton) {
  placeOrderButton.disabled = true;
placeOrderButton.innerText = "Reserve Pre-Order";
}

const numericPrice = Number(
  String(order.price || "0").replace(/[^0-9.]/g, "")
);

const orderTotal = numericPrice * quantity;
 
  const orderData = {
    uid: currentUser.uid,
    email: currentUser.email,
    product: order.product,
    color: order.color || "Default",
    dropId: order.dropId,
    price: order.price,
    orderTotal,
    size,
    quantity,
    shipName,
    shipPhone,
    shipAddress,
    shipCity,
    shipState,
    shipZip,
    imageUrl: order.imageUrl || "",
   status: "Awaiting Payment",
paymentStatus: "Not Paid",
    eta: "4–5 Weeks",
    createdAt: serverTimestamp()
  };

try {
  const dropRef = doc(db, "drops", order.dropId);
  const newOrderRef = doc(collection(db, "orders"));
const orderNumber =
  `ICE-${newOrderRef.id.slice(0, 8).toUpperCase()}`;
  await runTransaction(db, async (transaction) => {
    const dropSnap = await transaction.get(dropRef);

    if (!dropSnap.exists()) {
      throw new Error("This product is no longer available.");
    }

const dropData = dropSnap.data();

const sizes = {
  ...(dropData.sizes || {})
};

const selectedSizeInventory = Number(sizes[size] || 0);

if (!dropData.sizes) {
  throw new Error("Size inventory has not been configured for this product.");
}

if (!Object.prototype.hasOwnProperty.call(sizes, size)) {
  throw new Error("This size is not available.");
}

if (selectedSizeInventory <= 0) {
  throw new Error(`Size ${size} is sold out.`);
}

if (quantity > selectedSizeInventory) {
  throw new Error(
    `Only ${selectedSizeInventory} item(s) remain in size ${size}.`
  );
}

sizes[size] = selectedSizeInventory - quantity;

const totalInventory = Object.values(sizes).reduce(
  (total, stock) => total + Number(stock || 0),
  0
);

transaction.update(dropRef, {
  sizes,
  inventory: totalInventory,
  soldOut: totalInventory === 0,
  active: totalInventory > 0
});

    transaction.set(newOrderRef, {
      ...orderData,
      orderId: newOrderRef.id
    });
  });

  try {
  await sendOrderEmail({
  ...orderData,
  orderNumber
});
  } catch (emailError) {
    console.error("Order saved, but email failed:", emailError);
  }

  localStorage.removeItem("checkout");

if (order.cartId) {
  const updatedCart = getCart().filter(
    (item) => item.cartId !== order.cartId
  );

  saveCart(updatedCart);
}
  
  alert("Order placed successfully!");

  showTab("orders");

 } catch (err) {
  const placeOrderButton = $("placeOrderBtn");

  if (placeOrderButton) {
    placeOrderButton.disabled = false;
 placeOrderButton.innerText = "Reserve Pre-Order";
  }

  alert("ORDER ERROR: " + err.message);
}
  
};


window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = $("loginBtn");
  const signupBtn = $("signupBtn");

  if (loginBtn) loginBtn.onclick = window.login;
  if (signupBtn) signupBtn.onclick = window.signUp;

  console.log("IcewearCraft buttons connected.");
});

async function sendOrderEmail(orderData) {
  try {
    await emailjs.send(
      "service_94ti6rs",
      "template_dsmiuks",
      {
        to_email: orderData.email,
        customer_name: orderData.shipName,
       order_number: orderData.orderNumber,
        product: orderData.product,
        price: orderData.price,
       color:
  orderData.color && orderData.color !== "Default"
    ? orderData.color
    : "Not specified",

size: orderData.size,

quantity: orderData.quantity,

order_total:
  `$${Number(orderData.orderTotal || 0).toFixed(2)}`,

phone: orderData.shipPhone,
shipping_address:
  `${orderData.shipAddress}, ` +
  `${orderData.shipCity}, ` +
  `${orderData.shipState} ` +
  `${orderData.shipZip}`,

status: orderData.status,
eta: orderData.eta

      }
    );

    console.log("Order confirmation email sent.");
  } catch (err) {
    console.error("EmailJS Error:", err);
  }
}

window.openPaymentLink = function (paymentLink) {
  const safeLink = String(paymentLink || "").trim();

  if (!safeLink.startsWith("https://")) {
    alert("This payment link is not valid.");
    return;
  }

  window.open(
    safeLink,
    "_blank",
    "noopener,noreferrer"
  );
};

window.addPaymentLink = async function (id) {
  const paymentLink = prompt(
    "Paste the secure Stripe or PayPal payment link:"
  );

  if (paymentLink === null) return;

  const cleanLink = paymentLink.trim();

  if (!cleanLink.startsWith("https://")) {
    alert("Enter a valid secure https:// payment link.");
    return;
  }

  try {
    await updateDoc(
      doc(db, "orders", id),
      {
        paymentLink: cleanLink,
        paymentStatus: "Payment Link Sent",
        paymentLinkAddedAt: serverTimestamp()
      }
    );

    alert("Payment link saved.");
    await renderAdmin();
  } catch (err) {
    alert(
      "PAYMENT LINK ERROR: " +
      err.message
    );
  }
};

window.updatePaymentStatus = async function (
  id,
  paymentStatus
) {
  try {
    const updates = {
      paymentStatus
    };

    if (paymentStatus === "Paid") {
      updates.status = "Paid";
      updates.paidAt = serverTimestamp();
    }

    if (paymentStatus === "Refunded") {
      updates.status = "Refunded";
      updates.refundedAt = serverTimestamp();
    }

    await updateDoc(
      doc(db, "orders", id),
      updates
    );

    alert(
      `Payment status updated to ${paymentStatus}.`
    );

    await renderAdmin();
  } catch (err) {
    alert(
      "PAYMENT STATUS ERROR: " +
      err.message
    );
  }
};


window.updateOrderStatus = async function(id, status) {
  await updateDoc(doc(db, "orders", id), {
    status
  });

  alert("Order status updated.");
  await renderAdmin();
};

window.addTracking = async function(id) {
  const trackingNumber = prompt("Enter tracking number:");
  if (!trackingNumber) return;

  const carrier = prompt("Carrier? USPS, UPS, FedEx, DHL");
  if (!carrier) return;

  await updateDoc(doc(db, "orders", id), {
    trackingNumber,
    carrier,
    status: "Shipped"
  });

  alert("Tracking added.");
  await renderAdmin();
};

window.trackPackage = function (carrier, trackingNumber) {
  if (!trackingNumber) {
    alert("No tracking number added yet.");
    return;
  }

  const c = String(carrier || "").toLowerCase();
  const t = encodeURIComponent(trackingNumber);

  let url = "";

  if (c.includes("usps")) {
    url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
  } else if (c.includes("ups")) {
    url = `https://www.ups.com/track?tracknum=${t}`;
  } else if (c.includes("fedex")) {
    url = `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  } else if (c.includes("dhl")) {
    url = `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${t}`;
  } else {
    alert("Carrier not recognized. Use USPS, UPS, FedEx, or DHL.");
    return;
  }

  window.open(url, "_blank");
};

window.toggleFeatured = async function(id, value){

    await updateDoc(doc(db,"drops",id),{
        featured:value
    });

    await renderAdmin();
};



window.toggleActive = async function(id, active){

    await updateDoc(doc(db,"drops",id),{
        active
    });

    await renderAdmin();

};

console.log("IcewearCraft script loaded clean.");
