/* ==========================================================================
   Makovki - interactions
   - loads shared header/footer partials (single source of truth)
   - sticky header shadow, mobile nav, active link
   - count-up stats, reveal-on-scroll
   - hero point-cloud canvas (evokes the 3D laser scan)
   ========================================================================== */
/* ---- Accessibility prefs: apply saved state to <html> ASAP (before partials
   load) so choices persist across pages without a flash. Wiring happens later
   in initA11y() once the widget markup (footer partial) is in the DOM. ---- */
(function () {
  "use strict";
  var TOGGLES = ["contrast", "grayscale", "links", "readable", "spacing", "noanim"];
  try {
    var s = JSON.parse(localStorage.getItem("mk-a11y") || "{}");
    var root = document.documentElement;
    TOGGLES.forEach(function (k) { if (s[k]) root.classList.add("a11y-" + k); });
    var step = parseInt(s.font, 10) || 0;
    if (step) root.style.fontSize = (100 + step * 10) + "%";
  } catch (e) { /* localStorage unavailable - ignore */ }
})();

(function () {
  "use strict";

  /* ===========================================================================
     מספרים רצים - גדילה אוטומטית שבועית (ללא עדכון ידני)
     מרגע העלייה לאוויר: +30 פרויקטים ו-+10 לקוחות בכל שבוע שעובר, לבד.
     >>> בעת העלייה לאוויר: עדכן את MK_GOLIVE_DATE לתאריך העלייה בפועל (YYYY-MM-DD).
     עד לתאריך הזה המספרים מוצגים כבסיס (data-count) ולא גדלים.
     ההגדלה לכל מספר נקבעת ב-data-weekly על ה-<span> ב-HTML.
     =========================================================================== */
  var MK_GOLIVE_DATE = "2026-07-06"; // TODO: לעדכן לתאריך העלייה לאוויר בפועל
  function mkWeeksSinceGolive() {
    var since = Date.parse(MK_GOLIVE_DATE);
    if (isNaN(since)) return 0;
    var weeks = Math.floor((Date.now() - since) / 604800000); // 7*24*60*60*1000
    return weeks > 0 ? weeks : 0;
  }

  /* ---- Load shared partials, then init ---- */
  function loadIncludes() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-include]"));
    if (!nodes.length) { init(); return; }
    var pending = nodes.length;
    nodes.forEach(function (node) {
      var name = node.getAttribute("data-include");
      fetch("partials/" + name + ".html")
        .then(function (r) { return r.text(); })
        .then(function (html) { node.outerHTML = html; })
        .catch(function () { /* keep going */ })
        .then(function () { if (--pending === 0) init(); });
    });
  }

  function init() {
    initHeader();
    initNav();
    initActiveLink();
    initCanvases();
    initObservers();
    initReviewSlider();
    initVideoTestimonials();
    initVizGallery();
    initFilter();
    initAvailability();
    initMobileSliders();
    initHeroLift();
    initA11y();
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---- Google reviews slider (RTL-aware, auto-running, side arrows) ---- */
  function initReviewSlider() {
    var slider = document.querySelector("[data-reviews]");
    if (!slider) return;
    var viewport = slider.querySelector(".reviews-viewport");
    var track = slider.querySelector(".reviews-track");
    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;
    var prev = slider.querySelector(".rev-prev");
    var next = slider.querySelector(".rev-next");
    var isRTL = getComputedStyle(slider).direction === "rtl";
    var idx = 0, timer = null;

    function step() {
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 22;
      return cards[0].getBoundingClientRect().width + gap;
    }
    function perView() { return Math.max(1, Math.round(viewport.clientWidth / step())); }
    function maxIdx() { return Math.max(0, cards.length - perView()); }

    function render() {
      var mi = maxIdx();
      if (idx > mi) idx = 0;
      if (idx < 0) idx = mi;
      var slide = mi > 0;
      track.style.justifyContent = slide ? "flex-start" : "center";
      var offset = slide ? step() * idx : 0;
      track.style.transform = "translateX(" + (isRTL ? offset : -offset) + "px)";
      if (prev) prev.style.display = slide ? "grid" : "none";
      if (next) next.style.display = slide ? "grid" : "none";
    }
    function advance() {
      var mi = maxIdx();
      if (mi <= 0) return;
      idx = (idx + 1) % (mi + 1);
      render();
    }
    function play() {
      clearInterval(timer);
      if (maxIdx() <= 0) return;
      timer = setInterval(advance, 1500);
    }
    function go(d) {
      var mi = maxIdx();
      if (mi <= 0) return;
      idx = (idx + d + (mi + 1)) % (mi + 1);
      render(); play();
    }

    if (next) next.addEventListener("click", function () { go(1); });
    if (prev) prev.addEventListener("click", function () { go(-1); });
    slider.addEventListener("mouseenter", function () { clearInterval(timer); });
    slider.addEventListener("mouseleave", play);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(render, 160); });
    render(); play();
  }

  /* ---- Video testimonials: RTL-aware carousel + click-to-play lightbox ---- */
  function initVideoTestimonials() {
    var slider = document.querySelector("[data-vtest]");
    if (!slider) return;
    var viewport = slider.querySelector(".vtest-viewport");
    var track = slider.querySelector(".vtest-track");
    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;
    var prev = slider.querySelector(".vt-prev");
    var next = slider.querySelector(".vt-next");
    var dotsWrap = slider.querySelector("[data-vtest-dots]");
    var isRTL = getComputedStyle(slider).direction === "rtl";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0, timer = null, dots = [];

    function step() {
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 24;
      return cards[0].getBoundingClientRect().width + gap;
    }
    function perView() { return Math.max(1, Math.round(viewport.clientWidth / step())); }
    function maxIdx() { return Math.max(0, cards.length - perView()); }

    function buildDots() {
      if (!dotsWrap) return;
      var n = maxIdx() + 1;
      if (dots.length === n) return;
      dotsWrap.innerHTML = "";
      dots = [];
      for (var i = 0; i < n; i++) {
        (function (j) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "vt-dot" + (j === idx ? " is-active" : "");
          b.setAttribute("aria-label", "מעבר להמלצה " + (j + 1));
          b.addEventListener("click", function () { idx = j; render(); play(); });
          dotsWrap.appendChild(b);
          dots.push(b);
        })(i);
      }
    }
    function syncDots() { dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); }); }

    function render() {
      var mi = maxIdx();
      if (idx > mi) idx = 0;
      if (idx < 0) idx = mi;
      var slide = mi > 0;
      track.style.justifyContent = slide ? "flex-start" : "center";
      var offset = slide ? step() * idx : 0;
      track.style.transform = "translateX(" + (isRTL ? offset : -offset) + "px)";
      if (prev) prev.style.display = slide ? "grid" : "none";
      if (next) next.style.display = slide ? "grid" : "none";
      buildDots();
      if (dotsWrap) dotsWrap.style.display = slide ? "flex" : "none";
      syncDots();
    }
    function advance() { var mi = maxIdx(); if (mi <= 0) return; idx = (idx + 1) % (mi + 1); render(); }
    function play() {
      clearInterval(timer);
      if (reduce || userTook || maxIdx() <= 0) return;
      if (lb && lb.classList.contains("is-open")) return;
      timer = setInterval(advance, 5200);
    }
    function stop() { clearInterval(timer); }
    function go(d) { var mi = maxIdx(); if (mi <= 0) return; idx = (idx + d + (mi + 1)) % (mi + 1); render(); play(); }

    if (next) next.addEventListener("click", function () { go(1); });
    if (prev) prev.addEventListener("click", function () { go(-1); });
    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", play);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { dots = []; render(); }, 160); });

    /* touch: swipe between cards + stop autoplay once the user takes control */
    var userTook = false, tx = 0, ty = 0;
    viewport.addEventListener("touchstart", function (e) {
      userTook = true; stop();
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    viewport.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    /* ---- lightbox (built lazily, shared across cards) ---- */
    var lb = null;
    function ensureLightbox() {
      if (lb) return lb;
      lb = document.createElement("div");
      lb.className = "vt-lightbox";
      lb.innerHTML =
        '<div class="vt-lightbox__bd" data-vt-dismiss></div>' +
        '<div class="vt-lightbox__stage">' +
          '<button class="vt-close" type="button" aria-label="סגירת הסרטון" data-vt-dismiss>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
          '<div class="vt-frame"></div>' +
        '</div>';
      document.body.appendChild(lb);
      lb.addEventListener("click", function (e) { if (e.target.closest("[data-vt-dismiss]")) closeLightbox(); });
      return lb;
    }
    function openLightbox(id, orient) {
      if (!id) return;
      ensureLightbox();
      stop();
      lb.setAttribute("data-orient", orient === "portrait" ? "portrait" : "landscape");
      var src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      lb.querySelector(".vt-frame").innerHTML =
        '<iframe src="' + src + '" title="המלצת לקוח - מקובקי" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>';
      lb.classList.add("is-open");
      document.documentElement.style.overflow = "hidden";
    }
    function closeLightbox() {
      if (!lb || !lb.classList.contains("is-open")) return;
      lb.classList.remove("is-open");
      lb.querySelector(".vt-frame").innerHTML = "";
      document.documentElement.style.overflow = "";
      play();
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else play();
    });

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        openLightbox(card.getAttribute("data-yt"), card.getAttribute("data-orient"));
      });
    });

    render(); play();
  }

  /* ---- Visualization gallery: crossfades one image every few seconds ---- */
  function initVizGallery() {
    var box = document.querySelector("[data-viz-gallery]");
    if (!box) return;
    var slides = Array.prototype.slice.call(box.querySelectorAll(".viz-slide"));
    if (slides.length < 2) return;
    var dotsWrap = box.querySelector(".viz-dots");
    var dots = [];
    var idx = 0, timer = null;
    var INTERVAL = 4000; // מתחלף כל 4 שניות

    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = document.createElement("button");
        b.className = "viz-dot" + (i === 0 ? " is-active" : "");
        b.type = "button";
        b.setAttribute("aria-label", "הדמיה " + (i + 1));
        b.addEventListener("click", function () { show(i); play(); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }

    function show(n) {
      slides[idx].classList.remove("is-active");
      if (dots[idx]) dots[idx].classList.remove("is-active");
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add("is-active");
      if (dots[idx]) dots[idx].classList.add("is-active");
    }
    function advance() { show(idx + 1); }
    function play() {
      clearInterval(timer);
      timer = setInterval(advance, INTERVAL);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    box.addEventListener("mouseenter", function () { clearInterval(timer); });
    box.addEventListener("mouseleave", play);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearInterval(timer); else play();
    });
    play();
  }

  /* ---- Sticky header shadow ---- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Knowledge-center post filter (by topic) + pagination ---- */
  function initFilter() {
    var grid = document.querySelector("[data-post-grid]");
    if (!grid) return;
    var bar = document.querySelector("[data-filter]");
    var pager = document.querySelector("[data-pager]");
    var empty = document.querySelector("[data-post-empty]");
    var btns = bar ? Array.prototype.slice.call(bar.querySelectorAll(".pf-btn")) : [];
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".post-card"));
    var PAGE_SIZE = 18;
    var cat = "all";
    var page = 1;

    var ARROW_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var ARROW_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';

    function matching() {
      return cards.filter(function (c) {
        return cat === "all" || c.getAttribute("data-cat") === cat;
      });
    }

    function render() {
      var list = matching();
      var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      if (page > pages) page = pages;
      var start = (page - 1) * PAGE_SIZE;
      var slice = list.slice(start, start + PAGE_SIZE);
      cards.forEach(function (c) { c.classList.add("is-hidden"); });
      slice.forEach(function (c) { c.classList.remove("is-hidden"); c.classList.add("in"); });
      if (empty) empty.hidden = list.length !== 0;
      renderPager(pages);
    }

    function renderPager(pages) {
      if (!pager) return;
      if (pages <= 1) { pager.innerHTML = ""; pager.hidden = true; return; }
      pager.hidden = false;
      var html = '<button class="pg-btn pg-arrow" data-page="prev"' + (page === 1 ? " disabled" : "") + ' aria-label="הקודם">' + ARROW_PREV + "</button>";
      for (var i = 1; i <= pages; i++) {
        html += '<button class="pg-btn pg-num' + (i === page ? " is-active" : "") + '" data-page="' + i + '">' + i + "</button>";
      }
      html += '<button class="pg-btn pg-arrow" data-page="next"' + (page === pages ? " disabled" : "") + ' aria-label="הבא">' + ARROW_NEXT + "</button>";
      pager.innerHTML = html;
    }

    function scrollToTop() {
      var anchor = bar || grid;
      var header = document.querySelector(".site-header");
      var offset = (header ? header.offsetHeight : 0) + 24;
      var y = anchor.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }

    if (bar) bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".pf-btn");
      if (!btn) return;
      cat = btn.getAttribute("data-cat");
      btns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      page = 1;
      render();
    });

    if (pager) pager.addEventListener("click", function (e) {
      var btn = e.target.closest(".pg-btn");
      if (!btn || btn.disabled) return;
      var pages = Math.max(1, Math.ceil(matching().length / PAGE_SIZE));
      var p = btn.getAttribute("data-page");
      if (p === "prev") page = Math.max(1, page - 1);
      else if (p === "next") page = Math.min(pages, page + 1);
      else page = parseInt(p, 10);
      render();
      scrollToTop();
    });

    render();
  }

  /* ---- Contact "available now" badge ----
     שעות מענה: ראשון-חמישי 08:00-19:00 (שעון ישראל).
     בתוך השעות: "זמינים למענה עכשיו" (ירוק + נקודה פועמת).
     מחוץ לשעות / שישי-שבת: הכיתוב מתחלף לזמן הפתיחה הקרוב הבא. */
  function initAvailability() {
    var el = document.querySelector(".contact-card__avail");
    if (!el) return;

    var OPEN = 8, CLOSE = 19;                 // 08:00 עד 19:00
    var DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    var CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

    function isWorkDay(d) { return d >= 0 && d <= 4; } // ראשון(0)-חמישי(4)

    // יום ושעה לפי שעון ישראל, בלי תלות באזור הזמן של הגולש
    function nowParts() {
      try {
        var f = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jerusalem", weekday: "short",
          hour: "2-digit", hour12: false
        }).formatToParts(new Date());
        var m = {};
        f.forEach(function (p) { m[p.type] = p.value; });
        var w = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return { day: w[m.weekday], hour: parseInt(m.hour, 10) % 24 };
      } catch (e) {
        var d = new Date(); // נפילה חזרה לשעון המקומי אם Intl לא זמין
        return { day: d.getDay(), hour: d.getHours() };
      }
    }

    function isAvailable(p) { return isWorkDay(p.day) && p.hour >= OPEN && p.hour < CLOSE; }

    // מוצא את יום הפתיחה הבא: מספר ימים קדימה + אינדקס היום
    function nextOpen(p) {
      if (isWorkDay(p.day) && p.hour < OPEN) return { ahead: 0, day: p.day };
      for (var i = 1; i <= 7; i++) {
        var d = (p.day + i) % 7;
        if (isWorkDay(d)) return { ahead: i, day: d };
      }
      return { ahead: 1, day: (p.day + 1) % 7 };
    }

    function whenText(n) {
      if (n.ahead === 0) return "היום";
      if (n.ahead === 1) return "מחר";
      return "ביום " + DAY_NAMES[n.day];
    }

    function render() {
      var p = nowParts();
      if (isAvailable(p)) {
        el.classList.remove("contact-card__avail--off");
        el.innerHTML = "<i></i>זמינים למענה עכשיו";
      } else {
        el.classList.add("contact-card__avail--off");
        el.innerHTML = CLOCK + "נחזור לזמינות בטלפון " + whenText(nextOpen(p)) +
          " ב-" + (OPEN < 10 ? "0" + OPEN : OPEN) + ":00";
      }
    }

    render();
    setInterval(render, 60000); // רענון אם העמוד נשאר פתוח מעבר לשעת המעבר
  }

  /* ---- Accessibility menu ----
     כפתור צף בפינה שמאלית-תחתונה שפותח תפריט התאמות נגישות.
     ההעדפות נשמרות ב-localStorage ומוחלות על <html> (מוחלות מוקדם ב-IIFE נפרד למעלה). */
  function initA11y() {
    var wrap = document.querySelector("[data-a11y]");
    if (!wrap) return;
    var root = document.documentElement;
    var fab = wrap.querySelector(".a11y__fab");
    var panel = wrap.querySelector(".a11y__panel");
    var closeBtn = wrap.querySelector(".a11y__close");
    var fontVal = wrap.querySelector("[data-a11y-fontval]");
    var TOGGLES = ["contrast", "grayscale", "links", "readable", "spacing", "noanim"];
    var FONT_MIN = -2, FONT_MAX = 6;

    function read() { try { return JSON.parse(localStorage.getItem("mk-a11y") || "{}"); } catch (e) { return {}; } }
    function save() { try { localStorage.setItem("mk-a11y", JSON.stringify(state)); } catch (e) {} }
    var state = read();

    function apply() {
      TOGGLES.forEach(function (k) { root.classList.toggle("a11y-" + k, !!state[k]); });
      var step = parseInt(state.font, 10) || 0;
      root.style.fontSize = step ? (100 + step * 10) + "%" : "";
      wrap.querySelectorAll("[data-a11y-toggle]").forEach(function (b) {
        b.setAttribute("aria-pressed", state[b.getAttribute("data-a11y-toggle")] ? "true" : "false");
      });
      if (fontVal) fontVal.textContent = (100 + step * 10) + "%";
    }

    var isOpen = false;
    function setOpen(o) {
      isOpen = o;
      panel.hidden = !o;
      fab.setAttribute("aria-expanded", o ? "true" : "false");
      if (o && closeBtn) closeBtn.focus();
    }
    fab.addEventListener("click", function () { setOpen(!isOpen); });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); fab.focus(); });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && isOpen) { setOpen(false); fab.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (isOpen && !wrap.contains(e.target)) setOpen(false);
    });

    wrap.querySelectorAll("[data-a11y-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-a11y-toggle");
        state[k] = !state[k];
        save(); apply();
      });
    });

    wrap.querySelectorAll("[data-a11y-font]").forEach(function (b) {
      b.addEventListener("click", function () {
        var dir = b.getAttribute("data-a11y-font") === "+" ? 1 : -1;
        var step = parseInt(state.font, 10) || 0;
        state.font = Math.max(FONT_MIN, Math.min(FONT_MAX, step + dir));
        save(); apply();
      });
    });

    var resetBtn = wrap.querySelector("[data-a11y-reset]");
    if (resetBtn) resetBtn.addEventListener("click", function () { state = {}; save(); apply(); });

    apply();
  }

  /* ---- Mobile nav toggle + two-tap dropdown accordion ---- */
  function initNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    if (nav && toggle) toggle.addEventListener("click", function () { nav.classList.toggle("open"); });

    var menu = nav && nav.querySelector(".nav__menu");
    if (!menu) return;
    var mq = window.matchMedia("(max-width: 860px)");

    /* On mobile, a first tap on a service that has sub-pages expands its
       sub-menu (accordion) instead of navigating; a second tap follows the link. */
    menu.addEventListener("click", function (e) {
      if (!mq.matches) return;                         // desktop: hover opens, links navigate
      var link = e.target.closest(".nav__link");
      if (!link) return;                               // tapped a sub-item or empty space
      var li = link.closest(".has-drop");
      if (!li) return;                                 // plain top-level link (אודות / יצירת קשר)
      if (!li.classList.contains("is-open")) {
        e.preventDefault();                            // first tap: reveal sub-pages only
        var open = menu.querySelectorAll(".has-drop.is-open");
        for (var i = 0; i < open.length; i++) if (open[i] !== li) open[i].classList.remove("is-open");
        li.classList.add("is-open");
      }
      /* already open -> let the tap navigate to the service page */
    });

    /* Collapse any expanded sections when the whole menu is closed, so each
       reopen starts fresh (first tap always expands, never accidentally navigates). */
    toggle.addEventListener("click", function () {
      if (!nav.classList.contains("open")) {
        menu.querySelectorAll(".has-drop.is-open").forEach(function (o) { o.classList.remove("is-open"); });
      }
    });
  }

  /* ---- Mobile: auto-rotating slider for the "why / benefit" card grids ----
     On phones each #why card grid becomes a 1-up carousel that advances every
     1.5s (with dots). The grid is wrapped in a clipping viewport; on desktop the
     structure is inert and the original grid layout shows unchanged. */
  function initMobileSliders() {
    var grids = document.querySelectorAll("#why .grid.grid-4");
    Array.prototype.forEach.call(grids, setupMobileSlider);
  }

  function setupMobileSlider(grid) {
    var cards = Array.prototype.filter.call(grid.children, function (c) {
      return c.classList && c.classList.contains("card");
    });
    if (cards.length < 2) return;

    var vp = document.createElement("div");
    vp.className = "msl-viewport";
    grid.parentNode.insertBefore(vp, grid);
    vp.appendChild(grid);

    var dotsWrap = document.createElement("div");
    dotsWrap.className = "msl-dots";
    vp.parentNode.insertBefore(dotsWrap, vp.nextSibling);

    var idx = 0, timer = null;
    var mq = window.matchMedia("(max-width: 560px)");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    var dots = cards.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "כרטיסייה " + (i + 1));
      if (i === 0) b.className = "is-active";
      b.addEventListener("click", function () { idx = i; render(); start(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function render() {
      idx = (idx % cards.length + cards.length) % cards.length;
      // RTL track: positive translateX reveals the next (leftward) card
      grid.style.transform = mq.matches
        ? "translateX(" + (idx * cards[0].getBoundingClientRect().width) + "px)"
        : "";
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); });
    }
    function advance() { idx++; render(); }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function start() {
      stop();
      if (mq.matches && !reduce.matches) timer = window.setInterval(advance, 1500);
    }

    vp.addEventListener("mouseenter", stop);
    vp.addEventListener("mouseleave", start);
    vp.addEventListener("touchstart", stop, { passive: true });
    vp.addEventListener("touchend", start, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

    var rt;
    window.addEventListener("resize", function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(function () { render(); start(); }, 160);
    });
    if (mq.addEventListener) mq.addEventListener("change", function () { idx = 0; render(); start(); });

    render();
    start();
  }

  /* ---- Mobile: lift the hero paragraph out of the video hero so the clip has
     more room to breathe; it docks right below the hero and returns on desktop. ---- */
  function initHeroLift() {
    var sub = document.querySelector(".hero-v__sub");
    var hero = document.querySelector(".hero-v");
    if (!sub || !hero) return;
    var home = sub.parentNode;                 // .hero-v__copy (desktop home)
    var anchor = sub.nextElementSibling;       // .hero-v__actions (position marker)

    var dock = document.createElement("div");
    dock.className = "hero-sub-dock";
    var inner = document.createElement("div");
    inner.className = "container";
    dock.appendChild(inner);
    hero.parentNode.insertBefore(dock, hero.nextSibling);

    var mq = window.matchMedia("(max-width: 860px)");
    function place() {
      if (mq.matches) {
        if (sub.parentNode !== inner) inner.appendChild(sub);
      } else if (sub.parentNode !== home) {
        if (anchor && anchor.parentNode === home) home.insertBefore(sub, anchor);
        else home.appendChild(sub);
      }
    }
    place();
    if (mq.addEventListener) mq.addEventListener("change", place);
  }

  /* ---- Active link highlight ---- */
  function initActiveLink() {
    var path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav__menu .nav__link").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0];
      if (href === path) a.style.color = "var(--violet-deep)";
    });
  }

  /* ---- Count-up ---- */
  var counted = false;
  function runCounts() {
    if (counted) return;
    counted = true;
    var weeks = mkWeeksSinceGolive();
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var weekly = parseFloat(el.getAttribute("data-weekly")); // הגדלה שבועית אוטומטית
      if (!isNaN(weekly)) target += weeks * weekly;
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1600, start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        var shown = target % 1 === 0 ? Math.round(val) : val.toFixed(1);
        el.textContent = Number(shown).toLocaleString("en-US") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---- Reveal + trigger counts ---- */
  function initObservers() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      runCounts();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          if (e.target.hasAttribute("data-count-zone")) runCounts();
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.16 });
    document.querySelectorAll(".reveal, [data-count-zone]").forEach(function (el) { io.observe(el); });
  }

  /* ---- Hero point-cloud canvas(es) ---- */
  function initCanvases() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll(".hero__canvas").forEach(setupCloud);
  }

  function setupCloud(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], W, H, t = 0;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      pts = [];
      var count = Math.min(Math.floor((W * H) / 5200), 200);
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H, z: Math.random(),
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          tw: Math.random() * Math.PI * 2
        });
      }
    }
    function frame() {
      t += 0.012;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < 12000) {
            ctx.strokeStyle = "rgba(25,198,224," + (1 - d2 / 12000) * 0.16 + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < pts.length; k++) {
        var pt = pts[k];
        var tw = 0.55 + 0.45 * Math.sin(t * 2 + pt.tw);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 0.7 + pt.z * 1.9, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + (pt.z > 0.82 ? "126,231,135," : "120,225,245,") + (0.35 + pt.z * 0.5) * tw + ")";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadIncludes);
  } else {
    loadIncludes();
  }
})();

