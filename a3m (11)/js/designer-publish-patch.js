// ============================================================
// designer-publish-patch.js  –  A3M Print
// Adds "Publish to Community" functionality to the designer
// Include AFTER designer.js
// ============================================================

(function () {
  "use strict";

  // ── Publish Modal HTML (injected into body) ──
  var PUBLISH_MODAL_HTML = `
  <div id="ds-publish-modal" style="
    display:none; position:fixed; inset:0; z-index:9998;
    background:rgba(0,0,0,.72); backdrop-filter:blur(8px);
    align-items:center; justify-content:center; padding:1rem;
  ">
    <div style="
      width:min(94vw,440px); background:#111827;
      border:1px solid rgba(255,255,255,.13); border-radius:20px;
      overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.65);
      animation:dsPubIn .22s cubic-bezier(.2,.8,.3,1);
    ">
      <style>
        @keyframes dsPubIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
        #ds-publish-modal input, #ds-publish-modal textarea, #ds-publish-modal select {
          background:#141d2e; border:1px solid rgba(255,255,255,.13); color:#f1f5f9;
          border-radius:10px; padding:.6rem 1rem; font-size:13px;
          font-family:'Cairo',sans-serif; outline:none; transition:.18s; width:100%;
        }
        #ds-publish-modal input:focus, #ds-publish-modal textarea:focus {
          border-color:#2563eb;
        }
        .ds-pub-tag {
          display:inline-block; background:rgba(37,99,235,.12);
          border:1px solid rgba(37,99,235,.3); color:#2563eb;
          border-radius:20px; padding:3px 11px; font-size:11px; font-weight:700;
          cursor:pointer; transition:.15s; margin:2px;
        }
        .ds-pub-tag:hover { background:rgba(37,99,235,.22); }
        .ds-pub-tag.sel { background:#2563eb; color:#fff; border-color:#2563eb; }
      </style>
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.2rem;border-bottom:1px solid rgba(255,255,255,.07)">
        <div style="font-size:15px;font-weight:800;color:#f1f5f9" id="ds-pub-title">🚀 نشر في الكوميونيتي</div>
        <button onclick="closeDsPublishModal()" style="background:none;border:none;color:#4b5563;font-size:18px;cursor:pointer;line-height:1;padding:4px 6px;border-radius:6px;transition:.15s" onmouseover="this.style.color='#e63946'" onmouseout="this.style.color='#4b5563'">✕</button>
      </div>

      <!-- Preview + Form -->
      <div style="padding:1.2rem">
        <div style="display:flex;gap:1rem;margin-bottom:1rem">
          <div style="width:90px;height:90px;flex-shrink:0;border-radius:12px;overflow:hidden;background:#141d2e;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;">
            <canvas id="ds-pub-thumb" width="90" height="90" style="width:90px;height:90px;object-fit:contain"></canvas>
          </div>
          <div style="flex:1">
            <label style="display:block;font-size:10px;font-weight:800;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;margin-bottom:.4rem" id="ds-pub-cap-lbl">الوصف</label>
            <textarea id="ds-pub-caption" rows="3" placeholder="صِف تصميمك للمجتمع..."></textarea>
          </div>
        </div>

        <div style="margin-bottom:.8rem">
          <label style="display:block;font-size:10px;font-weight:800;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;margin-bottom:.5rem" id="ds-pub-tags-lbl">التاغات</label>
          <div id="ds-pub-tags">
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">🎨 تصميم</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">👕 تيشرت</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">☕ كوب</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">🧢 قبعة</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">✨ إبداع</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">🇩🇿 الجزائر</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">🔥 ترند</span>
            <span class="ds-pub-tag" onclick="this.classList.toggle('sel')">💎 فاخر</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;gap:.6rem;padding:.9rem 1.2rem;border-top:1px solid rgba(255,255,255,.07)">
        <button onclick="closeDsPublishModal()" id="ds-pub-cancel" style="
          background:#141d2e; border:1px solid rgba(255,255,255,.13); color:#94a3b8;
          border-radius:10px; padding:.65rem 1.2rem; font-size:13px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:.18s;
        " onmouseover="this.style.borderColor='#94a3b8';this.style.color='#f1f5f9'" onmouseout="this.style.borderColor='rgba(255,255,255,.13)';this.style.color='#94a3b8'">إلغاء</button>
        <button onclick="confirmDsPublish()" id="ds-pub-confirm" style="
          flex:1; background:linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff; border:none; border-radius:10px; padding:.65rem;
          font-size:14px; font-weight:800; cursor:pointer; font-family:inherit;
          transition:.18s;
        " onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter=''">🚀 نشر الآن</button>
      </div>
    </div>
  </div>`;

  // ── Inject modal on DOM ready ──
  function injectModal() {
    if (document.getElementById("ds-publish-modal")) return;
    var div = document.createElement("div");
    div.innerHTML = PUBLISH_MODAL_HTML.trim();
    document.body.appendChild(div.firstChild);
  }

  // ── Inject Publish button in designer topbar ──
  function injectPublishButton() {
    var topbarRight = document.querySelector(".designer-topbar-right");
    if (!topbarRight || document.getElementById("ds-publish-btn")) return;

    var btn = document.createElement("button");
    btn.id = "ds-publish-btn";
    btn.className = "d-btn";
    btn.title = "نشر التصميم في الكوميونيتي";
    btn.style.cssText = "background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(201,168,76,.12))!important;border-color:rgba(124,58,237,.5)!important;color:#c9a84c!important;font-weight:800;";
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-left:3px"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg><span id="ds-pub-btn-lbl">نشر</span>`;
    btn.onclick = openDsPublishModal;

    // Insert before the first button (after price box)
    var firstBtn = topbarRight.querySelector(".d-btn");
    if (firstBtn) {
      topbarRight.insertBefore(btn, firstBtn);
    } else {
      topbarRight.appendChild(btn);
    }
  }

  // ── Open/Close ──
  window.openDsPublishModal = function () {
    var modal = document.getElementById("ds-publish-modal");
    if (!modal) { injectModal(); modal = document.getElementById("ds-publish-modal"); }
    if (!modal) return;

    // Copy canvas thumbnail
    var srcCanvas = document.getElementById("designCanvas");
    var thumbCanvas = document.getElementById("ds-pub-thumb");
    if (srcCanvas && thumbCanvas) {
      var ctx2 = thumbCanvas.getContext("2d");
      ctx2.clearRect(0, 0, 90, 90);
      ctx2.drawImage(srcCanvas, 0, 0, 90, 90);
    }

    // Reset form
    document.getElementById("ds-pub-caption").value = "";
    document.querySelectorAll(".ds-pub-tag").forEach(function (t) { t.classList.remove("sel"); });

    modal.style.display = "flex";
  };

  window.closeDsPublishModal = function () {
    var modal = document.getElementById("ds-publish-modal");
    if (modal) modal.style.display = "none";
  };

  window.confirmDsPublish = function () {
    var caption = (document.getElementById("ds-pub-caption") || {}).value || "";
    var tags = [];
    document.querySelectorAll(".ds-pub-tag.sel").forEach(function (t) {
      tags.push(t.textContent.trim());
    });

    // Get canvas data
    var srcCanvas = document.getElementById("designCanvas");
    var dataURL = srcCanvas ? srcCanvas.toDataURL("image/png") : null;

    // Save to localStorage
    try {
      var user = JSON.parse(localStorage.getItem("a3m_user") || "{}");
      var designs = JSON.parse(localStorage.getItem("a3m_community_designs") || "[]");
      var lang = localStorage.getItem("a3m_lang") || "ar";
      designs.unshift({
        id: Date.now(),
        caption: caption,
        tags: tags,
        author: user.name || "مصمم A3M",
        username: user.username || "user",
        emoji: "🎨",
        likes: 0,
        own: true,
        image: dataURL,
        date: new Date().toLocaleDateString(lang === "ar" ? "ar-DZ" : "en-US"),
      });
      localStorage.setItem("a3m_community_designs", JSON.stringify(designs));

      // +20 XP
      var xp = parseInt(localStorage.getItem("a3m_xp") || "0") + 20;
      localStorage.setItem("a3m_xp", String(xp));
    } catch (e) {}

    window.closeDsPublishModal();

    // Toast
    var lang2 = localStorage.getItem("a3m_lang") || "ar";
    var msg = lang2 === "en"
      ? "🎉 Design published to community! +20 XP"
      : lang2 === "fr"
      ? "🎉 Design publié dans la communauté! +20 XP"
      : "🎉 تم نشر تصميمك في الكوميونيتي! +20 XP";

    if (typeof window.showToast === "function") window.showToast(msg, "success");
    else {
      var t = document.getElementById("toast");
      if (t) { t.textContent = msg; t.className = "toast-msg show toast-success"; setTimeout(function () { t.classList.remove("show"); }, 2500); }
    }
  };

  // ── Translation support ──
  var PUB_T = {
    ar: { title: "🚀 نشر في الكوميونيتي", capLbl: "الوصف", tagsLbl: "التاغات", cancel: "إلغاء", confirm: "🚀 نشر الآن", btnLbl: "نشر" },
    en: { title: "🚀 Publish to Community", capLbl: "Caption", tagsLbl: "Tags", cancel: "Cancel", confirm: "🚀 Publish Now", btnLbl: "Publish" },
    fr: { title: "🚀 Publier Communauté", capLbl: "Description", tagsLbl: "Tags", cancel: "Annuler", confirm: "🚀 Publier", btnLbl: "Publier" },
  };

  function applyPublishTranslation() {
    var lang = localStorage.getItem("a3m_lang") || "ar";
    var t = PUB_T[lang] || PUB_T.ar;
    var safe = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    safe("ds-pub-title", t.title);
    safe("ds-pub-cap-lbl", t.capLbl);
    safe("ds-pub-tags-lbl", t.tagsLbl);
    safe("ds-pub-cancel", t.cancel);
    safe("ds-pub-confirm", t.confirm);
    safe("ds-pub-btn-lbl", t.btnLbl);
    // Placeholder
    var cap = document.getElementById("ds-pub-caption");
    var placeholders = { ar: "صِف تصميمك للمجتمع...", en: "Describe your design...", fr: "Décrivez votre design..." };
    if (cap) cap.placeholder = placeholders[lang] || placeholders.ar;
  }

  // Listen for lang change events
  document.addEventListener("a3m:lang", applyPublishTranslation);

  // ── Auto init when designer opens ──
  function tryInit() {
    injectModal();
    injectPublishButton();
    applyPublishTranslation();
  }

  // Watch for designer modal to open
  var _origOpenDesigner = window.openDesigner;
  document.addEventListener("DOMContentLoaded", function () {
    // Try patching openDesigner
    var _orig2 = window.openDesigner;
    window.openDesigner = function () {
      if (_orig2) _orig2.apply(this, arguments);
      setTimeout(function () { injectPublishButton(); applyPublishTranslation(); }, 150);
    };

    // Also try immediately (in case designer is already open)
    setTimeout(tryInit, 500);
  });

  // Also handle the ps-overlay flow
  var _origInitDesigner = window.initDesigner;
  if (document.readyState !== "loading") {
    setTimeout(tryInit, 600);
  }

})();
