// ============================================================
// cart.js  –  A3M Print  –  السلة + المنتجات + المودال
// ============================================================

const CART_KEY       = "a3m_cart";
const DZD_PER_USD    = 254;
const BULK_THRESHOLD = 5000;
const BULK_RATE      = 0.20;

let cart                = JSON.parse(localStorage.getItem(CART_KEY)) || [];
// Expose cart array to window so designer.js and checkout.js can access it
Object.defineProperty(window, 'cart', {
  get() { return cart; },
  set(v) { cart = v; }
});
window.currency         = "DZD";
window.currentCat       = "all";
let currentModalProduct = null;
let modalQty            = 1;
let selectedSize        = "";
let activeDiscount      = null;

const DISCOUNT_CODES = {
  'A3M10':  { pct: 10 },
  'A3M20':  { pct: 20 },
  'STUDENT':{ pct: 15 },
  'WELCOME':{ pct: 25 },
  'VIP50':  { pct: 50 }
};

function fmtPrice(dzd) {
  return window.currency === 'USD'
    ? '$' + (dzd / DZD_PER_USD).toFixed(2)
    : dzd.toLocaleString() + ' دج';
}

function disc(p, o) { return o ? Math.round((1 - p / o) * 100) + '%' : ''; }

function renderProducts(cat) {
  if (cat !== undefined) window.currentCat = cat;
  const useCat = window.currentCat || 'all';
  const PD  = window.PD;
  const t   = window.T && window.T[window.currentLang || 'en'];
  const bl  = window.BL && window.BL[window.currentLang || 'en'];
  if (!PD || !t) { setTimeout(() => renderProducts(useCat), 100); return; }

  const paperSection = document.getElementById('paperSection');
  const grid = document.getElementById('grid');
  if (!grid) return;

  if (useCat === 'paper') {
    if (paperSection) paperSection.style.display = 'block';
    grid.innerHTML = '';
    renderPaper();
    return;
  }
  if (paperSection) paperSection.style.display = 'none';

  const list = useCat === 'all' ? PD : PD.filter(p => p.cat === useCat);
  grid.innerHTML = list.map(p => {
    const info = t.prods[p.id] || { n: p.emoji, s: '', desc: '' };
    const onSale = p.old > 0;
    const d = disc(p.price, p.old);
    const bTxt = p.badge && bl ? (bl[p.badge] || '') : '';
    return `<div class="product-card${onSale ? ' on-sale' : ''}" onclick="openProdModal(${p.id})">
      <div class="product-img"><span style="font-size:4rem">${p.emoji}</span>${bTxt ? `<div class="badge ${p.bt}">${bTxt}</div>` : ''}</div>
      <div class="product-info">
        <div class="product-name">${info.n}</div>
        <div class="product-sub">${info.s}</div>
        <div class="stars">★★★★★</div>
        <div class="product-footer">
          <div>${onSale ? `<span class="discount-tag">-${d}</span><span class="product-old-price"> ${fmtPrice(p.old)}</span>` : ''}<span class="product-price"> ${fmtPrice(p.price)}</span></div>
          <button class="add-btn" onclick="event.stopPropagation();quickAdd(${p.id})">🛒 ${t.addToCartShort || 'ADD TO CART'}</button>
        </div>
      </div>
    </div>`;
  }).join('');

  // swap in real images
  setTimeout(applyRealImages, 30);
}

function renderPaper() {
  const t  = window.T && window.T[window.currentLang || 'en'];
  const PA = window.PAPERS;
  if (!t || !PA) return;
  const paperSub = document.getElementById('paperSub');
  if (paperSub) paperSub.textContent = t.paperSub || '';
  const paperGrid = document.getElementById('paperGrid');
  if (!paperGrid) return;
  paperGrid.innerHTML = PA.map(p => `
    <div class="paper-card">
      <div style="position:absolute;top:.7rem;right:.7rem;opacity:.1;font-size:1.8rem">${p.icon}</div>
      <div class="paper-size">${p.size}</div>
      <div class="paper-dims">${p.dims}</div>
      <div class="paper-use">${p.use}</div>
      <div class="paper-price">${fmtPrice(p.price)}</div>
      <button class="paper-order-btn" onclick="addPaperToCart('${p.size}',${p.price})">${t.orderPaper || 'Order'}</button>
    </div>`).join('');
}

function addPaperToCart(size, price) {
  const key = 'paper-' + size;
  const ex = cart.find(i => i.id === key);
  if (ex) ex.qty++; else cart.push({ id: key, name: `Print ${size}`, emoji: '📄', price, qty: 1 });
  saveCart(); updateCart();
  showToast((window.T && window.T[window.currentLang || 'en'] && window.T[window.currentLang || 'en'].toastAdded) || 'Added ✦');
}

