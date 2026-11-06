# Recordings of the real InterviewPro app (not used on the site right now)

Screen recordings of the InterviewPro app, run locally with made-up demo data
(Candidate 1…73, example.com emails, 555 phone numbers, a silhouette on camera). No real candidate data.
Each clip is an H.264 MP4 (muted, 1600×1000) with a poster JPG of the same name.

| File | What it shows |
|---|---|
| `dashboard.mp4` | Signing in, then the admin dashboard: 72 interviews, 47 submitted, and the interview cards |
| `dashboard-hero.mp4` | `dashboard.mp4` from 8 s on (after sign-in), only the dashboard |
| `applicants.mp4` | Weekly Applicants: fetching this week's 47 applicants, scrolling the columns, searching |
| `create.mp4` | Create an interview: choosing a job, previewing its questions, generating a candidate's link |
| `candidate.mp4` | The candidate's side: resume, camera and mic check, intro video, a question, thinking time, recording, completion |
| `review.mp4` | Opening a candidate's recordings: the transcript, then the AI evaluation |
| `score.mp4` | Scoring an interview: 9, 8 and 8 give a final 8, Selected |
| `onboarding.mp4` | The Selected Candidates list, then the Onboarding list with NDA dates |

To use one on a page, copy it into that version's folder (for example `prototypes/draft-1/a/video/`) and
point a `<video>` at it. How these were made and how to re-record them: `tools/recording/README.md`.
