#!/usr/bin/env python3
"""Build the favicon set and the social share image for azuralivingbali.com.

    python3 scripts/build-brand-assets.py            # write the assets
    python3 scripts/build-brand-assets.py --check    # fail if any output is stale
    python3 scripts/build-brand-assets.py --proof DIR  # also write proof sheets

Why this exists
---------------
The mirrored WordPress site pointed every icon tag at
/wp-content/uploads/2025/02/Azura_White_Logo__No_Background_.png, which is a
512x273 *white wordmark on transparency*. Two things make that invisible in a
Google result: it is not square, and it is white on white. The SERP showed an
empty grey circle. The share image was a stray WhatsApp photo at 1214x788 —
wrong aspect for a 1.91:1 card and carrying no brand at all.

The mark
--------
The "a" is not redrawn: it is cropped out of the real 16384x4072 wordmark by
alpha bounding box, so it is the brand letterform, not a lookalike. It sits on
the brand charcoal (#2C2C2C) at 66% of the square, which keeps the whole glyph
inside the circle Google masks favicons with on mobile, and keeps the counter
of the "a" open at 16px. A gold glyph and a gold rule were both tried and both
lose at 16px — see the change log in README.md.

Outputs are committed. mirror.mjs copies static-assets/ -> public/assets/ and
static-root/ -> public/, so nothing here needs a mirror change.
"""
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = "--check" in sys.argv
PROOF = None
if "--proof" in sys.argv:
    PROOF = sys.argv[sys.argv.index("--proof") + 1]

DARK = (44, 44, 44)          # brand charcoal, 116 uses in site-home.css
GOLD = (209, 163, 10)        # brand gold, #D1A30A
WHITE = (255, 255, 255)

WORDMARK = os.path.join(ROOT, "public", "wp-content", "uploads", "2025", "02",
                        "Azura_White_Logo_2__No_Background_.png")
HERO = os.path.join(ROOT, "public", "assets", "images", "azura-hero-poster.jpg")
# The latin subset of Josefin Sans the site already ships. Picked by cmap
# coverage, not by filename: the other five subsets carry no basic-latin glyphs
# and render the line as blank advance widths without raising anything.
FONT_WOFF2 = os.path.join(ROOT, "static-assets", "fonts",
                          "josefinsans-qw3azqnved7rkgkxtqiqx5eudxx4.woff2")

BRAND_DIR = os.path.join(ROOT, "static-assets", "brand")
IMG_DIR = os.path.join(ROOT, "static-assets", "images")
ROOT_DIR = os.path.join(ROOT, "static-root")

OG_LINE = "Boutique villas in Tabanan, Bali"
ICON_SIZES = [16, 32, 48, 96, 180, 192, 512]
GLYPH_SCALE = 0.66           # square icons
MASKABLE_SCALE = 0.50        # android maskable: fits the 80%-diameter safe circle

stale = []


# --------------------------------------------------------------------------
# the "a", cropped from the real wordmark
# --------------------------------------------------------------------------
def wordmark():
    im = Image.open(WORDMARK).convert("RGBA")
    return im.crop(im.split()[3].getbbox())


def glyph_a(mark):
    """First letter of the wordmark, split on fully transparent columns."""
    alpha = mark.split()[3]
    w, h = mark.size
    ink = [max(alpha.crop((x, 0, x + 1, h)).getdata()) > 8 for x in range(w)]
    end = ink.index(False, ink.index(True))
    a = mark.crop((0, 0, end, h))
    return a.crop(a.split()[3].getbbox())


