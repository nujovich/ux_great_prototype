import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingUploadList } from '../FramingUploadList';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore } from '../../../store/framingStore';
import { useRoleStore } from '../../../store/roleStore';

const renderList = () => render(<LangProvider><FramingUploadList /></LangProvider>);

function ingest(fileName: string, plNumbers: string[], overrides: Record<string, unknown> = {}) {
  const template = useFramingStore.getState().lines[0];
  useFramingStore.getState().ingestRows(
    plNumbers.map((plNumber) => ({ ...template, plNumber, ...overrides })),
    fileName,
  );
}

describe('FramingUploadList (Task 6, HIW-452 remediation)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it('renders nothing when there are no uploads', () => {
    const { container } = renderList();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one entry per upload', () => {
    ingest('fileA.xlsx', ['ZZ90']);
    ingest('fileB.xlsx', ['ZZ91', 'ZZ92']);
    renderList();

    const { uploads } = useFramingStore.getState();
    expect(uploads).toHaveLength(2);
    for (const upload of uploads) {
      expect(screen.getByTestId(`upload-${upload.id}`)).toBeInTheDocument();
    }
    expect(screen.getByText('fileA.xlsx')).toBeInTheDocument();
    expect(screen.getByText('fileB.xlsx')).toBeInTheDocument();
  });

  it.each(['Admin', 'PMO'] as const)('shows a delete control for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('shows no delete control for CPO — the inverse of upload:framing-file', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    // The list itself is still visible — only the delete control is gated.
    expect(screen.getByText('fileA.xlsx')).toBeInTheDocument();
  });

  it('requires confirmation before deleting — nothing is removed on the first click', async () => {
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    // The row must still exist — only a confirm dialog opened.
    expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ90')).toBe(true);
    expect(useFramingStore.getState().uploads).toHaveLength(1);
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
  });

  it('deletes only after the confirm step', async () => {
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

    expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ90')).toBe(false);
    expect(useFramingStore.getState().uploads).toHaveLength(0);
  });

  it('cancelling the confirm dialog deletes nothing', async () => {
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ90')).toBe(true);
    expect(useFramingStore.getState().uploads).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /yes, delete/i })).toBeNull();
  });

  it('shows the row count for each upload', () => {
    ingest('fileB.xlsx', ['ZZ91', 'ZZ92']);
    renderList();
    expect(screen.getByText(/2 line/i)).toBeInTheDocument();
  });

  it('drops the delete control when the role switches to CPO while mounted', async () => {
    ingest('fileA.xlsx', ['ZZ90']);
    renderList();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

    await act(async () => { useRoleStore.setState({ currentRole: 'CPO' }); });
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
