import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { extensionOf, matchesAccept } from '../../../core/utils/file.util';

/**
 * The single entry point for getting files into a tool.
 *
 * Accepts drag-and-drop (including whole folders), the file picker, and
 * clipboard paste. Validation happens here so that individual tools only ever
 * receive files they can actually handle.
 */
@Component({
  selector: 'app-file-drop-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FileSizePipe],
  templateUrl: './file-drop-zone.component.html',
  styleUrl: './file-drop-zone.component.scss',
  host: {
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
    '(document:paste)': 'onPaste($event)',
  },
})
export class FileDropZoneComponent {
  private readonly toast = inject(ToastService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Extensions to accept, including the dot. Empty accepts everything. */
  readonly accepts = input<readonly string[]>([]);
  readonly multiple = input(false);
  readonly maxFiles = input<number>(Infinity);
  readonly maxSizeBytes = input<number>(Infinity);
  readonly title = input('Drop your file here');
  readonly hint = input('');
  readonly icon = input('upload');
  /** Renders a slim bar instead of the full drop panel. */
  readonly compact = input(false);
  /** Show the currently selected files with remove buttons. */
  readonly showSelection = input(true);
  readonly allowFolders = input(false);
  readonly disabled = input(false);

  readonly filesChange = output<File[]>();

  readonly files = signal<File[]>([]);
  protected readonly isDragging = signal(false);
  private dragDepth = 0;

  protected readonly acceptAttr = computed(() => this.accepts().join(','));
  protected readonly acceptLabel = computed(() => {
    const list = this.accepts();
    if (!list.length) return 'Any file';
    return list.map((e) => e.replace('.', '').toUpperCase()).join(', ');
  });
  protected readonly totalSize = computed(() =>
    this.files().reduce((sum, f) => sum + f.size, 0),
  );

  browse(): void {
    if (this.disabled()) return;
    this.fileInput()?.nativeElement.click();
  }

  protected onPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ingest(Array.from(input.files ?? []));
    // Reset so picking the same file twice still fires a change event.
    input.value = '';
  }

  protected onDragEnter(event: DragEvent): void {
    if (this.disabled() || !this.hasFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.isDragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled() || !this.hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.isDragging.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.isDragging.set(false);

    const transfer = event.dataTransfer;
    if (!transfer) return;

    const dropped = this.allowFolders()
      ? await collectFromDataTransfer(transfer)
      : Array.from(transfer.files);
    this.ingest(dropped);
  }

  /** Lets the user paste a screenshot or a copied file straight into a tool. */
  protected onPaste(event: ClipboardEvent): void {
    if (this.disabled() || !event.clipboardData?.files.length) return;
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    const pasted = Array.from(event.clipboardData.files);
    if (pasted.length) {
      event.preventDefault();
      this.ingest(pasted);
    }
  }

  removeAt(index: number): void {
    const next = this.files().filter((_, i) => i !== index);
    this.files.set(next);
    this.filesChange.emit(next);
  }

  clear(): void {
    this.files.set([]);
    this.filesChange.emit([]);
  }

  /** Programmatic entry point, used when reopening a recent file. */
  setFiles(files: File[]): void {
    this.ingest(files, true);
  }

  private ingest(incoming: File[], replace = false): void {
    if (!incoming.length) return;

    const accepted: File[] = [];
    const rejectedType: string[] = [];
    const rejectedSize: string[] = [];

    for (const file of incoming) {
      if (!matchesAccept(file.name, this.accepts())) {
        rejectedType.push(file.name);
        continue;
      }
      if (file.size > this.maxSizeBytes()) {
        rejectedSize.push(file.name);
        continue;
      }
      accepted.push(file);
    }

    if (rejectedType.length) {
      this.toast.warning(
        rejectedType.length === 1
          ? `${rejectedType[0]} is not a supported file type`
          : `${rejectedType.length} files were skipped — unsupported type`,
        `This tool accepts ${this.acceptLabel()}.`,
      );
    }
    if (rejectedSize.length) {
      this.toast.warning(
        `${rejectedSize.length === 1 ? rejectedSize[0] : `${rejectedSize.length} files`} exceeded the size limit`,
      );
    }
    if (!accepted.length) return;

    let next = this.multiple() && !replace ? [...this.files(), ...accepted] : accepted;
    if (!this.multiple()) next = next.slice(-1);

    if (next.length > this.maxFiles()) {
      this.toast.warning(`Only the first ${this.maxFiles()} files were kept`);
      next = next.slice(0, this.maxFiles());
    }

    this.files.set(next);
    this.filesChange.emit(next);
  }

  private hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  protected extensionOf = extensionOf;
}

/** Walks a DataTransfer recursively so dropping a folder yields its files. */
async function collectFromDataTransfer(transfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(transfer.items)
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => !!e);

  if (!entries.length) return Array.from(transfer.files);

  const files: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) =>
        (entry as FileSystemFileEntry).file(resolve, () => resolve(null)),
      );
      if (file) files.push(file);
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns at most 100 entries per call; keep going until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve) =>
          reader.readEntries(resolve, () => resolve([])),
        );
        if (!batch.length) break;
        for (const child of batch) await walk(child);
      }
    }
  };

  for (const entry of entries) await walk(entry);
  return files;
}
