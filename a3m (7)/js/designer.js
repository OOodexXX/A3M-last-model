// ============================================================
// designer.js  –  A3M Print  –  Canvas Design Studio
// ============================================================

const PROD_EMOJI = { tshirt:"👕", mug:"☕", hat:"🧢", bag:"🎒", paper:"📄" };

const TEMPLATES = [
  {name:'Bold Logo', icon:'🅰', fn:()=>{ clearCanvas(); addTextLayer('YOUR BRAND',52,'Permanent Marker','#ffffff','center',250,230); addTextLayer('EST. 2024',20,'Bebas Neue','#c9a84c','center',250,285); }},
  {name:'Graffiti',  icon:'✏', fn:()=>{ clearCanvas(); addTextLayer('STREET',78,'Permanent Marker','#7c3aed','center',250,200); addTextLayer('STYLE',52,'Pacifico','#c9a84c','center',250,285); }},
  {name:'Minimal',   icon:'◻', fn:()=>{ clearCanvas(); addTextLayer('MINIMAL',60,'Bebas Neue','#ffffff','center',250,250); }},
  {name:'Script',    icon:'𝒮', fn:()=>{ clearCanvas(); addTextLayer('Hello',70,'Dancing Script','#333','center',250,210); }},
  {name:'Orbitron',  icon:'🛸', fn:()=>{ clearCanvas(); addTextLayer('FUTURE',55,'Orbitron','#7c3aed','center',250,230); addTextLayer('DESIGN',30,'Orbitron','#c9a84c','center',250,290); }},
  {name:'Classic',   icon:'🏅', fn:()=>{ clearCanvas(); addTextLayer('A3M',70,'Permanent Marker','#111','center',250,210); addTextLayer('PRINT STUDIO',22,'Bebas Neue','#111','center',250,290); }},
];
window.TEMPLATES = TEMPLATES;

// ── State ──
let layers          = [];
let selectedId      = null;
let activeTool      = "select";
let isDragging_d    = false;
let isResizing_d    = false;
let resizeHandle    = "";
let dragOffX        = 0, dragOffY = 0;
let resizeStartX    = 0, resizeStartY = 0;
let resizeStartW    = 0, resizeStartH = 0;
let resizeStartObjX = 0, resizeStartObjY = 0;
let history_d       = [];
let bgColorVal      = "#ffffff";
let canvasProdType  = "tshirt";
const HANDLE_SIZE   = 8;

let canvas, ctx;

function initCanvasRefs() {
  canvas = document.getElementById("designCanvas");
  if (!canvas) return false;
  ctx = canvas.getContext("2d");
  return true;
}

function nid() { return 'L' + (Date.now() + Math.random() * 1000 | 0).toString(36); }

function saveHist() {
  history_d.push(JSON.parse(JSON.stringify({ layers, bgColorVal, selectedId })));
  if (history_d.length > 40) history_d.shift();
}

function undoAction() {
  if (!history_d.length) return;
  const s = history_d.pop();
  layers = s.layers; bgColorVal = s.bgColorVal; selectedId = s.selectedId;
  drawAll();
}

// internal function — creates and pushes a text layer
function addTextLayer(text, fs, font, fill, align, x, y) {
  if (!ctx) return;
  ctx.font = `${fs}px '${font}'`;
  const w = ctx.measureText(text).width || fs * text.length * 0.6;
  const l = { id: nid(), type:'text', x, y, w: Math.max(w + 20, 60), h: fs * 1.4, text, font, fontSize: fs, fillColor: fill, textAlign: align || 'center', opacity: 100, rotation: 0, visible: true, flippedH: false, flippedV: false };
  layers.push(l); selectedId = l.id; drawAll();
}

function addRect(x, y, w, h, fill, stroke, strokeW, opacity) {
  const l = { id: nid(), type:'rect', x, y, w: w||150, h: h||80, fillColor: fill||'#7c3aed', strokeColor: stroke||'#c9a84c', strokeWidth: strokeW||2, opacity: opacity||100, rotation: 0, visible: true, flippedH: false, flippedV: false };
  layers.push(l); selectedId = l.id; drawAll();
}

