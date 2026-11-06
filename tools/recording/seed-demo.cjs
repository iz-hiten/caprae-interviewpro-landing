// Demo seed for recording the InterviewPro UI. ONLY made-up data: "Candidate N", example.com
// emails, 555 phone numbers. Wipes and refills the throwaway demo database every run.
//   node seed-demo.cjs            → full demo state
//   node seed-demo.cjs --fresh N  → also add one fresh PENDING interview for the candidate clip
const APP = (process.env.APP_DIR || "C:/Users/KIIT/Downloads/caprae-capital-interview-pro-main/caprae-capital-interview-pro-main") + "/node_modules/";
const { PrismaClient } = require(APP + "@prisma/client");
const bcrypt = require(APP + "bcryptjs");
const crypto = require("crypto");
if (!/127\.0\.0\.1:55491\/interviewpro_demo/.test(process.env.DATABASE_URL || "")) {
  console.error("Refusing to run: DATABASE_URL is not the local demo database."); process.exit(1);
}
const prisma = new PrismaClient();

// deterministic randomness so every recording sees the same data
let s = 20261106;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const DAY = 864e5, now = Date.now();
const ago = (d, h = 0) => new Date(now - d * DAY - h * 36e5);
const tok = () => crypto.randomBytes(16).toString("hex");
const appId = n => "DM" + String(n).padStart(4, "0"); // 6 characters, like the app's own IDs

const JOBS = [
  { title: "PE Internship", role: "Private Equity", type: "INTERNSHIP", n: 30,
    desc: "Demo role: deal sourcing, research and outreach support.",
    qs: ["Why private equity, and why a firm like ours?", "Walk us through a business you would want to buy, and why.", "Tell us about a time you had to learn something fast."] },
  { title: "Research Internship", role: "Research", type: "INTERNSHIP", n: 18,
    desc: "Demo role: market and industry research.",
    qs: ["How would you size the market for a niche services business?", "Tell us about a piece of research you are proud of.", "How do you check that a source is reliable?"] },
  { title: "Business Development Associate", role: "Business Development", type: "FULL_TIME", n: 14,
    desc: "Demo role: outreach to business owners.",
    qs: ["How would you open a first call with a business owner?", "Tell us about a time you were told no and kept going.", "What does a good week look like in this role?"] },
  { title: "Strategic Marketing Internship", role: "Marketing", type: "INTERNSHIP", n: 10,
    desc: "Demo role: content and campaigns.",
    qs: ["Pick a brand you think explains itself well. Why does it work?", "How would you measure whether a campaign worked?", "Tell us about something you wrote that people read."] },
];
// 72 interviews: 47 submitted, 9 pending, 3 in progress, 6 selected, 4 rejected, 3 onboarding
const STATUSES = [].concat(
  Array(47).fill("COMPLETED"), Array(9).fill("PENDING"), Array(3).fill("IN_PROGRESS"),
  Array(6).fill("SELECTED"), Array(4).fill("REJECTED"), Array(3).fill("ONBOARDING"));

const TRANSCRIPTS = [
  "I'd start with why I want to work on small business acquisitions. Most of these companies are run by founders who built them over twenty years, and the hardest part of a deal is earning their trust. I've spent the last year reading about search funds and I want to learn how a deal comes together, from the first call to the close.",
  "The business I'd want to buy is a commercial cleaning company with recurring contracts. Revenue of maybe three million, most of it under multi-year agreements. The first thing I'd check is customer concentration, then whether the owner is the business, meaning whether the team could run it without them.",
  "In my last internship I had to learn SQL in about two weeks to build a report the team needed. I broke it into small pieces, asked one question a day to an engineer, and shipped the first version in ten days. It wasn't perfect, but it was used every week after that.",
];
const EVAL = [
  [86, "Clear reason for applying; connects interest to the work.", "Could be more specific about what they have done so far."],
  [82, "Structured answer; names the first two checks a buyer would make.", "Light on risks and how to test them."],
  [74, "Concrete example with a timeline and an outcome.", "Doesn't say what they would do differently."],
];

