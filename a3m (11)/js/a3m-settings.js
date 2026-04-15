// ============================================================
// a3m-settings.js  –  A3M Print  –  Global Settings Manager
// Handles: Language, Theme, Currency — persisted in localStorage
// Include this script in ALL pages for cross-page sync
// ============================================================

(function () {
  "use strict";

  // ── Default Settings ──
  const DEFAULTS = {
    lang: "ar",
    theme: "blue-dark",
    currency: "DZD",
  };

  // ── Currency rates (DZD base) ──
  const CURRENCY_RATES = {
    DZD: 1,
    USD: 0.0074,
    EUR: 0.0068,
    GBP: 0.0058,
  };

  const CURRENCY_SYMBOLS = {
    DZD: "دج",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  // ── Load/Save ──
  function loadSettings() {
    try {
      const saved = localStorage.getItem("a3m_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Back-compat: also read old individual keys
        return {
          lang:     parsed.lang     || localStorage.getItem("a3m_lang")  || DEFAULTS.lang,
          theme:    parsed.theme    || localStorage.getItem("a3m_theme") || DEFAULTS.theme,
          currency: parsed.currency || DEFAULTS.currency,
        };
      }
    } catch (e) {}
    return {
      lang:     localStorage.getItem("a3m_lang")  || DEFAULTS.lang,
      theme:    localStorage.getItem("a3m_theme") || DEFAULTS.theme,
      currency: DEFAULTS.currency,
    };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem("a3m_settings", JSON.stringify(settings));
      // Keep back-compat keys
      localStorage.setItem("a3m_lang",  settings.lang);
      localStorage.setItem("a3m_theme", settings.theme);
    } catch (e) {}
  }

  // ── Apply Language ──
  function applyLang(lang) {
    const validLangs = ["ar", "en", "fr"];
    if (!validLangs.includes(lang)) lang = "ar";

    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";

    // Apply data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      const t = window.A3M_I18N && window.A3M_I18N[lang];
      if (t && t[key]) el.textContent = t[key];
    });

    // Fire global event for page-specific handlers
    document.dispatchEvent(new CustomEvent("a3m:lang", {
      detail: {
        lang: lang,
        t: (window.A3M_I18N && window.A3M_I18N[lang]) || {},
      }
    }));

    // Call page-specific translation functions if they exist
    if (typeof window.applyI18n === "function") window.applyI18n(lang);
    if (typeof window.applyNavExtras === "function") window.applyNavExtras(lang);
    if (typeof window.translateDesignerUI === "function") window.translateDesignerUI();
    if (typeof window.updateHeroTagline === "function") window.updateHeroTagline(lang);
    if (typeof window.translateSidebar === "function") window.translateSidebar(lang);

    // Also call the main setLang if it exists (but avoid infinite recursion)
    if (typeof window._origSetLang === "function") window._origSetLang(lang);
  }

  // ── Apply Theme ──
  function applyTheme(theme) {
    document.body.className = theme;
    // Update any theme icon in nav
    const icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = theme.includes("dark") ? "🌙" : "☀️";
    const dark  = document.getElementById("modeDarkBtn");
    const light = document.getElementById("modeLightBtn");
    if (dark)  dark.classList.toggle("active",  theme.includes("dark"));
    if (light) light.classList.toggle("active", theme.includes("light"));
  }

  // ── Apply Currency ──
  function applyCurrency(currency) {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    // Update all elements with data-price attribute
    document.querySelectorAll("[data-price-dzd]").forEach(function (el) {
      const dzd = parseFloat(el.getAttribute("data-price-dzd")) || 0;
      const converted = (dzd * (CURRENCY_RATES[currency] || 1)).toFixed(
        currency === "DZD" ? 0 : 2
      );
      el.textContent = converted + " " + symbol;
    });
    // Fire event for manual handlers
    document.dispatchEvent(new CustomEvent("a3m:currency", {
      detail: { currency, symbol, rate: CURRENCY_RATES[currency] || 1 }
    }));
  }

  // ── Public API ──
  var A3MSettings = {
    get: loadSettings,

    setLang: function (lang) {
      var s = loadSettings();
      s.lang = lang;
      saveSettings(s);
      applyLang(lang);
    },

    setTheme: function (theme) {
      var s = loadSettings();
      s.theme = theme;
      saveSettings(s);
      applyTheme(theme);
    },

    setCurrency: function (currency) {
      var s = loadSettings();
      s.currency = currency;
      saveSettings(s);
      applyCurrency(currency);
    },

    applyAll: function () {
      var s = loadSettings();
      applyTheme(s.theme);
      applyCurrency(s.currency);
      // Lang applied after DOM ready for translations
      applyLang(s.lang);
    },

    CURRENCY_RATES: CURRENCY_RATES,
    CURRENCY_SYMBOLS: CURRENCY_SYMBOLS,
  };

  window.A3MSettings = A3MSettings;

  // ── Auto-apply on page load ──
  // Apply theme immediately (before paint)
  var _s = loadSettings();
  applyTheme(_s.theme);

  // Apply rest after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () { A3MSettings.applyAll(); }, 100);
    });
  } else {
    setTimeout(function () { A3MSettings.applyAll(); }, 100);
  }

  // ── Patch window.setLang so existing pages auto-persist ──
  document.addEventListener("DOMContentLoaded", function () {
    var _old = window.setLang;
    window._origSetLang = _old;
    window.setLang = function (lang) {
      A3MSettings.setLang(lang);
    };
    var _oldTheme = window.setTheme;
    window.setTheme = function (theme) {
      A3MSettings.setTheme(theme);
      if (_oldTheme) _oldTheme(theme);
    };
  });

})();
