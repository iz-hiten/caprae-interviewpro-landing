"""Build content.html: all the site's words in one plain file. Page → section → content.

    uv run --with beautifulsoup4 python tools/build_content_text.py prototypes/draft-1/a

Read straight from the pages (tools/extract.py), so it always matches the site. Sources for each
line are in content-sources.html (tools/build_content_sheet.py).
"""
import html
import pathlib
import sys

from extract import items

NAMES = {"index.html": "Home", "features.html": "Features", "how-it-works.html": "How it works", "candidates.html": "For candidates", "contact.html": "About & contact"}


def build(version_dir):
    rows = items(version_dir)
    out = []
    for page in dict.fromkeys(r["page"] for r in rows):
        out.append(f'<h1 id="{page.split(".")[0]}">{NAMES[page]}</h1>')
        for sec in dict.fromkeys(r["section"] for r in rows if r["page"] == page):
            out.append(f"<h2>{html.escape(sec)}</h2>")
            for r in rows:
                if r["page"] == page and r["section"] == sec:
                    if r["kind"] in ("video", "thumb"):
                        out.append(f'<p class="v">[{html.escape(r["text"])}]</p>')
                    else:
                        tag = "h3" if r["kind"] in ("h1", "h2", "h3") else "p"
                        out.append(f"<{tag}>{html.escape(r['text'])}</{tag}>")
    nav = " · ".join(f'<a href="#{p.split(".")[0]}">{NAMES[p]}</a>' for p in dict.fromkeys(r["page"] for r in rows))
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InterviewPro Site Content</title>
  <meta name="robots" content="noindex">
  <style>
    body {{ margin: 0; background: #fff; color: #111827; font: 15px/1.6 system-ui, sans-serif; }}
    header {{ position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 24px; font-size: 13px; }}
    header a {{ color: #1f3864; text-decoration: none; }}
    main {{ max-width: 760px; margin: 0 auto; padding: 8px 24px 64px; }}
    h1 {{ font-size: 26px; margin: 40px 0 4px; padding-top: 16px; border-top: 2px solid #111827; scroll-margin-top: 60px; }}
    h2 {{ font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin: 28px 0 8px; }}
    h3 {{ font-size: 18px; margin: 14px 0 4px; }}
    p {{ margin: 0 0 8px; }}
    p.v {{ color: #9ca3af; font-size: 13px; }}
  </style>
</head>
<body>
  <header><a href="index.html">&larr; Prototypes</a> · Site content, page by page ({version_dir.as_posix()}) · {nav} · <a href="content-sources.html">Sources &amp; checks</a></header>
  <main>
    {"".join(out)}
  </main>
</body>
</html>
"""


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "content.html"
    out.write_text(build(pathlib.Path(sys.argv[1])), encoding="utf-8")
    print("wrote", out)
