import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { detectFormat, type DetectionResult } from '../../../core/engines/file-inspect.engine';

interface Checked {
  readonly name: string;
  readonly size: number;
  readonly detection: DetectionResult;
}

@Component({
  selector: 'app-signature-checker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './signature-checker.component.html',
  styleUrl: './signature-checker.component.scss',
})
export class SignatureCheckerComponent extends ToolBase {
  readonly toolId = 'file-signature-checker';

  protected readonly checked = signal<Checked[]>([]);

  protected readonly mismatches = computed(() =>
    this.checked().filter((entry) => entry.detection.mismatch),
  );
  protected readonly executables = computed(() =>
    this.checked().filter((entry) => entry.detection.category === 'executable'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (!files.length) return;
    void this.run('Reading file signatures…', async () => {
      const out: Checked[] = [];
      for (const [index, file] of files.entries()) {
        out.push({ name: file.name, size: file.size, detection: await detectFormat(file) });
        this.onProgress(index + 1, files.length);
      }
      this.checked.set(out);
    });
  }

  protected statusOf(entry: Checked): 'ok' | 'mismatch' | 'unknown' {
    if (entry.detection.confidence === 'none') return 'unknown';
    return entry.detection.mismatch ? 'mismatch' : 'ok';
  }

  protected iconFor(entry: Checked): string {
    const status = this.statusOf(entry);
    return status === 'ok' ? 'check-circle' : status === 'mismatch' ? 'alert-triangle' : 'scan';
  }

  protected startOver(): void {
    this.checked.set([]);
    this.reset();
  }
}
