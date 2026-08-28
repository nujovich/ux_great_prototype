import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SaveControls } from '../SaveControls';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore, dirtyPlNumbers } from '../../../store/framingStore';
import { useRoleStore } from '../../../store/roleStore';

const renderControls = (plNumber: string | null = 'AA00') =>
  render(<LangProvider><SaveControls plNumber={plNumber} /></LangProvider>);

describe('SaveControls (§8.1, HIW-463)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('shows both controls to %s — AC#17', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderControls();
    expect(screen.getByRole('button', { name: /save line/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all/i })).toBeInTheDocument();
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

  it('saves every pending line on global save — AC#12', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);
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
