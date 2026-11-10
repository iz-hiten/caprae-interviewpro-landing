// Draft 2 behaviour: menu, header shadow, gentle reveals, the sticky step index (highlights the step
// on screen), the Features list that swaps the picture, and the contact form (a prototype: it only says thanks).
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;

  // Menu
  var top = $(".top"), menu = $(".menu");
  if (menu) menu.addEventListener("click", function () {
    var open = top.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  // Header gets a soft shadow once the page scrolls
  var onScroll = function () { if (top) top.classList.toggle("scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // Reveal on scroll
  var rv = $$(".rv");
  if (IO && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    rv.forEach(function (n) { ro.observe(n); });
  } else rv.forEach(function (n) { n.classList.add("in"); });

  // Sticky index: highlight the chapter nearest the middle of the screen
  $$(".sticky").forEach(function (box) {
    var links = $$(".index > a", box), chapters = links.map(function (a) { return $(a.getAttribute("href")); });
    if (!links.length) return;
    var set = function (i) { links.forEach(function (a, j) { a.classList.toggle("on", i === j); if (i === j) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); }); };
    set(0);
    var tick = function () {
      var mid = window.innerHeight * 0.45, best = 0, bestD = Infinity;
      chapters.forEach(function (c, i) { if (!c) return; var r = c.getBoundingClientRect(); var d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bestD) { bestD = d; best = i; } });
      set(best);
    };
    window.addEventListener("scroll", tick, { passive: true }); window.addEventListener("resize", tick); tick();
  });

  // Features: one item open at a time; the picture on the right follows it
  $$(".swap").forEach(function (box) {
    var items = $$(".swap-item", box), shots = $$(".swap-view .shots .win", box);
    var open = function (i) {
      items.forEach(function (it, j) { it.classList.toggle("on", i === j); $("button", it).setAttribute("aria-expanded", String(i === j)); });
      shots.forEach(function (s, j) { s.classList.toggle("on", i === j); });
    };
    items.forEach(function (it, i) { $("button", it).addEventListener("click", function () { open(it.classList.contains("on") && window.innerWidth <= 960 ? -1 : i); }); });
    var start = Math.max(0, items.findIndex(function (it) { return "#" + it.id === location.hash; }));
    open(start);
  });

  // Contact form (prototype)
  var form = $("#contact-form");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    $("#sent").classList.add("on"); form.reset();
  });
})();
