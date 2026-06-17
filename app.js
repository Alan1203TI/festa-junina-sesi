import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const ADMIN_EMAIL = "admin@festajunina.com";

const USER_EMAILS = {
  admin: ADMIN_EMAIL,
  vendedor: "vendedor@festajunina.com"
};

const defaultProducts = [
  { id: "salgado", name: "Salgado", price: 6, image: "🥟", category: "Salgados" },
  { id: "cachorro_quente", name: "Cachorro-quente", price: 8, image: "🌭", category: "Salgados" },
  { id: "milho", name: "Milho Verde", price: 5, image: "🌽", category: "Comidas típicas" },
  { id: "bolo", name: "Bolo", price: 4, image: "🍰", category: "Doces" },
  { id: "canjica", name: "Canjica", price: 6, image: "🥣", category: "Doces" },
  { id: "refrigerante", name: "Refrigerante", price: 5, image: "🥤", category: "Bebidas" },
  { id: "agua", name: "Água", price: 3, image: "💧", category: "Bebidas" },
  { id: "suco", name: "Suco", price: 4, image: "🧃", category: "Bebidas" }
];

let app = initializeApp(firebaseConfig);
let auth = getAuth(app);
let db = getFirestore(app);

let currentUser = null;
let products = [];
let sales = [];
let cart = {};
let imageBase64 = "";
let paymentMethod = "Dinheiro";

const $ = (id) => document.getElementById(id);

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const isAdmin = () => currentUser?.email === ADMIN_EMAIL;

async function login() {
  const rawUser = $("loginUser").value.trim().toLowerCase();
  const pass = $("loginPass").value.trim();
  const email = USER_EMAILS[rawUser] || rawUser;

  $("loginMsg").textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    $("loginMsg").textContent = "Usuário ou senha incorretos.";
    console.error(e);
  }
}

async function startApp() {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("userLabel").textContent = `${isAdmin() ? "Administrador" : "Vendedor"} (${currentUser.email})`;

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = isAdmin() ? "inline-block" : "none";
  });

  await loadProducts();
  await loadSales();
  renderCart();
}

async function loadProducts() {
  const snap = await getDocs(collection(db, "produtos"));

  if (snap.empty && isAdmin()) {
    const batch = writeBatch(db);

    defaultProducts.forEach(p => {
      batch.set(doc(db, "produtos", p.id), p);
    });

    await batch.commit();
    products = defaultProducts;
  } else {
    products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  renderProducts();
}

async function loadSales() {
  const q = query(collection(db, "vendas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHistory();
}

function renderProductImage(image, name = "Produto") {
  if (!image) return "🛒";

  if (
    String(image).startsWith("http") ||
    String(image).startsWith("data:image")
  ) {
    return `<img src="${image}" alt="${name}">`;
  }

  return image;
}

function renderProducts() {
  $("productsGrid").innerHTML = products.map(p => {
    const image = renderProductImage(p.image, p.name);

    return `
      <div class="product-card">

        ${isAdmin() ? `<button class="edit-prod" data-edit="${p.id}">✎</button>` : ""}

        <div class="product-img">
          ${image}
        </div>

        <h3>${p.name}</h3>
        <small>${p.category || "Produto"}</small>

        <div class="price">${money(p.price)}</div>

        <button class="add" data-add="${p.id}">Adicionar</button>
      </div>
    `;
  }).join("") || `<p>Nenhum produto cadastrado. Entre como admin para cadastrar.</p>`;

  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.onclick = () => addToCart(btn.dataset.add);
  });

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () => openProductModal(btn.dataset.edit);
  });
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  renderCart();
}

function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(prod => prod.id === id);
    return sum + (Number(p?.price || 0) * qty);
  }, 0);
}

