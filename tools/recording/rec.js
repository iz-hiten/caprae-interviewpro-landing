// Records the real InterviewPro UI (local demo copy, demo data) as MP4.
// Drives Chrome over CDP with real mouse/keyboard input, shows a pointer, captures a screencast,
// and encodes it with ffmpeg. Every request that isn't localhost is blocked, except fonts/CDN
// assets the app loads; storage URLs are answered with demo media.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = process.env.FFMPEG || "ffmpeg"; // e.g. the binary from `uv run --with imageio-ffmpeg python -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"`
const MEDIA = path.join(__dirname, "media"); // made by make-media.py (git-ignored)
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CURSOR_JS = `(() => {
  if (window.__demoCursor) return;
  const mk = () => {
    if (document.getElementById('__dc')) return;
    const c = document.createElement('div'); c.id = '__dc';
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 2.5l14 8-6.2 1.6L9.6 18.6z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const p = JSON.parse(sessionStorage.getItem('__dcpos') || '[640,430]');
    Object.assign(c.style, {position:'fixed',left:'0',top:'0',zIndex:2147483647,pointerEvents:'none',
      transform:'translate('+p[0]+'px,'+p[1]+'px)',filter:'drop-shadow(0 2px 3px rgba(0,0,0,.35))',willChange:'transform'});
    document.documentElement.appendChild(c);
    const r = document.createElement('div'); r.id = '__dr';
    Object.assign(r.style, {position:'fixed',left:'0',top:'0',width:'36px',height:'36px',margin:'-18px 0 0 -18px',borderRadius:'50%',
      border:'3px solid #fbbf24',zIndex:2147483646,pointerEvents:'none',opacity:'0'});
    document.documentElement.appendChild(r);
  };
  window.__demoCursor = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  window.__move = (x, y, ms) => { mk(); const c = document.getElementById('__dc');
    c.style.transition = 'transform ' + ms + 'ms cubic-bezier(.45,.05,.25,1)'; c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    sessionStorage.setItem('__dcpos', JSON.stringify([x, y])); };
  window.__ring = (x, y) => { const r = document.getElementById('__dr'); if (!r) return; r.style.left = x + 'px'; r.style.top = y + 'px';
    r.animate([{opacity:.95,transform:'scale(.35)'},{opacity:0,transform:'scale(1.5)'}], {duration:650, easing:'ease-out'}); };
})();`;

