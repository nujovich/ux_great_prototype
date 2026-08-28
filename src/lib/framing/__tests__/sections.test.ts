import { describe, it, expect } from 'vitest';
import { FRAMING_SECTIONS, sectionsForTrack, allFieldDefs } from '../sections';
import { FRAMING_REFERENCE } from '../../../fixtures/framingReference';
import { EMPTY_FRAMING_LINE, FRAMING_FORM_FIELD_COUNT } from '../../../types/framing';

describe('FRAMING_SECTIONS (§5.6)', () => {
  it('declares the 8 RFQ sections in PRD order', () => {
    expect(FRAMING_SECTIONS.filter((s) => !s.rfiOnly).map((s) => s.id)).toEqual([
      'plDetails', 'customerRequest', 'vehicleDescription', 'organDescription',
      'scheduleMilestones', 'framework', 'prototypeDetails', 'additionalDetails',
    ]);
  });

  it('totals 66 fields across the RFQ sections', () => {
    const total = FRAMING_SECTIONS.filter((s) => !s.rfiOnly)
      .reduce((n, s) => n + s.fields.length, 0);
    expect(total).toBe(FRAMING_FORM_FIELD_COUNT);
  });

  it('matches the PRD per-section counts', () => {
    const counts = Object.fromEntries(FRAMING_SECTIONS.map((s) => [s.id, s.fields.length]));
    expect(counts).toMatchObject({
      plDetails: 13, customerRequest: 23, vehicleDescription: 7,
      organDescription: 8, scheduleMilestones: 4, framework: 10,
      prototypeDetails: 0, additionalDetails: 1,
    });
  });

  it('keeps Prototype Details empty — the #Protos counts live under Framework', () => {
    const proto = FRAMING_SECTIONS.find((s) => s.id === 'prototypeDetails')!;
    expect(proto.fields).toEqual([]);
    const framework = FRAMING_SECTIONS.find((s) => s.id === 'framework')!;
    expect(framework.fields.map((f) => f.key)).toContain('protosPfc');
    expect(framework.fields.map((f) => f.key)).toContain('protosEp');
  });

  it('references only real FramingLine keys', () => {
    for (const f of allFieldDefs()) {
      expect(EMPTY_FRAMING_LINE).toHaveProperty(f.key);
    }
  });

  it('never repeats a field across sections', () => {
    const keys = allFieldDefs().map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every field a PRD-named label', () => {
    for (const f of allFieldDefs()) expect(f.label.trim()).not.toBe('');
  });

  it('points every select at an existing reference list', () => {
    for (const f of allFieldDefs()) {
      if (f.kind !== 'select') continue;
      expect(f.refList).toBeDefined();
      expect(FRAMING_REFERENCE[f.refList!]).toBeDefined();
    }
  });

  it('marks only plName and parentRanking as derived (§5.6)', () => {
    const derived = allFieldDefs().filter((f) => f.kind === 'derived').map((f) => f.key);
    expect(derived.sort()).toEqual(['parentRanking', 'plName']);
  });

  it('marks expectedEcoOutput read-only (§15.1)', () => {
    const f = allFieldDefs().find((x) => x.key === 'expectedEcoOutput')!;
    expect(f.readOnly).toBe(true);
  });

  it('marks plNumber read-only — it is the store primary key (C1)', () => {
    const f = allFieldDefs().find((x) => x.key === 'plNumber')!;
    expect(f.readOnly).toBe(true);
  });

  it('excludes the Generate-time fields entirely (HIW-463 AC#7)', () => {
    const keys = allFieldDefs().map((f) => String(f.key));
    for (const forbidden of ['engineering', 'estimateType', 'injectionSystem', 'market']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('uses parentRef for Parent Prog. Line (§5.5)', () => {
    const f = allFieldDefs().find((x) => x.key === 'parentPlNumber')!;
    expect(f.kind).toBe('parentRef');
  });

  it('types the four milestones as dates', () => {
    const milestones = FRAMING_SECTIONS.find((s) => s.id === 'scheduleMilestones')!;
    expect(milestones.fields.map((f) => f.key)).toEqual(['spDate', 'pcDate', 'coDate', 'sopDate']);
    expect(milestones.fields.every((f) => f.kind === 'date')).toBe(true);
  });

  it('types the seven annual volumes as numbers', () => {
    const volumes = allFieldDefs().filter((f) => String(f.key).startsWith('annualVolumeSop'));
    expect(volumes).toHaveLength(7);
    expect(volumes.every((f) => f.kind === 'number')).toBe(true);
  });
});

describe('sectionsForTrack (§15.3)', () => {
  it('gives RFQ the 8 sections', () => {
    expect(sectionsForTrack('RFQ')).toHaveLength(8);
  });

  it('gives RFI a 9th placeholder section with no fields (FF-08)', () => {
    const rfi = sectionsForTrack('RFI');
    expect(rfi).toHaveLength(9);
    expect(rfi[8].rfiOnly).toBe(true);
    expect(rfi[8].fields).toEqual([]);
  });
});
