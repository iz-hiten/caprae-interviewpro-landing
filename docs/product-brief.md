# Product brief: the InterviewPro landing page

Read this before building a prototype. Everything here is taken from the InterviewPro code
(`caprae-capital-interview-pro-main`, plus the live app at interview.saasquatchleads.com) or from
capraecapital.com (local copy: `Downloads\capraecapital-site-copy\capraecapital-site\site`,
checked against the live site on 2026-11-05). If a line isn't backed by one of those, it isn't here.

## What InterviewPro is, in one breath
The hiring platform Caprae Capital built to run its own recruiting: a candidate gets one link,
uploads a resume and records video answers in the browser; the hiring team sees every answer
transcribed and pre-scored, scores it on three things that matter to a finance firm, and moves
the person from application through a handbook, the interview, the NDA and onboarding,
all in one place.

## Open decision: who the page is for (needs an answer before Draft 1)
The code tells us what the product does, not who it's sold to. Three readings, each backed by a fact:
1. **Teams that hire at volume in finance** (searchers, small PE firms, deal teams hiring interns
   and associates). Competitor pages (Hireflix, Spark Hire, Willo, HireVue) all sell to this buyer.
2. **Caprae's own clients after they buy a company.** Caprae's Post-Acquisition Strategy service
   includes "team expansion planning" (capraecapital.com/services/post-acquisition-strategy).
3. **Candidates applying to Caprae** (a careers front door). The site has two intern stories in
   Field Notes ("Summer at Caprae", "Unlearning School in 20 Weeks").

The content sheet is written for reading 1 and keeps the facts neutral, so it works for 2 with
small changes. Pricing and availability are **not** stated anywhere: don't invent them.

## Rules for the copy
- Say what it **saves** and **gives** the hiring team and the candidate, not the tech.
- Never use internal words on the page: no n8n, webhook, S3, Deepgram, Gemini, Prisma, Tally, Calendly,
  "token", "L1/L2", "handbook PE4", "buyside status", or the source names (Kintara, Simba, CCK).
  Say "handbook" (the word the app and its emails use for the take-home assignment),
  "recorded interview", "live interview", "your hiring team", "AI notes".
- No numbers about InterviewPro itself (hires made, time saved, candidates screened): none exist yet.
  Numbers on the page are Caprae Capital's, and say so.
- The AI helps, people decide: the AI score is shown next to the human score and never replaces it
  (true in the code: the status changes only when a person saves a score).

## What the hiring team gets (from the code)
- **One link per candidate.** No account for the candidate. The link works for 7 days by default.
  Create one, or invite a whole list at once (Create Interview → Bulk Invite).
- **Interviews built per role.** A job has a title, type (full-time, part-time, internship, contract,
  freelance), a description, an intro video recorded by the team, and its own questions, each with
  its own thinking time and answer time.
- **Every answer, already read.** Each recorded answer is transcribed, and an AI reads it and gives a
  score with strengths and weaknesses. The interview shows the average as an AI score out of 5.
- **Scoring that matches what we look for.** A person scores Preparation, Communication and
  Mission from 0 to 10; the final score is weighted 40 / 35 / 25. Who scored and when is saved.
  A final score of 8+ marks the candidate Selected; under 5, Rejected.
- **The whole pipeline, one table.** Applicants arrive (from the application email or an Excel/CSV
  import), get a handbook, are graded, take a recorded or live interview, sign the NDA and move
  to onboarding. Each step has a status, and one click sends the right email.
- **Live interviews too.** For live interviews, the candidate is sent the next interviewer's booking
  link, taking turns so no interviewer gets all of them.
- **Emails written for you.** Invites, reminders (48 hours, 24 hours, day-of), a nudge for unfinished
  interviews, thank-you, expired, rejected and selected notes; preview and edit before sending,
  one at a time or in bulk.
- **Team access.** Admins add interviewers, who can score but not manage users.

## What the candidate gets (from the code)
Resume upload → camera and microphone check (with a sound meter) → instructions and the team's
intro video → for each question: thinking time, then recording, then the next question → a
confirmation email. All in the browser; nothing to install.

## How we differ from other interview tools
Most tools (Hireflix, Spark Hire, Willo, HireVue) cover one step: the recorded interview, or the
assessment, or the applicant tracking. InterviewPro was built by a finance firm around its own
steps: handbook, recorded interview, scoring on preparation / communication / mission, NDA,
onboarding. Full list: `competitors/index.html`.

## Facts about Caprae Capital we can use (capraecapital.com)
- End-to-end, white-labeled private equity services for buyers of small and mid-size businesses.
- $110M+ deals closed (2026 YTD); $50M+ sourced and diligenced (2025); 8 countries serviced;
  10–20 owner engagements a month; 30–60% less than traditional providers.
- Founded 2025 by Kevin Hong and Zackary Beckham. HQ: 611 N Brand Blvd, Glendale, California.
  Phone: +1 818-636-0839. Contact page: "We'll get back to you within 24 hours."
- Tagline: "Rapid Growth, Simplified."
- Brand: black (#0A0A0A / #1A1A1A) and gold (#F9D360); fonts Cormorant Garamond, Inter, Newsreader.

## Things to confirm with the team (found while reading)
- Live app vs repo: the live site has applicant **sources** and source-aware actions the repo doesn't.
  Take screenshots from the live version (with demo data), not the repo.
- Work-sample deadline: emails set 7 days (`deadline_days=7`); the intake check talks about 72 hours.
- Team page vs llms.txt: Zackary Beckham is "Founder" on /team, "Co-Founder" elsewhere; Eric Nehrlich
  is "Executive Coach" on /team, "Chief of Staff" elsewhere. Use whichever Caprae confirms.
