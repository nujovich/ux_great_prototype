import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  FramingLineTable, FRAMING_TABLE_COLUMNS, FRAMING_CSV_COLUMNS,
  type FramingTableSelection,
} from '../FramingLineTable';
import { LangProvider } from '../../../i18n/LangContext';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../../types/framing';

const line = (over: Partial<FramingLine>): FramingLine => ({
  ...EMPTY_FRAMING_LINE, ...over,
});

// M9 — insertion order is deliberately neither ascending nor descending by
// plNumber, so the sort test's three states (asc/desc/off) are each a
// distinguishable sequence. With the old AA01/AA02/AB00 order, "off" (which
// returns to insertion order) coincided with "asc", so a broken third click
// could not have failed that test.
const LINES = [
  line({ id: '2', plNumber: 'AA02', plName: 'AA02 Beta', organType: 'Battery',
         energy: 'Electric', projectRanking: 'C93W', client: 'Nissan', ownerN2: 'H-SOFTWARE',
         spDate: '2027-02-01', pcDate: '', coDate: '2027-07-01', sopDate: '2028-11-01' }),
  line({ id: '3', plNumber: 'AB00', plName: 'AB00 Gamma', organType: 'Gearbox',
         energy: 'Gasoline', projectRanking: 'B', client: 'Dacia', ownerN2: 'H-TUNING',
         spDate: '2027-03-01', pcDate: '2027-04-01', coDate: '2027-08-01', sopDate: '2029-01-01' }),
  line({ id: '1', plNumber: 'AA01', plName: 'AA01 Alpha', organType: 'Gearbox',
         energy: 'Diesel', projectRanking: 'M', client: 'RG', ownerN2: 'H-DESIGN',
         spDate: '2027-01-11', pcDate: '2027-03-01', coDate: '2027-06-01', sopDate: '2028-09-01' }),
];

const SELECTION: FramingTableSelection = {
  checked: [],
  onToggle: vi.fn(),
  onToggleAll: vi.fn(),
};

const renderTable = (props: Partial<Parameters<typeof FramingLineTable>[0]> = {}) =>
  render(
    <LangProvider>
      <FramingLineTable lines={LINES} selectedPlNumber={null} onSelect={vi.fn()} {...props} />
    </LangProvider>,
  );