function addCircle(x, y, r, fill, stroke, opacity) {
  const l = { id: nid(), type:'circle', x, y, w: r*2, h: r*2, fillColor: fill||'#7c3aed', strokeColor: stroke||'', strokeWidth: 2, opacity: opacity||100, rotation: 0, visible: true, flippedH: false, flippedV: false };
  layers.push(l); selectedId = l.id; drawAll();
}

function addTriangle(x, y, w, h, fill, stroke, opacity) {
  const l = { id: nid(), type:'triangle', x, y, w: w||120, h: h||100, fillColor: fill||'#7c3aed', strokeColor: stroke||'', strokeWidth: 2, opacity: opacity||100, rotation: 0, visible: true, flippedH: false, flippedV: false };
  layers.push(l); selectedId = l.id; drawAll();
}

// public button handler — reads the text panel inputs
function addText() {
  if (!canvas) return;
  saveHist();
  const text  = (document.getElementById('txtContent') || {}).value || 'Text';
  const fs    = parseInt((document.getElementById('txtSize')  || {}).value) || 40;
  const font  = (document.getElementById('txtFont')  || {}).value || 'Inter';
  const fill  = (document.getElementById('txtColor') || {}).value || '#000000';
  addTextLayer(text, fs, font, fill, 'center', 250, 250);
}

function addShape(type) {
  if (!canvas) return;
  saveHist();
  const fill  = (document.getElementById('shapeFill')    || {}).value || '#7c3aed';
  const stroke= (document.getElementById('shapeStroke')  || {}).value || '#c9a84c';
  const op    = parseInt((document.getElementById('shapeOpacity') || {}).value) || 100;
  const sw    = parseInt((document.getElementById('strokeW')      || {}).value) || 2;
  if (type === 'rect')    addRect(250, 250, 150, 80, fill, stroke, sw, op);
  else if (type === 'circle') addCircle(250, 250, 60, fill, stroke, op);
  else addTriangle(250, 250, 120, 100, fill, stroke, op);
}

function syncSelected() {
  const l = layers.find(x => x.id === selectedId); if (!l) return;
  if (l.type === 'text') {
    l.text      = (document.getElementById('txtContent') || {}).value || l.text;
    l.fontSize  = parseInt((document.getElementById('txtSize') || {}).value) || l.fontSize;
    l.font      = (document.getElementById('txtFont') || {}).value || l.font;
    l.fillColor = (document.getElementById('txtColor') || {}).value || l.fillColor;
    if (ctx) { ctx.font = `${l.fontSize}px '${l.font}'`; l.w = Math.max(ctx.measureText(l.text).width + 20, 60); }
    l.h = l.fontSize * 1.4;
  } else {
    l.fillColor   = (document.getElementById('shapeFill')    || {}).value || l.fillColor;
    l.strokeColor = (document.getElementById('shapeStroke')  || {}).value || l.strokeColor;
    l.strokeWidth = parseInt((document.getElementById('strokeW')      || {}).value) || l.strokeWidth;
    l.opacity     = parseInt((document.getElementById('shapeOpacity') || {}).value) || l.opacity;
    const opVal = document.getElementById('opVal'); if (opVal) opVal.textContent = l.opacity;
  }
  drawAll();
}

function setTxtAlign(a) {
  const l = layers.find(x => x.id === selectedId);
  if (l && l.type === 'text') { l.textAlign = a; drawAll(); }
}

function drawAll() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgColorVal && bgColorVal !== 'transparent') { ctx.fillStyle = bgColorVal; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.save(); ctx.globalAlpha = .05; ctx.font = '200px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#888'; ctx.fillText(PROD_EMOJI[canvasProdType] || '👕', 250, 250); ctx.restore();
  [...layers].filter(l => l.visible).forEach(l => drawLayer(l));
  renderLayers(); updateTransformPanel();
}

