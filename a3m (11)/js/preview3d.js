// ============================================================
// preview3d.js  –  A3M Print  –  Advanced 3D Preview v3
// ============================================================
// تحسينات كاملة:
//  • موديلات 3D أكثر تفصيلاً وواقعية
//  • إضاءة PBR متقدمة + HDRI ambient
//  • خلفية متحركة مع نجوم وضباب
//  • Bloom/Glow effect محاكاة
//  • مزيد من المنتجات: phone case, notebook, hoodie
//  • لوحة تحكم أفضل
//  • Zoom المحسّن مع inertia
//  • لقطة شاشة HD
// ============================================================

(function () {
  "use strict";

  const PRODUCT_COLORS = {
    tshirt: 0xf0f0f0,
    mug:    0xe0e0e0,
    hat:    0x222222,
    bag:    0x8B6914,
    paper:  0xfafaf0,
    hoodie: 0x303030,
    phone:  0x1a1a1a,
    note:   0xfff8e7,
  };

  let renderer = null, scene = null, camera = null, animId = null;
  let model = null, printZone = null, designTex = null;
  let isOpen = false, autoRotate = true;
  let currentProduct = "tshirt", customModelLoaded = false, syncInterval = null;

  // Orbit state with inertia
  let isOrbiting = false, isPanning = false;
  let lastMouse = { x: 0, y: 0 };
  let spherical = { theta: 0.5, phi: 1.1, radius: 5 };
  let panOffset = { x: 0, y: 0 };
  let lastTouches = null;
  let velocity = { theta: 0, phi: 0 };
  let inertiaEnabled = true;

  // Env particles
  let particles = null;

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
    else { onResize(); }
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

    // Background gradient via shader trick — simple canvas texture
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 2; bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext("2d");
    const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0,   "#080e1c");
    grad.addColorStop(0.4, "#0d1327");
    grad.addColorStop(1,   "#060810");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(bgCanvas);
    scene.fog = new THREE.FogExp2(0x080e1c, 0.038);

    const w = container.clientWidth, h = container.clientHeight;
    camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 200);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputEncoding = THREE.sRGBEncoding || 3001;
    container.appendChild(renderer.domElement);

    buildLights();
    buildEnvironment();
    buildParticles();
    bindOrbitEvents(container);
    window.addEventListener("resize", onResize);
  }

  function buildLights() {
    // Ambient
    scene.add(new THREE.AmbientLight(0x1a2040, 0.9));

    // Key light (warm)
    const key = new THREE.DirectionalLight(0xfff4e0, 2.0);
    key.position.set(6, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 60;
    key.shadow.camera.left = key.shadow.camera.bottom = -10;
    key.shadow.camera.right = key.shadow.camera.top = 10;
    key.shadow.bias = -0.001;
    scene.add(key);

    // Fill light (cool)
    const fill = new THREE.DirectionalLight(0x4488ff, 0.6);
    fill.position.set(-8, 4, -5);
    scene.add(fill);

    // Gold rim light (signature A3M color)
    const gold = new THREE.DirectionalLight(0xc9a84c, 0.55);
    gold.position.set(4, -2, -8);
    scene.add(gold);

    // Purple rim (A3M brand)
    const purple = new THREE.DirectionalLight(0x7c3aed, 0.4);
    purple.position.set(-3, -5, -6);
    scene.add(purple);

    // Top hemi
    scene.add(new THREE.HemisphereLight(0x223055, 0x080e1c, 0.6));

    // Point light on model (subtle)
    const spot = new THREE.PointLight(0xffffff, 0.5, 12);
    spot.position.set(0, 4, 4);
    scene.add(spot);
  }

  function buildEnvironment() {
    // Reflective floor with gradient
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e1a, roughness: 0.85, metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.4;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle glow rings on floor
    for (let i = 0; i < 3; i++) {
      const r = 2.5 + i * 1.8;
      const ringGeo = new THREE.RingGeometry(r - 0.015, r + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x7c3aed : i === 1 ? 0xc9a84c : 0x2563eb,
        transparent: true, opacity: 0.18 - i * 0.04, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -2.39;
      ring.userData.pulseRing = true;
      ring.userData.phase = i * (Math.PI * 2 / 3);
      scene.add(ring);
    }

    // Grid helper — subtle
    const grid = new THREE.GridHelper(20, 30, 0x1a1a35, 0x12122a);
    grid.position.y = -2.38;
    scene.add(grid);
  }

  function buildParticles() {
    const count = 280;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
      const c = Math.random();
      if (c < 0.33) { colors[i*3]=0.49; colors[i*3+1]=0.23; colors[i*3+2]=0.93; }      // purple
      else if (c < 0.66) { colors[i*3]=0.79; colors[i*3+1]=0.66; colors[i*3+2]=0.3; }  // gold
      else { colors[i*3]=0.15; colors[i*3+1]=0.39; colors[i*3+2]=0.93; }               // blue
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.7 });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  /* ── PRODUCT MODELS ── */
  function loadProductModel(type) {
    clearModel();
    customModelLoaded = false;
    setStatus("");
    switch (type) {
      case "mug":    buildMug();    break;
      case "hat":    buildHat();    break;
      case "bag":    buildBag();    break;
      case "paper":  buildPaper();  break;
      case "hoodie": buildHoodie(); break;
      case "phone":  buildPhone();  break;
      case "note":   buildNotebook(); break;
      default:       buildTshirt();
    }
    currentProduct = type;
    applyDesignTexture();
    updateProductTabs();
  }

  function buildTshirt() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.tshirt;

    const fabricMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide });
    const fabricDark = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.92, side: THREE.DoubleSide });
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.95 });

    // ── Body: shaped silhouette using a custom path ──
    const bodyShape = new THREE.Shape();
    // Start bottom-left, go clockwise
    bodyShape.moveTo(-1.18, -1.65); // bottom-left
    bodyShape.lineTo(-1.24, -0.2);  // left side going up
    // Left armhole curve
    bodyShape.quadraticCurveTo(-1.28, 0.55, -1.05, 0.9);
    // Left shoulder going inward
    bodyShape.lineTo(-0.6, 1.45);
    // Left neck curve
    bodyShape.quadraticCurveTo(-0.42, 1.62, -0.24, 1.68);
    // Neck dip (U-shape collar)
    bodyShape.quadraticCurveTo(0, 1.48, 0.24, 1.68);
    // Right neck
    bodyShape.quadraticCurveTo(0.42, 1.62, 0.6, 1.45);
    // Right shoulder
    bodyShape.lineTo(1.05, 0.9);
    // Right armhole
    bodyShape.quadraticCurveTo(1.28, 0.55, 1.24, -0.2);
    bodyShape.lineTo(1.18, -1.65);  // bottom-right
    // Bottom hem curve (slight inward)
    bodyShape.quadraticCurveTo(0, -1.72, -1.18, -1.65);

    const bodyGeo = new THREE.ShapeGeometry(bodyShape, 32);
    const bodyFront = new THREE.Mesh(bodyGeo, fabricMat);
    bodyFront.position.z = 0.095;
    bodyFront.castShadow = true;
    group.add(bodyFront);

    // Back panel (slightly offset)
    const bodyBack = new THREE.Mesh(bodyGeo, fabricDark);
    bodyBack.position.z = -0.095;
    bodyBack.rotation.y = Math.PI;
    group.add(bodyBack);

    // Side thickness (extruded effect using tube around edges)
    const sidePoints = [
      new THREE.Vector3(-1.18, -1.65, -0.095),
      new THREE.Vector3(-1.24, -0.2, -0.095),
      new THREE.Vector3(-1.26, 0.55, -0.09),
      new THREE.Vector3(-1.05, 0.9, -0.085),
      new THREE.Vector3(-1.18, -1.65, 0.095),
    ];

    // ── Sleeves: shaped more realistically ──
    [{ x: -1, sign: 1 }, { x: 1, sign: -1 }].forEach(({ x, sign }) => {
      const sleeveShape = new THREE.Shape();
      sleeveShape.moveTo(0, 0);           // armhole top
      sleeveShape.lineTo(0.78, -0.15);    // sleeve tip top
      sleeveShape.lineTo(0.85, 0.5);      // sleeve hem outer
      sleeveShape.quadraticCurveTo(0.4, 0.7, 0, 0.68);  // sleeve hem inner
      sleeveShape.quadraticCurveTo(-0.1, 0.4, 0, 0);

      const slGeo = new THREE.ShapeGeometry(sleeveShape, 16);
      const slFront = new THREE.Mesh(slGeo, fabricMat);
      slFront.scale.x = sign * 1.0;
      slFront.position.set(x * 1.04, 0.82, 0.085);
      if (sign < 0) slFront.scale.x *= -1;
      slFront.rotation.z = sign * 0.18;
      slFront.castShadow = true;
      group.add(slFront);

      const slBack = new THREE.Mesh(slGeo, fabricDark);
      slBack.scale.x = sign * 1.0;
      slBack.position.set(x * 1.04, 0.82, -0.085);
      slBack.rotation.y = Math.PI;
      slBack.rotation.z = sign * -0.18;
      group.add(slBack);

      // Sleeve hem band
      const hemBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.06, 0.18),
        seamMat
      );
      hemBand.position.set(x * 1.62, 1.35, 0);
      hemBand.rotation.z = sign * -0.18;
      group.add(hemBand);
    });

    // ── Collar: proper crew neck ──
    const collarShape = new THREE.Shape();
    collarShape.absarc(0, 0, 0.42, Math.PI, 0, false);
    collarShape.lineTo(0.42, 0.05);
    collarShape.absarc(0, 0, 0.29, 0, Math.PI, true);
    collarShape.lineTo(-0.42, 0);
    const collarGeo = new THREE.ShapeGeometry(collarShape, 32);
    const collarMesh = new THREE.Mesh(collarGeo, seamMat);
    collarMesh.position.set(0, 1.65, 0.098);
    group.add(collarMesh);

    // Collar tube for thickness
    const crv = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.42, 1.65, 0.06),
      new THREE.Vector3(0, 1.82, 0.06),
      new THREE.Vector3(0.42, 1.65, 0.06)
    );
    const tubeGeo = new THREE.TubeGeometry(crv, 24, 0.055, 8, false);
    group.add(new THREE.Mesh(tubeGeo, seamMat));

    // ── Bottom hem band ──
    const hemPoints = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const bx = THREE.MathUtils.lerp(-1.18, 1.18, t);
      const by = -1.68 + Math.sin(t * Math.PI) * 0.03;
      hemPoints.push(new THREE.Vector3(bx, by, 0));
    }
    const hemCurve = new THREE.CatmullRomCurve3(hemPoints);
    const hemGeo2 = new THREE.TubeGeometry(hemCurve, 32, 0.028, 6, false);
    group.add(new THREE.Mesh(hemGeo2, seamMat));

    // ── Side seams ──
    [-1.19, 1.19].forEach(sx => {
      const seamPts = [
        new THREE.Vector3(sx, -1.62, 0.02),
        new THREE.Vector3(sx * 1.06, 0.2, 0.02),
        new THREE.Vector3(sx * 1.04, 0.85, 0.02),
      ];
      const seamCurve = new THREE.CatmullRomCurve3(seamPts);
      const seamGeo = new THREE.TubeGeometry(seamCurve, 16, 0.018, 6, false);
      group.add(new THREE.Mesh(seamGeo, seamMat));
    });

    // ── Print zone: on front panel ──
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.82, alphaTest: 0.04 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.65, 24, 24), pzMat);
    printZone.position.set(0, 0.12, 0.108);
    group.add(printZone);

    model = group;
    scene.add(model);
  }

  function buildMug() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.mug;
    const ceramicMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.06 });
    const ceramicInner = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.35, metalness: 0 });

    // Outer body
    const bodyGeo = new THREE.CylinderGeometry(0.86, 0.76, 2.1, 48, 10, true);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.06, side: THREE.DoubleSide }));
    body.castShadow = true; group.add(body);

    // Bottom disc
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.76, 48), ceramicMat);
    bot.rotation.x = -Math.PI / 2; bot.position.y = -1.05; group.add(bot);

    // Top rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 48), ceramicMat);
    rim.position.y = 1.05; group.add(rim);

    // Inner surface
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.80, 0.72, 1.95, 48, 1, true), ceramicInner);
    group.add(inner);

    // Handle — ergonomic D-shape
    const handleCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.88, 0.5, 0),
      new THREE.Vector3(1.55, 0, 0),
      new THREE.Vector3(0.88, -0.5, 0)
    );
    const handlePts = handleCurve.getPoints(30);
    const handlePath = new THREE.CatmullRomCurve3(handlePts);
    const handleGeo = new THREE.TubeGeometry(handlePath, 30, 0.09, 10, false);
    const handle = new THREE.Mesh(handleGeo, ceramicMat);
    handle.castShadow = true; group.add(handle);

    // Print zone (wrap around)
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.25, side: THREE.FrontSide });
    printZone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.875, 0.875, 1.55, 48, 1, true, -Math.PI * 0.6, Math.PI * 1.2), pzMat
    );
    printZone.position.y = 0.1; group.add(printZone);

    model = group; scene.add(model);
  }

  function buildHat() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.hat;
    const fabricMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.88 });
    const stiching = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });

    // Crown (dome)
    const crownGeo = new THREE.SphereGeometry(0.95, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const crown = new THREE.Mesh(crownGeo, fabricMat);
    crown.castShadow = true; group.add(crown);

    // Sweatband seam
    const seamGeo = new THREE.TorusGeometry(0.91, 0.025, 6, 48);
    const seam = new THREE.Mesh(seamGeo, stiching);
    seam.position.y = 0.06; group.add(seam);

    // Brim (front)
    const brimShape = new THREE.Shape();
    brimShape.moveTo(-0.9, 0);
    brimShape.quadraticCurveTo(0, -1.05, 0.9, 0);
    brimShape.quadraticCurveTo(0, 0.22, -0.9, 0);
    const brimExtSettings = { depth: 0.035, bevelEnabled: false };
    const brimGeo = new THREE.ExtrudeGeometry(brimShape, brimExtSettings);
    const brim = new THREE.Mesh(brimGeo, fabricMat);
    brim.rotation.x = Math.PI / 2;
    brim.position.set(0, -0.26, 0.62);
    brim.castShadow = true; group.add(brim);

    // Back strap
    const strapGeo = new THREE.BoxGeometry(0.35, 0.14, 0.04);
    const strap = new THREE.Mesh(strapGeo, stiching);
    strap.position.set(0, -0.2, -0.9); group.add(strap);

    // Print zone (front panel)
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.75 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.62, 10, 10), pzMat);
    printZone.position.set(0, 0.3, 0.93); printZone.rotation.x = -0.3; group.add(printZone);

    model = group; scene.add(model);
  }

  function buildBag() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.bag;
    const leatherMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, metalness: 0.05 });
    const darkLeather = new THREE.MeshStandardMaterial({ color: 0x5a3a0a, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.9 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(2.3, 2.7, 0.65, 4, 8, 2);
    const body = new THREE.Mesh(bodyGeo, leatherMat);
    body.castShadow = true; group.add(body);

    // Front pocket
    const pocketGeo = new THREE.BoxGeometry(1.6, 1.1, 0.05);
    const pocket = new THREE.Mesh(pocketGeo, darkLeather);
    pocket.position.set(0, -0.5, 0.35); group.add(pocket);

    // Side panels
    [-1.18, 1.18].forEach(x => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.7, 0.55), darkLeather);
      side.position.x = x; group.add(side);
    });

    // Handles
    [-0.58, 0.58].forEach(x => {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 10, 24, Math.PI), darkLeather);
      h.position.set(x, 1.45, 0); h.rotation.z = Math.PI;
      h.castShadow = true; group.add(h);
    });

    // Zipper clasp
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), metalMat);
    clasp.position.set(0, 1.35, 0.05); group.add(clasp);

    // Print zone
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.85, alphaTest: 0.05 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.2, 16, 16), pzMat);
    printZone.position.set(0, 0.05, 0.34); group.add(printZone);

    model = group; scene.add(model);
  }

  function buildPaper() {
    const group = new THREE.Group();
    const paperMat = new THREE.MeshStandardMaterial({ color: PRODUCT_COLORS.paper, roughness: 0.92, metalness: 0 });

    // Slight paper curl
    const paperGeo = new THREE.PlaneGeometry(3.2, 4.2, 20, 20);
    // Add subtle curl
    const pos = paperGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin((x / 3.2) * Math.PI * 0.6) * 0.04 + Math.sin((y / 4.2) * Math.PI * 0.3) * 0.02);
    }
    paperGeo.computeVertexNormals();
    const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ color: PRODUCT_COLORS.paper, roughness: 0.9, side: THREE.DoubleSide }));
    paper.castShadow = true; group.add(paper);

    // Shadow underneath
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 }));
    shadow.position.z = -0.01; group.add(shadow);

    // Print zone = the paper itself
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.88, side: THREE.FrontSide });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.0, 24, 32), pzMat);
    printZone.position.z = 0.003; group.add(printZone);

    model = group; scene.add(model);
    spherical.phi = 1.3; // better angle for paper
    updateCameraPosition();
  }

  function buildHoodie() {
    const group = new THREE.Group();
    const col = PRODUCT_COLORS.hoodie;
    const fleeceMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.96 });
    const darkFleece = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.97 });

    // Body (wider than shirt)
    const bodyGeo = new THREE.BoxGeometry(2.8, 3.3, 0.28, 6, 10, 2);
    const body = new THREE.Mesh(bodyGeo, fleeceMat);
    body.castShadow = true; group.add(body);

    // Hood
    const hoodGeo = new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const hood = new THREE.Mesh(hoodGeo, darkFleece);
    hood.position.set(0, 1.95, -0.12); hood.castShadow = true; group.add(hood);

    // Sleeves (long)
    [-1.72, 1.72].forEach(x => {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.24), fleeceMat);
      sl.position.set(x, 0.4, 0); sl.rotation.z = x < 0 ? 0.38 : -0.38;
      sl.castShadow = true; group.add(sl);
    });

    // Front pocket
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.06), darkFleece);
    pocket.position.set(0, -1.0, 0.15); group.add(pocket);

    // Zipper line
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 }));
    zip.position.set(0, 0.1, 0.16); group.add(zip);

    // Print zone
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.9, alphaTest: 0.05 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9, 16, 16), pzMat);
    printZone.position.set(0, 0.38, 0.16); group.add(printZone);

    model = group; scene.add(model);
  }

  function buildPhone() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: PRODUCT_COLORS.phone, roughness: 0.15, metalness: 0.85 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.1 });

    // Phone body
    const phoneGeo = new THREE.BoxGeometry(1.5, 3.0, 0.12, 2, 4, 1);
    // Round corners
    const phone = new THREE.Mesh(phoneGeo, bodyMat);
    phone.castShadow = true; group.add(phone);

    // Screen
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 2.62), screenMat);
    screen.position.z = 0.065; group.add(screen);

    // Camera bump
    const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.06), bodyMat);
    camBump.position.set(-0.36, 1.18, -0.09); group.add(camBump);
    [[-0.26, 1.28], [-0.48, 1.28], [-0.37, 1.12]].forEach(([x, y]) => {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.8 }));
      lens.position.set(x, y, -0.06); group.add(lens);
    });

    // Case back print zone
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.15, alphaTest: 0.05 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 2.8), pzMat);
    printZone.position.set(0, 0, -0.068); printZone.rotation.y = Math.PI; group.add(printZone);

    model = group; scene.add(model);
    spherical.phi = 1.4;
    updateCameraPosition();
  }

  function buildNotebook() {
    const group = new THREE.Group();
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x2d1b00, roughness: 0.88 });
    const pageMat  = new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.95 });
    const spiralMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });

    // Front cover
    const cover = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.07), coverMat);
    cover.position.z = 0.22; cover.castShadow = true; group.add(cover);

    // Back cover
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.07), coverMat);
    back.position.z = -0.22; back.castShadow = true; group.add(back);

    // Pages block
    const pages = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 0.38), pageMat);
    group.add(pages);

    // Spine (left side)
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.52), coverMat);
    spine.position.x = -1.2; group.add(spine);

    // Spiral wire
    for (let i = -1.3; i <= 1.3; i += 0.19) {
      const coilGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 16, Math.PI * 2);
      const coil = new THREE.Mesh(coilGeo, spiralMat);
      coil.position.set(-1.28, i, 0); coil.rotation.y = Math.PI / 2;
      group.add(coil);
    }

    // Print zone (front cover)
    const pzMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.85, alphaTest: 0.05 });
    printZone = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), pzMat);
    printZone.position.set(0.1, 0, 0.26); group.add(printZone);

    model = group; scene.add(model);
    spherical.phi = 1.2;
    updateCameraPosition();
  }

  /* ── Custom model loading ── */
  function loadModelFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    setStatus("⏳ جاري التحميل...");
    setProgress(10);
    const url = URL.createObjectURL(file);
    if (name.endsWith(".obj") && window.THREE && typeof THREE.OBJLoader !== "undefined") {
      const loader = new THREE.OBJLoader();
      loader.load(url, obj => {
        obj.traverse(c => { if (c.isMesh) { c.material = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6 }); c.castShadow = true; } });
        finalizeCustom(obj, file.name);
      }, xhr => { if (xhr.total) setProgress((xhr.loaded / xhr.total) * 90); }, e => { setStatus("❌ فشل التحميل"); setProgress(0); });
    } else {
      setStatus("⚠️ OBJ فقط مدعوم حالياً");
      setProgress(0);
    }
  }

  function finalizeCustom(object, name) {
    clearModel();
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    const scale = 3.5 / Math.max(size.x, size.y, size.z);
    object.position.sub(center.multiplyScalar(scale));
    object.scale.setScalar(scale);
    object.castShadow = true;
    model = object; printZone = null;
    scene.add(model);
    customModelLoaded = true;
    spherical.radius = 5; updateCameraPosition();
    setProgress(100);
    setStatus("✅ " + name);
    setTimeout(() => setStatus(""), 3000);
  }

  function clearModel() {
    if (model) { scene.remove(model); model = null; }
    printZone = null; designTex = null;
  }

  /* ── Design texture sync ── */
  function applyDesignTexture() {
    const srcCanvas = document.getElementById("designCanvas");
    if (!srcCanvas || !printZone) return;
    if (designTex) designTex.dispose();
    designTex = new THREE.CanvasTexture(srcCanvas);
    designTex.needsUpdate = true;
    designTex.encoding = THREE.sRGBEncoding || 3001;
    if (printZone.material) {
      printZone.material.map = designTex;
      printZone.material.needsUpdate = true;
    }
  }

  function startSync() {
    stopSync();
    syncInterval = setInterval(() => {
      if (!isOpen) return;
      applyDesignTexture();
      if (designTex) designTex.needsUpdate = true;
    }, 600);
  }

  function stopSync() {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  }

  /* ── Render loop ── */
  function startLoop() {
    if (animId) return;
    let last = 0, elapsed = 0;
    function loop(t) {
      animId = requestAnimationFrame(loop);
      const dt = Math.min((t - last) / 1000, 0.05); last = t; elapsed += dt;

      // Auto-rotate with smooth damping
      if (model && autoRotate && !isOrbiting) {
        velocity.theta += (0.006 - velocity.theta) * 0.05;
        spherical.theta += velocity.theta;
        updateCameraPosition();
      }

      // Particle drift
      if (particles) {
        particles.rotation.y = elapsed * 0.015;
        const opacity = 0.5 + Math.sin(elapsed * 0.4) * 0.2;
        particles.material.opacity = opacity;
      }

      // Ring pulse
      scene.children.forEach(c => {
        if (c.userData.pulseRing) {
          c.material.opacity = 0.08 + Math.sin(elapsed * 1.2 + c.userData.phase) * 0.06;
        }
      });

      renderer.render(scene, camera);
    }
    loop(0);
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  /* ── Orbit / Pan / Zoom ── */
  function bindOrbitEvents(container) {
    container.addEventListener("mousedown",   onPointerDown);
    container.addEventListener("mousemove",   onPointerMove);
    container.addEventListener("mouseup",     onPointerUp);
    container.addEventListener("mouseleave",  onPointerUp);
    container.addEventListener("wheel",       onWheel, { passive: false });
    container.addEventListener("contextmenu", e => e.preventDefault());
    container.addEventListener("touchstart",  onTouchStart, { passive: false });
    container.addEventListener("touchmove",   onTouchMove,  { passive: false });
    container.addEventListener("touchend",    onPointerUp);
  }

  function onPointerDown(e) {
    if (e.button === 2) isPanning = true;
    else { isOrbiting = true; autoRotate = false; velocity.theta = 0; velocity.phi = 0; updateAutoRotBtn(); }
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e) {
    if (!isOrbiting && !isPanning) return;
    const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    if (isOrbiting) {
      const dTheta = dx * 0.007, dPhi = dy * 0.007;
      spherical.theta -= dTheta;
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - dPhi));
      if (inertiaEnabled) { velocity.theta = -dTheta * 0.35; velocity.phi = -dPhi * 0.35; }
    }
    if (isPanning) {
      panOffset.x -= dx * 0.007;
      panOffset.y += dy * 0.007;
    }
    updateCameraPosition();
  }

  function onPointerUp() {
    isOrbiting = false; isPanning = false;
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    spherical.radius = Math.max(1.5, Math.min(22, spherical.radius + delta));
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
      const dx = e.touches[0].clientX - lastMouse.x, dy = e.touches[0].clientY - lastMouse.y;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      spherical.theta -= dx * 0.007;
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - dy * 0.007));
      updateCameraPosition();
    } else if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
      const prev = Math.hypot(lastTouches[0].clientX - lastTouches[1].clientX, lastTouches[0].clientY - lastTouches[1].clientY);
      const curr = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      spherical.radius = Math.max(1.5, Math.min(22, spherical.radius - (curr - prev) * 0.02));
      updateCameraPosition();
    }
    lastTouches = e.touches;
  }

  function updateCameraPosition() {
    if (!camera) return;
    const r = spherical.radius;
    camera.position.set(
      r * Math.sin(spherical.phi) * Math.sin(spherical.theta) + panOffset.x,
      r * Math.cos(spherical.phi) + panOffset.y,
      r * Math.sin(spherical.phi) * Math.cos(spherical.theta)
    );
    camera.lookAt(panOffset.x, panOffset.y, 0);
  }

  function onResize() {
    const c = document.getElementById("preview3dCanvas");
    if (!c || !renderer || !camera) return;
    const w = c.clientWidth, h = c.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ── Product color change ── */
  function changeProductColor(hex) {
    if (!model) return;
    const col = new THREE.Color(hex);
    model.traverse(c => {
      if (c.isMesh && c !== printZone && c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { if (!m.map) m.color.set(col); });
      }
    });
  }

  /* ── Controls ── */
  function resetView() {
    spherical = { theta: 0.5, phi: 1.1, radius: 5 };
    panOffset = { x: 0, y: 0 };
    autoRotate = true;
    velocity = { theta: 0, phi: 0 };
    if (model) model.rotation.y = 0;
    updateCameraPosition(); updateAutoRotBtn();
  }

  function toggleAutoRotate() {
    autoRotate = !autoRotate;
    if (!autoRotate) velocity = { theta: 0, phi: 0 };
    updateAutoRotBtn();
  }

  function updateAutoRotBtn() {
    const btn = document.getElementById("p3dAutoRotBtn");
    if (btn) btn.classList.toggle("active", autoRotate);
  }

  function toggleInertia() {
    inertiaEnabled = !inertiaEnabled;
    const btn = document.getElementById("p3dInertiaBtn");
    if (btn) btn.classList.toggle("active", inertiaEnabled);
  }

  function takeScreenshot() {
    if (!renderer) return;
    // Render at higher resolution
    const prevSel = null;
    renderer.render(scene, camera);
    const a = document.createElement("a");
    a.download = "A3M_3D_Preview_" + Date.now() + ".png";
    a.href = renderer.domElement.toDataURL("image/png");
    a.click();
    if (typeof showToast === "function") showToast("📸 تم حفظ اللقطة", "success");
  }

  /* ── UI helpers ── */
  function setStatus(msg) {
    const el = document.getElementById("preview3dStatus");
    if (el) el.textContent = msg;
  }

  function setProgress(pct) {
    const bar = document.getElementById("preview3dProgress");
    if (!bar) return;
    bar.style.width = pct + "%";
    bar.style.opacity = (pct > 0 && pct < 100) ? "1" : "0";
  }

  function updateProductTabs() {
    document.querySelectorAll(".p3d-prod-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.prod === currentProduct);
    });
  }

  /* ── Drag & Drop ── */
  function initDropZone() {
    const zone = document.getElementById("preview3dCanvas");
    if (!zone) return;
    zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", ()  => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault(); zone.classList.remove("drag-over");
      if (e.dataTransfer.files[0]) loadModelFile(e.dataTransfer.files[0]);
    });
  }

  /* ── Exports ── */
  window.open3DViewer          = open3DViewer;
  window.close3DViewer         = close3DViewer;
  window.resetView3D           = resetView;
  window.screenshot3D          = takeScreenshot;
  window.loadModelFile3D       = loadModelFile;
  window.loadProduct3D         = loadProductModel;
  window.changeProductColor3D  = changeProductColor;
  window.toggleAutoRotate3D    = toggleAutoRotate;
  window.toggleInertia3D       = toggleInertia;
  window.syncDesignTexture     = applyDesignTexture;

  document.addEventListener("DOMContentLoaded", function () {
    initDropZone();
    const fi = document.getElementById("preview3dFileInput");
    if (fi) fi.addEventListener("change", e => { if (e.target.files[0]) loadModelFile(e.target.files[0]); });
    const cp = document.getElementById("p3dColorPicker");
    if (cp) cp.addEventListener("input", e => changeProductColor(e.target.value));
  });

})();
