import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingLineTable, FRAMING_TABLE_COLUMNS } from '../FramingLineTable';
import { LangProvider } from '../../../i18n/LangContext';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../../types/framing';

const line = (over: Partial<FramingLine>): FramingLine => ({
  ...EMPTY_FRAMING_LINE, ...over,
});

const LINES = [
  line({ id: '1', plNumber: 'AA01', plName: 'AA01 Alpha', organType: 'Gearbox',
         energy: 'Diesel', projectRanking: 'M', client: 'RG', ownerN2: 'H-DESIGN',
         spDate: '2027-01-11', pcDate: '2027-03-01', coDate: '2027-06-01', sopDate: '2028-09-01' }),
  line({ id: '2', plNumber: 'AA02', plName: 'AA02 Beta', organType: 'Battery',
         energy: 'Electric', projectRanking: 'C93W', client: 'Nissan', ownerN2: 'H-SOFTWARE',
         spDate: '2027-02-01', pcDate: '', coDate: '2027-07-01', sopDate: '2028-11-01' }),
  line({ id: '3', plNumber: 'AB00', plName: 'AB00 Gamma', organType: 'Gearbox',
         energy: 'Gasoline', projectRanking: 'B', client: 'Dacia', ownerN2: 'H-TUNING',
         spDate: '2027-03-01', pcDate: '2027-04-01', coDate: '2027-08-01', sopDate: '2029-01-01' }),
];

const renderTable = (props: Partial<Parameters<typeof FramingLineTable>[0]> = {}) =>
  render(
    <LangProvider>
      <FramingLineTable lines={LINES} selectedPlNumber={null} onSelect={vi.fn()} {...props} />
    </LangProvider>,
  );

describe('FramingLineTable (§7.1, HIW-460)', () => {
  it('renders the AC#2 minimum columns', () => {
    expect(FRAMING_TABLE_COLUMNS.map((c) => c.key)).toEqual([
      'plNumber', 'plName', 'organType', 'energy', 'projectRanking',
      'client', 'ownerN2', 'spDate', 'pcDate', 'coDate', 'sopDate',
    ]);
  });

  it('renders one row per line', () => {
    renderTable();
    expect(screen.getAllByRole('row')).toHaveLength(LINES.length + 1);
  });

  it('exposes no editable control — AC#1/#8', () => {
    const { container } = renderTable();
    const body = container.querySelector('tbody')!;
    expect(body.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });

  it('renders no readiness or validation indicator — AC#5', () => {
    renderTable();
    expect(screen.queryByText(/not ready/i)).toBeNull();
    expect(screen.queryByText(/invalid/i)).toBeNull();
    expect(screen.queryByTestId('readiness')).toBeNull();
  });

  it('calls onSelect with the row PL number — AC#4', async () => {
    const onSelect = vi.fn();
    renderTable({ onSelect });
    await userEvent.click(screen.getByText('AA02 Beta'));
    expect(onSelect).toHaveBeenCalledWith('AA02');
  });

  it('filters by substring on that column only — AC#6', async () => {
    renderTable();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('AA02 Beta')).toBeNull();
  });

  it('combines filters across columns', async () => {
    renderTable();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.type(screen.getByTestId('filter-client'), 'dacia');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByText('AB00 Gamma')).toBeInTheDocument();
  });

  it('sorts ascending then descending then off — AC#6', async () => {
    renderTable();
    const header = screen.getByTestId('sort-plNumber');
    const order = () =>
      screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

    await userEvent.click(header);
    expect(order()).toEqual(['AA01', 'AA02', 'AB00']);
    await userEvent.click(header);
    expect(order()).toEqual(['AB00', 'AA02', 'AA01']);
    await userEvent.click(header);
    expect(order()).toEqual(['AA01', 'AA02', 'AB00']);
  });

  it('marks the selected row', () => {
    renderTable({ selectedPlNumber: 'AA02' });
    expect(screen.getByTestId('row-AA02')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('row-AA01')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders an empty body without crashing', () => {
    renderTable({ lines: [] });
    expect(screen.getAllByRole('row')).toHaveLength(1);
  });
});
