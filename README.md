# Azura Living Bali — static recovery

Plain HTML/CSS/JavaScript recovery of the existing Azura Living Bali website.

- `scripts/mirror.mjs` captures the live page and its same-domain assets.
- `recovery/maps/` replaces the deleted Netlify map dependency.
- `recovery/silk/` replaces the deleted Netlify silk dependency.
- `public/` is the deployable document root.

Run `node scripts/mirror.mjs`, then copy `recovery/` into `public/recovery/` before preview or deployment.
