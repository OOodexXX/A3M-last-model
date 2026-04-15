// ============================================================
// designer.js  –  A3M Print  –  Pro Canvas Design Studio v3
// ============================================================

(function () {
  "use strict";

  const PROD_EMOJI = { tshirt: "👕", mug: "☕", hat: "🧢", bag: "🎒", paper: "📄" };
  const HANDLE_SIZE = 9;

  // ── Extended Templates ──
  const TEMPLATES = [
    { name: "Bold Logo",    icon: "🅰", fn: () => { clearCanvas(); setBg("#111111"); addTextLayer("YOUR BRAND", 52, "Permanent Marker", "#ffffff", "center", 250, 210); addTextLayer("EST. 2024", 20, "Bebas Neue", "#c9a84c", "center", 250, 275); addRect(250, 310, 280, 2, "#c9a84c", "", 0, 80); } },
    { name: "Graffiti",     icon: "✏", fn: () => { clearCanvas(); setBg("#0a0a0a"); addTextLayer("STREET", 78, "Permanent Marker", "#7c3aed", "center", 250, 200); addTextLayer("STYLE", 52, "Pacifico", "#c9a84c", "center", 250, 290); } },
    { name: "Minimal",      icon: "◻", fn: () => { clearCanvas(); setBg("#ffffff"); addRect(250, 250, 320, 320, "#f5f5f5", "#111111", 1, 100); addTextLayer("MINIMAL", 58, "Bebas Neue", "#111111", "center", 250, 245); } },
    { name: "Script",       icon: "𝒮", fn: () => { clearCanvas(); setBg("#fafaf5"); addTextLayer("Hello", 70, "Dancing Script", "#111111", "center", 250, 210); addTextLayer("World", 40, "Dancing Script", "#c9a84c", "center", 250, 285); } },
    { name: "Orbitron",     icon: "🛸", fn: () => { clearCanvas(); setBg("#050511"); addCircle(250, 190, 70, "#7c3aed", "#c9a84c", 85); addTextLayer("FUTURE", 55, "Orbitron", "#7c3aed", "center", 250, 310); addTextLayer("DESIGN", 26, "Orbitron", "#c9a84c", "center", 250, 370); } },
    { name: "Classic",      icon: "🏅", fn: () => { clearCanvas(); setBg("#ffffff"); addRect(250, 250, 400, 400, "#111111", "", 0, 100); addTextLayer("A3M", 70, "Permanent Marker", "#ffffff", "center", 250, 210); addTextLayer("PRINT STUDIO", 22, "Bebas Neue", "#c9a84c", "center", 250, 295); addRect(250, 340, 200, 2, "#c9a84c", "", 0, 100); } },
    { name: "Neon Glow",    icon: "💡", fn: () => { clearCanvas(); setBg("#050505"); addTextLayer("NEON", 88, "Bebas Neue", "#00ffcc", "center", 250, 220); addTextLayer("VIBES", 55, "Bebas Neue", "#ff00ff", "center", 250, 310); } },
    { name: "Vintage",      icon: "🎖", fn: () => { clearCanvas(); setBg("#f5e6c8"); addCircle(250, 200, 80, "#8B4513", "", 90); addTextLayer("SINCE", 22, "Bebas Neue", "#f5e6c8", "center", 250, 180); addTextLayer("2024", 36, "Bebas Neue", "#f5e6c8", "center", 250, 218); addTextLayer("AUTHENTIC GOODS", 20, "Bebas Neue", "#8B4513", "center", 250, 330); } },
    { name: "Dark Luxury",  icon: "💎", fn: () => { clearCanvas(); setBg("#0a0a0a"); addRect(250, 250, 360, 360, "#0f0f0f", "#c9a84c", 1, 100); addTextLayer("LUXE", 66, "Dancing Script", "#c9a84c", "center", 250, 230); addTextLayer("COLLECTION", 20, "Bebas Neue", "#888", "center", 250, 295); addRect(250, 330, 150, 1, "#c9a84c", "", 0, 60); } },
    { name: "Cyber Punk",   icon: "⚡", fn: () => { clearCanvas(); setBg("#0d001a"); addRect(250, 130, 400, 55, "#ff003c", "", 0, 90); addTextLayer("CYBER", 66, "Orbitron", "#00ffff", "center", 250, 220); addTextLayer("PUNK 2077", 30, "Orbitron", "#ff003c", "center", 250, 295); addRect(250, 330, 400, 2, "#00ffff", "", 0, 70); } },
    { name: "Badge",        icon: "🔰", fn: () => { clearCanvas(); setBg("#ffffff"); addCircle(250, 230, 120, "#1a237e", "#c9a84c", 100); addCircle(250, 230, 90, "#283593", "", 100); addTextLayer("BRAND", 34, "Bebas Neue", "#ffffff", "center", 250, 218); addTextLayer("★ OFFICIAL ★", 16, "Bebas Neue", "#c9a84c", "center", 250, 255); } },
    { name: "Pastel Dream", icon: "🌸", fn: () => { clearCanvas(); setBg("#fff0f5"); addCircle(150, 150, 60, "#ffb3c6", "", 60); addCircle(360, 350, 80, "#c1b3ff", "", 50); addTextLayer("dream", 68, "Dancing Script", "#d63384", "center", 250, 240); addTextLayer("& create", 36, "Dancing Script", "#6f42c1", "center", 250, 310); } },
  ];

  window.TEMPLATES = TEMPLATES;

  let layers = [];
  let selectedIds = new Set(); // multi-select support
  let selectedId = null;
  let activeTool = "select";
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = "";
  let dragOffX = 0, dragOffY = 0;
  let resizeStartX = 0, resizeStartY = 0;
  let resizeStartW = 0, resizeStartH = 0;
  let resizeStartObjX = 0, resizeStartObjY = 0;
  let history = [], redoStack = [];
  let bgColorVal = "#ffffff";
  let canvasProdType = "tshirt";
  let canvas = null;
  let ctx = null;
  let listenersBound = false;
  let aiPanelInjected = false;

  // ── Grid & Snapping ──
  let showGrid = false;
  let snapToGrid = false;
  const GRID_SIZE = 25;

  // ── Ruler/guidelines ──
  let guides = [];

  // ── Ruler settings ──
  let showRulers = true;
  const RULER_SIZE = 22;
  const CANVAS_PX_TO_CM = 0.026458;
  let rulerUnit = "px";
  let mouseRulerX = -1;
  let mouseRulerY = -1;

  function setBg(color) {
    bgColorVal = color;
    const bgEl = document.getElementById("bgColor");
    if (bgEl) bgEl.value = color;
  }

  function showToast(msg, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast-msg show" + (type === "success" ? " toast-success" : type === "error" ? " toast-error" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  function initCanvasRefs() {
    const el = document.getElementById("designCanvas");
    if (!el) { console.warn("A3M: designCanvas not found"); return false; }
    canvas = el;
    ctx = canvas.getContext("2d");
    listenersBound = false;
    canvas._a3mEvBound = false;
    return true;
  }

  function resetDesignerState() {
    listenersBound = false;
    if (canvas) canvas._a3mEvBound = false;
  }

  function nid() {
    return "L" + ((Date.now() + Math.random() * 1000) | 0).toString(36);
  }

  function cloneState() {
    return JSON.parse(JSON.stringify({ layers, bgColorVal, selectedId, canvasProdType, activeTool }));
  }

  function saveHist() {
    history.push(cloneState());
    if (history.length > 60) history.shift();
    redoStack = []; // clear redo on new action
    updateUndoRedoUI();
  }

  function updateUndoRedoUI() {
    const undoBtn = document.getElementById("dsUndoBtn");
    const redoBtn = document.getElementById("dsRedoBtn");
    if (undoBtn) undoBtn.disabled = history.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function restoreState(s) {
    layers = s.layers || [];
    bgColorVal = s.bgColorVal || "#ffffff";
    selectedId = s.selectedId || null;
    canvasProdType = s.canvasProdType || "tshirt";
    activeTool = s.activeTool || "select";
    syncCanvasProductSelect();
    drawAll();
  }

  function undoAction() {
    if (!history.length) return;
    redoStack.push(cloneState());
    const s = history.pop();
    restoreState(s);
    showToast("↩ تراجع", "info");
    updateUndoRedoUI();
  }

  function redoAction() {
    if (!redoStack.length) return;
    history.push(cloneState());
    const s = redoStack.pop();
    restoreState(s);
    showToast("↪ إعادة", "info");
    updateUndoRedoUI();
  }

  // ── Snap helper ──
  function snap(v) {
    if (!snapToGrid) return v;
    return Math.round(v / GRID_SIZE) * GRID_SIZE;
  }

  // ── Layer factories ──
  function addTextLayer(text, fs, font, fill, align, x, y, opts = {}) {
    if (!ctx) return null;
    ctx.save();
    const weight = opts.bold ? "bold " : (opts.italic ? "italic " : "");
    ctx.font = `${weight}${fs}px '${font}'`;
    const w = Math.max((ctx.measureText(text).width || fs * String(text).length * 0.6) + 24, 60);
    ctx.restore();
    const layer = {
      id: nid(), type: "text",
      x: snap(x), y: snap(y), w, h: fs * 1.5,
      text: String(text || "Text"),
      font, fontSize: fs,
      fillColor: fill || "#ffffff",
      shadowColor: opts.shadowColor || "",
      shadowBlur: opts.shadowBlur || 0,
      textAlign: align || "center",
      opacity: 100, rotation: 0,
      visible: true, locked: false,
      flippedH: false, flippedV: false,
      bold: opts.bold || false,
      italic: opts.italic || false,
      underline: opts.underline || false,
      letterSpacing: opts.letterSpacing || 0,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addRect(x, y, w, h, fill, stroke, strokeW, opacity, opts = {}) {
    const layer = {
      id: nid(), type: "rect",
      x: snap(x), y: snap(y),
      w: w || 150, h: h || 80,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "#c9a84c",
      strokeWidth: strokeW || 2,
      cornerRadius: opts.cornerRadius || 0,
      gradient: opts.gradient || null,
      opacity: opacity || 100,
      rotation: 0, visible: true, locked: false,
      flippedH: false, flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addCircle(x, y, r, fill, stroke, opacity) {
    const layer = {
      id: nid(), type: "circle",
      x: snap(x), y: snap(y),
      w: (r || 60) * 2, h: (r || 60) * 2,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "",
      strokeWidth: 2,
      opacity: opacity || 100,
      rotation: 0, visible: true, locked: false,
      flippedH: false, flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addTriangle(x, y, w, h, fill, stroke, opacity) {
    const layer = {
      id: nid(), type: "triangle",
      x: snap(x), y: snap(y),
      w: w || 120, h: h || 100,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "",
      strokeWidth: 2,
      opacity: opacity || 100,
      rotation: 0, visible: true, locked: false,
      flippedH: false, flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addStar(x, y, r, fill, stroke, opacity) {
    const layer = {
      id: nid(), type: "star",
      x: snap(x), y: snap(y),
      w: (r || 60) * 2, h: (r || 60) * 2,
      fillColor: fill || "#c9a84c",
      strokeColor: stroke || "",
      strokeWidth: 2,
      opacity: opacity || 100,
      rotation: 0, visible: true, locked: false,
      flippedH: false, flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addLine(x1, y1, x2, y2, color, width, opacity) {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const w = Math.max(Math.abs(x2 - x1), 10);
    const h = Math.max(Math.abs(y2 - y1), 10);
    const layer = {
      id: nid(), type: "line",
      x: snap(cx), y: snap(cy),
      w, h,
      fillColor: color || "#ffffff",
      strokeColor: color || "#ffffff",
      strokeWidth: width || 3,
      opacity: opacity || 100,
      rotation: 0, visible: true, locked: false,
      flippedH: false, flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  // ── Add from controls ──
  function addText() {
    if (!canvas) return;
    saveHist();
    const text = (document.getElementById("txtContent") || {}).value || "Text";
    const fs = parseInt((document.getElementById("txtSize") || {}).value) || 40;
    const font = (document.getElementById("txtFont") || {}).value || "Cairo";
    const fill = (document.getElementById("txtColor") || {}).value || "#000000";
    const bold = (document.getElementById("tbBold") || {}).classList?.contains("active-btn");
    const italic = (document.getElementById("tbItalic") || {}).classList?.contains("active-btn");
    addTextLayer(text, fs, font, fill, "center", 250, 250, { bold, italic });
  }

  function addShape(type) {
    if (!canvas) return;
    saveHist();
    const fill = (document.getElementById("shapeFill") || {}).value || "#7c3aed";
    const stroke = (document.getElementById("shapeStroke") || {}).value || "#c9a84c";
    const op = parseInt((document.getElementById("shapeOpacity") || {}).value) || 100;
    const sw = parseInt((document.getElementById("strokeW") || {}).value) || 2;
    const cr = parseInt((document.getElementById("cornerRadius") || {}).value) || 0;
    if (type === "rect") addRect(250, 250, 150, 80, fill, stroke, sw, op, { cornerRadius: cr });
    else if (type === "circle") addCircle(250, 250, 60, fill, stroke, op);
    else if (type === "triangle") addTriangle(250, 250, 120, 100, fill, stroke, op);
    else if (type === "star") addStar(250, 250, 65, fill, stroke, op);
    else if (type === "line") addLine(150, 250, 350, 250, fill, sw, op);
  }

  function syncSelected() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    if (l.type === "text") {
      const newText = (document.getElementById("txtContent") || {}).value || l.text;
      const newFs = parseInt((document.getElementById("txtSize") || {}).value) || l.fontSize;
      const newFont = (document.getElementById("txtFont") || {}).value || l.font;
      const newColor = (document.getElementById("txtColor") || {}).value || l.fillColor;
      if (ctx) {
        const weight = l.bold ? "bold " : (l.italic ? "italic " : "");
        ctx.save();
        ctx.font = `${weight}${newFs}px '${newFont}'`;
        l.w = Math.max(ctx.measureText(newText).width + 24, 60);
        ctx.restore();
      }
      l.text = newText;
      l.fontSize = newFs;
      l.font = newFont;
      l.fillColor = newColor;
      l.h = newFs * 1.5;
    } else {
      l.fillColor = (document.getElementById("shapeFill") || {}).value || l.fillColor;
      l.strokeColor = (document.getElementById("shapeStroke") || {}).value || l.strokeColor;
      l.strokeWidth = parseInt((document.getElementById("strokeW") || {}).value) || l.strokeWidth;
      l.opacity = parseInt((document.getElementById("shapeOpacity") || {}).value) || l.opacity;
      if (l.type === "rect") l.cornerRadius = parseInt((document.getElementById("cornerRadius") || {}).value) || 0;
      const opVal = document.getElementById("opVal");
      if (opVal) opVal.textContent = l.opacity;
    }
    drawAll();
  }

  function setTxtAlign(a) {
    const l = layers.find(x => x.id === selectedId);
    if (l && l.type === "text") {
      l.textAlign = a;
      drawAll();
    }
  }

  // ── Handle positions ──
  function getHandlePositions(l) {
    const hw = l.w / 2, hh = l.h / 2;
    return [
      { name: "nw", lx: -hw, ly: -hh }, { name: "n",  lx: 0,   ly: -hh },
      { name: "ne", lx:  hw, ly: -hh }, { name: "e",  lx:  hw, ly:  0  },
      { name: "se", lx:  hw, ly:  hh }, { name: "s",  lx:  0,  ly:  hh },
      { name: "sw", lx: -hw, ly:  hh }, { name: "w",  lx: -hw, ly:  0  },
    ];
  }

  function worldToLocal(l, wx, wy) {
    const dx = wx - l.x, dy = wy - l.y;
    const rad = -(l.rotation || 0) * Math.PI / 180;
    return {
      lx: dx * Math.cos(rad) - dy * Math.sin(rad),
      ly: dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }

  function hitTestLayer(l, wx, wy) {
    const loc = worldToLocal(l, wx, wy);
    return Math.abs(loc.lx) <= l.w / 2 + 6 && Math.abs(loc.ly) <= l.h / 2 + 6;
  }

  function hitTestHandle(l, wx, wy) {
    const loc = worldToLocal(l, wx, wy);
    for (const h of getHandlePositions(l)) {
      if (Math.abs(loc.lx - h.lx) <= HANDLE_SIZE + 2 && Math.abs(loc.ly - h.ly) <= HANDLE_SIZE + 2) return h.name;
    }
    if (Math.abs(loc.lx) <= 10 && Math.abs(loc.ly + l.h / 2 + 24) <= 10) return "rotate";
    return null;
  }

  function getCanvasXY(e) {
    if (!canvas) return { x: 0, y: 0 };
    const t = e.touches ? e.touches[0] : e;
    const r = canvas.getBoundingClientRect();
    return {
      x: (t.clientX - r.left) * (canvas.width / r.width),
      y: (t.clientY - r.top)  * (canvas.height / r.height),
    };
  }

  // ── Draw star shape ──
  function drawStarPath(ctx, cx, cy, r, points = 5) {
    const inner = r * 0.4;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const rad = i % 2 === 0 ? r : inner;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // ── Draw layer ──
  function drawLayer(l) {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = (l.opacity || 100) / 100;
    ctx.translate(l.x, l.y);
    if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
    if (l.flippedH) ctx.scale(-1, 1);
    if (l.flippedV) ctx.scale(1, -1);

    const hw = l.w / 2, hh = l.h / 2;

    if (l.type === "text") {
      // Shadow
      if (l.shadowColor && l.shadowBlur) {
        ctx.shadowColor = l.shadowColor;
        ctx.shadowBlur = l.shadowBlur;
      }
      // Letter spacing
      let weight = "";
      if (l.bold && l.italic) weight = "bold italic ";
      else if (l.bold) weight = "bold ";
      else if (l.italic) weight = "italic ";
      ctx.font = `${weight}${l.fontSize}px '${l.font}'`;
      ctx.fillStyle = l.fillColor;
      ctx.textAlign = l.textAlign || "center";
      ctx.textBaseline = "middle";

      if (l.letterSpacing && l.letterSpacing !== 0) {
        // Manual letter spacing
        const chars = l.text.split("");
        const totalW = chars.reduce((acc, c) => acc + ctx.measureText(c).width + l.letterSpacing, 0) - l.letterSpacing;
        let startX = l.textAlign === "center" ? -totalW / 2 : l.textAlign === "right" ? -totalW : 0;
        for (const c of chars) {
          ctx.fillText(c, startX, 0);
          startX += ctx.measureText(c).width + l.letterSpacing;
        }
      } else {
        ctx.fillText(l.text, 0, 0);
      }

      // Underline
      if (l.underline) {
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        const textW = ctx.measureText(l.text).width;
        const ulX = l.textAlign === "center" ? -textW / 2 : l.textAlign === "right" ? -textW : 0;
        ctx.fillStyle = l.fillColor;
        ctx.fillRect(ulX, l.fontSize * 0.6, textW, 1.5);
      }

    } else if (l.type === "rect") {
      const r2 = l.cornerRadius || 0;
      if (r2 > 0) {
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, l.w, l.h, r2);
      } else {
        ctx.beginPath();
        ctx.rect(-hw, -hh, l.w, l.h);
      }
      if (l.gradient && l.gradient.type) {
        let grd;
        if (l.gradient.type === "linear") {
          grd = ctx.createLinearGradient(-hw, 0, hw, 0);
        } else {
          grd = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
        }
        (l.gradient.stops || []).forEach(s => grd.addColorStop(s.pos, s.color));
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = l.fillColor;
      }
      ctx.fill();
      if (l.strokeColor && l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor;
        ctx.lineWidth = l.strokeWidth;
        ctx.stroke();
      }
    } else if (l.type === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(hw, 1), 0, Math.PI * 2);
      ctx.fillStyle = l.fillColor;
      ctx.fill();
      if (l.strokeColor && l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor;
        ctx.lineWidth = l.strokeWidth;
        ctx.stroke();
      }
    } else if (l.type === "triangle") {
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(-hw, hh);
      ctx.closePath();
      ctx.fillStyle = l.fillColor;
      ctx.fill();
      if (l.strokeColor && l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor;
        ctx.lineWidth = l.strokeWidth;
        ctx.stroke();
      }
    } else if (l.type === "star") {
      drawStarPath(ctx, 0, 0, hw);
      ctx.fillStyle = l.fillColor;
      ctx.fill();
      if (l.strokeColor && l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor;
        ctx.lineWidth = l.strokeWidth;
        ctx.stroke();
      }
    } else if (l.type === "line") {
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.strokeStyle = l.strokeColor || l.fillColor;
      ctx.lineWidth = l.strokeWidth || 3;
      ctx.stroke();
    } else if (l.type === "image" && l.img) {
      ctx.drawImage(l.img, -hw, -hh, l.w, l.h);
    }

    ctx.restore();

    // Selection indicator
    if (l.id === selectedId) {
      ctx.save();
      ctx.translate(l.x, l.y);
      if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
      const hw2 = l.w / 2, hh2 = l.h / 2;

      // Selection border with glow
      ctx.shadowColor = "#7c3aed";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(-hw2 - 1, -hh2 - 1, l.w + 2, l.h + 2);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Handles — round corners
      getHandlePositions(l).forEach(h => {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 1.5;
        const hs = HANDLE_SIZE;
        ctx.beginPath();
        ctx.roundRect(h.lx - hs / 2, h.ly - hs / 2, hs, hs, 2);
        ctx.fill();
        ctx.stroke();
      });

      // Rotate handle
      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(0, -hh2 - 1);
      ctx.lineTo(0, -hh2 - 22);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = "#c9a84c";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#c9a84c";
      ctx.beginPath();
      ctx.arc(0, -hh2 - 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Lock indicator
      if (l.locked) {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "12px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🔒", hw2 + 12, -hh2 - 12);
      }

      ctx.restore();
    }
  }

  // ── Grid drawing ──
  function drawGrid() {
    if (!ctx || !showGrid) return;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#c9a84c";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
    ctx.restore();
  }

  // ── Ruler drawing (on a separate overlay canvas) ──
  function convertUnit(px) {
    if (rulerUnit === "cm") return (px * CANVAS_PX_TO_CM).toFixed(1);
    if (rulerUnit === "mm") return Math.round(px * CANVAS_PX_TO_CM * 10);
    return Math.round(px);
  }

  function getTickStep() {
    if (rulerUnit === "cm") return Math.round(1 / CANVAS_PX_TO_CM); // 1 cm in px
    if (rulerUnit === "mm") return Math.round(0.1 / CANVAS_PX_TO_CM); // 1mm in px ~3.78
    return 25; // px
  }

  function getLabelStep() {
    if (rulerUnit === "cm") return Math.round(1 / CANVAS_PX_TO_CM);
    if (rulerUnit === "mm") return Math.round(1 / CANVAS_PX_TO_CM); // label every 1cm (10mm)
    return 50; // label every 50px
  }

  function injectRulerCanvas() {
    if (document.getElementById("a3mRulerH")) return;
    const mainCanvas = document.getElementById("designCanvas");
    if (!mainCanvas) return;

    const parent = mainCanvas.parentElement;
    if (!parent) return;
    parent.style.position = "relative";

    // Horizontal ruler (top)
    const rH = document.createElement("canvas");
    rH.id = "a3mRulerH";
    rH.style.cssText = "position:absolute;top:0;left:" + RULER_SIZE + "px;width:calc(100% - " + RULER_SIZE + "px);height:" + RULER_SIZE + "px;pointer-events:none;z-index:10;";
    parent.insertBefore(rH, mainCanvas);

    // Vertical ruler (left)
    const rV = document.createElement("canvas");
    rV.id = "a3mRulerV";
    rV.style.cssText = "position:absolute;top:0;left:0;width:" + RULER_SIZE + "px;height:calc(100%);pointer-events:none;z-index:10;";
    parent.insertBefore(rV, mainCanvas);

    // Corner box
    const corner = document.createElement("div");
    corner.id = "a3mRulerCorner";
    corner.style.cssText = "position:absolute;top:0;left:0;width:" + RULER_SIZE + "px;height:" + RULER_SIZE + "px;background:#1a1a2e;border-right:1px solid #252540;border-bottom:1px solid #252540;z-index:11;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:8px;color:#6b7280;";
    corner.title = "تغيير الوحدة (px / cm / mm)";
    corner.textContent = rulerUnit;
    corner.onclick = () => {
      rulerUnit = rulerUnit === "px" ? "cm" : rulerUnit === "cm" ? "mm" : "px";
      corner.textContent = rulerUnit;
      drawRulers();
    };
    parent.insertBefore(corner, mainCanvas);

    // Shift main canvas to make room for rulers
    mainCanvas.style.position = "absolute";
    mainCanvas.style.top = RULER_SIZE + "px";
    mainCanvas.style.left = RULER_SIZE + "px";
    mainCanvas.style.width = "calc(100% - " + RULER_SIZE + "px)";
    mainCanvas.style.height = "calc(100% - " + RULER_SIZE + "px)";

    // Track mouse for cursor lines
    mainCanvas.addEventListener("mousemove", (e) => {
      const r = mainCanvas.getBoundingClientRect();
      const sx = canvas ? (canvas.width / r.width) : 1;
      const sy = canvas ? (canvas.height / r.height) : 1;
      mouseRulerX = (e.clientX - r.left) * sx;
      mouseRulerY = (e.clientY - r.top) * sy;
      if (showRulers) drawRulers();
    });
    mainCanvas.addEventListener("mouseleave", () => {
      mouseRulerX = -1; mouseRulerY = -1;
      if (showRulers) drawRulers();
    });
  }

  function drawRulers() {
    if (!showRulers || !canvas) return;
    const rH = document.getElementById("a3mRulerH");
    const rV = document.getElementById("a3mRulerV");
    if (!rH || !rV) { injectRulerCanvas(); return; }

    const cw = canvas.width;
    const ch = canvas.height;
    const rHRect = rH.getBoundingClientRect();
    const rVRect = rV.getBoundingClientRect();

    // Size rulers to match displayed canvas
    rH.width = rHRect.width || cw;
    rH.height = RULER_SIZE;
    rV.width = RULER_SIZE;
    rV.height = rVRect.height || ch;

    const scaleX = (rH.width) / cw;
    const scaleY = (rV.height) / ch;

    const ctxH = rH.getContext("2d");
    const ctxV = rV.getContext("2d");

    const drawRuler = (ctx, length, scale, isHoriz) => {
      const rLen = isHoriz ? rH.width : rV.height;
      ctx.clearRect(0, 0, isHoriz ? rLen : RULER_SIZE, isHoriz ? RULER_SIZE : rLen);
      // Background
      ctx.fillStyle = "#12121f";
      ctx.fillRect(0, 0, isHoriz ? rLen : RULER_SIZE, isHoriz ? RULER_SIZE : rLen);
      // Border
      ctx.strokeStyle = "#252540";
      ctx.lineWidth = 1;
      if (isHoriz) { ctx.beginPath(); ctx.moveTo(0, RULER_SIZE - 0.5); ctx.lineTo(rLen, RULER_SIZE - 0.5); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(RULER_SIZE - 0.5, 0); ctx.lineTo(RULER_SIZE - 0.5, rLen); ctx.stroke(); }

      const tickStep = getTickStep();
      const labelStep = getLabelStep();
      const smallTick = isHoriz ? RULER_SIZE * 0.3 : RULER_SIZE * 0.3;
      const midTick   = isHoriz ? RULER_SIZE * 0.5 : RULER_SIZE * 0.5;
      const bigTick   = isHoriz ? RULER_SIZE * 0.75 : RULER_SIZE * 0.75;

      ctx.strokeStyle = "#3a3a5c";
      ctx.fillStyle = "#6b7280";
      ctx.font = "8px sans-serif";
      ctx.textBaseline = "middle";

      for (let px = 0; px <= length; px += tickStep) {
        const pos = px * scale;
        const isLabel = (px % labelStep === 0);
        const isMid = (px % (tickStep * 2) === 0);
        const tickH = isLabel ? bigTick : isMid ? midTick : smallTick;
        ctx.lineWidth = isLabel ? 1.2 : 0.7;
        ctx.strokeStyle = isLabel ? "#4a4a7a" : "#2a2a45";

        if (isHoriz) {
          ctx.beginPath(); ctx.moveTo(pos, RULER_SIZE); ctx.lineTo(pos, RULER_SIZE - tickH); ctx.stroke();
          if (isLabel && px > 0) {
            ctx.save();
            ctx.fillStyle = "#888aaa";
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(convertUnit(px) + (px === 0 ? " " + rulerUnit : ""), pos, RULER_SIZE * 0.38);
            ctx.restore();
          }
        } else {
          ctx.beginPath(); ctx.moveTo(RULER_SIZE, pos); ctx.lineTo(RULER_SIZE - tickH, pos); ctx.stroke();
          if (isLabel && px > 0) {
            ctx.save();
            ctx.translate(RULER_SIZE * 0.5, pos);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = "#888aaa";
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(convertUnit(px), 0, 0);
            ctx.restore();
          }
        }
      }

      // Cursor indicator line
      const curPos = isHoriz ? mouseRulerX * scaleX : mouseRulerY * scaleY;
      if (curPos > 0) {
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isHoriz) { ctx.moveTo(curPos, 0); ctx.lineTo(curPos, RULER_SIZE); }
        else { ctx.moveTo(0, curPos); ctx.lineTo(RULER_SIZE, curPos); }
        ctx.stroke();

        // Tooltip value near cursor
        if (isHoriz && mouseRulerX > 0) {
          ctx.fillStyle = "#c9a84c";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "left";
          const label = convertUnit(mouseRulerX) + (rulerUnit === "px" ? "px" : rulerUnit);
          const tx = Math.min(curPos + 3, rLen - 30);
          ctx.fillText(label, tx, RULER_SIZE * 0.38);
        } else if (!isHoriz && mouseRulerY > 0) {
          ctx.save();
          ctx.fillStyle = "#c9a84c";
          ctx.font = "bold 8px sans-serif";
          const label = convertUnit(mouseRulerY) + (rulerUnit === "px" ? "px" : rulerUnit);
          const ty = Math.min(curPos + 14, rLen - 4);
          ctx.translate(RULER_SIZE * 0.5, ty);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "left";
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }

      // Selected object highlight on ruler
      const sel = layers.find(l => l.id === selectedId);
      if (sel) {
        const startPx = isHoriz ? (sel.x - sel.w / 2) : (sel.y - sel.h / 2);
        const endPx   = isHoriz ? (sel.x + sel.w / 2) : (sel.y + sel.h / 2);
        const startPos = startPx * scale;
        const endPos   = endPx * scale;
        ctx.fillStyle = "rgba(124,58,237,0.25)";
        if (isHoriz) ctx.fillRect(startPos, 0, endPos - startPos, RULER_SIZE);
        else ctx.fillRect(0, startPos, RULER_SIZE, endPos - startPos);
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 1.5;
        [startPos, endPos].forEach(p => {
          ctx.beginPath();
          if (isHoriz) { ctx.moveTo(p, 0); ctx.lineTo(p, RULER_SIZE); }
          else { ctx.moveTo(0, p); ctx.lineTo(RULER_SIZE, p); }
          ctx.stroke();
        });
      }
    };

    drawRuler(ctxH, cw, scaleX, true);
    drawRuler(ctxV, ch, scaleY, false);
  }

  function toggleRulers() {
    showRulers = !showRulers;
    const rH = document.getElementById("a3mRulerH");
    const rV = document.getElementById("a3mRulerV");
    const corner = document.getElementById("a3mRulerCorner");
    const mainCanvas = document.getElementById("designCanvas");
    const btn = document.getElementById("dsRulerBtn");
    if (showRulers) {
      if (rH) rH.style.display = "";
      if (rV) rV.style.display = "";
      if (corner) corner.style.display = "";
      if (mainCanvas) { mainCanvas.style.top = RULER_SIZE + "px"; mainCanvas.style.left = RULER_SIZE + "px"; mainCanvas.style.width = "calc(100% - " + RULER_SIZE + "px)"; mainCanvas.style.height = "calc(100% - " + RULER_SIZE + "px)"; }
      if (btn) btn.classList.add("active-tool-btn");
      drawRulers();
    } else {
      if (rH) rH.style.display = "none";
      if (rV) rV.style.display = "none";
      if (corner) corner.style.display = "none";
      if (mainCanvas) { mainCanvas.style.top = "0"; mainCanvas.style.left = "0"; mainCanvas.style.width = "100%"; mainCanvas.style.height = "100%"; }
      if (btn) btn.classList.remove("active-tool-btn");
    }
    showToast(showRulers ? "📏 المسطرة مفعّلة" : "📏 المسطرة مخفية");
  }

  // ── Live Price Calculator ──
  const BASE_PRICE = 500; // DZD
  const PER_ELEMENT = 200;

  function updateDesignPrice() {
    const el = document.getElementById("ds-price-val");
    if (!el) return;
    let total = BASE_PRICE;
    layers.forEach(l => {
      total += PER_ELEMENT;
      const area = (l.w || 100) * (l.h || 50);
      const sizeBonus = Math.max(0, (area - 12000) / 12000) * 100;
      total += Math.min(sizeBonus, 500);
    });
    const val = Math.round(total) + " دج";
    if (el.textContent !== val) {
      el.textContent = val;
      el.style.transform = "scale(1.22)";
      setTimeout(() => { el.style.transform = "scale(1)"; }, 200);
    }
    el.style.color = total > BASE_PRICE + 1000 ? "#7c3aed" : total > BASE_PRICE ? "#f59e0b" : "#c9a84c";
  }

  function drawAll() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (bgColorVal && bgColorVal !== "transparent") {
      ctx.fillStyle = bgColorVal;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Grid first
    drawGrid();

    // Watermark product icon
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.font = "220px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#888";
    ctx.fillText(PROD_EMOJI[canvasProdType] || "👕", 250, 250);
    ctx.restore();

    // Print zone guide
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(80, 80, 340, 340);
    ctx.setLineDash([]);
    ctx.restore();

    layers.filter(l => l.visible).forEach(drawLayer);
    renderLayers();
    updateTransformPanel();
    updateCanvasModeBadge();
    updateDesignPrice();
    updateLayerCountBadge();
    if (showRulers) drawRulers();
  }

  function updateLayerCountBadge() {
    const cnt = layers.length;
    ["dsLayerCount", "dsLayerCountStatus"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = cnt;
    });
  }

  // ── Pointer handlers ──
  function _onPointerDown(e) {
    if (!canvas) return;
    const { x, y } = getCanvasXY(e);

    if (activeTool === "select") {
      const sel = layers.find(l => l.id === selectedId);
      if (sel && !sel.locked) {
        const h = hitTestHandle(sel, x, y);
        if (h) {
          isResizing = true;
          resizeHandle = h;
          resizeStartX = x; resizeStartY = y;
          resizeStartW = sel.w; resizeStartH = sel.h;
          resizeStartObjX = sel.x; resizeStartObjY = sel.y;
          return;
        }
      }

      let hit = null;
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].visible && hitTestLayer(layers[i], x, y)) { hit = layers[i]; break; }
      }
      if (hit) {
        if (hit.locked) { showToast("🔒 الطبقة مقفولة", "error"); selectedId = hit.id; drawAll(); return; }
        selectedId = hit.id;
        isDragging = true;
        dragOffX = x - hit.x;
        dragOffY = y - hit.y;
      } else {
        selectedId = null;
      }
      drawAll();
      return;
    }

    saveHist();
    const fill = (document.getElementById("shapeFill") || {}).value || "#7c3aed";
    const stroke = (document.getElementById("shapeStroke") || {}).value || "#c9a84c";
    const op = parseInt((document.getElementById("shapeOpacity") || {}).value) || 100;
    const sw = parseInt((document.getElementById("strokeW") || {}).value) || 2;
    const cr = parseInt((document.getElementById("cornerRadius") || {}).value) || 0;
    const text = (document.getElementById("txtContent") || {}).value || "Text";
    const fs = parseInt((document.getElementById("txtSize") || {}).value) || 40;
    const font = (document.getElementById("txtFont") || {}).value || "Cairo";
    const txtFill = (document.getElementById("txtColor") || {}).value || "#000000";

    if (activeTool === "text") {
      addTextLayer(text, fs, font, txtFill, "center", x, y);
      setTool("select");
    } else if (activeTool === "rect") {
      addRect(x, y, 150, 80, fill, stroke, sw, op, { cornerRadius: cr });
      setTool("select");
    } else if (activeTool === "circle") {
      addCircle(x, y, 60, fill, stroke, op);
      setTool("select");
    } else if (activeTool === "triangle") {
      addTriangle(x, y, 120, 100, fill, stroke, op);
      setTool("select");
    } else if (activeTool === "star") {
      addStar(x, y, 65, fill, stroke, op);
      setTool("select");
    } else if (activeTool === "line") {
      addLine(x - 80, y, x + 80, y, fill, sw, op);
      setTool("select");
    }
  }

  function _onPointerMove(e) {
    if (!canvas) return;
    const { x, y } = getCanvasXY(e);
    const sel = layers.find(l => l.id === selectedId);

    // Update coordinates display
    const coordEl = document.getElementById("dsCoords");
    if (coordEl) coordEl.textContent = `${Math.round(x)}, ${Math.round(y)}`;

    if (isDragging && sel) {
      sel.x = snap(x - dragOffX);
      sel.y = snap(y - dragOffY);
      drawAll();
      // Live position tooltip
      const tip = document.getElementById("ds-canvas-tip");
      if (tip) { tip.textContent = `X:${Math.round(sel.x)} Y:${Math.round(sel.y)}`; tip.style.display = "block"; tip.style.left = (x + 14) + "px"; tip.style.top = (y - 22) + "px"; }
    } else if (isResizing && sel) {
      const dx = x - resizeStartX;
      const dy = y - resizeStartY;
      if (resizeHandle === "rotate") {
        const angle = Math.atan2(x - sel.x, -(y - sel.y)) * 180 / Math.PI;
        sel.rotation = Math.round(angle);
      } else {
        if (resizeHandle.includes("e")) sel.w = Math.max(20, resizeStartW + dx);
        if (resizeHandle.includes("s")) sel.h = Math.max(10, resizeStartH + dy);
        if (resizeHandle.includes("w")) { sel.w = Math.max(20, resizeStartW - dx); sel.x = resizeStartObjX + dx / 2; }
        if (resizeHandle.includes("n")) { sel.h = Math.max(10, resizeStartH - dy); sel.y = resizeStartObjY + dy / 2; }
        if (sel.type === "circle") sel.h = sel.w;
      }
      drawAll();
      // Live size tooltip
      const wCm = (sel.w * CANVAS_PX_TO_CM).toFixed(1);
      const hCm = (sel.h * CANVAS_PX_TO_CM).toFixed(1);
      const tip = document.getElementById("ds-canvas-tip");
      if (tip) {
        tip.textContent = `${Math.round(sel.w)}×${Math.round(sel.h)}px  (${wCm}×${hCm}cm)`;
        tip.style.display = "block";
        tip.style.left = (x + 14) + "px";
        tip.style.top  = (y - 22) + "px";
      }
    }

    if (activeTool === "select") {
      const h = sel ? hitTestHandle(sel, x, y) : null;
      canvas.style.cursor = h === "rotate" ? "crosshair" : h ? "nwse-resize" : (sel && hitTestLayer(sel, x, y)) ? "move" : "default";
    }
  }

  function _onPointerUp() {
    if (isDragging || isResizing) saveHist();
    isDragging = false;
    isResizing = false;
    resizeHandle = "";
    const tip = document.getElementById("ds-canvas-tip");
    if (tip) tip.style.display = "none";
  }

  function setTool(t) {
    activeTool = t;
    document.querySelectorAll('.d-tool-btn[id^="tool-"]').forEach(b => b.classList.remove("active"));
    const btn = document.getElementById("tool-" + t);
    if (btn) btn.classList.add("active");
    if (canvas) canvas.style.cursor = t === "select" ? "default" : "crosshair";
    // Update tool indicator
    const ti = document.getElementById("dsActiveTool");
    if (ti) ti.textContent = t;
  }

  function deleteSelected() {
    if (!selectedId) return;
    const l = layers.find(x => x.id === selectedId);
    if (l && l.locked) { showToast("🔒 لا يمكن حذف طبقة مقفولة", "error"); return; }
    saveHist();
    layers = layers.filter(l => l.id !== selectedId);
    selectedId = null;
    drawAll();
    showToast("🗑 تم الحذف");
  }

  function duplicateSelected() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    saveHist();
    const copy = JSON.parse(JSON.stringify(l));
    copy.id = nid();
    copy.x += 20; copy.y += 20;
    if (l.img) copy.img = l.img; // restore non-serializable img ref
    layers.push(copy);
    selectedId = copy.id;
    drawAll();
    showToast("⊕ تم النسخ");
  }

  function bringForward() {
    const i = layers.findIndex(x => x.id === selectedId);
    if (i >= 0 && i < layers.length - 1) {
      saveHist();
      [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]];
      drawAll();
    }
  }

  function sendBackward() {
    const i = layers.findIndex(x => x.id === selectedId);
    if (i > 0) {
      saveHist();
      [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]];
      drawAll();
    }
  }

  function bringToFront() {
    const i = layers.findIndex(x => x.id === selectedId);
    if (i >= 0 && i < layers.length - 1) {
      saveHist();
      const [el] = layers.splice(i, 1);
      layers.push(el);
      drawAll();
    }
  }

  function sendToBack() {
    const i = layers.findIndex(x => x.id === selectedId);
    if (i > 0) {
      saveHist();
      const [el] = layers.splice(i, 1);
      layers.unshift(el);
      drawAll();
    }
  }

  function flipH() {
    const l = layers.find(x => x.id === selectedId);
    if (l) { saveHist(); l.flippedH = !l.flippedH; drawAll(); }
  }

  function flipV() {
    const l = layers.find(x => x.id === selectedId);
    if (l) { saveHist(); l.flippedV = !l.flippedV; drawAll(); }
  }

  function lockSelected() {
    const l = layers.find(x => x.id === selectedId);
    if (l) {
      l.locked = !l.locked;
      drawAll();
      showToast(l.locked ? "🔒 مقفولة" : "🔓 مفتوحة");
    }
  }

  function clearCanvas() {
    saveHist();
    layers = [];
    selectedId = null;
    bgColorVal = "#ffffff";
    const bgEl = document.getElementById("bgColor");
    if (bgEl) bgEl.value = bgColorVal;
    drawAll();
  }

  // ── Alignment helpers ──
  function alignLayers(dir) {
    if (!selectedId) return;
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    saveHist();
    const W = canvas ? canvas.width : 500;
    const H = canvas ? canvas.height : 500;
    if (dir === "left")   l.x = l.w / 2;
    if (dir === "right")  l.x = W - l.w / 2;
    if (dir === "top")    l.y = l.h / 2;
    if (dir === "bottom") l.y = H - l.h / 2;
    if (dir === "hcenter") l.x = W / 2;
    if (dir === "vcenter") l.y = H / 2;
    drawAll();
  }

  function applyTransform() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    saveHist();
    l.w = Math.max(10, parseFloat((document.getElementById("objW") || {}).value) || l.w);
    l.h = Math.max(5, parseFloat((document.getElementById("objH") || {}).value) || l.h);
    l.x = parseFloat((document.getElementById("objX") || {}).value) || l.x;
    l.y = parseFloat((document.getElementById("objY") || {}).value) || l.y;
    l.rotation = parseFloat((document.getElementById("objRot") || {}).value) || 0;
    if (l.type === "circle") l.h = l.w;
    drawAll();
  }

  function updateTransformPanel() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) {
      // Clear size info when nothing selected
      ["ds-size-cm","ds-size-mm","ds-size-px"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = "—"; });
      return;
    }
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("objW", Math.round(l.w));
    set("objH", Math.round(l.h));
    set("objX", Math.round(l.x));
    set("objY", Math.round(l.y));
    set("objRot", Math.round(l.rotation || 0));
    setT("rotVal", (l.rotation || 0) + "°");

    // Size info in real units
    const wCm = (l.w * CANVAS_PX_TO_CM).toFixed(2);
    const hCm = (l.h * CANVAS_PX_TO_CM).toFixed(2);
    const wMm = Math.round(l.w * CANVAS_PX_TO_CM * 10);
    const hMm = Math.round(l.h * CANVAS_PX_TO_CM * 10);
    setT("ds-size-cm", wCm + " × " + hCm + " سم");
    setT("ds-size-mm", wMm + " × " + hMm + " مم");
    setT("ds-size-px", Math.round(l.w) + " × " + Math.round(l.h) + " px");

    if (l.type === "text") {
      set("txtContent", l.text);
      set("txtSize", l.fontSize);
      setT("txtSzVal", l.fontSize);
      set("txtColor", l.fillColor);
      if (l.font) set("txtFont", l.font);
      // Style buttons
      ["Bold", "Italic", "Underline"].forEach(s => {
        const btn = document.getElementById("tb" + s);
        if (btn) btn.classList.toggle("active-btn", !!l[s.toLowerCase()]);
      });
    } else {
      set("shapeFill", l.fillColor || "#7c3aed");
      set("shapeStroke", l.strokeColor || "#c9a84c");
      set("shapeOpacity", l.opacity || 100);
      setT("opVal", l.opacity || 100);
      if (l.type === "rect" && document.getElementById("cornerRadius")) {
        set("cornerRadius", l.cornerRadius || 0);
      }
    }
    // Lock button
    const lockBtn = document.getElementById("dsLockBtn");
    if (lockBtn) lockBtn.textContent = l.locked ? "🔓 فتح" : "🔒 قفل";
  }

  function renderLayers() {
    const ll = document.getElementById("layersList");
    if (!ll) return;
    const icons = { text: "T", image: "🖼", circle: "●", triangle: "▲", star: "★", line: "—", rect: "■" };
    ll.innerHTML = [...layers].reverse().map(l => `
      <div class="layer-item${l.id === selectedId ? " selected" : ""}${l.locked ? " layer-locked" : ""}" 
           onclick="selectLayer('${l.id}')" 
           draggable="true" data-lid="${l.id}">
        <span class="layer-icon" style="color:${l.id === selectedId ? '#7c3aed' : '#6b7280'}">${icons[l.type] || "▭"}</span>
        <span class="layer-name">${l.type === "text" ? l.text.slice(0, 14) : l.type}</span>
        <div class="layer-actions">
          <button class="layer-act-btn" title="إظهار/إخفاء" onclick="event.stopPropagation();toggleVis('${l.id}')">${l.visible ? "👁" : "○"}</button>
          <button class="layer-act-btn${l.locked ? ' layer-lock-active' : ''}" title="قفل" onclick="event.stopPropagation();selectedId='${l.id}';lockSelected()">${l.locked ? "🔒" : "🔓"}</button>
          <button class="layer-act-btn layer-del" title="حذف" onclick="event.stopPropagation();selectedId='${l.id}';deleteSelected()">✕</button>
        </div>
      </div>
    `).join("");
  }

  function selectLayer(id) {
    selectedId = id;
    drawAll();
  }

  function toggleVis(id) {
    const l = layers.find(x => x.id === id);
    if (l) { saveHist(); l.visible = !l.visible; drawAll(); }
  }

  function uploadImage(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        saveHist();
        const sc = Math.min(280 / img.width, 280 / img.height, 1);
        const w = img.width * sc, h = img.height * sc;
        const l = { id: nid(), type: "image", x: 250, y: 250, w, h, img, fillColor: "", strokeColor: "", strokeWidth: 0, opacity: 100, rotation: 0, visible: true, locked: false, flippedH: false, flippedV: false };
        layers.push(l);
        selectedId = l.id;
        drawAll();
        showToast("🖼 تمت إضافة الصورة", "success");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    ev.target.value = "";
  }

  function changeProduct() {
    const cp = document.getElementById("canvasProduct");
    if (cp) canvasProdType = cp.value;
    drawAll();
  }

  function syncCanvasProductSelect() {
    const cp = document.getElementById("canvasProduct");
    if (cp) cp.value = canvasProdType;
  }

  function updateCanvasModeBadge() {
    const badge = document.getElementById("topbarTitle");
    if (badge && !badge.dataset.manual) {
      const map = { tshirt: "تيشرت", mug: "كوب", hat: "قبعة", bag: "حقيبة", paper: "ورقة" };
      badge.textContent = `Design Studio • ${map[canvasProdType] || "منتج"}`;
    }
  }

  function downloadDesign() {
    if (!canvas) return;
    // Hide selection before export
    const prevSel = selectedId;
    selectedId = null;
    drawAll();
    const link = document.createElement("a");
    link.download = "A3M_Design_" + Date.now() + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    selectedId = prevSel;
    drawAll();
    showToast("✅ تم تصدير التصميم", "success");
  }

  function saveToCart() {
    const name = "Custom Design (" + canvasProdType + ")";
    const item = { id: "custom-design-" + Date.now(), name, emoji: "🎨", price: 1500, qty: 1 };
    if (typeof window.cart !== "undefined") {
      window.cart.push(item);
    }
    if (typeof updateCart === "function") updateCart();
    showToast("🛒 تمت الإضافة للسلة", "success");
  }

  function openOrderFromDesign() {
    const modal = document.getElementById("orderModal");
    if (!modal) {
      if (typeof window.openOrderForm === "function") window.openOrderForm();
      return;
    }
    modal.style.display = "flex";
    const notes = document.getElementById("inp-notes");
    if (notes) notes.value = summarizeDesign();
  }

  function summarizeDesign() {
    const parts = [];
    parts.push(`منتج: ${canvasProdType}`);
    parts.push(`الطبقات: ${layers.length}`);
    const texts = layers.filter(l => l.type === "text").map(l => l.text).slice(0, 4);
    if (texts.length) parts.push(`نصوص: ${texts.join(" / ")}`);
    parts.push(`خلفية: ${bgColorVal}`);
    return parts.join("\n");
  }

  // ── Toggle grid & snap ──
  function toggleGrid() {
    showGrid = !showGrid;
    const btn = document.getElementById("dsGridBtn");
    if (btn) btn.classList.toggle("active-tool-btn", showGrid);
    drawAll();
  }

  function toggleSnap() {
    snapToGrid = !snapToGrid;
    const btn = document.getElementById("dsSnapBtn");
    if (btn) btn.classList.toggle("active-tool-btn", snapToGrid);
    showToast(snapToGrid ? "📐 الالتصاق تفعّل" : "📐 الالتصاق مُعطّل");
  }

  // ── AI Panel ──
  function addSmartPalette() {
    if (document.getElementById("a3m-ai-panel")) return;
    const panel = document.querySelector(".d-panel");
    if (!panel) return;

    const lang = window.currentLang || localStorage.getItem("a3m_lang") || "ar";
    const dt = {
      ar: { aiTitle: "ذكاء التصميم", aiPlaceholder: "مثال: شعار أسود وذهبي لبراند ملابس", apply: "✨ طبق", suggest: "🧠 اقتراح", clear: "🧹 مسح", aiHint: "صِف تصميمك ثم اضغط <b>طبق</b>." },
      en: { aiTitle: "AI Design", aiPlaceholder: "e.g. Black & gold logo for a clothing brand", apply: "✨ Apply", suggest: "🧠 Suggest", clear: "🧹 Clear", aiHint: "Describe your design and press <b>Apply</b>." },
      fr: { aiTitle: "IA Design", aiPlaceholder: "ex: Logo noir et or pour une marque", apply: "✨ Appliquer", suggest: "🧠 Suggérer", clear: "🧹 Effacer", aiHint: "Décrivez votre design et appuyez <b>Appliquer</b>." },
    };
    const d = dt[lang] || dt.ar;

    const section = document.createElement("div");
    section.className = "d-panel-section";
    section.id = "a3m-ai-panel";
    section.innerHTML = `
      <div class="d-panel-title">🤖 ${d.aiTitle}</div>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        <textarea class="d-input" id="a3mAiPrompt" placeholder="${d.aiPlaceholder}" rows="2" style="resize:vertical;min-height:52px;font-size:12px;line-height:1.5"></textarea>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">
          <button class="d-small-btn" id="a3mAiApplyBtn" style="flex:1;justify-content:center">${d.apply}</button>
          <button class="d-small-btn" id="a3mAiSuggestBtn" style="flex:1;justify-content:center">${d.suggest}</button>
          <button class="d-small-btn" id="a3mAiClearBtn">${d.clear}</button>
        </div>
        <div style="font-size:11px;color:#4b5563;line-height:1.6">${d.aiHint}</div>
      </div>
    `;
    panel.insertBefore(section, panel.firstChild);

    document.getElementById("a3mAiApplyBtn").onclick = () => {
      const prompt = (document.getElementById("a3mAiPrompt") || {}).value || "";
      if (window.A3MDesignerAI) window.A3MDesignerAI.applyPrompt(prompt);
    };
    document.getElementById("a3mAiSuggestBtn").onclick = () => {
      const prompt = (document.getElementById("a3mAiPrompt") || {}).value || "";
      if (window.A3MDesignerAI) {
        const spec = window.A3MDesignerAI.suggestSpecFromPrompt(prompt);
        window.A3MDesignerAI.applyDesignSpec(spec, { source: "suggest" });
      }
    };
    document.getElementById("a3mAiClearBtn").onclick = () => {
      if (confirm("مسح اللوحة؟")) clearCanvas();
    };
  }

  function translateDesignerUI() {
    const lang = window.currentLang || localStorage.getItem("a3m_lang") || "ar";
    const prodNames = {
      ar: ["👕 تيشرت", "☕ كوب", "🧢 قبعة", "🎒 حقيبة", "📄 ورقة"],
      en: ["👕 T-Shirt", "☕ Mug", "🧢 Hat", "🎒 Bag", "📄 Paper"],
      fr: ["👕 T-Shirt", "☕ Tasse", "🧢 Casquette", "🎒 Sac", "📄 Papier"],
    };
    const prodSel = document.getElementById("canvasProduct");
    if (prodSel) {
      const opts = prodSel.querySelectorAll("option");
      const names = prodNames[lang] || prodNames.ar;
      opts.forEach((opt, i) => { if (names[i]) opt.textContent = names[i]; });
    }
  }

  function buildTemplates() {
    const tg = document.getElementById("templatesGrid");
    if (!tg) return;
    tg.innerHTML = TEMPLATES.map((t, i) => `
      <div class="template-thumb" onclick="TEMPLATES[${i}].fn();showToast('✦ ${t.name}')" title="${t.name}">
        <span class="t-icon">${t.icon}</span>
        <span class="t-name">${t.name}</span>
      </div>
    `).join("");
  }

  // ── also build the mini template strip ──
  function buildTmplMini(catId) {
    const grid = document.getElementById("dsTmplMini");
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map((t, i) => `
      <div class="ds-tmpl-mini-item" onclick="TEMPLATES[${i}].fn();showToast('✦ ${t.name}')" title="${t.name}">
        <span style="font-size:1.3rem">${t.icon}</span>
        <span class="ds-tmpl-mini-name">${t.name}</span>
      </div>
    `).join("");
  }

  function openDesigner(mode) {
    if (typeof closeModePicker === "function") closeModePicker();

    const dm = document.getElementById("designerModal");
    if (dm) dm.classList.add("open");

    if (canvas && canvas._a3mEvBound) canvas._a3mEvBound = false;
    listenersBound = false;

    if (typeof mode === "string") {
      const lang = window.currentLang || localStorage.getItem("a3m_lang") || "ar";
      const labels = {
        template: { ar: "القوالب الجاهزة", en: "Template Mode", fr: "Mode Modèles" },
        scratch:  { ar: "من الصفر",       en: "Scratch Mode",  fr: "Mode Libre"   },
      };
      const titleEl = document.getElementById("topbarTitle");
      if (titleEl) {
        titleEl.dataset.manual = "1";
        titleEl.textContent = (labels[mode] && labels[mode][lang]) || mode;
      }
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!initCanvasRefs()) { console.error("A3M: canvas not found"); return; }
        clearCanvas();
        drawAll();
        buildTemplates();
        buildTmplMini();
        addSmartPalette();
        translateDesignerUI();
        bindCanvasEvents();
        updateUndoRedoUI();
        injectRulerCanvas();
        setTimeout(() => drawRulers(), 60);
        if (typeof dsFitCanvas === "function") setTimeout(dsFitCanvas, 80);
      }, 30);
    });
  }

  function bindCanvasEvents() {
    if (!canvas) return;
    const bgEl = document.getElementById("bgColor");
    if (bgEl && !bgEl._a3mBound) {
      bgEl._a3mBound = true;
      bgEl.addEventListener("input", () => { bgColorVal = bgEl.value; drawAll(); });
    }
    if (canvas._a3mEvBound) return;
    canvas._a3mEvBound = true;
    listenersBound = true;
    canvas.addEventListener("mousedown",  _onPointerDown);
    canvas.addEventListener("mousemove",  _onPointerMove);
    canvas.addEventListener("mouseup",    _onPointerUp);
    canvas.addEventListener("mouseleave", _onPointerUp);
    canvas.addEventListener("touchstart", e => { e.preventDefault(); _onPointerDown(e); }, { passive: false });
    canvas.addEventListener("touchmove",  e => { e.preventDefault(); _onPointerMove(e); }, { passive: false });
    canvas.addEventListener("touchend",   e => { e.preventDefault(); _onPointerUp(); },   { passive: false });
    // Double-click to edit text
    canvas.addEventListener("dblclick", e => {
      const { x, y } = getCanvasXY(e);
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].type === "text" && layers[i].visible && hitTestLayer(layers[i], x, y)) {
          selectedId = layers[i].id;
          const inp = document.getElementById("txtContent");
          if (inp) { inp.value = layers[i].text; inp.focus(); inp.select(); }
          drawAll();
          break;
        }
      }
    });
  }

  function closeDesigner() {
    const dm = document.getElementById("designerModal");
    if (dm) dm.classList.remove("open");
  }

  function initDesigner(mode) { openDesigner(mode); }

  // ── AI design parsing ──
  function parseDesignDirective(text) {
    const match = String(text || "").match(/\[GENERATE_DESIGN:({[\s\S]*?})\]/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }

  function suggestionSpec(prompt) {
    const p = String(prompt || "").toLowerCase();
    const isLogo   = /(logo|شعار|براند|brand)/i.test(p);
    const isCard   = /(card|كرت|business)/i.test(p);
    const isPoster = /(poster|بوستر|ملصق|banner)/i.test(p);
    const isQuote  = /(quote|اقتباس|عبارة)/i.test(p);
    const color    = p.includes("ذهبي") || p.includes("gold") ? "#c9a84c"
                   : p.includes("purple") || p.includes("بنفسجي") ? "#7c3aed"
                   : p.includes("أحمر") || p.includes("red") ? "#ef4444"
                   : p.includes("أخضر") || p.includes("green") ? "#22c55e"
                   : "#2563eb";
    if (isLogo)   return { type: "logo",   title: extractTitle(prompt, "YOUR BRAND"), subtitle: extractSubtitle(prompt, "Premium Print Studio"), color, bg: "#0b0f19", font: "Bebas Neue", clear: true };
    if (isCard)   return { type: "card",   title: extractTitle(prompt, "BUSINESS CARD"), subtitle: extractSubtitle(prompt, "Clean & modern"),    color, bg: "#111827", font: "Cairo",      clear: true };
    if (isPoster) return { type: "poster", title: extractTitle(prompt, "SPECIAL DROP"), subtitle: extractSubtitle(prompt, "Eye-catching layout"), color, bg: "#0f172a", font: "Bebas Neue", clear: true };
    if (isQuote)  return { type: "text",   title: extractTitle(prompt, "QUOTE"),        subtitle: extractSubtitle(prompt, "Elegant typography"),  color, bg: "#ffffff", font: "Dancing Script", clear: true };
    return { type: "text", title: extractTitle(prompt, "A3M DESIGN"), subtitle: extractSubtitle(prompt, "Ready for print"), color, bg: "#0b0f19", font: "Bebas Neue", clear: true };
  }

  function extractTitle(prompt, fallback) {
    const raw = String(prompt || "").trim();
    if (!raw) return fallback;
    const m = raw.match(/(?:logo|شعار|كرت|card|poster|بوستر|تيشرت|shirt|mug|quote)\s*(?:لـ|for|of)?\s*([^،,.;\n]+)/i);
    if (m && m[1]) return m[1].trim().toUpperCase().slice(0, 20);
    return fallback;
  }

  function extractSubtitle(prompt, fallback) {
    const raw = String(prompt || "").trim();
    if (!raw) return fallback;
    if (/عصري|modern/i.test(raw)) return "Modern / clean";
    if (/فخم|premium|luxury/i.test(raw)) return "Premium look";
    if (/minimal/i.test(raw)) return "Minimal style";
    if (/street|ستريت|graffiti/i.test(raw)) return "Street style";
    return fallback;
  }

  function layoutFromSpec(spec) {
    const layout = [];
    const bg = spec.bg || "#0b0f19";
    const main = spec.color || "#2563eb";
    if (spec.type === "logo") {
      layout.push({ type: "shape", shape: "circle", x: 250, y: 175, w: 160, h: 160, fillColor: main, strokeColor: "#ffffff", strokeWidth: 2, opacity: 100 });
      layout.push({ type: "text", text: spec.title || "YOUR BRAND", x: 250, y: 330, fontSize: 50, font: spec.font || "Bebas Neue", fillColor: "#ffffff" });
      layout.push({ type: "text", text: spec.subtitle || "Premium Print Studio", x: 250, y: 385, fontSize: 17, font: "Cairo", fillColor: "#d1d5db" });
    } else if (spec.type === "card") {
      layout.push({ type: "shape", shape: "rect", x: 250, y: 250, w: 430, h: 260, fillColor: bg, strokeColor: main, strokeWidth: 3, opacity: 100 });
      layout.push({ type: "text", text: spec.title || "BUSINESS CARD", x: 250, y: 205, fontSize: 46, font: "Bebas Neue", fillColor: main });
      layout.push({ type: "text", text: spec.subtitle || "Clean & modern", x: 250, y: 255, fontSize: 18, font: "Cairo", fillColor: "#ffffff" });
      layout.push({ type: "shape", shape: "circle", x: 97, y: 97, w: 88, h: 88, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 90 });
      layout.push({ type: "text", text: "A3M", x: 97, y: 97, fontSize: 24, font: "Permanent Marker", fillColor: "#ffffff" });
    } else if (spec.type === "poster") {
      layout.push({ type: "shape", shape: "circle", x: 390, y: 120, w: 170, h: 170, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 90 });
      layout.push({ type: "text", text: spec.title || "SPECIAL DROP", x: 250, y: 225, fontSize: 58, font: "Bebas Neue", fillColor: "#ffffff" });
      layout.push({ type: "text", text: spec.subtitle || "Eye-catching layout", x: 250, y: 290, fontSize: 22, font: "Cairo", fillColor: "#e5e7eb" });
    } else {
      layout.push({ type: "text", text: spec.title || "A3M DESIGN", x: 250, y: 210, fontSize: 56, font: spec.font || "Bebas Neue", fillColor: main });
      layout.push({ type: "text", text: spec.subtitle || "Ready for print", x: 250, y: 290, fontSize: 20, font: "Cairo", fillColor: "#d1d5db" });
      layout.push({ type: "shape", shape: "circle", x: 390, y: 120, w: 120, h: 120, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 85 });
    }
    return { bg, layout };
  }

  function applyDesignSpec(spec, options = {}) {
    if (!spec) return null;
    const clear = spec.clear !== false;
    saveHist();
    if (clear) { layers = []; selectedId = null; }
    if (spec.bg) bgColorVal = spec.bg;
    const normalized = layoutFromSpec(spec);
    bgColorVal = normalized.bg || bgColorVal;
    const bgEl = document.getElementById("bgColor");
    if (bgEl) bgEl.value = bgColorVal;
    normalized.layout.forEach(el => {
      if (el.type === "text") {
        addTextLayer(el.text, el.fontSize || 40, el.font || "Cairo", el.fillColor || "#fff", "center", el.x || 250, el.y || 250);
      } else {
        const shape = el.shape || "rect";
        if (shape === "rect") addRect(el.x || 250, el.y || 250, el.w || 150, el.h || 80, el.fillColor, el.strokeColor, el.strokeWidth, el.opacity);
        else if (shape === "circle") addCircle(el.x || 250, el.y || 250, Math.round((el.w || 120) / 2), el.fillColor, el.strokeColor, el.opacity);
        else addTriangle(el.x || 250, el.y || 250, el.w || 120, el.h || 100, el.fillColor, el.strokeColor, el.opacity);
      }
    });
    drawAll();
    showToast(options.source === "chat" ? "✨ تم تطبيق التصميم" : "✨ جاهز");
    return spec;
  }

  function applyPrompt(prompt) {
    const spec = suggestionSpec(prompt);
    return applyDesignSpec(spec, { source: "prompt" });
  }

  function onChange(cb) { if (typeof cb === "function") window.A3MDesignerAI._callbacks.push(cb); }
  function notifyChange() { for (const cb of window.A3MDesignerAI._callbacks) { try { cb(); } catch {} } }
  function maybeApplyFromText(replyText) { const spec = parseDesignDirective(replyText); if (spec) return applyDesignSpec(spec, { source: "chat" }); return null; }

  window.A3MDesignerAI = {
    parseDesignDirective, suggestSpecFromPrompt: suggestionSpec,
    applyDesignSpec, applyPrompt, maybeApplyFromText,
    summarizeCurrentDesign: summarizeDesign, onChange, _callbacks: [],
  };

  // ── Public API ──
  window.initCanvasRefs       = initCanvasRefs;
  window.resetDesignerState   = resetDesignerState;
  window.openDesigner         = openDesigner;
  window.initDesigner         = initDesigner;
  window.closeDesigner        = closeDesigner;
  window.buildTemplates       = buildTemplates;
  window.setTool              = setTool;
  window.addText              = addText;
  window.addShape             = addShape;
  window.uploadImage          = uploadImage;
  window.downloadDesign       = downloadDesign;
  window.saveToCart           = saveToCart;
  window.deleteSelected       = deleteSelected;
  window.duplicateSelected    = duplicateSelected;
  window.bringForward         = bringForward;
  window.sendBackward         = sendBackward;
  window.bringToFront         = bringToFront;
  window.sendToBack           = sendToBack;
  window.flipH                = flipH;
  window.flipV                = flipV;
  window.lockSelected         = lockSelected;
  window.clearCanvas          = clearCanvas;
  window.undoAction           = undoAction;
  window.redoAction           = redoAction;
  window.saveHist             = saveHist;
  window.selectLayer          = selectLayer;
  window.toggleVis            = toggleVis;
  window.syncSelected         = syncSelected;
  window.setTxtAlign          = setTxtAlign;
  window.applyTransform       = applyTransform;
  window.changeProduct        = changeProduct;
  window.openOrderFromDesign  = openOrderFromDesign;
  window.applyDesignSpec      = applyDesignSpec;
  window.addTextLayer         = addTextLayer;
  window.addRect              = addRect;
  window.addCircle            = addCircle;
  window.addTriangle          = addTriangle;
  window.addStar              = addStar;
  window.addLine              = addLine;
  window.setBg                = setBg;
  window.toggleGrid           = toggleGrid;
  window.toggleSnap           = toggleSnap;
  window.toggleRulers         = toggleRulers;
  window.drawRulers           = drawRulers;
  window.alignLayers          = alignLayers;
  window.translateDesignerUI  = translateDesignerUI;
  window.drawAll              = drawAll;
  window.updateDesignPrice    = updateDesignPrice;
  window.showToast            = showToast;
  window._A3MDesignerInternals = { summarizeDesign, changeProduct };

  document.addEventListener("DOMContentLoaded", function () {
    const cp = document.getElementById("canvasProduct");
    if (cp) canvasProdType = cp.value;
    window._a3mModulesReady = true;
    window.dispatchEvent(new Event("a3m-ready"));
  });

})();

export {};
