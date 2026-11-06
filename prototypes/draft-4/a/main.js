// Draft 3: small, independent behaviours, shared by every page. Each one checks that its
// elements are on the page first. Everything waits until it is on screen, and people who turn
// off motion in their system settings get the finished state straight away.
(function () {
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Menu bar gets a hairline once you scroll
  var nav = $(".nav");
  if (nav) addEventListener("scroll", function () { nav.classList.toggle("scrolled", scrollY > 8); }, { passive: true });

  // Count a number up from 0
  function countUp(el) {
    var to = +el.dataset.count, t0 = performance.now(), dur = 1200;
    if (still) return;
    (function tick(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // Play each picture once, the first time it comes into view
  var seen = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add("in");
      $$(".fill", el).forEach(function (f) { f.classList.add("go"); });
      $$("[data-count]", el).forEach(countUp);
      seen.unobserve(el);
    });
  }, { threshold: 0.3 });
  $$("[data-anim]").forEach(function (el) { seen.observe(el); });

  // Watch whether an element is on screen (for things that loop)
  function onScreen(el, cb) {
    if (el) new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: 0.2 }).observe(el);
  }

  // Tabbed CRM window: tabs cycle on their own until someone clicks one
  var tabs = $$(".tab-rail button"), panes = $$(".tab-panes .pane"), cur = 0, auto = !still, timer, tabsVisible = false;
  function show(i) {
    cur = i;
    tabs.forEach(function (b, j) { b.classList.toggle("on", j === i); b.setAttribute("aria-selected", j === i); });
    panes.forEach(function (p, j) { p.classList.toggle("on", j === i); });
  }
  function schedule() {
    clearTimeout(timer);
    if (auto && tabsVisible && tabs.length) timer = setTimeout(function () { show((cur + 1) % tabs.length); schedule(); }, 5200);
  }
  tabs.forEach(function (b, i) { b.addEventListener("click", function () { auto = false; clearTimeout(timer); show(i); }); });
  onScreen($(".tabs-win"), function (v) { tabsVisible = v; schedule(); });

  // Sticky list: it follows whichever window is in the middle of the screen
  var items = $$(".loop-list > li"), wins = $$(".lw");
  if (items.length && wins.length) {
    var mid = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = +e.target.dataset.step;
        items.forEach(function (li, j) { li.classList.toggle("on", j === n); });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    wins.forEach(function (w) { mid.observe(w); });
    items.forEach(function (li, i) {
      li.addEventListener("click", function () {
        if (wins[i]) wins[i].scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
      });
    });
  }

  // Brief router: the brief scrolls in on the left, owners scroll out on the right
  var router = $(".router");
  if (router) {
    var lists = $$(".r-list", router).map(function (ul) { return $$("li", ul); }), step = 0, gap = 48;
    var place = function () {
      lists.forEach(function (lis) {
        var n = lis.length;
        lis.forEach(function (li, i) {
          var d = ((i - step) % n + n) % n;
          if (d > n / 2) d -= n;
          var a = Math.abs(d);
          li.style.transform = "translateY(calc(" + d * gap + "px - 50%)) scale(" + (1 - a * 0.06) + ")";
          li.style.opacity = a >= 4 ? 0 : [1, 0.42, 0.22, 0.1][a];
          li.style.transformOrigin = li.parentNode.classList.contains("r-in") ? "right center" : "left center";
        });
      });
    };
    place();
    var routerTimer, dots = $(".r-pill em", router), dn = 0;
    if (!still) onScreen(router, function (v) {
      clearInterval(routerTimer);
      if (v) routerTimer = setInterval(function () {
        step++; place();
        if (dots) dots.textContent = ["…", ".", ".."][++dn % 3];
      }, 1700);
    });
  }

  // Client stories: arrows scroll one card
  var track = $(".st-track");
  if (track) $$(".st-arrows button").forEach(function (b) {
    b.addEventListener("click", function () {
      var card = $("article", track);
      if (card) track.scrollBy({ left: +b.dataset.dir * (card.offsetWidth + 20), behavior: still ? "auto" : "smooth" });
    });
  });

  // Contact form: a prototype, so it only says thanks
  var form = $("#contact-form"), sent = $("#sent");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (sent) sent.classList.add("on");
    form.reset();
  });
})();