function openProdModal(id) {
  const PD = window.PD;
  const t  = window.T && window.T[window.currentLang || 'en'];
  if (!PD || !t) return;
  const p = PD[id];
  if (!p) return;
  const info = t.prods[id] || { n: p.emoji, s: '', desc: '' };
  currentModalProduct = p;
  modalQty = 1;
  selectedSize = '';

  const safe = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
  safe('modalHeadTitle', t.modalHead || 'Product Details');
  safe('modalTitle', info.n);
  safe('modalSub', info.s);
  safe('modalPrice', fmtPrice(p.price));
  safe('modalOld', p.old ? fmtPrice(p.old) : '');
  safe('modalDisc', p.old ? '-' + disc(p.price, p.old) : '');
  safe('modalDesc', info.desc || '');
  safe('modalQty', '1');
  safe('modalAddBtn', t.addToCart || 'Add to Cart');
  safe('qtyLabelM', t.qtyLabelM || 'QTY');
  safe('sizeLabel', t.sizeLabel || 'SIZE');
  safe('totalLabel', t.totalLabel || 'Total');

  const imgEl = document.getElementById('modalImg');
  if (imgEl) {
    const imgs = window.PROD_IMGS && window.PROD_IMGS[id];
    if (imgs && imgs.length) {
      imgEl.innerHTML = `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:contain;border-radius:8px"/>`;
      if (imgs.length > 1) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:.4rem;margin-top:.5rem;flex-wrap:wrap';
        imgs.forEach((src, i) => {
          const thumb = document.createElement('img');
          thumb.src = src;
          thumb.style.cssText = 'width:44px;height:44px;border-radius:6px;cursor:pointer;border:2px solid ' + (i === 0 ? 'var(--accent)' : 'transparent') + ';object-fit:cover';
          thumb.onclick = () => {
            imgEl.querySelector('img').src = src;
            row.querySelectorAll('img').forEach(x => x.style.borderColor = 'transparent');
            thumb.style.borderColor = 'var(--accent)';
          };
          row.appendChild(thumb);
        });
        imgEl.appendChild(row);
      }
    } else {
      imgEl.textContent = p.emoji;
    }
  }

  const sw = document.getElementById('sizesWrap');
  if (sw) {
    if (p.sizes && p.sizes.length) {
      sw.style.display = 'block';
      const sr = document.getElementById('sizesRow');
      if (sr) sr.innerHTML = p.sizes.map(s => `<span class="size-chip" onclick="selectSize('${s}',this)">${s}</span>`).join('');
    } else {
      sw.style.display = 'none';
    }
  }

  updateModalTotal();
  const modal = document.getElementById('prodModal');
  if (modal) modal.classList.add('open');
}

function updateModalTotal() {
  if (!currentModalProduct) return;
  const el = document.getElementById('modalTotalVal');
  if (el) el.textContent = fmtPrice(currentModalProduct.price * modalQty);
}

