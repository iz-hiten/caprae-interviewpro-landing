// Draft 3 behaviour: menu, reveals, linework that draws itself, mono labels that unscramble
// (ReFactory uses GSAP ScrambleText; this is a small version), the pinned How-it-works story
// (scroll moves through four steps; the ruler and compass follow), and nav highlighting.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;

  // Menu
  var top = $(".top"), menu = $(".menu");
  if (menu) menu.addEventListener("click", function () { var o = top.classList.toggle("open"); menu.setAttribute("aria-expanded", String(o)); });
  $$(".nav a").forEach(function (a) { a.addEventListener("click", function () { top.classList.remove("open"); if (menu) menu.setAttribute("aria-expanded", "false"); }); });

  // Set each SVG stroke's length so it can draw in
  $$(".draw").forEach(function (svg) {
    $$("path, circle, ellipse, line", svg).forEach(function (el) { try { el.style.setProperty("--len", Math.ceil(el.getTotalLength ? el.getTotalLength() : 4000)); } catch (e) {} });
  });

  // Mono labels unscramble when they come into view
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_";
  function scramble(el) {
    if (reduce || el._done) return; el._done = true;
    var final = el.textContent, n = final.length, frame = 0, total = 18;
    var tick = function () {
      var out = "";
      for (var i = 0; i < n; i++) { var ch = final[i]; out += ch === " " || frame / total > i / n ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
      el.textContent = out; frame++;
      if (frame <= total) requestAnimationFrame(tick); else el.textContent = final;
    };
    tick();
  }

  var targets = $$(".rv, .draw, .square, [data-scramble]");
  if (IO && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target.hasAttribute("data-scramble")) scramble(e.target);
        $$("[data-scramble]", e.target).forEach(scramble);
        ro.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (n) { ro.observe(n); });
  } else targets.forEach(function (n) { n.classList.add("in"); });

  // Pinned story: the scroll position inside the section picks the step
  var story = $(".story");
  if (story) {
    var items = $$(".steps-txt li", story), shots = $$(".stage .frame img", story), vr = $(".vruler", story), comp = $(".compass", story), count = $(".stage .cap .n", story);
    var cur = -1;
    var set = function (i) {
      if (i === cur) return; cur = i;
      items.forEach(function (li, j) { li.classList.toggle("on", i === j); li.setAttribute("aria-hidden", String(i !== j)); });
      shots.forEach(function (im, j) { im.classList.toggle("on", i === j); });
      if (count) count.textContent = "0" + (i + 1) + " / 0" + items.length;
    };
    var onScroll = function () {
      if (getComputedStyle($(".pin", story)).position !== "sticky") { items.forEach(function (li) { li.classList.add("on"); li.removeAttribute("aria-hidden"); }); return; }
      var r = story.getBoundingClientRect(), span = story.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, -r.top / (span || 1)));
      set(Math.min(items.length - 1, Math.floor(p * items.length)));
      if (vr) vr.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      if (comp) comp.style.setProperty("--rot", (p * 180).toFixed(1) + "deg");
    };
    set(0);
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); onScroll();
  }

  // Linework: the gold section flows along each tick band (a little with time, more with scroll),
  // and the wireframe spheres turn as the page scrolls. Runs only while the drawing is on screen.
  var bps = $$(".bp");
  if (bps.length && !reduce) {
    var live = new Set();
    var vis = IO ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); }); }) : null;
    bps.forEach(function (s, k) { s._seed = k * 37; if (vis) vis.observe(s); else live.add(s); });
    var loop = function (t) {
      var y = window.scrollY;
      live.forEach(function (s) {
        $$(".flow", s).forEach(function (f, j) { f.style.setProperty("--off", (-((t / 1000) * 2.2 + y * 0.045 + s._seed + j * 41) % 100).toFixed(2)); });
        $$(".sph", s).forEach(function (g, j) { g.style.setProperty("--r", ((j % 2 ? -1 : 1) * y * 0.035).toFixed(2) + "deg"); });
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // How it works page: the side ruler follows the timeline
  var tls = $(".timeline-sec"), tlr = tls && $(".vruler i", tls);
  if (tlr) {
    var tlTick = function () { var r = tls.getBoundingClientRect(); var p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / r.height)); tlr.style.setProperty("--p", (p * 100).toFixed(2) + "%"); };
    window.addEventListener("scroll", tlTick, { passive: true }); tlTick();
  }

  // Features: the carousel (their "featured projects"): centre one card, the bar picks it
  $$("[data-carousel]").forEach(function (box) {
    var track = $(".track", box), cards = $$(".pcard", box), ics = $$(".cb-ic", box), i = 0;
    var go = function (n, user) {
      i = (n + cards.length) % cards.length;
      var c = cards[i], off = c.offsetLeft - (box.clientWidth - c.offsetWidth) / 2;
      track.style.transform = "translateX(" + (-off) + "px)";
      cards.forEach(function (k, j) { k.classList.toggle("on", j === i); k.setAttribute("aria-hidden", String(j !== i)); });
      ics.forEach(function (b, j) { b.classList.toggle("on", j === i); b.setAttribute("aria-pressed", String(j === i)); });
      if (user && history.replaceState) history.replaceState(null, "", "#" + c.id);
      if (user) { var b = box.getBoundingClientRect(); if (b.top < 70 || b.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + b.top - Math.max(72, (window.innerHeight - b.height) / 2), behavior: reduce ? "auto" : "smooth" }); }
    };
    ics.forEach(function (b, j) { b.addEventListener("click", function () { go(j, true); }); });
    $$(".cb-arrow", box).forEach(function (b) { b.addEventListener("click", function () { go(i + (+b.dataset.dir), true); }); });
    box.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") go(i + 1, true); if (e.key === "ArrowLeft") go(i - 1, true); });
    var x0 = null;
    track.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    track.addEventListener("pointerup", function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1), true); });
    cards.forEach(function (c, j) { c.addEventListener("click", function () { if (j !== i) go(j, true); }); });
    var start = Math.max(0, cards.findIndex(function (c) { return "#" + c.id === location.hash; }));
    go(start, false);
    window.addEventListener("resize", function () { go(i, false); });
  });

  // Contact form (prototype: it only says thanks)
  var form = $("#contact-form");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    $("#sent").classList.add("on"); form.reset();
  });

  // Nav: underline the section on screen
  var links = $$(".nav a[href^='#']"), secs = links.map(function (a) { return $(a.getAttribute("href")); });
  var spy = function () {
    var mid = window.innerHeight * 0.4, on = -1;
    secs.forEach(function (s, i) { if (!s) return; var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) on = i; });
    links.forEach(function (a, i) { if (i === on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  };
  window.addEventListener("scroll", spy, { passive: true }); spy();
})();
