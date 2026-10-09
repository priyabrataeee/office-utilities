import { getToolByPath } from './catalog.util';
import { GUIDES } from './guide-catalog';

export function isAdEligiblePath(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return path === '/' || !!getToolByPath(path) || GUIDES.some((guide) => path === `/guides/${guide.slug}`);
}
