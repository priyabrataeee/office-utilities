import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetToolBase } from '../spreadsheet-tool-base';
import type { FormulaCell } from '../../../core/engines/xlsx.engine';

@Component({
  selector: 'app-formula-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './formula-viewer.component.html',
  styleUrl: './formula-viewer.component.scss',
})
export class FormulaViewerComponent extends SpreadsheetToolBase {
  readonly toolId = 'formula-viewer';

  protected readonly query = signal('');
  protected readonly scope = signal<'all' | 'sheet'>('all');

  protected readonly allFormulas = computed<FormulaCell[]>(() =>
    this.sheets().flatMap((sheet) => sheet.formulas),
  );

  protected readonly scopedFormulas = computed(() =>
    this.scope() === 'sheet'
      ? (this.activeSheet()?.formulas ?? [])
      : this.allFormulas(),
  );

  protected readonly filtered = computed(() => {
    const needle = this.query().trim().toLowerCase();
    if (!needle) return this.scopedFormulas();
    return this.scopedFormulas().filter(
      (cell) =>
        cell.formula.toLowerCase().includes(needle) ||
        cell.address.toLowerCase().includes(needle) ||
        cell.sheet.toLowerCase().includes(needle),
    );
  });

  /** Which functions this workbook actually uses, most-used first. */
  protected readonly functionUsage = computed(() => {
    const counts = new Map<string, number>();
    for (const cell of this.allFormulas()) {
      for (const name of cell.functions) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  });

  protected readonly exportText = computed(() =>
    this.filtered()
      .map((cell) => `${cell.sheet}!${cell.address}\t${cell.formula}\t${cell.result ?? ''}`)
      .join('\n'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setScope(event: Event): void {
    this.scope.set((event.target as HTMLSelectElement).value as 'all' | 'sheet');
  }

  protected searchFunction(name: string): void {
    this.query.set(name);
  }

  protected startOver(): void {
    this.query.set('');
    this.reset();
  }
}
