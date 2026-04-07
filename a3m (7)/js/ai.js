// ============================================================
//  ai.js — A3M Print AI Chatbot (A3M Bot)
//  Powered by Claude API — Bottom-right floating chat widget
// ============================================================

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────
  const API_URL = "https://api.anthropic.com/v1/messages";
  const MODEL   = "claude-sonnet-4-20250514";

  // ── State ───────────────────────────────────────────────
  let isOpen        = false;
  let isTyping      = false;
  let hasGreeted    = false;
  let conversationHistory = [];

  // ── System prompt ────────────────────────────────────────
  const SYSTEM_PROMPT = `أنت A3M Bot، مساعد ذكاء اصطناعي لمتجر A3M Print للطباعة الاحترافية في الجزائر.
شخصيتك: ودود، مرح، محترف، ومتخصص في الطباعة والتصميم.

معلوماتك عن A3M Print:
- متجر طباعة احترافي في الجزائر
- المنتجات: تيشرتات، هوديات، أكواب، قبعات، حقائب، بطاقات، ملصقات، أوراق بمقاسات متعددة، نقش ليزر
- أنواع الطباعة: حرارية، تطريز، صباغة حرارية، DTG، سيلك سكرين، UV، ليزر، فينيل، أوفست
- العملة: دينار جزائري (DZD) أو دولار (USD)
- لديك نظام XP وتقديرات: Iron → Bronze → Gold → Diamond → Premium
- يمكن للعملاء تصميم منتجاتهم بأنفسهم في استوديو التصميم

قدراتك الخاصة — توليد التصاميم:
إذا طلب المستخدم توليد تصميم أو طلب تصميم معين (مثل: "صمم لي شعار"، "اعمل لي كرت بزنس"، "ابي تصميم تيشرت")،
أجب بطريقة عادية ثم أضف في آخر ردك هذا الكود بالضبط (استبدل المحتوى حسب الطلب):
[GENERATE_DESIGN:{"type":"text","content":"النص المطلوب","color":"#ffffff","bg":"#2563eb","font":"Cairo"}]

للتصميمات المعقدة أو الشعارات:
[GENERATE_DESIGN:{"type":"logo","title":"اسم الشركة","subtitle":"شعار فرعي","color":"#c9a84c","bg":"#0b0f19"}]

قواعد المحادثة:
1. رد دائماً بالعربية ما لم يكتب المستخدم بالفرنسية أو الإنجليزية
2. كن مختصراً وواضحاً — لا تطول الردود أكثر من اللازم
3. عند سؤالك عن الأسعار قدّر بشكل معقول وقل إنها تقريبية
4. شجّع المستخدم على استخدام استوديو التصميم
5. إذا لم تعرف شيئاً قل "سأتحقق من ذلك مع الفريق"
6. استخدم الإيموجي بشكل طبيعي لجعل المحادثة أكثر حيوية`;

  // ── Welcome messages ─────────────────────────────────────
  const WELCOME_MSGS = [
    "👋 أهلاً! أنا **A3M Bot** — هنا لمساعدتك في التسوق واختيار تصميمك المثالي! كيف أقدر أساعدك؟ 🎨",
  ];

  // ── Quick suggestion buttons ─────────────────────────────
  const SUGGESTIONS = [
    { label: "🛍️ ماذا تبيعون؟",    text: "ماذا تبيعون في المتجر؟" },
    { label: "🎨 صمّم لي تيشرت",   text: "أريد تصميم تيشرت مميز" },
    { label: "💰 الأسعار؟",        text: "ما هي أسعار المنتجات؟" },
    { label: "⚡ أنواع الطباعة",    text: "ما هي أنواع الطباعة المتاحة؟" },
  ];

  // ── Inject CSS ───────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("a3m-bot-styles")) return;
    const style = document.createElement("style");
    style.id = "a3m-bot-styles";
    style.textContent = `
/* ── A3M Bot Wrapper ── */
#a3m-bot-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

/* ── Trigger Button ── */
#a3m-bot-trigger {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--accent, #2563eb);
  border: 3px solid var(--gold, #c9a84c);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,.4), 0 0 0 0 var(--accent, #2563eb);
  transition: transform .2s, box-shadow .2s;
  position: relative;
  padding: 0;
  overflow: hidden;
  animation: a3m-pulse 3s infinite;
}
#a3m-bot-trigger:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px rgba(0,0,0,.5);
  animation: none;
}
#a3m-bot-trigger img {
  width: 54px;
  height: 54px;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}
@keyframes a3m-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,.4), 0 0 0 0 rgba(201,168,76,.6); }
  50%       { box-shadow: 0 4px 20px rgba(0,0,0,.4), 0 0 0 10px rgba(201,168,76,0); }
}

/* ── Notification badge ── */
#a3m-bot-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 18px;
  height: 18px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid var(--bg, #0b0f19);
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: a3m-bounce .6s ease infinite alternate;
}
@keyframes a3m-bounce {
  from { transform: scale(1); }
  to   { transform: scale(1.2); }
}

/* ── Tooltip bubble ── */
#a3m-bot-tooltip {
  position: absolute;
  bottom: 70px;
  right: 0;
  background: var(--bg2, #111827);
  border: 1px solid var(--gold, #c9a84c);
  color: var(--txt, #fff);
  padding: 8px 14px;
  border-radius: 12px 12px 0 12px;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,.4);
  animation: a3m-fadeIn .4s ease;
  cursor: pointer;
  max-width: 220px;
  white-space: normal;
  text-align: right;
  line-height: 1.4;
}
#a3m-bot-tooltip::after {
  content: '';
  position: absolute;
  bottom: -8px;
  right: 16px;
  border: 4px solid transparent;
  border-top-color: var(--gold, #c9a84c);
}

/* ── Chat Window ── */
#a3m-bot-chat {
  position: absolute;
  bottom: 74px;
  right: 0;
  width: 380px;
  max-height: 580px;
  background: var(--bg2, #111827);
  border: 1px solid var(--border, #2a2f3a);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  transform: scale(0.85) translateY(20px);
  transform-origin: bottom right;
  opacity: 0;
  pointer-events: none;
  transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
}
#a3m-bot-chat.open {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: all;
}

/* ── Chat Header ── */
.a3m-chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg3, #1f2937);
  border-bottom: 1px solid var(--border, #2a2f3a);
  flex-shrink: 0;
}
.a3m-chat-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid var(--gold, #c9a84c);
  overflow: hidden;
  flex-shrink: 0;
}
.a3m-chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.a3m-chat-info {
  flex: 1;
}
.a3m-chat-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--txt, #fff);
}
.a3m-chat-status {
  font-size: 11px;
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 4px;
}
.a3m-chat-status::before {
  content: '';
  width: 7px;
  height: 7px;
  background: #22c55e;
  border-radius: 50%;
  display: inline-block;
  animation: a3m-blink 1.5s infinite;
}
@keyframes a3m-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}
.a3m-close-btn {
  background: none;
  border: none;
  color: var(--txt3, #9ca3af);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color .2s, background .2s;
}
.a3m-close-btn:hover {
  color: var(--txt, #fff);
  background: var(--bg4, #374151);
}

/* ── Messages area ── */
.a3m-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 240px;
  max-height: 380px;
  scrollbar-width: thin;
  scrollbar-color: var(--border3, #4b5563) transparent;
}
.a3m-messages::-webkit-scrollbar { width: 4px; }
.a3m-messages::-webkit-scrollbar-thumb { background: var(--border3, #4b5563); border-radius: 2px; }

/* ── Message bubbles ── */
.a3m-msg {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  animation: a3m-fadeIn .3s ease;
}
@keyframes a3m-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.a3m-msg.bot { flex-direction: row; }
.a3m-msg.user { flex-direction: row-reverse; }

.a3m-msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--gold, #c9a84c);
  overflow: hidden;
  flex-shrink: 0;
}
.a3m-msg-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a3m-bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--txt, #fff);
}
.a3m-msg.bot .a3m-bubble {
  background: var(--bg3, #1f2937);
  border: 1px solid var(--border, #2a2f3a);
  border-bottom-right-radius: 4px;
}
.a3m-msg.user .a3m-bubble {
  background: var(--accent, #2563eb);
  border: none;
  border-bottom-left-radius: 4px;
  color: #fff;
}
.a3m-bubble b, .a3m-bubble strong {
  color: var(--gold, #c9a84c);
  font-weight: 700;
}

/* ── Typing indicator ── */
.a3m-typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 2px;
}
.a3m-typing-dots span {
  width: 7px;
  height: 7px;
  background: var(--txt3, #9ca3af);
  border-radius: 50%;
  animation: a3m-dot 1.2s infinite;
}
.a3m-typing-dots span:nth-child(2) { animation-delay: .2s; }
.a3m-typing-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes a3m-dot {
  0%, 100% { transform: translateY(0); opacity:.5; }
  50%       { transform: translateY(-5px); opacity:1; }
}

/* ── Generated design card ── */
.a3m-design-card {
  margin-top: 10px;
  border: 2px solid var(--gold, #c9a84c);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg, #0b0f19);
}
.a3m-design-canvas {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  padding: 16px;
  text-align: center;
  position: relative;
}
.a3m-design-actions {
  display: flex;
  gap: 6px;
  padding: 8px;
  background: var(--bg3, #1f2937);
}
.a3m-design-btn {
  flex: 1;
  padding: 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity .2s;
}
.a3m-design-btn:hover { opacity: .8; }
.a3m-design-btn.primary {
  background: var(--accent, #2563eb);
  color: #fff;
}
.a3m-design-btn.gold {
  background: transparent;
  border: 1px solid var(--gold, #c9a84c);
  color: var(--gold, #c9a84c);
}

/* ── Suggestions ── */
.a3m-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px 4px;
  border-top: 1px solid var(--border, #2a2f3a);
}
.a3m-sug-btn {
  background: var(--bg3, #1f2937);
  border: 1px solid var(--border, #2a2f3a);
  color: var(--txt2, #d1d5db);
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  cursor: pointer;
  transition: border-color .2s, color .2s;
  font-family: 'Cairo', sans-serif;
}
.a3m-sug-btn:hover {
  border-color: var(--accent, #2563eb);
  color: var(--txt, #fff);
}

/* ── Input area ── */
.a3m-input-area {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg3, #1f2937);
  border-top: 1px solid var(--border, #2a2f3a);
  flex-shrink: 0;
}
.a3m-input {
  flex: 1;
  background: var(--bg4, #374151);
  border: 1px solid var(--border2, #3a4150);
  color: var(--txt, #fff);
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-family: 'Cairo', sans-serif;
  outline: none;
  transition: border-color .2s;
  direction: rtl;
}
.a3m-input::placeholder { color: var(--txt4, #6b7280); }
.a3m-input:focus { border-color: var(--accent, #2563eb); }

.a3m-send-btn {
  width: 36px;
  height: 36px;
  background: var(--accent, #2563eb);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s, transform .1s;
  flex-shrink: 0;
}
.a3m-send-btn:hover { background: var(--accent2, #1d4ed8); }
.a3m-send-btn:active { transform: scale(.9); }
.a3m-send-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Design Studio Context Badge ── */
#a3m-design-context {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 9998;
  background: var(--bg2, #111827);
  border: 1px solid var(--gold, #c9a84c);
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 12px;
  color: var(--txt2, #d1d5db);
  cursor: pointer;
  display: none;
  animation: a3m-fadeIn .4s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,.4);
}
#a3m-design-context span { color: var(--gold, #c9a84c); font-weight: 700; }

@media (max-width: 480px) {
  #a3m-bot-chat { width: calc(100vw - 32px); right: -8px; }
  #a3m-bot-wrap { right: 16px; bottom: 16px; }
}
    `;
    document.head.appendChild(style);
  }

  // ── Build HTML ───────────────────────────────────────────
  function buildHTML() {
    const robotSrc = getRobotSrc();

    const wrap = document.createElement("div");
    wrap.id = "a3m-bot-wrap";
    wrap.innerHTML = `
      <!-- Tooltip -->
      <div id="a3m-bot-tooltip" onclick="window.A3MBot.toggleChat()">
        👋 أهلاً! أنا A3M Bot — هنا لمساعدتك!
      </div>

      <!-- Chat window -->
      <div id="a3m-bot-chat">
        <!-- Header -->
        <div class="a3m-chat-header">
          <div class="a3m-chat-avatar">
            <img src="${robotSrc}" alt="A3M Bot"/>
          </div>
          <div class="a3m-chat-info">
            <div class="a3m-chat-name">A3M Bot 🤖</div>
            <div class="a3m-chat-status">متاح الآن</div>
          </div>
          <button class="a3m-close-btn" onclick="window.A3MBot.toggleChat()">✕</button>
        </div>

        <!-- Messages -->
        <div class="a3m-messages" id="a3m-msgs"></div>

        <!-- Suggestion pills -->
        <div class="a3m-suggestions" id="a3m-sugs"></div>

        <!-- Input -->
        <div class="a3m-input-area">
          <input
            class="a3m-input"
            id="a3m-input"
            placeholder="اكتب سؤالك هنا…"
            autocomplete="off"
            maxlength="500"
          />
          <button class="a3m-send-btn" id="a3m-send" onclick="window.A3MBot.sendMessage()">➤</button>
        </div>
      </div>

      <!-- Trigger button -->
      <button id="a3m-bot-trigger" onclick="window.A3MBot.toggleChat()" title="تحدث مع A3M Bot">
        <div id="a3m-bot-badge">1</div>
        <img src="${robotSrc}" alt="A3M Bot"/>
      </button>
    `;

    document.body.appendChild(wrap);

    // Fix broken images
    setTimeout(fixRobotImages, 100);

    // Keyboard send
    document.getElementById("a3m-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        window.A3MBot.sendMessage();
      }
    });
  }

  // ── Get robot image path ─────────────────────────────────
  function getRobotSrc() {
    // Try to find robot.webp relative to the script location
    const scripts = document.querySelectorAll("script[src]");
    for (const s of scripts) {
      if (s.src.includes("ai.js")) {
        const base = s.src.replace(/ai\.js.*$/, "");
        return base + "robot.webp";
      }
    }
    // Try common paths based on current page location
    const loc = window.location.pathname;
    if (loc.includes("/pages/")) {
      return "../js/robot.webp";
    }
    // Multiple fallback attempts
    return "./js/robot.webp";
  }

  // ── Fix broken robot images with fallback emoji ───────────
  function fixRobotImages() {
    document.querySelectorAll('#a3m-bot-trigger img, .a3m-msg-avatar img, .a3m-chat-avatar img').forEach(img => {
      if (!img._a3mFixed) {
        img._a3mFixed = true;
        img.onerror = function() {
          // Try alternative paths
          const tried = this._triedPaths || [];
          const paths = ['./robot.webp', './js/robot.webp', '../robot.webp', '../js/robot.webp', '/js/robot.webp'];
          const next = paths.find(p => !tried.includes(p) && p !== this.src);
          if (next) {
            tried.push(this.src);
            this._triedPaths = tried;
            this.src = next;
          } else {
            // Final fallback: replace with emoji
            const parent = this.closest('.a3m-msg-avatar, .a3m-chat-avatar, #a3m-bot-trigger');
            if (parent) {
              parent.innerHTML = '<span style="font-size:1.4rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%">🤖</span>';
            }
          }
        };
      }
    });
  }

  // ── Toggle Chat ──────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    const chat    = document.getElementById("a3m-bot-chat");
    const tooltip = document.getElementById("a3m-bot-tooltip");
    const badge   = document.getElementById("a3m-bot-badge");

    if (isOpen) {
      chat.classList.add("open");
      if (tooltip) tooltip.style.display = "none";
      if (badge)   badge.style.display   = "none";
      if (!hasGreeted) greetUser();
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => document.getElementById("a3m-input")?.focus(), 300);
    } else {
      chat.classList.remove("open");
    }
  }

  // ── Greet user ───────────────────────────────────────────
  function greetUser() {
    hasGreeted = true;
    const msg = WELCOME_MSGS[0];
    setTimeout(() => {
      appendMessage("bot", msg);
      showSuggestions();
    }, 400);
  }

  // ── Show suggestion pills ────────────────────────────────
  function showSuggestions() {
    const container = document.getElementById("a3m-sugs");
    if (!container) return;
    container.innerHTML = "";
    SUGGESTIONS.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = "a3m-sug-btn";
      btn.textContent = s.label;
      btn.onclick = () => {
        container.innerHTML = "";
        sendText(s.text);
      };
      container.appendChild(btn);
    });
  }

  // ── Append message to chat ───────────────────────────────
  function appendMessage(role, content) {
    const msgs = document.getElementById("a3m-msgs");
    if (!msgs) return null;

    const wrapper = document.createElement("div");
    wrapper.className = `a3m-msg ${role}`;

    // Avatar
    if (role === "bot") {
      const av = document.createElement("div");
      av.className = "a3m-msg-avatar";
      av.innerHTML = `<img src="${getRobotSrc()}" alt="bot"/>`;
      wrapper.appendChild(av);
    }

    const bubble = document.createElement("div");
    bubble.className = "a3m-bubble";

    // Check for design generation command
    if (content.includes("[GENERATE_DESIGN:")) {
      const parts = content.split(/\[GENERATE_DESIGN:(.+?)\]/s);
      const textPart   = parts[0] ? parseMarkdown(parts[0]) : "";
      const jsonStr    = parts[1] || "{}";
      const afterText  = parts[2] ? parseMarkdown(parts[2]) : "";

      let designData = {};
      try { designData = JSON.parse(jsonStr); } catch(e) {}

      bubble.innerHTML = textPart + afterText;
      wrapper.appendChild(bubble);
      msgs.appendChild(wrapper);

      // Render design card after bubble
      setTimeout(() => {
        const card = buildDesignCard(designData, msgs);
        msgs.appendChild(card);
        scrollToBottom();
      }, 200);
    } else {
      bubble.innerHTML = parseMarkdown(content);
      wrapper.appendChild(bubble);
      msgs.appendChild(wrapper);
    }

    scrollToBottom();
    return wrapper;
  }

  // ── Parse basic markdown ─────────────────────────────────
  function parseMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,     "<em>$1</em>")
      .replace(/\n/g,            "<br>");
  }

  // ── Build design card ────────────────────────────────────
  function buildDesignCard(data, msgs) {
    const card = document.createElement("div");
    card.className = "a3m-design-card";
    card.style.animation = "a3m-fadeIn .5s ease";

    const type    = data.type    || "text";
    const bg      = data.bg      || "#2563eb";
    const color   = data.color   || "#ffffff";
    const font    = data.font    || "Cairo";
    const content = data.content || data.title || "A3M";
    const sub     = data.subtitle || "";

    const canvas = document.createElement("div");
    canvas.className = "a3m-design-canvas";
    canvas.style.background   = bg;
    canvas.style.color        = color;
    canvas.style.fontFamily   = `'${font}', sans-serif`;

    if (type === "logo") {
      canvas.innerHTML = `
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:900;letter-spacing:2px;text-transform:uppercase">${content}</div>
          ${sub ? `<div style="font-size:13px;opacity:.75;margin-top:4px;letter-spacing:1px">${sub}</div>` : ""}
          <div style="width:60px;height:3px;background:${color};margin:8px auto;opacity:.6;border-radius:2px"></div>
        </div>`;
    } else {
      canvas.innerHTML = `
        <div style="text-align:center;font-size:20px;font-weight:700;line-height:1.4">${content}</div>`;
    }

    const actions = document.createElement("div");
    actions.className = "a3m-design-actions";
    actions.innerHTML = `
      <button class="a3m-design-btn primary" onclick="window.A3MBot.openStudio()">🎨 افتح الاستوديو</button>
      <button class="a3m-design-btn gold"    onclick="window.A3MBot.refineDesign(this)">✨ طوّر التصميم</button>
    `;

    card.appendChild(canvas);
    card.appendChild(actions);
    return card;
  }

  // ── Show typing indicator ─────────────────────────────────
  function showTyping() {
    const msgs = document.getElementById("a3m-msgs");
    if (!msgs) return;

    const wrapper = document.createElement("div");
    wrapper.className = "a3m-msg bot";
    wrapper.id = "a3m-typing";

    const av = document.createElement("div");
    av.className = "a3m-msg-avatar";
    av.innerHTML = `<img src="${getRobotSrc()}" alt="bot"/>`;

    const bubble = document.createElement("div");
    bubble.className = "a3m-bubble";
    bubble.innerHTML = `<div class="a3m-typing-dots"><span></span><span></span><span></span></div>`;

    wrapper.appendChild(av);
    wrapper.appendChild(bubble);
    msgs.appendChild(wrapper);
    scrollToBottom();
  }

  // ── Remove typing indicator ───────────────────────────────
  function removeTyping() {
    document.getElementById("a3m-typing")?.remove();
  }

  // ── Scroll to bottom ──────────────────────────────────────
  function scrollToBottom() {
    const msgs = document.getElementById("a3m-msgs");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Send message ──────────────────────────────────────────
  function sendMessage() {
    const input = document.getElementById("a3m-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = "";
    sendText(text);
  }

  async function sendText(text) {
    if (!text || isTyping) return;

    // Clear suggestions
    const sugs = document.getElementById("a3m-sugs");
    if (sugs) sugs.innerHTML = "";

    appendMessage("user", text);
    conversationHistory.push({ role: "user", content: text });

    isTyping = true;
    const sendBtn = document.getElementById("a3m-send");
    if (sendBtn) sendBtn.disabled = true;

    showTyping();

    // Try up to 2 times
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

        const response = await fetch(API_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model:      MODEL,
            max_tokens: 1000,
            system:     SYSTEM_PROMPT,
            messages:   conversationHistory,
          }),
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errData?.error?.message || response.statusText}`);
        }

        const data = await response.json();
        removeTyping();

        if (data?.content?.[0]?.text) {
          const reply = data.content[0].text;
          conversationHistory.push({ role: "assistant", content: reply });
          appendMessage("bot", reply);
          // Show suggestions again after each reply
          setTimeout(showSuggestions, 600);
        } else {
          appendMessage("bot", "عذراً، لم أتمكن من فهم الرد. حاول مرة أخرى 🙏");
        }

        isTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        setTimeout(() => document.getElementById("a3m-input")?.focus(), 100);
        return; // success

      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500)); // wait 1.5s before retry
        }
      }
    }

    // Both attempts failed
    removeTyping();
    const isAbort   = lastErr?.name === "AbortError";
    const isOffline = !navigator.onLine;
    let errMsg = "⚠️ تعذّر الاتصال بالخادم.";
    if (isOffline)     errMsg = "⚠️ لا يوجد اتصال بالإنترنت. تحقق من شبكتك وأعد المحاولة.";
    else if (isAbort)  errMsg = "⚠️ انتهت مهلة الاتصال. الخادم بطيء — حاول مرة أخرى.";
    else               errMsg = "⚠️ خطأ في الاتصال. اضغط إرسال مرة أخرى للمحاولة.";
    appendMessage("bot", errMsg);
    console.error("A3M Bot error after 2 attempts:", lastErr);

    isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
    setTimeout(() => document.getElementById("a3m-input")?.focus(), 100);
  }

  // ── Open design studio ────────────────────────────────────
  function openStudio() {
    if (typeof window.openModePicker === "function") {
      window.openModePicker();
    } else {
      window.location.href = "#design";
    }
    toggleChat();
  }

  // ── Refine design ─────────────────────────────────────────
  function refineDesign(btn) {
    btn.textContent = "⏳ جاري التطوير…";
    btn.disabled = true;
    sendText("طوّر التصميم السابق وحسّن مظهره بألوان أجمل وتفاصيل أكثر احترافية");
    setTimeout(() => { btn.textContent = "✨ طوّر التصميم"; btn.disabled = false; }, 3000);
  }

  // ── Auto tooltip timer ────────────────────────────────────
  function scheduleTooltip() {
    setTimeout(() => {
      if (!isOpen && !hasGreeted) {
        const tooltip = document.getElementById("a3m-bot-tooltip");
        if (tooltip) {
          tooltip.style.display = "block";
          // Auto hide after 8s
          setTimeout(() => {
            if (!isOpen) tooltip.style.display = "none";
          }, 8000);
        }
      }
    }, 3000); // Show after 3s
  }

  // ── Context-aware: detect design studio ───────────────────
  function detectDesignStudio() {
    // Watch for designer panel opening
    const observer = new MutationObserver(() => {
      const designer = document.getElementById("designerPanel") ||
                       document.getElementById("designModal")   ||
                       document.querySelector(".designer-panel");
      const badge = document.getElementById("a3m-design-context");

      if (designer && getComputedStyle(designer).display !== "none") {
        if (badge) badge.style.display = "block";
        // Proactively offer help
        if (hasGreeted && conversationHistory.length < 3) {
          setTimeout(() => {
            appendMessage("bot", "🎨 أرى أنك في استوديو التصميم! تحتاج مساعدة؟ يمكنني **توليد تصاميم** لك أو **اقتراح ألوان وخطوط** مناسبة.");
          }, 1000);
        }
      } else {
        if (badge) badge.style.display = "none";
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildHTML();
    scheduleTooltip();
    detectDesignStudio();

    // Expose global API
    window.A3MBot = {
      toggleChat,
      sendMessage,
      sendText,
      openStudio,
      refineDesign,
    };

    console.log("✅ A3M Bot initialized");
  }

  // ── Bootstrap ─────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
