/**
 * Regenerates privacy/ and terms/ from the mobile app's translation files, so the published
 * pages always say exactly what the in-app screens say.
 *
 * Why generate rather than edit by hand: these pages and the app drifted for four months. The
 * published policy still claimed the device identifier is deleted when you delete your account,
 * which the app stopped doing — a false statement about a persistent identifier, on the page
 * Apple links to. Copying text across two repos by hand is what produced that, and it would
 * produce it again.
 *
 * Usage:
 *   node scripts/generate-legal.mjs
 *   APP_DIR=/path/to/Pafly-Mobile-App node scripts/generate-legal.mjs
 *
 * Re-run it whenever src/i18n/en.json changes in the app, then commit the result.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, '..');
const APP_DIR = process.env.APP_DIR ?? resolve(SITE_ROOT, '..', 'Pafly-Mobile-App');

const APP_NAME = 'Pafly';

/** The site is English-only for now; the app also ships `fr.json` if that changes. */
const LOCALE_FILE = join(APP_DIR, 'src', 'i18n', 'en.json');

/** `nav` is the label this page gets in the header nav and in every other page's footer. */
const PAGES = [
  {
    doc: 'privacy',
    slug: 'privacy',
    nav: 'Privacy',
    dateSource: join(APP_DIR, 'app', 'privacy.tsx'),
    pageTitle: 'Privacy Policy',
    headTitle: 'Privacy Policy — Pafly',
    description:
      "Pafly's Privacy Policy. How we collect, use, and protect your data in our anonymous message exchange app.",
  },
  {
    doc: 'terms',
    slug: 'terms',
    nav: 'Terms',
    dateSource: join(APP_DIR, 'app', 'terms.tsx'),
    pageTitle: 'Terms of Service',
    headTitle: 'Terms of Service — Pafly',
    description:
      "Pafly's Terms of Service. The rules for using our anonymous message exchange app.",
  },
];

// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Reads `const LAST_UPDATED = '2026-09-27'` out of the app screen, so the date on the
 * page cannot disagree with the date the app shows.
 */
function readLastUpdated(file) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(/LAST_UPDATED\s*=\s*['"]([\d-]+)['"]/);
  if (!match) throw new Error(`No LAST_UPDATED found in ${file}`);
  return match[1];
}

/** Mirrors the app's `formatDate(LAST_UPDATED, { year, month: 'long', day })`. */
function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
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

function renderPage(page, locale) {
  const doc = locale[page.doc];
  const formattedDate = formatDate(readLastUpdated(page.dateSource));

  // Header nav lists every page; the footer lists the others plus Home.
  const nav = ['<a href="/">Home</a>', ...PAGES.map((p) => `<a href="/${p.slug}/">${p.nav}</a>`)];
  const footerLinks = [
    ...PAGES.filter((p) => p.slug !== page.slug).map(
      (p) => `<a href="/${p.slug}/">${p.nav}</a>`
    ),
    '<a href="/">Home</a>',
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${escapeHtml(page.headTitle)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="container">
    <header class="top">
      <img src="../Logo_Pafly.png" alt="Pafly logo" class="logo">
      <h1>Pafly</h1>
      <nav>
        ${nav.join('\n        ')}
      </nav>
    </header>

    <h1 class="page-title">${escapeHtml(page.pageTitle)}</h1>
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

const locale = JSON.parse(readFileSync(LOCALE_FILE, 'utf8'));

for (const page of PAGES) {
  const out = join(SITE_ROOT, page.slug, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderPage(page, locale));

  console.log(`✓ ${page.slug}/index.html — ${locale[page.doc].sections.length} sections`);
}

console.log(`\nSource: ${LOCALE_FILE.replace(APP_DIR + '/', 'Pafly-Mobile-App/')}`);
