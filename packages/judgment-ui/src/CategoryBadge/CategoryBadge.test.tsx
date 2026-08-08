import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryBadge } from './CategoryBadge';

const allCategories = [
  'assumption',
  'method',
  'framing',
  'parameter',
  'boundary',
  'validation',
  'interpretation',
  'scope',
];

describe('CategoryBadge', () => {
  it.each(allCategories)('renders category text for "%s"', (category) => {
    render(<CategoryBadge category={category} />);
    expect(screen.getByText(category)).toBeInTheDocument();
  });

  it.each(allCategories)('has correct aria-label for "%s"', (category) => {
    render(<CategoryBadge category={category} />);
    expect(screen.getByLabelText(`Category: ${category}`)).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(<CategoryBadge category="method" className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });

  it('renders as a span element', () => {
    const { container } = render(<CategoryBadge category="assumption" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
  });
});
