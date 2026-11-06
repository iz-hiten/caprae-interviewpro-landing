# Content plan: what each page and section is for

Written before building, so every section has a job. The words themselves are in `content.html`; each
line's source is in `content-sources.html` (both generated from the pages). Why each line is
there: `buyer-lens.md`. Facts come from the InterviewPro code and capraecapital.com only.

## The reader's head (default audience: a small finance team hiring interns and associates)
What they worry about:
1. **"Hiring eats our week."** Every first conversation is a calendar slot; most go nowhere.
2. **"It lives in five places."** Inbox, form, calendar, spreadsheet, chat. Things get dropped.
3. **"We judge people differently."** Two interviewers, two standards.
4. **"Will good candidates bother?"** A clunky process loses the best ones.
5. **"Can we trust an AI score?"** They want help reading answers, not a robot deciding.
What they want: fewer wasted calls, one place, one standard, a candidate experience that feels
professional, and to stay in control.

## Facts, and what each one means to the reader
| Fact (source) | Shown as | Why the reader should care |
|---|---|---|
| Token link, no candidate login, 7-day expiry (schema, candidate.html) | "One link. No account." | Candidates finish instead of dropping off. |
| Prep + answer timer per question (schema, Create Job) | "Think, then record" | Fair to candidates; same conditions for all. |
| Transcription + AI score, strengths, weaknesses (recordings.js, upload.js) | "Already read" | Skim a transcript instead of watching every minute. |
| Prep / Comm / Mission 0–10, weighted 40/35/25 (interviews.js, score modal) | "Judged the same way" | One standard across interviewers. |
| Status changes only on a human score (interviews.js) | "A person decides" | Answers the AI-trust worry. |
| Handbook → interview → NDA → onboarding (automation.js, nda.js) | "One record" | Nothing falls between tools. |
| Live-interview booking link, interviewers take turns (pipeline docs) | "Live interviews too" | Works for roles that need a real conversation. |
| 9 follow-up email types, bulk send, preview (index.html) | "Emails, written for you" | No chasing by hand. |
| Caprae: $110M+ closed, 8 countries, 10–20 engagements/month (capraecapital.com) | "Built by Caprae Capital" | The firm behind it does serious deal work. |

## Pages (five + legal), decided 2026-11-06 from competitor sites
Checked Spark Hire, Willo, Hireflix, Hirevire, Truffle, Interviewer.AI, VidCruiter and HireVue. Left out what
we can't fill truthfully: customer logos, testimonials, results, pricing, integrations, industries, blog.
- **Home** (`index.html`): hero (stills of the real app) → the problem (3) → how it works in 4 steps →
  6 features → what sets it apart (handbook first; the AI takes notes, your team decides; the score rule) →
  built by Caprae Capital → FAQ (6) → closing ask.
- **Features** (`features.html`): recorded video interviews → transcripts and AI evaluation → scoring →
  Weekly Applicants → NDA and onboarding → emails → team roles → closing ask.
- **How it works** (`how-it-works.html`): seven steps with who does each (candidate / your team / automatic)
  → what happens automatically → closing ask.
- **For candidates** (`candidates.html`): what to expect → have these ready → five screens → candidate FAQ.
- **About & contact** (`contact.html`): Caprae Capital and why it built InterviewPro, its figures →
  contact form and details.
The app recordings are kept in `recordings/` (see its README) but not placed on any page in this round.

## Design cues
- Light first, like the app's content area (`#fafbfc`), with the app's black (`#0a0a0a`) for the
  header, video frames and one dark band; the app's amber (`#fbbf24`) only on actions and highlights;
  its green for "selected/done". Headings in Newsreader (the serif Caprae Capital's own site uses), body in
  Inter (the app's font), labels in JetBrains Mono. Navigation marks the open page with an underline only.
- The hero fits any laptop screen (height-aware type and spacing); content never runs sideways.
- Every video is a real recording in a plain window frame, labelled "Real app · demo data".
