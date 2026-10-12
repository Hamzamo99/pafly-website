/**
 * Regenerates the published privacy and terms pages from the mobile app's translation files, so
 * the published pages always say exactly what the in-app screens say.
 *
 * Why generate rather than edit by hand: these pages and the app drifted for four months. The
 * published policy still claimed the device identifier is deleted when you delete your account,
 * which the app stopped doing — a false statement about a persistent identifier, on the page
 * Apple links to. Copying text across two repos by hand is what produced that, and it would
 * produce it again.
 *
 * Output, one directory per locale except the default, which stays at the site root so the URLs
 * already given to Apple and linked from the landing page keep working:
 *
 *   /privacy/      /terms/        ← en.json
 *   /fr/privacy/   /fr/terms/     ← fr.json
 *
 * Usage:
 *   node scripts/generate-legal.mjs
 *   APP_DIR=/path/to/Pafly-Mobile-App node scripts/generate-legal.mjs
 *
 * Re-run it whenever src/i18n/en.json or fr.json changes in the app, then commit the result.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, '..');
const APP_DIR = process.env.APP_DIR ?? resolve(SITE_ROOT, '..', 'Pafly-Mobile-App');

const APP_NAME = 'Pafly';

/** Locale-independent: `doc` keys into the translation file, `dateSource` holds LAST_UPDATED. */
const PAGES = [
  { doc: 'privacy', slug: 'privacy', dateSource: join(APP_DIR, 'app', 'privacy.tsx') },
  { doc: 'terms', slug: 'terms', dateSource: join(APP_DIR, 'app', 'terms.tsx') },
];

/**
 * One entry per published language.
 *
 * `bcp47` must match `BCP47` in the app's src/utils/format.ts: the app formats the "last updated"
 * date in the active locale, so a page formatting it differently would show a different date
 * string than the screen it mirrors.
 *
 * `base` is the URL prefix. The default locale uses '' — moving English off the site root would
 * break the privacy URL already registered in App Store Connect and the links in index.html.
 */
const LOCALES = [
  {
    code: 'en',
    bcp47: 'en-US',
    file: 'en.json',
    base: '',
    label: 'English',
    home: 'Home',
    pages: {
      privacy: {
        nav: 'Privacy',
        pageTitle: 'Privacy Policy',
        headTitle: 'Privacy Policy — Pafly',
        description:
          "Pafly's Privacy Policy. How we collect, use, and protect your data in our anonymous message exchange app.",
      },
      terms: {
        nav: 'Terms',
        pageTitle: 'Terms of Service',
        headTitle: 'Terms of Service — Pafly',
        description:
          "Pafly's Terms of Service. The rules for using our anonymous message exchange app.",
      },
    },
  },
  {
    code: 'fr',
    bcp47: 'fr-FR',
    file: 'fr.json',
    base: 'fr',
    label: 'Français',
    home: 'Accueil',
    pages: {
      privacy: {
        nav: 'Confidentialité',
        pageTitle: 'Politique de confidentialité',
        headTitle: 'Politique de confidentialité — Pafly',
        description:
          "Politique de confidentialité de Pafly. Comment nous collectons, utilisons et protégeons vos données dans notre application d'échange de messages anonymes.",
      },
      terms: {
        nav: 'Conditions',
        pageTitle: "Conditions d'utilisation",
        headTitle: "Conditions d'utilisation — Pafly",
        description:
          "Conditions d'utilisation de Pafly. Les règles d'utilisation de notre application d'échange de messages anonymes.",
      },
    },
  },
];

// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * For values going inside a double-quoted attribute. The French titles and descriptions are full
 * of apostrophes today and a future edit could easily contain a quotation mark, which would close
 * the attribute early and silently break the page.
 */
function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/**
 * Reads `const LAST_UPDATED = '2026-09-27'` out of the app screen, so the date on the
 * page cannot disagree with the date the app shows. One date per document, shared by
 * every locale — the translations are revised together.
 */
