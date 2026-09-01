import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingFilePage } from '../FramingFilePage';
import { LangProvider } from '../../i18n/LangContext';
import { useFramingStore } from '../../store/framingStore';
import { useRoleStore } from '../../store/roleStore';
import { useUIStore } from '../../store/uiStore';

const renderPage = () => render(<LangProvider><FramingFilePage /></LangProvider>);

describe('FramingFilePage (§15, ADR-020)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
    useUIStore.setState({ toasts: [] });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('renders the page for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.getByRole('heading', { name: /framing file/i })).toBeInTheDocument();
  });

  it.each(['Engineer', 'RCRC'] as const)('blocks %s behind the role gate', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.queryByRole('heading', { name: /framing file/i })).toBeNull();
    expect(screen.getByText(/view:framing-file/)).toBeInTheDocument();
  });

  it('shows both tabs, RFQ selected by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'RFQ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'RFI' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows only that track rows in each tab', async () => {
    renderPage();
    expect(screen.getByTestId('row-AA00')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA02')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.getByTestId('row-AA02')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA00')).toBeNull();
  });

  it('opens the detail form on row selection', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
  });

  it('clears the selected line when switching tabs', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
  });

  // ── Unsaved edits across a tab switch ───────────────────────────────────
  // Switching tabs closes the detail form, so an unsaved line stops being
  // visible without stopping being unsaved. The edits survive in page state
  // (they are keyed by PL Number, not by track), so this warns rather than
  // blocks — nothing is lost, but the user has to be told it is still pending.

  it('warns about unsaved edits when switching tabs', async () => {
    renderPage();
    act(() => useFramingStore.getState().editField('AA00', 'cluster', 'CL-99'));
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(useUIStore.getState().toasts.map((t) => t.text)).toEqual([
      expect.stringContaining('1'),
    ]);
  });

  it('counts every unsaved line in the warning, not just the open one', async () => {
    renderPage();
    const store = useFramingStore.getState();
    act(() => {
      store.editField('AA00', 'cluster', 'CL-99');
      store.editField('AA01', 'cluster', 'CL-88');
    });
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(useUIStore.getState().toasts[0].text).toContain('2');
  });

  it('stays silent when switching tabs with nothing unsaved', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('stays silent when clicking the tab already open', async () => {
    renderPage();
    act(() => useFramingStore.getState().editField('AA00', 'cluster', 'CL-99'));
    await userEvent.click(screen.getByRole('tab', { name: 'RFQ' }));
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('keeps the unsaved edits themselves across the switch', async () => {
    renderPage();
    act(() => useFramingStore.getState().editField('AA00', 'cluster', 'CL-99'));
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    await userEvent.click(screen.getByRole('tab', { name: 'RFQ' }));
    expect(useFramingStore.getState().edits.AA00).toEqual({ cluster: 'CL-99' });
  });

  it('shows the upload control to PMO and hides it from CPO', () => {
    renderPage();
    expect(screen.getByLabelText(/only/i)).toBeInTheDocument();
  });

  it('hides the upload control from CPO — HIW-458 AC#2', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    const { container } = renderPage();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('keeps filter state across opening and closing the form — ADR-011', async () => {
    renderPage();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByTestId('filter-organType')).toHaveValue('gear');
  });

  it('renders an empty state when a track has no lines', async () => {
    useFramingStore.setState({ lines: [] });
    renderPage();
    expect(screen.getByText(/no framing lines/i)).toBeInTheDocument();
  });

  it('renders no readiness indicator anywhere on the page', () => {
    renderPage();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });

  // ── Task 7 (HIW-452 remediation) — editing heading ──────────────────────

  it('names the selected line by PL Number and Project Name above the detail form', async () => {
    renderPage();
    expect(screen.queryByText(/editing pl number/i)).toBeNull();

    await userEvent.click(screen.getByTestId('row-AA00'));
    const line = useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!;
    expect(
      screen.getByText(new RegExp(`Editing PL Number ${line.plNumber}.*${line.projectName}`)),
    ).toBeInTheDocument();
  });

  it('clears the heading once the selection is cleared', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByText(/editing pl number/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.queryByText(/editing pl number/i)).toBeNull();
  });

  // ── Task 6 (HIW-452 remediation) — per-file management ──────────────────

  it('renders the uploaded-files list once a file has been ingested', () => {
    useFramingStore.getState().ingestRows(
      [{ ...useFramingStore.getState().lines[0], id: 'ffl-new-1', plNumber: 'ZZ90' }],
      'fileA.xlsx',
    );
    renderPage();
    expect(screen.getByText('fileA.xlsx')).toBeInTheDocument();
  });

  it('clears the selection when its upload is deleted, and drops the editing heading with it', async () => {
    useFramingStore.getState().ingestRows(
      [{ ...useFramingStore.getState().lines[0], id: 'ffl-new-1', plNumber: 'ZZ90', track: 'RFQ' }],
      'fileA.xlsx',
    );
    renderPage();

    await userEvent.click(screen.getByTestId('row-ZZ90'));
    expect(screen.getByText(/editing pl number/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

    expect(screen.queryByTestId('row-ZZ90')).toBeNull();
    expect(screen.queryByText(/editing pl number/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
  });
});
