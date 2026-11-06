"""Build content-sources.html: every text on a version's pages, each with where it came from.

    uv run --with beautifulsoup4 python tools/build_content_sheet.py prototypes/draft-1/a

Text is read straight from the pages (tools/extract.py), so the sheet can't drift from the site.
Each item is matched against RULES (first match wins). Anything with no outside source is
"Our wording". ⚠ marks a claim a source doesn't fully back, or one the team must confirm.
New claims need a rule here pointing at their source.
"""
import html
import pathlib
import re
import sys
from collections import Counter

from extract import items

APP = "caprae-capital-interview-pro-main/"
CC = "Downloads/capraecapital-site-copy/capraecapital-site/site/"
# key: (label, url, where to check, chip class)
SOURCES = {
    "candidate": ("App: candidate portal", None, APP + "public/candidate.html", "code"),
    "admin": ("App: admin portal", None, APP + "public/index.html", "code"),
    "schema": ("App: database (7-day link, timers)", None, APP + "prisma/schema.prisma", "code"),
    "score": ("App: scoring rule", None, APP + "src/routes/interviews.js (PATCH /:id/score)", "code"),
    "ai": ("App: transcripts + AI notes", None, APP + "src/routes/recordings.js, src/routes/upload.js (/evaluate)", "code"),
    "emails": ("App: follow-up emails", None, APP + "public/index.html #fu-type; src/routes/email.js", "code"),
    "pipeline": ("App: hiring pipeline + automation", None, APP + "src/routes/automation.js; PIPELINE_1-4 docs", "code"),
    "nda": ("App: NDA + onboarding", None, APP + "src/routes/nda.js; src/routes/webhooks.js", "code"),
    "auth": ("App: users and roles", None, APP + "src/middleware/auth.js; Manage Users", "code"),
    "live": ("Live app", "https://interview.saasquatchleads.com", "interview.saasquatchleads.com (checked 2026-11-05)", "live"),
    "cc_home": ("capraecapital.com: Home", "https://capraecapital.com/", CC + "index.html", "cc"),
    "cc_ai": ("capraecapital.com: AI information", "https://capraecapital.com/ai-information/", CC + "ai-information.md", "cc"),
    "cc_about": ("capraecapital.com: About", "https://capraecapital.com/about/", CC + "about/index.html", "cc"),
    "cc_contact": ("capraecapital.com: Contact", "https://capraecapital.com/contact/", CC + "contact/index.html", "cc"),
    "cc_privacy": ("capraecapital.com: Privacy", "https://capraecapital.com/privacy/", CC + "privacy/index.html", "cc"),
    "fn_summer": ("Field Notes: Summer at Caprae", "https://capraecapital.com/field-notes/post/summer-at-caprae/", CC + "field-notes/post/summer-at-caprae/", "fn"),
    "fn_unlearn": ("Field Notes: Unlearning School in 20 Weeks", "https://capraecapital.com/field-notes/post/unlearning-school-in-20-weeks-caprae-internship/", CC + "field-notes/post/unlearning-school-in-20-weeks-caprae-internship/", "fn"),
    "comp": ("Competitor research", "competitors/index.html", "competitors/index.html", "comp"),
    "demo": ("Recorded from the real app, demo data", None, "video/*.mp4: the local InterviewPro app seeded with made-up data (tools/recording)", "demo"),
    "ours": ("Our wording", None, None, "ours"),
}

