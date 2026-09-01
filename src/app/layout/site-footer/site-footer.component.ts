import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { MonetizationService } from '../../core/services/monetization.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="footer ou-no-print">
      <div class="footer__inner">
        <div class="footer__brand">
          <a class="brand" routerLink="/">
            <span class="brand__mark"><app-icon name="logo" [size]="18" /></span>
            <span>Office<span class="brand__soft">Utilities</span></span>
          </a>
          <p class="footer__tagline">{{ site.tagline }}</p>
          <p class="footer__privacy">
            <app-icon name="shield-check" [size]="14" />
            Every tool runs in your browser. No uploads and no accounts.
          </p>
        </div>

        <nav class="footer__cols" aria-label="Footer">
          @for (category of registry.categories; track category.id) {
            <div class="footer__col">
              <h3>{{ category.title }}</h3>
              <ul>
                <!-- @for (tool of topOf(category.id); track tool.id) {
                  <li><a [routerLink]="tool.path">{{ tool.title }}</a></li>
                } -->
                <li>
                  <a class="footer__more" [routerLink]="['/', category.slug]">
                    {{ registry.countInCategory(category.id) }} tools
                    <app-icon name="arrow-right" [size]="12" />
                  </a>
                </li>
              </ul>
            </div>
          }
        </nav>
      </div>

      <div class="footer__bar">
        <span>© {{ year }} {{ site.name }} · v{{ site.version }}</span>
        <nav aria-label="Legal">
          <a routerLink="/about">About</a>
          <a routerLink="/privacy">Privacy</a>
          <a routerLink="/tools">All tools</a>
          <a routerLink="/categories">Categories</a>
          <a
            class="footer__support"
            [href]="money.donationUrl"
            target="_blank"
            rel="noopener"
            >Buy me a coffee</a
          >
        </nav>
      </div>
    </footer>
  `,
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  protected readonly registry = inject(ToolRegistryService);
  protected readonly money = inject(MonetizationService);
  protected readonly site = SITE;
  protected readonly year = new Date().getFullYear();

  protected topOf(categoryId: string) {
    return this.registry
      .inCategory(categoryId as never)
      .slice()
      .sort((a, b) => Number(!!b.popular) - Number(!!a.popular))
      .slice(0, 5);
  }
}
