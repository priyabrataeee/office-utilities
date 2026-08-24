import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { ThemeService } from '../../core/services/theme.service';
import { ShortcutService } from '../../core/services/shortcut.service';
import type { ResolvedTool } from '../../core/models/tool.model';

interface Command {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly group: string;
  readonly run: () => void;
}

/**
 * ⌘K palette. Searches the whole catalog and mixes in navigation and
 * preference commands, so it doubles as the app's keyboard-first surface.
 */
@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent {
  private readonly service = inject(CommandPaletteService);
  private readonly registry = inject(ToolRegistryService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly shortcuts = inject(ShortcutService);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly isOpen = this.service.isOpen;
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly actions: Command[] = [
    this.nav('nav-home', 'Home', 'home', '/'),
    this.nav('nav-tools', 'All tools', 'layout-grid', '/tools'),
    this.nav('nav-categories', 'Categories', 'boxes', '/categories'),
    this.nav('nav-favorites', 'Favourites', 'star', '/favorites'),
    this.nav('nav-recent', 'Recent files', 'clock', '/recent'),
    this.nav('nav-privacy', 'Privacy', 'shield', '/privacy'),
    this.nav('nav-about', 'About', 'info', '/about'),
    {
      id: 'theme-light',
      title: 'Theme: light',
      subtitle: 'Preference',
      icon: 'sun',
      group: 'Preferences',
      run: () => this.theme.set('light'),
    },
    {
      id: 'theme-medium',
      title: 'Theme: medium',
      subtitle: 'Preference',
      icon: 'contrast',
      group: 'Preferences',
      run: () => this.theme.set('medium'),
    },
    {
      id: 'theme-dark',
      title: 'Theme: dark',
      subtitle: 'Preference',
      icon: 'moon',
      group: 'Preferences',
      run: () => this.theme.set('dark'),
    },
    {
      id: 'theme-system',
      title: 'Theme: follow the system',
      subtitle: 'Preference',
      icon: 'monitor',
      group: 'Preferences',
      run: () => this.theme.set('system'),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      subtitle: 'Help',
      icon: 'terminal',
      group: 'Preferences',
      run: () => this.shortcuts.toggleHelp(),
    },
  ];

  protected readonly toolResults = computed<ResolvedTool[]>(() => {
    const query = this.query().trim();
    if (!query) {
      const recent = this.registry.recentTools();
      const popular = this.registry.popular();
      const seen = new Set(recent.map((t) => t.id));
      return [...recent, ...popular.filter((t) => !seen.has(t.id))].slice(0, 8);
    }
    return this.registry.search(query).slice(0, 12);
  });

  protected readonly commandResults = computed<Command[]>(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return [];
    return this.actions.filter(
      (a) => a.title.toLowerCase().includes(query) || a.group.toLowerCase().includes(query),
    );
  });

  protected readonly total = computed(
    () => this.toolResults().length + this.commandResults().length,
  );

  protected readonly emptyLabel = computed(() =>
    this.query().trim() ? 'Tools' : 'Recent & popular',
  );

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.query.set(this.service.seed());
        this.activeIndex.set(0);
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      }
    });
  }

  protected close(): void {
    this.service.close();
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(Math.max(0, this.total() - 1));
        break;
      case 'Enter':
        event.preventDefault();
        this.runActive();
        break;
    }
  }

  protected selectTool(tool: ResolvedTool): void {
    this.close();
    void this.router.navigateByUrl(tool.path);
  }

  protected runCommand(command: Command): void {
    this.close();
    command.run();
  }

  protected isActive(index: number): boolean {
    return this.activeIndex() === index;
  }

  private move(delta: number): void {
    const total = this.total();
    if (!total) return;
    this.activeIndex.set((this.activeIndex() + delta + total) % total);
  }

  private runActive(): void {
    const tools = this.toolResults();
    const index = this.activeIndex();
    if (index < tools.length) {
      this.selectTool(tools[index]);
      return;
    }
    const command = this.commandResults()[index - tools.length];
    if (command) this.runCommand(command);
  }

  private nav(id: string, title: string, icon: string, path: string): Command {
    return {
      id,
      title,
      subtitle: path,
      icon,
      group: 'Go to',
      run: () => void this.router.navigateByUrl(path),
    };
  }
}
