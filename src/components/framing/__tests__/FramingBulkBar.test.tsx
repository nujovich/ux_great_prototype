import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingBulkBar } from '../FramingBulkBar';
import { LangProvider } from '../../../i18n/LangContext';

const renderBar = (props: Partial<Parameters<typeof FramingBulkBar>[0]> = {}) =>
  render(
    <LangProvider>
      <FramingBulkBar count={2} onSend={vi.fn()} onClear={vi.fn()} {...props} />
    </LangProvider>,
  );

describe('FramingBulkBar', () => {
  // It replaced §8.1's global Save, which was ALWAYS rendered and merely
  // disabled when nothing was dirty. Hiding at zero made the header lose a
  // control and gain nothing in the state the page opens in.
  it('stays visible with an empty selection, like the control it replaced', () => {
    renderBar({ count: 0 });
    expect(screen.getByRole('button', { name: /send to pre-estimation/i })).toBeInTheDocument();
  });

  it('disables both actions with an empty selection', () => {
    renderBar({ count: 0 });
    expect(screen.getByRole('button', { name: /send to pre-estimation/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
  });

  it('enables them once something is selected', () => {
    renderBar({ count: 1 });
    expect(screen.getByRole('button', { name: /send to pre-estimation/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /clear/i })).toBeEnabled();
  });

  it('reports an empty selection as zero rather than going silent', () => {
    renderBar({ count: 0 });
    expect(screen.getByText(/0 line\(s\) selected/i)).toBeInTheDocument();
  });

  it('does not send an empty selection', async () => {
    const onSend = vi.fn();
    renderBar({ count: 0, onSend });
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('reports how many lines are selected', () => {
    renderBar({ count: 3 });
    expect(screen.getByText(/3 line\(s\) selected/i)).toBeInTheDocument();
  });

  it('sends the selection', async () => {
    const onSend = vi.fn();
    renderBar({ onSend });
    await userEvent.click(screen.getByRole('button', { name: /send to pre-estimation/i }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('clears the selection', async () => {
    const onClear = vi.fn();
    renderBar({ onClear });
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
