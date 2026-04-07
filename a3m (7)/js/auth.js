// ============================================================
// auth.js  –  A3M Print  –  حسابات + XP (localStorage + Firebase optional)
// ============================================================

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const XP_RANKS = [
  { name: '🪨 Iron',    cls: 'iron',    min: 0,    max: 100  },
  { name: '🥉 Bronze',  cls: 'bronze',  min: 100,  max: 500  },
  { name: '🥇 Gold',    cls: 'gold',    min: 500,  max: 1500 },
  { name: '💎 Diamond', cls: 'diamond', min: 1500, max: 4000 },
  { name: '⭐ Premium', cls: 'premium', min: 4000, max: 99999},
];

let currentUser = JSON.parse(localStorage.getItem("a3m_user") || "null");
window.currentUser = currentUser;

// ── Firebase Auth sync ──
onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    try {
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (snap.exists()) {
        currentUser = { ...snap.data(), uid: fbUser.uid, email: fbUser.email };
        localStorage.setItem("a3m_user", JSON.stringify(currentUser));
        window.currentUser = currentUser;
      }
    } catch(e) { /* offline */ }
  }
  if (typeof updateNavAccount === 'function') updateNavAccount();
});

function getXpRank(xp) {
  for (let i = XP_RANKS.length - 1; i >= 0; i--) {
    if (xp >= XP_RANKS[i].min) return { ...XP_RANKS[i], idx: i };
  }
  return { ...XP_RANKS[0], idx: 0 };
}

function openAccount() {
  const m = document.getElementById('accountModal');
  if (m) m.classList.add('open');
  currentUser ? showProfilePane() : showAuthPane();
}
function closeAccount() {
  const m = document.getElementById('accountModal');
  if (m) m.classList.remove('open');
}
function showAuthPane() {
  const ap = document.getElementById('authPane');
  const pp = document.getElementById('profilePane');
  if (ap) ap.style.display = 'block';
  if (pp) pp.style.display = 'none';
}
function showProfilePane() {
  const ap = document.getElementById('authPane');
  const pp = document.getElementById('profilePane');
  if (ap) ap.style.display = 'none';
  if (pp) pp.style.display = 'block';
  populateProfile();
}
function showRegister() {
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  if (lf) lf.style.display = 'none';
  if (rf) rf.style.display = 'block';
}
function showLogin() {
  const rf = document.getElementById('registerForm');
  const lf = document.getElementById('loginForm');
  if (rf) rf.style.display = 'none';
  if (lf) lf.style.display = 'block';
}

