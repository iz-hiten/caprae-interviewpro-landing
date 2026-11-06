# Recording the InterviewPro videos

The videos in `prototypes/draft-1/a/video/` are the real InterviewPro app (the code in
`caprae-capital-interview-pro-main`), run locally against a throwaway database filled with made-up
data, driven in Chrome and screen-recorded. Re-run this after the app changes.

**Nothing real is used or touched:** people are "Candidate 1…73" with `example.com` emails and
555 phone numbers; the camera is a silhouette and the microphone is noise (`make-media.py`).
The app runs with dummy AWS keys, a fake bucket and every outbound request sent to a dead proxy,
so it can't reach S3, n8n, email or AI services. In Chrome, every request that isn't local is
blocked; storage uploads and the confirmation email are answered by the recorder (`rec.js`).
Never click Send / Send NDA while recording.

## Steps (Windows, PowerShell for npm/prisma)
1. Database: `docker run -d --name interviewpro-demo-db -e POSTGRES_USER=demo -e POSTGRES_PASSWORD=demo -e POSTGRES_DB=interviewpro_demo -p 127.0.0.1:55491:5432 postgres:16`
2. App: in the app folder, `npm install`, then with
   `$env:DATABASE_URL="postgresql://demo:demo@127.0.0.1:55491/interviewpro_demo"`:
   `npx prisma generate` and `npx prisma db push` (the repo's migrations lag its schema).
3. Media: `uv run --with numpy --with pillow --with imageio-ffmpeg python tools/recording/make-media.py`,
   then serve it: `python -m http.server 8099 --bind 127.0.0.1` from `tools/recording/media`
   (the seed points the intro and question videos at `http://127.0.0.1:8099/`).
4. Start the app on port 80 so links read `http://interviewpro.example/…` (Chrome maps that name
   to 127.0.0.1). Same PowerShell window, set:
   `PORT=80`, the `DATABASE_URL` above, `JWT_SECRET=demo-only-secret`, `DEEPGRAM_API_KEY=demo-not-real`,
   `AWS_ACCESS_KEY_ID=DEMOKEYNOTREAL`, `AWS_SECRET_ACCESS_KEY=demo-not-real`, `AWS_REGION=us-east-1`,
   `AWS_SHARED_CREDENTIALS_FILE=C:\nonexistent\credentials`, `AWS_CONFIG_FILE=C:\nonexistent\config`,
   `AWS_EC2_METADATA_DISABLED=true`, `S3_BUCKET_NAME=demo-bucket-not-real`, `S3_PERMANENT_BUCKET_NAME=demo-perm-not-real`,
   `HTTP_PROXY`/`HTTPS_PROXY`/`http_proxy`/`https_proxy=http://127.0.0.1:9`, `NO_PROXY`/`no_proxy=localhost,127.0.0.1`,
   `FRONTEND_URL=http://interviewpro.example`, then `node src/index.js`.
5. Record (each clip reseeds the database first, so numbers match: 72 interviews, 47 submitted,
   47 applicants this week):
   `$env:FFMPEG="<path to ffmpeg>"; node tools/recording/clips.js dashboard applicants create candidate review score onboarding`
   The hero cut starts after sign-in: `ffmpeg -ss 8 -i dashboard.mp4 … dashboard-hero.mp4` (see the root README).
6. Check a clip: `python tools/recording/sheet.py prototypes/draft-1/a/video/score.mp4 1.5` → contact sheet in `out/`.
7. Test the site end to end (with the site served on :5180): `node tools/recording/e2e.js`.

`seed-demo.cjs` refuses to run unless `DATABASE_URL` is the local demo database.