function drawLayer(l) {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = l.opacity / 100;
  ctx.translate(l.x, l.y);
  if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
  if (l.flippedH) ctx.scale(-1, 1);
  if (l.flippedV) ctx.scale(1, -1);
  const hw = l.w / 2, hh = l.h / 2;
  if (l.type === 'text') {
    ctx.font = `${l.fontSize}px '${l.font}'`;
    ctx.fillStyle = l.fillColor;
    ctx.textAlign = l.textAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.text, 0, 0);
  } else if (l.type === 'rect') {
    ctx.fillStyle = l.fillColor; ctx.fillRect(-hw, -hh, l.w, l.h);
    if (l.strokeColor && l.strokeWidth) { ctx.strokeStyle = l.strokeColor; ctx.lineWidth = l.strokeWidth; ctx.strokeRect(-hw, -hh, l.w, l.h); }
  } else if (l.type === 'circle') {
    ctx.beginPath(); ctx.arc(0, 0, Math.max(hw, 1), 0, Math.PI * 2);
    ctx.fillStyle = l.fillColor; ctx.fill();
    if (l.strokeColor && l.strokeWidth) { ctx.strokeStyle = l.strokeColor; ctx.lineWidth = l.strokeWidth; ctx.stroke(); }
  } else if (l.type === 'triangle') {
    ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, hh); ctx.lineTo(-hw, hh); ctx.closePath();
    ctx.fillStyle = l.fillColor; ctx.fill();
    if (l.strokeColor && l.strokeWidth) { ctx.strokeStyle = l.strokeColor; ctx.lineWidth = l.strokeWidth; ctx.stroke(); }
  } else if (l.type === 'image' && l.img) {
    ctx.drawImage(l.img, -hw, -hh, l.w, l.h);
  }
  ctx.restore();
  // selection handles
  if (l.id === selectedId) {
    ctx.save(); ctx.translate(l.x, l.y);
    if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
    ctx.strokeRect(-hw - 1, -hh - 1, l.w + 2, l.h + 2); ctx.setLineDash([]);
    getHandlePositions(l).forEach(h => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1;
      ctx.fillRect(h.lx - HANDLE_SIZE/2, h.ly - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(h.lx - HANDLE_SIZE/2, h.ly - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    });
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(0, -hh - 1); ctx.lineTo(0, -hh - 20); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c9a84c'; ctx.beginPath(); ctx.arc(0, -hh - 22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function getHandlePositions(l) {
  const hw = l.w / 2, hh = l.h / 2;
  return [
    {name:'nw',lx:-hw,ly:-hh},{name:'n',lx:0,ly:-hh},{name:'ne',lx:hw,ly:-hh},
    {name:'e',lx:hw,ly:0},{name:'se',lx:hw,ly:hh},{name:'s',lx:0,ly:hh},
    {name:'sw',lx:-hw,ly:hh},{name:'w',lx:-hw,ly:0}
  ];
}

function worldToLocal(l, wx, wy) {
  const dx = wx - l.x, dy = wy - l.y;
  const rad = -(l.rotation || 0) * Math.PI / 180;
  return { lx: dx*Math.cos(rad) - dy*Math.sin(rad), ly: dx*Math.sin(rad) + dy*Math.cos(rad) };
}

function hitTestLayer(l, wx, wy) {
  const loc = worldToLocal(l, wx, wy);
  return Math.abs(loc.lx) <= l.w/2 + 4 && Math.abs(loc.ly) <= l.h/2 + 4;
}

function hitTestHandle(l, wx, wy) {
  const handles = getHandlePositions(l);
  const loc = worldToLocal(l, wx, wy);
  for (const h of handles) {
    if (Math.abs(loc.lx - h.lx) <= HANDLE_SIZE && Math.abs(loc.ly - h.ly) <= HANDLE_SIZE) return h.name;
  }
  if (Math.abs(loc.lx) <= 6 && Math.abs(loc.ly + l.h/2 + 22) <= 6) return 'rotate';
  return null;
}

function getCanvasXY(e) {
  if (!canvas) return { x: 0, y: 0 };
  const t = e.touches ? e.touches[0] : e;
  const r = canvas.getBoundingClientRect();
  return { x: (t.clientX - r.left) * (canvas.width / r.width), y: (t.clientY - r.top) * (canvas.height / r.height) };
}

function _onPointerDown(e) {
  const {x, y} = getCanvasXY(e);
  if (activeTool === 'select') {
    const sel = layers.find(l => l.id === selectedId);
    if (sel) {
      const h = hitTestHandle(sel, x, y);
      if (h) {
        if (h === 'rotate') { isResizing_d = true; resizeHandle = 'rotate'; resizeStartX = x; resizeStartY = y; }
        else { isResizing_d = true; resizeHandle = h; resizeStartX = x; resizeStartY = y; resizeStartW = sel.w; resizeStartH = sel.h; resizeStartObjX = sel.x; resizeStartObjY = sel.y; }
        return;
      }
    }
    let hit = null;
    for (let i = layers.length - 1; i >= 0; i--) { if (layers[i].visible && hitTestLayer(layers[i], x, y)) { hit = layers[i]; break; } }
    if (hit) { selectedId = hit.id; isDragging_d = true; dragOffX = x - hit.x; dragOffY = y - hit.y; }
    else selectedId = null;
    drawAll();
  } else if (activeTool === 'text') {
    saveHist();
    const text = (document.getElementById('txtContent') || {}).value || 'Text';
    const fs   = parseInt((document.getElementById('txtSize')  || {}).value) || 40;
    const font = (document.getElementById('txtFont')  || {}).value || 'Inter';
    const fill = (document.getElementById('txtColor') || {}).value || '#000000';
    addTextLayer(text, fs, font, fill, 'center', x, y);
    setTool('select');
  } else if (activeTool === 'rect') {
    saveHist();
    addRect(x, y, 150, 80, (document.getElementById('shapeFill')||{}).value, (document.getElementById('shapeStroke')||{}).value, parseInt((document.getElementById('strokeW')||{}).value)||2, parseInt((document.getElementById('shapeOpacity')||{}).value)||100);
    setTool('select');
  } else if (activeTool === 'circle') {
    saveHist();
    addCircle(x, y, 60, (document.getElementById('shapeFill')||{}).value, (document.getElementById('shapeStroke')||{}).value, parseInt((document.getElementById('shapeOpacity')||{}).value)||100);
    setTool('select');
  } else if (activeTool === 'triangle') {
    saveHist();
    addTriangle(x, y, 120, 100, (document.getElementById('shapeFill')||{}).value, (document.getElementById('shapeStroke')||{}).value, parseInt((document.getElementById('shapeOpacity')||{}).value)||100);
    setTool('select');
  }
}

function _onPointerMove(e) {
  if (!canvas) return;
  const {x, y} = getCanvasXY(e);
  const sel = layers.find(l => l.id === selectedId);
  if (isDragging_d && sel) { sel.x = x - dragOffX; sel.y = y - dragOffY; drawAll(); }
  else if (isResizing_d && sel) {
    const dx = x - resizeStartX, dy = y - resizeStartY;
    if (resizeHandle === 'rotate') {
      const angle = Math.atan2(x - sel.x, -(y - sel.y)) * 180 / Math.PI;
      sel.rotation = Math.round(angle);
      const objRot = document.getElementById('objRot'); if (objRot) objRot.value = sel.rotation;
      const rotVal = document.getElementById('rotVal'); if (rotVal) rotVal.textContent = sel.rotation + '°';
    } else {
      if (resizeHandle.includes('e')) sel.w = Math.max(20, resizeStartW + dx);
      if (resizeHandle.includes('s')) sel.h = Math.max(10, resizeStartH + dy);
      if (resizeHandle.includes('w')) { sel.w = Math.max(20, resizeStartW - dx); sel.x = resizeStartObjX + dx/2; }
      if (resizeHandle.includes('n')) { sel.h = Math.max(10, resizeStartH - dy); sel.y = resizeStartObjY + dy/2; }
      if (sel.type === 'circle') sel.h = sel.w;
    }
    drawAll();
  }
  if (activeTool === 'select' && sel) {
    const h = hitTestHandle(sel, x, y);
    canvas.style.cursor = h === 'rotate' ? 'crosshair' : h ? 'nwse-resize' : hitTestLayer(sel, x, y) ? 'move' : 'default';
  }
}

function _onPointerUp() {
  if (isDragging_d || isResizing_d) saveHist();
  isDragging_d = false; isResizing_d = false; resizeHandle = '';
}

function setTool(t) {
  activeTool = t;
  document.querySelectorAll('.d-tool-btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('tool-' + t); if (btn) btn.classList.add('active');
  if (canvas) canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
}

function deleteSelected() {
  if (!selectedId) return;
  saveHist(); layers = layers.filter(l => l.id !== selectedId); selectedId = null; drawAll();
}
function duplicateSelected() {
  const l = layers.find(x => x.id === selectedId); if (!l) return;
  saveHist(); const c = JSON.parse(JSON.stringify(l));
  if (l.img) c.img = l.img;
  c.id = nid(); c.x += 20; c.y += 20; layers.push(c); selectedId = c.id; drawAll();
}
function bringForward() { const i = layers.findIndex(x => x.id === selectedId); if (i < layers.length-1) { [layers[i],layers[i+1]]=[layers[i+1],layers[i]]; drawAll(); } }
function sendBackward() { const i = layers.findIndex(x => x.id === selectedId); if (i > 0) { [layers[i],layers[i-1]]=[layers[i-1],layers[i]]; drawAll(); } }
function flipH() { const l = layers.find(x => x.id === selectedId); if (l) { l.flippedH = !l.flippedH; drawAll(); } }
function flipV() { const l = layers.find(x => x.id === selectedId); if (l) { l.flippedV = !l.flippedV; drawAll(); } }

function clearCanvas() {
  saveHist(); layers = []; selectedId = null; bgColorVal = '#ffffff';
  const bgEl = document.getElementById('bgColor'); if (bgEl) bgEl.value = '#ffffff';
  drawAll();
}

function applyTransform() {
  const l = layers.find(x => x.id === selectedId); if (!l) return;
  l.w = Math.max(10, parseFloat((document.getElementById('objW')||{}).value) || l.w);
  l.h = Math.max(5,  parseFloat((document.getElementById('objH')||{}).value) || l.h);
  l.x = parseFloat((document.getElementById('objX')||{}).value) || l.x;
  l.y = parseFloat((document.getElementById('objY')||{}).value) || l.y;
  l.rotation = parseFloat((document.getElementById('objRot')||{}).value) || 0;
  const rotVal = document.getElementById('rotVal'); if (rotVal) rotVal.textContent = l.rotation + '°';
  if (l.type === 'circle') l.h = l.w;
  drawAll();
}

function updateTransformPanel() {
  const l = layers.find(x => x.id === selectedId); if (!l) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('objW', Math.round(l.w)); set('objH', Math.round(l.h));
  set('objX', Math.round(l.x)); set('objY', Math.round(l.y));
  set('objRot', l.rotation || 0); setT('rotVal', (l.rotation || 0) + '°');
  if (l.type === 'text') {
    set('txtContent', l.text); set('txtSize', l.fontSize);
    setT('txtSzVal', l.fontSize); set('txtColor', l.fillColor);
    if (l.font) set('txtFont', l.font);
  } else {
    set('shapeFill', l.fillColor || '#7c3aed');
    set('shapeStroke', l.strokeColor || '#c9a84c');
    set('shapeOpacity', l.opacity || 100);
    setT('opVal', l.opacity || 100);
  }
}

function renderLayers() {
  const ll = document.getElementById('layersList'); if (!ll) return;
  ll.innerHTML = [...layers].reverse().map(l => `
    <div class="layer-item${l.id === selectedId ? ' selected' : ''}" onclick="selectLayer('${l.id}')">
      <span class="layer-icon">${l.type==='text'?'T':l.type==='image'?'🖼':l.type==='circle'?'○':l.type==='triangle'?'△':'▭'}</span>
      <span class="layer-name">${l.type==='text'?l.text:l.type+' layer'}</span>
      <div class="layer-actions">
        <button class="layer-act-btn" onclick="event.stopPropagation();toggleVis('${l.id}')">${l.visible?'👁':'○'}</button>
        <button class="layer-act-btn" onclick="event.stopPropagation();selectedId='${l.id}';deleteSelected()">✕</button>
      </div>
    </div>`).join('');
}

function selectLayer(id) { selectedId = id; drawAll(); }
function toggleVis(id) { const l = layers.find(x => x.id === id); if (l) { l.visible = !l.visible; drawAll(); } }

function uploadImage(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      saveHist();
      const sc = Math.min(250/img.width, 250/img.height);
      const w = img.width * sc, h = img.height * sc;
      const l = { id: nid(), type:'image', x:250, y:250, w, h, img, fillColor:'', strokeColor:'', strokeWidth:0, opacity:100, rotation:0, visible:true, flippedH:false, flippedV:false };
      layers.push(l); selectedId = l.id; drawAll(); showToast('Image added ✦');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  ev.target.value = '';
}

function changeProduct() {
  const cp = document.getElementById('canvasProduct');
  if (cp) canvasProdType = cp.value;
  drawAll();
}

function downloadDesign() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'A3M_Design.png';
  link.href = canvas.toDataURL();
  link.click();
  showToast('Design exported ✦');
}

function saveToCart() {
  const name = 'Custom Design (' + canvasProdType + ')';
  // access global cart from cart.js
  if (typeof window.cart !== 'undefined') {
    const ex = window.cart.find(i => i.id === 'custom');
    if (ex) ex.qty++; else window.cart.push({ id:'custom', name, emoji:'🎨', price:1500, qty:1 });
  }
  if (typeof updateCart === 'function') updateCart();
  if (typeof closeDesigner === 'function') closeDesigner();
  const t = window.T && window.T[window.currentLang || 'en'];
  showToast((t && t.toastAdded) || 'Added ✦');
}

function buildTemplates() {
  const tg = document.getElementById('templatesGrid'); if (!tg) return;
  tg.innerHTML = TEMPLATES.map((t, i) => `
    <div class="template-thumb" onclick="TEMPLATES[${i}].fn();showToast('Template applied ✦')">
      <span class="t-icon">${t.icon}</span><span>${t.name}</span>
    </div>`).join('');
}

function openDesigner(mode) {
  if (typeof closeModePicker === 'function') closeModePicker();
  if (!initCanvasRefs()) { console.error("designCanvas not found"); return; }
  clearCanvas();
  const titleEl = document.getElementById('topbarTitle');
  if (mode === 'template') {
    if (TEMPLATES.length > 0) TEMPLATES[0].fn();
    if (titleEl) titleEl.textContent = 'Templates Mode';
  } else {
    if (titleEl) titleEl.textContent = 'Scratch Mode';
  }
  const dm = document.getElementById('designerModal');
  if (dm) dm.classList.add('open');
  setTimeout(() => { buildTemplates(); drawAll(); }, 100);
  // bind events after canvas is ready
  canvas.addEventListener('mousedown', _onPointerDown);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); _onPointerDown(e); }, { passive: false });
  canvas.addEventListener('mousemove', _onPointerMove);
  canvas.addEventListener('touchmove', e => { e.preventDefault(); _onPointerMove(e); }, { passive: false });
  canvas.addEventListener('mouseup', _onPointerUp);
  canvas.addEventListener('touchend', e => { e.preventDefault(); _onPointerUp(); }, { passive: false });
  // bg color
  const bgEl = document.getElementById('bgColor');
  if (bgEl) bgEl.addEventListener('input', () => { bgColorVal = bgEl.value; drawAll(); });
}

function closeDesigner() {
  const dm = document.getElementById('designerModal');
  if (dm) dm.classList.remove('open');
}

function initDesigner(mode) {
  openDesigner(mode);
}

// ── Export ──
window.initDesigner      = initDesigner;
window.openDesigner      = openDesigner;
window.closeDesigner     = closeDesigner;
window.buildTemplates    = buildTemplates;
window.setTool           = setTool;
window.addText           = addText;
window.addShape          = addShape;
window.uploadImage       = uploadImage;
window.downloadDesign    = downloadDesign;
window.saveToCart        = saveToCart;
window.deleteSelected    = deleteSelected;
window.duplicateSelected = duplicateSelected;
window.bringForward      = bringForward;
window.sendBackward      = sendBackward;
window.flipH             = flipH;
window.flipV             = flipV;
window.clearCanvas       = clearCanvas;
window.undoAction        = undoAction;
window.selectLayer       = selectLayer;
window.toggleVis         = toggleVis;
window.syncSelected      = syncSelected;
window.setTxtAlign       = setTxtAlign;
window.applyTransform    = applyTransform;
window.changeProduct     = changeProduct;