function selectSize(s, el) {
  selectedSize = s;
  document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function closeProdModal() {
  const m = document.getElementById('prodModal');
  if (m) m.classList.remove('open');
}

function changeModalQty(d) {
  modalQty = Math.max(1, modalQty + d);
  const el = document.getElementById('modalQty');
  if (el) el.textContent = modalQty;
  updateModalTotal();
}

function addToCartFromModal() {
  if (!currentModalProduct) return;
  const p = currentModalProduct;
  const t = window.T && window.T[window.currentLang || 'en'];
  const info = t && t.prods[p.id] ? t.prods[p.id] : { n: p.emoji };
  const key   = p.id + (selectedSize ? '-' + selectedSize : '');
  const label = info.n + (selectedSize ? ' (' + selectedSize + ')' : '');
  const ex = cart.find(i => i.id === key);
  if (ex) ex.qty += modalQty;
  else cart.push({ id: key, name: label, emoji: p.emoji, price: p.price, qty: modalQty });
  saveCart(); updateCart(); closeProdModal();
  showToast((t && t.toastAdded) || 'Added ✦');
}

function quickAdd(id) {
  const PD = window.PD;
  const t  = window.T && window.T[window.currentLang || 'en'];
  if (!PD) return;
  const p    = PD[id];
  const info = t && t.prods[id] ? t.prods[id] : { n: p.emoji };
  const ex   = cart.find(i => i.id === id);
  if (ex) ex.qty++; else cart.push({ id, name: info.n, emoji: p.emoji, price: p.price, qty: 1 });
  saveCart(); updateCart();
  showToast((t && t.toastAdded) || 'Added ✦');
}

function addToCart(id) { quickAdd(id); }

function saveCart() {
  // strip non-serialisable img objects
  const toSave = cart.map(i => {
    const { img, ...rest } = i;
    return rest;
  });
  localStorage.setItem(CART_KEY, JSON.stringify(toSave));
}

function updateCart() {
  const t     = window.T && window.T[window.currentLang || 'en'];
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const ce = document.getElementById('cartCount');
  if (ce) { ce.textContent = count; ce.style.display = count > 0 ? 'flex' : 'none'; }

  const cartTitle = document.getElementById('cartTitle');
  if (cartTitle && t) cartTitle.textContent = t.cartTitle || '🛒 Cart';

  const ie = document.getElementById('cartItems');
  const fe = document.getElementById('cartFooter');
  if (!ie) return;

  // show/hide discount section
  const ds = document.getElementById('discountSection');
  if (ds) ds.style.display = cart.length > 0 ? 'block' : 'none';

  if (!cart.length) {
    ie.innerHTML = `<div class="cart-empty">${t ? t.cartEmpty : 'Your cart is empty'}</div>`;
    if (fe) fe.style.display = 'none';
  } else {
    ie.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${fmtPrice(item.price * item.qty)}</div>
          <div class="cart-item-qty">
            <button onclick="cartQty(${i},-1)">−</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button onclick="cartQty(${i},1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
      </div>`).join('');

    if (fe) fe.style.display = 'block';
    const ctl = document.getElementById('cartTotalLabel');
    if (ctl && t) ctl.textContent = t.cartTotal || 'Total';
    refreshCartTotal();
    const cBtn = document.getElementById('checkoutBtn');
    if (cBtn && t) cBtn.textContent = t.checkout || 'Checkout →';
  }
}

function cartQty(i, d) {
  cart[i].qty = Math.max(1, cart[i].qty + d);
  saveCart(); updateCart();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  saveCart(); updateCart();
}

function openCart() {
  const cp = document.getElementById('cartPanel');
  const co = document.getElementById('cartOverlay');
  if (cp) cp.classList.add('open');
  if (co) co.classList.add('open');
}

function closeCart() {
  const cp = document.getElementById('cartPanel');
  const co = document.getElementById('cartOverlay');
  if (cp) cp.classList.remove('open');
  if (co) co.classList.remove('open');
}

function checkout() {
  const t = window.T && window.T[window.currentLang || 'en'];
  showToast((t && t.toastCheckout) || 'Order sent!');
  cart = [];
  saveCart(); updateCart(); closeCart();
}

function applyDiscount() {
  const inp = document.getElementById('discountInput');
  const msg = document.getElementById('discountMsg');
  if (!inp || !msg) return;
  const code = inp.value.trim().toUpperCase();
  if (DISCOUNT_CODES[code]) {
    activeDiscount = DISCOUNT_CODES[code];
    msg.innerHTML = `<span class="discount-badge">✦ ${activeDiscount.pct}% off applied!</span>`;
    refreshCartTotal();
    showToast('Discount ' + code + ': -' + activeDiscount.pct + '% ✦');
  } else {
    activeDiscount = null;
    msg.innerHTML = `<span class="discount-badge error">✕ Invalid code</span>`;
    refreshCartTotal();
  }
}

function refreshCartTotal() {
  if (!cart.length) return;
  const raw   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const final = activeDiscount ? Math.round(raw * (1 - activeDiscount.pct / 100)) : raw;
  const el    = document.getElementById('cartTotalVal');
  if (!el) return;
  if (activeDiscount) {
    el.innerHTML = `<span style="text-decoration:line-through;font-size:.85rem;opacity:.55;margin-right:.3rem">${fmtPrice(raw)}</span><span style="color:var(--gold)">${fmtPrice(final)}</span>`;
  } else {
    el.textContent = fmtPrice(raw);
  }
}

function applyRealImages() {
  document.querySelectorAll('.product-card').forEach(card => {
    const m = (card.getAttribute('onclick') || '').match(/openProdModal\((\d+)\)/);
    if (!m) return;
    const id = parseInt(m[1]);
    const imgs = window.PROD_IMGS && window.PROD_IMGS[id];
    if (imgs) {
      const sp = card.querySelector('.product-img span');
      if (sp) {
        const img = document.createElement('img');
        img.src = imgs[0]; img.className = 'prod-img-thumb'; img.alt = '';
        sp.replaceWith(img);
      }
    }
  });
}

// ── Export ──
window.fmtPrice           = fmtPrice;
window.renderProducts     = renderProducts;
window.renderPaper        = renderPaper;
window.addPaperToCart     = addPaperToCart;
window.addToCart          = addToCart;
window.quickAdd           = quickAdd;
window.openProdModal      = openProdModal;
window.closeProdModal     = closeProdModal;
window.changeModalQty     = changeModalQty;
window.addToCartFromModal = addToCartFromModal;
window.selectSize         = selectSize;
window.updateCart         = updateCart;
window.cartQty            = cartQty;
window.removeFromCart     = removeFromCart;
window.openCart           = openCart;
window.closeCart          = closeCart;
window.checkout           = checkout;
window.applyDiscount      = applyDiscount;
window.refreshCartTotal   = refreshCartTotal;

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  updateCart();
  let tries = 0;
  const iv = setInterval(() => {
    if (window.PD || ++tries > 40) {
      clearInterval(iv);
      renderProducts(window.currentCat || 'all');
    }
  }, 100);
});
