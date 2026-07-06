/* ==========================================================================
   Makovki - interactions
   - loads shared header/footer partials (single source of truth)
   - sticky header shadow, mobile nav, active link
   - count-up stats, reveal-on-scroll
   - hero point-cloud canvas (evokes the 3D laser scan)
   ========================================================================== */
(function () {
  "use strict";

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
    initFilter();
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
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
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