def icon(a, size, scale, ground=DARK, colour=WHITE):
    supersample = 2048
    im = Image.new("RGBA", (supersample, supersample), ground + (255,))
    gw = int(supersample * scale)
    gh = int(gw * a.size[1] / a.size[0])
    lit = a.resize((gw, gh), Image.LANCZOS)
    tint = Image.new("RGBA", (gw, gh), colour + (255,))
    tint.putalpha(lit.split()[3])
    im.alpha_composite(tint, ((supersample - gw) // 2, (supersample - gh) // 2))
    return im.resize((size, size), Image.LANCZOS).convert("RGB")


# --------------------------------------------------------------------------
# the share image
# --------------------------------------------------------------------------
def josefin(size, weight=500):
    """Josefin Sans is shipped as woff2, which PIL cannot read. Convert in
    memory rather than committing a second copy of the same font."""
    from fontTools.ttLib import TTFont
    tt = TTFont(FONT_WOFF2)
    tt.flavor = None
    buf = io.BytesIO()
    tt.save(buf)
    buf.seek(0)
    font = ImageFont.truetype(buf, size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def og_image():
    W, H, BAND = 1200, 630, 195
    src = Image.open(HERO).convert("RGB")
    # Crop below the video still's purple letterbox haze, wide enough to hold
    # the ocean at the top and the twelve villas across the bottom.
    photo = src.crop((250, 150, 1810, 715)).resize((W, H - BAND), Image.LANCZOS)
    photo = ImageEnhance.Brightness(photo).enhance(1.06)

    im = Image.new("RGB", (W, H), DARK)
    im.paste(photo, (0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - BAND, W, H - BAND + 4], fill=GOLD)

    mark = wordmark()
    logo_h = 58
    logo = mark.resize((int(logo_h * mark.size[0] / mark.size[1]), logo_h), Image.LANCZOS)
    im.paste(logo, ((W - logo.size[0]) // 2, H - BAND + 40), logo)

    font = josefin(46, 500)
    im_d = ImageDraw.Draw(im)
    tw = im_d.textlength(OG_LINE, font=font)
    im_d.text(((W - tw) / 2, H - BAND + 124), OG_LINE, font=font, fill=WHITE)
    return im


# --------------------------------------------------------------------------
# write / compare
# --------------------------------------------------------------------------
def emit(path, save):
    """Write through a temp file and compare bytes, so --check never repairs
    the thing it is checking."""
    fd, tmp = tempfile.mkstemp(suffix=os.path.splitext(path)[1])
    os.close(fd)
    save(tmp)
    new = open(tmp, "rb").read()
    os.unlink(tmp)
    old = open(path, "rb").read() if os.path.exists(path) else None
    if old == new:
        return
    if CHECK:
        stale.append(os.path.relpath(path, ROOT) + (" (missing)" if old is None else " (stale)"))
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(new)
    print("wrote", os.path.relpath(path, ROOT))


def main():
    mark = wordmark()
    a = glyph_a(mark)

    for size in ICON_SIZES:
        name = "apple-touch-icon.png" if size == 180 else f"favicon-{size}.png"
        img = icon(a, size, GLYPH_SCALE)
        emit(os.path.join(BRAND_DIR, name), lambda p, i=img: i.save(p, "PNG", optimize=True))

    maskable = icon(a, 512, MASKABLE_SCALE)
    emit(os.path.join(BRAND_DIR, "maskable-512.png"),
         lambda p: maskable.save(p, "PNG", optimize=True))

    # Multi-size .ico at the site root. Browsers and crawlers that ignore the
    # <link> tags still probe /favicon.ico; the mirror had none, so that probe
    # 404'd.
    ico = icon(a, 256, GLYPH_SCALE)
    emit(os.path.join(ROOT_DIR, "favicon.ico"),
         lambda p: ico.save(p, "ICO", sizes=[(16, 16), (32, 32), (48, 48)]))

    manifest = {
        "name": "Azura Living Bali",
        "short_name": "Azura",
        "start_url": "/",
        "display": "browser",
        "theme_color": "#2C2C2C",
        "background_color": "#2C2C2C",
        "icons": [
            {"src": "/assets/brand/favicon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/assets/brand/favicon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/assets/brand/maskable-512.png", "sizes": "512x512",
             "type": "image/png", "purpose": "maskable"},
        ],
    }
    body = (json.dumps(manifest, indent=2) + "\n").encode()
    emit(os.path.join(ROOT_DIR, "site.webmanifest"),
         lambda p: open(p, "wb").write(body))

    og = og_image()
    emit(os.path.join(IMG_DIR, "azura-og.jpg"),
         lambda p: og.save(p, "JPEG", quality=88, optimize=True, progressive=True))

    if PROOF:
        os.makedirs(PROOF, exist_ok=True)
        # the share image at the width an iPhone renders it in feed
        og.resize((375, 197), Image.LANCZOS).save(os.path.join(PROOF, "og-at-375.png"))
        # the icon at the three sizes that matter, square and circle-masked
        sheet = Image.new("RGB", (700, 200), WHITE)
        x = 20
        for s in (16, 32, 48):
            big = icon(a, s, GLYPH_SCALE).resize((s * 3, s * 3), Image.NEAREST)
            sheet.paste(big, (x, 20))
            m = Image.new("L", (s * 3, s * 3), 0)
            ImageDraw.Draw(m).ellipse([0, 0, s * 3 - 1, s * 3 - 1], fill=255)
            circ = Image.new("RGB", (s * 3, s * 3), WHITE)
            circ.paste(big, (0, 0), m)
            sheet.paste(circ, (x, 40 + s * 3))
            x += s * 3 + 24
        sheet.paste(icon(a, 120, GLYPH_SCALE), (540, 40))
        sheet.save(os.path.join(PROOF, "favicon-proof.png"))
        print("proofs in", PROOF)

    # Keep public/ in step for a build that is not a full re-mirror. mirror.mjs
    # does these two copies itself, so this only matters between mirrors.
    if not CHECK:
        for src_dir, dst_dir in ((BRAND_DIR, os.path.join(ROOT, "public", "assets", "brand")),
                                 (IMG_DIR, os.path.join(ROOT, "public", "assets", "images"))):
            os.makedirs(dst_dir, exist_ok=True)
            for f in os.listdir(src_dir):
                shutil.copy2(os.path.join(src_dir, f), os.path.join(dst_dir, f))
        for f in ("favicon.ico", "site.webmanifest"):
            shutil.copy2(os.path.join(ROOT_DIR, f), os.path.join(ROOT, "public", f))

    if stale:
        print("brand assets out of date:\n  " + "\n  ".join(stale), file=sys.stderr)
        sys.exit(1)
    print("brand assets ok" if CHECK else "brand assets built")


main()
