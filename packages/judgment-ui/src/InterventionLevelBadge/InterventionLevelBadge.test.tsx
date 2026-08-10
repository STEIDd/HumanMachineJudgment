import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InterventionLevelBadge, type InterventionLevel } from './InterventionLevelBadge';

const allLevels: InterventionLevel[] = ['trace', 'disclose', 'pause', 'require-investigation'];

describe('InterventionLevelBadge', () => {
  it.each(allLevels)('renders readable text for "%s"', (level) => {
    render(<InterventionLevelBadge level={level} />);
    expect(screen.getByText(level)).toBeInTheDocument();
  });

  it.each(allLevels)('has correct aria-label with description for "%s"', (level) => {
    render(<InterventionLevelBadge level={level} />);
    expect(screen.getByLabelText(`Intervention level: ${level}`)).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(<InterventionLevelBadge level="trace" className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });

  it('renders as a span element', () => {
    const { container } = render(<InterventionLevelBadge level="disclose" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
  });
});
