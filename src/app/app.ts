import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { CommandPaletteComponent } from './layout/command-palette/command-palette.component';
import { ShortcutHelpComponent } from './layout/shortcut-help/shortcut-help.component';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';
import { CommandPaletteService } from './core/services/command-palette.service';
import { ShortcutService } from './core/services/shortcut.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SiteHeaderComponent,
    SiteFooterComponent,
    CommandPaletteComponent,
    ShortcutHelpComponent,
    ToastHostComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly palette = inject(CommandPaletteService);
  private readonly shortcuts = inject(ShortcutService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  constructor() {
    this.shortcuts.register(
      {
        keys: 'mod+k',
        label: 'Open the command palette',
        group: 'General',
        allowInInput: true,
        run: () => this.palette.toggle(),
      },
      {
        keys: '/',
        label: 'Search tools',
        group: 'General',
        run: () => this.palette.open(),
      },
      {
        keys: 'shift+?',
        label: 'Show keyboard shortcuts',
        group: 'General',
        run: () => this.shortcuts.toggleHelp(),
      },
      {
        keys: 'mod+j',
        label: 'Cycle theme (light → medium → dark → system)',
        group: 'General',
        allowInInput: true,
        run: () => this.theme.cycle(),
      },
      { keys: 'g h', label: 'Go to home', group: 'Navigation', run: () => this.go('/') },
      { keys: 'g t', label: 'Go to all tools', group: 'Navigation', run: () => this.go('/tools') },
      {
        keys: 'g c',
        label: 'Go to categories',
        group: 'Navigation',
        run: () => this.go('/categories'),
      },
      {
        keys: 'g f',
        label: 'Go to favourites',
        group: 'Navigation',
        run: () => this.go('/favorites'),
      },
      { keys: 'g r', label: 'Go to recent files', group: 'Navigation', run: () => this.go('/recent') },
      { keys: 'g p', label: 'Go to privacy', group: 'Navigation', run: () => this.go('/privacy') },
    );
  }

  private go(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
