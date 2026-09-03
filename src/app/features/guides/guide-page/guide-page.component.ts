import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';
import { GuideRegistryService } from '../../../core/services/guide-registry.service';
import { ToolRegistryService } from '../../../core/services/tool-registry.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, RichTextComponent],
  templateUrl: './guide-page.component.html',
  styleUrl: './guide-page.component.scss',
})
export class GuidePageComponent {
  /** Bound from route data by `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly guides = inject(GuideRegistryService);
  private readonly seo = inject(SeoService);
  protected readonly toolRegistry = inject(ToolRegistryService);

  protected readonly guide = computed(() => this.guides.find(this.slug()));
  protected readonly tools = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.toolsOf(guide) : [];
  });
  protected readonly related = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.related(guide) : [];
  });

  constructor() {
    effect(() => {
      const guide = this.guide();
      if (!guide) return;
      // Applying SEO is a side effect, not a computation — reading service
      // state inside it would make the effect depend on what it writes.
      untracked(() => this.seo.apply(this.seo.guideSeo(guide)));
    });
  }

  protected toolFor(id: string) {
    return this.toolRegistry.byId(id);
  }
}
