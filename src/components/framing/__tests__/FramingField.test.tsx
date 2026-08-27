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
