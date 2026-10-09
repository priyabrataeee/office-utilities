import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FileDropZoneComponent } from '../../shared/components/file-drop-zone/file-drop-zone.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { GuideRegistryService } from '../../core/services/guide-registry.service';
import { HandoffService } from '../../core/services/handoff.service';
import { SeoService } from '../../core/services/seo.service';
import { ChromaService } from '../../core/services/chroma.service';
import { SITE } from '../../core/site.config';
import { HOME_FAQ } from '../../core/data/home-faq';
import { extensionOf, formatBytes } from '../../core/utils/file.util';
import type { ResolvedTool, ToolCategoryId } from '../../core/models/tool.model';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, FileDropZoneComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly faq = HOME_FAQ;
  protected readonly registry = inject(ToolRegistryService);
  protected readonly guideRegistry = inject(GuideRegistryService);
  private readonly handoff = inject(HandoffService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly chroma = inject(ChromaService);

  protected readonly site = SITE;
  protected readonly query = signal('');
  protected readonly dropped = signal<File[]>([]);
  protected readonly selectedCategory = signal<ToolCategoryId>('pdf');
  protected readonly activeCategory = computed(() => this.registry.category(this.selectedCategory())!);
  protected readonly channelNumber = computed(() => this.registry.categories.findIndex((category) => category.id === this.selectedCategory()) + 1);
  protected readonly channelTools = computed(() => this.registry.inCategory(this.selectedCategory()).slice(0, 5));
  protected readonly channelLabels: Record<ToolCategoryId, string> = {
    viewer: 'VIEW', pdf: 'PDF', word: 'DOCX', excel: 'XLSX', powerpoint: 'PPTX',
    convert: 'SWAP', generate: 'MAKE', diagram: 'DRAW', file: 'FILE',
  };
  protected readonly channelColours: Record<ToolCategoryId, string> = {
    viewer: 'var(--ou-chip-viewer)', pdf: 'var(--ou-chip-pdf)', word: 'var(--ou-chip-word)',
    excel: 'var(--ou-chip-excel)', powerpoint: 'var(--ou-chip-powerpoint)',
    convert: 'var(--ou-chip-convert)', generate: 'var(--ou-chip-generate)',
    diagram: 'var(--ou-chip-diagram)', file: 'var(--ou-chip-file)',
  };

  protected readonly featuredGuides = computed(() => this.guideRegistry.guides.slice(0, 6));
  protected readonly featuredTools = [
    'merge-pdf', 'pdf-to-word', 'docx-to-pdf', 'compress-pdf',
    'image-converter', 'invoice-generator', 'resume-builder', 'diagram-studio',
  ].map((id) => this.registry.byId(id)).filter((tool): tool is ResolvedTool => !!tool);

  protected readonly searchResults = computed(() => {
    const query = this.query().trim();
    return query ? this.registry.search(query).slice(0, 8) : [];
  });

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
    effect(() => this.chroma.show(this.selectedCategory()));
    inject(DestroyRef).onDestroy(() => this.chroma.show(null));

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
          founder: {
            '@type': 'Person',
            name: SITE.author.name,
            url: SITE.author.url,
            email: SITE.author.email,
            sameAs: [...SITE.author.sameAs],
          },
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