/* ---- Lightweight YouTube facade: load iframe only on click ---- */
(function () {
  "use strict";
  function initVideos() {
    var cards = document.querySelectorAll(".video-card[data-yt]");
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", function () {
        if (this.classList.contains("is-playing")) return;
        var id = this.getAttribute("data-yt");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("title", this.getAttribute("aria-label") || "וידאו");
        iframe.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1";
        this.classList.add("is-playing");
        this.appendChild(iframe);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVideos);
  } else {
    initVideos();
  }
})();

/* ---- Matterport tour facade: a poster (.tour-frame--img) loads the live 3D
   tour inline, in place, on click - instead of opening a new tab. The href is
   kept as a no-JS fallback. Shared by the tour-* hero posters. ---- */
(function () {
  "use strict";
  function embed(id) { return "https://my.matterport.com/show/?m=" + id + "&play=1&qs=1&brand=0&hr=0"; }
  function loadInline(a) {
    var href = a.getAttribute("href") || "";
    var m = href.match(/[?&]m=([^&]+)/);
    if (!m) { window.open(href, "_blank", "noopener"); return; }   // no id - fall back to opening the link
    var box = document.createElement("div");
    box.className = "tour-frame is-live";                           // reuse the frame's size / rounding / clip
    var iframe = document.createElement("iframe");
    iframe.setAttribute("allow", "xr-spatial-tracking; fullscreen; accelerometer; gyroscope; autoplay");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("title", a.getAttribute("aria-label") || "סיור וירטואלי 360° אינטראקטיבי");
    iframe.src = embed(m[1]);
    box.appendChild(iframe);
    a.parentNode.replaceChild(box, a);                             // swap poster -> live tour in the same cell
  }
  function initTourPosters() {
    var posters = document.querySelectorAll(".tour-frame--img");
    for (var i = 0; i < posters.length; i++) {
      posters[i].addEventListener("click", function (e) {
        e.preventDefault();
        loadInline(this);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTourPosters);
  } else {
    initTourPosters();
  }
})();

/* ---- Client logo slider: steps one logo every 1.5s (seamless loop) ---- */
(function () {
  "use strict";
  function setupSlider(slider) {
    var track = slider.querySelector(".logo-slider__track");
    if (!track) return;

    var originals = Array.prototype.slice.call(track.children);
    var n = originals.length;
    if (n < 2) return;
    // Clone the full set once so the strip can loop without a visible gap.
    for (var i = 0; i < n; i++) track.appendChild(originals[i].cloneNode(true));

    var idx = 0, timer = null, paused = false, resetting = false;
    var EASE = "transform .6s cubic-bezier(.65,0,.35,1)";

    function stepWidth() {
      var first = track.children[0];
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap || "0") || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function position(anim) {
      track.style.transition = anim ? EASE : "none";
      track.style.transform = "translateX(" + (-idx * stepWidth()) + "px)";
    }
    function advance() {
      if (paused || resetting) return;
      idx++;
      position(true);
      if (idx >= n) {
        resetting = true;
        window.setTimeout(function () {
          idx = 0;
          position(false);
          void track.offsetWidth; // force reflow so the next step animates
          resetting = false;
        }, 640);
      }
    }
    function start() { if (!timer) timer = window.setInterval(advance, 1500); }
    function stop() { window.clearInterval(timer); timer = null; }

    position(false);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    start();
    slider.addEventListener("mouseenter", function () { paused = true; });
    slider.addEventListener("mouseleave", function () { paused = false; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    var rt;
    window.addEventListener("resize", function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(function () { position(false); }, 150);
    });
  }
  function initSliders() {
    var sliders = document.querySelectorAll("[data-logo-slider]");
    for (var i = 0; i < sliders.length; i++) setupSlider(sliders[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSliders);
  } else {
    initSliders();
  }
})();

/* ==========================================================================
   Virtual tour theater - swap the live Matterport embed between tours.
   Data-driven: each .tour-tab carries data-m (model id), data-name, data-desc.
   Shared by tour-apartments / tour-hotels / tour-retail / tour-holy-sites.
   ========================================================================== */
(function () {
  "use strict";
  function initTourTheater() {
    var stage = document.querySelector("[data-tour-theater]");
    if (!stage) return;
    var frame = stage.querySelector("[data-tour-frame]");
    var nameEl = stage.querySelector("[data-tour-name]");
    var descEl = stage.querySelector("[data-tour-desc]");
    var openEl = stage.querySelector("[data-tour-open]");
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".tour-tab"));
    if (!frame || !tabs.length) return;

    function embed(id) { return "https://my.matterport.com/show/?m=" + id + "&play=1&qs=1&brand=0&hr=0"; }

    function select(tab, scroll) {
      var id = tab.getAttribute("data-m");
      if (!id) return;
      frame.src = embed(id);
      var nm = tab.getAttribute("data-name");
      var ds = tab.getAttribute("data-desc");
      if (nameEl && nm) nameEl.textContent = nm;
      if (descEl && ds) descEl.textContent = ds;
      if (openEl) openEl.href = "https://my.matterport.com/show/?m=" + id;
      tabs.forEach(function (b) { b.classList.toggle("is-active", b === tab); });
      if (scroll) {
        var header = document.querySelector(".site-header");
        var off = (header ? header.offsetHeight : 0) + 20;
        window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY - off, behavior: "smooth" });
      }
    }

    tabs.forEach(function (b) {
      b.addEventListener("click", function () { select(b, true); });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTourTheater);
  } else {
    initTourTheater();
  }
})();

/* ==========================================================================
   Visualizations hero showcase - crossfade through real Makovki renders.
   Auto-advances every 4.6s; thumbnails jump directly. Pauses on hover / when
   the tab is hidden; respects prefers-reduced-motion (stays on the first frame,
   thumbnails still work).
   ========================================================================== */
(function () {
  "use strict";
  function initVizShow() {
    var show = document.querySelector("[data-viz-show]");
    if (!show) return;
    var imgs = Array.prototype.slice.call(show.querySelectorAll(".viz-show__img"));
    var thumbs = Array.prototype.slice.call(show.querySelectorAll(".viz-thumb"));
    var capEl = show.querySelector("[data-viz-cap]");
    if (imgs.length < 2) return;

    var cur = 0, timer = null, paused = false;
    var DELAY = 4600;

    function select(i) {
      i = (i + imgs.length) % imgs.length;
      if (i === cur) return;
      cur = i;
      for (var k = 0; k < imgs.length; k++) imgs[k].classList.toggle("is-active", k === i);
      for (var t = 0; t < thumbs.length; t++) {
        thumbs[t].classList.toggle("is-active", t === i);
        thumbs[t].setAttribute("aria-selected", t === i ? "true" : "false");
      }
      if (capEl) {
        var cap = imgs[i].getAttribute("data-cap") || "";
        capEl.style.opacity = "0";
        window.setTimeout(function () { capEl.textContent = cap; capEl.style.opacity = "1"; }, 220);
      }
    }
    function advance() { if (!paused) select(cur + 1); }
    function start() { if (!timer) timer = window.setInterval(advance, DELAY); }
    function stop() { window.clearInterval(timer); timer = null; }

    for (var t = 0; t < thumbs.length; t++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          select(parseInt(btn.getAttribute("data-viz-i"), 10) || 0);
          stop(); start(); // restart the clock so a manual pick gets full dwell
        });
      })(thumbs[t]);
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // thumbnails already wired; skip auto-rotation

    start();
    show.addEventListener("mouseenter", function () { paused = true; });
    show.addEventListener("mouseleave", function () { paused = false; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVizShow);
  } else {
    initVizShow();
  }
})();
