// ============================================================
// checkout.js  –  A3M Print  –  إتمام الطلب + Firebase
// ============================================================

import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CART_KEY  = "a3m_cart";
const DZD_USD   = 254;

async function placeOrder() {
  const v = id => (document.getElementById(id) || {}).value?.trim() || '';
  const name    = v('c_name');
  const phone   = v('c_phone');
  const address = v('c_address');
  const wilaya  = v('c_wilaya');
  const notes   = v('c_notes');

  if (!name || !phone || !address) {
    _feedback("⚠️ يرجى تعبئة الاسم والهاتف والعنوان", "error");
    return;
  }

  const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  if (!cart.length) { _feedback("⚠️ السلة فارغة", "error"); return; }

  const subtotal     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const bulkDiscount = subtotal >= 5000 ? subtotal * 0.20 : 0;
  const afterBulk    = subtotal - bulkDiscount;

  const discountCode = (document.getElementById("discountInput") || {}).value?.trim().toUpperCase() || '';
  const CODES = { "A3M10": 10, "A3M20": 20, "STUDENT": 15, "WELCOME": 25, "VIP50": 50 };
  const codeDiscount = CODES[discountCode] ? Math.round(afterBulk * CODES[discountCode] / 100) : 0;
  const finalTotal   = afterBulk - codeDiscount;

  const btn = document.getElementById("placeOrderBtn");
  if (btn) { btn.disabled = true; btn.textContent = "جاري الإرسال..."; }

  try {
    const order = {
      customer:     { name, phone, address, wilaya, notes },
      items:        cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      subtotal,
      bulkDiscount,
      codeDiscount,
      discountCode,
      total:        finalTotal,
      currency:     "DZD",
      status:       "pending",
      userId:       window.currentUser?.uid   || null,
      userEmail:    window.currentUser?.email || null,
      createdAt:    serverTimestamp()
    };
    await addDoc(collection(db, "orders"), order);

    // XP
    if (window.currentUser && window._saveUser) {
      window.currentUser.xp = (window.currentUser.xp || 0) + Math.floor(finalTotal / 100);
      window._saveUser();
    }

    localStorage.removeItem(CART_KEY);
    window.location.href = "success.html";

  } catch (err) {
    console.error("Order error:", err);
    // fallback: save locally and redirect anyway
    const localOrders = JSON.parse(localStorage.getItem('a3m_orders') || '[]');
    localOrders.push({
      name: cart[0]?.name || 'Order',
      emoji: '📦',
      date: new Date().toLocaleDateString(),
      price: finalTotal.toLocaleString() + ' دج'
    });
    localStorage.setItem('a3m_orders', JSON.stringify(localOrders));
    localStorage.removeItem(CART_KEY);
    window.location.href = "success.html";
  }
}

function _feedback(msg, type = "info") {
  const el = document.getElementById("checkout-feedback");
  if (el) {
    el.textContent = msg;
    el.style.color = type === "error" ? "#e01010" : "#16a34a";
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 4000);
  } else {
    alert(msg);
  }
}

function renderCheckoutSummary() {
  const cart      = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  const container = document.getElementById("checkoutItems");
  if (!container) return;
  if (!cart.length) { container.innerHTML = "<p style='color:var(--txt3)'>السلة فارغة</p>"; return; }

  const subtotal     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const bulkDiscount = subtotal >= 5000 ? subtotal * 0.20 : 0;
  const total        = subtotal - bulkDiscount;

  container.innerHTML = cart.map(i => `
    <div class="checkout-item">
      <span>${i.emoji || ""} ${i.name} × ${i.qty}</span>
      <span>${(i.price * i.qty).toLocaleString()} دج</span>
    </div>`).join("") + `
    <div class="checkout-totals">
      ${bulkDiscount > 0 ? `<div><span>خصم الجملة (20%)</span><span style="color:#16a34a">- ${bulkDiscount.toLocaleString()} دج</span></div>` : ""}
      <div class="checkout-final"><span><strong>المجموع</strong></span><span><strong>${total.toLocaleString()} دج</strong></span></div>
    </div>`;
}

window.placeOrder = placeOrder;
document.addEventListener("DOMContentLoaded", renderCheckoutSummary);
