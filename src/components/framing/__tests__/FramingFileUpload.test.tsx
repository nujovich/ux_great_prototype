import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import * as XLSX from 'xlsx';
import { FramingFileUpload } from '../FramingFileUpload';
import { useRoleStore } from '../../../store/roleStore';
import { useFramingStore } from '../../../store/framingStore';
import { LangProvider } from '../../../i18n/LangContext';

// Spying on an ES module namespace is unreliable under strict ESM, so the
// "never parsed it" assertion is made against observable state instead: a
// rejected file leaves the store untouched.

function renderUpload() {
  return render(<LangProvider><FramingFileUpload /></LangProvider>);
}

function xlsxFile(sheetName: string, name = 'framing.xlsx'): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['PL Number', 'EXPECTED ECO OUTPUT'], ['ZZ50', 'ECO2']]),
    sheetName,
  );
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('FramingFileUpload (§4.1, HIW-458)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO'] as const)('renders an enabled control for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderUpload();
    expect(screen.getByLabelText(/only/i)).toBeEnabled();
  });

  it('renders nothing at all for CPO — AC#2/#7', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    const { container } = renderUpload();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('rejects a non-.xlsx file inline and never parses it — AC#3/#8', async () => {
    renderUpload();
    await userEvent.upload(
      screen.getByLabelText(/only/i),
      new File(['a,b'], 'framing.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText(/only \.xlsx/i)).toBeInTheDocument();
    // Nothing was parsed: the store is untouched and no upload was recorded.
    expect(useFramingStore.getState().lastUpload).toBeNull();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('parses a valid GWF file and ingests the rows into the store — AC#4', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ50')).toBe(true);
    });
    expect(useFramingStore.getState().lastUpload?.fileName).toBe('framing.xlsx');
  });

  it('surfaces a parse error inline when no GWF sheet exists — AC#5', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF_old'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByText(/no gwf worksheet/i)).toBeInTheDocument();
  });

  it('keeps the button disabled until a valid file is chosen', () => {
    renderUpload();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('renders no readiness or validation indicator', () => {
    renderUpload();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });

  // Guards the known staleness trap: useRoleStore((s) => s.can) returns a stable
  // function reference and does NOT re-render on role switch. This component must
  // call can() inside the selector, so a live switch to CPO removes the control.
  it('drops the control when the role switches to CPO while mounted', async () => {
    const { container } = renderUpload();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();

    await act(async () => {
      useRoleStore.setState({ currentRole: 'CPO' });
    });
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('restores the control when the role switches back to PMO', async () => {
    const { container } = renderUpload();
    await act(async () => { useRoleStore.setState({ currentRole: 'CPO' }); });
    await act(async () => { useRoleStore.setState({ currentRole: 'PMO' }); });
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });
});
