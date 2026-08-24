import { Pipe, PipeTransform } from '@angular/core';
import { formatBytes, timeAgo } from '../../core/utils/file.util';

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | null | undefined, decimals = 1): string {
    return formatBytes(bytes ?? 0, decimals);
  }
}

@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(epochMs: number | null | undefined): string {
    return epochMs ? timeAgo(epochMs) : '';
  }
}
