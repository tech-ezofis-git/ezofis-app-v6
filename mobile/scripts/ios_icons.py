"""Generate the iOS app icon and splash screens from the EZOFIS mark (src/assets/mark-color.png).

usage (from mobile/): python scripts/ios_icons.py
Writes ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024 px, no transparency: the App Store
rejects icons with an alpha channel; iOS rounds the corners itself) and the Splash.imageset images (same sizes as the
Capacitor defaults they replace).
"""
import glob
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets')
MARK = Image.open(os.path.join(ROOT, 'src', 'assets', 'mark-color.png')).convert('RGBA')
MARK = MARK.crop(MARK.getbbox())  # trim transparent edges
WHITE = (255, 255, 255, 255)


def on_white(w, h, share):
    """White canvas with the mark centred, its longer side = share of the canvas' shorter side."""
    c = Image.new('RGBA', (w, h), WHITE)
    side = int(min(w, h) * share)
    k = side / max(MARK.size)
    m = MARK.resize((max(1, round(MARK.width * k)), max(1, round(MARK.height * k))), Image.LANCZOS)
    c.alpha_composite(m, ((w - m.width) // 2, (h - m.height) // 2))
    return c.convert('RGB')


def save(img, path):
    img.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT), img.size)


save(on_white(1024, 1024, 0.58), os.path.join(ASSETS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'))

# splash: the launch screen scales these to fill the screen, so the mark stays small and centred
for path in glob.glob(os.path.join(ASSETS, 'Splash.imageset', '*.png')):
    w, h = Image.open(path).size
    save(on_white(w, h, 0.26), path)
