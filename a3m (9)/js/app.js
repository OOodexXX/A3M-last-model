// ============================================================
// app.js  –  A3M Print  –  ثيم، لغة، سايدبار، فورم الطلب
// ============================================================

const THEMES = [
  "blue-dark","blue-light","beige-dark","beige-light",
  "purple-dark","purple-light","white-light","white-dark"
];
const DEFAULT_THEME = "blue-dark";

let isDark      = true;
let currentLang = "en";

// ── Theme ──
function applyTheme(theme) {
  THEMES.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(theme);
  localStorage.setItem("a3m_theme", theme);
}
function loadTheme() {
  applyTheme(localStorage.getItem("a3m_theme") || DEFAULT_THEME);
}
function setTheme(theme) {
  if (THEMES.includes(theme)) applyTheme(theme);
}

function setCurrency(c) {
  window.currency = c;
  const btnDZD = document.getElementById('btnDZD');
  const btnUSD = document.getElementById('btnUSD');
  if (btnDZD) btnDZD.classList.toggle('active', c === 'DZD');
  if (btnUSD) btnUSD.classList.toggle('active', c === 'USD');
  if (typeof renderProducts === 'function') renderProducts(window.currentCat || 'all');
  if (typeof updateCart === 'function') updateCart();
  if (window.currentModalProduct && typeof updateModalTotal === 'function') updateModalTotal();
}

function applyLang(lang) {
  currentLang = lang;
  window.currentLang = lang;
  localStorage.setItem("a3m_lang", lang);
  const t = window.T && window.T[lang];
  if (!t) return;

  document.body.setAttribute('dir', t.dir);
  document.body.style.fontFamily = lang === 'ar' ? "'Cairo',sans-serif" : "'Inter',sans-serif";

  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const safeHTML = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = `${t.flag} ${t.code} ▾`;

  document.querySelectorAll('.lang-option').forEach((el, i) =>
    el.classList.toggle('active', ['en','fr','ar'][i] === lang));

  safe('n-home', t.home); safe('n-products', t.products);
  safe('n-design', t.design); safe('n-contact', t.contact);
  safe('heroEyebrow', t.eyebrow); safe('heroSub', t.sub);
  safe('shopNowBtn', t.shopNow); safe('startDesignBtn', t.startDesign);
  safe('startDesignBtn2', t.startDesign2);
  safe('sectionSub', t.secSub);
  safe('designNowBtn', t.designNow);
  safe('footerTagline', t.footer);
  safe('modePickerSub', t.modePickerSub);
  safe('modeTemplate', t.modeTemplate); safe('modeTemplateDesc', t.modeTemplateDesc);
  safe('modeScratch', t.modeScratch); safe('modeScratchDesc', t.modeScratchDesc);
  safe('orderTitle', t.orderTitle); safe('sb-order', t.sbOrder);
  safe('sb-disc', t.sbDisc || 'Discounts');

  const themeLabel = document.getElementById('themeLabel');
  if (themeLabel) themeLabel.textContent = isDark ? t.thDark : t.thLight;

  const bannerMain = document.getElementById('bannerMain');
  if (bannerMain) bannerMain.innerHTML = t.bannerMain + '<span id="bannerSub"> ' + t.bannerSub + '</span>';

  const secTitle = document.getElementById('sectionTitle');
  if (secTitle) secTitle.innerHTML = t.secTitle;

  // Translate all category filter buttons
  const catBtnMap = {
    'c-all':    t.cAll,
    'c-tshirt': t.cTshirt,
    'c-hoodie': t.cHoodie || '🧥 Hoodies',
    'c-hat':    t.cHat    || '🧢 Caps',
    'c-mug':    t.cMug    || '☕ Mugs',
    'c-bag':    t.cBag,
    'c-laser':  t.cLaser,
    'c-paper':  t.cPaper,
  };
  Object.entries(catBtnMap).forEach(([id, val]) => { if (val) safe(id, val); });

  ['fName','fPhone','fEmail','fProduct','fQty','fBudget','fPrintType','fCity','fNotes','submitBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el && t[id]) el.textContent = t[id];
  });

  if (typeof updateCart === 'function') updateCart();
  if (typeof renderProducts === 'function') renderProducts(window.currentCat || 'all');

  // ── ترجمة الفوتر ──
  safe('footerTagline', t.footer);
  safe('footerLinksTitle', t.footerLinksTitle || (lang === 'ar' ? 'روابط سريعة' : lang === 'fr' ? 'Liens rapides' : 'Quick Links'));
  safe('footerContactTitle', t.footerContactTitle || (lang === 'ar' ? 'تواصل معنا' : lang === 'fr' ? 'Nous contacter' : 'Contact Us'));
  safe('footerCopy', t.footerCopy || (lang === 'ar' ? '© 2024 A3M Print. جميع الحقوق محفوظة.' : '© 2024 A3M Print. All rights reserved.'));

  // ── ترجمة روابط الفوتر ──
  const footerLinks = document.querySelectorAll('.footer-links a');
  const footerLinkTexts = {
    ar: ['🛍️ المنتجات', '🎨 تصميم', '📋 طلب مخصص', '👤 حسابي'],
    en: ['🛍️ Products', '🎨 Design', '📋 Custom Order', '👤 My Account'],
    fr: ['🛍️ Produits', '🎨 Créer', '📋 Commande', '👤 Mon Compte'],
  };
  if (footerLinks.length && footerLinkTexts[lang]) {
    footerLinks.forEach((a, i) => { if (footerLinkTexts[lang][i]) a.textContent = footerLinkTexts[lang][i]; });
  }

  // ── ترجمة trust badges في checkout ──
  const trustBadges = document.querySelectorAll('.trust-badge');
  const trustTexts = {
    ar: ['🔒 دفع آمن', '✅ جودة مضمونة', '🔄 استرداد سهل', '📞 دعم 24/7'],
    en: ['🔒 Secure Payment', '✅ Quality Guaranteed', '🔄 Easy Returns', '📞 24/7 Support'],
    fr: ['🔒 Paiement sécurisé', '✅ Qualité garantie', '🔄 Retours faciles', '📞 Support 24/7'],
  };
  if (trustBadges.length && trustTexts[lang]) {
    trustBadges.forEach((b, i) => { if (trustTexts[lang][i]) b.textContent = trustTexts[lang][i]; });
  }

  // ── ترجمة زر الحساب ──
  const accBtn = document.getElementById('accountNavBtn');
  if (accBtn && !window.currentUser) {
    accBtn.innerHTML = lang === 'ar' ? '👤 حساب' : lang === 'fr' ? '👤 Compte' : '👤 Account';
  }

  // ── ترجمة نصوص السلة ──
  const cartTitle = document.getElementById('cartTitle');
  if (cartTitle && t.cartTitle) cartTitle.textContent = t.cartTitle;
}

