import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { FileDropZoneComponent } from '../../shared/components/file-drop-zone/file-drop-zone.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { HandoffService } from '../../core/services/handoff.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';
import { HOME_FAQ } from '../../core/data/home-faq';
import { extensionOf, formatBytes } from '../../core/utils/file.util';
import type { ResolvedTool } from '../../core/models/tool.model';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent, FileDropZoneComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly faq = HOME_FAQ;
  protected readonly registry = inject(ToolRegistryService);
  private readonly handoff = inject(HandoffService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly site = SITE;
  protected readonly query = signal('');
  protected readonly dropped = signal<File[]>([]);

  protected readonly searchResults = computed(() => {
    const query = this.query().trim();
    return query ? this.registry.search(query).slice(0, 8) : [];
  });

  /** Tools that can open whatever was just dropped, best match first. */
  protected readonly suggestions = computed<ResolvedTool[]>(() => {
    const files = this.dropped();
    if (!files.length) return [];
    const extensions = [...new Set(files.map((f) => extensionOf(f.name)))];
    const seen = new Set<string>();
    const out: ResolvedTool[] = [];
    for (const extension of extensions) {
      for (const tool of this.registry.forExtension(extension)) {
        if (seen.has(tool.id)) continue;
        seen.add(tool.id);
        out.push(tool);
      }
    }
    return out.slice(0, 8);
  });

  protected readonly droppedSummary = computed(() => {
    const files = this.dropped();
    if (!files.length) return '';
    const size = formatBytes(files.reduce((sum, f) => sum + f.size, 0));
    return files.length === 1 ? `${files[0].name} · ${size}` : `${files.length} files · ${size}`;
  });

  constructor() {
    this.seo.apply({
      title: 'Free PDF, Word & Excel Tools — No Uploads',
      description: SITE.description,
      path: '/',
      keywords: [
        'online pdf tools',
        'browser office tools',
        'convert documents privately',
        'no upload file converter',
        'offline document tools',
      ],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOME_FAQ.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE.name,
          url: SITE.origin,
          description: SITE.description,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE.origin}/tools?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE.name,
          url: SITE.origin,
          slogan: SITE.tagline,
          description: SITE.description,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE.origin}/icons/icon-512x512.png`,
            width: 512,
            height: 512,
          },
          // A one-person project should say so. An Organization with no human
          // attached is the shape of a shell brand, and it is the shape search
          // and AI systems discount when weighing who to trust.
          founder: {
            '@type': 'Person',
            name: SITE.author.name,
            url: SITE.author.url,
            email: SITE.author.email,
            sameAs: [...SITE.author.sameAs],
          },
          // Gives search engines and assistants a real support route, which
          // is one of the signals that separates a maintained site from an
          // abandoned one.
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@office-utilities.org',
            url: `${SITE.origin}/contact`,
            availableLanguage: 'English',
          },
        },
      ],
    });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onDropped(files: File[]): void {
    this.dropped.set(files);
  }

  protected openWith(tool: ResolvedTool): void {
    const files = this.dropped();
    if (files.length) this.handoff.offer(files);
    void this.router.navigateByUrl(tool.path);
  }

  protected clearDrop(): void {
    this.dropped.set([]);
    this.handoff.clear();
  }
}
