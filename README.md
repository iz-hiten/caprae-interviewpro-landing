# InterviewPro landing page prototypes

Static HTML, deployed on Vercel, for seniors to compare landing page ideas for InterviewPro,
the hiring platform Caprae Capital built (live app: interview.saasquatchleads.com).
Same setup as `caprae-crm-landing`.

```
index.html              gallery: one card per prototype (live thumbnail + version links)
prototypes.js           THE list of prototypes and their versions
prototypes/<slug>/<version>/   a whole small site per version (own pages, style.css, img/)
shared/switcher.js      the floating A / B / C bar on every version page (V hides/shows it)
competitors/index.html  competitor sheet: 34 tools + today's DIY setup, each checked live, with how their landing page is built
content.html            content sheet: all the site's words, page → section (tools/build_content_text.py)
content-sources.html    every line with its source and ⚠ checks (tools/build_content_sheet.py)
docs/product-brief.md   what InterviewPro does, from the hiring team's and candidate's side; open decisions
docs/content-plan.md    what each page and section is for
docs/buyer-lens.md      what the buyer would love; every line of copy is written against it
tools/                  extract.py + the two sheet builders; tools/recording/ makes the videos and runs the end-to-end test
vercel.json             keeps .html links (tidy links would break relative paths)
serve.json              same for `bunx serve` locally
```

## Where the content comes from
Only three places, and every line in `content-sources.html` says which:
- the InterviewPro code (`Downloads\caprae-capital-interview-pro-main`) and the live app,
- capraecapital.com (local copy: `Downloads\capraecapital-site-copy\capraecapital-site\site`;
  its `llms.txt` matched the live site on 2026-11-05),
- the competitor research in `competitors/index.html`.
Anything else is marked "Our wording" (plain copy, no outside claim). ⚠ marks lines to confirm.
Read the "Still to decide" box in `content-sources.html` first: audience, pricing, name/domain.

## Pages per version
`index.html` (Home), `features.html`, `how-it-works.html`, `candidates.html` (For candidates),
`contact.html` (About & contact), plus
`privacy.html` and `terms.html` copied word for word from capraecapital.com (only links and colours
changed, own `legal.css`). No blog and no results page on purpose: see `docs/content-plan.md`.

## Add a version or a prototype
- New prototype: create `prototypes/<slug>/a/` with the pages above, add to each page
  `<script src="../../../prototypes.js"></script>` and
  `<script src="../../../shared/switcher.js" data-proto="<slug>"></script>`, then add an entry to `prototypes.js`.
- New version: copy `prototypes/<slug>/a/` to `prototypes/<slug>/b/`, change it, and add
  `{ id: "b", note: "…" }` to that prototype in `prototypes.js`.

## Draft 1
`prototypes/draft-1/a/`: light pages in the app's own colours (paper `#fafbfc`, ink `#0a0a0a`,
amber `#fbbf24` for actions only); headings in Newsreader, body in Inter. The Home hero is dark and
fits the first screen; its pictures are stills of the real app (`img/hero/`, taken with
`tools/recording` at 2x, no pointer). Features, How it works and For candidates use stills too
(`img/steps/`). No page plays video in this round.
- Recordings: **real recordings of the InterviewPro app**, moved to `recordings/` at the top of the repo (not used on any page this round) with made-up demo data (Candidate 1…73,
  example.com emails, a silhouette on camera): dashboard, Weekly Applicants, create an interview,
  the candidate's side, review, scoring, selected → onboarding. H.264 MP4 + a poster JPG each,
  ~4.4 MB in all. `dashboard-hero.mp4` is `dashboard.mp4` from 8 s (after sign-in):
  `ffmpeg -ss 8 -i dashboard.mp4 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an dashboard-hero.mp4`.
  How they were made and how to re-record: `tools/recording/README.md`.
- `main.js`: videos play muted only while on screen (click to pause; posters only with reduced
  motion), menu, reveals,
  and the contact form (prototype: it only says thanks).

## Draft 2: Paper and ink
`prototypes/draft-2/a/`: the same five pages and the same words as Draft 1, in a calmer, editorial
design. Warm paper (`#f5f3ee`), ink (`#1b1b18`), Caprae gold (`#f9d360`) as a small accent;
headlines in Instrument Serif, body in Geist, labels in Geist Mono. A floating rounded nav.
Home hero: a centred serif headline with small real-app pictures set into the line (Cal.com's pattern),
the app rising underneath (Loom's). References (looked at in Chrome on 2026-11-06): Granola (mood, serif type, the sticky step index on
Home and How it works), Mercury (Features: a list that swaps the picture), Tella (soft panels around
screenshots). Motion is gentle only: fade-ins, picture cross-fades, the sticky index, the score bars
filling once. Pictures are the same real-app stills (`img/`); no video.

## Draft 3: Blueprint
`prototypes/draft-3/a/`: all five pages plus legal, modelled on myrefactory.com (studied in Chrome on
2026-11-06). Black, Roboto for words, Roboto Mono uppercase for labels and buttons, grey body copy,
#111 cards with #212121 icon tiles. Their orange is replaced by Caprae gold (#f9d360).
Linework is built the way theirs is: tick rings and belts are thick strokes with a tiny dash
(`2.3 6.3`); the protractor is a thin circle plus a wide sparse-dash copy; a gold copy of each tick band
shows through a mask whose short dash moves along the path (time + scroll, `main.js`); dashed
"beams" carry a gradient that slides along via SVG `<animate>`; wireframe spheres turn with scroll.
The SVGs are generated by the page builder (`hero_lines`, `page_lines`, `orbit`).
Their 3D scroll story became a pinned "How it works" on Home with real app screenshots; their project
carousel holds the five features; their timeline/ruler, "who it's for" cards, impact cards,
"materials" layout, mission statement, grid-line CTA and notched footer card are used for our content.

## Draft 4: Clean product
`prototypes/draft-4/a/`: the CRM landing's Draft 3 template (`caprae-crm-landing/prototypes/draft-3`),
used for InterviewPro. Its `style.css` and `main.js` were copied as they are, with InterviewPro pieces
added at the end of `style.css`. White and calm, Geist with Cormorant Garamond titles inside app windows,
black buttons, gold only as an accent. Every app screen (dashboard, candidate portal, Weekly Applicants,
create interview, AI evaluation, score window, selected/onboarding lists) is rebuilt in HTML with the
demo data from `tools/recording/seed-demo.cjs` (Candidate 1…73, the four demo jobs and their questions,
the demo transcripts and AI notes), not screenshots. Template modules used: hero with a framed app,
proof row, sticky step list beside scrolling windows, bento cards with captions, dark section, FAQ,
closing panel, form beside answers. Words are the approved content, unchanged.

## Content sheets
Generated from the pages, so re-run them after any copy change:

    uv run --with beautifulsoup4 python tools/build_content_text.py prototypes/draft-1/a
    uv run --with beautifulsoup4 python tools/build_content_sheet.py prototypes/draft-1/a

New claims need a rule in `RULES` (top of `build_content_sheet.py`) pointing at their source.

## Run locally
Open `index.html` directly, or serve the folder: `bunx serve .`

## Deploy
`bunx vercel` from this folder (first time: link the project; framework preset "Other", no build
command, output directory `.`), then `bunx vercel --prod`. Or push to GitHub and import in Vercel.
