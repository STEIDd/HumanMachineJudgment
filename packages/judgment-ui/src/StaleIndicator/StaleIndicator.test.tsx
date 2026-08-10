import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaleIndicator } from './StaleIndicator';

describe('StaleIndicator', () => {
  it('renders "Stale" text', () => {
    render(<StaleIndicator reason="Context has changed" />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders the reason', () => {
    render(<StaleIndicator reason="Context has changed since last evaluation" />);
    expect(screen.getByText('Context has changed since last evaluation')).toBeInTheDocument();
  });

  it('shows timestamp when provided', () => {
    render(<StaleIndicator reason="Outdated" markedAt="2024-01-15T10:30:00Z" />);
    expect(screen.getByText('2024-01-15T10:30:00Z')).toBeInTheDocument();
  });

  it('does not show timestamp when not provided', () => {
    const { container } = render(<StaleIndicator reason="Outdated" />);
    const timeElement = container.querySelector('time');
    expect(timeElement).toBeNull();
  });

  it('has role="alert"', () => {
    render(<StaleIndicator reason="Context changed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(<StaleIndicator reason="Test reason" className="custom-class" />);
    const indicator = container.firstChild as HTMLElement;
    expect(indicator.className).toContain('custom-class');
  });

  it('renders a warning icon (SVG)', () => {
    const { container } = render(<StaleIndicator reason="Test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