function setLang(lang) {
  currentLang = lang;
  window.currentLang = lang;
  localStorage.setItem("a3m_lang", lang);
  // Close any open lang dropdowns
  ['langDropdown','globeDd','langDrop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  applyLang(lang);
}

function toggleLangMenu() {
  const dd = document.getElementById('langDropdown');
  if (dd) dd.classList.toggle('open');
}

function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';
  if (themeLabel && window.T && window.T[currentLang]) {
    themeLabel.textContent = isDark ? window.T[currentLang].thDark : window.T[currentLang].thLight;
  }
}

function filterCat(cat, el) {
  window.currentCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  // Show/hide paper section
  const paperSection = document.getElementById('paperSection');
  if (paperSection) paperSection.style.display = (cat === 'paper') ? 'block' : 'none';

  if (typeof renderProducts === 'function') renderProducts(cat);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function openSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

function toggleSB(el, subId) {
  el.classList.toggle('open');
  const sub = document.getElementById('sub-' + subId);
  if (sub) sub.style.display = el.classList.contains('open') ? 'block' : 'none';
}

function filterAndClose(cat) {
  closeSidebar();
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('c-' + cat) || document.getElementById('c-all');
  if (btn) btn.classList.add('active');
  window.currentCat = cat;
  if (typeof renderProducts === 'function') renderProducts(cat);
  const section = document.querySelector('.section');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

function showPrint(type) {
  if (!window.PRINTS || !window.PRINTS[type]) return;
  const lang = window.currentLang in window.PRINTS[type] ? window.currentLang : 'en';
  showToast(window.PRINTS[type][lang].substring(0, 60) + '...');
  setTimeout(() => alert(window.PRINTS[type][lang]), 100);
}

function openModePicker() {
  const mp = document.getElementById('modePicker');
  if (mp) mp.classList.add('open');
}
function closeModePicker() {
  const mp = document.getElementById('modePicker');
  if (mp) mp.classList.remove('open');
}

function openOrderForm() {
  const fc = document.getElementById('formContent');
  const fs = document.getElementById('formSuccess');
  const om = document.getElementById('orderModal');
  if (fc) fc.style.display = 'block';
  if (fs) fs.style.display = 'none';
  if (om) om.classList.add('open');
  closeSidebar();
}
function closeOrderForm() {
  const om = document.getElementById('orderModal');
  if (om) om.classList.remove('open');
}

function openOrderFromDesign() {
  if (typeof closeDesigner === 'function') closeDesigner();
  openOrderForm();
}

function submitOrder() {
  const name    = (document.getElementById('inp-name')    || {}).value?.trim() || '';
  const phone   = (document.getElementById('inp-phone')   || {}).value?.trim() || '';
  const product = (document.getElementById('inp-product') || {}).value || '';
  const qty     = (document.getElementById('inp-qty')     || {}).value || '';
  if (!name || !phone || !product || !qty) { showToast('⚠️ Please fill required fields'); return; }
  const fc = document.getElementById('formContent');
  const fs = document.getElementById('formSuccess');
  if (fc) fc.style.display = 'none';
  if (fs) fs.style.display = 'block';
  const t = window.T && window.T[currentLang];
  if (t) {
    const st = document.getElementById('successTitle');
    const sm = document.getElementById('successMsg');
    if (st) st.textContent = t.successTitle;
    if (sm) sm.textContent = t.successMsg;
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function goToCheckout() {
  const inPages = window.location.pathname.includes('/pages/');
  window.location.href = inPages ? 'checkout.html' : 'pages/checkout.html';
}

// ── Export ──
window.applyTheme         = applyTheme;
window.loadTheme          = loadTheme;
window.setTheme           = setTheme;
window.setCurrency        = setCurrency;
window.applyLang          = applyLang;
window.setLang            = setLang;
window.toggleLangMenu     = toggleLangMenu;
window.toggleTheme        = toggleTheme;
window.filterCat          = filterCat;
window.scrollToTop        = scrollToTop;
window.openSidebar        = openSidebar;
window.closeSidebar       = closeSidebar;
window.toggleSB           = toggleSB;
window.filterAndClose     = filterAndClose;
window.showPrint          = showPrint;
window.openModePicker     = openModePicker;
window.closeModePicker    = closeModePicker;
window.openOrderForm      = openOrderForm;
window.closeOrderForm     = closeOrderForm;
window.openOrderFromDesign = openOrderFromDesign;
window.submitOrder        = submitOrder;
window.showToast          = showToast;
window.goToCheckout       = goToCheckout;
window.currentLang        = currentLang;

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  const savedLang = localStorage.getItem("a3m_lang") || "ar";
  // delay so data.js can populate window.T
  setTimeout(() => applyLang(savedLang), 50);

  document.addEventListener("click", e => {
    if (!e.target.closest(".lang-wrapper")) {
      const dd = document.getElementById("langDropdown");
      if (dd) dd.classList.remove("open");
    }
  });

  const pm = document.getElementById("prodModal");
  if (pm) pm.addEventListener("click", e => { if (e.target === pm && typeof closeProdModal === 'function') closeProdModal(); });
  const am = document.getElementById("accountModal");
  if (am) am.addEventListener("click", e => { if (e.target === am && typeof closeAccount === 'function') closeAccount(); });
  const om = document.getElementById("orderModal");
  if (om) om.addEventListener("click", e => { if (e.target === om) closeOrderForm(); });
  const mpEl = document.getElementById("modePicker");
  if (mpEl) mpEl.addEventListener("click", e => { if (e.target === mpEl) closeModePicker(); });
});
export {};
