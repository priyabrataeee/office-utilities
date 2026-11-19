# Content follow-up — 20 November 2026

AdSense still reports "Low-value content". ads.txt, payments and the EU and US consent messages are in place.

Changes:

- Worked exercises on every tool page: 15 before, all 106 now. Each was written from the tool's component and engine code, using exact UI labels and stating a real limit. Files: `src/app/core/data/examples/*.ts`, merged in `tool-examples.ts`.
- Category hubs for viewers, Word, PowerPoint, generators, diagrams and file utilities gained verified notes.
- Diagram tool explanations extended from the studio code.
- 22 tool pages had meta descriptions under 120 characters; they now use curated 150–160 character summaries (`tool-meta-descriptions.ts`). The Terms description was lengthened.
- Copy corrected where it contradicted the code: Delete PDF Pages (bookmarks are dropped), Remove Watermark (the fallback covers, it does not flatten), Extract Text from PowerPoint (table text is not collected), Case Converter (13 styles), HTML to Word (only data-URL images).
- Diagram Studio fixes: the zoom and pan controls now move the canvas, and pointer positions stay correct at any zoom; undo after a resize restores the earlier size; each diagram tool keeps its own autosave instead of overwriting one shared slot (an emptied canvas falls back to the tool's starting template).
- Code fixes: PowerPoint to Images now saves WebP with a `.webp` extension; the QR "High" option no longer promises a logo; the offer letter no longer states monthly pay regardless of the chosen period, and its field is labelled Salary.

- Further fixes: PDF to Text builds its .txt download from the processed text, so Join wrapped lines, Remove running headers and Mark page breaks (a "--- Page N ---" line) all apply; Text to Diagram exports Mermaid diagrams to PNG (labels are drawn as SVG text, and relative SVG sizes are replaced from the viewBox); Diagram Studio title edits (one step per edit) and the Grid and Snap toggles are now undoable.

Last three quirks fixed: the salary slip deducts loss of pay pro rata (gross ÷ working days × LOP days) and derives Days paid; the JSON viewer saves the minified text after Minify; SVG to JPEG, WebP or AVIF now uses the Quality slider.

Build and `npm run verify:review` pass. Not deployed. Request AdSense review 4–8 weeks after deployment.

# Review follow-up — 8 October 2026

## Implemented locally

- [x] Match compression copy to the actual text-detection rule. No selective image compression or target file size is promised.
- [x] Verify bookmark loss with a bookmarked PDF through the real merge function; disclose it.
- [x] Remove unsupported certificate and payslip batch claims, org-chart CSV/automatic layout claims, and mind-map keyboard/automatic layout/outline claims.
- [x] Label PDF analyzer output as heuristic drawing scores. Do not format PDF group scores as bytes.
- [x] Serve a standalone noindex 404 document without an app shell, analytics or advertising.
- [x] Use the AdSense account meta tag for ownership while serving is disabled. The runtime loader respects the existing disabled flag.
- [x] Restrict future runtime ad loading to the homepage, known tools and known guides. Navigation from an ad-loaded document to an excluded route performs a document navigation to discard the ad runtime.
- [x] Add worked exercises to six priority tools and nine diagram routes, plus downloadable examples in the PowerPoint and Excel-date guides.
- [x] Add four fictional sample files and a reproducible generator.
- [x] Validate sample structure and dates, merge behavior, built sample links, review-build ad script absence and all 147 sitemap targets.
- [x] Browser smoke checks: sample PDF compression completed with 0 rasterised pages; sample DOCX displayed its heading, bullets and table. No console errors were observed in these checks.

## Still requires external evidence or deployment

- [ ] Deploy this revision. No production deployment or review submission was made during this work.
- [ ] After deployment, verify the real 404 HTTP response and AdSense ownership using the existing ads.txt or new meta tag.
- [ ] Before enabling ads, configure Auto ads page exclusions for personal, navigation, legal and error pages in AdSense. Verify consent messaging and eligible-to-excluded navigation in an ad-enabled staging test. The disabled review build does not prove ad-enabled or CMP behavior.
- [ ] Export the example URLs for the two redirect errors. The coverage ZIP contains counts only, so their targets cannot be diagnosed from it.
- [ ] Export examples for the 55 discovered-but-unindexed URLs and the one crawled-but-unindexed URL. Built sitemap checks do not establish Google crawl decisions or live accessibility of every URL.
- [ ] Filter Search Console to the PowerPoint email guide and export Queries, Countries and Devices. The supplied export does not join queries to pages. Do not attribute its zero clicks to the snippet without this evidence.
- [ ] Review Word viewer, certificate generator and Excel-date-guide results after deployment using matching 28-day windows; record the deployment date and separate query/country/device effects.
- [ ] Request AdSense review only after checking the deployed result. No page count, word count or change set guarantees approval.

## Reproduce checks

Run `npm run samples` to regenerate fictional inputs when needed. Run `npm run build`, then `npm run verify:review`. The checks cover document structure and selected engine behavior; they are not full visual validation of every conversion tool.

Baseline from the supplied performance export through 5 October: 454 impressions, 3 clicks, 0.66% CTR, approximately 28.6 impression-weighted average position. Latest seven days: 168 impressions versus 123 previously. Query rows omit some query data and page impressions use a different aggregation, so neither should replace the chart totals.
