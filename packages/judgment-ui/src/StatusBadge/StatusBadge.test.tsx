import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, type JudgmentStatus } from './StatusBadge';

const allStatuses: JudgmentStatus[] = [
  'candidate',
  'pending',
  'investigating',
  'resolved',
  'delegated',
  'stale',
  'reopened',
  'dismissed',
];

describe('StatusBadge', () => {
  it.each(allStatuses)('renders status text for "%s"', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it.each(allStatuses)('has correct aria-label for "%s"', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', `Status: ${status}`);
  });

  it.each(allStatuses)('applies correct CSS class for "%s"', (status) => {
    const { container } = render(<StatusBadge status={status} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain(status);
  });

  it('applies custom className when provided', () => {
    const { container } = render(<StatusBadge status="pending" className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });

  it('renders as a span element', () => {
    render(<StatusBadge status="resolved" />);
    const badge = screen.getByRole('status');
    expect(badge.tagName).toBe('SPAN');
  });
});
