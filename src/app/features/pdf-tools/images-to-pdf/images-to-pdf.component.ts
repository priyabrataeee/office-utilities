import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { imagesToPdf, type ImagesToPdfOptions } from '../../../core/engines/pdf.engine';
import type { PageSizeName } from '../../../core/engines/doc-model';

interface ImageEntry {
  readonly id: string;
  readonly file: File;
  readonly url: string;
}

@Component({
  selector: 'app-images-to-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './images-to-pdf.component.html',
  styleUrl: './images-to-pdf.component.scss',
})
export class ImagesToPdfComponent extends ToolBase {
  readonly toolId = 'images-to-pdf';

  protected readonly entries = signal<ImageEntry[]>([]);
  protected readonly pageSize = signal<PageSizeName | 'fit'>('A4');
  protected readonly orientation = signal<'portrait' | 'landscape' | 'auto'>('auto');
  protected readonly margin = signal(24);
  protected readonly outputName = signal('images.pdf');
  protected readonly dragId = signal<string | null>(null);

  protected readonly pageSizes: readonly (PageSizeName | 'fit')[] = [
    'A4',
    'Letter',
    'A3',
    'A5',
    'Legal',
    'fit',
  ];

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const additions = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
      }));
    if (!additions.length) return;
    this.entries.update((list) => [...list, ...additions]);
  }

  protected remove(id: string): void {
    this.entries.update((list) => {
      const target = list.find((entry) => entry.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return list.filter((entry) => entry.id !== id);
    });
  }

  protected move(id: string, delta: number): void {
    const list = [...this.entries()];
    const index = list.findIndex((entry) => entry.id === id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.entries.set(list);
  }

  protected sortByName(): void {
    this.entries.set(
      [...this.entries()].sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
      ),
    );
  }

  protected onDragStart(id: string): void {
    this.dragId.set(id);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(targetId: string): void {
    const sourceId = this.dragId();
    this.dragId.set(null);
    if (!sourceId || sourceId === targetId) return;
    const list = [...this.entries()];
    const from = list.findIndex((entry) => entry.id === sourceId);
    const to = list.findIndex((entry) => entry.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    this.entries.set(list);
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set((event.target as HTMLSelectElement).value as PageSizeName | 'fit');
  }

  protected setOrientation(event: Event): void {
    this.orientation.set(
      (event.target as HTMLSelectElement).value as 'portrait' | 'landscape' | 'auto',
    );
  }

  protected setMargin(event: Event): void {
    this.margin.set(Number((event.target as HTMLInputElement).value));
  }

  protected setOutputName(event: Event): void {
    this.outputName.set((event.target as HTMLInputElement).value);
  }

  protected async build(): Promise<void> {
    const entries = this.entries();
    if (!entries.length) return;

    const options: ImagesToPdfOptions = {
      pageSize: this.pageSize(),
      orientation: this.orientation(),
      margin: this.margin(),
      background: '#ffffff',
    };

    const blob = await this.run('Building PDF…', () =>
      imagesToPdf(
        entries.map((entry) => entry.file),
        options,
        this.onProgress,
      ),
    );
    if (!blob) return;

    const name = this.outputName().trim() || 'images.pdf';
    this.setOutputs([this.output(name.endsWith('.pdf') ? name : `${name}.pdf`, blob)]);
  }

  protected startOver(): void {
    for (const entry of this.entries()) URL.revokeObjectURL(entry.url);
    this.entries.set([]);
    this.reset();
  }
}
