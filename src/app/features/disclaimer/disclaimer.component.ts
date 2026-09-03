import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-disclaimer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Disclaimer</span>
        </nav>
        <h1>Disclaimer</h1>
        <p>
          What these tools can and cannot do, written honestly. Converting documents is lossy, and
          some of it is educated guesswork — you should know which parts before you rely on the
          result.
        </p>
        <p class="updated">Last updated {{ updated }}</p>
      </header>

      <div class="prose ou-prose">
        <h2>Check the output before you rely on it</h2>
        <p>
          Every tool here is provided without warranty of accuracy. Formats such as PDF, DOCX,
          XLSX and PPTX are complex, and converting between them cannot be perfect in every case.
          Always open the result and check it before sending it to anyone, filing it, or deleting
          your original.
        </p>
        <p>
          <strong>Keep your originals.</strong> These tools produce new files; they do not preserve
          old ones. Nothing is stored on a server, so if you lose a document there is no copy for
          us to restore.
        </p>

        <h2>Known limitations</h2>
        <p>These are not bugs; they are the boundaries of what a browser can do honestly.</p>
        <ul>
          <li>
            <strong>Scanned PDFs cannot be read.</strong> A scan is a picture of text with no text
            layer, and extracting it needs OCR, which this release does not include. Tools that
            need text will tell you when they find none.
          </li>
          <li>
            <strong>PDF to Word is inference, not reproduction.</strong> A PDF stores positioned
            glyphs, not paragraphs or headings, so structure is reconstructed from font size and
            geometry. Text, headings and lists usually survive; multi-column layouts, tables and
            exact page design do not.
          </li>
          <li>
            <strong>Generated PDFs use the standard PDF fonts</strong>, which cover Latin script
            only. Characters outside that range are replaced, and the tool reports how many when it
            happens.
          </li>
          <li>
            <strong>Word's layout engine is proprietary.</strong> Intricate floating layouts,
            custom fonts and unusual spacing may reflow when converted. Letters, reports and CVs
            convert faithfully; heavily designed documents may not.
          </li>
          <li>
            <strong>Large files depend on your device.</strong> Everything runs in your browser
            tab, so available memory sets the ceiling. A file that fails on a phone may work on a
            laptop.
          </li>
        </ul>

        <h2>Not professional advice</h2>
        <p>
          The document generators — invoices, offer letters, resumes, quotations, salary slips and
          the rest — produce formatted documents from what you type. They are conveniences for
          layout, not legal, financial, tax or employment advice, and the templates are not
          reviewed against the law of any particular country.
        </p>
        <p>
          Before using any generated document for something that matters, have it checked by
          someone qualified in the relevant field and jurisdiction. You are responsible for what
          the document says and for whether it meets any legal requirement that applies to you.
        </p>

        <h2>Security tools have limits</h2>
        <p>
          Password protection applies the encryption defined by the PDF specification. It keeps
          honest readers out; it is not a guarantee against a determined attacker, and it is only
          as strong as the password you choose. The unlock tool is for documents you are entitled
          to open.
        </p>
        <p>
          Watermark removal handles watermarks added as annotations or repeated objects. A
          watermark burned into a scanned image cannot be removed cleanly, and removing one from a
          document you do not own may be unlawful regardless of whether it is technically possible.
        </p>

        <h2>Advertising and external links</h2>
        <p>
          This site carries advertising served by Google AdSense. We do not choose the individual
          adverts, do not endorse the products or services they promote, and are not responsible
          for the sites they lead to. Anything you buy or sign up for through an advertisement is
          between you and that advertiser.
        </p>
        <p>
          The same applies to any other website linked from these pages. We link to things we
          consider useful, but we do not control them and cannot vouch for their content or
          practices.
        </p>

        <h2>Availability</h2>
        <p>
          {{ site.name }} is offered free with no guarantee of availability. Tools may change,
          break or be withdrawn, and the site may be unreachable at times. Do not build a process
          that must not fail on top of a free service you do not control.
        </p>

        <h2>Questions</h2>
        <p>
          If something behaves in a way this page does not explain, that is worth reporting —
          write to
          <a href="mailto:support&#64;office-utilities.org">support&#64;office-utilities.org</a> or
          use the <a routerLink="/contact">contact page</a>.
        </p>
      </div>

      <div class="cta">
        <a class="ou-btn ou-btn--lg" routerLink="/terms">
          <app-icon name="file-text" [size]="16" />
          Terms of use
        </a>
        <a class="ou-btn ou-btn--lg" routerLink="/about">
          <app-icon name="info" [size]="16" />
          How it works
        </a>
      </div>
    </div>
  `,
  styleUrl: './disclaimer.component.scss',
})
export class DisclaimerComponent {
  private readonly seo = inject(SeoService);
  protected readonly site = SITE;
  protected readonly updated = 'September 2026';

  constructor() {
    this.seo.apply({
      title: 'Disclaimer',
      description: `The limits of ${SITE.name} — conversion accuracy, what the tools cannot do, and why generated documents are not professional advice.`,
      path: '/disclaimer',
      keywords: ['disclaimer', 'limitations', 'accuracy', 'no warranty'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Disclaimer',
          url: `${SITE.origin}/disclaimer`,
        },
      ],
    });
  }
}
