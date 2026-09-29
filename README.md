# pafly-website

Static landing + legal pages for [Pafly](https://pafly-app.com).

Hosted on GitHub Pages at **https://legal.pafly-app.com** (custom domain).

## Pages

- `/` — landing
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/support` — Help & Support (the URL App Store Connect asks for)

## Deployment

1. Push to `main`.
2. GitHub Pages auto-builds (Settings → Pages → Source: `main` branch / `/` root).
3. Live within ~1 minute.

## Updating content

**Do not edit `privacy/index.html`, `terms/index.html` or `support/index.html` by hand — they are generated.**

```bash
node scripts/generate-pages.mjs           # expects ../Pafly-Mobile-App
APP_DIR=/path/to/app node scripts/generate-pages.mjs
```

The script rebuilds all three pages from the mobile app's `src/i18n/en.json` (`privacy`, `terms` and `help` blocks), and reads each displayed date straight from `LAST_UPDATED` in the matching screen — `app/privacy.tsx`, `app/terms.tsx`, `app/help.tsx`. Run it after any change to that text, then commit the regenerated HTML.

`/support` is the app's own Help & Support FAQ, rendered as a page. Its answers state message limits, how moderation works and how to delete an account — all things that change in the app, which is why it is generated rather than written here.

**Why a generator instead of editing the HTML.** The previous process was "the text is duplicated, update both by hand". It drifted for four months, and the published policy ended up making two statements the app contradicted: that messages expire after 30 days (it is 10), and that the device identifier is deleted with your account (it is deliberately kept, so a suspension cannot be bypassed by reinstalling). Apple links to this page, so a false claim here is worse than a stale one. Generating removes the class of error rather than the instance.

If the site's text ever needs to diverge from the app, change the app's `en.json` — not the HTML — or the next regeneration silently reverts it.

## Custom domain

`CNAME` file in repo root tells GitHub Pages to serve at `legal.pafly-app.com`. The DNS record must already exist (CNAME `legal` → `hamzamo99.github.io` at the registrar of `pafly-app.com`).
