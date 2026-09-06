import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">About</span>
        </nav>
        <h1>About {{ site.name }}</h1>
        <p>
          {{ registry.tools.length }} office tools that run entirely inside your browser. No server
          does the work, because there is no server to do it.
        </p>
      </header>

      <div class="prose ou-prose">
        <h2>The idea</h2>
        <p>
          Every online converter asks for the same thing: upload your document, trust us with it,
          wait in a queue. For a holiday photo that is fine. For a signed contract, an unreleased
          set of results or a payroll spreadsheet, it is a real risk that most people take because
          the alternative is installing software.
        </p>
        <p>
          Modern browsers no longer make that trade necessary. They can parse ZIP containers, decode
          and re-encode images, rasterise PDFs, run cryptographic hashes and lay out documents — all
          natively and all locally. {{ site.name }} is built entirely on those capabilities.
        </p>

        <h2>How it works</h2>
        <p>
          The app is a static site: HTML, CSS, JavaScript and WebAssembly, served from a CDN and
          cached by a service worker. When you choose a file, it is read with the
          <code>File</code> API into memory in your tab. Parsing and rendering happen there, mostly
          inside Web Workers so the interface never freezes, and the result is handed back to you as
          a Blob that your browser saves to disk.
        </p>
        <p>
          At no point is there a network request carrying your data — you can verify this yourself
          by opening your browser's network panel while you work.
        </p>

        <h2>What it is built with</h2>
        <ul>
          <li><strong>Angular {{ angularVersion }}</strong> with standalone components and signals</li>
          <li><strong>Server-side rendering</strong> at build time, so every tool page is real HTML for crawlers</li>
          <li><strong>PDF.js</strong> for rendering and <strong>pdf-lib</strong> for writing PDFs, including AES encryption</li>
          <li><strong>SheetJS</strong> for spreadsheets, <strong>Mammoth</strong> and <strong>docx</strong> for Word</li>
          <li><strong>JSZip</strong> to read the OpenXML containers behind DOCX, XLSX and PPTX</li>
          <li><strong>Mermaid</strong> for text-driven diagrams, plus a custom SVG canvas for the studio</li>
          <li><strong>Web Workers</strong> and the <strong>Web Crypto API</strong> for hashing and heavy parsing</li>
        </ul>

        <h2>Honest limitations</h2>
        <p>
          Doing everything locally has trade-offs, and it is better to name them than to pretend
          otherwise:
        </p>
        <ul>
          <li>
            Very large files are bounded by the memory your browser tab is allowed to use, typically
            a few gigabytes on desktop and much less on mobile.
          </li>
          <li>
            Word and PowerPoint layout is reconstructed from the OpenXML, not rendered by Microsoft's
            own engine, so intricate layouts can reflow. Ordinary business documents convert well.
          </li>
          <li>
            Watermarks that were flattened into a page image cannot be removed losslessly — nothing
            can do that, on any device.
          </li>
          <li>
            There is no OCR of scanned pages in this release, so text extraction needs a text layer.
          </li>
        </ul>

        <h2>Cost</h2>
        <p>
          The tools are free and there is nothing to sign up for. Your documents are processed on
          your own device, so their contents are never sent anywhere. See
          <a routerLink="/privacy">the privacy page</a> for exactly what is stored on your device
          and how to clear it.
        </p>
      </div>

      <div class="cta">
        <a class="ou-btn ou-btn--primary ou-btn--lg" routerLink="/tools">
          Browse all {{ registry.tools.length }} tools
          <app-icon name="arrow-right" [size]="16" />
        </a>
        <a class="ou-btn ou-btn--lg" routerLink="/privacy">
          <app-icon name="shield-check" [size]="16" />
          Privacy model
        </a>
        <a class="ou-btn ou-btn--lg" [href]="site.repoUrl" target="_blank" rel="noopener">
          <app-icon name="github" [size]="16" />
          Read the source
        </a>
      </div>
    </div>
  `,
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  protected readonly registry = inject(ToolRegistryService);
  private readonly seo = inject(SeoService);
  protected readonly site = SITE;
  protected readonly angularVersion = 20;

  constructor() {
    this.seo.apply({
      title: `About ${SITE.name}`,
      description: `How ${SITE.name} runs ${this.registry.tools.length} office document tools entirely in your browser — the technology behind it, and its honest limitations.`,
      path: '/about',
      keywords: ['about', 'client-side document tools', 'how it works', 'privacy first'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: `About ${SITE.name}`,
          url: `${SITE.origin}/about`,
        },
      ],
    });
  }
}
