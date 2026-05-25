# pafly-website

Static landing + legal pages for [Pafly](https://pafly-app.com).

Hosted on GitHub Pages at **https://legal.pafly-app.com** (custom domain).

## Pages

- `/` — landing
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service

## Deployment

1. Push to `main`.
2. GitHub Pages auto-builds (Settings → Pages → Source: `main` branch / `/` root).
3. Live within ~1 minute.

## Updating content

The privacy and terms text is duplicated from the mobile app's `src/i18n/en.json` (`privacy` and `terms` blocks). When the in-app text changes, update both. There's no build step — just edit the HTML directly.

## Custom domain

`CNAME` file in repo root tells GitHub Pages to serve at `legal.pafly-app.com`. The DNS record must already exist (CNAME `legal` → `hamzamo99.github.io` at the registrar of `pafly-app.com`).
