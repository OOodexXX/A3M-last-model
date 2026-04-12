// ================================================================
//  ai.js — A3M Print — A3M Bot v3.0
//  ✅ FIX #1: زر البوت — addEventListener بدلاً من onclick inline
//  ✅ FIX #2: الصورة ثابتة دائماً (_robotSrc محفوظ)
//  ✅ FIX #3: scheduleTooltip موجودة
//  ✅ NEW  3: حفظ تاريخ المحادثات (آخر 5 محادثات)
//  ✅ NEW  4: اقتراحات ديناميكية حسب الصفحة والسياق
//  ✅ NEW  5: Streaming — الرد يظهر كلمة كلمة مثل ChatGPT
// ================================================================
(function () {
  "use strict";

  const DEFAULT_MODEL   = "claude-sonnet-4-20250514";
  const BOT_NAME        = "A3M Bot";
  const FALLBACK_EMOJI  = "🤖";
  const MAX_SAVED_CHATS = 5;
  let _robotSrc = null; // ✅ FIX #2

  const SYSTEM_PROMPT = `أنت A3M Bot مساعد A3M Print للطباعة في الجزائر.
منتجات: تيشرتات، هوديات، أكواب، قبعات، حقائب، بطاقات، ملصقات، ورق A3/A4/A5، نقش ليزر.
طباعة: حرارية، تطريز، DTG، UV، ليزر، فينيل، سيلك سكرين، أوفست.
قواعد: رد بلغة المستخدم. كن مختصراً. إذا طلب تصميماً أضف:
[GENERATE_DESIGN:{"type":"tshirt","title":"TITLE","subtitle":"sub","color":"#2563eb","bg":"#0b0f19","textColor":"#fff"}]`;

  const state = { isOpen:false, isTyping:false, hasGreeted:false, history:[], lastSpec:null };
  const settings = {
    mode:     (window.A3M_AI_MODE  || localStorage.getItem("a3m_ai_mode")      || "local").trim(),
    apiKey:   (window.A3M_AI_KEY   || localStorage.getItem("a3m_ai_key")        || "").trim(),
    proxyUrl: (window.A3M_AI_PROXY || localStorage.getItem("a3m_ai_proxy_url") || "").trim(),
    model:    (window.A3M_AI_MODEL || localStorage.getItem("a3m_ai_model")     || DEFAULT_MODEL).trim(),
    timeoutMs: 30000,
  };

  // ✅ NEW 4 — اقتراحات حسب الصفحة
  function detectPage() {
    const p = window.location.pathname + window.location.hash;
    if (/design|studio|designer/i.test(p)) return "design";
    if (/product|shop|catalog/i.test(p))   return "products";
    if (/checkout|cart|order/i.test(p))    return "checkout";
    if (/contact/i.test(p))                return "contact";
    return "home";
  }

  const PAGE_SUGS = {
    home:     [{label:"🛍️ المنتجات",text:"ماذا تبيعون في المتجر؟"},{label:"🎨 صمّم تيشرت",text:"أريد تصميم تيشرت مميز"},{label:"💰 الأسعار",text:"ما هي أسعار المنتجات؟"},{label:"🖨️ الطباعة",text:"ما هي أنواع الطباعة؟"}],
    products: [{label:"👕 التيشرتات",text:"أسعار التيشرتات؟"},{label:"🧥 الهوديات",text:"أنواع الهوديات؟"},{label:"🖨️ أفضل طباعة",text:"أفضل نوع طباعة للملابس؟"},{label:"📦 الكميات",text:"خصم للكميات الكبيرة؟"}],
    design:   [{label:"🎨 شعار",text:"صمم لي شعار احترافي"},{label:"👕 تيشرت",text:"تصميم تيشرت أزرق"},{label:"📋 كرت أعمال",text:"صمم كرت أعمال أنيق"},{label:"🌟 بوستر",text:"بوستر ترويجي جذاب"}],
    checkout: [{label:"🚚 التوصيل",text:"كم يستغرق التوصيل؟"},{label:"💳 الدفع",text:"طرق الدفع المتاحة؟"},{label:"🎁 كود خصم",text:"هل يوجد كود خصم؟"},{label:"🔄 الاسترجاع",text:"سياسة الاسترجاع؟"}],
    contact:  [{label:"📞 تواصل",text:"كيف أتواصل مع المتجر؟"},{label:"⏰ أوقات العمل",text:"أوقات عمل المتجر؟"},{label:"💬 واتساب",text:"رقم واتساب المتجر؟"},{label:"📍 الموقع",text:"أين يقع المتجر؟"}],
  };

  const CTX_SUGS = {
    products: [{label:"💰 الأسعار",text:"كم أسعار المنتجات؟"},{label:"🚚 التوصيل",text:"كيف يتم التوصيل؟"},{label:"📦 اطلب",text:"كيف أضيف للسلة؟"}],
    prices:   [{label:"📦 اطلب الآن",text:"كيف أكمل الطلب؟"},{label:"🎁 خصم؟",text:"هل يوجد كود خصم؟"},{label:"📞 استفسار",text:"كيف أتواصل؟"}],
    design:   [{label:"🎨 الاستوديو",text:"كيف أفتح استوديو التصميم؟"},{label:"✏️ الألوان",text:"أريد تعديل الألوان"},{label:"📥 تحميل",text:"كيف أحمل التصميم؟"}],
    printing: [{label:"💰 أسعار الطباعة",text:"كم أسعار الطباعة؟"},{label:"⏱️ وقت التنفيذ",text:"كم يستغرق الطلب؟"},{label:"🎨 أفضل جودة",text:"أفضل جودة طباعة؟"}],
    order:    [{label:"🚚 التوصيل",text:"كم يستغرق التوصيل؟"},{label:"📞 متابعة",text:"متى ستتواصلون معي؟"},{label:"🔄 تعديل",text:"هل أقدر أعدل طلبي؟"}],
  };

  function detectCtxKey(text) {
    const n = normalizeAr(text);
    if(/(منتج|تيشرت|هودي|كوب|قبعه)/.test(n)) return "products";
    if(/(سعر|دج|dzd|تكلف)/.test(n))           return "prices";
    if(/(تصميم|لون|شعار|generate)/.test(n))    return "design";
    if(/(طباعه|dtg|uv|ليزر)/.test(n))          return "printing";
    if(/(طلب|سله|checkout)/.test(n))           return "order";
    return null;
  }

  function normalizeAr(t) {
    return String(t||"").toLowerCase()
      .replace(/[ًٌٍَُِّْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي")
      .replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
  }
  function escapeHTML(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  // ✅ FIX #2 — مسار صورة محفوظ
  function resolveRobotSrc() {
    if (_robotSrc) return _robotSrc;
    for (const s of document.querySelectorAll("script[src]")) {
      if (s.src && s.src.includes("ai.js")) { _robotSrc = s.src.replace(/ai\.js.*$/,"")+"robot.webp"; return _robotSrc; }
    }
    _robotSrc = "./js/robot.webp";
    return _robotSrc;
  }

  function makeAvatar() {
    const src=resolveRobotSrc(), av=document.createElement("div");
    av.className="a3m-msg-avatar";
    const img=document.createElement("img"); img.src=src; img.alt=BOT_NAME;
    img.onerror=()=>{av.removeChild(img);av.textContent=FALLBACK_EMOJI;};
    av.appendChild(img); return av;
  }

  // ✅ NEW 3 — تاريخ المحادثات
  function saveCurrentChat() {
    if(state.history.length<2)return;
    try{
      const saved=JSON.parse(localStorage.getItem("a3m_chat_history")||"[]");
      saved.unshift({id:Date.now(),date:new Date().toLocaleDateString("ar-DZ"),preview:(state.history.find(m=>m.role==="user")?.content||"محادثة").slice(0,50),messages:state.history.slice(-20)});
      if(saved.length>MAX_SAVED_CHATS)saved.length=MAX_SAVED_CHATS;
      localStorage.setItem("a3m_chat_history",JSON.stringify(saved));
    }catch(e){}
  }
  function loadChatHistory(){try{return JSON.parse(localStorage.getItem("a3m_chat_history")||"[]");}catch{return[];}}
  function deleteSavedChat(id){try{const s=loadChatHistory().filter(c=>c.id!==id);localStorage.setItem("a3m_chat_history",JSON.stringify(s));renderHistoryPanel();}catch(e){}}

  function restoreChat(entry) {
    state.history=entry.messages||[]; state.hasGreeted=true;
    const msgs=document.getElementById("a3m-msgs"); if(!msgs)return;
    msgs.innerHTML="";
    for(const m of state.history){if(m.role==="user"||m.role==="assistant"){const c=String(m.content||"").replace(/\n?\[GENERATE_DESIGN:[\s\S]*?\]\s*$/,"").trim();if(c)appendMessage(m.role==="assistant"?"bot":"user",c);}}
    closeHistory(); scrollToBottom();
  }

  function renderHistoryPanel() {
    const panel=document.getElementById("a3m-history-panel"); if(!panel)return;
    const chats=loadChatHistory();
    if(!chats.length){panel.innerHTML=`<div style="padding:24px;text-align:center;color:var(--txt3,#9ca3af);font-size:13px">📭 لا توجد محادثات محفوظة</div>`;return;}
    panel.innerHTML=chats.map(c=>`<div class="a3m-hist-item"><div class="a3m-hist-info"><div class="a3m-hist-date">${escapeHTML(c.date)}</div><div class="a3m-hist-preview">${escapeHTML(c.preview)}</div></div><div class="a3m-hist-actions"><button class="a3m-hist-restore" data-id="${c.id}">↩ استرجاع</button><button class="a3m-hist-delete" data-id="${c.id}">🗑</button></div></div>`).join("");
    panel.querySelectorAll(".a3m-hist-restore").forEach(btn=>{btn.onclick=()=>{const e=chats.find(c=>c.id===Number(btn.dataset.id));if(e)restoreChat(e);};});
    panel.querySelectorAll(".a3m-hist-delete").forEach(btn=>{btn.onclick=()=>deleteSavedChat(Number(btn.dataset.id));});
  }

  function openHistory(){renderHistoryPanel();document.getElementById("a3m-history-modal")?.classList.add("open");}
  function closeHistory(){document.getElementById("a3m-history-modal")?.classList.remove("open");}

  // ── CSS ───────────────────────────────────────────────────────
  function ensureStyle() {
    if(document.getElementById("a3m-bot-styles"))return;
    const s=document.createElement("style"); s.id="a3m-bot-styles";
    s.textContent=`
#a3m-bot-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;font-family:'Cairo',sans-serif;direction:rtl}
#a3m-bot-trigger{width:64px;height:64px;border-radius:50%;background:var(--accent,#2563eb);border:3px solid var(--gold,#c9a84c);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.45);animation:a3m-pulse 3s infinite;transition:transform .2s;position:relative;overflow:hidden;}
#a3m-bot-trigger:hover{transform:scale(1.1);animation:none}
#a3m-bot-trigger>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;pointer-events:none;}
#a3m-bot-trigger .a3m-fb{font-size:1.8rem;pointer-events:none}
#a3m-bot-badge{position:absolute;top:-4px;left:-4px;z-index:1;width:20px;height:20px;border-radius:50%;background:#ef4444;border:2px solid var(--bg,#0b0f19);font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;}
#a3m-bot-tooltip{position:absolute;bottom:72px;right:0;background:var(--bg2,#111827);border:1px solid var(--gold,#c9a84c);color:var(--txt,#fff);padding:10px 16px;border-radius:14px 14px 0 14px;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.4);cursor:pointer;max-width:240px;text-align:right;line-height:1.5;display:none;animation:a3m-fadeIn .3s ease;}
#a3m-bot-tooltip::after{content:'';position:absolute;bottom:-8px;right:18px;border:4px solid transparent;border-top-color:var(--gold,#c9a84c)}
#a3m-bot-chat{position:absolute;bottom:76px;right:0;width:390px;background:var(--bg2,#111827);border:1px solid var(--border,#2a2f3a);border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.65);transform:scale(.88) translateY(24px);transform-origin:bottom right;opacity:0;pointer-events:none;max-height:620px;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s;}
#a3m-bot-chat.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
.a3m-chat-header{display:flex;align-items:center;gap:10px;padding:13px 14px;background:var(--bg3,#1f2937);border-bottom:1px solid var(--border,#2a2f3a);flex-shrink:0;}
.a3m-chat-avatar{width:42px;height:42px;border-radius:50%;overflow:hidden;border:2px solid var(--gold,#c9a84c);flex-shrink:0;background:var(--accent,#2563eb);display:flex;align-items:center;justify-content:center;font-size:1.3rem;}
.a3m-chat-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.a3m-chat-info{flex:1;min-width:0}.a3m-chat-name{font-size:14px;font-weight:700;color:var(--txt,#fff)}.a3m-chat-status{font-size:11px;color:#22c55e;display:flex;align-items:center;gap:4px}.a3m-chat-status::before{content:'';width:7px;height:7px;background:#22c55e;border-radius:50%;animation:a3m-blink 2s infinite}
.a3m-mode-badge{font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid var(--border,#2a2f3a);color:var(--txt3,#9ca3af);background:rgba(255,255,255,.05);white-space:nowrap}.a3m-mode-badge.live{color:#22c55e;border-color:rgba(34,197,94,.4)}
.a3m-header-actions{display:flex;gap:3px;flex-shrink:0}
.a3m-hbtn{background:none;border:none;color:var(--txt3,#9ca3af);font-size:15px;cursor:pointer;padding:5px 7px;border-radius:8px;transition:background .2s,color .2s;line-height:1}.a3m-hbtn:hover{background:rgba(255,255,255,.09);color:var(--txt,#fff)}
.a3m-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:260px;max-height:380px;scrollbar-width:thin;scrollbar-color:var(--border3,#4b5563) transparent;}
.a3m-messages::-webkit-scrollbar{width:4px}.a3m-messages::-webkit-scrollbar-thumb{background:var(--border3,#4b5563);border-radius:2px}
.a3m-msg{display:flex;gap:8px;align-items:flex-end;animation:a3m-fadeIn .28s ease}.a3m-msg.bot{flex-direction:row}.a3m-msg.user{flex-direction:row-reverse}
.a3m-msg-avatar{width:30px;height:30px;border-radius:50%;overflow:hidden;border:2px solid var(--gold,#c9a84c);flex-shrink:0;background:var(--accent,#2563eb);display:flex;align-items:center;justify-content:center;font-size:1rem;}
.a3m-msg-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.a3m-bubble{max-width:80%;padding:10px 14px;border-radius:18px;font-size:13px;line-height:1.65;color:var(--txt,#fff);white-space:pre-wrap;word-break:break-word}
.a3m-msg.bot .a3m-bubble{background:var(--bg3,#1f2937);border:1px solid var(--border,#2a2f3a);border-bottom-right-radius:5px}.a3m-msg.user .a3m-bubble{background:var(--accent,#2563eb);border-bottom-left-radius:5px;color:#fff}
.a3m-bubble strong{color:var(--gold,#c9a84c);font-weight:700}
.a3m-cursor{display:inline-block;width:2px;height:14px;background:var(--gold,#c9a84c);margin-right:2px;animation:a3m-cur .65s infinite;vertical-align:middle}
@keyframes a3m-cur{0%,100%{opacity:1}50%{opacity:0}}
.a3m-design-card{margin-top:10px;border:2px solid var(--gold,#c9a84c);border-radius:14px;overflow:hidden}
.a3m-design-canvas{padding:18px;min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px}
.a3m-design-title{font-size:22px;font-weight:800;line-height:1.2}.a3m-design-sub{font-size:12px;opacity:.75}
.a3m-design-actions{display:flex;gap:6px;padding:10px;background:var(--bg3,#1f2937)}
.a3m-design-btn{flex:1;padding:7px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:'Cairo',sans-serif;transition:opacity .2s,transform .1s}.a3m-design-btn:active{transform:scale(.97)}.a3m-design-btn.primary{background:var(--accent,#2563eb);color:#fff}.a3m-design-btn.gold{background:transparent;border:1.5px solid var(--gold,#c9a84c);color:var(--gold,#c9a84c)}
.a3m-suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 4px;border-top:1px solid var(--border,#2a2f3a)}
.a3m-sug-btn{background:var(--bg3,#1f2937);border:1px solid var(--border2,#3a4150);color:var(--txt2,#d1d5db);padding:5px 11px;border-radius:20px;font-size:11px;cursor:pointer;font-family:'Cairo',sans-serif;transition:background .2s,border-color .2s,color .2s;white-space:nowrap;}
.a3m-sug-btn:hover{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}
.a3m-input-area{display:flex;gap:8px;padding:10px 12px;background:var(--bg3,#1f2937);border-top:1px solid var(--border,#2a2f3a);flex-shrink:0;align-items:center}
.a3m-input{flex:1;background:var(--bg4,#374151);border:1.5px solid var(--border2,#3a4150);color:var(--txt,#fff);padding:9px 14px;border-radius:22px;font-size:13px;font-family:'Cairo',sans-serif;outline:none;transition:border-color .2s;direction:rtl}.a3m-input:focus{border-color:var(--accent,#2563eb)}.a3m-input:disabled{opacity:.5}
.a3m-send-btn{width:38px;height:38px;background:var(--accent,#2563eb);border:none;border-radius:50%;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s,transform .15s}.a3m-send-btn:hover:not(:disabled){background:var(--gold,#c9a84c);transform:scale(1.08)}.a3m-send-btn:disabled{opacity:.4;cursor:not-allowed}
#a3m-history-modal{position:absolute;inset:0;background:var(--bg2,#111827);border-radius:20px;display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateX(-18px);transition:opacity .25s,transform .25s;z-index:10;}
#a3m-history-modal.open{opacity:1;pointer-events:all;transform:translateX(0)}
.a3m-hist-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border,#2a2f3a);background:var(--bg3,#1f2937);border-radius:20px 20px 0 0;flex-shrink:0;}
.a3m-hist-title{font-size:14px;font-weight:700;color:var(--txt,#fff)}
#a3m-history-panel{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin}
.a3m-hist-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3,#1f2937);border:1px solid var(--border,#2a2f3a);border-radius:12px;transition:border-color .2s}.a3m-hist-item:hover{border-color:var(--gold,#c9a84c)}
.a3m-hist-info{flex:1;min-width:0}.a3m-hist-date{font-size:10px;color:var(--txt3,#9ca3af)}.a3m-hist-preview{font-size:12px;color:var(--txt2,#d1d5db);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a3m-hist-actions{display:flex;gap:5px;flex-shrink:0}
.a3m-hist-restore{background:var(--accent,#2563eb);color:#fff;border:none;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:'Cairo',sans-serif;white-space:nowrap}
.a3m-hist-delete{background:transparent;color:var(--txt3,#9ca3af);border:1px solid var(--border,#2a2f3a);padding:4px 8px;border-radius:8px;font-size:11px;cursor:pointer;transition:color .2s}.a3m-hist-delete:hover{color:#ef4444;border-color:#ef4444}
#a3m-design-context{position:fixed;bottom:100px;right:24px;z-index:9998;background:var(--bg2,#111827);border:1px solid var(--gold,#c9a84c);border-radius:12px;padding:8px 14px;font-size:12px;color:var(--txt2,#d1d5db);cursor:pointer;display:none;box-shadow:0 4px 16px rgba(0,0,0,.4)}
#a3m-design-context span{color:var(--gold,#c9a84c);font-weight:700}
@keyframes a3m-pulse{0%,100%{box-shadow:0 6px 24px rgba(0,0,0,.4),0 0 0 0 rgba(201,168,76,.5)}50%{box-shadow:0 6px 24px rgba(0,0,0,.4),0 0 0 12px rgba(201,168,76,0)}}
@keyframes a3m-dot{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-5px);opacity:1}}
@keyframes a3m-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes a3m-blink{0%,100%{opacity:1}50%{opacity:.3}}
@media(max-width:480px){#a3m-bot-chat{width:calc(100vw - 28px);right:-8px;max-height:540px}#a3m-bot-wrap{right:14px;bottom:14px}.a3m-messages{max-height:300px}}
    `;
    document.head.appendChild(s);
  }

  // ── Build HTML ────────────────────────────────────────────────
  function buildHTML() {
    if(document.getElementById("a3m-bot-wrap"))return;
    const src=resolveRobotSrc();
    const modeLabel=settings.mode==="direct"?"🟢 AI مباشر":settings.mode==="proxy"?"🟡 Proxy AI":(settings.mode==="auto"&&(settings.apiKey||settings.proxyUrl))?"🟢 AI":"🔵 محلي";
    const wrap=document.createElement("div"); wrap.id="a3m-bot-wrap";
    wrap.innerHTML=`
      <div id="a3m-bot-tooltip">👋 أهلاً! أنا A3M Bot — اضغط لتتحدث معي 🎨</div>
      <div id="a3m-bot-chat" role="dialog" aria-modal="true">
        <div id="a3m-history-modal">
          <div class="a3m-hist-header"><span class="a3m-hist-title">📂 المحادثات المحفوظة</span><button class="a3m-hbtn" id="a3m-hist-close">✕</button></div>
          <div id="a3m-history-panel"></div>
        </div>
        <div class="a3m-chat-header">
          <div class="a3m-chat-avatar"><img src="${src}" alt="${BOT_NAME}" onerror="this.style.display='none';this.parentElement.textContent='${FALLBACK_EMOJI}'"></div>
          <div class="a3m-chat-info"><div class="a3m-chat-name">${BOT_NAME} 🤖</div><div class="a3m-chat-status">متاح الآن</div></div>
          <span class="a3m-mode-badge ${settings.mode!=="local"?"live":""}">${modeLabel}</span>
          <div class="a3m-header-actions">
            <button class="a3m-hbtn" id="a3m-hist-btn" title="المحادثات">📂</button>
            <button class="a3m-hbtn" id="a3m-clear-btn" title="محادثة جديدة">🗑</button>
            <button class="a3m-hbtn" id="a3m-close-btn" title="إغلاق">✕</button>
          </div>
        </div>
        <div class="a3m-messages" id="a3m-msgs" role="log" aria-live="polite"></div>
        <div class="a3m-suggestions" id="a3m-sugs"></div>
        <div class="a3m-input-area">
          <input class="a3m-input" id="a3m-input" placeholder="اكتب سؤالك هنا…" autocomplete="off" maxlength="600"/>
          <button class="a3m-send-btn" id="a3m-send" type="button">➤</button>
        </div>
      </div>
      <button id="a3m-bot-trigger" type="button" aria-label="فتح A3M Bot">
        <div id="a3m-bot-badge">1</div>
        <img src="${src}" alt="${BOT_NAME}" onerror="this.remove();document.getElementById('a3m-bot-trigger').insertAdjacentHTML('beforeend','<span class=a3m-fb>${FALLBACK_EMOJI}</span>')">
      </button>`;
    document.body.appendChild(wrap);

    // ✅ FIX #1 — addEventListener فقط، لا onclick في HTML
    const $=id=>document.getElementById(id);
    $("a3m-bot-trigger").addEventListener("click",toggleChat);
    $("a3m-close-btn").addEventListener("click",toggleChat);
    $("a3m-clear-btn").addEventListener("click",clearChat);
    $("a3m-hist-btn").addEventListener("click",openHistory);
    $("a3m-hist-close").addEventListener("click",closeHistory);
    $("a3m-send").addEventListener("click",sendMessage);
    $("a3m-bot-tooltip").addEventListener("click",toggleChat);
    $("a3m-input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});

    buildDesignContextBadge();
    scheduleTooltip(); // ✅ FIX #3
    detectDesignStudio();
  }

  // ✅ FIX #3
  function scheduleTooltip() {
    setTimeout(()=>{
      if(state.isOpen)return;
      const tt=document.getElementById("a3m-bot-tooltip");
      if(tt){tt.style.display="block";setTimeout(()=>{if(!state.isOpen)tt.style.display="none";},5000);}
    },4500);
  }

  function buildDesignContextBadge(){if(document.getElementById("a3m-design-context"))return;const b=document.createElement("div");b.id="a3m-design-context";b.innerHTML=`🧠 وضع التصميم: <span>جاهز</span>`;b.addEventListener("click",openStudio);document.body.appendChild(b);}
  function updateDesignContextBadge(t){const sp=document.querySelector("#a3m-design-context span");if(sp)sp.textContent=t||(window.A3MDesignerAI?"جاهز":"بدون الاستوديو");}

  function toggleChat() {
    state.isOpen=!state.isOpen;
    const chat=document.getElementById("a3m-bot-chat"),tt=document.getElementById("a3m-bot-tooltip"),badge=document.getElementById("a3m-bot-badge");
    if(state.isOpen){chat?.classList.add("open");if(tt)tt.style.display="none";if(badge)badge.style.display="none";if(!state.hasGreeted)greetUser();setTimeout(scrollToBottom,150);setTimeout(()=>document.getElementById("a3m-input")?.focus(),320);}
    else{saveCurrentChat();chat?.classList.remove("open");closeHistory();}
  }

  function clearChat(){saveCurrentChat();state.history=[];state.hasGreeted=false;state.lastSpec=null;const m=document.getElementById("a3m-msgs"),s=document.getElementById("a3m-sugs");if(m)m.innerHTML="";if(s)s.innerHTML="";setTimeout(greetUser,180);}

  function greetUser(){
    state.hasGreeted=true;
    setTimeout(()=>{appendMessage("bot","👋 أهلاً! أنا **A3M Bot** — كيف أساعدك اليوم؟\n\n🛍️ المنتجات · 🎨 التصميم · 💰 الأسعار · 🖨️ الطباعة");showSuggestions(null);},320);
  }

  // ✅ NEW 4
  function showSuggestions(ctxKey){
    const c=document.getElementById("a3m-sugs");if(!c)return;
    const list=(ctxKey&&CTX_SUGS[ctxKey])?CTX_SUGS[ctxKey]:(PAGE_SUGS[detectPage()]||PAGE_SUGS.home);
    c.innerHTML="";
    for(const s of list){const btn=document.createElement("button");btn.className="a3m-sug-btn";btn.textContent=s.label;btn.onclick=()=>sendText(s.text);c.appendChild(btn);}
  }

  function scrollToBottom(){const m=document.getElementById("a3m-msgs");if(m)m.scrollTop=m.scrollHeight;}

  function appendMessage(role,content){
    const msgs=document.getElementById("a3m-msgs");if(!msgs)return null;
    const w=document.createElement("div");w.className=`a3m-msg ${role}`;
    if(role==="bot")w.appendChild(makeAvatar());
    const b=document.createElement("div");b.className="a3m-bubble";b.innerHTML=parseMarkup(String(content||""));w.appendChild(b);msgs.appendChild(w);scrollToBottom();
    return{wrapper:w,bubble:b};
  }

  function parseMarkup(t){return escapeHTML(t).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\n/g,"<br>");}

  function showTyping(){
    const msgs=document.getElementById("a3m-msgs");if(!msgs||document.getElementById("a3m-typing"))return;
    const w=document.createElement("div");w.className="a3m-msg bot";w.id="a3m-typing";w.appendChild(makeAvatar());
    const b=document.createElement("div");b.className="a3m-bubble";
    b.innerHTML=`<div style="display:flex;gap:5px;padding:3px 0"><span style="width:8px;height:8px;border-radius:50%;background:var(--txt3,#9ca3af);display:inline-block;animation:a3m-dot 1.2s infinite 0s"></span><span style="width:8px;height:8px;border-radius:50%;background:var(--txt3,#9ca3af);display:inline-block;animation:a3m-dot 1.2s infinite .2s"></span><span style="width:8px;height:8px;border-radius:50%;background:var(--txt3,#9ca3af);display:inline-block;animation:a3m-dot 1.2s infinite .4s"></span></div>`;
    w.appendChild(b);msgs.appendChild(w);scrollToBottom();
  }
  function removeTyping(){document.getElementById("a3m-typing")?.remove();}

  // ✅ NEW 5 — Streaming
  function streamText(bubble,fullText,onDone){
    const words=fullText.split(/(\s+)/);let i=0,displayed="";
    bubble.innerHTML='<span class="a3m-cursor"></span>';
    function step(){
      if(i>=words.length){bubble.innerHTML=parseMarkup(displayed);if(onDone)onDone();return;}
      displayed+=words[i++];
      bubble.innerHTML=parseMarkup(displayed)+'<span class="a3m-cursor"></span>';
      scrollToBottom();
      setTimeout(step,20+Math.random()*20);
    }
    step();
  }

  function sendMessage(){const input=document.getElementById("a3m-input");if(!input)return;const text=input.value.trim();if(!text||state.isTyping)return;input.value="";sendText(text);}

  async function sendText(text){
    if(!text?.trim()||state.isTyping)return;
    const sugs=document.getElementById("a3m-sugs");if(sugs)sugs.innerHTML="";
    appendMessage("user",text);state.history.push({role:"user",content:text});state.isTyping=true;
    const sendBtn=document.getElementById("a3m-send"),input=document.getElementById("a3m-input");
    if(sendBtn)sendBtn.disabled=true;if(input)input.disabled=true;
    showTyping();

    let reply="";
    if(settings.mode==="direct"&&settings.apiKey){try{reply=await callDirectAI(text);}catch(e){console.warn("Direct AI:",e.message);}}
    else if(settings.mode==="proxy"&&settings.proxyUrl){try{reply=await callProxyAI(text);}catch(e){console.warn("Proxy AI:",e.message);}}
    else if(settings.mode==="auto"){
      if(settings.apiKey)try{reply=await callDirectAI(text);}catch(e){}
      if(!reply&&settings.proxyUrl)try{reply=await callProxyAI(text);}catch(e){}
    }
    if(!reply){const l=localSmartReply(text);reply=l.text;if(l.designSpec)reply+=`\n[GENERATE_DESIGN:${JSON.stringify(l.designSpec)}]`;}

    const cleanReply=String(reply).replace(/\n?\[GENERATE_DESIGN:[\s\S]*?\]\s*$/,"").trim();
    removeTyping();state.history.push({role:"assistant",content:reply});

    const msgs=document.getElementById("a3m-msgs");
    const w=document.createElement("div");w.className="a3m-msg bot";w.appendChild(makeAvatar());
    const bubble=document.createElement("div");bubble.className="a3m-bubble";w.appendChild(bubble);msgs?.appendChild(w);scrollToBottom();

    const ctxKey=detectCtxKey(cleanReply+" "+reply);
    streamText(bubble,cleanReply,()=>{
      const spec=parseAndApplyDesign(reply);if(spec)bubble.appendChild(buildDesignCard(spec));
      state.isTyping=false;if(sendBtn)sendBtn.disabled=false;if(input){input.disabled=false;setTimeout(()=>input.focus(),80);}
      setTimeout(()=>showSuggestions(ctxKey),400); // ✅ NEW 4
    });
  }

  async function callDirectAI(userText){
    const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),settings.timeoutMs);
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":settings.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:settings.model,system:SYSTEM_PROMPT,max_tokens:900,messages:[...state.history.slice(-12).filter(m=>m.role!=="system"),{role:"user",content:userText}]}),signal:ctrl.signal}).finally(()=>clearTimeout(t));
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
    const d=await res.json();const txt=d.content?.find(b=>b.type==="text")?.text;if(!txt)throw new Error("Empty");return txt;
  }

  async function callProxyAI(userText){
    const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),settings.timeoutMs);
    const res=await fetch(settings.proxyUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:settings.model,system:SYSTEM_PROMPT,max_tokens:900,messages:[...state.history.slice(-12).filter(m=>m.role!=="system"),{role:"user",content:userText}]}),signal:ctrl.signal}).finally(()=>clearTimeout(t));
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const d=await res.json();const txt=extractReply(d);if(!txt)throw new Error("Empty proxy");return txt;
  }

  function extractReply(d){if(!d)return"";if(typeof d==="string")return d;if(d.reply)return String(d.reply);if(d.output_text)return String(d.output_text);if(Array.isArray(d.content)){const f=d.content.find(x=>typeof x?.text==="string");if(f)return f.text;}if(Array.isArray(d.choices)){const t=d.choices[0]?.message?.content||d.choices[0]?.text;if(typeof t==="string")return t;}return"";}

  function parseAndApplyDesign(reply){const m=String(reply||"").match(/\[GENERATE_DESIGN:({[\s\S]*?})\]/);if(!m)return null;try{const spec=JSON.parse(m[1]);state.lastSpec=spec;if(window.A3MDesignerAI?.applyDesignSpec){window.A3MDesignerAI.applyDesignSpec(spec,{source:"chat"});updateDesignContextBadge("تم إنشاء تصميم ✓");}return spec;}catch{return null;}}

  function buildDesignCard(spec){
    const card=document.createElement("div");card.className="a3m-design-card";
    const cv=document.createElement("div");cv.className="a3m-design-canvas";cv.style.cssText=`background:linear-gradient(135deg,${spec.bg||"#0b0f19"},${spec.color||"#2563eb"}33);color:${spec.textColor||"#fff"}`;
    const ti=document.createElement("div");ti.className="a3m-design-title";ti.textContent=spec.title||"A3M Design";
    const su=document.createElement("div");su.className="a3m-design-sub";su.textContent=spec.subtitle||"اقتراح من A3M Bot";
    cv.append(ti,su);
    const ac=document.createElement("div");ac.className="a3m-design-actions";
    const b1=document.createElement("button");b1.className="a3m-design-btn primary";b1.textContent="🎨 افتح الاستوديو";b1.onclick=openStudio;
    const b2=document.createElement("button");b2.className="a3m-design-btn gold";b2.textContent="✨ طبّق التصميم";
    b2.onclick=()=>{if(window.A3MDesignerAI?.applyDesignSpec){window.A3MDesignerAI.applyDesignSpec(spec,{source:"chat"});state.lastSpec=spec;updateDesignContextBadge("تم التطبيق ✓");b2.textContent="✅ تم التطبيق";b2.disabled=true;}else openStudio();};
    ac.append(b1,b2);card.append(cv,ac);return card;
  }

  function openStudio(){if(state.isOpen)toggleChat();if(typeof window.openModePicker==="function"){window.openModePicker();return;}if(typeof window.openDesigner==="function"){window.openDesigner("scratch");return;}window.location.hash="#products";}
  function detectDesignStudio(){const obs=new MutationObserver(()=>{const vis=document.getElementById("designerModal")?.classList.contains("open");const b=document.getElementById("a3m-design-context");if(b)b.style.display=vis?"block":"none";});obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});}

  function localSmartReply(text){
    const n=normalizeAr(text);
    const wd=/صمم|تصميم|logo|شعار|brand|كرت|business.?card|poster|ملصق|تيشرت|tshirt|hoodie|هودي|mug|كوب|sticker|banner/i.test(n);
    if(/(السلام|مرحبا|اهلا|سلام|bonjour|salut|hello|hi\b|hey\b)/i.test(n))return{text:"أهلاً وسهلاً 👋 كيف أساعدك اليوم؟\n\n• 🛍️ المنتجات\n• 🎨 التصميم\n• 💰 الأسعار\n• 🖨️ الطباعة"};
    if(/(ماذا تبيع|المنتجات|products|what.*sell|catalog|vous vendez)/i.test(n))return{text:"🛍️ منتجاتنا:\n\n• **تيشرتات** — قطن عالي\n• **هوديات** — مريحة وأنيقة\n• **أكواب** — سيراميك فاخر\n• **قبعات** — Cap & Bucket\n• **حقائب Tote**\n• **بطاقات أعمال** — ورق فاخر\n• **ملصقات** — مقاومة للماء\n• **طباعة ورقية** — A3، A4، A5\n• **نقش ليزر** — معادن وخشب"};
    if(/(الاسعار|السعر|price|prices|كم يكلف|combien|tarif|ثمن)/i.test(n))return{text:"💰 أسعار تقريبية:\n\n• تيشرت: **1200–2500 دج**\n• هودي: **2800–4500 دج**\n• كوب: **800–1500 دج**\n• قبعة: **1000–2000 دج**\n• بطاقات (100ق): **2000–4000 دج**\n• طباعة A4: **100–300 دج**\n\n✦ خصم **20%** للطلبات فوق 5000 دج"};
    if(/(طباعة|printing|dtg|uv|حراري|تطريز|ليزر|فينيل|offset|silk)/i.test(n))return{text:"🖨️ أنواع الطباعة:\n\n• **حرارية** — للأقمشة\n• **تطريز** — قبعات وبولو\n• **DTG** — رقمية مباشرة\n• **UV** — أسطح صلبة\n• **ليزر** — معادن وخشب\n• **فينيل** — دقة عالية\n• **سيلك سكرين** — للكميات\n• **أوفست** — ورق وكروت"};
    if(/(توصيل|delivery|livraison|شحن|wilaya|ولاية)/i.test(n))return{text:"🚚 التوصيل لجميع ولايات الجزائر خلال **3–7 أيام**.\n• الدفع عند الاستلام متاح\n• تأكيد الطلب خلال 24 ساعة"};
    if(/(خصم|discount|promo|code|كود|تخفيض)/i.test(n))return{text:"✦ كودات الخصم:\n• **A3M10** — خصم 10%\n• **STUDENT** — خصم 15% للطلاب\n• **WELCOME** — خصم 25% للمشتركين الجدد\n• **A3M20** — خصم 20%"};
    if(/(تواصل|contact|whatsapp|واتساب|هاتف|phone)/i.test(n))return{text:"📞 تواصل معنا:\n• **WhatsApp**: wa.me/213555000000\n• **البريد**: contact@a3mprint.dz\n• الأحد–الجمعة، 8ص–6م"};
    if(wd){const spec=buildDesignSpec(text);return{text:spec._reply||"أكيد! جهزت لك تصميماً أولياً 🎨\nاضغط **طبّق التصميم** أو **افتح الاستوديو**.",designSpec:spec};}
    if(/(طلب|order|اطلب|checkout|commander)/i.test(n))return{text:"✅ لإتمام طلبك:\n1. أضف المنتجات للسلة\n2. اضغط **إتمام الطلب**\n3. أدخل بياناتك\n4. سنتواصل معك خلال 24 ساعة"};
    if(/(استوديو|studio|designer|canvas)/i.test(n))return{text:"🎨 استوديو A3M:\n• نصوص بخطوط احترافية\n• رفع صورك الخاصة\n• أشكال وألوان\n• تحميل PNG\n\nاضغط **ابدأ التصميم** في الشريط العلوي!"};
    return{text:"أقدر أساعدك في:\n• 🛍️ **المنتجات**\n• 💰 **الأسعار**\n• 🎨 **التصميم**\n• 🖨️ **الطباعة**\n• 🚚 **التوصيل**\n\nفقط اكتب سؤالك ✨"};
  }

  function pickColors(t){const n=normalizeAr(t);if(/(احمر|red)/.test(n))return{fg:"#fff",accent:"#ef4444",bg:"#2a0f12"};if(/(اخضر|green)/.test(n))return{fg:"#fff",accent:"#22c55e",bg:"#0f2416"};if(/(بنفسجي|purple|موف)/.test(n))return{fg:"#fff",accent:"#7c3aed",bg:"#140f24"};if(/(ذهبي|gold)/.test(n))return{fg:"#111",accent:"#c9a84c",bg:"#f5efe0"};if(/(اسود|black|dark)/.test(n))return{fg:"#fff",accent:"#374151",bg:"#0b0f19"};if(/(وردي|pink)/.test(n))return{fg:"#fff",accent:"#ec4899",bg:"#26101f"};return{fg:"#fff",accent:"#2563eb",bg:"#0b0f19"};}

  function buildDesignSpec(prompt){
    const n=normalizeAr(prompt),c=pickColors(prompt);
    const isLogo=/(logo|شعار|براند|brand)/.test(n),isCard=/(كرت|business.?card|card)/.test(n),isPoster=/(poster|ملصق|banner|بوستر)/.test(n),isTshirt=/(تيشرت|tshirt|shirt|هودي|hoodie)/.test(n),isMug=/(كوب|mug)/.test(n);
    const type=isLogo?"logo":isCard?"card":isPoster?"poster":isTshirt?"tshirt":isMug?"mug":"text";
    const titles={logo:"YOUR BRAND",card:"BUSINESS CARD",poster:"SPECIAL DROP",tshirt:"A3M STYLE",mug:"COFFEE TIME",text:"A3M DESIGN"};
    const subs={logo:"Premium Print Studio",card:"Clean & Modern",poster:"Eye-catching design",tshirt:"Custom Apparel",mug:"For coffee lovers",text:"Ready for print"};
    const replies={logo:"أكيد! مقترح شعار أولي.\n\n",card:"تصور كرت أعمال أنيق.\n\n",poster:"بوستر جذاب جاهز.\n\n"};
    return{type,color:c.accent,bg:c.bg,textColor:c.fg,title:titles[type]||"A3M DESIGN",subtitle:subs[type]||"Ready for print",_reply:replies[type]||"أكيد! جهزت لك تصميماً 🎨\n\n"};
  }

  function init(){
    ensureStyle();buildHTML();
    window.A3MBot={toggleChat,clearChat,sendMessage,sendText,openStudio,openHistory,closeHistory,
      setMode(m){settings.mode=m;localStorage.setItem("a3m_ai_mode",m);console.log("A3MBot mode:",m);},
      setApiKey(k){settings.apiKey=k;localStorage.setItem("a3m_ai_key",k);console.log("A3MBot: API key set");},
      setProxyUrl(u){settings.proxyUrl=u;localStorage.setItem("a3m_ai_proxy_url",u);},
      setModel(m){settings.model=m;localStorage.setItem("a3m_ai_model",m);},
      getLastDesign(){return state.lastSpec;},
    };
    console.log(`✅ A3M Bot v3.0 — Mode: ${settings.mode}`);
  }

  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
