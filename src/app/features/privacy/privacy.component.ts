import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { StorageService } from '../../core/services/storage.service';
import { FileCacheService } from '../../core/services/file-cache.service';
import { RecentService } from '../../core/services/recent.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, FileSizePipe],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  private readonly storage = inject(StorageService);
  private readonly cache = inject(FileCacheService);
  private readonly recent = inject(RecentService);
  private readonly favorites = inject(FavoritesService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly site = SITE;
  protected readonly localBytes = signal(0);
  protected readonly cacheBytes = signal<number | null>(null);
  protected readonly keys = signal<string[]>([]);

  protected readonly hasData = computed(() => this.keys().length > 0);

  constructor() {
    this.seo.apply({
      title: 'Privacy',
      description: `${SITE.name} never uploads your files. This page explains exactly what is stored on your device, why, and how to erase all of it in one click.`,
      path: '/privacy',
      keywords: ['privacy policy', 'no upload', 'local processing', 'gdpr friendly'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Privacy',
          url: `${SITE.origin}/privacy`,
          description: `How ${SITE.name} handles your data: it does not leave your device.`,
        },
      ],
    });
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.localBytes.set(this.storage.usedBytes());
    this.keys.set(this.storage.keys());
    const usage = await this.cache.usage();
    this.cacheBytes.set(usage ? usage.usage : null);
  }

  protected async eraseEverything(): Promise<void> {
    this.recent.clearAll();
    this.favorites.clear();
    this.storage.clearAll();
    await this.cache.clear();
    await this.refresh();
    this.toast.success('All locally stored data erased');
  }

  protected label(key: string): string {
    const labels: Record<string, string> = {
      theme: 'Light/dark preference',
      favorites: 'Favourite tool ids',
      'recent-tools': 'Recently used tool ids',
      'recent-files': 'Recent file names and sizes',
      'retain-files': 'Whether file contents are cached',
      'diagram-autosave': 'Diagram Studio autosave',
      'generator-drafts': 'Document generator drafts',
    };
    return labels[key] ?? key;
  }
}
