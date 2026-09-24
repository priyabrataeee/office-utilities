export interface RecentFileEntry {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly extension: string;
  readonly openedAt: number;
  readonly lastModified: number;
  readonly toolId?: string;
  readonly cached: boolean;
}

export interface OutputFile {
  readonly name: string;
  readonly blob: Blob;
  readonly size: number;
  url?: string;
}

export interface FileValidationRule {
  readonly accepts?: readonly string[];
  readonly maxSizeBytes?: number;
  readonly multiple?: boolean;
  readonly maxFiles?: number;
}

export interface ProgressState {
  readonly active: boolean;
  readonly percent: number | null;
  readonly label: string;
}

export const IDLE_PROGRESS: ProgressState = { active: false, percent: null, label: '' };
