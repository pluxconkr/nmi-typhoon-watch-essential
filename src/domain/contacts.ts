/**
 * Emergency contacts bundled with the app. Voice numbers, no data needed.
 * Sources: CNMI HSEM bulletins (2015–2026), JIC SITREPs (Apr–May 2026), CUC — see docs/shelter-sources.md
 */
export interface Contact {
  id: string;
  label: string;
  display: string;
  /** E.164 for tel: links. */
  e164: string;
  note: string;
}

export const CONTACTS: readonly Contact[] = [
  { id: 'emergency', label: 'Emergency', display: '911', e164: '911', note: 'Police · Fire · Medical' },
  { id: 'hsem-swp', label: 'CNMI HSEM State Warning Point', display: '(670) 237-8000', e164: '+16702378000', note: '24/7 EOC desk · shelter transport and shelter questions' },
  { id: 'hsem-swp-alt', label: 'State Warning Point (alternate)', display: '(670) 664-8000', e164: '+16706648000', note: 'Same desk, second line' },
  { id: 'cuc-outage', label: 'CUC power / water outage line', display: '(670) 236-4333', e164: '+16702364333', note: 'Commonwealth Utilities Corp. 24-hour trouble desk (670) 664-4282' },
  { id: 'chcc-medical', label: 'CHCC medical help to reach a shelter', display: '(670) 234-8950', e164: '+16702348950', note: 'For residents who need medical support to evacuate' },
] as const;

export const HSEM_SWP = CONTACTS[1];
