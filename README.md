# Azura Living Bali — static recovery

Plain HTML/CSS/JavaScript recovery of the existing Azura Living Bali website.

- `scripts/mirror.mjs` captures the live page and its same-domain assets.
- `recovery/maps/` replaces the deleted Netlify map dependency.
- `recovery/silk/` replaces the deleted Netlify silk dependency.
- `public/` is the deployable document root.

Run `node scripts/mirror.mjs`, then copy `recovery/` into `public/recovery/` before preview or deployment.

## SEO

Two pages target the search term **bali property investment**: the home page
and the guide at `/bali-property-investment/`.

| Page | Yoast SEO | Yoast readability |
| --- | --- | --- |
| `/` | 94 | 90 |
| `/bali-property-investment/` | 99 | 90 |

Both numbers are the ceiling for their URL, not a shortfall. Three limits are
properties of Yoast's own scale rather than of these pages:

- **Readability tops out at 90.** The readability roll-up only ever returns
  30, 60 or 90. There is no 100.
- **SEO tops out at 99.** Two assessments (`textCompetingLinks`, `singleH1`)
  return 8 as their best possible result, so the weighted average cannot
  reach 9.
- **`slugKeyword` cannot pass on the home page.** It wants the keyphrase in
  the slug, and the home page's slug is empty because it is the root. Tested
  with the slug empty, null and omitted: all three score 3. That gap is why
  the guide page exists.

### Files

- `scripts/seo-copy.json` — every word of the home page's added copy, plus its
  title, meta description, Open Graph text and figure captions.
- `scripts/guide-copy.json` — the same for the guide page.
- `scripts/seo-patch.mjs` — applies the home page edits to `public/index.html`.
  `scripts/mirror.mjs` calls it at the end, so re-mirroring the site cannot
  silently un-optimise the page.
  - `node scripts/seo-patch.mjs` — patch.
  - `node scripts/seo-patch.mjs --check` — exit 1 if any edit is missing.
  - It keeps the last unpatched page in `scripts/.pristine-index.html` and
    always patches from that, so editing the copy and re-running actually
    changes the output. A page with no injected section is treated as a fresh
    mirror and becomes the new source.
- `scripts/build-guide.mjs` — builds the guide page out of `public/index.html`,
  so its header, footer and stylesheet stay byte-identical to the rest of the
  site. Re-run it after any home page change. `--check` fails if it is stale.
- `scripts/yoast-check.mjs` — scores `public/index.html` with Yoast SEO's own
  compiled analysis engine (via
  `Live Projects/DM UK/wordpress-dmuk/bin/yoast-score.mjs`) and prints every
  assessment that is not green. Exit 0 only at the ceiling above.

### Two things worth knowing before editing

**Headings.** Elementor built several visual section titles as plain text
widgets, which left a 400-word run after the H1 with no subheading in it.
`seo-patch.mjs` promotes two of them — "Overview" and "Interior Design. Built
for Well–being." — to real `<h2>`s, with a class that resets every inherited
heading style so nothing moves on screen. "Why invest with Azura Living Bali?"
looks like the obvious third candidate and is deliberately left alone: both
copies of it sit inside an `elementor-hidden` container, so no visitor ever
sees it. Verify heading changes by rendering the page, not by reading the
HTML — the markup gives no hint that a block is hidden.

**Length.** The first three sections of the added block read straight down the
page — they answer "can a foreigner buy property in Bali?", which is what the
search traffic is asking. The remaining eleven are `<details>` rows, one
question each. Written out in full the block was 9,659px tall on a 18,741px
home page: more than half the site was body copy, and scrolling it felt
broken. As disclosure rows it is about 3,000px and the home page is 12,100px.
Every word is still in the HTML, so the Yoast scores are unchanged and a
crawler reads all of it. `seo-patch.mjs --check` counts the rows and fails if
the number is short — a presence test would pass on a half-built wall.

**Image alt text.** The photographs describe what they show and where it is.
The icons keep `alt=""` on purpose: each one sits beside its own text label,
so a screen reader that announced them would only repeat itself.

## Deploying

`gh-pages` is the live branch. rsync `public/` into a worktree of
`origin/gh-pages`, re-`touch .nojekyll`, commit, push.
