"""Make the demo media the recordings use (nothing real: a silhouette, noise "speech", title cards).

    uv run --with numpy --with pillow --with imageio-ffmpeg python tools/recording/make-media.py

Writes tools/recording/media/: cam.y4m + cam.mp4 (fake camera), voice.wav (fake microphone),
intro.webm (the team's intro), qc/j{job}q{n}.webm (question videos), candidate-73-resume.pdf.
"""
import math, os, pathlib, shutil, subprocess, textwrap, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "media"; OUT.mkdir(exist_ok=True)
LOGO = HERE.parent.parent / "prototypes/draft-1/a/img/caprae-logo.webp"
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
FONT = lambda s, b=False: ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf" if b else "C:/Windows/Fonts/segoeui.ttf", s)
ff = lambda *a: subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *map(str, a)], check=True)

# fake camera: a softly lit room and a blurred silhouette that sways a little
W, H, N = 640, 480, 96
fr = OUT / "cam_frames"; fr.mkdir(exist_ok=True)
yy, xx = np.mgrid[0:H, 0:W]
for i in range(N):
    t = i / N * 2 * math.pi
    g = np.clip(1.0 - ((xx - 180) ** 2 + (yy - 120) ** 2) ** .5 / 700, 0, 1)
    base = np.stack([22 + 70 * g, 22 + 60 * g, 26 + 48 * g], -1).astype(np.uint8)
    im = Image.fromarray(base); d = ImageDraw.Draw(im)
    cx, cy = W / 2 + 6 * math.sin(t), 205 + 2 * math.sin(2 * t)
    d.ellipse((cx - 62, cy - 78, cx + 62, cy + 78), fill=(92, 86, 82))
    d.rectangle((cx - 26, cy + 60, cx + 26, cy + 110), fill=(84, 78, 75))
    d.ellipse((cx - 190, cy + 95, cx + 190, cy + 420), fill=(48, 52, 64))
    d.polygon([(cx - 30, cy + 100), (cx + 30, cy + 100), (cx, cy + 175)], fill=(225, 225, 228))
    a = np.asarray(im.filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32)
    v = np.clip(1.15 - ((xx - W / 2) ** 2 / (W * .75) ** 2 + (yy - H / 2) ** 2 / (H * .75) ** 2), .55, 1)[..., None]
    Image.fromarray(np.clip(a * v + np.random.normal(0, 2.2, a.shape), 0, 255).astype(np.uint8)).save(fr / f"{i:03d}.png")
ff("-framerate", 16, "-i", fr / "%03d.png", "-pix_fmt", "yuv420p", OUT / "cam.y4m")
ff("-framerate", 16, "-i", fr / "%03d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", 26, OUT / "cam.mp4")
shutil.rmtree(fr)

# fake microphone: noise shaped into syllables, so the app's level meter moves
sr, T = 48000, 8.0; n = int(sr * T); tt = np.arange(n) / sr
voiced = np.convolve(np.random.default_rng(1).normal(0, 1, n), np.ones(12) / 12, "same")
env = np.clip(np.sin(2 * np.pi * 3.7 * tt) * .6 + np.sin(2 * np.pi * 1.3 * tt + 1) * .5 + .25, 0, None) ** 1.4 * ((tt % 2.6) < 2.1)
sig = voiced * env + .15 * np.sin(2 * np.pi * 140 * tt) * env
with wave.open(str(OUT / "voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((sig / np.abs(sig).max() * .6 * 32767).astype(np.int16).tobytes())

# title cards
def background():
    im = Image.new("RGB", (1280, 720)); d = ImageDraw.Draw(im)
    for y in range(720):
        g = int(14 + 16 * (1 - y / 720)); d.line([(0, y), (1280, y)], fill=(g + 5, g + 3, g))
    return im

def card_video(frames_fn, name, n=48, fps=12):
    d = OUT / ("_" + name); d.mkdir(exist_ok=True)
    for i in range(n): frames_fn(i, n).save(d / f"{i:03d}.png")
    (OUT / name).parent.mkdir(parents=True, exist_ok=True)
    ff("-framerate", fps, "-i", d / "%03d.png", "-c:v", "libvpx-vp9", "-b:v", 0, "-crf", 40, "-pix_fmt", "yuv420p", OUT / name)
    shutil.rmtree(d)

logo = Image.open(LOGO).convert("RGBA").resize((88, 90))
def intro(i, n):
    im = background(); im.paste(logo, (596, 190), logo); d = ImageDraw.Draw(im)
    d.text((640, 330), "Welcome to your interview", font=FONT(52, True), fill=(245, 245, 245), anchor="mm")
    d.text((640, 395), "A short introduction from the hiring team", font=FONT(26), fill=(170, 170, 175), anchor="mm")
    d.rounded_rectangle((530, 450, 530 + int(220 * min(1, i / n * 1.6)), 456), 3, fill=(251, 191, 36))
    d.text((640, 640), "Demo video", font=FONT(18), fill=(90, 90, 95), anchor="mm")
    return im
card_video(intro, "intro.webm", n=60)

QS = {0: ["Why private equity, and why a firm like ours?", "Walk us through a business you would want to buy, and why.", "Tell us about a time you had to learn something fast."],
      1: ["How would you size the market for a niche services business?", "Tell us about a piece of research you are proud of.", "How do you check that a source is reliable?"],
      2: ["How would you open a first call with a business owner?", "Tell us about a time you were told no and kept going.", "What does a good week look like in this role?"],
      3: ["Pick a brand you think explains itself well. Why does it work?", "How would you measure whether a campaign worked?", "Tell us about something you wrote that people read."]}
for j, qs in QS.items():
    for k, q in enumerate(qs):
        def qcard(i, n, q=q, k=k):
            im = background(); d = ImageDraw.Draw(im)
            d.text((140, 230), f"QUESTION {k + 1} OF 3", font=FONT(26, True), fill=(251, 191, 36))
            for li, line in enumerate(textwrap.wrap(q, 34)):
                d.text((140, 290 + li * 72), line, font=FONT(56, True), fill=(245, 245, 245))
            d.text((140, 620), "From the hiring team · demo video", font=FONT(22), fill=(95, 95, 100))
            return im
        card_video(qcard, f"qc/j{j}q{k + 1}.webm")

# placeholder resume for the upload step
im = Image.new("RGB", (1240, 1754), "white"); d = ImageDraw.Draw(im)
d.text((120, 140), "Candidate 73", font=FONT(64), fill="black")
d.text((120, 230), "candidate73@example.com  ·  +1 555 0173", font=FONT(30), fill=(90, 90, 90))
d.text((120, 1650), "Demo resume — not a real person", font=FONT(24), fill=(150, 150, 150))
im.save(OUT / "candidate-73-resume.pdf")
print("media written to", OUT)
