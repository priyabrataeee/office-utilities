import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { OutputFile } from '../models/file.model';
import { safeFileName } from '../utils/file.util';

/**
 * Everything that leaves the app does so through here: a Blob, an object URL
 * and an anchor click. There is no network path — which is the whole point.
 */
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async save(blob: Blob, fileName: string): Promise<void> {
    if (!this.isBrowser) return;
    const { saveAs } = await import('file-saver');
    saveAs(blob, safeFileName(fileName));
  }

  saveText(text: string, fileName: string, mime = 'text/plain;charset=utf-8'): Promise<void> {
    return this.save(new Blob([text], { type: mime }), fileName);
  }

  saveJson(value: unknown, fileName: string): Promise<void> {
    return this.saveText(JSON.stringify(value, null, 2), fileName, 'application/json');
  }

  saveOutput(output: OutputFile): Promise<void> {
    return this.save(output.blob, output.name);
  }

  /** Bundles several outputs into a ZIP so the user gets one click, not twenty. */
  async saveZip(files: readonly OutputFile[], zipName: string): Promise<void> {
    if (!this.isBrowser || files.length === 0) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Map<string, number>();

    for (const file of files) {
      // Duplicate names inside a ZIP silently overwrite; disambiguate instead.
      let name = safeFileName(file.name);
      const seen = used.get(name) ?? 0;
      used.set(name, seen + 1);
      if (seen > 0) {
        const dot = name.lastIndexOf('.');
        name = dot > 0 ? `${name.slice(0, dot)} (${seen})${name.slice(dot)}` : `${name} (${seen})`;
      }
      zip.file(name, file.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    await this.save(blob, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
  }

  /** Opens a Blob in a new tab — used by "preview in new window". */
  openInNewTab(blob: Blob): void {
    if (!this.isBrowser) return;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Sends a Blob straight to the printer via a hidden frame. */
  print(blob: Blob): void {
    if (!this.isBrowser) return;
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.src = url;
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };
    document.body.appendChild(frame);
  }

  async copyText(text: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API needs a secure context; fall back to the legacy path.
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  async copyBlob(blob: Blob): Promise<boolean> {
    if (!this.isBrowser || !('ClipboardItem' in window)) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return true;
    } catch {
      return false;
    }
  }

  /** Native share sheet where available (mobile, Safari, Edge). */
  get canShareFiles(): boolean {
    return this.isBrowser && typeof navigator.canShare === 'function';
  }

  async shareFile(blob: Blob, fileName: string, title: string): Promise<boolean> {
    if (!this.canShareFiles) return false;
    const file = new File([blob], safeFileName(fileName), { type: blob.type });
    if (!navigator.canShare({ files: [file] })) return false;
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch {
      return false;
    }
  }

  async shareLink(url: string, title: string, text?: string): Promise<boolean> {
    if (!this.isBrowser || !navigator.share) return false;
    try {
      await navigator.share({ url, title, text });
      return true;
    } catch {
      return false;
    }
  }
}
