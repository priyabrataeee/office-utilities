import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Shortcut {
  /** Normalised combo, e.g. `mod+k`, `shift+?`, or a chord like `g h`. */
  readonly keys: string;
  readonly label: string;
  readonly group: string;
  readonly run: () => void;
  /** Allow the shortcut to fire while a text field has focus. */
  readonly allowInInput?: boolean;
}

const CHORD_TIMEOUT_MS = 900;

/**
 * Application-wide keyboard shortcuts, including Linear-style two-key chords
 * (`g` then `h`). Editable elements are respected: single-letter shortcuts
 * never steal a keystroke from a text field.
 */
@Injectable({ providedIn: 'root' })
export class ShortcutService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly shortcuts = new Map<string, Shortcut>();
  private pendingChord: string | null = null;
  private chordTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  readonly registered = signal<Shortcut[]>([]);
  readonly isMac = signal(false);
  /** Whether the "keyboard shortcuts" dialog is showing. */
  readonly helpOpen = signal(false);

  toggleHelp(): void {
    this.helpOpen.update((open) => !open);
  }

  /** Registers shortcuts and returns a disposer. */
  register(...shortcuts: Shortcut[]): () => void {
    for (const shortcut of shortcuts) this.shortcuts.set(shortcut.keys, shortcut);
    this.registered.set([...this.shortcuts.values()]);
    this.listen();
    return () => {
      for (const shortcut of shortcuts) this.shortcuts.delete(shortcut.keys);
      this.registered.set([...this.shortcuts.values()]);
    };
  }

  /** Renders a combo for display, e.g. `mod+k` → `⌘ K` or `Ctrl K`. */
  display(keys: string): string[] {
    const mod = this.isMac() ? '⌘' : 'Ctrl';
    if (keys.includes(' ')) return keys.split(' ').map((k) => k.toUpperCase());
    return keys
      .split('+')
      .map((part) =>
        part === 'mod'
          ? mod
          : part === 'shift'
            ? this.isMac()
              ? '⇧'
              : 'Shift'
            : part === 'alt'
              ? this.isMac()
                ? '⌥'
                : 'Alt'
              : part.length === 1
                ? part.toUpperCase()
                : part.charAt(0).toUpperCase() + part.slice(1),
      );
  }

  private listen(): void {
    if (!this.isBrowser || this.listening) return;
    this.listening = true;
    this.isMac.set(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    this.doc.addEventListener('keydown', this.onKeyDown, { capture: true });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat || !event.key) return;

    const target = event.target as HTMLElement | null;
    const inEditable =
      !!target &&
      (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;

    if (mod || event.altKey) {
      const combo = [
        mod ? 'mod' : '',
        event.altKey ? 'alt' : '',
        event.shiftKey ? 'shift' : '',
        key,
      ]
        .filter(Boolean)
        .join('+');
      const match = this.shortcuts.get(combo);
      if (match && (!inEditable || match.allowInInput)) {
        event.preventDefault();
        event.stopPropagation();
        this.clearChord();
        match.run();
      }
      return;
    }

    if (inEditable) return;

    // Chord continuation, e.g. `g` then `h`.
    if (this.pendingChord) {
      const combo = `${this.pendingChord} ${key}`;
      this.clearChord();
      const match = this.shortcuts.get(combo);
      if (match) {
        event.preventDefault();
        match.run();
        return;
      }
    }

    // Chord start: any registered shortcut of the form `<key> <something>`.
    if ([...this.shortcuts.keys()].some((k) => k.startsWith(`${key} `))) {
      event.preventDefault();
      this.pendingChord = key;
      this.chordTimer = setTimeout(() => this.clearChord(), CHORD_TIMEOUT_MS);
      return;
    }

    const single = this.shortcuts.get(event.shiftKey ? `shift+${key}` : key);
    if (single) {
      event.preventDefault();
      single.run();
    }
  };

  private clearChord(): void {
    this.pendingChord = null;
    if (this.chordTimer) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
  }
}