function readLastUpdated(file) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(/LAST_UPDATED\s*=\s*['"]([\d-]+)['"]/);
  if (!match) throw new Error(`No LAST_UPDATED found in ${file}`);
  return match[1];
}

/** Mirrors the app's `formatDate(LAST_UPDATED, { year, month: 'long', day })`. */
function formatDate(iso, bcp47) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(bcp47, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Mirrors the app's `fill()` — the same two placeholders, nothing more. */
function fill(text, formattedDate) {
  return escapeHtml(text)
    .replace(/\{\{appName\}\}/g, APP_NAME)
    .replace(/\{\{date\}\}/g, formattedDate);
}

/** `/privacy/` for the default locale, `/fr/privacy/` elsewhere. */
function pageHref(locale, slug) {
  return `/${[locale.base, slug].filter(Boolean).join('/')}/`;
}

/** Depth below the site root, so `styles.css` and the logo resolve from either level. */
function assetPrefix(locale) {
  return '../'.repeat(locale.base ? 2 : 1);
}

function renderLegalSection(section, { isContactSection, contactEmail, formattedDate }) {
  const out = [`      <h2>${fill(section.title, formattedDate)}</h2>`];

  const paragraphs = section.paragraphs ?? [];
  paragraphs.forEach((paragraph, i) => {
    // The app appends the contact address to the final paragraph of the final
    // section rather than storing it inline; do the same so the two match.
    const isLast = isContactSection && i === paragraphs.length - 1;
    const body = fill(paragraph, formattedDate);
    out.push(
      isLast
        ? `      <p>${body}<a href="mailto:${contactEmail}">${contactEmail}</a>.</p>`
        : `      <p>${body}</p>`
    );
  });

  for (const block of section.blocks ?? []) {
    out.push(`      <h3>${fill(block.subtitle, formattedDate)}</h3>`);
    out.push(`      <p>${fill(block.paragraph, formattedDate)}</p>`);
  }

  if (section.bullets?.length) {
    out.push('      <ul>');
    for (const bullet of section.bullets) {
      out.push(`        <li>${fill(bullet, formattedDate)}</li>`);
    }
    out.push('      </ul>');
  }

  for (const paragraph of section.paragraphsAfter ?? []) {
    out.push(`      <p>${fill(paragraph, formattedDate)}</p>`);
  }

  return `    <section>\n${out.join('\n')}\n    </section>`;
}

function renderPage(page, locale, translations) {
  const doc = translations[page.doc];
  if (!doc) throw new Error(`${locale.file} has no "${page.doc}" document`);

  const meta = locale.pages[page.doc];
  const formattedDate = formatDate(readLastUpdated(page.dateSource), locale.bcp47);
  const prefix = assetPrefix(locale);

  // Header nav lists every page in this language; the footer lists the others plus Home, then
  // the same document in each other language so both translations are reachable from either.
  const nav = [
    `<a href="/">${escapeHtml(locale.home)}</a>`,
    ...PAGES.map((p) => `<a href="${pageHref(locale, p.slug)}">${escapeHtml(locale.pages[p.doc].nav)}</a>`),
  ];
  const footerLinks = [
    ...PAGES.filter((p) => p.slug !== page.slug).map(
      (p) => `<a href="${pageHref(locale, p.slug)}">${escapeHtml(locale.pages[p.doc].nav)}</a>`
    ),
    `<a href="/">${escapeHtml(locale.home)}</a>`,
    ...LOCALES.filter((l) => l.code !== locale.code).map(
      (l) =>
        `<a href="${pageHref(l, page.slug)}" lang="${l.code}" hreflang="${l.code}">${escapeHtml(l.label)}</a>`
    ),
  ];

  const body = doc.sections
    .map((section, i) =>
      renderLegalSection(section, {
        isContactSection: i === doc.sections.length - 1,
        contactEmail: doc.contactEmail,
        formattedDate,
      })
    )
    .join('\n\n');

  // Tells search engines these are translations of one another rather than duplicates.
  const alternates = LOCALES.map(
    (l) => `  <link rel="alternate" hreflang="${l.code}" href="${pageHref(l, page.slug)}">`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${locale.code}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${escapeHtml(meta.headTitle)}</title>
  <meta name="description" content="${escapeAttr(meta.description)}">
${alternates}
  <link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>
  <div class="container">
    <header class="top">
      <img src="${prefix}Logo_Pafly.png" alt="Pafly logo" class="logo">
      <h1>Pafly</h1>
      <nav>
        ${nav.join('\n        ')}
      </nav>
    </header>

    <h1 class="page-title">${escapeHtml(meta.pageTitle)}</h1>
    <p class="last-updated">${fill(doc.lastUpdated, formattedDate)}</p>

    <p class="intro">
      ${fill(doc.intro, formattedDate)}
    </p>

${body}

    <footer>
      © ${new Date().getUTCFullYear()} Pafly. ${footerLinks.join(' · ')}
    </footer>
  </div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------

for (const locale of LOCALES) {
  const localeFile = join(APP_DIR, 'src', 'i18n', locale.file);
  const translations = JSON.parse(readFileSync(localeFile, 'utf8'));

  for (const page of PAGES) {
    const out = join(SITE_ROOT, locale.base, page.slug, 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPage(page, locale, translations));

    console.log(
      `✓ ${pageHref(locale, page.slug)}index.html — ${translations[page.doc].sections.length} sections (${locale.file})`
    );
  }
}

console.log(`\nSource: ${join(APP_DIR, 'src', 'i18n').replace(resolve(APP_DIR, '..') + '/', '')}/{${LOCALES.map((l) => l.file).join(',')}}`);
