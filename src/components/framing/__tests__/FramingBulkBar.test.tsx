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
  it('renders nothing with an empty selection — no dead controls', () => {
    const { container } = renderBar({ count: 0 });
    expect(container).toBeEmptyDOMElement();
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
