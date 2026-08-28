import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingField } from '../FramingField';
import { FramingFormSection } from '../FramingFormSection';
import { LangProvider } from '../../../i18n/LangContext';
import { FRAMING_SECTIONS } from '../../../lib/framing/sections';
import { EMPTY_FRAMING_LINE } from '../../../types/framing';

const field = (props: Parameters<typeof FramingField>[0]) =>
  render(<LangProvider><FramingField {...props} /></LangProvider>);

describe('FramingField (§7.2)', () => {
  it('renders a text input that reports edits', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'cluster', label: 'Cluster', kind: 'text' }, value: 'CL-01', onChange });
    const input = screen.getByLabelText('Cluster');
    await userEvent.clear(input);
    await userEvent.type(input, 'X');
    expect(onChange).toHaveBeenLastCalledWith('cluster', 'X');
  });

  it('renders a date picker for milestone fields', () => {
    field({ def: { key: 'spDate', label: 'Start of Project (SP)', kind: 'date' }, value: '2027-01-11', onChange: vi.fn() });
    expect(screen.getByLabelText('Start of Project (SP)')).toHaveAttribute('type', 'date');
  });

  it('renders a numeric input and reports numbers, not strings', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'annualVolumeSop', label: 'Annual volume SOP', kind: 'number' }, value: null, onChange });
    const input = screen.getByLabelText('Annual volume SOP');
    expect(input).toHaveAttribute('type', 'number');
    await userEvent.type(input, '42');
    expect(onChange).toHaveBeenLastCalledWith('annualVolumeSop', 42);
  });

  it('reports an emptied numeric input as null', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'protosPfc', label: '#Protos PFC', kind: 'number' }, value: 3, onChange });
    await userEvent.clear(screen.getByLabelText('#Protos PFC'));
    expect(onChange).toHaveBeenLastCalledWith('protosPfc', null);
  });

  it('reports null rather than NaN for an unparseable numeric entry', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'annualVolumeSop', label: 'Annual volume SOP', kind: 'number' }, value: null, onChange });
    await userEvent.type(screen.getByLabelText('Annual volume SOP'), '1e');
    expect(onChange).toHaveBeenLastCalledWith('annualVolumeSop', null);
    expect(onChange.mock.calls.some(([, v]) => Number.isNaN(v))).toBe(false);
  });

  it('renders a dropdown from the reference list, with an empty option', () => {
    field({ def: { key: 'projectRanking', label: 'Project ranking', kind: 'select', refList: 'projectRanking' }, value: 'M', onChange: vi.fn() });
    const select = screen.getByLabelText('Project ranking');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'C133W' })).toBeInTheDocument();
    expect(select).toHaveValue('M');
  });

  it('renders a derived field as read-only with no input control', () => {
    field({ def: { key: 'plName', label: 'PL Name', kind: 'derived' }, value: 'AA01 Alpha', onChange: vi.fn() });
    expect(screen.getByText('AA01 Alpha')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('disables a readOnly select and never reports a change — §15.1', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'expectedEcoOutput', label: 'Expected ECO Output', kind: 'select', refList: 'expectedEcoOutput', readOnly: true }, value: 'ECO2', onChange });
    const select = screen.getByLabelText('Expected ECO Output');
    expect(select).toBeDisabled();
    await userEvent.click(select);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows an off-list value instead of blanking it, and preserves it — I3', () => {
    field({ def: { key: 'cpo', label: 'CPO', kind: 'select', refList: 'cpo' }, value: 'Z. NotInList', onChange: vi.fn() });
    const select = screen.getByLabelText('CPO') as HTMLSelectElement;
    expect(select).toHaveValue('Z. NotInList');
    expect(screen.getByRole('option', { name: 'Z. NotInList' })).toBeInTheDocument();
  });

  it('shows an off-list Customer value instead of blanking it, and preserves it — real files may carry any customer string', () => {
    field({ def: { key: 'client', label: 'Customer', kind: 'select', refList: 'client' }, value: 'Nissan', onChange: vi.fn() });
    const select = screen.getByLabelText('Customer') as HTMLSelectElement;
    expect(select).toHaveValue('Nissan');
    expect(screen.getByRole('option', { name: 'Nissan' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'RG' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('renders exactly one blank option when the reference list itself starts empty — M8 (Techno Group)', () => {
    field({ def: { key: 'technoGroup', label: 'Techno Group', kind: 'select', refList: 'technoGroup' }, value: 'Diesel PWT', onChange: vi.fn() });
    const select = screen.getByLabelText('Techno Group') as HTMLSelectElement;
    const blanks = Array.from(select.querySelectorAll('option')).filter((o) => o.value === '');
    expect(blanks).toHaveLength(1);
  });

  it('disables the real PL Number field and never reports a change — it is the store primary key (C1)', async () => {
    const onChange = vi.fn();
    const def = FRAMING_SECTIONS.find((s) => s.id === 'plDetails')!.fields
      .find((f) => f.key === 'plNumber')!;
    field({ def, value: 'AA00', onChange });
    const input = screen.getByLabelText('PL Number');
    expect(input).toBeDisabled();
    await userEvent.type(input, 'X');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders no error indicator for any field — HIW-463 AC#9', () => {
    const { container } = field({ def: { key: 'cluster', label: 'Cluster', kind: 'text' }, value: '', onChange: vi.fn() });
    expect(container.querySelector('[data-testid="field-error"]')).toBeNull();
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});

describe('FramingFormSection (§7.2)', () => {
  const plDetails = FRAMING_SECTIONS.find((s) => s.id === 'plDetails')!;

  const section = (over = {}) =>
    render(
      <LangProvider>
        <FramingFormSection
          section={plDetails}
          line={{ ...EMPTY_FRAMING_LINE, plNumber: 'AA01' }}
          parentOptions={['AA02']}
          onChange={vi.fn()}
          defaultOpen
          {...over}
        />
      </LangProvider>,
    );

  it('renders the translated section title', () => {
    section();
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
  });

  it('renders every field of the section when open', () => {
    section();
    expect(screen.getByLabelText('PL Number')).toBeInTheDocument();
    expect(screen.getByText('PL Name')).toBeInTheDocument();
  });

  it('collapses and expands', async () => {
    section();
    await userEvent.click(screen.getByRole('button', { name: /PL Details/i }));
    expect(screen.queryByLabelText('PL Number')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /PL Details/i }));
    expect(screen.getByLabelText('PL Number')).toBeInTheDocument();
  });

  it('renders an empty section header with no fields — §5.6.7 and §15.3', () => {
    const proto = FRAMING_SECTIONS.find((s) => s.id === 'prototypeDetails')!;
    section({ section: proto });
    expect(screen.getByRole('button', { name: /Prototype Details/i })).toBeInTheDocument();
  });

  it('renders no section-level error indicator — HIW-463 AC#9', () => {
    const { container } = section();
    expect(container.querySelector('[data-testid="section-error"]')).toBeNull();
  });
});
