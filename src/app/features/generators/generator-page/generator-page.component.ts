import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { StorageService } from '../../../core/services/storage.service';
import { documentToHtml } from '../../../core/engines/html.engine';
import { sanitizeHtml } from '../../../core/engines/markdown.engine';
import { renderDocumentToPdf } from '../../../core/engines/pdf-writer';
import { renderDocumentToDocx } from '../../../core/engines/docx-writer';
import { GENERATORS } from '../templates';
import type { FieldDef, FormData, FormValue, SectionDef } from '../generator.model';

const DRAFT_KEY = 'generator-drafts';

/**
 * One component behind all ten generators.
 *
 * The chosen template supplies the form schema and a pure render function; this
 * component owns the form state, the live preview, drafts and the exports.
 * Drafts are kept in this browser only — invoices and payslips are exactly the
 * documents that should never be posted anywhere.
 */
@Component({
  selector: 'app-generator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ResultPanelComponent, BusyOverlayComponent, IconComponent],
  templateUrl: './generator-page.component.html',
  styleUrl: './generator-page.component.scss',
})
export class GeneratorPageComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly storage = inject(StorageService);

  readonly toolIdInput = input.required<string>({ alias: 'toolId' });

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly data = signal<FormData>({});
  protected readonly preview = signal<SafeHtml | null>(null);
  protected readonly activeSection = signal(0);
  protected readonly savedAt = signal<number | null>(null);

  protected readonly definition = computed(() => GENERATORS[this.toolIdInput()] ?? null);
  protected readonly sections = computed<readonly SectionDef[]>(
    () => this.definition()?.sections ?? [],
  );
  protected readonly blocks = computed(() => {
    const definition = this.definition();
    if (!definition) return [];
    try {
      return definition.render(this.data());
    } catch {
      // A half-typed form should never blank the preview.
      return [];
    }
  });

  constructor() {
    super();

    // Load the saved draft (or the sample) as soon as the route resolves.
    effect(() => {
      const definition = this.definition();
      if (!definition) return;
      untracked(() => {
        const drafts = this.storage.read<Record<string, FormData>>(DRAFT_KEY, {});
        this.data.set(drafts[definition.toolId] ?? definition.initial());
      });
    });

    // Re-render the preview whenever the form changes.
    effect(() => {
      const blocks = this.blocks();
      untracked(() => void this.renderPreview(blocks));
    });
  }

  private async renderPreview(blocks: ReturnType<typeof this.blocks>): Promise<void> {
    if (!blocks.length) {
      this.preview.set(null);
      return;
    }
    const html = documentToHtml(blocks);
    this.preview.set(this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(html)));
  }

  /* ---------------- form plumbing ---------------- */

  protected value(key: string): FormValue {
    return this.data()[key] ?? '';
  }

  protected stringValue(key: string): string {
    const value = this.data()[key];
    return value === undefined || value === null ? '' : String(value);
  }

  protected boolValue(key: string): boolean {
    return this.data()[key] === true;
  }

  protected listValue(key: string): string[] {
    const value = this.data()[key];
    return Array.isArray(value) ? value.map(String) : [];
  }

  /** Reads one cell of a repeating row, tolerating missing keys. */
  protected cell(row: FormData, key: string): string {
    const value = row[key];
    return value === undefined || value === null ? '' : String(value);
  }

  protected repeatValue(key: string): FormData[] {
    const value = this.data()[key];
    return Array.isArray(value) ? (value as FormData[]) : [];
  }

  protected setField(key: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const raw =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target instanceof HTMLInputElement && target.type === 'number'
          ? target.value === ''
            ? ''
            : Number(target.value)
          : target.value;

    this.patch({ [key]: raw as FormValue });
  }

  protected setListItem(key: string, index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const next = [...this.listValue(key)];
    next[index] = value;
    this.patch({ [key]: next });
  }

  protected addListItem(key: string): void {
    this.patch({ [key]: [...this.listValue(key), ''] });
  }

  protected removeListItem(key: string, index: number): void {
    this.patch({ [key]: this.listValue(key).filter((_, i) => i !== index) });
  }

  protected setRepeatField(key: string, index: number, column: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const raw =
      target instanceof HTMLInputElement && target.type === 'number'
        ? target.value === ''
          ? ''
          : Number(target.value)
        : target.value;

    const next = this.repeatValue(key).map((row, i) =>
      i === index ? { ...row, [column]: raw as FormValue } : row,
    );
    this.patch({ [key]: next as unknown as FormValue });
  }

  protected addRepeatRow(field: FieldDef): void {
    const blank: FormData = {};
    for (const column of field.columns ?? []) {
      blank[column.key] = column.type === 'number' ? 0 : '';
    }
    this.patch({ [field.key]: [...this.repeatValue(field.key), blank] as unknown as FormValue });
  }

  protected removeRepeatRow(key: string, index: number): void {
    this.patch({
      [key]: this.repeatValue(key).filter((_, i) => i !== index) as unknown as FormValue,
    });
  }

  protected moveRepeatRow(key: string, index: number, delta: number): void {
    const list = [...this.repeatValue(key)];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.patch({ [key]: list as unknown as FormValue });
  }

  private patch(changes: FormData): void {
    this.data.update((current) => ({ ...current, ...changes }));
    this.saveDraft();
  }

  private saveDraft(): void {
    const definition = this.definition();
    if (!definition) return;
    const drafts = this.storage.read<Record<string, FormData>>(DRAFT_KEY, {});
    drafts[definition.toolId] = this.data();
    this.storage.write(DRAFT_KEY, drafts);
    this.savedAt.set(Date.now());
  }

  protected isVisible(section: SectionDef): boolean {
    return !section.showWhen || this.boolValue(section.showWhen);
  }

  protected loadSample(): void {
    const definition = this.definition();
    if (!definition) return;
    this.data.set(definition.initial());
    this.saveDraft();
    this.toast.info('Sample content loaded');
  }

  protected clearForm(): void {
    const definition = this.definition();
    if (!definition) return;

    const blank: FormData = {};
    for (const section of definition.sections) {
      for (const field of section.fields) {
        blank[field.key] =
          field.type === 'repeat' || field.type === 'list'
            ? []
            : field.type === 'checkbox'
              ? false
              : field.type === 'number'
                ? 0
                : '';
      }
    }
    this.data.set(blank);
    this.saveDraft();
    this.toast.info('Form cleared');
  }

  protected discardDraft(): void {
    const definition = this.definition();
    if (!definition) return;
    const drafts = this.storage.read<Record<string, FormData>>(DRAFT_KEY, {});
    delete drafts[definition.toolId];
    this.storage.write(DRAFT_KEY, drafts);
    this.data.set(definition.initial());
    this.savedAt.set(null);
    this.toast.success('Draft discarded');
  }

  /* ---------------- export ---------------- */

  protected async exportPdf(): Promise<void> {
    const definition = this.definition();
    const blocks = this.blocks();
    if (!definition || !blocks.length) return;

    const result = await this.run('Building PDF…', () =>
      renderDocumentToPdf(blocks, {
        size: definition.page?.size ?? 'A4',
        orientation: definition.page?.orientation ?? 'portrait',
        margin: definition.page?.margin ?? 52,
        font: definition.page?.font ?? 'sans',
        fontSize: 11,
        meta: { title: definition.fileName(this.data()) },
      }),
    );
    if (!result) return;

    if (result.droppedCharacters > 0) {
      this.toast.warning(
        `${result.droppedCharacters} characters were substituted`,
        'The standard PDF fonts cover Latin text only.',
      );
    }
    this.setOutputs([this.output(`${definition.fileName(this.data())}.pdf`, result.blob)]);
  }

  protected async exportDocx(): Promise<void> {
    const definition = this.definition();
    const blocks = this.blocks();
    if (!definition || !blocks.length) return;

    const blob = await this.run('Building Word document…', () =>
      renderDocumentToDocx(blocks, {
        size: definition.page?.size ?? 'A4',
        orientation: definition.page?.orientation ?? 'portrait',
        margin: definition.page?.margin ?? 52,
        font: definition.page?.font ?? 'sans',
        fontSize: 11,
        meta: { title: definition.fileName(this.data()) },
      }),
    );
    if (blob) {
      this.setOutputs([this.output(`${definition.fileName(this.data())}.docx`, blob)]);
    }
  }

  protected print(): void {
    window.print();
  }
}
