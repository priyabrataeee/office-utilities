import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Contact</span>
        </nav>
        <h1>Contact</h1>
        <p>
          {{ site.name }} is built and maintained by one person. Mail reaches a real inbox and gets
          a real reply — just not always a fast one.
        </p>
      </header>

      <div class="contacts">
        <a class="contact" href="mailto:support&#64;office-utilities.org">
          <app-icon name="mail" [size]="20" />
          <span class="contact__addr">support&#64;office-utilities.org</span>
          <span class="contact__use">
            A tool that misbehaves, a file that will not convert, a feature you wish existed.
          </span>
        </a>

        <a class="contact" href="mailto:privacy&#64;office-utilities.org">
          <app-icon name="shield-check" [size]="20" />
          <span class="contact__addr">privacy&#64;office-utilities.org</span>
          <span class="contact__use">
            Questions about how your data is handled, advertising and cookies, or anything on the
            <a routerLink="/privacy">privacy page</a>.
          </span>
        </a>

        <a class="contact" href="mailto:contact&#64;office-utilities.org">
          <app-icon name="info" [size]="20" />
          <span class="contact__addr">contact&#64;office-utilities.org</span>
          <span class="contact__use">
            Anything else — press, partnerships, legal notices, or just to say the thing was useful.
          </span>
        </a>
      </div>

      <div class="prose ou-prose">
        <h2>Please do not email your documents</h2>
        <p>
          If a file will not convert, describe what happened rather than attaching it. The whole
          point of this site is that your documents never leave your device, and emailing one to
          us would undo exactly the thing you came here for.
        </p>
        <p>
          What genuinely helps: the tool you were using, what you expected, what happened instead,
          your browser and operating system, and any message shown on screen. If the file is one
          you can share safely — something you generated for the purpose, not real work — say so
          and we will ask.
        </p>

        <h2>What to expect</h2>
        <p>
          This is a side project, not a company with a support desk. Expect a reply within a few
          days rather than a few hours, and slower at weekends. Bug reports with clear steps get
          answered first, because they are the ones that can actually be acted on.
        </p>
        <p>
          There is no account system, so there is no password to reset and no subscription to
          cancel. We hold nothing on a server that could be sent to you or deleted on request —
          the <a routerLink="/privacy">privacy page</a> lists the handful of preferences kept in
          your own browser and how to clear them yourself.
        </p>

        <h2>Before you write</h2>
        <p>
          A few answers that come up often are already written down. The
          <a routerLink="/about">about page</a> covers how the tools work and what they genuinely
          cannot do — no OCR for scanned pages, no reconstruction of complex PDF layouts, and
          Latin-script fonts only in generated PDFs. Most tools also carry their own questions and
          answers at the bottom of the page.
        </p>
      </div>

      <div class="cta">
        <a class="ou-btn ou-btn--lg" routerLink="/about">
          <app-icon name="info" [size]="16" />
          About the project
        </a>
        <a class="ou-btn ou-btn--lg" routerLink="/privacy">
          <app-icon name="shield-check" [size]="16" />
          Privacy model
        </a>
      </div>
    </div>
  `,
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly seo = inject(SeoService);
  protected readonly site = SITE;

  constructor() {
    this.seo.apply({
      title: `Contact ${SITE.name}`,
      description: `Get in touch about ${SITE.name} — support for a tool that is not behaving, privacy and advertising questions, or anything else.`,
      path: '/contact',
      keywords: ['contact', 'support', 'get in touch', 'report a bug'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: `Contact ${SITE.name}`,
          url: `${SITE.origin}/contact`,
        },
      ],
    });
  }
}