class Rec {
  constructor(opts) {
    this.o = Object.assign({ width: 1280, height: 800, dsf: 1.5, port: 9400 + Math.floor(Math.random() * 400), fakeMedia: false }, opts);
    Rec.all.push(this);
    this.frames = []; this.capturing = false; this.id = 0; this.pend = {}; this.handlers = {}; this.pos = [640, 430]; this.errors = [];
  }
  async start() {
    const o = this.o, prof = path.join(process.env.TEMP, "rec-prof-" + o.port + "-" + Date.now()); // fresh profile every run
    const args = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", `--remote-debugging-port=${o.port}`,
      `--window-size=${o.width},${o.height}`, "--user-data-dir=" + prof, "--no-first-run", "--disable-features=Translate,MediaRouter",
      "--autoplay-policy=no-user-gesture-required", "--host-resolver-rules=MAP interviewpro.example 127.0.0.1",
      "--unsafely-treat-insecure-origin-as-secure=http://interviewpro.example", "about:blank"];
    if (o.fakeMedia) args.splice(0, 0, "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      "--use-file-for-fake-video-capture=" + path.join(MEDIA, "cam.y4m"), "--use-file-for-fake-audio-capture=" + path.join(MEDIA, "voice.wav"));
    this.proc = spawn(CHROME, args, { stdio: "ignore" });
    let tabs;
    for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${o.port}/json`)).json(); break; } catch { await sleep(250); } }
    const page = tabs.find(t => t.type === "page");
    this.ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => (this.ws.onopen = r));
    this.ws.onmessage = e => this.onMsg(JSON.parse(e.data));
    await this.send("Page.enable"); await this.send("Runtime.enable"); await this.send("Log.enable");
    await this.send("Emulation.setDeviceMetricsOverride", { width: o.width, height: o.height, deviceScaleFactor: o.dsf, mobile: false });
    await this.send("Page.addScriptToEvaluateOnNewDocument", { source: CURSOR_JS });
    await this.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
    this.on("Fetch.requestPaused", p => this.route(p));
    this.on("Page.screencastFrame", p => {
      this.send("Page.screencastFrameAck", { sessionId: p.sessionId });
      if (this.capturing) this.frames.push({ t: p.metadata.timestamp, data: p.data });
    });
    // never let an alert()/confirm() freeze a recording: note it and dismiss it
    this.on("Page.javascriptDialogOpening", p => { this.errors.push("DIALOG " + p.type + ": " + p.message.slice(0, 120)); this.send("Page.handleJavaScriptDialog", { accept: true }); });
    this.on("Runtime.exceptionThrown", p => this.errors.push("EXC " + (p.exceptionDetails.exception?.description || p.exceptionDetails.text).split("\n")[0]));
    this.on("Log.entryAdded", p => { if (p.entry.level === "error") this.errors.push("LOG " + p.entry.text + " " + (p.entry.url || "")); });
    return this;
  }
  onMsg(m) {
    if (m.id && this.pend[m.id]) { this.pend[m.id](m); delete this.pend[m.id]; return; }
    (this.handlers[m.method] || []).forEach(h => h(m.params));
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  send(method, params = {}) { return new Promise(r => { const i = ++this.id; this.pend[i] = r; this.ws.send(JSON.stringify({ id: i, method, params })); }); }

  // Network: localhost passes; fonts/CDN GETs pass; storage/demo-media answered locally; everything else fails.
  async route(p) {
    const url = p.request.url, id = p.requestId;
    const ok = (body, type = "application/json", status = 200) => this.send("Fetch.fulfillRequest", { requestId: id, responseCode: status,
      responseHeaders: [{ name: "Content-Type", value: type }, { name: "Access-Control-Allow-Origin", value: "*" }, { name: "Access-Control-Allow-Headers", value: "*" }, { name: "Access-Control-Allow-Methods", value: "*" }],
      body: Buffer.from(body).toString("base64") });
    for (const [re, fn] of this.o.mocks || []) if (re.test(url)) return fn(p, ok);
    if (/amazonaws\.com/.test(url)) return p.request.method === "OPTIONS" ? ok("") : ok(p.request.method === "GET" ? fs.readFileSync(path.join(MEDIA, "cam.mp4")) : "", p.request.method === "GET" ? "video/mp4" : "text/plain");
    if (/demo-media\.invalid\//.test(url)) {
      const rel = new URL(url).pathname.slice(1), file = path.join(MEDIA, rel);
      return this.media(p, fs.existsSync(file) ? file : path.join(MEDIA, "cam.mp4"));
    }
    if (/^https?:\/\/(127\.0\.0\.1|localhost|interviewpro\.example)[:/]/.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return this.send("Fetch.continueRequest", { requestId: id });
    if (p.request.method === "GET" && /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.quilljs\.com|unpkg\.com/.test(url)) return this.send("Fetch.continueRequest", { requestId: id });
    this.errors.push("BLOCKED " + p.request.method + " " + url.slice(0, 120));
    return this.send("Fetch.failRequest", { requestId: id, errorReason: "BlockedByClient" });
  }

  // Mark an element found by a JS expression so it can be clicked by selector: [data-demo="name"]
  async tag(expr, name) { const ok = await this.js(`(()=>{const e=(${expr}); if(!e) return false; e.setAttribute('data-demo',${JSON.stringify(name)}); return true;})()`); if (!ok) throw new Error("tag not found: " + name); return `[data-demo="${name}"]`; }
  async tz(id = "America/Los_Angeles") { await this.send("Emulation.setTimezoneOverride", { timezoneId: id }); }
  // Serve a local media file, honouring byte ranges like a real server.
  media(p, file) {
    const buf = fs.readFileSync(file), type = file.endsWith(".webm") ? "video/webm" : "video/mp4";
    const range = Object.entries(p.request.headers).find(([k]) => k.toLowerCase() === "range")?.[1];
    let start = 0, end = buf.length - 1, code = 200;
    const m = range && /bytes=(\d*)-(\d*)/.exec(range);
    if (m) { start = m[1] ? +m[1] : 0; end = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1; code = 206; }
    const body = buf.subarray(start, end + 1);
    const headers = [{ name: "Content-Type", value: type }, { name: "Accept-Ranges", value: "bytes" }, { name: "Content-Length", value: String(body.length) },
      { name: "Access-Control-Allow-Origin", value: "*" }];
    if (code === 206) headers.push({ name: "Content-Range", value: `bytes ${start}-${end}/${buf.length}` });
    return this.send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: code, responseHeaders: headers, body: body.toString("base64") });
  }
  async goto(url) { await this.send("Page.navigate", { url }); await this.waitFor("document.readyState === 'complete'", 15000); await sleep(400); }
  async js(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error("js: " + expr.slice(0, 80) + " → " + r.result.exceptionDetails.exception?.description); return r.result?.result?.value; }
  async waitFor(expr, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { if (await this.js(`!!(${expr})`)) return true; } catch {} await sleep(120); }
    throw new Error("timeout waiting for " + expr);
  }
  async waitSel(sel, timeout) { return this.waitFor(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;})()`, timeout); }
  async box(sel) {
    return this.js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height];})()`);
  }
  async move(x, y, ms = 700) {
    await this.js(`window.__move && window.__move(${x},${y},${ms})`);
    const steps = Math.max(1, Math.round(ms / 80)), [x0, y0] = this.pos, t0 = Date.now();
    for (let i = 1; i <= steps; i++) { await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x - x0) * i / steps, y: y0 + (y - y0) * i / steps }); const due = t0 + i * ms / steps - Date.now(); if (due > 0) await sleep(due); }
    this.pos = [x, y];
  }
  async click(sel, { ms = 650, dx = 0.5, dy = 0.5, after = 300 } = {}) {
    await this.waitSel(sel);
    const b = await this.box(sel); if (!b) throw new Error("no element " + sel);
    const x = b[0] + b[2] * dx, y = b[1] + b[3] * dy;
    await this.move(x, y, ms); await sleep(120);
    await this.js(`window.__ring && window.__ring(${x},${y})`);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await sleep(70);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    await sleep(after);
  }
  async type(sel, text, { delay = 55, clear = true } = {}) {
    await this.click(sel, { after: 150 });
    if (clear) await this.js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    for (const ch of text) { await this.send("Input.insertText", { text: ch }); if (delay > 5) await sleep(delay + Math.random() * 15); }
  }
  async select(sel, value) {
    await this.click(sel, { after: 250 });
    await this.js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); e.value=${JSON.stringify(value)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await sleep(300);
  }
  async wheel(dy, { x, y, ms = 900 } = {}) {
    if (x !== undefined) await this.move(x, y, 500);
    const steps = Math.max(1, Math.round(ms / 33)), per = dy / steps, t0 = Date.now();
    for (let i = 0; i < steps; i++) { await this.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: this.pos[0], y: this.pos[1], deltaX: 0, deltaY: per }); const due = t0 + (i + 1) * ms / steps - Date.now(); if (due > 0) await sleep(due); }
    await sleep(150);
  }
  async drag(fromX, fromY, toX, toY, ms = 700) {
    await this.move(fromX, fromY, 500);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x: fromX, y: fromY, button: "left", clickCount: 1 });
    const steps = Math.round(ms / 30);
    for (let i = 1; i <= steps; i++) {
      const x = fromX + (toX - fromX) * i / steps, y = fromY + (toY - fromY) * i / steps;
      await this.js(`window.__move(${x},${y},0)`);
      await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 }); await sleep(30);
    }
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: toX, y: toY, button: "left", clickCount: 1 });
    this.pos = [toX, toY];
  }

  async rec() {
    if (!this.screencasting) { await this.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1 }); this.screencasting = true; }
    await sleep(150); this.capturing = true;
    // a still page sends no frames: nudge the pointer so capture starts with a frame
    await this.move(this.pos[0] + 1, this.pos[1], 60);
  }
  pause() { this.capturing = false; this.frames.push({ cut: true, t: Date.now() / 1000 }); }
  async shot(file) { const r = await this.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(file, Buffer.from(r.result.data, "base64")); }

  // Frames → constant-rate MP4 (holds each frame until the next; cuts where pause() was called).
  async encode(out, { fps = 30, width = 1600, crf = 27, poster } = {}) {
    this.capturing = false; this.frames.push({ cut: true, t: Date.now() / 1000 });
    const dir = out + ".frames"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    // each segment ends when capture stopped, so a still screen at the end keeps its real length
    const segs = [[]]; for (const f of this.frames) { if (f.cut) { segs[segs.length - 1].end = f.t; segs.push([]); } else segs[segs.length - 1].push(f); }
    let list = "ffconcat version 1.0\n", k = 0;
    for (const seg of segs.filter(s => s.length)) {
      seg.forEach((f, i) => {
        const name = String(k++).padStart(6, "0") + ".jpg"; fs.writeFileSync(path.join(dir, name), Buffer.from(f.data, "base64"));
        const d = i < seg.length - 1 ? Math.min(seg[i + 1].t - f.t, 3) : Math.min(Math.max((seg.end || f.t + 0.6) - f.t, 0.1), 4);
        list += `file '${name}'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`;
      });
    }
    fs.writeFileSync(path.join(dir, "list.txt"), list);
    await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
      "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", String(crf),
      "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart", "-an", out]);
    if (poster) await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(poster), "-i", out, "-frames:v", "1", "-vf", "scale=1600:-2:out_range=pc,format=yuvj420p", "-q:v", "3", out.replace(/\.mp4$/, ".jpg")]);
    fs.rmSync(dir, { recursive: true, force: true });
    return { frames: k };
  }
  async close() { try { this.ws.close(); } catch {} try { this.proc.kill(); } catch {} }
}
Rec.all = [];
function run(cmd, args) { return new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"] }); p.on("exit", c => c ? rej(new Error(cmd + " exit " + c)) : res()); }); }
module.exports = { Rec, sleep, run, FFMPEG, MEDIA };
