import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingDetailForm } from '../FramingDetailForm';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore, dirtyPlNumbers } from '../../../store/framingStore';

const renderForm = (plNumber: string) =>
  render(<LangProvider><FramingDetailForm plNumber={plNumber} /></LangProvider>);

describe('FramingDetailForm (§7.2, HIW-463)', () => {
  beforeEach(() => useFramingStore.setState(useFramingStore.getInitialState(), true));

  it('renders the 8 RFQ section headers — AC#1', () => {
    renderForm('AA00');
    for (const title of [
      /PL Details/i, /Customer Request/i, /Vehicle Description/i, /Organ Description/i,
      /Schedule Milestones/i, /Framework/i, /Prototype Details/i, /Additional Details/i,
    ]) {
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /RFI Details/i })).toBeNull();
  });

  it('adds the RFI-only section on an RFI line — §15.3', () => {
    renderForm('AA02');
    expect(screen.getByRole('button', { name: /RFI Details/i })).toBeInTheDocument();
  });

  it('recomposes PL Name live with no network call — AC#8', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Organ Description/i }));
    // Vehicle code lives in Vehicle Description; open it and edit.
    await userEvent.click(screen.getByRole('button', { name: /Vehicle Description/i }));
    const vehicleCode = screen.getByLabelText('Vehicle code');
    await userEvent.clear(vehicleCode);
    await userEvent.type(vehicleCode, 'ZZ99');
    expect(screen.getByText(/ZZ99/)).toBeInTheDocument();
  });

  it('fills and clears Parent Ranking from the chosen parent — AC#5/#6/#20', async () => {
    renderForm('00AA');
    const selector = screen.getByLabelText('Parent Prog. Line');
    await userEvent.selectOptions(selector, 'AA00');
    expect(screen.getByText('Parent Ranking').parentElement).toHaveTextContent('M');
    await userEvent.selectOptions(selector, '');
    expect(screen.getByText('Parent Ranking').parentElement).not.toHaveTextContent('M');
  });

  it('excludes the row own PL number from the parent options — AC#4', () => {
    renderForm('AA00');
    expect(screen.queryByRole('option', { name: 'AA00' })).toBeNull();
    expect(screen.getByRole('option', { name: 'AA01' })).toBeInTheDocument();
  });

  it('renders no input for parentRanking — AC#5', () => {
    renderForm('AA00');
    expect(screen.queryByLabelText('Parent Ranking')).toBeNull();
  });

  it('renders the Generate-time fields nowhere — AC#7', () => {
    renderForm('AA00');
    for (const label of [/^Engineering$/i, /^Estimate type$/i, /^Injection system$/i, /^Market$/i]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
  });

  it('holds edits in page state, persisting nothing — AC#10', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Framework/i }));
    const cluster = screen.getByLabelText('Cluster');
    await userEvent.clear(cluster);
    await userEvent.type(cluster, 'CL-99');
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-01');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual(['AA00']);
  });

  it('renders expectedEcoOutput disabled — §15.1', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Customer Request/i }));
    expect(screen.getByLabelText('Expected ECO Output')).toBeDisabled();
  });

  it('renders no error indicator or readiness state anywhere — AC#9', async () => {
    const { container } = renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Framework/i }));
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(container.querySelector('[data-testid="field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="section-error"]')).toBeNull();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });

  it('renders nothing for an unknown PL number', () => {
    const { container } = renderForm('DOES-NOT-EXIST');
    expect(container.textContent).toBe('');
  });
});
