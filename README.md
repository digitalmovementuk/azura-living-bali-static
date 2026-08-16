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
- `scripts/invest-css.mjs` — the one stylesheet behind both pages. Both used to
  carry a near-identical copy of it in an inline `<style>` block, which is how
  they drifted apart. `seo-patch.mjs` writes it to
  `public/assets/css/azura-invest.css` and links it with a content hash in the
  query string, so a change lands on both pages or on neither and no visitor
  gets a stale copy. `--check` fails if the file on disk is missing or stale.
- `scripts/yoast-check.mjs` — scores **both** pages with Yoast SEO's own
  compiled analysis engine (via
  `Live Projects/DM UK/wordpress-dmuk/bin/yoast-score.mjs`) and prints every
  assessment that is not green. Each page is held to its own ceiling from the
  table above, so the guide has to reach 99 and the home page 94; exit 0 only
  when both are there. Add `home` or `guide` to score just one.

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
the number is short — a presence test would pass on a half-built wall. Each
row carries an id built from its heading, and a small script opens the matching
row when someone arrives on a link to it, so a shared link still lands on an
answer. The guide page takes the other route: twelve headings is too many to
scroll blind, so it opens with a jump list. Every jump target — headings, rows
and the home page's calculator — carries `scroll-margin-top: 98px`, because the
site header is fixed and 74px tall and would otherwise sit on top of whatever
you jumped to.

**Where the two buttons at the end of each page point.** The footer's own
buttons are `display:none` site-wide, so without them the end of a long page
has nothing to click. Both reuse the client's own destinations, not new ones:
"Book Discovery Call" goes to the LeadConnector booking widget, and "Download
Brochure" goes to the same WhatsApp link as the page's own three brochure
buttons. There *is* an Elementor brochure form in the page source, but it sits
inside a popup template that never reaches the DOM — `document.querySelector`
finds no form on the rendered page at all — so an anchor to it is a dead link.
Check a target by querying the rendered page, not by searching the HTML.

**Specificity.** `.azura-invest p` is a class plus an element, so it beats any
bare component class on a paragraph, and `.azura-invest a` beats one on a link.
Both have already shipped as bugs: a black button with black text, and a legal
note rendering at body size in body colour. Every rule for a paragraph or a
link in `invest-css.mjs` therefore names its element — `p.azura-invest-note`,
`a.azura-invest-btn`. Confirm by reading the computed style, not the source.

**The word "freehold".** No foreigner can hold Indonesian freehold — Hak Milik
is reserved for Indonesian citizens — and the section we added says so plainly.
The client's older copy called the same villas freehold in five places, so the
page contradicted itself. `seo-patch.mjs` replaces the legal word and leaves
every figure alone: the lease still runs 80 years, the model still shows 18%.
"ROI up to 18% p.a." became "Projected ROI up to 18% p.a." for the same reason.
`--check` cuts our own section out of the page first, then fails if the word
survives anywhere in the client copy — inside our section it is correct and
frequent. Copy written by Fable 5.

Two of those five sat in a container that is `display:none` at every width, so
no visitor ever read them. They were changed anyway: a crawler reads hidden
text, and a page that argues with itself in its own markup is still a page that
argues with itself.

**The ROI calculator was a whole second HTML document.** It had been pasted
into an Elementor HTML widget complete with its own `<!DOCTYPE>`, `<html>`,
`<head>`, `<title>` and `<body>`, in the middle of the page. Three things
followed from that, and all three are now fixed by `seo-patch.mjs`:

- The page carried **two `<title>` elements**.
- The stray `</body></html>` sat thousands of lines above the real one, so
  `build-guide.mjs` sliced the site's scripts backwards and came out with
  nothing. **The guide page had been shipping with no JavaScript at all** —
  no smooth scroll, no menu behaviour. Removing the tag restored 43KB of it.
  The seven Elementor popup templates in the same region are dropped from the
  guide on purpose: they never open there, and each embeds a LeadConnector
  iframe, so keeping them would call a third party on load for nothing.
- Its Tailwind build came from **jsdelivr at run time**, on a WP Rocket
  "load once the visitor interacts" tag. Every style in the calculator is a
  Tailwind utility class, so until someone moved a mouse it rendered unstyled:
  no dark panel, no rounded corners, sliders at full page width. Tailwind is
  now served from this site and loads itself when the calculator comes within
  600px of the screen. `--check` fails on a live jsdelivr script, on a second
  `<title>`, `<!DOCTYPE>` or `</body>`, and on a missing or truncated build.

**`sub()` decides it has already run by looking for its own output.** That is
fine for a title or a heading and wrong for anything ordinary: every page
contains the empty string and every page contains `</div>`, so `sub()` reads
itself as done and silently changes nothing. Deletions and structural edits go
through `rewrite()`, which has no such shortcut. Patching always starts from
the pristine page, so a missing needle there is a real failure.

**`/early-bird/` is the third indexed URL.** It is a straight mirror of the
WordPress page, so section 4g of `seo-patch.mjs` fixes up everything Google
reads about it: canonical, `lang="en-GB"`, `og:locale`, title, description,
Open Graph and Twitter cards, and the same leasehold correction as the home
page. Rank Math had built its social description out of an auto-excerpt, so it
shipped with a literal `<a class="read-more">` tag and a "…" inside a meta tag;
its title ran to 103 characters and its description to 162. Replacement copy by
Fable 5, inside Google's limits (58 / 146 / 54 / 177). Unlike the home page
this one is patched **in place**, not from a pristine copy, so every edit there
has to be idempotent.

**A check that repairs what it is checking always passes.** Three separate
versions of that bug lived in this file at once, and finding one exposed the
next:

- `--check` ran the whole patch pass over the *finished* page instead of the
  pristine one, so every deletion — the calculator's nested `<!DOCTYPE>`, its
  stray `</body>` — found nothing to delete and recorded a failure.
- Those failures were then never printed: the `--check` block called
  `process.exit(0)` above the line that reads `failures`. Four broken edits
  reported a clean run.
- The early-bird edits rewrote `early` in memory before asserting on it, so
  `--check` fixed the page it was inspecting and passed. Anything that mutates
  in `--check` mode is now gated behind `if (CHECK) fail else fix`.

Negative-test every check by breaking the thing it guards and watching it fail.
Seven of them are broken deliberately on each change to this section.

**Image alt text.** The photographs describe what they show and where it is.
The icons keep `alt=""` on purpose: each one sits beside its own text label,
so a screen reader that announced them would only repeat itself.

## Deploying

`gh-pages` is the live branch. rsync `public/` into a worktree of
`origin/gh-pages`, re-`touch .nojekyll`, commit, push.
