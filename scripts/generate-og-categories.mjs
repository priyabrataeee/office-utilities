import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const outDir = join(rootDir, 'public/og/categories');

mkdirSync(outDir, { recursive: true });

const CATEGORIES = [
  {
    id: 'pdf',
    title: 'PDF Tools',
    tagline: 'Merge, split, secure and optimise',
    color: '#e0483c',
    toolCount: 21,
    desc: '21 browser tools for PDF merge, split, compress, watermark, protect and convert.',
  },
  {
    id: 'word',
    title: 'Word Tools',
    tagline: 'Everything DOCX',
    color: '#2b579a',
    toolCount: 13,
    desc: 'Convert, inspect, compare, count words and mine DOCX documents directly in browser.',
  },
  {
    id: 'excel',
    title: 'Excel & CSV Tools',
    tagline: 'Clean, convert, analyse',
    color: '#1d7044',
    toolCount: 19,
    desc: 'Work with spreadsheets in browser: convert XLSX, CSV, JSON, clean data and profile columns.',
  },
  {
    id: 'powerpoint',
    title: 'PowerPoint Tools',
    tagline: 'Slides without the app',
    color: '#c74f2c',
    toolCount: 8,
    desc: 'Open PPTX decks, export slides to PDF or images, pull out slide text and media.',
  },
  {
    id: 'convert',
    title: 'File Converters',
    tagline: 'Any office format, any direction',
    color: '#7c4dcc',
    toolCount: 39,
    desc: 'Convert documents, spreadsheets, presentations, markup and images with no upload.',
  },
  {
    id: 'generate',
    title: 'Document Generators',
    tagline: 'Instant documents from data',
    color: '#b3761a',
    toolCount: 11,
    desc: 'Produce invoices, resumes, quotations and certificates exported as PDF or DOCX.',
  },
  {
    id: 'diagram',
    title: 'Diagram Studio',
    tagline: 'Visual models & instant charts',
    color: '#0e7c86',
    toolCount: 10,
    desc: 'Lightweight canvas for flowcharts, UML, ER models plus instant Mermaid rendering.',
  },
  {
    id: 'file',
    title: 'File Utilities',
    tagline: 'Inspect, hash, verify & rename',
    color: '#52607a',
    toolCount: 7,
    desc: 'Read metadata, analyse sizes, verify signatures, find duplicates and batch-rename.',
  },
  {
    id: 'viewer',
    title: 'Document Viewers',
    tagline: 'Open anything, install nothing',
    color: '#3a63d0',
    toolCount: 11,
    desc: 'Open PDF, Word, Excel, PowerPoint, CSV, Markdown, JSON, XML and plain text files.',
  },
];

for (const cat of CATEGORIES) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${cat.title} — Office Utilities">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f1220"/>
      <stop offset="1" stop-color="#161b36"/>
    </linearGradient>
    <linearGradient id="catGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${cat.color}"/>
      <stop offset="1" stop-color="#7c7cf0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.65" cy="0.35" r="0.6">
      <stop offset="0" stop-color="${cat.color}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#0f1220" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <g transform="translate(96 88)" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fill="#f5f6fb">
    <!-- Brand badge -->
    <g transform="translate(0 0)">
      <rect width="44" height="44" rx="11" fill="url(#catGrad)"/>
      <g transform="translate(10 10)" stroke="#0f1220" stroke-width="2.5" stroke-linejoin="round" fill="none">
        <path d="M3 8L12 3l9 5v10l-9 5-9-5zM12 13L3 8M12 13l9-5M12 13v10"/>
      </g>
      <text x="60" y="30" font-size="22" font-weight="640" letter-spacing="-0.02em" fill="#f5f6fb">
        Office<tspan opacity="0.7" font-weight="440">Utilities</tspan>
      </text>
    </g>

    <!-- Category Pill -->
    <g transform="translate(0 92)">
      <rect width="140" height="32" rx="16" fill="${cat.color}" fill-opacity="0.18" stroke="${cat.color}" stroke-opacity="0.4" stroke-width="1"/>
      <text x="70" y="21" font-size="13" font-weight="700" letter-spacing="0.08em" text-anchor="middle" fill="#ffffff" text-transform="uppercase">
        ${cat.toolCount} TOOLS
      </text>
    </g>

    <!-- Main Title -->
    <text y="210" font-size="76" font-weight="750" letter-spacing="-0.035em" fill="#ffffff">
      ${cat.title}
    </text>

    <!-- Tagline -->
    <text y="275" font-size="34" font-weight="600" letter-spacing="-0.02em" fill="${cat.color}">
      ${cat.tagline}
    </text>

    <!-- Description -->
    <text y="350" font-size="24" font-weight="400" fill="#c7cbe0" letter-spacing="-0.01em">
      ${cat.desc}
    </text>
    <text y="386" font-size="24" font-weight="400" fill="#9aa2b4" letter-spacing="-0.01em">
      Runs 100% inside your browser tab — your files never leave your computer.
    </text>

    <!-- Feature assurances -->
    <g transform="translate(0 455)" font-size="19" fill="#a4adc3">
      <g>
        <circle cx="10" cy="-6" r="6" fill="#4bcd90"/>
        <text x="26" y="0">No uploads · no accounts · no servers</text>
      </g>
      <g transform="translate(480 0)">
        <circle cx="10" cy="-6" r="6" fill="${cat.color}"/>
        <text x="26" y="0">Free, private &amp; offline capable</text>
      </g>
    </g>
  </g>
</svg>
`;

  const filePath = join(outDir, `${cat.id}.svg`);
  writeFileSync(filePath, svg);
  console.log(`Generated category OG card: ${filePath}`);
}
