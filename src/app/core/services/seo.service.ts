import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE } from '../site.config';
import type { ResolvedTool, ToolCategory } from '../models/tool.model';
import type { ResolvedGuide } from '../models/guide.model';

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly keywords?: readonly string[];
  readonly structuredData?: readonly object[];
  readonly noIndex?: boolean;
  readonly image?: string;
  readonly imageAlt?: string;
}

const LD_ID = 'ou-structured-data';

const TITLE_LIMIT = 60;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply(seo: PageSeo): void {
    const url = SITE.origin + (seo.path === '/' ? '' : seo.path);
    const fullTitle = formatPageTitle(seo.title, SITE.name, TITLE_LIMIT);

    this.title.setTitle(fullTitle);

    this.setName('description', metaDescription(seo.description));
    this.setName(
      'robots',
      seo.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    this.meta.removeTag("name='keywords'");

    const ogImage = seo.image || `${SITE.origin}/og/cover.jpg`;
    const ogImageAlt = seo.imageAlt || `${SITE.name} — ${SITE.tagline}`;

    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', SITE.name);
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', seo.description);
    this.setProperty('og:url', url);
    this.setProperty('og:locale', 'en');
    this.setName('author', SITE.name);
    this.setProperty('og:image', ogImage);
    this.setProperty('og:image:alt', ogImageAlt);

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:site', SITE.twitter);
    this.setName('twitter:title', fullTitle);
    this.setName('twitter:description', seo.description);
    this.setName('twitter:image', ogImage);

    this.setCanonical(url);
    this.setStructuredData(seo.structuredData ?? []);
  }

  toolSeo(tool: ResolvedTool): PageSeo {
    const structuredData: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': ['SoftwareApplication', 'WebApplication'],
        name: tool.title,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: tool.categoryRef.title,
        operatingSystem: 'Any (web browser)',
        description: tool.description,
        url: SITE.origin + tool.path,
        image: `${SITE.origin}/icons/icon-512x512.png`,
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        featureList: [...tool.keywords],
        browserRequirements: 'Requires JavaScript. Works in any modern browser.',
        inLanguage: SITE.locale,
        publisher: {
          '@type': 'Organization',
          name: SITE.name,
          url: SITE.origin,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE.origin}/icons/icon-512x512.png`,
          },
        },
      },
      this.breadcrumbs([
        { name: 'Home', path: '/' },
        { name: tool.categoryRef.title, path: `/${tool.categoryRef.slug}` },
        { name: tool.title, path: tool.path },
      ]),
    ];

    if (tool.faq?.length) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: tool.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      });
    }

    return {
      title: `${tool.title} — Free, No Uploads`,
      description: tool.description,
      path: tool.path,
      image: `${SITE.origin}/og/categories/${tool.categoryRef.id}.svg`,
      imageAlt: `${tool.title} — ${SITE.name}`,
      keywords: [
        ...tool.keywords,
        tool.title.toLowerCase(),
        'online',
        'free',
        'no upload',
        'offline in browser',
        'privacy first',
      ],
      structuredData,
    };
  }

  guideSeo(guide: ResolvedGuide): PageSeo {
    const wordCount = guide.body.reduce((count, block) => {
      if ('text' in block && typeof block.text === 'string') {
        return count + block.text.trim().split(/\s+/).length;
      }
      if ('items' in block && Array.isArray(block.items)) {
        return count + block.items.reduce((c, item) => c + item.trim().split(/\s+/).length, 0);
      }
      return count;
    }, 0);

    return {
      title: guide.title,
      description: guide.summary,
      path: guide.path,
      keywords: [...guide.keywords, 'document security', 'privacy guide', 'office tools'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.summary,
          url: SITE.origin + guide.path,
          datePublished: guide.published,
          dateModified: guide.updated ?? guide.published,
          wordCount: wordCount > 0 ? wordCount : undefined,
          inLanguage: SITE.locale,
          author: {
            '@type': 'Person',
            name: SITE.author.name,
            url: SITE.author.url,
            email: SITE.author.email,
            sameAs: [...SITE.author.sameAs],
          },
          publisher: {
            '@type': 'Organization',
            name: SITE.name,
            url: SITE.origin,
            logo: {
              '@type': 'ImageObject',
              url: `${SITE.origin}/icons/icon-512x512.png`,
            },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': SITE.origin + guide.path },
          image: `${SITE.origin}/og/cover.jpg`,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: guide.title,
              acceptedAnswer: { '@type': 'Answer', text: guide.answer },
            },
          ],
        },
        this.breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.title, path: guide.path },
        ]),
      ],
    };
  }

  categorySeo(category: ToolCategory, tools: readonly ResolvedTool[]): PageSeo {
    return {
      title: `${category.title} — ${tools.length} Browser Tools`,
      description: category.description,
      path: `/${category.slug}`,
      image: `${SITE.origin}/og/categories/${category.id}.svg`,
      imageAlt: `${category.title} — ${SITE.name}`,
      keywords: [
        category.title.toLowerCase(),
        category.tagline.toLowerCase(),
        'free office tools',
        'browser based',
        'no upload',
      ],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: category.title,
          description: category.description,
          url: `${SITE.origin}/${category.slug}`,
          numberOfItems: tools.length,
          itemListOrder: 'https://schema.org/ItemListUnordered',
          itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: tool.title,
            description: tool.summary,
            url: SITE.origin + tool.path,
          })),
        },
        this.breadcrumbs([
          { name: 'Home', path: '/' },
          { name: category.title, path: `/${category.slug}` },
        ]),
      ],
    };
  }

  breadcrumbs(trail: readonly { name: string; path: string }[]): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: SITE.origin + (item.path === '/' ? '' : item.path),
      })),
    };
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setStructuredData(blocks: readonly object[]): void {
    for (const stale of Array.from(this.doc.head.querySelectorAll(`script[data-ou='${LD_ID}']`))) {
      stale.remove();
    }
    for (const block of blocks) {
      const script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-ou', LD_ID);
      script.textContent = JSON.stringify(block);
      this.doc.head.appendChild(script);
    }
  }
}

export function formatPageTitle(rawTitle: string, brand: string, limit = 60): string {
  const cleanTitle = rawTitle.trim();
  if (cleanTitle.includes(brand)) return cleanTitle;

  const suffix = ` — ${brand}`;
  if (cleanTitle.length + suffix.length <= limit) {
    return cleanTitle + suffix;
  }

  const available = limit - suffix.length;
  if (available < 16) {
    return cleanTitle.length <= limit ? cleanTitle : cleanTitle.slice(0, limit - 1) + '…';
  }

  let truncated = cleanTitle.slice(0, available);
  const wordEnd = truncated.lastIndexOf(' ');
  if (wordEnd > 10) {
    truncated = truncated.slice(0, wordEnd).replace(/[,;:—-]$/, '');
  }
  return `${truncated}${suffix}`;
}

export function metaDescription(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 160) return trimmed;

  const window = trimmed.slice(0, 160);
  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (sentenceEnd >= 90) return window.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(' ');
  return `${window.slice(0, wordEnd > 0 ? wordEnd : 157).replace(/[,;:—-]$/, '')}…`;
}
