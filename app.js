import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const USERS = {
  admin: { pass: "1234", role: "admin", name: "Administrador" },
  vendedor: { pass: "123", role: "vendedor", name: "Vendedor" }
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

let app, db;
let currentUser = null;
let products = [];
let sales = [];
let cart = {};

const $ = (id) => document.getElementById(id);
const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function bootFirebase(){
  if(firebaseConfig.apiKey.includes("COLE_")){
    alert("Configure o arquivo firebase-config.js com os dados do seu Firebase antes de publicar.");
    return false;
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  return true;
}

function login(){
  const user = $("loginUser").value.trim();
  const pass = $("loginPass").value.trim();
  if(!USERS[user] || USERS[user].pass !== pass){ alert("Usuário ou senha incorretos."); return; }
  currentUser = { username: user, ...USERS[user] };
  sessionStorage.setItem("fj_user", JSON.stringify(currentUser));
  startApp();
}

async function startApp(){
  if(!db && !bootFirebase()) return;
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userLabel").textContent = `${currentUser.name} (${currentUser.role})`;
  document.querySelectorAll(".admin-only").forEach(el => el.style.display = currentUser.role === "admin" ? "inline-block" : "none");
  await loadProducts();
  await loadSales();
}

async function loadProducts(){
  const snap = await getDocs(collection(db, "produtos"));
  if(snap.empty){
    const batch = writeBatch(db);
    defaultProducts.forEach(p => batch.set(doc(db, "produtos", p.id), p));
    await batch.commit();
    products = defaultProducts;
  } else {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=> (a.name||"").localeCompare(b.name||""));
  }
  renderProducts();
}

async function loadSales(){
  const q = query(collection(db, "vendas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHistory();
}

function renderProducts(){
  $("productsGrid").innerHTML = products.map(p => `
    <div class="product-card">
      ${currentUser?.role === "admin" ? `<button class="edit-prod" data-edit="${p.id}">✎</button>` : ""}
      <div class="product-img">${String(p.image||"").startsWith("http") ? `<img src="${p.image}" alt="${p.name}">` : (p.image || "🛒")}</div>
      <h3>${p.name}</h3>
      <small>${p.category || "Produto"}</small>
      <div class="price">${money(p.price)}</div>
      <button class="add" data-add="${p.id}">Adicionar</button>
    </div>`).join("");
  document.querySelectorAll("[data-add]").forEach(btn => btn.onclick = () => addToCart(btn.dataset.add));
  document.querySelectorAll("[data-edit]").forEach(btn => btn.onclick = () => openProductModal(btn.dataset.edit));
}

function addToCart(id){ cart[id] = (cart[id] || 0) + 1; renderCart(); }
function changeQty(id, delta){ cart[id] = (cart[id] || 0) + delta; if(cart[id] <= 0) delete cart[id]; renderCart(); }
function cartTotal(){ return Object.entries(cart).reduce((sum,[id,qty]) => sum + (products.find(p=>p.id===id)?.price || 0) * qty, 0); }

function renderCart(){
  const entries = Object.entries(cart);
  if(!entries.length){ $("cartList").className = "cart-list empty"; $("cartList").textContent = "Nenhum item adicionado."; }
  else{
    $("cartList").className = "cart-list";
    $("cartList").innerHTML = entries.map(([id,qty]) => {
      const p = products.find(x=>x.id===id);
      return `<div class="cart-item"><div><strong>${p.name}</strong><br><small>${qty} x ${money(p.price)} = ${money(qty*p.price)}</small></div><div class="cart-controls"><button data-dec="${id}">-</button><b>${qty}</b><button data-inc="${id}">+</button></div></div>`;
    }).join("");
    document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
    document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
  }
  const total = cartTotal();
  const paid = Number($("paidValue").value || 0);
  $("totalValue").textContent = money(total);
  $("changeValue").textContent = money(Math.max(0, paid - total));
}

async function finishSale(){
  const entries = Object.entries(cart);
  if(!entries.length){ alert("Adicione itens ao carrinho."); return; }
  const total = cartTotal();
  const paid = Number($("paidValue").value || 0);
  if(paid < total && !confirm("Valor recebido menor que o total. Confirmar mesmo assim?")) return;
  const itens = entries.map(([id,qty]) => { const p = products.find(x=>x.id===id); return { id, name:p.name, price:Number(p.price), qty, subtotal:Number(p.price)*qty }; });
  await addDoc(collection(db, "vendas"), { itens, total, paid, change: paid-total, seller: currentUser.username, sellerName: currentUser.name, createdAt: serverTimestamp(), createdAtLocal: new Date().toISOString() });
  cart = {}; $("paidValue").value = ""; renderCart(); await loadSales(); alert("Venda registrada com sucesso!");
}

function saleDate(s){ const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAtLocal); return isNaN(d) ? new Date() : d; }
function renderHistory(){
  const filter = $("filterDate").value;
  const filtered = sales.filter(s => !filter || saleDate(s).toISOString().slice(0,10) === filter);
  $("sumSales").textContent = filtered.length;
  $("sumTotal").textContent = money(filtered.reduce((a,s)=>a+Number(s.total||0),0));
  $("historyTable").innerHTML = filtered.map(s => `<tr><td>${saleDate(s).toLocaleString("pt-BR")}</td><td>${s.sellerName||s.seller}</td><td>${(s.itens||[]).map(i=>`${i.qty}x ${i.name}`).join("; ")}</td><td>${money(s.paid)}</td><td>${money(s.change)}</td><td><strong>${money(s.total)}</strong></td></tr>`).join("");
}

function exportCSV(){
  const header = "Data;Vendedor;Itens;Pago;Troco;Total\n";
  const rows = sales.map(s => [`${saleDate(s).toLocaleString("pt-BR")}`, s.sellerName||s.seller, (s.itens||[]).map(i=>`${i.qty}x ${i.name}`).join(" | "), Number(s.paid||0).toFixed(2), Number(s.change||0).toFixed(2), Number(s.total||0).toFixed(2)].join(";"));
  const blob = new Blob([header + rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "historico-vendas-festa-junina.csv"; a.click(); URL.revokeObjectURL(a.href);
}

async function deleteHistory(){
  if(currentUser.role !== "admin") return alert("Apenas admin pode apagar o histórico.");
  if(!confirm("Tem certeza que deseja apagar TODO o histórico?")) return;
  const snap = await getDocs(collection(db, "vendas"));
  const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(doc(db,"vendas",d.id))); await batch.commit(); await loadSales();
}

function openProductModal(id=null){
  if(currentUser.role !== "admin") return;
  const p = id ? products.find(x=>x.id===id) : null;
  $("productModalTitle").textContent = p ? "Editar Produto" : "Novo Produto";
  $("prodId").value = p?.id || ""; $("prodName").value = p?.name || ""; $("prodPrice").value = p?.price || ""; $("prodImage").value = p?.image || ""; $("prodCategory").value = p?.category || "";
  $("btnDeleteProduct").style.display = p ? "inline-block" : "none";
  $("productModal").showModal();
}

async function saveProduct(){
  const id = $("prodId").value || $("prodName").value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') + '_' + Date.now();
  const product = { name: $("prodName").value.trim(), price: Number($("prodPrice").value), image: $("prodImage").value.trim() || "🛒", category: $("prodCategory").value.trim() };
  if(!product.name || product.price < 0) return alert("Preencha nome e preço.");
  await setDoc(doc(db, "produtos", id), product, { merge: true });
  $("productModal").close(); await loadProducts();
}

async function deleteProduct(){
  const id = $("prodId").value; if(!id) return;
  if(confirm("Excluir este produto?")){ await deleteDoc(doc(db, "produtos", id)); $("productModal").close(); await loadProducts(); }
}

$("btnLogin").onclick = login;
$("loginPass").addEventListener("keydown", e => { if(e.key === "Enter") login(); });
$("btnLogout").onclick = () => { sessionStorage.removeItem("fj_user"); location.reload(); };
$("paidValue").oninput = renderCart;
document.querySelectorAll(".quick-money button").forEach(b => b.onclick = () => { $("paidValue").value = Number(b.dataset.money); renderCart(); });
$("btnFinish").onclick = finishSale;
$("btnClearCart").onclick = () => { cart = {}; renderCart(); };
$("filterDate").onchange = renderHistory;
$("btnExport").onclick = exportCSV;
$("btnDeleteHistory").onclick = deleteHistory;
$("btnOpenProductModal").onclick = () => openProductModal();
$("btnCancelProduct").onclick = () => $("productModal").close();
$("btnSaveProduct").onclick = saveProduct;
$("btnDeleteProduct").onclick = deleteProduct;

const saved = sessionStorage.getItem("fj_user");
if(saved){ currentUser = JSON.parse(saved); startApp(); }
