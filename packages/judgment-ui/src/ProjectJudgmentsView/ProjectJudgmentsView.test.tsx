import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectJudgmentsView } from './ProjectJudgmentsView';

const mockPoints = [
  {
    id: 'jp-1',
    status: 'pending',
    category: 'method',
    question: 'Which method to use?',
    materiality: { score: 12, interventionLevel: 'pause' },
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'jp-2',
    status: 'resolved',
    category: 'assumption',
    question: 'Is this assumption valid?',
    materiality: { score: 8 },
    resolution: { selectedAlternativeId: 'alt-1', rationale: 'Validated by expert' },
    updatedAt: '2024-01-16T10:00:00Z',
  },
];

describe('ProjectJudgmentsView', () => {
  it('shows empty state when no judgment points', () => {
    render(<ProjectJudgmentsView judgmentPoints={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Judgment Points have been created yet.')).toBeInTheDocument();
  });

  it('renders JudgmentCards for each point', () => {
    render(<ProjectJudgmentsView judgmentPoints={mockPoints} />);
    expect(screen.getByText('Which method to use?')).toBeInTheDocument();
    expect(screen.getByText('Is this assumption valid?')).toBeInTheDocument();
  });

  it('filter controls present', () => {
    render(<ProjectJudgmentsView judgmentPoints={mockPoints} />);
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('pagination buttons present', () => {
    render(<ProjectJudgmentsView judgmentPoints={mockPoints} />);
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
