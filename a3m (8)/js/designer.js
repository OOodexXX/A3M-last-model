// ============================================================
// designer.js  –  A3M Print  –  Smart Canvas Design Studio
// ============================================================

(function () {
  "use strict";

  const PROD_EMOJI = { tshirt: "👕", mug: "☕", hat: "🧢", bag: "🎒", paper: "📄" };
  const HANDLE_SIZE = 8;

  const TEMPLATES = [
    { name: "Bold Logo", icon: "🅰", fn: () => { clearCanvas(); addTextLayer("YOUR BRAND", 52, "Permanent Marker", "#ffffff", "center", 250, 230); addTextLayer("EST. 2024", 20, "Bebas Neue", "#c9a84c", "center", 250, 285); } },
    { name: "Graffiti", icon: "✏", fn: () => { clearCanvas(); addTextLayer("STREET", 78, "Permanent Marker", "#7c3aed", "center", 250, 200); addTextLayer("STYLE", 52, "Pacifico", "#c9a84c", "center", 250, 285); } },
    { name: "Minimal", icon: "◻", fn: () => { clearCanvas(); addTextLayer("MINIMAL", 60, "Bebas Neue", "#ffffff", "center", 250, 250); } },
    { name: "Script", icon: "𝒮", fn: () => { clearCanvas(); addTextLayer("Hello", 70, "Dancing Script", "#111111", "center", 250, 210); } },
    { name: "Orbitron", icon: "🛸", fn: () => { clearCanvas(); addTextLayer("FUTURE", 55, "Orbitron", "#7c3aed", "center", 250, 230); addTextLayer("DESIGN", 30, "Orbitron", "#c9a84c", "center", 250, 290); } },
    { name: "Classic", icon: "🏅", fn: () => { clearCanvas(); addTextLayer("A3M", 70, "Permanent Marker", "#111111", "center", 250, 210); addTextLayer("PRINT STUDIO", 22, "Bebas Neue", "#111111", "center", 250, 290); } },
  ];

  window.TEMPLATES = TEMPLATES;

  let layers = [];
  let selectedId = null;
  let activeTool = "select";
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = "";
  let dragOffX = 0, dragOffY = 0;
  let resizeStartX = 0, resizeStartY = 0;
  let resizeStartW = 0, resizeStartH = 0;
  let resizeStartObjX = 0, resizeStartObjY = 0;
  let history = [];
  let bgColorVal = "#ffffff";
  let canvasProdType = "tshirt";
  let canvas = null;
  let ctx = null;
  let listenersBound = false;
  let aiPanelInjected = false;
  let selectionDirty = false;

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 1700);
  }

  function initCanvasRefs() {
    canvas = document.getElementById("designCanvas");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    return true;
  }

  function nid() {
    return "L" + ((Date.now() + Math.random() * 1000) | 0).toString(36);
  }

  function cloneState() {
    return JSON.parse(JSON.stringify({ layers, bgColorVal, selectedId, canvasProdType, activeTool }));
  }

  function saveHist() {
    history.push(cloneState());
    if (history.length > 40) history.shift();
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
    const s = history.pop();
    restoreState(s);
  }

  function addTextLayer(text, fs, font, fill, align, x, y) {
    if (!ctx) return null;
    ctx.save();
    ctx.font = `${fs}px '${font}'`;
    const w = Math.max((ctx.measureText(text).width || fs * String(text).length * 0.6) + 20, 60);
    ctx.restore();
    const layer = {
      id: nid(),
      type: "text",
      x, y,
      w,
      h: fs * 1.45,
      text: String(text || "Text"),
      font,
      fontSize: fs,
      fillColor: fill || "#ffffff",
      textAlign: align || "center",
      opacity: 100,
      rotation: 0,
      visible: true,
      flippedH: false,
      flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addRect(x, y, w, h, fill, stroke, strokeW, opacity) {
    const layer = {
      id: nid(),
      type: "rect",
      x, y,
      w: w || 150,
      h: h || 80,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "#c9a84c",
      strokeWidth: strokeW || 2,
      opacity: opacity || 100,
      rotation: 0,
      visible: true,
      flippedH: false,
      flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addCircle(x, y, r, fill, stroke, opacity) {
    const layer = {
      id: nid(),
      type: "circle",
      x, y,
      w: (r || 60) * 2,
      h: (r || 60) * 2,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "",
      strokeWidth: 2,
      opacity: opacity || 100,
      rotation: 0,
      visible: true,
      flippedH: false,
      flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addTriangle(x, y, w, h, fill, stroke, opacity) {
    const layer = {
      id: nid(),
      type: "triangle",
      x, y,
      w: w || 120,
      h: h || 100,
      fillColor: fill || "#7c3aed",
      strokeColor: stroke || "",
      strokeWidth: 2,
      opacity: opacity || 100,
      rotation: 0,
      visible: true,
      flippedH: false,
      flippedV: false,
    };
    layers.push(layer);
    selectedId = layer.id;
    drawAll();
    return layer;
  }

  function addText() {
    if (!canvas) return;
    saveHist();
    const text = (document.getElementById("txtContent") || {}).value || "Text";
    const fs = parseInt((document.getElementById("txtSize") || {}).value) || 40;
    const font = (document.getElementById("txtFont") || {}).value || "Inter";
    const fill = (document.getElementById("txtColor") || {}).value || "#000000";
    addTextLayer(text, fs, font, fill, "center", 250, 250);
  }

  function addShape(type) {
    if (!canvas) return;
    saveHist();
    const fill = (document.getElementById("shapeFill") || {}).value || "#7c3aed";
    const stroke = (document.getElementById("shapeStroke") || {}).value || "#c9a84c";
    const op = parseInt((document.getElementById("shapeOpacity") || {}).value) || 100;
    const sw = parseInt((document.getElementById("strokeW") || {}).value) || 2;
    if (type === "rect") addRect(250, 250, 150, 80, fill, stroke, sw, op);
    else if (type === "circle") addCircle(250, 250, 60, fill, stroke, op);
    else addTriangle(250, 250, 120, 100, fill, stroke, op);
  }

  function syncSelected() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    if (l.type === "text") {
      l.text = (document.getElementById("txtContent") || {}).value || l.text;
      l.fontSize = parseInt((document.getElementById("txtSize") || {}).value) || l.fontSize;
      l.font = (document.getElementById("txtFont") || {}).value || l.font;
      l.fillColor = (document.getElementById("txtColor") || {}).value || l.fillColor;
      if (ctx) {
        ctx.save();
        ctx.font = `${l.fontSize}px '${l.font}'`;
        l.w = Math.max(ctx.measureText(l.text).width + 20, 60);
        ctx.restore();
      }
      l.h = l.fontSize * 1.45;
    } else {
      l.fillColor = (document.getElementById("shapeFill") || {}).value || l.fillColor;
      l.strokeColor = (document.getElementById("shapeStroke") || {}).value || l.strokeColor;
      l.strokeWidth = parseInt((document.getElementById("strokeW") || {}).value) || l.strokeWidth;
      l.opacity = parseInt((document.getElementById("shapeOpacity") || {}).value) || l.opacity;
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

  function getHandlePositions(l) {
    const hw = l.w / 2, hh = l.h / 2;
    return [
      { name: "nw", lx: -hw, ly: -hh }, { name: "n", lx: 0, ly: -hh }, { name: "ne", lx: hw, ly: -hh },
      { name: "e", lx: hw, ly: 0 }, { name: "se", lx: hw, ly: hh }, { name: "s", lx: 0, ly: hh },
      { name: "sw", lx: -hw, ly: hh }, { name: "w", lx: -hw, ly: 0 },
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
    return Math.abs(loc.lx) <= l.w / 2 + 5 && Math.abs(loc.ly) <= l.h / 2 + 5;
  }

  function hitTestHandle(l, wx, wy) {
    const loc = worldToLocal(l, wx, wy);
    for (const h of getHandlePositions(l)) {
      if (Math.abs(loc.lx - h.lx) <= HANDLE_SIZE && Math.abs(loc.ly - h.ly) <= HANDLE_SIZE) return h.name;
    }
    if (Math.abs(loc.lx) <= 8 && Math.abs(loc.ly + l.h / 2 + 22) <= 8) return "rotate";
    return null;
  }

  function getCanvasXY(e) {
    if (!canvas) return { x: 0, y: 0 };
    const t = e.touches ? e.touches[0] : e;
    const r = canvas.getBoundingClientRect();
    return {
      x: (t.clientX - r.left) * (canvas.width / r.width),
      y: (t.clientY - r.top) * (canvas.height / r.height),
    };
  }

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
      ctx.font = `${l.fontSize}px '${l.font}'`;
      ctx.fillStyle = l.fillColor;
      ctx.textAlign = l.textAlign || "center";
      ctx.textBaseline = "middle";
      ctx.fillText(l.text, 0, 0);
    } else if (l.type === "rect") {
      ctx.fillStyle = l.fillColor;
      ctx.fillRect(-hw, -hh, l.w, l.h);
      if (l.strokeColor && l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor;
        ctx.lineWidth = l.strokeWidth;
        ctx.strokeRect(-hw, -hh, l.w, l.h);
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
    } else if (l.type === "image" && l.img) {
      ctx.drawImage(l.img, -hw, -hh, l.w, l.h);
    }

    ctx.restore();

    if (l.id === selectedId) {
      ctx.save();
      ctx.translate(l.x, l.y);
      if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
      const hw2 = l.w / 2, hh2 = l.h / 2;
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(-hw2 - 1, -hh2 - 1, l.w + 2, l.h + 2);
      ctx.setLineDash([]);

      getHandlePositions(l).forEach(h => {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 1;
        ctx.fillRect(h.lx - HANDLE_SIZE / 2, h.ly - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(h.lx - HANDLE_SIZE / 2, h.ly - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      });

      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(0, -hh2 - 1);
      ctx.lineTo(0, -hh2 - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c9a84c";
      ctx.beginPath();
      ctx.arc(0, -hh2 - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAll() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgColorVal && bgColorVal !== "transparent") {
      ctx.fillStyle = bgColorVal;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.font = "200px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#888";
    ctx.fillText(PROD_EMOJI[canvasProdType] || "👕", 250, 250);
    ctx.restore();

    layers.filter(l => l.visible).forEach(drawLayer);
    renderLayers();
    updateTransformPanel();
    updateCanvasModeBadge();
  }

  function _onPointerDown(e) {
    if (!canvas) return;
    const { x, y } = getCanvasXY(e);

    if (activeTool === "select") {
      const sel = layers.find(l => l.id === selectedId);
      if (sel) {
        const h = hitTestHandle(sel, x, y);
        if (h) {
          isResizing = true;
          resizeHandle = h;
          resizeStartX = x;
          resizeStartY = y;
          resizeStartW = sel.w;
          resizeStartH = sel.h;
          resizeStartObjX = sel.x;
          resizeStartObjY = sel.y;
          return;
        }
      }

      let hit = null;
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].visible && hitTestLayer(layers[i], x, y)) { hit = layers[i]; break; }
      }
      if (hit) {
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
    const text = (document.getElementById("txtContent") || {}).value || "Text";
    const fs = parseInt((document.getElementById("txtSize") || {}).value) || 40;
    const font = (document.getElementById("txtFont") || {}).value || "Inter";
    const txtFill = (document.getElementById("txtColor") || {}).value || "#000000";

    if (activeTool === "text") {
      addTextLayer(text, fs, font, txtFill, "center", x, y);
      setTool("select");
    } else if (activeTool === "rect") {
      addRect(x, y, 150, 80, fill, stroke, sw, op);
      setTool("select");
    } else if (activeTool === "circle") {
      addCircle(x, y, 60, fill, stroke, op);
      setTool("select");
    } else if (activeTool === "triangle") {
      addTriangle(x, y, 120, 100, fill, stroke, op);
      setTool("select");
    }
  }

  function _onPointerMove(e) {
    if (!canvas) return;
    const { x, y } = getCanvasXY(e);
    const sel = layers.find(l => l.id === selectedId);

    if (isDragging && sel) {
      sel.x = x - dragOffX;
      sel.y = y - dragOffY;
      drawAll();
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
  }

  function setTool(t) {
    activeTool = t;
    document.querySelectorAll('.d-tool-btn[id^="tool-"]').forEach(b => b.classList.remove("active"));
    const btn = document.getElementById("tool-" + t);
    if (btn) btn.classList.add("active");
    if (canvas) canvas.style.cursor = t === "select" ? "default" : "crosshair";
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveHist();
    layers = layers.filter(l => l.id !== selectedId);
    selectedId = null;
    drawAll();
  }

  function duplicateSelected() {
    const l = layers.find(x => x.id === selectedId);
    if (!l) return;
    saveHist();
    const copy = JSON.parse(JSON.stringify(l));
    copy.id = nid();
    copy.x += 20;
    copy.y += 20;
    layers.push(copy);
    selectedId = copy.id;
    drawAll();
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

  function flipH() {
    const l = layers.find(x => x.id === selectedId);
    if (l) {
      saveHist();
      l.flippedH = !l.flippedH;
      drawAll();
    }
  }

  function flipV() {
    const l = layers.find(x => x.id === selectedId);
    if (l) {
      saveHist();
      l.flippedV = !l.flippedV;
      drawAll();
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
    if (!l) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("objW", Math.round(l.w));
    set("objH", Math.round(l.h));
    set("objX", Math.round(l.x));
    set("objY", Math.round(l.y));
    set("objRot", Math.round(l.rotation || 0));
    setT("rotVal", (l.rotation || 0) + "°");
    if (l.type === "text") {
      set("txtContent", l.text);
      set("txtSize", l.fontSize);
      setT("txtSzVal", l.fontSize);
      set("txtColor", l.fillColor);
      if (l.font) set("txtFont", l.font);
    } else {
      set("shapeFill", l.fillColor || "#7c3aed");
      set("shapeStroke", l.strokeColor || "#c9a84c");
      set("shapeOpacity", l.opacity || 100);
      setT("opVal", l.opacity || 100);
    }
  }

  function renderLayers() {
    const ll = document.getElementById("layersList");
    if (!ll) return;
    ll.innerHTML = [...layers].reverse().map(l => `
      <div class="layer-item${l.id === selectedId ? " selected" : ""}" onclick="selectLayer('${l.id}')">
        <span class="layer-icon">${l.type === "text" ? "T" : l.type === "image" ? "🖼" : l.type === "circle" ? "○" : l.type === "triangle" ? "△" : "▭"}</span>
        <span class="layer-name">${l.type === "text" ? l.text : l.type + " layer"}</span>
        <div class="layer-actions">
          <button class="layer-act-btn" onclick="event.stopPropagation();toggleVis('${l.id}')">${l.visible ? "👁" : "○"}</button>
          <button class="layer-act-btn" onclick="event.stopPropagation();selectedId='${l.id}';deleteSelected()">✕</button>
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
    if (l) {
      saveHist();
      l.visible = !l.visible;
      drawAll();
    }
  }

  function uploadImage(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        saveHist();
        const sc = Math.min(250 / img.width, 250 / img.height);
        const w = img.width * sc, h = img.height * sc;
        const l = { id: nid(), type: "image", x: 250, y: 250, w, h, img, fillColor: "", strokeColor: "", strokeWidth: 0, opacity: 100, rotation: 0, visible: true, flippedH: false, flippedV: false };
        layers.push(l);
        selectedId = l.id;
        drawAll();
        showToast("Image added ✦");
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
    const link = document.createElement("a");
    link.download = "A3M_Design.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Design exported ✦");
  }

  function saveToCart() {
    const name = "Custom Design (" + canvasProdType + ")";
    const item = { id: "custom-design", name, emoji: "🎨", price: 1500, qty: 1 };
    if (typeof window.cart !== "undefined") {
      const ex = window.cart.find(i => i.id === item.id);
      if (ex) ex.qty += 1;
      else window.cart.push(item);
    }
    if (typeof updateCart === "function") updateCart();
    if (typeof closeDesigner === "function") closeDesigner();
    showToast("Added ✦");
  }

  function openOrderFromDesign() {
    const modal = document.getElementById("orderModal");
    if (!modal) {
      if (typeof window.openOrderForm === "function") window.openOrderForm();
      return;
    }
    modal.style.display = "flex";
    const title = document.getElementById("orderTitle");
    if (title) title.textContent = "📋 طلب من التصميم";
    const notes = document.getElementById("inp-notes");
    if (notes) {
      const summary = summarizeDesign();
      notes.value = summary;
    }
  }

  function summarizeDesign() {
    const parts = [];
    parts.push(`منتج: ${canvasProdType}`);
    parts.push(`الطبقات: ${layers.length}`);
    const texts = layers.filter(l => l.type === "text").map(l => l.text).slice(0, 4);
    if (texts.length) parts.push(`نصوص التصميم: ${texts.join(" / ")}`);
    return parts.join("\n");
  }

  function addSmartPalette() {
    if (document.getElementById("a3m-ai-panel")) return;
    const panel = document.querySelector(".d-panel");
    if (!panel) return;

    // ── تحديد اللغة الحالية ──
    const lang = window.currentLang || localStorage.getItem('a3m_lang') || 'ar';
    const dt = {
      ar: {
        aiTitle: 'ذكاء التصميم',
        aiPlaceholder: 'مثال: صمّم لي شعار أسود وذهبي لبراند ملابس',
        apply: '✨ طبق',
        suggest: '🧠 اقتراح',
        clear: '🧹 مسح',
        aiHint: 'اكتب وصفًا، ثم اضغط <b>طبق</b>. إذا أرسل A3M Bot كود التصميم، سيُطبّق تلقائيًا.',
      },
      en: {
        aiTitle: 'AI Design',
        aiPlaceholder: 'e.g. Design a black & gold logo for a clothing brand',
        apply: '✨ Apply',
        suggest: '🧠 Suggest',
        clear: '🧹 Clear',
        aiHint: 'Describe your design, then press <b>Apply</b>. A3M Bot design codes apply automatically.',
      },
      fr: {
        aiTitle: 'IA Design',
        aiPlaceholder: 'ex: Logo noir et or pour une marque de vêtements',
        apply: '✨ Appliquer',
        suggest: '🧠 Suggérer',
        clear: '🧹 Effacer',
        aiHint: 'Décrivez votre design, puis appuyez sur <b>Appliquer</b>.',
      },
    };
    const d = dt[lang] || dt.ar;

    const section = document.createElement("div");
    section.className = "d-panel-section";
    section.id = "a3m-ai-panel";
    section.innerHTML = `
      <div class="d-panel-title">${d.aiTitle}</div>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        <input class="d-input" id="a3mAiPrompt" placeholder="${d.aiPlaceholder}"/>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          <button class="d-small-btn" type="button" id="a3mAiApplyBtn">${d.apply}</button>
          <button class="d-small-btn" type="button" id="a3mAiSuggestBtn">${d.suggest}</button>
          <button class="d-small-btn" type="button" id="a3mAiClearBtn">${d.clear}</button>
        </div>
        <div style="font-size:12px;color:var(--txt3);line-height:1.7">
          ${d.aiHint}
        </div>
      </div>
    `;
    panel.insertBefore(section, panel.firstChild);

    section.querySelector("#a3mAiApplyBtn").onclick = () => {
      const prompt = (document.getElementById("a3mAiPrompt") || {}).value || "";
      if (window.A3MDesignerAI) window.A3MDesignerAI.applyPrompt(prompt);
      else showToast(lang === 'ar' ? "المساعد غير جاهز" : "AI not ready");
    };
    section.querySelector("#a3mAiSuggestBtn").onclick = () => {
      const prompt = (document.getElementById("a3mAiPrompt") || {}).value || "";
      if (window.A3MDesignerAI) {
        const spec = window.A3MDesignerAI.suggestSpecFromPrompt(prompt);
        showToast(lang === 'ar' ? "تم إنشاء اقتراح" : "Suggestion applied");
        window.A3MDesignerAI.applyDesignSpec(spec, { source: "suggest" });
      }
    };
    section.querySelector("#a3mAiClearBtn").onclick = () => {
      const msg = lang === 'ar' ? "مسح اللوحة؟" : lang === 'fr' ? "Effacer la toile?" : "Clear canvas?";
      if (confirm(msg)) clearCanvas();
    };
  }

  // ── ترجمة الشريط العلوي وعناوين الأدوات ──
  function translateDesignerUI() {
    const lang = window.currentLang || localStorage.getItem('a3m_lang') || 'ar';
    const labels = {
      ar: {
        'tool-select': 'تحديد', 'tool-text': 'نص', 'tool-rect': 'مستطيل',
        'tool-circle': 'دائرة', 'tool-triangle': 'مثلث',
        undo: '↩ تراجع', clear: '🗑 مسح', download: '⬇ تحميل', addToCart: '🛒 أضف للسلة',
        addText: '+ إضافة نص', addShape: 'إضافة شكل', upload: '⬆ رفع صورة',
        deleteEl: '🗑 حذف', duplicate: '⧉ نسخ', bringFwd: '▲ للأمام', sendBwd: '▼ للخلف',
      },
      en: {
        'tool-select': 'Select', 'tool-text': 'Text', 'tool-rect': 'Rectangle',
        'tool-circle': 'Circle', 'tool-triangle': 'Triangle',
        undo: '↩ Undo', clear: '🗑 Clear', download: '⬇ Download', addToCart: '🛒 Add to Cart',
        addText: '+ Add Text', addShape: 'Add Shape', upload: '⬆ Upload Image',
        deleteEl: '🗑 Delete', duplicate: '⧉ Duplicate', bringFwd: '▲ Bring Fwd', sendBwd: '▼ Send Bwd',
      },
      fr: {
        'tool-select': 'Sélection', 'tool-text': 'Texte', 'tool-rect': 'Rectangle',
        'tool-circle': 'Cercle', 'tool-triangle': 'Triangle',
        undo: '↩ Annuler', clear: '🗑 Effacer', download: '⬇ Télécharger', addToCart: '🛒 Ajouter',
        addText: '+ Ajouter texte', addShape: 'Ajouter forme', upload: '⬆ Importer image',
        deleteEl: '🗑 Supprimer', duplicate: '⧉ Dupliquer', bringFwd: '▲ Avant', sendBwd: '▼ Arrière',
      },
    };
    const L = labels[lang] || labels.ar;

    // أزرار الأدوات
    ['select','text','rect','circle','triangle'].forEach(t => {
      const btn = document.getElementById('tool-' + t);
      if (btn && L['tool-' + t]) btn.title = L['tool-' + t];
    });

    // أزرار الشريط العلوي
    const btnMap = [
      ['undoBtn', 'undo'], ['clearBtn', 'clear'],
      ['downloadBtn', 'download'], ['addToCartBtn', 'addToCart'],
    ];
    btnMap.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el && L[key]) el.textContent = L[key];
    });

    // خيارات المنتج
    const prodSel = document.getElementById('canvasProduct');
    if (prodSel) {
      const prodNames = {
        ar: ['👕 تيشرت','☕ كوب','🧢 قبعة','🎒 حقيبة','📄 ورقة'],
        en: ['👕 T-Shirt','☕ Mug','🧢 Hat','🎒 Bag','📄 Paper'],
        fr: ['👕 T-Shirt','☕ Tasse','🧢 Casquette','🎒 Sac','📄 Papier'],
      };
      const opts = prodSel.querySelectorAll('option');
      const names = prodNames[lang] || prodNames.ar;
      opts.forEach((opt, i) => { if (names[i]) opt.textContent = names[i]; });
    }
  }

  function buildTemplates() {
    const tg = document.getElementById("templatesGrid");
    if (!tg) return;
    tg.innerHTML = TEMPLATES.map((t, i) => `
      <div class="template-thumb" onclick="TEMPLATES[${i}].fn();showToast('Template applied ✦')">
        <span class="t-icon">${t.icon}</span><span>${t.name}</span>
      </div>
    `).join("");
  }

  function openDesigner(mode) {
    if (typeof closeModePicker === "function") closeModePicker();
    if (!initCanvasRefs()) {
      console.error("designCanvas not found");
      return;
    }
    const lang = window.currentLang || localStorage.getItem('a3m_lang') || 'ar';
    const modeLabels = {
      template: { ar: 'القوالب الجاهزة', en: 'Template Mode', fr: 'Mode Modèles' },
      scratch:  { ar: 'من الصفر', en: 'Scratch Mode', fr: 'Mode Libre' },
    };
    if (typeof mode === "string") {
      const titleEl = document.getElementById("topbarTitle");
      if (titleEl) {
        titleEl.dataset.manual = "1";
        titleEl.textContent = (modeLabels[mode] && modeLabels[mode][lang]) || (mode === "template" ? "Templates Mode" : "Scratch Mode");
      }
    }
    clearCanvas();
    const dm = document.getElementById("designerModal");
    if (dm) dm.classList.add("open");
    setTimeout(() => {
      buildTemplates();
      addSmartPalette();
      drawAll();
      translateDesignerUI();
    }, 50);
    bindCanvasEvents();
  }

  function bindCanvasEvents() {
    if (!canvas || listenersBound) return;
    listenersBound = true;
    canvas.addEventListener("mousedown", _onPointerDown);
    canvas.addEventListener("mousemove", _onPointerMove);
    canvas.addEventListener("mouseup", _onPointerUp);
    canvas.addEventListener("mouseleave", _onPointerUp);
    canvas.addEventListener("touchstart", e => { e.preventDefault(); _onPointerDown(e); }, { passive: false });
    canvas.addEventListener("touchmove", e => { e.preventDefault(); _onPointerMove(e); }, { passive: false });
    canvas.addEventListener("touchend", e => { e.preventDefault(); _onPointerUp(); }, { passive: false });
    const bgEl = document.getElementById("bgColor");
    if (bgEl) bgEl.addEventListener("input", () => { bgColorVal = bgEl.value; drawAll(); });
  }

  function closeDesigner() {
    const dm = document.getElementById("designerModal");
    if (dm) dm.classList.remove("open");
  }

  function initDesigner(mode) {
    openDesigner(mode);
  }

  function parseDesignDirective(text) {
    const match = String(text || "").match(/\[GENERATE_DESIGN:({[\s\S]*?})\]/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }

  function suggestionSpec(prompt) {
    const p = String(prompt || "").toLowerCase();
    const isLogo = /(logo|شعار|براند|brand)/i.test(p);
    const isCard = /(card|كرت|business)/i.test(p);
    const isPoster = /(poster|بوستر|ملصق|banner|poster)/i.test(p);
    const isQuote = /(quote|اقتباس|عبارة)/i.test(p);
    const color = p.includes("ذهبي") || p.includes("gold") ? "#c9a84c" : p.includes("purple") || p.includes("بنفسجي") ? "#7c3aed" : "#2563eb";

    if (isLogo) {
      return {
        type: "logo",
        title: extractTitle(prompt, "YOUR BRAND"),
        subtitle: extractSubtitle(prompt, "Premium Print Studio"),
        color,
        bg: "#0b0f19",
        font: "Cairo",
        clear: true,
      };
    }

    if (isCard) {
      return {
        type: "card",
        title: extractTitle(prompt, "BUSINESS CARD"),
        subtitle: extractSubtitle(prompt, "Clean & modern"),
        color,
        bg: "#111827",
        font: "Cairo",
        clear: true,
      };
    }

    if (isPoster) {
      return {
        type: "poster",
        title: extractTitle(prompt, "SPECIAL DROP"),
        subtitle: extractSubtitle(prompt, "Eye-catching layout"),
        color,
        bg: "#0f172a",
        font: "Bebas Neue",
        clear: true,
      };
    }

    if (isQuote) {
      return {
        type: "text",
        title: extractTitle(prompt, "QUOTE"),
        subtitle: extractSubtitle(prompt, "Elegant typography"),
        color,
        bg: "#ffffff",
        font: "Dancing Script",
        clear: true,
      };
    }

    return {
      type: "text",
      title: extractTitle(prompt, "A3M DESIGN"),
      subtitle: extractSubtitle(prompt, "Ready for print"),
      color,
      bg: "#0b0f19",
      font: "Inter",
      clear: true,
    };
  }

  function extractTitle(prompt, fallback) {
    const raw = String(prompt || "").trim();
    if (!raw) return fallback;
    const m = raw.match(/(?:logo|شعار|كرت|card|poster|بوستر|تيشرت|shirt|mug|quote)\s*(?:لـ|for|of)?\s*([^،,.;\n]+)/i);
    if (m && m[1]) return m[1].trim().toUpperCase();
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
      layout.push({ type: "shape", shape: "circle", x: 250, y: 175, w: 150, h: 150, fillColor: main, strokeColor: "#ffffff", strokeWidth: 2, opacity: 100 });
      layout.push({ type: "text", text: spec.title || "YOUR BRAND", x: 250, y: 330, fontSize: 50, font: "Bebas Neue", fillColor: "#ffffff" });
      layout.push({ type: "text", text: spec.subtitle || "Premium Print Studio", x: 250, y: 382, fontSize: 18, font: "Inter", fillColor: "#d1d5db" });
    } else if (spec.type === "card") {
      layout.push({ type: "shape", shape: "rect", x: 250, y: 250, w: 430, h: 250, fillColor: bg, strokeColor: main, strokeWidth: 3, opacity: 100 });
      layout.push({ type: "text", text: spec.title || "BUSINESS CARD", x: 250, y: 205, fontSize: 46, font: "Bebas Neue", fillColor: main });
      layout.push({ type: "text", text: spec.subtitle || "Clean & modern", x: 250, y: 255, fontSize: 18, font: "Inter", fillColor: "#ffffff" });
      layout.push({ type: "shape", shape: "circle", x: 97, y: 97, w: 85, h: 85, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 90 });
      layout.push({ type: "text", text: "A3M", x: 97, y: 97, fontSize: 24, font: "Permanent Marker", fillColor: "#ffffff" });
    } else if (spec.type === "poster") {
      layout.push({ type: "shape", shape: "rect", x: 250, y: 250, w: 500, h: 500, fillColor: bg, strokeColor: "", strokeWidth: 0, opacity: 100 });
      layout.push({ type: "shape", shape: "circle", x: 390, y: 120, w: 165, h: 165, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 95 });
      layout.push({ type: "text", text: spec.title || "SPECIAL DROP", x: 250, y: 215, fontSize: 56, font: "Bebas Neue", fillColor: "#ffffff" });
      layout.push({ type: "text", text: spec.subtitle || "Eye-catching layout", x: 250, y: 285, fontSize: 22, font: "Cairo", fillColor: "#e5e7eb" });
    } else {
      layout.push({ type: "text", text: spec.title || "A3M DESIGN", x: 250, y: 210, fontSize: 56, font: spec.font || "Inter", fillColor: main });
      layout.push({ type: "text", text: spec.subtitle || "Ready for print", x: 250, y: 290, fontSize: 20, font: "Cairo", fillColor: "#d1d5db" });
      layout.push({ type: "shape", shape: "circle", x: 390, y: 120, w: 115, h: 115, fillColor: main, strokeColor: "", strokeWidth: 0, opacity: 90 });
    }
    return { bg, layout };
  }

  function applyDesignSpec(spec, options = {}) {
    if (!spec) return null;
    const clear = spec.clear !== false;
    saveHist();
    if (clear) {
      layers = [];
      selectedId = null;
    }
    if (spec.bg) bgColorVal = spec.bg;
    const normalized = layoutFromSpec(spec);
    bgColorVal = normalized.bg || bgColorVal;

    normalized.layout.forEach(el => {
      if (el.type === "text") {
        addTextLayer(el.text, el.fontSize || 40, el.font || "Inter", el.fillColor || "#fff", "center", el.x || 250, el.y || 250);
      } else {
        const shape = el.shape || "rect";
        if (shape === "rect") addRect(el.x || 250, el.y || 250, el.w || 150, el.h || 80, el.fillColor, el.strokeColor, el.strokeWidth, el.opacity);
        else if (shape === "circle") addCircle(el.x || 250, el.y || 250, Math.round((el.w || 120) / 2), el.fillColor, el.strokeColor, el.opacity);
        else addTriangle(el.x || 250, el.y || 250, el.w || 120, el.h || 100, el.fillColor, el.strokeColor, el.opacity);
      }
    });

    drawAll();
    const label = options.source === "chat" ? "Design applied from AI" : "Design ready";
    showToast(label);
    return spec;
  }

  function applyPrompt(prompt) {
    const spec = suggestionSpec(prompt);
    return applyDesignSpec(spec, { source: "prompt" });
  }

  function onChange(cb) {
    if (typeof cb === "function") {
      window.A3MDesignerAI._callbacks.push(cb);
    }
  }

  function notifyChange() {
    for (const cb of window.A3MDesignerAI._callbacks) {
      try { cb(); } catch {}
    }
  }

  function maybeApplyFromText(replyText) {
    const spec = parseDesignDirective(replyText);
    if (spec) return applyDesignSpec(spec, { source: "chat" });
    return null;
  }

  function ensureNoDuplicateTemplateTitle() {
    const t = document.getElementById("topbarTitle");
    if (t) t.dataset.manual = "1";
  }

  function closeDesignerIfOpen() {
    const dm = document.getElementById("designerModal");
    if (dm) dm.classList.remove("open");
  }

  window.A3MDesignerAI = {
    parseDesignDirective,
    suggestSpecFromPrompt: suggestionSpec,
    applyDesignSpec,
    applyPrompt,
    maybeApplyFromText,
    summarizeCurrentDesign: summarizeDesign,
    onChange,
    _callbacks: [],
  };

  function setToolActiveUI(t) {
    document.querySelectorAll('.d-tool-btn[id^="tool-"]').forEach(b => b.classList.remove("active"));
    const btn = document.getElementById("tool-" + t);
    if (btn) btn.classList.add("active");
  }

  function changeSelectionFromText(specText) {
    const spec = parseDesignDirective(specText);
    if (spec) applyDesignSpec(spec, { source: "chat" });
    return !!spec;
  }

  function clearAndApply(spec) {
    saveHist();
    layers = [];
    selectedId = null;
    if (spec && spec.bg) bgColorVal = spec.bg;
    applyDesignSpec(spec, { source: "chat" });
  }

  function initAfterReady() {
    const cp = document.getElementById("canvasProduct");
    if (cp) cp.value = canvasProdType;
    drawAll();
  }

  function findDefaultPromptTarget() {
    return document.getElementById("a3mAiPrompt");
  }



  window.initCanvasRefs = initCanvasRefs;
  window.openDesigner = openDesigner;
  window.initDesigner = initDesigner;
  window.closeDesigner = closeDesigner;
  window.buildTemplates = buildTemplates;
  window.setTool = setTool;
  window.addText = addText;
  window.addShape = addShape;
  window.uploadImage = uploadImage;
  window.downloadDesign = downloadDesign;
  window.saveToCart = saveToCart;
  window.deleteSelected = deleteSelected;
  window.duplicateSelected = duplicateSelected;
  window.bringForward = bringForward;
  window.sendBackward = sendBackward;
  window.flipH = flipH;
  window.flipV = flipV;
  window.clearCanvas = clearCanvas;
  window.undoAction = undoAction;
  window.selectLayer = selectLayer;
  window.toggleVis = toggleVis;
  window.syncSelected = syncSelected;
  window.setTxtAlign = setTxtAlign;
  window.applyTransform = applyTransform;
  window.changeProduct = changeProduct;
  window.openOrderFromDesign = openOrderFromDesign;
  window.applyDesignSpec = applyDesignSpec;
  window.addTextLayer = addTextLayer;
  window.addRect = addRect;
  window.addCircle = addCircle;
  window.addTriangle = addTriangle;
  window.changeSelectionFromText = changeSelectionFromText;
  window.clearAndApplyDesign = clearAndApply;
  window.translateDesignerUI = translateDesignerUI;
  window._A3MDesignerInternals = { summarizeDesign, changeProduct, findDefaultPromptTarget };

  document.addEventListener("DOMContentLoaded", () => {
    const cp = document.getElementById("canvasProduct");
    if (cp) canvasProdType = cp.value;
    if (document.getElementById("designCanvas")) {
      initCanvasRefs();
      bindCanvasEvents();
      initAfterReady();
    }
  });

})();