function renderCart() {
  const entries = Object.entries(cart);

  if (!entries.length) {
    $("cartList").className = "cart-list empty";
    $("cartList").textContent = "Nenhum item adicionado.";
  } else {
    $("cartList").className = "cart-list";

    $("cartList").innerHTML = entries.map(([id, qty]) => {
      const p = products.find(x => x.id === id);

      return `
        <div class="cart-item">
          <div>
            <strong>${p.name}</strong><br>
            <small>${qty} x ${money(p.price)} = ${money(qty * p.price)}</small>
          </div>

          <div class="cart-controls">
            <button data-dec="${id}">-</button>
            <b>${qty}</b>
            <button data-inc="${id}">+</button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll("[data-dec]").forEach(b => {
      b.onclick = () => changeQty(b.dataset.dec, -1);
    });

    document.querySelectorAll("[data-inc]").forEach(b => {
      b.onclick = () => changeQty(b.dataset.inc, 1);
    });
  }

  const total = cartTotal();
  const paid = Number($("paidValue").value || 0);

  $("totalValue").textContent = money(total);
  $("changeValue").textContent = money(Math.max(0, paid - total));
}

async function finishSale() {
  const entries = Object.entries(cart);

  if (!entries.length) {
    return alert("Adicione itens ao carrinho.");
  }

  const total = cartTotal();
  const paid = Number($("paidValue").value || 0);

  if (paid < total && paymentMethod === "Dinheiro" && !confirm("Valor recebido menor que o total. Confirmar mesmo assim?")) {
    return;
  }

  const itens = entries.map(([id, qty]) => {
    const p = products.find(x => x.id === id);

    return {
      id,
      name: p.name,
      price: Number(p.price),
      qty,
      subtotal: Number(p.price) * qty
    };
  });

  await addDoc(collection(db, "vendas"), {
    itens,
    total,
    paid,
    change: paymentMethod === "Dinheiro" ? paid - total : 0,
    paymentMethod,
    seller: currentUser.email,
    sellerName: isAdmin() ? "Administrador" : "Vendedor",
    createdAt: serverTimestamp(),
    createdAtLocal: new Date().toISOString()
  });

  cart = {};
  $("paidValue").value = "";

  renderCart();
  await loadSales();

  alert("Venda registrada com sucesso!");
}

function saleDate(s) {
  const d = s.createdAt?.toDate
    ? s.createdAt.toDate()
    : new Date(s.createdAtLocal);

  return isNaN(d) ? new Date() : d;
}

function renderHistory() {
  const filter = $("filterDate").value;

  const filtered = sales.filter(s => {
    return !filter || saleDate(s).toISOString().slice(0, 10) === filter;
  });

  $("sumSales").textContent = filtered.length;

  $("sumTotal").textContent = money(
    filtered.reduce((a, s) => a + Number(s.total || 0), 0)
  );

  $("historyTable").innerHTML = filtered.map(s => `
    <tr>
      <td>${saleDate(s).toLocaleString("pt-BR")}</td>
      <td>${s.sellerName || s.seller}</td>
      <td>${s.paymentMethod || "Dinheiro"}</td>
      <td>${(s.itens || []).map(i => `${i.qty}x ${i.name}`).join("; ")}</td>
      <td>${money(s.paid)}</td>
      <td>${money(s.change)}</td>
      <td><strong>${money(s.total)}</strong></td>
    </tr>
  `).join("");
}

function exportCSV() {
  const rows = sales.map(s => [
    saleDate(s).toLocaleString("pt-BR"),
    s.sellerName || s.seller,
    s.paymentMethod || "Dinheiro",
    (s.itens || []).map(i => `${i.qty}x ${i.name}`).join(" | "),
    Number(s.paid || 0).toFixed(2),
    Number(s.change || 0).toFixed(2),
    Number(s.total || 0).toFixed(2)
  ].join(";"));

  const blob = new Blob(
    ["Data;Vendedor;Pagamento;Itens;Pago;Troco;Total\n" + rows.join("\n")],
    { type: "text/csv;charset=utf-8" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "historico-vendas-festa-junina.csv";
  a.click();

  URL.revokeObjectURL(a.href);
}

async function deleteHistory() {
  if (!isAdmin()) {
    return alert("Apenas admin pode apagar o histórico.");
  }

  if (!confirm("Tem certeza que deseja apagar TODO o histórico?")) {
    return;
  }

  const snap = await getDocs(collection(db, "vendas"));
  const batch = writeBatch(db);

  snap.docs.forEach(d => {
    batch.delete(doc(db, "vendas", d.id));
  });

  await batch.commit();
  await loadSales();
}

function openProductModal(id = null) {
  if (!isAdmin()) return;

  const p = id ? products.find(x => x.id === id) : null;

  $("productModalTitle").textContent = p ? "Editar Produto" : "Novo Produto";
  $("prodId").value = p?.id || "";
  $("prodName").value = p?.name || "";
  $("prodPrice").value = p?.price || "";
  $("prodCategory").value = p?.category || "";
  $("prodImage").value = p?.image || "";
  $("prodImageFile").value = "";

  imageBase64 = p?.image || "";

  if (p?.image) {
    $("previewImage").innerHTML = renderProductImage(p.image, p.name);
  } else {
    $("previewImage").innerHTML = "";
  }

  $("btnDeleteProduct").style.display = p ? "inline-block" : "none";
  $("productModal").showModal();
}

function readProductImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

async function handleProductImageChange(e) {
  const file = e.target.files[0];

  if (!file) return;

  if (file.size > 900 * 1024) {
    alert("Imagem muito grande. Use uma imagem menor que 900 KB.");
    e.target.value = "";
    return;
  }

  imageBase64 = await readProductImage(file);

  $("prodImage").value = imageBase64;

  $("previewImage").innerHTML = `
    <img src="${imageBase64}" alt="Prévia do produto">
  `;
}

async function saveProduct() {
  const name = $("prodName").value.trim();
  const price = Number($("prodPrice").value);
  const category = $("prodCategory").value.trim();
  const image = $("prodImage").value || imageBase64 || "🛒";

  if (!name || price < 0) {
    return alert("Preencha nome e preço.");
  }

  const id = $("prodId").value ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") +
    "_" +
    Date.now();

  const product = {
    name,
    price,
    image,
    category
  };

  await setDoc(doc(db, "produtos", id), product, { merge: true });

  $("productModal").close();
  await loadProducts();
}

async function deleteProduct() {
  const id = $("prodId").value;

  if (id && confirm("Excluir este produto?")) {
    await deleteDoc(doc(db, "produtos", id));
    $("productModal").close();
    await loadProducts();
  }
}

function selectPayment(button) {
  document.querySelectorAll(".payment-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  button.classList.add("active");
  paymentMethod = button.dataset.payment;

  if (paymentMethod !== "Dinheiro") {
    $("paidValue").value = cartTotal();
  }

  renderCart();
}

$("btnLogin").onclick = login;

$("loginPass").addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

$("btnLogout").onclick = () => signOut(auth);

$("paidValue").oninput = renderCart;

document.querySelectorAll(".quick-money button").forEach(b => {
  b.onclick = () => {
    $("paidValue").value = Number(b.dataset.money);
    renderCart();
  };
});

document.querySelectorAll(".payment-btn").forEach(btn => {
  btn.onclick = () => selectPayment(btn);
});

$("btnFinish").onclick = finishSale;

$("btnClearCart").onclick = () => {
  cart = {};
  renderCart();
};

$("filterDate").onchange = renderHistory;
$("btnExport").onclick = exportCSV;
$("btnDeleteHistory").onclick = deleteHistory;

$("btnOpenProductModal").onclick = () => openProductModal();
$("btnCancelProduct").onclick = () => $("productModal").close();
$("btnSaveProduct").onclick = saveProduct;
$("btnDeleteProduct").onclick = deleteProduct;

$("prodImageFile").addEventListener("change", handleProductImageChange);

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;

    startApp().catch(e => {
      console.error(e);
      alert("Erro ao carregar dados. Verifique as regras do Firestore.");
    });

  } else {
    currentUser = null;
    $("app").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    $("loginMsg").textContent = "";
  }
});

window.addEventListener("error", e => {
  console.error("Erro geral:", e.message);
});
