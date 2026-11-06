// End-to-end checks for Draft 1 in real Chrome.
const { Rec, sleep } = require("./rec");
const fs = require("fs");
const BASE = "http://127.0.0.1:5180/prototypes/draft-1/a/";
const PAGES = ["index.html", "tour.html", "process.html", "contact.html", "privacy.html", "terms.html"];
const SIZES = [[1920, 1080], [1536, 864], [1440, 900], [1366, 768], [1280, 720], [768, 1024], [390, 844]];
const SHOTS = __dirname + "/out/e2e"; fs.mkdirSync(SHOTS, { recursive: true });
const problems = [];
const bad = (m) => { problems.push(m); console.log("  ✗", m); };
const only = process.argv[2]; // optional: run only "pages" or "interact"

(async () => {
  if (only !== "interact") for (const [w, h] of SIZES) {
    const r = await new Rec({ width: w, height: h, dsf: 1 }).start();
    await r.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    await r.send("Network.enable");
    const failed = [];
    r.on("Network.responseReceived", p => { if (p.response.status >= 400) failed.push(p.response.status + " " + p.response.url); });
    r.on("Network.loadingFailed", p => { if (!p.canceled && !/ERR_ABORTED/.test(p.errorText)) failed.push(p.errorText); });
    for (const page of PAGES) {
      r.errors.length = 0; failed.length = 0;
      await r.goto(BASE + page); await sleep(1200);
      const m = await r.js(`(()=>{
        const hero = document.querySelector('.hero');
        const over = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && b.width > 0 && !e.closest('.vbar,.chapters,[style*="overflow-x"],.legal-toc,.legal-doc table') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map(e => e.tagName + '.' + e.className);
        return { sw: document.documentElement.scrollWidth, iw: innerWidth, heroBottom: hero ? Math.round(hero.getBoundingClientRect().bottom) : null, ih: innerHeight, over,
                 h1: (document.querySelector('h1') || {}).textContent, imgsBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map(i => i.src) };
      })()`);
      const tag = `${w}x${h} ${page}`;
      if (m.sw > m.iw) bad(`${tag}: horizontal scroll ${m.sw} > ${m.iw} ${m.over.join(",")}`);
      else if (m.over.length) bad(`${tag}: element past the edge ${m.over.join(",")}`);
      if (page === "index.html" && w > 1080 && m.heroBottom > m.ih + 1) bad(`${tag}: hero ends at ${m.heroBottom}px, screen is ${m.ih}px`);
      if (m.imgsBroken.length) bad(`${tag}: broken images ${m.imgsBroken.join(",")}`);
      await r.shot(`${SHOTS}/${w}x${h}_${page.replace(".html", "")}.png`);
      const total = await r.js("document.documentElement.scrollHeight");
      for (let y = 0; y < total; y += Math.round(h * 0.6)) { await r.js(`scrollTo(0, ${y})`); await sleep(260); }
      await sleep(900);
      const vids = await r.js(`[...document.querySelectorAll('video')].filter(v => v.offsetParent !== null).map(v => ({ src: v.currentSrc.split('/').pop(), rs: v.readyState, err: v.error && v.error.code }))`);
      const hidden = await r.js(`[...document.querySelectorAll('.rv')].filter(e => !e.classList.contains('in')).length`);
      if (hidden) bad(`${tag}: ${hidden} sections never revealed`);
      for (const v of vids) if (v.err || v.rs < 1) bad(`${tag}: video ${v.src} readyState=${v.rs} error=${v.err}`);
      const errs = r.errors.filter(e => !/favicon/.test(e)); if (errs.length) bad(`${tag}: page errors ${errs.join(" | ").slice(0, 300)}`);
      const f = failed.filter(x => !/favicon/.test(x)); if (f.length) bad(`${tag}: failed requests ${f.join(" | ").slice(0, 300)}`);
      if (w === 1440) console.log(`  ${tag}: h1 "${(m.h1 || "").trim().slice(0, 60)}", ${vids.length} videos ok`);
    }
    await r.close();
    console.log(`${w}x${h} done`);
  }
  if (only === "pages") { console.log(problems.length ? `\n${problems.length} PROBLEMS` : "\nALL PAGE CHECKS PASSED"); process.exit(0); }

  // Interactions
  const r = await new Rec({ width: 1440, height: 900, dsf: 1 }).start();
  await r.goto(BASE + "tour.html#score"); await sleep(1500);
  let st = await r.js(`[String(document.querySelector('[aria-selected="true"]').textContent).trim().slice(0,12), [...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id)]`);
  if (st[1][0] !== "score") bad("tour: #score deep link opened " + st[1]); else console.log("  tour deep link ok:", st[0]);
  await r.click('[aria-controls="candidate"]'); await sleep(1800);
  st = await r.js(`(()=>{ const p=[...document.querySelectorAll('.panel')].find(p=>!p.hidden); const v=p.querySelector('video'); return [p.id, location.hash, v.paused, Math.round(v.currentTime*10)/10]; })()`);
  if (st[0] !== "candidate" || st[1] !== "#candidate" || st[2]) bad("tour: chapter click " + JSON.stringify(st)); else console.log("  tour chapter switch ok, playing at", st[3] + "s");
  await r.click('.panel:not([hidden]) [data-go="4"]'); await sleep(800);
  st = await r.js(`[...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id)[0]`);
  if (st !== "review") bad("tour: next button went to " + st); else console.log("  tour next button ok");
  await r.goto(BASE + "index.html"); await sleep(1000);
  st = await r.js(`[document.querySelectorAll('.hero3 video').length, document.querySelectorAll('main video').length]`);
  if (st[0] !== 0 || st[1] > 2) bad("home: expected no hero video and at most 2 videos, got " + st); else console.log("  home: no hero video,", st[1], "videos below");
  await r.js(`document.querySelector('main video').scrollIntoView({block:'center'})`); await sleep(2500);
  st = await r.js(`(()=>{ const v=document.querySelector('main video'); return [v.paused, v.currentTime>0.5]; })()`);
  if (st[0] || !st[1]) bad("home: video not playing when on screen " + st); else console.log("  home video plays on screen");
  await r.click("main .frame video"); await sleep(400);
  st = await r.js(`document.querySelector('main video').paused`);
  if (!st) bad("home: click did not pause the video"); else console.log("  click pauses video");
  await r.goto(BASE + "contact.html"); await sleep(800);
  await r.click('#contact-form button[type="submit"]'); await sleep(500);
  st = await r.js(`[document.querySelector('#sent').classList.contains('on'), document.querySelector('#contact-form input[name=name]').matches(':invalid')]`);
  if (st[0] || !st[1]) bad("contact: empty form was accepted " + st); else console.log("  contact: empty form blocked");
  await r.type('#contact-form input[name=name]', "Test Person", { delay: 0 });
  await r.type('#contact-form input[name=email]', "test@example.com", { delay: 0 });
  await r.type('#contact-form textarea', "Two intern roles this spring.", { delay: 0 });
  await r.click('#contact-form button[type="submit"]'); await sleep(500);
  st = await r.js(`document.querySelector('#sent').classList.contains('on')`);
  if (!st) bad("contact: valid form did not confirm"); else console.log("  contact: valid form confirms");
  await r.js(`document.querySelector('.faq details:nth-child(2) summary').scrollIntoView({block:'center'})`); await sleep(1000);
  await r.click('.faq details:nth-child(2) summary'); await sleep(300);
  st = await r.js(`document.querySelector('.faq details:nth-child(2)').open`);
  if (!st) bad("faq: did not open"); else console.log("  faq opens");
  const links = new Set();
  for (const page of PAGES) { await r.goto(BASE + page); (await r.js(`[...document.querySelectorAll('a[href]')].map(a=>a.href)`)).forEach(h => links.add(h.split("#")[0])); }
  const local = [...links].filter(l => l.startsWith("http://127.0.0.1:5180"));
  for (const l of local) { const res = await fetch(l); if (!res.ok) bad("link " + l + " → " + res.status); }
  console.log("  internal links checked:", local.length);
  console.log("  external links:", [...links].filter(l => !l.startsWith("http://127.0.0.1:5180")).join(" "));
  await r.close();
  const m = await new Rec({ width: 390, height: 844, dsf: 1 }).start();
  await m.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await m.goto(BASE + "index.html"); await sleep(600); await m.click(".menu"); await sleep(300);
  st = await m.js(`[getComputedStyle(document.querySelector('.nav')).display, document.querySelectorAll('.nav a').length]`);
  if (st[0] === "none") bad("mobile menu did not open"); else console.log("  mobile menu opens with", st[1], "links");
  await m.shot(`${SHOTS}/390_menu.png`); await m.close();
  console.log(problems.length ? `\n${problems.length} PROBLEMS` : "\nALL CHECKS PASSED");
  process.exit(0);
})();
