// ============================================================
// main.js  –  A3M Print  –  نقطة الدخول الرئيسية
// ترتيب الاستيراد:
//   1. firebase  → يهيئ app + db + auth
//   2. data      → يملأ window.PD / window.T ...
//   3. app       → ثيم + لغة + سايدبار
//   4. auth      → حسابات (يحتاج firebase)
//   5. cart      → سلة + عرض منتجات
//   6. checkout  → إتمام الطلب (يُحمّل فقط في checkout.html)
//   7. designer  → canvas
// ============================================================

import "./firebase.js";
import "./data.js";
import "./app.js";
import "./auth.js";
import "./cart.js";
import "./designer.js";

console.log("✦ A3M Print — All modules loaded");
