// Records each clip of the real InterviewPro UI with demo data.   node clips.js dashboard applicants …
const { Rec, sleep, MEDIA } = require("./rec");
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const APPURL = "http://interviewpro.example"; // demo app on :80, mapped by Chrome to 127.0.0.1
const OUT = path.join(__dirname, "../../prototypes/draft-1/a/video");
fs.mkdirSync(OUT, { recursive: true });
const seed = (...a) => execFileSync("node", [path.join(__dirname, "seed-demo.cjs"), ...a],
  { env: { ...process.env, DATABASE_URL: "postgresql://demo:demo@127.0.0.1:55491/interviewpro_demo" }, stdio: "pipe" }).toString().trim();

const card = (name, sel) => `[...document.querySelectorAll('.interview-card')].find(c=>c.querySelector('.interview-candidate')?.textContent.trim().startsWith(${JSON.stringify(name)}+' '))?.querySelector(${JSON.stringify(sel)})`;
const btnIn = (scope, text, nth = 0) => `[...document.querySelectorAll(${JSON.stringify(scope)})].filter(b=>b.textContent.includes(${JSON.stringify(text)}))[${nth}]`;

async function admin(fresh = true) {
  if (fresh) seed();
  const r = await new Rec({ width: 1440, height: 900, dsf: 1.25 }).start();
  await r.tz();
  await r.goto(APPURL + "/");
  return r;
}
async function login(r, fast = true) {
  await r.type("#admin-email", "admin@example.com", { delay: fast ? 0 : 22 });
  await r.type("#admin-password", "demo-pass-2026", { delay: fast ? 0 : 18 });
  await r.click("#login-btn");
  await r.waitFor("document.getElementById('total-interviews').textContent==='72'", 15000);
  await r.js("document.querySelector('#notification')?.classList.remove('show')");
}
// scroll the admin content area so an element sits near the top, with a smooth wheel
async function scrollTo(r, expr, offset = 140, ms = 1100) {
  const dy = await r.js(`(()=>{const e=(${expr}); return e ? e.getBoundingClientRect().top - ${offset} : 0;})()`);
  await r.wheel(dy, { ms });
}

