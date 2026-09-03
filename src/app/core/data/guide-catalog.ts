import type { GuideDefinition } from '../models/guide.model';

import { guide as safeConverters } from './guides/safe-online-pdf-converters';
import { guide as mergeWithoutUploading } from './guides/merge-pdf-without-uploading';
import { guide as whatHappensOnUpload } from './guides/what-happens-when-you-upload';
import { guide as confidentialDocuments } from './guides/confidential-documents-online';
import { guide as pdfToWordFormatting } from './guides/pdf-to-word-formatting';
import { guide as compressWithoutBlur } from './guides/compress-pdf-without-blur';
import { guide as wordToPdfFonts } from './guides/word-to-pdf-fonts';
import { guide as extractTextFromPdf } from './guides/extract-text-from-pdf';
import { guide as excelCsvDates } from './guides/excel-csv-dates';
import { guide as removeMetadata } from './guides/remove-document-metadata';
import { guide as openWithoutOffice } from './guides/open-office-files-without-office';
import { guide as powerpointTooBig } from './guides/powerpoint-too-big-to-email';
import { guide as splitByChapter } from './guides/split-pdf-by-chapter';
import { guide as passwordProtect } from './guides/password-protect-a-pdf';
import { guide as fixSidewaysScan } from './guides/fix-sideways-scanned-pdf';

/**
 * The written guides, in the order they are listed.
 *
 * Ordering is editorial rather than chronological: the pieces that explain why
 * the site exists come first, because they are the ones that make sense of
 * everything else. Each guide lives in its own file — a single catalog would
 * be thousands of lines of prose and impossible to review.
 */
export const GUIDES: readonly GuideDefinition[] = [
  safeConverters,
  whatHappensOnUpload,
  confidentialDocuments,
  mergeWithoutUploading,
  pdfToWordFormatting,
  extractTextFromPdf,
  compressWithoutBlur,
  wordToPdfFonts,
  splitByChapter,
  fixSidewaysScan,
  passwordProtect,
  openWithoutOffice,
  powerpointTooBig,
  excelCsvDates,
  removeMetadata,
];
