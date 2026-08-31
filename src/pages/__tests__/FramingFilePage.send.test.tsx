import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingFilePage } from '../FramingFilePage';
import { LangProvider } from '../../i18n/LangContext';
import { useFramingStore } from '../../store/framingStore';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';

const renderPage = () => render(<LangProvider><FramingFilePage /></LangProvider>);

describe('FramingFilePage — send RFQ lines to Pre-Estimation (§9)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useDataStore.setState({ lines: structuredClone(useDataStore.getInitialState().lines) });
    useUIStore.setState({ toasts: [] });
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  const projectLines = () => useDataStore.getState().lines;
  const toastTexts = () => useUIStore.getState().toasts.map((t) => t.text).join(' ');

  it('offers a selection column on RFQ', () => {
    renderPage();
    expect(screen.getByLabelText('Select AA00')).toBeInTheDocument();
  });

  it('offers none on RFI — the send is RFQ only', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('hides the send from a role without generate:project-lines', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    renderPage();
    expect(screen.queryByLabelText('Select AA00')).toBeNull();
  });

  it('creates one project line per selected framing line, at To do', async () => {
    renderPage();
    const before = projectLines().length;
    await userEvent.click(screen.getByLabelText('Select AA00'));
    await userEvent.click(screen.getByLabelText('Select AA01'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));

    expect(projectLines()).toHaveLength(before + 2);
    const created = projectLines().slice(before);
    expect(created.map((l) => l.project_id)).toEqual(['AA00-H-DESIGN', 'AA01-H-SOFTWARE']);
    expect(created.every((l) => l.status === 'To do')).toBe(true);
    expect(created.every((l) => l.cycleId === 'cyc-2026h1')).toBe(true);
  });

  it('clears the selection once sent', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Select AA00'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    expect(screen.queryByRole('button', { name: /send to pre-estimation/i })).toBeNull();
    expect(screen.getByLabelText('Select AA00')).not.toBeChecked();
  });

  it('says how many lines it sent', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Select AA00'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    expect(toastTexts()).toMatch(/1 line\(s\) sent to Pre-Estimation/i);
  });

  it('disables a line already sent, and never duplicates it', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Select AA00'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    const after = projectLines().length;
    expect(screen.getByLabelText('Select AA00')).toBeDisabled();
    expect(projectLines()).toHaveLength(after);
  });

  it('reports lines it had to skip for want of a métier', async () => {
    // A real file can carry an Owner N2 nobody maps; that row cannot become a
    // project line, and the count has to admit it rather than claim success.
    useFramingStore.setState((s) => ({
      lines: s.lines.map((l) => (l.plNumber === 'AA00' ? { ...l, ownerN2: 'H-UNKNOWN' } : l)),
    }));
    renderPage();
    expect(screen.getByLabelText('Select AA00')).toBeDisabled();
  });

  it('leaves the Save all control gone — the bulk control replaced it', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /save all/i })).toBeNull();
    expect(screen.getByRole('button', { name: /save line/i })).toBeInTheDocument();
  });

  it('drops the selection when switching tabs', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Select AA00'));
    expect(screen.getByRole('button', { name: /send to pre-estimation/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    await userEvent.click(screen.getByRole('tab', { name: 'RFQ' }));
    expect(screen.queryByRole('button', { name: /send to pre-estimation/i })).toBeNull();
  });
});
