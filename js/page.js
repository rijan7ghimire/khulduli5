/* ------------------------------------------------------------------
   Shared script for the plain pages (privacy.html, terms.html, 404.html).
   The theme and language switches work as on the home page and use the
   same saved choices, so a visitor keeps them from page to page.
   English is in the tag, Nepali in data-ne. The email comes from js/config.js,
   or from the backend's copy of the content when one is set (js/backend.js).
------------------------------------------------------------------- */
(function () {
  "use strict";
  var KB = window.KHULDULI_BACKEND || null;
  var BASE = window.KHULDULI || {};
  var C = KB && BASE.shorts ? KB.initial(BASE) : BASE;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var lang = "en";

  function fillEmail() {
    if (!C.email) return;
    $$(".js-email").forEach(function (a) { a.textContent = C.email; a.href = "mailto:" + C.email; });
  }

  /* ---------- theme ---------- */
  var themeBtn = $("#theme"), themeMeta = $('meta[name="theme-color"]');
  function applyTheme(t) {
    root.dataset.theme = t;
    if (themeBtn) themeBtn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
    if (themeMeta) themeMeta.setAttribute("content", t === "light" ? "#f4ede1" : "#070504");
  }

  /* ---------- language ---------- */
  function applyLang() {
    root.dataset.lang = lang;
    root.lang = lang === "ne" ? "ne" : "en";
    $$("[data-ne]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML.trim();
      el.innerHTML = lang === "ne" ? el.dataset.ne : el.dataset.en;
    });
    if (themeBtn) themeBtn.title = lang === "ne" ? "उज्यालो थिम" : "Light theme";
    fillEmail();
  }

  /* ---------- nav background once the page moves ---------- */
  var nav = $("#nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- boot ---------- */
  try { var saved = localStorage.getItem("khulduli-lang"); if (saved === "ne" || saved === "en") lang = saved; } catch (e) {}
  applyLang();
  onScroll();
  applyTheme(root.dataset.theme === "light" ? "light" : "dark");
  var langBtn = $("#lang");
  if (langBtn) langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "ne" : "en";
    try { localStorage.setItem("khulduli-lang", lang); } catch (e) {}
    applyLang();
  });
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var t = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("khulduli-theme", t); } catch (e) {}
    applyTheme(t);
  });

  /* ---------- backend: a page view, quote buttons, and the current email ---------- */
  if (KB) {
    KB.track("page_view");
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href$="#contact"]') : null;
      if (a) KB.track("quote_click", { detail: a.closest(".nav") ? "nav" : "page" });
    });
    if (BASE.shorts) KB.refresh(BASE, function (fresh) { C = fresh; fillEmail(); });
  }
})();
