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
    initVizGallery();
    initFilter();
    initAvailability();
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

  /* ---- Mobile nav toggle ---- */
  function initNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    if (nav && toggle) toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
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

/* ---- Client logo slider: steps one logo every 1.5s (seamless loop) ---- */
(function () {
  "use strict";
  function initSlider() {
    var slider = document.querySelector("[data-logo-slider]");
    if (!slider) return;
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSlider);
  } else {
    initSlider();
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
