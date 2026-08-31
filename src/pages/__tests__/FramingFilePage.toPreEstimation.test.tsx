import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingFilePage } from '../FramingFilePage';
import { PreEstimationPage } from '../PreEstimationPage';
import { LangProvider } from '../../i18n/LangContext';
import { useFramingStore } from '../../store/framingStore';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';

/**
 * The claim is "it takes the selected lines to Pre-Estimation", so the store
 * holding a row is not enough evidence — this drives the send from the Framing
 * File page and then looks for the line on the Pre-Estimation page itself.
 */
describe('Framing File → Pre-Estimation, end to end', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useDataStore.setState({ lines: structuredClone(useDataStore.getInitialState().lines) });
    useUIStore.setState({ toasts: [], selectedLineIds: [], estimationPanelLineId: null });
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it('shows a sent line on the Pre-Estimation grid', async () => {
    const framing = render(<LangProvider><FramingFilePage /></LangProvider>);
    await userEvent.click(screen.getByLabelText('Select AA00'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    framing.unmount();

    render(<LangProvider><PreEstimationPage /></LangProvider>);
    // The framing line's own PL Number, now a project line of its own. It
    // shows in more than one cell (PL Number and the composed name), so the
    // assertion is on presence, not on a single node.
    expect(await screen.findAllByText(/AA00/)).not.toHaveLength(0);
  });

  it('does not show a line that was never sent', () => {
    render(<LangProvider><PreEstimationPage /></LangProvider>);
    expect(screen.queryAllByText(/AA00/)).toHaveLength(0);
  });

  it('lands it at To do, ready to be pre-estimated', async () => {
    const framing = render(<LangProvider><FramingFilePage /></LangProvider>);
    await userEvent.click(screen.getByLabelText('Select AA01'));
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    framing.unmount();

    const sent = useDataStore.getState().lines.find((l) => l.plNumber === 'AA01')!;
    expect(sent.status).toBe('To do');

    render(<LangProvider><PreEstimationPage /></LangProvider>);
    expect(await screen.findAllByText(/AA01/)).not.toHaveLength(0);
  });
});
