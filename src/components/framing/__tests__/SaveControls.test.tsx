import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SaveControls } from '../SaveControls';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore, dirtyPlNumbers } from '../../../store/framingStore';
import { useRoleStore } from '../../../store/roleStore';
import { useUIStore } from '../../../store/uiStore';

const renderControls = (plNumber: string | null = 'AA00') =>
  render(<LangProvider><SaveControls plNumber={plNumber} /></LangProvider>);

describe('SaveControls (§8.1, HIW-463)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
    useUIStore.setState({ toasts: [] });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('shows the per-line control to %s — AC#17', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderControls();
    expect(screen.getByRole('button', { name: /save line/i })).toBeInTheDocument();
  });

  // §8.1's always-on global Save stays removed (reviewer request, 2026-08-31) —
  // the bulk selection control owns that header slot. What comes back is a
  // *contextual* bulk Save: it appears only once one line's Save can no longer
  // cover the pending work, i.e. from the second dirty line onwards.
  it.each([0, 1])('offers no bulk save with %i dirty line(s) — AC#12', (dirty) => {
    if (dirty === 1) useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    renderControls('AA00');
    expect(screen.queryByRole('button', { name: /save all/i })).toBeNull();
  });

  it('offers the bulk save from the second dirty line onwards — AC#12', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    expect(screen.getByRole('button', { name: /save all \(2\)/i })).toBeEnabled();
  });

  // The reason the control has to exist: the per-line Save only ever reaches the
  // row the form has open, so the other dirty lines were unreachable without it.
  it('saves every dirty line, each with its own fields — AC#12', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'projectRanking', 'R7');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));

    const after = useFramingStore.getState();
    expect(after.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-99');
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.projectRanking).toBe('R7');
    // A line's own edit never leaks onto the other: payloads stay per line.
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.cluster).not.toBe('CL-99');
    expect(dirtyPlNumbers(after)).toEqual([]);
  });

  it('confirms the bulk save with a toast counting the saved lines', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(useUIStore.getState().toasts.map((t) => t.text)).toEqual([
      expect.stringContaining('2'),
    ]);
  });

  it('bulk-saves a dirty line even with no row open — the form is not the gate', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls(null);
    expect(screen.getByRole('button', { name: /save line/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);
  });

  it('saves only the selected line — AC#11', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));

    const after = useFramingStore.getState();
    expect(after.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-99');
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.cluster).not.toBe('CL-88');
    expect(dirtyPlNumbers(after)).toEqual(['AA01']);
  });

  it('is never disabled by any readiness state — AC#15', async () => {
    useFramingStore.getState().editField('AA00', 'frameworkComment', '');
    renderControls('AA00');
    const button = screen.getByRole('button', { name: /save line/i });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.frameworkComment).toBe('');
  });

  it('reports how many lines still have unsaved edits — AC#16', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    expect(screen.getByTestId('framing-dirty-count')).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));
    expect(screen.getByTestId('framing-dirty-count')).toHaveTextContent('1');
  });

  it('shows no consequence dialog — AC#18', async () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables the per-line control when nothing is selected or nothing is dirty', () => {
    renderControls(null);
    expect(screen.getByRole('button', { name: /save line/i })).toBeDisabled();
  });
});
