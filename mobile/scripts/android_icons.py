"""Generate the Android launcher icons and splash screens from the EZOFIS mark (src/assets/mark-color.png).

usage (from mobile/): python scripts/android_icons.py
Writes android/app/src/main/res/mipmap-*/ic_launcher*.png and drawable*/splash.png (same sizes as the Capacitor
defaults they replace). The adaptive icon keeps its white background colour (values/ic_launcher_background.xml).
"""
import glob
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
MARK = Image.open(os.path.join(ROOT, 'src', 'assets', 'mark-color.png')).convert('RGBA')
MARK = MARK.crop(MARK.getbbox())  # trim transparent edges
WHITE = (255, 255, 255, 255)
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def mark_on(canvas, share):
    """Paste the mark centred, its longer side = share of the canvas' shorter side."""
    w, h = canvas.size
    side = int(min(w, h) * share)
    k = side / max(MARK.size)
    m = MARK.resize((max(1, round(MARK.width * k)), max(1, round(MARK.height * k))), Image.LANCZOS)
    canvas.alpha_composite(m, ((w - m.width) // 2, (h - m.height) // 2))
    return canvas


def supersampled(size, draw_bg, share):
    big = size * 4
    c = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw_bg(ImageDraw.Draw(c), big)
    mark_on(c, share)
    return c.resize((size, size), Image.LANCZOS)


def save(img, path):
    img.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT), img.size)


for dpi, size in LEGACY.items():
    d = os.path.join(RES, f'mipmap-{dpi}')
    # legacy square icon: white rounded square (launchers before Android 8)
    save(supersampled(size, lambda g, s: g.rounded_rectangle([s * 0.04, s * 0.04, s * 0.96, s * 0.96], radius=s * 0.2, fill=WHITE), 0.58), os.path.join(d, 'ic_launcher.png'))
    save(supersampled(size, lambda g, s: g.ellipse([s * 0.04, s * 0.04, s * 0.96, s * 0.96], fill=WHITE), 0.54), os.path.join(d, 'ic_launcher_round.png'))
    # adaptive foreground: 108 dp canvas, mark inside the 66 dp safe zone
    fg = int(size * 108 / 48)
    save(supersampled(fg, lambda g, s: None, 0.40), os.path.join(d, 'ic_launcher_foreground.png'))

# splash screens: keep every existing size, white with the mark in the middle
for path in glob.glob(os.path.join(RES, 'drawable*', 'splash.png')):
    w, h = Image.open(path).size
    c = Image.new('RGBA', (w, h), WHITE)
    mark_on(c, 0.26)
    save(c.convert('RGB'), path)