describe('FramingLineTable (§7.1, HIW-460)', () => {
  // Deviates from HIW-460 AC#2, which lists Métier among the minimum columns:
  // the reviewer asked for it out of the grid (2026-08-31). It stays in the CSV
  // export, which keeps its own column list.
  it('renders the AC#2 minimum columns, less Métier', () => {
    expect(FRAMING_TABLE_COLUMNS.map((c) => c.key)).toEqual([
      'plNumber', 'plName', 'organType', 'energy', 'projectRanking',
      'client', 'spDate', 'pcDate', 'coDate', 'sopDate',
    ]);
  });

  it('renders no Métier header', () => {
    renderTable();
    expect(screen.queryByText(/métier/i)).toBeNull();
  });

  it('keeps Métier in the CSV column list, in its AC#2 position', () => {
    expect(FRAMING_CSV_COLUMNS.map((c) => c.key)).toEqual([
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

  // AC#1/#8 forbids editing a line's DATA from the grid. The selection
  // checkbox edits nothing, so it is excluded by cell rather than by being
  // allowed to weaken the assertion above.
  it('adds no editable control to the data cells when selection is on', () => {
    const { container } = renderTable({ selection: SELECTION });
    const dataCells = container.querySelectorAll('tbody td:not([data-selection-cell])');
    expect(dataCells.length).toBeGreaterThan(0);
    dataCells.forEach((td) => {
      expect(td.querySelectorAll('input, select, textarea')).toHaveLength(0);
    });
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
    // Off returns to insertion order (AA02, AB00, AA01) — distinct from both
    // the ascending and descending sequences above.
    expect(order()).toEqual(['AA02', 'AB00', 'AA01']);
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

  // ── Task 7 (HIW-452 remediation) ────────────────────────────────────────

  it('shows the plain total when no filter narrows the set', () => {
    renderTable();
    expect(screen.getByTestId('framing-table-row-count')).toHaveTextContent(String(LINES.length));
    expect(screen.getByTestId('framing-table-row-count')).not.toHaveTextContent(/of/i);
  });

  it('switches to visible-of-total once a filter narrows the set, and back once cleared', async () => {
    renderTable();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    const count = screen.getByTestId('framing-table-row-count');
    expect(count).toHaveTextContent('2');
    expect(count).toHaveTextContent(String(LINES.length));

    await userEvent.clear(screen.getByTestId('filter-organType'));
    expect(screen.getByTestId('framing-table-row-count')).not.toHaveTextContent(/of/i);
  });

  it('renders a CSV export control over the table', () => {
    renderTable();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });
});

describe('FramingLineTable row selection (send to Pre-Estimation)', () => {
  const selection = (over: Partial<FramingTableSelection> = {}): FramingTableSelection =>
    ({ ...SELECTION, ...over });

  it('renders no selection column when the caller passes no selection', () => {
    const { container } = renderTable();
    expect(container.querySelectorAll('[data-selection-cell]')).toHaveLength(0);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('renders one checkbox per row plus the header one', () => {
    renderTable({ selection: selection() });
    expect(screen.getAllByRole('checkbox')).toHaveLength(LINES.length + 1);
  });

  it('reflects the checked set', () => {
    renderTable({ selection: selection({ checked: ['AA02'] }) });
    expect(screen.getByLabelText('Select AA02')).toBeChecked();
    expect(screen.getByLabelText('Select AA01')).not.toBeChecked();
  });

  it('toggles a single row', async () => {
    const onToggle = vi.fn();
    renderTable({ selection: selection({ onToggle }) });
    await userEvent.click(screen.getByLabelText('Select AA02'));
    expect(onToggle).toHaveBeenCalledWith('AA02');
  });

  it('does not open the detail form when the checkbox is clicked', async () => {
    const onSelect = vi.fn();
    renderTable({ onSelect, selection: selection() });
    await userEvent.click(screen.getByLabelText('Select AA02'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still opens the detail form when the row itself is clicked', async () => {
    const onSelect = vi.fn();
    renderTable({ onSelect, selection: selection() });
    await userEvent.click(screen.getByText('AA02 Beta'));
    expect(onSelect).toHaveBeenCalledWith('AA02');
  });

  it('select-all covers exactly the filtered rows, not the whole set', async () => {
    const onToggleAll = vi.fn();
    renderTable({ selection: selection({ onToggleAll }) });
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.click(screen.getByLabelText(/select all/i));
    expect(onToggleAll).toHaveBeenCalledWith(['AB00', 'AA01'], true);
  });

  it('select-all clears when everything visible is already checked', async () => {
    const onToggleAll = vi.fn();
    renderTable({
      selection: selection({ checked: ['AA02', 'AB00', 'AA01'], onToggleAll }),
    });
    await userEvent.click(screen.getByLabelText(/select all/i));
    expect(onToggleAll).toHaveBeenCalledWith(['AA02', 'AB00', 'AA01'], false);
  });

  it('checks the header box only when every visible row is checked', async () => {
    const { rerender } = renderTable({ selection: selection({ checked: ['AA02'] }) });
    expect(screen.getByLabelText(/select all/i)).not.toBeChecked();
    rerender(
      <LangProvider>
        <FramingLineTable
          lines={LINES}
          selectedPlNumber={null}
          onSelect={vi.fn()}
          selection={selection({ checked: ['AA02', 'AB00', 'AA01'] })}
        />
      </LangProvider>,
    );
    expect(screen.getByLabelText(/select all/i)).toBeChecked();
  });

  it('disables the checkbox for a row the caller marks unavailable', () => {
    renderTable({ selection: selection({ isDisabled: (l) => l.plNumber === 'AA02' }) });
    expect(screen.getByLabelText('Select AA02')).toBeDisabled();
    expect(screen.getByLabelText('Select AA01')).toBeEnabled();
  });

  it('leaves disabled rows out of select-all', async () => {
    const onToggleAll = vi.fn();
    renderTable({
      selection: selection({ onToggleAll, isDisabled: (l) => l.plNumber === 'AA02' }),
    });
    await userEvent.click(screen.getByLabelText(/select all/i));
    expect(onToggleAll).toHaveBeenCalledWith(['AB00', 'AA01'], true);
  });

  it('disables select-all when no visible row is selectable', () => {
    renderTable({ selection: selection({ isDisabled: () => true }) });
    expect(screen.getByLabelText(/select all/i)).toBeDisabled();
  });
});
