import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { dataUrlToBlob } from '../../../core/engines/image.engine';

export type QrKind = 'text' | 'wifi' | 'email' | 'phone' | 'contact';
type Correction = 'L' | 'M' | 'Q' | 'H';

interface KindOption {
  readonly value: QrKind;
  readonly label: string;
}

const KINDS: readonly KindOption[] = [
  { value: 'text', label: 'Link or text' },
  { value: 'wifi', label: 'Wi-Fi network' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone or SMS' },
  { value: 'contact', label: 'Contact card' },
];

const CORRECTION_LEVELS: readonly { value: Correction; label: string }[] = [
  { value: 'L', label: 'Low — simplest pattern, for clean screens' },
  { value: 'M', label: 'Medium — the usual choice' },
  { value: 'Q', label: 'Quartile — for print' },
  { value: 'H', label: 'High — survives damage, allows a logo' },
];

/**
 * QR codes, encoded locally.
 *
 * The thing that makes this worth building is what it does not do. A free
 * generator normally hands back a code pointing at its own short link, so the
 * owner can count the scans and switch off the code when the trial ends. These
 * codes contain the destination and nothing else — which also means they
 * cannot be edited afterwards, and that trade is stated on the page.
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ResultPanelComponent, IconComponent],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.scss',
})
export class QrCodeComponent extends ToolBase {
  readonly toolId = 'qr-code-generator';

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly kinds = KINDS;
  protected readonly levels = CORRECTION_LEVELS;

  protected readonly kind = signal<QrKind>('text');

  /* --- per-kind fields --- */
  protected readonly text = signal('https://office-utilities.org');
  protected readonly ssid = signal('');
  protected readonly password = signal('');
  protected readonly encryption = signal<'WPA' | 'WEP' | 'nopass'>('WPA');
  protected readonly hidden = signal(false);
  protected readonly email = signal('');
  protected readonly subject = signal('');
  protected readonly body = signal('');
  protected readonly phone = signal('');
  protected readonly smsBody = signal('');
  protected readonly contactName = signal('');
  protected readonly contactOrg = signal('');
  protected readonly contactTitle = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactUrl = signal('');

  /* --- appearance --- */
  protected readonly level = signal<Correction>('M');
  protected readonly size = signal(512);
  protected readonly margin = signal(2);
  protected readonly dark = signal('#101322');
  protected readonly light = signal('#ffffff');

  protected readonly preview = signal<string | null>(null);
  protected readonly encodeError = signal('');

  /** Exactly what gets encoded, shown to the visitor so nothing is hidden. */
  protected readonly payload = computed(() => this.buildPayload());
  protected readonly canEncode = computed(() => this.payload().trim().length > 0);

  constructor() {
    super();
    effect(() => {
      // Re-reading these keeps the preview in step with every control.
      const payload = this.payload();
      const settings = [this.level(), this.size(), this.margin(), this.dark(), this.light()];
      void settings;
      if (this.isBrowser) void this.render(payload);
    });
  }

  private buildPayload(): string {
    switch (this.kind()) {
      case 'wifi': {
        const ssid = this.ssid().trim();
        if (!ssid) return '';
        const type = this.encryption();
        const secret = type === 'nopass' ? '' : this.password();
        return `WIFI:T:${type};S:${escapeWifi(ssid)};P:${escapeWifi(secret)};${
          this.hidden() ? 'H:true;' : ''
        };`;
      }
      case 'email': {
        const address = this.email().trim();
        if (!address) return '';
        const params = new URLSearchParams();
        if (this.subject().trim()) params.set('subject', this.subject().trim());
        if (this.body().trim()) params.set('body', this.body().trim());
        const query = params.toString();
        return `mailto:${address}${query ? `?${query}` : ''}`;
      }
      case 'phone': {
        const number = this.phone().replace(/\s+/g, '');
        if (!number) return '';
        return this.smsBody().trim()
          ? `SMSTO:${number}:${this.smsBody().trim()}`
          : `tel:${number}`;
      }
      case 'contact': {
        const name = this.contactName().trim();
        if (!name) return '';
        // vCard 3.0 is the version every phone camera understands.
        const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(name)}`];
        const [given, ...rest] = name.split(/\s+/);
        lines.push(`N:${escapeVCard(rest.join(' '))};${escapeVCard(given)};;;`);
        if (this.contactOrg().trim()) lines.push(`ORG:${escapeVCard(this.contactOrg().trim())}`);
        if (this.contactTitle().trim())
          lines.push(`TITLE:${escapeVCard(this.contactTitle().trim())}`);
        if (this.contactPhone().trim())
          lines.push(`TEL;TYPE=CELL:${escapeVCard(this.contactPhone().trim())}`);
        if (this.contactEmail().trim())
          lines.push(`EMAIL:${escapeVCard(this.contactEmail().trim())}`);
        if (this.contactUrl().trim()) lines.push(`URL:${escapeVCard(this.contactUrl().trim())}`);
        lines.push('END:VCARD');
        return lines.join('\n');
      }
      default:
        return this.text();
    }
  }

  private async load() {
    const mod = await import('qrcode');
    // The package ships both shapes depending on the bundler's interop.
    return (mod as unknown as { default?: typeof mod }).default ?? mod;
  }

  private options() {
    return {
      errorCorrectionLevel: this.level(),
      margin: this.margin(),
      width: this.size(),
      color: { dark: this.dark(), light: this.light() },
    };
  }

  private async render(payload: string): Promise<void> {
    if (!payload.trim()) {
      this.preview.set(null);
      this.encodeError.set('');
      return;
    }
    try {
      const QRCode = await this.load();
      this.preview.set(await QRCode.toDataURL(payload, this.options()));
      this.encodeError.set('');
    } catch (error) {
      this.preview.set(null);
      // Almost always "too much data" — a QR code tops out around 2,950 bytes
      // at the lowest correction level, and far less at the highest.
      this.encodeError.set(
        error instanceof Error && /too big|data/i.test(error.message)
          ? 'That is more data than a QR code can hold. Shorten it, or drop the error correction to Low.'
          : 'That could not be encoded as a QR code.',
      );
    }
  }

  /* --- field setters --- */
  protected setKind(value: QrKind): void {
    this.kind.set(value);
  }
  protected set(target: WritableSignal<string>, event: Event): void {
    target.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }
  protected setEncryption(event: Event): void {
    this.encryption.set((event.target as HTMLSelectElement).value as 'WPA' | 'WEP' | 'nopass');
  }
  protected toggleHidden(event: Event): void {
    this.hidden.set((event.target as HTMLInputElement).checked);
  }
  protected setLevel(event: Event): void {
    this.level.set((event.target as HTMLSelectElement).value as Correction);
  }
  protected setSize(event: Event): void {
    this.size.set(Number((event.target as HTMLInputElement).value));
  }
  protected setMargin(event: Event): void {
    this.margin.set(Number((event.target as HTMLInputElement).value));
  }
  protected setDark(event: Event): void {
    this.dark.set((event.target as HTMLInputElement).value);
  }
  protected setLight(event: Event): void {
    this.light.set((event.target as HTMLInputElement).value);
  }

  /* --- download --- */

  protected downloadPng(): void {
    const dataUrl = this.preview();
    if (!dataUrl) return;
    this.setOutputs([this.output('qr-code.png', dataUrlToBlob(dataUrl))]);
  }

  protected async downloadSvg(): Promise<void> {
    const payload = this.payload();
    if (!payload.trim()) return;
    const blob = await this.run('Preparing the SVG…', async () => {
      const QRCode = await this.load();
      const svg = await QRCode.toString(payload, { ...this.options(), type: 'svg' });
      return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    });
    if (blob) this.setOutputs([this.output('qr-code.svg', blob)]);
  }

  protected startOver(): void {
    this.text.set('');
    this.ssid.set('');
    this.password.set('');
    this.email.set('');
    this.phone.set('');
    this.contactName.set('');
    this.reset();
  }
}

/** `\`, `;`, `,` and `:` carry meaning inside a WIFI: payload. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

function escapeVCard(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
}
