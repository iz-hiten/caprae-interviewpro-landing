// Draft 1 behaviour: menu, reveal on scroll, the app recordings (play only while on screen),
// the product tour's chapters, and the contact form (a prototype: it only says thanks).
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;

  // Mobile menu
  var top = $(".top"), menu = $(".menu");
  if (menu) menu.addEventListener("click", function () {
    var open = top.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });

  // Reveal on scroll
  var rv = $$(".rv");
  if (IO && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    rv.forEach(function (n) { ro.observe(n); });
  } else rv.forEach(function (n) { n.classList.add("in"); });

  // Recordings: muted, inline, looping; play while at least 35% on screen.
  function setupClip(fig) {
    var v = $("video", fig), btn = $(".toggle", fig);
    if (!v || fig._ready) return;
    fig._ready = true; fig._user = null; // null = follow the screen, true/false = the viewer chose
    v.muted = true; v.playsInline = true;
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () { fig.classList.add("paused"); }); };
    v.addEventListener("play", function () { fig.classList.remove("paused"); });
    v.addEventListener("pause", function () { fig.classList.add("paused"); });
    var toggle = function () { if (v.paused) { fig._user = true; play(); } else { fig._user = false; v.pause(); } };
    if (btn) btn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    v.addEventListener("click", toggle);
    fig.classList.add("paused");
    if (reduce) return; // posters only, until the viewer presses play
    if (IO) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (fig._user !== false) { if (v.preload === "none") v.preload = "auto"; play(); } }
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.35 }).observe(fig);
    } else play();
  }
  $$(".clip").forEach(setupClip);

  // Product tour: chapters swap the recording and its notes; the URL hash follows.
  var tour = $("#tour");
  if (tour) {
    var tabs = $$(".chapters button", tour), panels = $$(".panel", tour);
    var show = function (i, focus, user) {
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach(function (p, j) {
        var on = i === j, v = $("video", p);
        p.hidden = !on;
        if (v) { if (on) { v.currentTime = 0; if (!reduce) { v.preload = "auto"; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } } else v.pause(); }
      });
      if (focus) tabs[i].focus();
      // only on the viewer's choice: setting the hash during load makes the browser jump to it
      if (user && history.replaceState) history.replaceState(null, "", "#" + panels[i].id);
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i, false, true); });
      t.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (k) { e.preventDefault(); show((i + k + tabs.length) % tabs.length, true, true); }
      });
    });
    $$("[data-go]", tour).forEach(function (b) { b.addEventListener("click", function () { show(+b.dataset.go, false, true); tour.scrollIntoView({ block: "start" }); }); });
    var start = panels.findIndex(function (p) { return "#" + p.id === location.hash; });
    show(start < 0 ? 0 : start);
  }

  // Contact form (prototype)
  var form = $("#contact-form");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    $("#sent").classList.add("on");
    form.reset();
  });

  $$(".year").forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
