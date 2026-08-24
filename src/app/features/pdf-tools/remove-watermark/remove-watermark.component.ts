import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  coverRegion,
  findWatermarks,
  removeWatermarks,
  type WatermarkFinding,
} from '../../../core/engines/pdf.engine';
import { closePdf, describePdf, openPdf, renderThumbnail } from '../../../core/engines/pdfjs.engine';
import { formatPageRanges, withSuffix } from '../../../core/utils/file.util';

@Component({
  selector: 'app-remove-watermark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './remove-watermark.component.html',
  styleUrl: './remove-watermark.component.scss',
})
export class RemoveWatermarkComponent extends ToolBase {
  readonly toolId = 'remove-watermark-pdf';

  protected readonly findings = signal<WatermarkFinding[]>([]);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly scanned = signal(false);
  protected readonly preview = signal<string | null>(null);
  protected readonly isScan = signal(false);

  /** Cover-mode region, expressed as page fractions. */
  protected readonly useCover = signal(false);
  protected readonly coverX = signal(0.25);
  protected readonly coverY = signal(0.4);
  protected readonly coverW = signal(0.5);
  protected readonly coverH = signal(0.2);
  protected readonly coverColor = signal('#ffffff');

  protected readonly canRemove = computed(
    () => this.selected().size > 0 || (this.useCover() && this.hasFile()),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.scan(files[0]);
  }

  private async scan(file: File): Promise<void> {
    this.scanned.set(false);
    this.findings.set([]);
    this.selected.set(new Set());

    await this.run('Scanning for watermarks…', async () => {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        const info = await describePdf(doc);
        // No text layer at all is the signature of a scan, where a watermark
        // is part of the page image and cannot be lifted out.
        this.isScan.set(!info.hasTextLayer);
        this.preview.set(await renderThumbnail(doc, 1, 380));
      } finally {
        await closePdf(doc);
      }

      const found = await findWatermarks(file);
      this.findings.set(found);
      this.selected.set(new Set(found.map((finding) => finding.id)));
      this.scanned.set(true);

      if (!found.length) {
        this.useCover.set(true);
      }
    });
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string): void {
    const next = new Set(this.selected());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected.set(next);
  }

  protected pagesLabel(finding: WatermarkFinding): string {
    return `Pages ${formatPageRanges([...finding.pages])}`;
  }

  protected toggleCover(event: Event): void {
    this.useCover.set((event.target as HTMLInputElement).checked);
  }

  protected setCover(part: 'x' | 'y' | 'w' | 'h', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    ({ x: this.coverX, y: this.coverY, w: this.coverW, h: this.coverH })[part].set(value);
  }

  protected setCoverColor(event: Event): void {
    this.coverColor.set((event.target as HTMLInputElement).value);
  }

  protected async remove(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const ids = [...this.selected()];

    const blob = await this.run('Rewriting PDF…', async () => {
      let current: Blob = file;
      if (ids.length) current = await removeWatermarks(current, ids);
      if (this.useCover()) {
        current = await coverRegion(
          current,
          {
            x: this.coverX(),
            y: this.coverY(),
            width: this.coverW(),
            height: this.coverH(),
          },
          this.coverColor(),
        );
      }
      return current;
    });

    if (blob) this.setOutputs([this.output(withSuffix(file.name, '-clean'), blob)]);
  }

  protected startOver(): void {
    this.findings.set([]);
    this.selected.set(new Set());
    this.scanned.set(false);
    this.preview.set(null);
    this.useCover.set(false);
    this.reset();
  }
}
