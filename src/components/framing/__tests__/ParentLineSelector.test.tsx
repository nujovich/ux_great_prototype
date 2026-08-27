import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ParentLineSelector } from '../ParentLineSelector';

const renderSelector = (over = {}) =>
  render(
    <ParentLineSelector
      id="parent" label="Parent Prog. Line" value="" options={['AA01', 'AA02']}
      onChange={vi.fn()} {...over}
    />,
  );

describe('ParentLineSelector (§5.5, HIW-463 AC#4)', () => {
  it('lists the supplied PL numbers', () => {
    renderSelector();
    expect(screen.getByRole('option', { name: 'AA01' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AA02' })).toBeInTheDocument();
  });

  it('always offers a selectable empty option — empty is valid', () => {
    renderSelector();
    const empty = screen.getByRole('option', { name: /none/i });
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveValue('');
  });

  it('reports the chosen parent', async () => {
    const onChange = vi.fn();
    renderSelector({ onChange });
    await userEvent.selectOptions(screen.getByLabelText('Parent Prog. Line'), 'AA02');
    expect(onChange).toHaveBeenCalledWith('AA02');
  });

  it('reports clearing the parent as an empty string', async () => {
    const onChange = vi.fn();
    renderSelector({ value: 'AA02', onChange });
    await userEvent.selectOptions(screen.getByLabelText('Parent Prog. Line'), '');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('reflects the current value', () => {
    renderSelector({ value: 'AA01' });
    expect(screen.getByLabelText('Parent Prog. Line')).toHaveValue('AA01');
  });

  it('renders no error indicator', () => {
    const { container } = renderSelector();
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});