// ── Login (localStorage fallback, Firebase first) ──
async function doLogin() {
  const email = (document.getElementById('loginEmail') || {}).value?.trim() || '';
  const pass  = (document.getElementById('loginPass')  || {}).value || '';
  if (!email || !pass) { showToast('⚠️ Fill all fields'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('Welcome back ✦');
    closeAccount();
    updateNavAccount();
  } catch(e) {
    // fallback to localStorage
    const users = JSON.parse(localStorage.getItem('a3m_users') || '{}');
    if (users[email] && users[email].pass === pass) {
      currentUser = users[email];
      localStorage.setItem('a3m_user', JSON.stringify(currentUser));
      window.currentUser = currentUser;
      showProfilePane(); updateNavAccount();
      showToast('Welcome back ' + currentUser.name + ' ✦');
    } else {
      showToast('⚠️ Wrong email or password');
    }
  }
}

// ── Register (localStorage fallback, Firebase first) ──
async function doRegister() {
  const name  = (document.getElementById('regName')  || {}).value?.trim() || '';
  const user  = (document.getElementById('regUser')  || {}).value?.trim() || '';
  const email = (document.getElementById('regEmail') || {}).value?.trim() || '';
  const pass  = (document.getElementById('regPass')  || {}).value || '';
  if (!name || !email || !pass) { showToast('⚠️ Fill required fields'); return; }
  if (pass.length < 6) { showToast('⚠️ Password min 6 chars'); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const userData = {
      name, email,
      username: user || '@' + name.split(' ')[0].toLowerCase(),
      xp: 0, followers: 0, following: 0, designs: 0, sold: 0,
      joinDate: serverTimestamp()
    };
    await setDoc(doc(db, "users", cred.user.uid), userData);
    currentUser = { ...userData, uid: cred.user.uid, joinDate: new Date().toISOString() };
    localStorage.setItem("a3m_user", JSON.stringify(currentUser));
    window.currentUser = currentUser;
    showProfilePane(); updateNavAccount();
    showToast('Account created! Welcome ' + name + ' ✦');
  } catch(e) {
    // fallback localStorage
    const users = JSON.parse(localStorage.getItem('a3m_users') || '{}');
    if (users[email]) { showToast('⚠️ Email already registered'); return; }
    const uname = user || ('@' + name.split(' ')[0].toLowerCase());
    currentUser = { name, username: uname, email, pass, xp: 0, followers: 0, following: 0, designs: 0, sold: 0, joinDate: new Date().toISOString() };
    users[email] = currentUser;
    localStorage.setItem('a3m_users', JSON.stringify(users));
    localStorage.setItem('a3m_user', JSON.stringify(currentUser));
    window.currentUser = currentUser;
    showProfilePane(); updateNavAccount();
    showToast('Account created! Welcome ' + name + ' ✦');
  }
}

function doLogout() {
  currentUser = null; window.currentUser = null;
  localStorage.removeItem('a3m_user');
  showAuthPane(); updateNavAccount();
  showToast('Signed out ✦');
}

function populateProfile() {
  if (!currentUser) return;
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safe('accName', currentUser.name);
  safe('accUsername', currentUser.username || '@user');
  const letter = document.getElementById('accAvatarLetter');
  if (letter) letter.textContent = currentUser.name[0].toUpperCase();

  const xp   = currentUser.xp || 0;
  const rank = getXpRank(xp);
  const rankEl = document.getElementById('xpRankLabel');
  if (rankEl) { rankEl.textContent = rank.name; rankEl.className = 'xp-rank ' + rank.cls; }

  const next = XP_RANKS[Math.min(rank.idx + 1, XP_RANKS.length - 1)];
  const pct  = rank.idx === XP_RANKS.length - 1 ? 100 : Math.min(100, ((xp - rank.min) / (rank.max - rank.min)) * 100);
  const fill = document.getElementById('xpBarFill');
  if (fill) fill.style.width = pct + '%';
  safe('xpPtsLabel', xp + ' / ' + (rank.idx === XP_RANKS.length - 1 ? 'MAX' : rank.max) + ' XP');

  safe('statFollowers',  currentUser.followers || 0);
  safe('statFollowing',  currentUser.following || 0);
  safe('statDesigns',    currentUser.designs   || 0);
  safe('statSold',       currentUser.sold      || 0);
  safe('statFollowers2', currentUser.followers || 0);
  safe('statFollowing2', currentUser.following || 0);

  renderUserDesigns();
  renderUserOrders();
}

function renderUserDesigns() {
  const grid  = document.getElementById('designsGrid');
  if (!grid) return;
  const saved = JSON.parse(localStorage.getItem('a3m_designs') || '[]');
  grid.innerHTML = '<div class="design-thumb" onclick="closeAccount();openModePicker()" title="New">+</div>';
  saved.slice(-8).reverse().forEach(d => {
    const div = document.createElement('div');
    div.className = 'design-thumb';
    div.innerHTML = `<img src="${d.preview}" style="width:100%;height:100%;object-fit:cover;border-radius:7px"/>`;
    if (d.sold) div.innerHTML += `<span class="design-thumb-sold">${d.sold} sold</span>`;
    grid.appendChild(div);
  });
}

function renderUserOrders() {
  const orders = JSON.parse(localStorage.getItem('a3m_orders') || '[]');
  const el = document.getElementById('ordersList');
  if (!el) return;
  if (!orders.length) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--txt3)">No orders yet</div>'; return; }
  el.innerHTML = orders.slice(-10).reverse().map(o => `
    <div style="display:flex;align-items:center;gap:.8rem;padding:.7rem 0;border-bottom:1px solid var(--border)">
      <span style="font-size:1.5rem">${o.emoji || '📦'}</span>
      <div style="flex:1"><div style="font-weight:700;font-size:13px;color:var(--txt)">${o.name}</div><div style="font-size:11px;color:var(--txt3)">${o.date}</div></div>
      <div style="color:var(--accent);font-weight:700;font-size:13px">${o.price}</div>
    </div>`).join('');
}

function switchAccTab(tab) {
  document.querySelectorAll('.acc-tab').forEach((t, i) =>
    t.classList.toggle('active', ['profile','designs','orders','follow'][i] === tab));
  document.querySelectorAll('.acc-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('tab-' + tab);
  if (pane) pane.classList.add('active');
}

function updateNavAccount() {
  const btn = document.getElementById('accountNavBtn');
  if (!btn) return;
  if (currentUser) {
    btn.innerHTML = `<div class="acc-btn-avatar">${currentUser.name[0].toUpperCase()}</div> ${currentUser.name.split(' ')[0]}`;
    btn.style.color = 'var(--gold)';
    btn.style.borderColor = 'var(--gold)';
  } else {
    btn.innerHTML = '👤 Account';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

function _saveUser() {
  if (!currentUser) return;
  localStorage.setItem('a3m_user', JSON.stringify(currentUser));
  const u = JSON.parse(localStorage.getItem('a3m_users') || '{}');
  u[currentUser.email] = currentUser;
  localStorage.setItem('a3m_users', JSON.stringify(u));
}

// ── Export ──
window.getXpRank        = getXpRank;
window.openAccount      = openAccount;
window.closeAccount     = closeAccount;
window.showAuthPane     = showAuthPane;
window.showProfilePane  = showProfilePane;
window.showRegister     = showRegister;
window.showLogin        = showLogin;
window.doLogin          = doLogin;
window.doRegister       = doRegister;
window.doLogout         = doLogout;
window.populateProfile  = populateProfile;
window.switchAccTab     = switchAccTab;
window.updateNavAccount = updateNavAccount;
window._saveUser        = _saveUser;

if (currentUser) setTimeout(() => updateNavAccount(), 300);