async function main() {
  // wipe (order matters for FKs)
  await prisma.recording.deleteMany(); await prisma.interview.deleteMany();
  await prisma.applicant.deleteMany(); await prisma.jobQuestion.deleteMany();
  await prisma.job.deleteMany(); await prisma.user.deleteMany();

  const admin = await prisma.user.create({ data: { email: "admin@example.com", name: "Demo Admin", role: "ADMIN", password: await bcrypt.hash("demo-pass-2026", 10) } });
  await prisma.user.create({ data: { email: "interviewer1@example.com", name: "Interviewer 1", role: "INTERVIEWER", password: await bcrypt.hash("demo-pass-2026", 10) } });
  await prisma.user.create({ data: { email: "interviewer2@example.com", name: "Interviewer 2", role: "INTERVIEWER", password: await bcrypt.hash("demo-pass-2026", 10) } });

  const jobs = [];
  for (const [ji, J] of JOBS.entries()) {
    const job = await prisma.job.create({ data: { title: J.title, role: J.role, description: J.desc, type: J.type, createdBy: admin.id, createdAt: ago(40 - ji) } });
    await prisma.jobQuestion.create({ data: { jobId: job.id, text: "Introduction", videoUrl: "http://127.0.0.1:8099/intro.webm", prepSeconds: 10, answerSeconds: 0, questionOrder: 0 } });
    for (const [qi, q] of J.qs.entries())
      await prisma.jobQuestion.create({ data: { jobId: job.id, text: q, videoUrl: `http://127.0.0.1:8099/qc/j${ji}q${qi + 1}.webm`, prepSeconds: 30, answerSeconds: qi === 2 ? 90 : 120, questionOrder: qi + 1 } });
    jobs.push({ ...J, id: job.id });
  }

  // shuffle statuses deterministically, then hand out candidates 1..72 across jobs
  const st = STATUSES.slice(); for (let i = st.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [st[i], st[j]] = [st[j], st[i]]; }
  // keep the candidates we open in the films predictable
  for (const k of [2, 6]) if (st[k] !== "COMPLETED") { const j = st.findIndex((x, i) => x === "COMPLETED" && i !== 2 && i !== 6); [st[k], st[j]] = [st[j], st[k]]; }
  const jobFor = []; jobs.forEach(J => { for (let k = 0; k < J.n; k++) jobFor.push(J); });
  for (let i = jobFor.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [jobFor[i], jobFor[j]] = [jobFor[j], jobFor[i]]; }
  jobFor[2] = jobs[0]; jobFor[6] = jobs[0];

  let graded = 0;
  for (let i = 0; i < 72; i++) {
    const n = i + 1, J = jobFor[i], status = st[i];
    const email = `candidate${n}@example.com`;
    // the first 47 applied this week; the rest over the previous weeks
    // the app's date range ends at midnight UTC, so "this week" = between ~1.2 and ~6.4 days ago
    const applied = n <= 47 ? new Date(now - (1.2 + rnd() * 5.2) * DAY) : ago(int(8, 24), int(0, 20));
    const createdAt = new Date(applied.getTime() + int(2, 20) * 36e5);
    const cap = t => new Date(Math.min(t, now - 36e5));
    const done = ["COMPLETED", "SELECTED", "REJECTED", "ONBOARDING"].includes(status);
    let prep = 0, comm = 0, mission = 0, final = 0, ai = null, scoredBy = null;
    if (done) ai = status === "REJECTED" ? int(38, 55) : status === "COMPLETED" ? int(52, 90) : int(80, 94);
    const grade = (lo, hi) => { prep = int(lo, hi); comm = int(lo, hi); mission = int(lo, hi); final = Math.round(prep * .4 + comm * .35 + mission * .25); };
    if (status === "SELECTED" || status === "ONBOARDING") { grade(8, 10); if (final < 8) { prep = comm = mission = 9; final = 9; } }
    if (status === "REJECTED") { grade(2, 4); }
    if (status === "COMPLETED" && n !== 3 && n !== 7 && graded < 30) { grade(5, 7); if (final >= 8) final = 7; graded++; }
    if (final) scoredBy = pick(["Demo Admin (ADMIN)", "Interviewer 1 (INTERVIEWER)", "Interviewer 2 (INTERVIEWER)"]);

    const applicant = await prisma.applicant.create({ data: {
      id: appId(n), firstName: "Candidate", lastName: String(n), email, phone: `+1 555 01${String(n % 100).padStart(2, "0")}`,
      school: `University ${1 + (n % 9)}`, country: pick(["United States", "India", "United Kingdom", "Canada", "Singapore"]),
      position: J.title, whereDidYouHearAboutUs: pick(["LinkedIn", "Referral", "Job board", "Campus event"]),
      cvLink: `https://example.com/cv/candidate-${n}.pdf`, appliedWhen: applied, jobId: J.id,
      handbookLink: done || status === "IN_PROGRESS" || rnd() < .5 ? `https://example.com/handbook/candidate-${n}` : null,
      handbookStatus: done || status === "IN_PROGRESS" || status === "PENDING" ? "pass" : pick(["submitted", "not submitted", "fail"]),
      handbookGrade: done || status === "PENDING" || status === "IN_PROGRESS" ? int(7, 10) : null,
      ...(J.title.includes("Research") ? { handbook2Status: done ? "pass" : pick(["submitted", "not submitted"]), handbook2Grade: done ? int(7, 10) : null } : {}),
      typeOfInterview: done || status === "PENDING" || status === "IN_PROGRESS" ? (rnd() < .85 ? "prerecorded" : "live") : null,
      interviewStatus: status === "COMPLETED" ? (final ? "completed" : "completed") : status === "SELECTED" || status === "ONBOARDING" ? "pass" : status === "REJECTED" ? "fail" : status === "PENDING" || status === "IN_PROGRESS" ? "pending" : null,
      interviewGrade: final || null,
      ndaStatus: status === "ONBOARDING" ? "signed" : status === "SELECTED" ? "sent" : null,
    } });

    const interview = await prisma.interview.create({ data: {
      jobId: J.id, candidateName: `Candidate ${n}`, candidateEmail: email, token: tok(), status, createdBy: admin.id,
      createdAt, expiresAt: new Date(createdAt.getTime() + 7 * DAY),
      startedAt: status !== "PENDING" ? cap(createdAt.getTime() + int(2, 6) * 36e5) : null,
      completedAt: done ? cap(createdAt.getTime() + int(6, 30) * 36e5) : null,
      resumeFileId: status !== "PENDING" ? `demo-resume-${n}` : null, resumeFileName: status !== "PENDING" ? `candidate-${n}-resume.pdf` : null,
      resumeS3Key: status !== "PENDING" ? `demo/resumes/candidate-${n}.pdf` : null, resumeMimeType: "application/pdf",
      aiScore: ai, interviewScore: final, preparationScore: prep, communicationScore: comm, missionDrivenScore: mission,
      scoredByName: scoredBy, scoreUpdatedAt: scoredBy ? ago(int(0, 3)) : null, applicantId: applicant.id,
      ndaFormStatus: status === "ONBOARDING" ? "ACCEPTED" : status === "SELECTED" ? "SENT" : "NOT_SENT",
      ndaFormSentAt: status === "ONBOARDING" || status === "SELECTED" ? ago(1) : null,
      ndaReceivedAt: status === "ONBOARDING" ? ago(0, 5) : null, ndaFormSubmittedAt: status === "ONBOARDING" ? ago(0, 5) : null,
    } });

    const recs = done ? 3 : status === "IN_PROGRESS" ? 1 : 0;
    for (let q = 0; q < recs; q++) {
      const full = n === 3 || n === 7 || rnd() < .3; // a few carry transcript + AI notes
      await prisma.recording.create({ data: {
        interviewId: interview.id, questionIndex: q, questionText: J.qs[q], fileUrl: `https://demo-media.invalid/rec/${n}-${q}.webm`,
        fileName: `candidate-${n}-q${q + 1}.webm`, fileSize: int(4, 12) * 1048576, duration: int(55, 118), mimeType: "video/webm",
        s3Key: `demo/videos/candidate-${n}-q${q + 1}.webm`, createdAt: interview.completedAt || createdAt,
        ...(full && done ? { transcription: TRANSCRIPTS[q], transcriptionStatus: "completed", aiScore: EVAL[q][0] - (n % 5), strength: EVAL[q][1], weakness: EVAL[q][2] } : {}),
      } });
    }
  }

  const fresh = process.argv.indexOf("--fresh");
  if (fresh > 0) {
    const n = Number(process.argv[fresh + 1] || 73);
    await prisma.interview.create({ data: { jobId: jobs[0].id, candidateName: `Candidate ${n}`, candidateEmail: `candidate${n}@example.com`, token: "demo-candidate-" + String(n).padStart(4, "0"), status: "PENDING", createdBy: admin.id } });
  }
  const c = await prisma.interview.groupBy({ by: ["status"], _count: true });
  console.log("interviews:", Object.fromEntries(c.map(x => [x.status, x._count])), "applicants:", await prisma.applicant.count(),
    "this week:", await prisma.applicant.count({ where: { appliedWhen: { gte: ago(7) } } }));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