# (pattern, sources, warning or None). First match wins; case-insensitive.
RULES = [
    # --- Round 4 pages
    (r"first call needs a slot|in five places|judges differently|where hiring time goes|Two calendars|Someone always falls through|two different ideas|Two people, two ideas", ["ours"], "Our framing of the buyer's problem; no survey or data behind it. Confirm it matches what Caprae hears from buyers."),
    (r"Kevin Hong|Zackary Beckham|founded in 2025", ["cc_ai", "cc_about"], "capraecapital.com lists Zackary Beckham as Founder on /team and Co-Founder elsewhere; the page says only 'founded by'."),
    (r"\$50M\+|sourced and diligenced", ["cc_about"], None),
    (r"Its steps are Caprae's steps", ["live", "pipeline"], "Confirm InterviewPro is how Caprae hires today."),
    (r"recorded once|record an answer again|Interview Not Available|refreshing the page|warns you|leave it partway|10MB|PDF, DOC|steady connection|uploads before|Retry Camera|meter shows|Start Recording|30 seconds to think|2 minutes to answer|thank-you screen|Five screens|Drag it in", ["candidate"], None),
    (r"may send you a reminder", ["emails"], None),
    (r"Taking an interview|What to expect", ["ours"], None),
    # --- Claims the team must confirm
    (r"built by Caprae Capital|Built by Caprae Capital for its own hiring|built it to recruit its own team|to run its own hiring|for its own hiring",
     ["live", "pipeline"], "Confirm InterviewPro is how Caprae hires today, and say so in the same words everywhere."),
    (r"within 24 hours", ["cc_contact"], "Caprae's own promise on its contact page; confirm it covers InterviewPro enquiries."),
    (r"next interviewer in the rotation", ["pipeline"], "The interviewer rotation runs in the n8n automation, not in the app; check it's switched on."),
    (r"from your inbox", ["pipeline"], "Inbox intake runs in the n8n automation, not in the app."),
    (r"deadline, a short tutorial and an info session", ["pipeline"], "The code has two deadlines (7 days in the emails, 72 hours in the intake check); the page prints no number."),
    (r"^Prototype: this form", ["ours"], "Connect the form to a real inbox before launch."),
    (r"^Sign in|Already using InterviewPro", ["live"], "Links to interview.saasquatchleads.com; keep that address or move it to capraecapital.com?"),
    (r"See how InterviewPro would run it", ["ours"], "Implies someone will walk a buyer through it; confirm who owns these enquiries."),
    # --- The recordings and their demo data
    (r"^Recording video/|^Still img/|Real app · demo data|Every picture is the real app|72 interviews|47 of them|47 applicants|47 submitted|Candidate 1, Candidate 2|example\.com and phone|No real candidate|made for the demo|made-up demo data|9, 8 and 8|recordings of the real app|About the demo data",
     ["demo"], None),
    # --- Caprae Capital's own facts and contact details
    (r"\$110M\+|8 countries|countries serviced|10–20 owner|30–60%|end-to-end, white-labeled private equity", ["cc_home", "cc_ai"], None),
    (r"partners@capraecapital\.com", ["cc_privacy"], None),
    (r"611 N Brand|Glendale|818-636-0839", ["cc_ai"], None),
    (r"Caprae Capital ↗|^capraecapital\.com", ["cc_home"], None),
    (r"^(Full name \*|Email \*|LinkedIn URL)$", ["cc_contact"], None),
    # --- What the app does (code)
    (r"Interview candidates on video", ["candidate", "pipeline"], None),
    (r"7 days|7-day", ["schema"], None),
    (r"One link, no account|need an account|One link|one link|nothing to install|link per candidate|their link", ["candidate", "schema"], None),
    (r"Reminder|Three templates|Nudge|Thank you|^Expired|^Rejected$|Congratulations|^Invite|Stage emails|emails it can send|previewed and edited|each name filled in|^Email$|When you'd use it|interview link\.|A clear answer|Once the answers are in|link has closed|started but not finished|For selected candidates",
     ["emails", "admin"], None),
    (r"transcri|Average out of 5|Per answer|Review Your team|AI evaluation|AI notes|AI score|out of 100|Pros and cons|strengths|Read before you watch|AI decide", ["ai"], None),
    (r"Score Your team|time limits|Preparation|Communication|Mission|40%|weighted|Weighted|Selected|Submitted|Rejected|three questions|Three-part|Score it|^Score$|scores|Scoring|who scored|Three scores", ["score", "admin"], None),
    (r"NDA|Onboarding|onboarding|signed|Offer paperwork", ["nda"], None),
    (r"[Hh]andbook", ["pipeline", "admin"], None),
    (r"Weekly Applicants|date range|Excel|CSV|spreadsheet|interview type|Search|[Ff]ilter|pipeline|Bring your list|Recorded or live|^Application", ["admin"], None),
    (r"[Dd]ashboard|every interview is counted|Recordings and resume|Every interview at a glance", ["admin"], None),
    (r"Create an interview|Choose a job|Prep and answer time|Bulk invite|interview link", ["admin", "schema"], None),
    (r"candidate|resume|camera|microphone|thinking time|countdown|record|completion screen|uploads|Resume to last answer", ["candidate"], None),
    (r"Admin|Interviewer|Two roles|Team access", ["auth"], None),
    (r"^Candidate$|^Your team$|^Automatic$", ["pipeline"], None),
]


