import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FileSizePipe, TimeAgoPipe } from '../../shared/pipes/file-size.pipe';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { RecentService } from '../../core/services/recent.service';
import { HandoffService } from '../../core/services/handoff.service';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';
import type { RecentFileEntry } from '../../core/models/file.model';

@Component({
  selector: 'app-recent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    ToolCardComponent,
    EmptyStateComponent,
    FileSizePipe,
    TimeAgoPipe,
  ],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
})
export class RecentComponent {
  protected readonly registry = inject(ToolRegistryService);
  protected readonly recent = inject(RecentService);
  private readonly handoff = inject(HandoffService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly reopening = signal<string | null>(null);

  protected readonly files = computed(() => this.recent.recentFiles());

  constructor() {
    this.seo.apply({
      title: 'Recent files and tools',
      description:
        'Files you recently opened and tools you recently used, remembered on this device only. File contents are stored locally and only when you opt in.',
      path: '/recent',
      noIndex: true,
    });
  }

  protected toolTitle(entry: RecentFileEntry): string {
    return entry.toolId ? (this.registry.byId(entry.toolId)?.title ?? 'Unknown tool') : '';
  }

  protected toolPath(entry: RecentFileEntry): string | null {
    return entry.toolId ? (this.registry.byId(entry.toolId)?.path ?? null) : null;
  }

  protected suggestionsFor(entry: RecentFileEntry) {
    return this.registry.forExtension(entry.extension).slice(0, 3);
  }

  /** Reopens a cached file in the tool it was last used with. */
  protected async reopen(entry: RecentFileEntry): Promise<void> {
    const path = this.toolPath(entry) ?? this.suggestionsFor(entry)[0]?.path;
    if (!path) {
      this.toast.info('No tool here opens that file type');
      return;
    }

    this.reopening.set(entry.id);
    try {
      const file = await this.recent.restore(entry);
      if (!file) {
        this.toast.warning(
          'That file is not cached on this device',
          'Turn on "keep a local copy" to reopen files without picking them again.',
        );
        void this.router.navigateByUrl(path);
        return;
      }
      this.handoff.offer([file]);
      void this.router.navigateByUrl(path);
    } finally {
      this.reopening.set(null);
    }
  }

  protected toggleRetention(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.recent.setRetainFiles(on);
    this.toast.info(
      on ? 'Files will be cached in this browser' : 'Cached file contents were deleted',
    );
  }

  protected remove(entry: RecentFileEntry): void {
    this.recent.removeFile(entry.id);
  }

  protected clearFiles(): void {
    this.recent.clearFiles();
    this.toast.success('Recent file history cleared');
  }

  protected clearTools(): void {
    this.recent.clearTools();
  }
}
