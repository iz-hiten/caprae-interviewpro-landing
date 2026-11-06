"""Every visible text item of a version, in page order: (page, section, kind, text).

Recordings of the app (.clip) and thumbnail links (.thumb) are listed once each, with their
caption, instead of word by word. Each product-tour chapter and each process step reads as its
own section.
"""
import json
import pathlib
import re
import sys

from bs4 import BeautifulSoup

PAGES = ["index.html", "features.html", "how-it-works.html", "candidates.html", "contact.html"]
BLOCKS = ["h1", "h2", "h3", "p", "li", "summary", "th", "td", "label", "figcaption"]
INLINE = ["b", "strong", "span", "a", "button"]
WHOLE = ".weights .row, .points li, .info > div, .chapters button, .figs2 > div, .track li, .marks span, .pains li, .steps4 li, .feats article, .apart > div, .autos li, .ready li, .flow li, .ticks li"
DEMO = ".clip, .thumb, .zig-shot, .still, .cand-shot"


def clean(t):
    return " ".join(t.split())


def units_of(main):
    out = []
    for sec in main.find_all("section", recursive=False):
        panels, steps = sec.select(".panel"), sec.select("li.step, .zig > li")
        if panels:
            out += [sec.select_one(".chapters")] + panels
        elif steps:
            out += steps
        else:
            out.append(sec)
    return out


def items(version_dir):
    out = []
    for page in PAGES:
        soup = BeautifulSoup((version_dir / page).read_text(encoding="utf-8"), "html.parser")
        for n, unit in enumerate(units_of(soup.find("main")), 1):
            head = unit.find(["h1", "h2", "h3"]) or unit.find("b")
            title = f"{n}. " + ("Tour chapters" if "chapters" in (unit.get("class") or []) else clean(head.get_text(" ")) if head else f"Section {n}")
            demo_ids = set(map(id, unit.select(DEMO)))
            whole = set(map(id, unit.select(WHOLE)))
            for el in unit.find_all(True):
                if id(el) in demo_ids:
                    if "clip" in el.get("class", []):
                        cap = el.select_one("figcaption span")
                        out.append({"page": page, "section": title, "kind": "video",
                                    "text": f"Recording {el.video['src']}: {clean(cap.get_text()) if cap else ''}"})
                    else:
                        img = el.find("img")
                        out.append({"page": page, "section": title, "kind": "thumb", "text": "Still " + (img["src"] if img else "") + ": " + (img.get("alt", "") if img else clean(el.get_text(" ")))})
                    continue
                if any(id(a) in demo_ids or id(a) in whole for a in el.parents):
                    continue
                if id(el) not in whole:
                    if el.name not in BLOCKS + INLINE:
                        continue
                    anc = []
                    for a in el.parents:
                        if a is unit:
                            break
                        anc.append(a)
                    if any(a.name in BLOCKS + INLINE for a in anc):
                        continue  # read as part of its parent block
                    if el.name in BLOCKS and el.find(BLOCKS):
                        continue
                    if any(id(x) in whole for x in el.find_all(True)):
                        continue
                text = clean(el.get_text(" "))
                if not text or re.fullmatch(r"\d+", text) or el.find_parent(attrs={"aria-hidden": "true"}):
                    continue
                out.append({"page": page, "section": title, "kind": "item" if id(el) in whole else el.name, "text": text})
            for inp in unit.select("input[placeholder], textarea[placeholder]"):
                out.append({"page": page, "section": title, "kind": "placeholder", "text": inp["placeholder"]})
    return out


if __name__ == "__main__":
    for it in items(pathlib.Path(sys.argv[1])):
        print(json.dumps(it, ensure_ascii=False))
