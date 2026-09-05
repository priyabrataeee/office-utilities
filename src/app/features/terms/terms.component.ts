import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Terms</span>
        </nav>
        <h1>Terms of use</h1>
        <p>
          Plain English, and short, because there is not much to agree to. The site is free, there
          is no account, and your documents are never sent to us.
        </p>
        <p class="updated">Last updated {{ updated }}</p>
      </header>

      <div class="prose ou-prose">
        <h2>1. Accepting these terms</h2>
        <p>
          Using {{ site.name }} means you accept what is written here. If you do not, please do not
          use the site. We may revise these terms as the site changes; the date above shows when
          they were last altered, and continuing to use the site after a change means accepting the
          revised version.
        </p>

        <h2>2. What the service is</h2>
        <p>
          {{ site.name }} is a collection of document tools that run inside your web browser. There
          is no account to create, nothing to install, and no charge. The tools are provided as a
          free service and may be changed, limited or withdrawn at any time without notice.
        </p>
        <p>
          Because the processing happens on your own device, the service depends on your browser
          and hardware. Large files may be slow or may fail entirely depending on the memory
          available to your browser, and older browsers may not support every tool.
        </p>

        <h2>3. Your files remain yours</h2>
        <p>
          We claim no ownership of, and acquire no rights in, anything you open with these tools.
          Files are read into your browser's memory and processed there. They are not uploaded,
          copied to a server, or transmitted to us or anyone else, which also means we have no
          copy of them and cannot recover one for you.
        </p>
        <p>
          You are responsible for keeping your own backups. Converting a document produces a new
          file; it does not preserve the original for you.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to use {{ site.name }} to:</p>
        <ul>
          <li>
            process material you have no legal right to process, including copyrighted work you do
            not own or hold a licence for;
          </li>
          <li>
            remove access controls from documents you are not authorised to open — the password and
            watermark tools exist for your own files, not other people's;
          </li>
          <li>break any applicable law, or infringe anyone's rights;</li>
          <li>attempt to disrupt the site or the service it provides.</li>
        </ul>
        <p>
          Since nothing you do passes through a server, we cannot monitor or police this. It rests
          on you.
        </p>

        <h2>5. No warranty</h2>
        <p>
          The service is provided <strong>as is</strong> and <strong>as available</strong>, without
          warranty of any kind, express or implied. We do not warrant that the tools will be
          accurate, uninterrupted, error-free, or fit for any particular purpose.
        </p>
        <p>
          Document conversion is lossy by nature and some of it is inference rather than
          reproduction. The <a routerLink="/disclaimer">disclaimer</a> sets out the known
          limitations in detail, and you should read it before relying on any output.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any loss or damage arising
          from your use of the site — including lost, corrupted or incorrectly converted documents,
          lost time, lost profits, or any indirect or consequential loss.
        </p>
        <p>
          This is a free service with no account and no payment. Nothing here is intended to
          exclude liability that cannot lawfully be excluded.
        </p>

        <h2>7. Advertising</h2>
        <p>
          The site is funded by advertising supplied by Google AdSense. Ads are served by Google as
          a third party and are subject to Google's own terms and policies, not ours. We do not
          control which ads appear and do not endorse what they promote.
        </p>
        <p>
          Google sets its own cookies on your device for this purpose. What that involves is set
          out on the <a routerLink="/privacy">privacy page</a>.
        </p>

        <h2>8. Third-party links</h2>
        <p>
          Some pages link to other websites, and advertisements link to destinations we do not
          control. We are not responsible for the content, accuracy or practices of any site we
          link to or that an advertisement leads to.
        </p>

        <h2>9. Intellectual property and licence</h2>
        <p>
          The name, branding and written content of {{ site.name }} belong to their author. The
          source code is published under the GNU Affero General Public License, version 3 or later.
        </p>
        <p>
          That means you are free to read it, modify it and share it. It also means that if you run
          a modified version as a service other people can use, you must offer those people the
          source of your version under the same licence. The tools are built on open-source
          libraries, each of which remains under its own licence.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of India, and the courts of India have jurisdiction
          over any dispute arising from them.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms can go to
          <a href="mailto:contact&#64;office-utilities.org">contact&#64;office-utilities.org</a>, or
          see the <a routerLink="/contact">contact page</a> for the right address for other
          subjects.
        </p>
      </div>

      <div class="cta">
        <a class="ou-btn ou-btn--lg" routerLink="/privacy">
          <app-icon name="shield-check" [size]="16" />
          Privacy
        </a>
        <a class="ou-btn ou-btn--lg" routerLink="/disclaimer">
          <app-icon name="alert-circle" [size]="16" />
          Disclaimer
        </a>
      </div>
    </div>
  `,
  styleUrl: './terms.component.scss',
})
export class TermsComponent {
  private readonly seo = inject(SeoService);
  protected readonly site = SITE;
  protected readonly updated = 'September 2026';

  constructor() {
    this.seo.apply({
      title: 'Terms of use',
      description: `The terms covering use of ${SITE.name} — a free, browser-based document toolkit with no accounts and no uploads.`,
      path: '/terms',
      keywords: ['terms of use', 'terms and conditions', 'terms of service'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Terms of use',
          url: `${SITE.origin}/terms`,
        },
      ],
    });
  }
}