const CLIPS = {
  // 1. Log in and look around the dashboard: 47 submitted, cards with scores
  async dashboard() {
    const r = await admin();
    await r.move(720, 520, 10);
    await r.rec(); await sleep(500);
    await login(r, false);
    await sleep(1200);
    await r.move(780, 600, 700); await sleep(1000);          // over "Submitted 47"
    await r.wheel(330, { x: 780, y: 560, ms: 900 }); await sleep(1000);
    await scrollTo(r, `document.querySelector('.interviews-section')`, 110, 1100); await sleep(700);
    await r.move(1150, 640, 600);
    await r.wheel(560, { ms: 1300 }); await sleep(700);
    await r.wheel(560, { ms: 1300 }); await sleep(1300);
    return r.encode(OUT + "/dashboard.mp4", { poster: 8.5 });
  },

  // 2. Weekly Applicants: fetch this week's 47, look across the pipeline columns, search
  async applicants() {
    const r = await admin(); await login(r); await sleep(500);
    await r.rec(); await sleep(600);
    await r.click("#nav-applicants"); await sleep(900);
    await r.click("#applicants-fetch-btn");
    await r.waitFor("document.getElementById('applicants-selection-info')?.textContent.includes('47')", 10000); await sleep(1500);
    await scrollTo(r, `document.querySelector('#applicants-data-section')`, 90, 1300); await sleep(900);
    await r.wheel(420, { x: 800, y: 560, ms: 1600 }); await sleep(800);
    // sideways through the table: handbook → interview → NDA → date applied
    const wrap = `document.querySelector('#applicants-data-section div[style*="overflow-x"]')`;
    for (let i = 0; i < 4; i++) { await r.js(`${wrap}.scrollBy({left: 260, behavior: 'smooth'})`); await sleep(750); }
    await sleep(900);
    await r.js(`${wrap}.scrollTo({left: 0, behavior: 'smooth'})`); await sleep(700);
    await scrollTo(r, `document.querySelector('#applicants-search-input')`, 160, 900);
    await r.type("#applicants-search-input", "Research", { delay: 70 }); await sleep(1800);
    await r.select("#applicants-handbook-status-filter", "pass"); await sleep(2000);
    return r.encode(OUT + "/applicants.mp4", { poster: 3.2 });
  },

  // 3. Read before you watch: a candidate's recordings, transcript and AI evaluation
  async review() {
    const r = await admin(); await login(r); await sleep(400);
    await scrollTo(r, card("Candidate 7", ".interview-header"), 120, 10); await sleep(300);
    await r.move(900, 500, 10);
    await r.rec(); await sleep(900);
    await r.click(await r.tag(card("Candidate 7", ".storage-box"), "rec7")); await sleep(2200);
    await r.click(await r.tag(btnIn("#files-list button", "Transcription", 1), "tr")); await sleep(3800);
    await r.click(await r.tag(btnIn(".email-preview-modal button", "Close", 1), "trclose")); await sleep(700);
    await r.click(await r.tag(btnIn("#files-list button", "View Evaluation", 1), "ev")); await sleep(2000);
    await r.wheel(260, { x: 360, y: 640, ms: 1400 }); await sleep(2600);
    return r.encode(OUT + "/review.mp4", { poster: 2.6 });
  },

  // 4. Score on preparation, communication, mission → Selected
  async score() {
    const r = await admin(); await login(r); await sleep(400);
    await scrollTo(r, card("Candidate 3", ".interview-header"), 150, 10); await sleep(300);
    await r.move(900, 520, 10);
    await r.rec(); await sleep(800);
    await r.click(await r.tag(card("Candidate 3", "button[onclick*='openScoreModal']"), "edit3")); await sleep(1300);
    for (const [id, v] of [["score-prep", 9], ["score-comm", 8], ["score-mission", 8]]) {
      const b = await r.box("#" + id);
      const x0 = b[0] + 8, x1 = b[0] + 8 + (b[2] - 16) * v / 10, y = b[1] + b[3] / 2;
      await r.drag(x0, y, x1, y, 900); await sleep(500);
    }
    await sleep(1200);
    await r.click(await r.tag(btnIn("#score-modal button", "Save Score"), "save")); await sleep(3200);   // "automatically selected" toast
    return r.encode(OUT + "/score.mp4", { poster: 12 });
  },

  // 5. Selected candidates → NDA → Onboarding (no emails are sent)
  async onboarding() {
    const r = await admin(); await login(r); await sleep(400);
    await r.wheel(330, { x: 780, y: 560, ms: 10 }); await sleep(400);
    await r.rec(); await sleep(700);
    await r.click("#selected-card"); await sleep(2200);
    await r.move(1000, 260, 700); await sleep(500);                 // near "Send NDA to All", not clicked
    await r.wheel(420, { x: 720, y: 600, ms: 1500 }); await sleep(1400);
    await r.click("#close-selected-modal"); await sleep(600);
    await r.click("#onboarding-card"); await sleep(2600);
    await r.wheel(300, { x: 720, y: 600, ms: 1300 }); await sleep(2200);
    return r.encode(OUT + "/onboarding.mp4", { poster: 1.6 });
  },

  // 6. Create an interview link for a candidate
  async create() {
    const r = await admin(); await login(r);
    await r.goto(APPURL + "/");                       // a returning user: jobs load with the page
    await r.waitFor("document.querySelectorAll('#interview-job-select option').length > 1", 10000); await sleep(400);
    await r.rec(); await sleep(600);
    await r.click("#nav-create-interview"); await sleep(900);
    await r.select("#interview-job-select", await r.js(`[...document.querySelectorAll('#interview-job-select option')].find(o=>o.textContent.includes('PE Internship'))?.value`));
    await sleep(1200);
    await r.type("#interview-candidate-name", "Candidate 74", { delay: 60 });
    await r.type("#interview-candidate-email", "candidate74@example.com", { delay: 45 });
    await sleep(400);
    await r.click("#generate-link-btn");
    await r.waitSel("#generated-link-section", 8000); await sleep(800);
    await scrollTo(r, `document.querySelector('#generated-link-section')`, 260, 1000); await sleep(2400);
    return r.encode(OUT + "/create.mp4", { poster: 16.5 });
  },

  // 7. The candidate's side: resume, camera check, intro, timed answer, done
  async candidate() {
    seed("--fresh", "73");
    const mocks = [
      [/\/api\/s3upload\/(resume|video)\/[^/]+\/complete/, (p, ok) => ok(JSON.stringify({ message: "ok", recordingId: 0, s3Key: "demo" }))],
      [/\/api\/email\/send-email-open/, (p, ok) => ok(JSON.stringify({ success: true }))],
    ];
    const r = await new Rec({ width: 1440, height: 900, dsf: 1.25, fakeMedia: true, mocks }).start();
    await r.tz();
    await r.goto(APPURL + "/candidate.html?token=demo-candidate-0073");
    await r.waitSel("#resume-section", 10000); await r.move(640, 600, 10);
    await r.rec(); await sleep(1300);
    // resume
    const doc = await r.send("DOM.getDocument", {});
    const node = await r.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#resume-input" });
    await r.move(640, 330, 700);
    await r.send("DOM.setFileInputFiles", { nodeId: node.result.nodeId, files: [path.join(MEDIA, "candidate-73-resume.pdf")] });
    await r.js(`document.querySelector('#resume-input').dispatchEvent(new Event('change',{bubbles:true}))`); await sleep(1300);
    await r.click("#upload-resume-btn");
    await r.waitSel("#camera-audio-section", 10000); await sleep(1400);
    await r.wheel(260, { x: 720, y: 600, ms: 900 }); await sleep(1800);       // microphone meter
    await r.wheel(-400, { ms: 500 });
    await r.click("#continue-to-intro-btn"); await sleep(2800);
    await r.click("#start-btn"); await sleep(3400);   // the question, asked on video
    await r.click("#record-answer-btn"); await sleep(2600);     // thinking-time countdown
    await r.click("#start-recording-btn"); await sleep(4200);   // recording
    await r.click("#stop-recording-btn"); await sleep(1000);
    await r.click("#submit-recording-btn");
    await r.waitFor("document.getElementById('question-title')?.textContent.startsWith('Question 2')", 15000); await sleep(1600);
    // answer the rest off camera, then come back for the last screen
    r.pause();
    for (let q = 2; q <= 3; q++) {
      await r.js("document.getElementById('record-answer-btn').click()"); await sleep(600);
      await r.js("document.getElementById('start-recording-btn').click()"); await sleep(1500);
      await r.js("document.getElementById('stop-recording-btn').click()"); await sleep(700);
      await r.js("document.getElementById('submit-recording-btn').click()");
      await r.waitFor(q < 3 ? "document.getElementById('question-title')?.textContent.startsWith('Question 3')" : "!document.getElementById('thankyou-section').classList.contains('hidden')", 15000);
      await sleep(500);
    }
    await r.rec(); await r.move(900, 640, 700); await sleep(2800);
    return r.encode(OUT + "/candidate.mp4", { poster: 21 });
  },
};

(async () => {
  for (const name of process.argv.slice(2)) {
    const t0 = Date.now();
    try {
      const rec = await CLIPS[name]();
      const st = fs.statSync(OUT + "/" + name + ".mp4");
      console.log(`${name}: ${rec.frames} frames, ${(st.size / 1e6).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    } catch (e) { console.log(name, "FAILED:", e.message); }
    for (const r of Rec.all.splice(0)) { if (r.errors.length) console.log("  page notes:", r.errors.join(" | ").slice(0, 600)); await r.close(); }
  }
  process.exit(0);
})();
