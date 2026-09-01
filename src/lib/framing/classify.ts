import type { FramingTrack } from '../../types/framing';

/**
 * §15.1 (ADR-020) — a parsed line is RFI when `expected_eco_output` is empty or
 * `N/A`; any real value classifies it RFQ. Classification happens once, at
 * upload, and never changes: re-uploading the file is the only way to reclassify.
 */
export function classifyLine(expectedEcoOutput?: string | null): FramingTrack {
  const value = (expectedEcoOutput ?? '').trim();
  if (value === '' || value.toUpperCase() === 'N/A') return 'RFI';
  return 'RFQ';
}
