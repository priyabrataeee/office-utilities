import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Renders a string containing `[label](/path)` links as real anchors.
 *
 * Deliberately not `innerHTML`. Guide bodies are authored in this repository
 * and would be safe to inject, but a site whose entire premise is that nothing
 * untrusted executes should not keep an HTML injection point around for
 * convenience — the next person to reuse this component may not be pasting
 * their own prose into it.
 *
 * Only internal paths are linked. An external URL is left as plain text rather
 * than silently becoming a link, so a typo cannot turn into an outbound link.
 */

interface TextRun {
  readonly text: string;
  readonly href?: string;
}

/** `[label](/path)` — the path must start with a slash. */
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
