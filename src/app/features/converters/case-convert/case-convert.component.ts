import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { readAsText, withExtension } from '../../../core/utils/file.util';

export type CaseStyle =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'capitalise'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'alternating'
  | 'inverse';

interface StyleOption {
  readonly value: CaseStyle;
  readonly label: string;
  readonly example: string;
}

const STYLES: readonly StyleOption[] = [
  { value: 'upper', label: 'UPPER CASE', example: 'CUSTOMER ORDER REF' },
  { value: 'lower', label: 'lower case', example: 'customer order ref' },
  { value: 'title', label: 'Title Case', example: 'The Cost of a Good Name' },
  { value: 'sentence', label: 'Sentence case', example: 'Customer order ref' },
  { value: 'capitalise', label: 'Capitalise Every Word', example: 'The Cost Of A Good Name' },
  { value: 'camel', label: 'camelCase', example: 'customerOrderRef' },
  { value: 'pascal', label: 'PascalCase', example: 'CustomerOrderRef' },
  { value: 'snake', label: 'snake_case', example: 'customer_order_ref' },
  { value: 'kebab', label: 'kebab-case', example: 'customer-order-ref' },
  { value: 'constant', label: 'CONSTANT_CASE', example: 'CUSTOMER_ORDER_REF' },
  { value: 'dot', label: 'dot.case', example: 'customer.order.ref' },
  { value: 'alternating', label: 'aLtErNaTiNg', example: 'cUsToMeR oRdEr' },
  { value: 'inverse', label: 'iNVERSE cASE', example: 'cUSTOMER oRDER rEF' },
];

const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if', 'in', 'nor', 'of', 'on', 'or',
  'per', 'so', 'the', 'to', 'v', 'via', 'vs', 'yet',
]);

@Component({
  selector: 'app-case-convert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './case-convert.component.html',
  styleUrl: './case-convert.component.scss',
})
export class CaseConvertComponent extends ToolBase {
  readonly toolId = 'case-converter';

  protected readonly styles = STYLES;
  protected readonly source = signal('');
  protected readonly style = signal<CaseStyle>('title');

  protected readonly result = computed(() => convert(this.source(), this.style()));

  protected readonly stats = computed(() => {
    const text = this.source();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      characters: text.length,
      words,
      lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    };
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading…', async () => {
      this.source.set(await readAsText(file));
    });
  }

  protected onInput(event: Event): void {
    this.source.set((event.target as HTMLTextAreaElement).value);
  }

  protected choose(style: CaseStyle): void {
    this.style.set(style);
  }

  protected applyInPlace(): void {
    this.source.set(this.result());
  }

  protected download(): void {
    const file = this.primaryFile();
    const name = file ? withExtension(file.name, '.txt') : 'converted.txt';
    this.setOutputs([
      this.output(name, new Blob([this.result()], { type: 'text/plain;charset=utf-8' })),
    ]);
  }

  protected startOver(): void {
    this.source.set('');
    this.reset();
  }
}

export function convert(text: string, style: CaseStyle): string {
  if (!text) return '';

  switch (style) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'alternating':
      return mapLetters(text, (char, index) =>
        index % 2 === 0 ? char.toLowerCase() : char.toUpperCase(),
      );
    case 'inverse':
      return [...text]
        .map((char) =>
          char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase(),
        )
        .join('');
    case 'capitalise':
      return text.replace(/\p{L}[\p{L}\p{M}']*/gu, capitalise);
    case 'sentence':
      return sentenceCase(text);
    case 'title':
      return titleCase(text);
    default:
      return programmerCase(text, style);
  }
}

function mapLetters(text: string, transform: (char: string, index: number) => string): string {
  let index = 0;
  return [...text]
    .map((char) => (/\s/.test(char) ? char : transform(char, index++)))
    .join('');
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function sentenceCase(text: string): string {
  const lowered = text.toLowerCase();
  const capitalised = lowered.replace(
    /(^|[.!?]\s+|\n\s*)(\p{L})/gu,
    (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
  );
  return capitalised.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
}

function titleCase(text: string): string {
  return text
    .split(/(\n)/)
    .map((line) => (line === '\n' ? line : titleCaseLine(line)))
    .join('');
}

function titleCaseLine(line: string): string {
  const words = line.split(/(\s+)/);
  const indices = words
    .map((word, index) => ({ word, index }))
    .filter((entry) => entry.word.trim().length > 0)
    .map((entry) => entry.index);

  const first = indices[0];
  const last = indices[indices.length - 1];
  let afterColon = false;

  return words
    .map((word, index) => {
      if (!word.trim()) return word;
      const bare = word.toLowerCase().replace(/[^\p{L}']/gu, '');
      const force = index === first || index === last || afterColon;
      afterColon = /[:;—–-]$/.test(word);
      if (!force && MINOR_WORDS.has(bare)) return word.toLowerCase();
      return word.replace(/\p{L}[\p{L}\p{M}']*/u, capitalise);
    })
    .join('');
}

function programmerCase(text: string, style: CaseStyle): string {
  return text
    .split(/(\r\n|\r|\n)/)
    .map((line) => (/^(\r\n|\r|\n)$/.test(line) ? line : joinWords(words(line), style)))
    .join('');
}

function words(text: string): string[] {
  return text
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function joinWords(parts: string[], style: CaseStyle): string {
  if (!parts.length) return '';
  const lower = parts.map((part) => part.toLowerCase());

  switch (style) {
    case 'camel':
      return lower[0] + lower.slice(1).map(capitalise).join('');
    case 'pascal':
      return lower.map(capitalise).join('');
    case 'snake':
      return lower.join('_');
    case 'kebab':
      return lower.join('-');
    case 'constant':
      return lower.join('_').toUpperCase();
    case 'dot':
      return lower.join('.');
    default:
      return lower.join(' ');
  }
}
