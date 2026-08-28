import { describe, it, expect } from 'vitest';
import { hasPermission, NAV_ITEMS, visibleNavFor } from '../permissions';
import { getT } from '../../i18n/getT';
import { FRAMING_SECTIONS } from '../framing/sections';

describe('Framing File permissions (§2, §2.1)', () => {
  it.each(['Admin', 'PMO', 'CPO'] as const)('lets %s view, edit and save', (role) => {
    expect(hasPermission(role, 'view:framing-file')).toBe(true);
    expect(hasPermission(role, 'edit:framing-file')).toBe(true);
    expect(hasPermission(role, 'save:framing-file')).toBe(true);
  });

  it.each(['Admin', 'PMO'] as const)('lets %s upload', (role) => {
    expect(hasPermission(role, 'upload:framing-file')).toBe(true);
  });

  it('never lets CPO upload', () => {
    expect(hasPermission('CPO', 'upload:framing-file')).toBe(false);
  });

  it.each(['Engineer', 'RCRC'] as const)('gives %s no framing access at all', (role) => {
    expect(hasPermission(role, 'view:framing-file')).toBe(false);
    expect(hasPermission(role, 'edit:framing-file')).toBe(false);
    expect(hasPermission(role, 'save:framing-file')).toBe(false);
    expect(hasPermission(role, 'upload:framing-file')).toBe(false);
  });
});

describe('Framing File navigation', () => {
  it('puts Framing File first — it is the system entry point', () => {
    expect(NAV_ITEMS[0].key).toBe('framing-file');
    expect(NAV_ITEMS[0].path).toBe('/framing-file');
    expect(NAV_ITEMS[0].permission).toBe('view:framing-file');
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('shows it to %s', (role) => {
    expect(visibleNavFor(role).map((n) => n.key)).toContain('framing-file');
  });

  it.each(['Engineer', 'RCRC'] as const)('hides it from %s', (role) => {
    expect(visibleNavFor(role).map((n) => n.key)).not.toContain('framing-file');
  });
});

describe('Framing File i18n', () => {
  it.each(['en', 'es'] as const)('resolves a title for every section in %s', (lang) => {
    const t = getT(lang);
    for (const section of FRAMING_SECTIONS) {
      expect(t(section.labelKey)).not.toBe(section.labelKey);
    }
  });

  it.each(['en', 'es'] as const)('resolves the page chrome keys in %s', (lang) => {
    const t = getT(lang);
    for (const key of [
      'framing.title', 'framing.desc', 'framing.tab.rfq', 'framing.tab.rfi',
      'framing.upload.label', 'framing.upload.button', 'framing.upload.notXlsx',
      'framing.upload.parseError', 'framing.upload.noHeaderRowError',
      'framing.upload.genericError', 'framing.upload.success', 'framing.upload.discardedEdits',
      'framing.save.line', 'framing.save.all', 'framing.save.done',
      'framing.table.filterPlaceholder', 'framing.empty.title', 'framing.empty.desc',
    ]) {
      expect(t(key)).not.toBe(key);
    }
  });
});
