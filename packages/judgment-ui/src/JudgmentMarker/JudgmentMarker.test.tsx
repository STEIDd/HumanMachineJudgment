import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JudgmentMarker } from './JudgmentMarker';

const defaultProps = {
  id: 'jp-1',
  status: 'pending',
  category: 'method',
  question: 'Which statistical method should be used for analysis?',
};

describe('JudgmentMarker', () => {
  it('renders inline state by default', () => {
    render(<JudgmentMarker {...defaultProps} />);
    expect(screen.getByTestId('marker-inline')).toBeInTheDocument();
    expect(screen.queryByTestId('marker-expanded')).not.toBeInTheDocument();
  });

  it('shows collapsed state content on focus', () => {
    render(<JudgmentMarker {...defaultProps} />);
    const marker = screen.getByRole('button');
    fireEvent.focus(marker);
    expect(screen.getByTestId('marker-collapsed')).toBeInTheDocument();
  });

  it('toggles expanded on click', () => {
    render(<JudgmentMarker {...defaultProps} materialityScore={12} alternativesCount={3} />);
    const marker = screen.getByRole('button');
    fireEvent.click(marker);
    expect(screen.getByTestId('marker-expanded')).toBeInTheDocument();
    expect(screen.getByText('Materiality: 12/18')).toBeInTheDocument();
    expect(screen.getByText('3 alternatives')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<JudgmentMarker {...defaultProps} />);
    const marker = screen.getByRole('button');
    fireEvent.click(marker);
    expect(screen.getByTestId('marker-expanded')).toBeInTheDocument();
    fireEvent.keyDown(marker, { key: 'Escape' });
    expect(screen.queryByTestId('marker-expanded')).not.toBeInTheDocument();
  });
});
