# Office Utilities

Privacy-first browser tools for PDF, Word, Excel, PowerPoint, diagrams and file inspection. **Your files never leave your computer.**

- **89 tools** across 9 categories, from viewers to converters to a Visio-style diagram editor.
- **No backend.** The whole app is static HTML, JavaScript and WebAssembly. Choosing a file gives this page a reference to it in memory; there is no upload endpoint it could be sent to.
- **Prerendered for SEO.** Every one of the 105 URLs (home, categories, tools, static pages) ships as real HTML with structured data.
- **PWA.** Installable and offline-capable once loaded.
- **Angular 20** standalone components, signals throughout, zoneless change detection, strict TypeScript.

## Get started

```bash
npm install
npm start                # dev server at http://localhost:4200
npm run build            # production build + sitemap into dist/office-utility/browser
npm run watch            # incremental dev build
```

## What lives where

```
src/
  app/
    core/                # engines, services, models, shared utilities
      data/              # THE catalog — the source of truth for routing and SEO
      engines/           # PDF, DOCX, XLSX, PPTX, Markdown, HTML, image, file inspection
      services/          # SSR-safe app services (storage, theme, favourites, hashing worker…)
      workers/           # SHA-256 / CRC32 Web Worker
    features/            # one folder per module, lazily loaded via app.routes.ts
      document-viewer/   # universal + per-format viewers
      pdf-tools/         # merge, split, organise, compress, watermark, protect, unlock
      word-tools/        # convert, extract, metadata, word count, compare
      excel-tools/       # convert, clean, dedupe, formulas, profile
      ppt-tools/         # export, extract, slide selector
      converters/        # document + image conversions
      generators/        # schema-driven invoice/resume/certificate/etc.
      diagram-studio/    # interactive canvas + text-to-diagram
      file-utilities/    # metadata, size, hash, signature, duplicates, rename
    layout/              # header, footer, command palette, keyboard-help
    shared/              # design-system components and pipes
  styles/                # tokens, mixins, shared partials
scripts/
  generate-sitemap.mjs   # writes sitemap.xml, robots.txt and 404.html at build time
public/
  favicon.svg, icons/    # PWA assets
  _redirects, _headers,  # deploy-target guardrails (Netlify / Cloudflare Pages)
  .nojekyll              # GitHub Pages
```

## Adding a tool

Everything routes through one catalog:

1. Add an entry to `src/app/core/data/tool-catalog.ts` — id, category, slug, copy, keywords, accepted extensions, optional FAQ.
2. Add one lazy route to that category's `<category>.routes.ts` file, pointing at your component.
3. The tool appears on the home page, categories page, all-tools listing, command palette, sitemap, related-tools rail, footer and per-category listing automatically. Nothing else in the app knows about it.

## Deployment

Every production build produces a static `dist/office-utility/browser/` folder — no Node runtime, no serverless function, nothing to configure at the edge except optional headers.

```bash
# Point the build at your real domain — sitemap.xml, canonical tags, OG URLs
# and structured data all use this.
OU_SITE_ORIGIN="https://your.domain" npm run build
```

The result contains:

- `index.html`, plus a prerendered `.../index.html` for every route
- `404.html` (copy of the shell) for hosts without a wildcard fallback
- `manifest.webmanifest`, `ngsw-worker.js`, PWA icons
- `sitemap.xml` and `robots.txt` for every URL in the catalog
- `_redirects` and `_headers` for Netlify / Cloudflare Pages

### Any static host

Serve `dist/office-utility/browser/` as-is. Ensure `index.html` is served for unknown paths (each host does this differently — the `_redirects` file already covers Netlify and Cloudflare Pages; GitHub Pages picks up `404.html`; nginx needs `try_files $uri $uri/ /index.html;`).

### Cloudflare Pages / Netlify

Set the build command to `npm run build`, the output directory to `dist/office-utility/browser`, and add `OU_SITE_ORIGIN=https://your.domain` as an environment variable. The `_headers` file configures long-cache for hashed assets and no-cache for HTML; the `_redirects` file handles fallback.

### GitHub Pages

```bash
OU_SITE_ORIGIN="https://username.github.io/repo" npm run build
# push dist/office-utility/browser to your gh-pages branch (or configure Pages
# to serve from /docs). `.nojekyll` and `404.html` are included automatically.
```

For a project page (not a custom domain), also set `--base-href /repo/`:

```bash
OU_SITE_ORIGIN="https://username.github.io/repo" \
npx ng build --configuration production --base-href /repo/
node scripts/generate-sitemap.mjs
```

### nginx

```
location / {
  try_files $uri $uri/ /index.html;
}
location ~ \.(?:js|mjs|css|woff2|png|svg|webp|jpg)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## Verifying the privacy claim

The whole point of the project is that no file ever leaves the browser. Anyone can verify:

1. Open the browser's network panel.
2. Load any tool, then drop a file. Confirm that no request carries the file's bytes.
3. Take the app offline (devtools → Network → Offline). Every tool still works, including PDF merge, DOCX-to-PDF, and hashing.

The bundled `Content-Security-Policy` refuses outbound `connect-src` to anything but `self` and `blob:`, so even an accidental analytics inclusion would be blocked at the browser rather than silently sending data.

## Tech stack

- **Angular 20** (standalone components, signals, zoneless, `@defer` blocks, SSG via `@angular/ssr`)
- **PDF** — [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) for rendering, [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib) for writing (including AES encryption)
- **Office** — [SheetJS](https://sheetjs.com/) for spreadsheets, [Mammoth](https://github.com/mwilliamson/mammoth.js) for DOCX reading, [`docx`](https://docx.js.org/) for DOCX writing, [JSZip](https://stuk.github.io/jszip/) for OOXML containers, custom PPTX parser
- **Markdown & HTML** — [Marked](https://marked.js.org/) with [DOMPurify](https://github.com/cure53/DOMPurify)
- **Diagrams** — [Mermaid](https://mermaid.js.org/) plus a custom SVG canvas
- **Images** — [`browser-image-compression`](https://github.com/Donaldcwl/browser-image-compression) and the browser's own canvas codecs
- **Hashing** — [Web Crypto](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) with a streaming SHA-256 implementation and Web Worker

## Honest limitations

- Very large files are bounded by the memory the browser tab is allowed to allocate.
- DOCX/PPTX layout is reconstructed from OOXML, not rendered by Microsoft's own engine; complex floating layouts can reflow.
- Watermarks flattened into a page image cannot be recovered from — no tool can do that.
- The standard PDF fonts cover Latin scripts; non-Latin text is substituted with a warning to the user.
- There is no OCR in this release, so text extraction needs an existing text layer.

## License

Copyright (C) 2026 Priyabrata Saha

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the [GNU Affero General Public License](LICENSE) for
more details.

In practice this means you are free to read, modify and share the code — but if
you run a modified version as a public service, you have to offer that version's
source under the same terms. The libraries it builds on stay under their own
licences.
