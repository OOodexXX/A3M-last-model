// main.js — A3M Print
import "./firebase.js";
import "./data.js";
import "./app.js";
import "./auth.js";
import "./cart.js";
import "./designer.js";

window._a3mModulesReady = true;
window.dispatchEvent(new Event("a3m-ready"));
console.log("\u2746 A3M modules loaded");
