import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { ShortcutService } from '../../core/services/shortcut.service';
import { ThemeService } from '../../core/services/theme.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { MonetizationService } from '../../core/services/monetization.service';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  private readonly router = inject(Router);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly theme = inject(ThemeService);
  protected readonly favorites = inject(FavoritesService);
  protected readonly registry = inject(ToolRegistryService);
  protected readonly money = inject(MonetizationService);
  private readonly shortcuts = inject(ShortcutService);

  protected readonly menuOpen = signal(false);
  protected readonly categoriesOpen = signal(false);

  protected readonly searchHint = computed(() =>
    this.shortcuts.isMac() ? '⌘K' : 'Ctrl K',
  );

  protected readonly themeIcon = computed(() => {
    switch (this.theme.preference()) {
      case 'system':
        return 'monitor';
      case 'dark':
        return 'moon';
      case 'medium':
        return 'contrast';
      default:
        return 'sun';
    }
  });

  protected readonly themeLabel = computed(() => {
    switch (this.theme.preference()) {
      case 'system':
        return 'Theme: follows your system';
      case 'dark':
        return 'Theme: dark';
      case 'medium':
        return 'Theme: medium';
      default:
        return 'Theme: light';
    }
  });

  protected openPalette(): void {
    this.palette.open();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.categoriesOpen.set(false);
  }

  protected toggleCategories(): void {
    this.categoriesOpen.update((open) => !open);
  }

  protected goto(path: string): void {
    this.closeMenu();
    void this.router.navigateByUrl(path);
  }
}
