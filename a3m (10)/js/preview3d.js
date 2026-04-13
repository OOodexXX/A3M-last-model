// ============================================================
// preview3d.js  –  A3M Print  –  Advanced 3D Preview v2
// ============================================================
// ربط كامل مع Designer:
//   • يأخذ التصميم من الـ Canvas مباشرة كـ texture
//   • يطبقه على موديل 3D للمنتج المختار
//   • رفع STL/OBJ خارجي
//   • rotate / zoom / pan (right-click)
//   • Live sync كل 700ms
// ============================================================

(function () {
  "use strict";

  const PRODUCT_COLORS = {
    tshirt: 0xf0f0f0, mug: 0xe8e8e8, hat: 0x2a2a2a, bag: 0x8B6914, paper: 0xfafaf5,
  };

  let renderer = null, scene = null, camera = null, animId = null;
  let model = null, printZone = null, designTex = null;
  let isOpen = false, autoRotate = true;
  let currentProduct = "tshirt", customModelLoaded = false, syncInterval = null;

  let isOrbiting = false, isPanning = false;
  let lastMouse = { x: 0, y: 0 };
  let spherical = { theta: 0.5, phi: 1.1, radius: 5 };
  let panOffset = { x: 0, y: 0 };
  let lastTouches = null;

  /* ── OPEN / CLOSE ── */
  function open3DViewer() {
    const modal = document.getElementById("preview3dModal");
    if (!modal) return;
    const cp = document.getElementById("canvasProduct");
    if (cp && cp.value) currentProduct = cp.value;
    modal.classList.add("active");
    isOpen = true;
    document.body.style.overflow = "hidden";
    if (!renderer) initThree();
    else onResize();
    loadProductModel(currentProduct);
    startLoop();
    startSync();
    updateProductTabs();
  }

  function close3DViewer() {
    const modal = document.getElementById("preview3dModal");
    if (modal) modal.classList.remove("active");
    isOpen = false;
    document.body.style.overflow = "";
    stopLoop();
    stopSync();
  }

  /* ── THREE.JS INIT ── */
  function initThree() {
    const container = document.getElementById("preview3dCanvas");
    if (!container) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1018);
    scene.fog = new THREE.FogExp2(0x0e1018, 0.04);
    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 200);
    updateCameraPosition();
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    buildLights();
    buildFloor();
    bindOrbitEvents(container);
    window.addEventListener("resize", onResize);
  }

  function buildLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
    key.position.set(6, 10, 6); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 50;
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9a84c, 0.45);
    fill.position.set(-6, 3, -4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x7c3aed, 0.35);
    rim.position.set(0, -4, -8); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x1a1a3a, 0x0a0a12, 0.35));
  }

  function buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x111320, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.3;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(16, 24, 0x222236, 0x1a1a2e);
    grid.position.y = -2.28;
    scene.add(grid);
  }

  /* ── PRODUCT MODELS ── */
  function loadProductModel(type) {
    clearModel();
    customModelLoaded = false;
    setStatus("");
    switch (type) {
      case "mug":   buildMug();   break;
      case "hat":   buildHat();   break;
      case "bag":   buildBag();   break;
      case "paper": buildPaper(); break;
      default:      buildTshirt();
    }
    currentProduct = type;
    applyDesignTexture();
    updateProductTabs();
  }

  function buildTshirt() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.tshirt;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.18, 4, 8, 1), mat);
    body.castShadow = true; group.add(body);
    [-1.45, 1.45].forEach(function(x) {
      var sl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.15), mat);
      sl.position.set(x, 0.55, 0); sl.rotation.z = x < 0 ? 0.45 : -0.45;
      sl.castShadow = true; group.add(sl);
    });
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.07, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
    );
    collar.position.set(0, 1.55, 0.02); group.add(collar);
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6, 16, 16), pzMat);
    printZone.position.set(0, 0.1, 0.105); group.add(printZone);
    model = group; scene.add(model);
  }

  function buildMug() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.mug;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.05 });
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.72, 2.0, 40, 8, true),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide })
    );
    cup.castShadow = true; group.add(cup);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.72, 40), mat);
    bot.rotation.x = -Math.PI / 2; bot.position.y = -1.0; group.add(bot);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 10, 22, Math.PI), mat);
    handle.position.set(0.95, 0, 0); handle.rotation.y = Math.PI / 2;
    handle.castShadow = true; group.add(handle);
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.3, side: THREE.FrontSide });
    printZone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.84, 1.4, 40, 1, true, -Math.PI * 0.55, Math.PI * 1.1), pzMat
    );
    printZone.position.y = 0.1; group.add(printZone);
    model = group; scene.add(model);
  }

  function buildHat() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.hat;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 });
    const brim = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.65, 40),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide })
    );
    brim.rotation.x = -Math.PI / 2; brim.position.y = -0.1;
    brim.castShadow = true; group.add(brim);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 30, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), mat
    );
    crown.castShadow = true; group.add(crown);
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.75 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55, 8, 8), pzMat);
    printZone.position.set(0, 0.32, 0.88); printZone.rotation.x = -0.25; group.add(printZone);
    model = group; scene.add(model);
  }

  function buildBag() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.bag;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.6, 4, 8, 2), mat);
    body.castShadow = true; group.add(body);
    [-0.55, 0.55].forEach(function(x) {
      var h = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.055, 8, 20, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x5a3a0a, roughness: 0.7 })
      );
      h.position.set(x, 1.8, 0); group.add(h);
    });
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.85 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.65, 12, 12), pzMat);
    printZone.position.set(0, 0.1, 0.32); group.add(printZone);
    model = group; scene.add(model);
  }

  function buildPaper() {
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(2.1, 2.97, 10, 14);
    const pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      pos.setZ(i, Math.sin(pos.getX(i) * 0.8) * 0.04 + Math.sin(pos.getY(i) * 0.5) * 0.03);
    }
    geo.computeVertexNormals();
    const sheet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xfafaf5, roughness: 0.95, side: THREE.DoubleSide }));
    sheet.castShadow = true; group.add(sheet);
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.95 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.77, 10, 14), pzMat);
    printZone.position.set(0, 0.05, 0.013); group.add(printZone);
    model = group; scene.add(model);
  }

  /* ── DESIGN TEXTURE SYNC ── */
  function applyDesignTexture() {
    if (!printZone) return;
    var designCanvas = document.getElementById("designCanvas");
    if (!designCanvas) return;
    var off = document.createElement("canvas");
    off.width = designCanvas.width; off.height = designCanvas.height;
    off.getContext("2d").drawImage(designCanvas, 0, 0);
    if (!designTex) {
      designTex = new THREE.CanvasTexture(off);
    } else {
      designTex.image = off; designTex.needsUpdate = true;
    }
    printZone.material.map = designTex;
    printZone.material.opacity = 1.0;
    printZone.material.transparent = true;
    printZone.material.needsUpdate = true;
  }

  function startSync() {
    stopSync();
    syncInterval = setInterval(function() {
      if (isOpen && !customModelLoaded) applyDesignTexture();
    }, 700);
  }
  function stopSync() { if (syncInterval) { clearInterval(syncInterval); syncInterval = null; } }

  /* ── STL / OBJ UPLOAD ── */
  function loadModelFile(file) {
    if (!file) return;
    var ext = file.name.split(".").pop().toLowerCase();
    var url = URL.createObjectURL(file);
    setStatus("⏳ " + file.name); setProgress(10);
    if (ext === "stl") loadSTL(url, file.name);
    else if (ext === "obj") loadOBJ(url, file.name);
    else { setStatus("⚠️ STL أو OBJ فقط"); setProgress(0); }
  }

  function loadSTL(url, name) {
    if (!THREE.STLLoader) { setStatus("⚠️ STLLoader غير محمل"); return; }
    new THREE.STLLoader().load(url,
      function(geo) { geo.computeVertexNormals(); finalizeCustom(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6, metalness: 0.1 })), name); },
      function(xhr) { if (xhr.total) setProgress((xhr.loaded / xhr.total) * 90); },
      function(e) { console.error(e); setStatus("❌ فشل التحميل"); setProgress(0); }
    );
  }

  function loadOBJ(url, name) {
    if (!THREE.OBJLoader) { setStatus("⚠️ OBJLoader غير محمل"); return; }
    new THREE.OBJLoader().load(url,
      function(obj) {
        obj.traverse(function(c) { if (c.isMesh) { c.material = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6 }); c.castShadow = true; } });
        finalizeCustom(obj, name);
      },
      function(xhr) { if (xhr.total) setProgress((xhr.loaded / xhr.total) * 90); },
      function(e) { console.error(e); setStatus("❌ فشل التحميل"); setProgress(0); }
    );
  }

  function finalizeCustom(object, name) {
    clearModel();
    var box = new THREE.Box3().setFromObject(object);
    var center = new THREE.Vector3(); box.getCenter(center);
    var size = new THREE.Vector3(); box.getSize(size);
    var scale = 3.5 / Math.max(size.x, size.y, size.z);
    object.position.sub(center.multiplyScalar(scale));
    object.scale.setScalar(scale);
    object.castShadow = true;
    model = object; printZone = null; scene.add(model);
    customModelLoaded = true;
    spherical.radius = 5; updateCameraPosition();
    setProgress(100); setStatus("✅ " + name);
    setTimeout(function() { setStatus(""); }, 2800);
  }

  function clearModel() {
    if (model) { scene.remove(model); model = null; }
    printZone = null; designTex = null;
  }

  /* ── RENDER LOOP ── */
  function startLoop() {
    if (animId) return;
    var last = 0;
    function loop(t) {
      animId = requestAnimationFrame(loop);
      var dt = Math.min((t - last) / 1000, 0.05); last = t;
      if (model && autoRotate && !isOrbiting) model.rotation.y += dt * 0.5;
      renderer.render(scene, camera);
    }
    loop(0);
  }
  function stopLoop() { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  /* ── ORBIT / PAN / ZOOM ── */
  function bindOrbitEvents(container) {
    container.addEventListener("mousedown",   onPointerDown);
    container.addEventListener("mousemove",   onPointerMove);
    container.addEventListener("mouseup",     onPointerUp);
    container.addEventListener("mouseleave",  onPointerUp);
    container.addEventListener("wheel",       onWheel, { passive: false });
    container.addEventListener("contextmenu", function(e) { e.preventDefault(); });
    container.addEventListener("touchstart",  onTouchStart, { passive: false });
    container.addEventListener("touchmove",   onTouchMove,  { passive: false });
    container.addEventListener("touchend",    onPointerUp);
  }

  function onPointerDown(e) {
    if (e.button === 2) { isPanning = true; }
    else { isOrbiting = true; autoRotate = false; updateAutoRotBtn(); }
    lastMouse = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e) {
    if (!isOrbiting && !isPanning) return;
    var dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    if (isOrbiting) { spherical.theta -= dx * 0.007; spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi - dy * 0.007)); }
    if (isPanning)  { panOffset.x -= dx * 0.008; panOffset.y += dy * 0.008; }
    updateCameraPosition();
  }
  function onPointerUp() { isOrbiting = false; isPanning = false; }
  function onWheel(e) {
    e.preventDefault();
    spherical.radius = Math.max(1, Math.min(25, spherical.radius + e.deltaY * 0.012));
    updateCameraPosition();
  }
  function onTouchStart(e) {
    e.preventDefault(); lastTouches = e.touches;
    if (e.touches.length === 1) {
      isOrbiting = true; autoRotate = false; updateAutoRotBtn();
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isOrbiting) {
      var dx = e.touches[0].clientX - lastMouse.x, dy = e.touches[0].clientY - lastMouse.y;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      spherical.theta -= dx * 0.007;
      spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi - dy * 0.007));
      updateCameraPosition();
    } else if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
      var prev = Math.hypot(lastTouches[0].clientX - lastTouches[1].clientX, lastTouches[0].clientY - lastTouches[1].clientY);
      var curr = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      spherical.radius = Math.max(1, Math.min(25, spherical.radius - (curr - prev) * 0.025));
      updateCameraPosition();
    }
    lastTouches = e.touches;
  }
  function updateCameraPosition() {
    if (!camera) return;
    var r = spherical.radius;
    camera.position.set(
      r * Math.sin(spherical.phi) * Math.sin(spherical.theta) + panOffset.x,
      r * Math.cos(spherical.phi) + panOffset.y,
      r * Math.sin(spherical.phi) * Math.cos(spherical.theta)
    );
    camera.lookAt(panOffset.x, panOffset.y, 0);
  }

  function onResize() {
    var c = document.getElementById("preview3dCanvas");
    if (!c || !renderer || !camera) return;
    renderer.setSize(c.clientWidth, c.clientHeight);
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
  }

  /* ── PRODUCT COLOR ── */
  function changeProductColor(hex) {
    if (!model) return;
    var col = new THREE.Color(hex);
    model.traverse(function(c) {
      if (c.isMesh && c !== printZone && c.material) {
        (Array.isArray(c.material) ? c.material : [c.material]).forEach(function(m) {
          if (!m.map) m.color.set(col);
        });
      }
    });
  }

  /* ── CONTROLS ── */
  function resetView() {
    spherical = { theta: 0.5, phi: 1.1, radius: 5 };
    panOffset = { x: 0, y: 0 };
    autoRotate = true;
    if (model) model.rotation.y = 0;
    updateCameraPosition(); updateAutoRotBtn();
  }
  function toggleAutoRotate() { autoRotate = !autoRotate; updateAutoRotBtn(); }
  function updateAutoRotBtn() {
    var btn = document.getElementById("p3dAutoRotBtn");
    if (btn) btn.classList.toggle("active", autoRotate);
  }
  function takeScreenshot() {
    if (!renderer) return;
    renderer.render(scene, camera);
    var a = document.createElement("a");
    a.download = "a3m-3d-preview.png";
    a.href = renderer.domElement.toDataURL("image/png");
    a.click();
  }

  /* ── UI HELPERS ── */
  function setStatus(msg) { var el = document.getElementById("preview3dStatus"); if (el) el.textContent = msg; }
  function setProgress(pct) {
    var bar = document.getElementById("preview3dProgress");
    if (!bar) return;
    bar.style.width = pct + "%";
    bar.style.opacity = (pct > 0 && pct < 100) ? "1" : "0";
  }
  function updateProductTabs() {
    document.querySelectorAll(".p3d-prod-tab").forEach(function(tab) {
      tab.classList.toggle("active", tab.dataset.prod === currentProduct);
    });
  }

  /* ── DRAG & DROP ── */
  function initDropZone() {
    var zone = document.getElementById("preview3dCanvas");
    if (!zone) return;
    zone.addEventListener("dragover",  function(e) { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", function()  { zone.classList.remove("drag-over"); });
    zone.addEventListener("drop", function(e) {
      e.preventDefault(); zone.classList.remove("drag-over");
      if (e.dataTransfer.files[0]) loadModelFile(e.dataTransfer.files[0]);
    });
  }

  /* ── EXPORTS ── */
  window.open3DViewer         = open3DViewer;
  window.close3DViewer        = close3DViewer;
  window.resetView3D          = resetView;
  window.screenshot3D         = takeScreenshot;
  window.loadModelFile3D      = loadModelFile;
  window.loadProduct3D        = loadProductModel;
  window.changeProductColor3D = changeProductColor;
  window.toggleAutoRotate3D   = toggleAutoRotate;
  window.syncDesignTexture    = applyDesignTexture;

  document.addEventListener("DOMContentLoaded", function() {
    initDropZone();
    var fi = document.getElementById("preview3dFileInput");
    if (fi) fi.addEventListener("change", function(e) { if (e.target.files[0]) loadModelFile(e.target.files[0]); });
    var cp = document.getElementById("p3dColorPicker");
    if (cp) cp.addEventListener("input", function(e) { changeProductColor(e.target.value); });
  });

})();
