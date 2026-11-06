// Legal pages: the "On this page" list follows your reading. The section you're in is highlighted
// and kept in view in the sidebar.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".legal-toc a[href^='#']"));
  var toc = document.querySelector(".legal-toc");
  var heads = links.map(function (a) { return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
  var current = null;

  function update() {
    // The current section is the last heading that has scrolled above the reading line.
    var line = 140, active = 0;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i] && heads[i].getBoundingClientRect().top <= line) active = i;
    }
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) active = heads.length - 1;
    if (links[active] === current) return;
    if (current) current.classList.remove("active");
    current = links[active];
    current.classList.add("active");
    // Keep the highlighted item visible inside the sidebar without moving the page.
    var t = current.offsetTop - toc.clientHeight / 2;
    toc.scrollTo({ top: Math.max(0, t), behavior: "smooth" });
  }

  var queued = false;
  window.addEventListener("scroll", function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }, { passive: true });
  update();
})();
