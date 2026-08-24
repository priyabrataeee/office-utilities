import type { GeneratorDef } from '../generator.model';
import { INVOICE, PROPOSAL, QUOTATION } from './business';
import { CERTIFICATE, EXPERIENCE_LETTER, OFFER_LETTER, SALARY_SLIP } from './hr';
import { COVER_LETTER, MEETING_MINUTES, RESUME } from './personal';

/** Every generator, keyed by the catalog tool id its route supplies. */
export const GENERATORS: Record<string, GeneratorDef> = {
  'invoice-generator': INVOICE,
  'quotation-generator': QUOTATION,
  'business-proposal-generator': PROPOSAL,
  'salary-slip-generator': SALARY_SLIP,
  'offer-letter-generator': OFFER_LETTER,
  'experience-letter-generator': EXPERIENCE_LETTER,
  'certificate-generator': CERTIFICATE,
  'resume-builder': RESUME,
  'cover-letter-generator': COVER_LETTER,
  'meeting-minutes-generator': MEETING_MINUTES,
};
