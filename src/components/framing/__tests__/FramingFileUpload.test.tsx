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

/**
 * A file shaped like the real ones: three rows whose PL Number column carries
 * the placeholder text that used to collapse them into a single row.
 */
function placeholderFile(name = 'framing.xlsx'): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['PL Number', 'EXPECTED ECO OUTPUT'],
      ['New', 'ECO2'], ['New', 'ECO2'], ['to be open', 'ECO2'],
    ]),
    'GWF 2026',
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
      { applyAccept: false },
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

    // AA03 — the pre-filled starting code, one past the fixtures' AA02.
    await waitFor(() => {
      expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'AA03')).toBe(true);
    });
    expect(useFramingStore.getState().lastUpload?.fileName).toBe('framing.xlsx');
  });

  it('surfaces a parse error inline when no GWF sheet exists — AC#5', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF_old'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByText(/no gwf worksheet/i)).toBeInTheDocument();
  });

  it('surfaces the noHeaderRow message, distinct from the no-worksheet one — I2', async () => {
    renderUpload();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'GWF empty');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'framing.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await userEvent.upload(screen.getByLabelText(/only/i), file);
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByText(/header row/i)).toBeInTheDocument();
    expect(screen.queryByText(/no gwf worksheet/i)).toBeNull();
  });

  it('surfaces a distinct generic fallback for a non-FramingParseError — I2', async () => {
    renderUpload();
    // A "PK" zip signature followed by garbage is not a valid xlsx payload and
    // is not a FramingParseError case (no GWF sheet / no header row) — SheetJS
    // throws a plain Error for it, the same shape a corrupt or
    // password-protected file produces.
    const bytes = new Uint8Array([...'PK\x03\x04'].map((c) => c.charCodeAt(0)).concat(
      Array.from({ length: 20 }, () => 0x67),
    ));
    const file = new File([bytes], 'framing.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await userEvent.upload(screen.getByLabelText(/only/i), file);
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByText(/could not be processed/i)).toBeInTheDocument();
    expect(screen.queryByText(/no gwf worksheet/i)).toBeNull();
  });

  it('mentions discarded pending edits in the success notice — I4', async () => {
    renderUpload();
    // First upload numbers its row AA03 (one past the fixtures).
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => {
      expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'AA03')).toBe(true);
    });

    // Edit that row, then upload another file numbered from AA03 on purpose:
    // reassignment always hands out fresh codes, so a collision now takes a
    // deliberate starting code rather than a re-upload of the same file.
    useFramingStore.getState().editField('AA03', 'cluster', 'STALE-EDIT');
    const startInput = screen.getByLabelText(/starting pl number/i);
    await userEvent.clear(startInput);
    await userEvent.type(startInput, 'AA03');
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026', 'second.xlsx'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(await screen.findByText(/discarded/i)).toBeInTheDocument();
  });

  it('refuses a file name already uploaded, so re-upload cannot duplicate rows', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => expect(useFramingStore.getState().uploads).toHaveLength(1));
    const lineCount = useFramingStore.getState().lines.length;

    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    expect(await screen.findByText(/already been uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
    expect(useFramingStore.getState().lines).toHaveLength(lineCount);
    expect(useFramingStore.getState().uploads).toHaveLength(1);
  });

  it('accepts the same content under a different file name', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => expect(useFramingStore.getState().uploads).toHaveLength(1));

    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026', 'other.xlsx'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => expect(useFramingStore.getState().uploads).toHaveLength(2));
  });

  it('says nothing about discarded edits when there were none — I4', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await screen.findByText(/loaded/i);
    expect(screen.queryByText(/discarded/i)).toBeNull();
  });

  it('pre-fills the starting PL Number with the next free code (§5.4 global max)', () => {
    renderUpload();
    // Fixtures top out at AA02 / 02AA, so the LLNN suggestion is AA03.
    expect(screen.getByLabelText(/starting pl number/i)).toHaveValue('AA03');
  });

  it('reassigns every row from the starting code, placeholders included', async () => {
    renderUpload();
    const startInput = screen.getByLabelText(/starting pl number/i);
    await userEvent.clear(startInput);
    await userEvent.type(startInput, 'IF01');
    await userEvent.upload(screen.getByLabelText(/only/i), placeholderFile());
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      const codes = useFramingStore.getState().lines.map((l) => l.plNumber);
      expect(codes).toContain('IF01');
      expect(codes).toContain('IF02');
      expect(codes).toContain('IF03');
    });
    // The placeholder never becomes a PL Number, and no row was lost to a collapse.
    expect(useFramingStore.getState().lines.map((l) => l.plNumber)).not.toContain('New');
    expect(useFramingStore.getState().lastUpload?.rfqCount).toBe(3);
  });

  it('re-suggests the next free code after a successful upload', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/starting pl number/i)).toHaveValue('AA04');
    });
  });

  it('rejects an invalid starting code inline and never parses the file', async () => {
    renderUpload();
    const startInput = screen.getByLabelText(/starting pl number/i);
    await userEvent.clear(startInput);
    await userEvent.type(startInput, 'New');
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));

    expect(await screen.findByText(/not a valid pl number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
    expect(useFramingStore.getState().lastUpload).toBeNull();
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
