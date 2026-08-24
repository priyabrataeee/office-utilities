/** A file the user opened, as remembered by the Recent Files page. */
export interface RecentFileEntry {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly extension: string;
  /** Epoch milliseconds. */
  readonly openedAt: number;
  readonly lastModified: number;
  /** Id of the tool the file was opened with, if any. */
  readonly toolId?: string;
  /** True when the bytes are also cached in IndexedDB and can be reopened. */
  readonly cached: boolean;
}

/** Result of a produced artefact, ready to preview and download. */
export interface OutputFile {
  readonly name: string;
  readonly blob: Blob;
  readonly size: number;
  /** Optional object URL — created lazily by the download service. */
  url?: string;
}

export interface FileValidationRule {
  /** Allowed extensions including the dot. Empty means everything. */
  readonly accepts?: readonly string[];
  readonly maxSizeBytes?: number;
  readonly multiple?: boolean;
  readonly maxFiles?: number;
}

export interface ProgressState {
  readonly active: boolean;
  /** 0–100, or null when the work cannot be measured. */
  readonly percent: number | null;
  readonly label: string;
}

export const IDLE_PROGRESS: ProgressState = { active: false, percent: null, label: '' };