def classify(text):
    for pattern, srcs, warn in RULES:
        if re.search(pattern, text, re.I):
            return srcs, warn
    return ["ours"], None


def chip(key):
    label, url, path, cls = SOURCES[key]
    title = html.escape(path or label, quote=True)
    inner = html.escape(label)
    if url:
        return f'<a class="src s-{cls}" href="{url}" target="_blank" rel="noopener" title="{title}">{inner}</a>'
    return f'<span class="src s-{cls}" title="{title}">{inner}</span>'


NAMES = {"index.html": "Home", "features.html": "Features", "how-it-works.html": "How it works", "candidates.html": "For candidates", "contact.html": "About & contact"}


def build(version_dir):
    rows = items(version_dir)
    for r in rows:
        r["srcs"], r["warn"] = classify(r["text"])
    counts = Counter("warn" if r["warn"] else ("ours" if r["srcs"] == ["ours"] else "sourced") for r in rows)
    pages = []
    for page in dict.fromkeys(r["page"] for r in rows):
        sections = []
        for sec in dict.fromkeys(r["section"] for r in rows if r["page"] == page):
            trs = "".join(
                f'<tr class="{"w" if r["warn"] else ""}"><td class="k">{r["kind"]}</td><td class="t">{html.escape(r["text"])}'
                + (f'<div class="warn">⚠ {html.escape(r["warn"])}</div>' if r["warn"] else "")
                + f'</td><td class="s">{"".join(chip(k) for k in r["srcs"])}</td></tr>'
                for r in rows if r["page"] == page and r["section"] == sec)
            sections.append(f"<h3>{html.escape(sec)}</h3><table><tbody>{trs}</tbody></table>")
        pages.append(f'<section id="{page.split(".")[0]}"><h2>{NAMES[page]} <small>{page}</small></h2>{"".join(sections)}</section>')
    legend = "".join(f"<li>{chip(k)}<span>{html.escape(v[2] or '')}</span></li>" for k, v in SOURCES.items())
    warns = "".join(f'<li><b>{html.escape(r["page"])}</b> · {html.escape(r["text"][:120])}<br><span>{html.escape(r["warn"])}</span></li>'
                    for r in rows if r["warn"])
    nav = "".join(f'<a href="#{p.split(".")[0]}">{p}</a>' for p in dict.fromkeys(r["page"] for r in rows))
    return TEMPLATE.format(total=len(rows), sourced=counts["sourced"], ours=counts["ours"], warn=counts["warn"],
                           legend=legend, warns=warns, pages="".join(pages), nav=nav, version=version_dir.as_posix())


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InterviewPro Content Sources</title>
  <meta name="robots" content="noindex">
  <style>
    :root {{ --bg:#f6f7f9; --card:#fff; --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --brand:#1f3864; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; background:var(--bg); color:var(--ink); font:13px/1.5 system-ui, sans-serif; }}
    header {{ position:sticky; top:0; z-index:5; display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:12px 24px; background:var(--card); border-bottom:1px solid var(--line); }}
    header a {{ color:var(--brand); text-decoration:none; font-weight:600; }}
    h1 {{ margin:0; font-size:16px; flex:1; }}
    header nav {{ display:flex; gap:10px; flex-wrap:wrap; }}
    header nav a {{ font-weight:500; font-size:12px; }}
    main {{ padding:16px 24px 40px; max-width:1200px; }}
    .intro {{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px; }}
    .box {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }}
    .box h2 {{ font-size:14px; margin:0 0 8px; }}
    .nums {{ display:flex; gap:16px; flex-wrap:wrap; }} .nums b {{ font-size:22px; display:block; }}
    .box ul {{ margin:0; padding:0; list-style:none; display:grid; gap:6px; }}
    .box ol {{ margin:0; padding-left:18px; display:grid; gap:4px; }}
    .box li span {{ color:var(--muted); margin-left:6px; font-size:12px; }}
    .warnlist li {{ border-left:3px solid #f59e0b; padding-left:8px; }}
    .warnlist {{ max-height:260px; overflow:auto; }}
    section {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:4px 14px 12px; margin-bottom:14px; scroll-margin-top:60px; }}
    section h2 {{ font-size:16px; }} section h2 small {{ color:var(--muted); font-weight:400; font-size:12px; }}
    h3 {{ font-size:13px; margin:14px 0 6px; color:var(--brand); }}
    table {{ width:100%; border-collapse:collapse; }}
    td {{ border-top:1px solid var(--line); padding:6px 8px; vertical-align:top; }}
    td.k {{ width:80px; color:var(--muted); font-size:11px; }}
    td.s {{ width:300px; }}
    tr.w td {{ background:#fffbeb; }}
    .warn {{ color:#92400e; font-size:12px; margin-top:4px; }}
    .src {{ display:inline-block; margin:0 4px 4px 0; padding:1px 8px; border-radius:999px; font-size:11px; text-decoration:none; color:#111; white-space:nowrap; }}
    .s-code {{ background:#bfdbfe; }} .s-live {{ background:#a5f3fc; }} .s-cc {{ background:#fde68a; }}
    .s-fn {{ background:#fed7aa; }} .s-comp {{ background:#bbf7d0; }} .s-demo {{ background:#ddd6fe; }} .s-ours {{ background:#e5e7eb; }}
    @media (max-width: 800px) {{ .intro {{ grid-template-columns:1fr; }} td.s {{ width:auto; }} main, header {{ padding-left:16px; padding-right:16px; }} }}
  </style>
</head>
<body>
  <header>
    <a href="index.html">&larr; Prototypes</a>
    <h1>Content sources: every text on the site, and where it came from</h1>
    <nav>{nav}<a href="content.html">Plain content &rarr;</a></nav>
  </header>
  <main>
    <div class="intro">
      <div class="box">
        <h2>Summary for {version}</h2>
        <div class="nums">
          <div><b>{total}</b>text items</div><div><b>{sourced}</b>with a source</div>
          <div><b>{ours}</b>our wording</div><div><b>{warn}</b>⚠ to check</div>
        </div>
        <p>Generated from the pages by <code>tools/build_content_sheet.py</code>, so nothing is missing or out of date.
          Sources: the InterviewPro code and live app, capraecapital.com (checked live 2026-11-05) and the competitor sheet.
          <b>Our wording</b> means plain copy written for this site that makes no outside claim.
          ⚠ means a source doesn't fully back the line, or the team must confirm it.
          Privacy and Terms are word-for-word copies of capraecapital.com, so they aren't listed.
          Videos are the real app with demo data, so their on-screen text isn't listed. Why each line is there: <code>docs/buyer-lens.md</code>.</p>
        <h2 style="margin-top:12px">Still to decide</h2>
        <ol>
          <li><b>Audience.</b> Written for small finance teams hiring interns and associates (see docs/product-brief.md).</li>
          <li><b>Pricing and availability.</b> Not stated anywhere, so the page only says "Talk to us".</li>
          <li><b>Name and address.</b> InterviewPro at interview.saasquatchleads.com, or a capraecapital.com address?</li>
          <li><b>The contact form.</b> It's a prototype; connect it to an inbox before launch.</li>
          <li><b>Privacy.</b> Caprae's policy is written for the website; candidate video and AI scoring may need their own wording.</li>
        </ol>
      </div>
      <div class="box"><h2>Sources</h2><ul>{legend}</ul></div>
    </div>
    <div class="box" style="margin-bottom:16px"><h2>⚠ To check ({warn})</h2><ul class="warnlist">{warns}</ul></div>
    {pages}
  </main>
</body>
</html>
"""

if __name__ == "__main__":
    version = pathlib.Path(sys.argv[1])
    out = pathlib.Path(__file__).resolve().parent.parent / "content-sources.html"
    out.write_text(build(version), encoding="utf-8")
    print("wrote", out)
