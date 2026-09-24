import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface TextRun {
  readonly text: string;
  readonly href?: string;
}

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

@Component({
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `@for (run of runs(); track $index) {@if (run.href) {<a
        [routerLink]="run.href"
        >{{ run.text }}</a
      >} @else {{{ run.text }}}}`,
})
export class RichTextComponent {
  readonly text = input.required<string>();

  protected readonly runs = computed<TextRun[]>(() => {
    const source = this.text();
    const runs: TextRun[] = [];
    let cursor = 0;

    for (const match of source.matchAll(LINK)) {
      const start = match.index ?? 0;
      if (start > cursor) runs.push({ text: source.slice(cursor, start) });
      runs.push({ text: match[1], href: match[2] });
      cursor = start + match[0].length;
    }

    if (cursor < source.length) runs.push({ text: source.slice(cursor) });
    return runs;
  });
}
