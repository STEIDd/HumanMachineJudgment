import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JudgmentCard, type JudgmentCardData } from './JudgmentCard';

const baseJudgment: JudgmentCardData = {
  id: 'jp-1',
  status: 'pending',
  category: 'architecture',
  question: 'Should we use a monorepo or polyrepo structure for the new microservices platform?',
  materiality: { score: 0.85, interventionLevel: 'pause' },
  updatedAt: '2025-06-15T14:30:00Z',
};

const longQuestion =
  'This is a very long question that exceeds one hundred characters in total length and should be truncated by the component to avoid overflowing the card layout boundaries completely';

describe('JudgmentCard', () => {
  it('renders question text truncated to ~100 chars', () => {
    const jp: JudgmentCardData = { ...baseJudgment, question: longQuestion };
    render(<JudgmentCard judgmentPoint={jp} />);

    // Full text should not be in the document
    expect(screen.queryByText(longQuestion)).not.toBeInTheDocument();

    // Truncated version should be present (100 chars + ellipsis)
    const truncated = longQuestion.slice(0, 100).trimEnd() + '\u2026';
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('does not truncate short question text', () => {
    render(<JudgmentCard judgmentPoint={baseJudgment} />);

    expect(screen.getByText(baseJudgment.question)).toBeInTheDocument();
  });

  it('shows correct badges', () => {
    render(<JudgmentCard judgmentPoint={baseJudgment} />);

    // StatusBadge
    expect(screen.getByText('pending')).toBeInTheDocument();
    // CategoryBadge
    expect(screen.getByText('architecture')).toBeInTheDocument();
    // InterventionLevelBadge
    expect(screen.getByText('pause')).toBeInTheDocument();
    // Materiality score (0.85 rounded to 1 decimal place)
    expect(screen.getByTestId('materiality-score')).toHaveTextContent('0.8');
  });

  it('shows correct action buttons for pending status', () => {
    render(<JudgmentCard judgmentPoint={baseJudgment} />);

    expect(screen.getByText('Begin Investigation')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByText('Delegate')).toBeInTheDocument();
  });

  it('shows correct action buttons for investigating status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'investigating' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Add Alternative')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('shows correct action buttons for resolved status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'resolved' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Reopen')).toBeInTheDocument();
  });

  it('shows correct action buttons for delegated status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'delegated' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Resolve')).toBeInTheDocument();
    expect(screen.getByText('Reopen')).toBeInTheDocument();
  });

  it('shows correct action buttons for stale status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'stale' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Reopen')).toBeInTheDocument();
    expect(screen.getByText('Confirm Valid')).toBeInTheDocument();
  });

  it('shows correct action buttons for reopened status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'reopened' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Begin Investigation')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('shows correct action buttons for dismissed status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'dismissed' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.getByText('Reopen')).toBeInTheDocument();
  });

  it('shows no action buttons for candidate status', () => {
    const jp: JudgmentCardData = { ...baseJudgment, status: 'candidate' };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.queryByTestId('card-actions')).not.toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    const onSelect = vi.fn();
    render(<JudgmentCard judgmentPoint={baseJudgment} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('judgment-card-jp-1'));
    expect(onSelect).toHaveBeenCalledWith('jp-1');
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = vi.fn();
    const onSelect = vi.fn();
    render(<JudgmentCard judgmentPoint={baseJudgment} onAction={onAction} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Begin Investigation'));
    expect(onAction).toHaveBeenCalledWith('jp-1', 'Begin Investigation');
    // onSelect should NOT be called when button is clicked
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not show intervention level badge when not provided', () => {
    const jp: JudgmentCardData = {
      ...baseJudgment,
      materiality: { score: 0.5 },
    };
    render(<JudgmentCard judgmentPoint={jp} />);

    expect(screen.queryByLabelText(/Intervention level/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<JudgmentCard judgmentPoint={baseJudgment} className="my-card" />);
    expect(container.firstChild).toHaveClass('my-card');
  });
});
