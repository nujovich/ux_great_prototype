import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingFilePage } from '../FramingFilePage';
import { LangProvider } from '../../i18n/LangContext';
import { useFramingStore } from '../../store/framingStore';
import { useRoleStore } from '../../store/roleStore';

const renderPage = () => render(<LangProvider><FramingFilePage /></LangProvider>);

describe('FramingFilePage (§15, ADR-020)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('renders the page for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.getByRole('heading', { name: /framing file/i })).toBeInTheDocument();
  });

  it.each(['Engineer', 'RCRC'] as const)('blocks %s behind the role gate', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.queryByRole('heading', { name: /framing file/i })).toBeNull();
    expect(screen.getByText(/view:framing-file/)).toBeInTheDocument();
  });

  it('shows both tabs, RFQ selected by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'RFQ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'RFI' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows only that track rows in each tab', async () => {
    renderPage();
    expect(screen.getByTestId('row-AA00')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA02')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.getByTestId('row-AA02')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA00')).toBeNull();
  });

  it('opens the detail form on row selection', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
  });

  it('clears the selected line when switching tabs', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
  });

  it('shows the upload control to PMO and hides it from CPO', () => {
    renderPage();
    expect(screen.getByLabelText(/only/i)).toBeInTheDocument();
  });

  it('hides the upload control from CPO — HIW-458 AC#2', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    const { container } = renderPage();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('keeps filter state across opening and closing the form — ADR-011', async () => {
    renderPage();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByTestId('filter-organType')).toHaveValue('gear');
  });

  it('renders an empty state when a track has no lines', async () => {
    useFramingStore.setState({ lines: [] });
    renderPage();
    expect(screen.getByText(/no framing lines/i)).toBeInTheDocument();
  });

  it('renders no readiness indicator anywhere on the page', () => {
    renderPage();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });
});
