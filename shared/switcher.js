// Version bar for a prototype page. Each page of a version loads, in this order:
//   <script src="../../../prototypes.js"></script>
//   <script src="../../../shared/switcher.js" data-proto="<slug>"></script>
// It floats at the top: back to the gallery, the prototype's name, and a button per version.
// Switching version keeps you on the same page (e.g. Results in A → Results in B).
(function () {
  var slug = document.currentScript.dataset.proto;
  var proto = (window.PROTOTYPES || []).find(function (p) { return p.slug === slug; });
  if (!proto) return;
  var parts = location.pathname.split("/");
  var page = parts.pop() || "index.html";
  var current = parts.pop();
  if (!/\.html$/.test(page)) page += ".html"; // clean URLs on Vercel drop the extension

  var css = document.createElement("style");
  css.textContent =
    ".vbar{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
    "display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:999px;" +
    "background:rgba(17,24,39,.92);color:#fff;font:500 13px/1 system-ui,sans-serif;" +
    "box-shadow:0 6px 24px rgba(0,0,0,.35);backdrop-filter:blur(6px)}.vbar[hidden]{display:none}" +
    ".vbar a{color:inherit;text-decoration:none}" +
    ".vbar .back{opacity:.7}.vbar .back:hover{opacity:1}" +
    ".vbar .name{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".vbar .v{display:inline-grid;place-items:center;min-width:28px;height:28px;border-radius:999px;" +
    "background:rgba(255,255,255,.12)}.vbar .v:hover{background:rgba(255,255,255,.25)}" +
    ".vbar .v[aria-current]{background:#fff;color:#111827}" +
    ".vbar .hide{opacity:.5;cursor:pointer;background:none;border:0;color:inherit;font:inherit}";
  document.head.appendChild(css);

  var bar = document.createElement("nav");
  bar.className = "vbar";
  bar.setAttribute("aria-label", "Prototype versions");
  var html = '<a class="back" href="../../../index.html" title="All prototypes">&larr;</a>' +
    '<span class="name">' + proto.name + "</span>";
  proto.versions.forEach(function (v) {
    html += '<a class="v" href="../' + v.id + "/" + page + '" title="' + (v.note || "") + '"' +
      (v.id === current ? ' aria-current="page"' : "") + ">" + v.id.toUpperCase() + "</a>";
  });
  html += '<button class="hide" title="Hide (press V to show)">&times;</button>';
  bar.innerHTML = html;
  document.body.appendChild(bar);

  // Hide the bar to see the page clean; V brings it back.
  bar.querySelector(".hide").onclick = function () { bar.hidden = true; };
  document.addEventListener("keydown", function (e) {
    if (e.key === "v" && !/INPUT|TEXTAREA/.test(e.target.tagName)) bar.hidden = !bar.hidden;
  });
})();
