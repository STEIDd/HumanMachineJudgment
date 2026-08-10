import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JudgmentPanel } from './JudgmentPanel';

const mockJP = {
  id: 'jp-test-1',
  status: 'pending',
  category: 'method',
  question: 'Which statistical method should be used for analysis?',
  context: 'Analyzing survey data with multiple variables.',
  trigger: { source: 'agent', description: 'Method selection required' },
  materiality: {
    score: 12,
    interventionLevel: 'pause',
    dimensions: {
      methodologicalDiscretion: 2,
      downstreamInfluence: 3,
      uncertainty: 1,
      consequence: 2,
      reversibility: 1,
      accountabilityRequirement: 3,
    },
  },
  alternatives: [
    { id: 'alt-1', label: 'Linear Regression', description: 'Standard linear approach' },
    { id: 'alt-2', label: 'Random Forest', description: 'Ensemble tree method' },
  ],
  artifacts: [
    { id: 'art-1', artifactType: 'dataset', label: 'Survey Data', relationship: 'input' },
  ],
  authority: { mode: 'human', assignedTo: 'analyst-1' },
  unknowns: ['Data distribution shape', 'Outlier prevalence'],
  validityConditions: ['Sample size > 100', 'No multicollinearity'],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
};

const mockEvents = [
  { id: 'evt-1', type: 'created', timestamp: '2024-01-15T10:00:00Z' },
  {
    id: 'evt-2',
    type: 'status_changed',
    timestamp: '2024-01-15T11:00:00Z',
    previousStatus: 'candidate',
    newStatus: 'pending',
  },
];

describe('JudgmentPanel', () => {
  it('renders all sections', () => {
    render(
      <JudgmentPanel
        judgmentPoint={mockJP}
        events={mockEvents}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('Materiality')).toBeInTheDocument();
    expect(screen.getByText('Alternatives')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Known Unknowns')).toBeInTheDocument();
    expect(screen.getByText('Authority')).toBeInTheDocument();
    expect(screen.getByText('Validity Conditions')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('shows question as heading', () => {
    render(<JudgmentPanel judgmentPoint={mockJP} onClose={vi.fn()} onAction={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Which statistical method should be used for analysis?',
    );
  });

  it('shows action buttons per status', () => {
    render(<JudgmentPanel judgmentPoint={mockJP} onClose={vi.fn()} onAction={vi.fn()} />);
    expect(screen.getByText('Investigate')).toBeInTheDocument();
    expect(screen.getByText('Delegate')).toBeInTheDocument();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(<JudgmentPanel judgmentPoint={mockJP} onClose={onClose} onAction={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<JudgmentPanel judgmentPoint={mockJP} onClose={onClose} onAction={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Close panel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAction for action buttons', () => {
    const onAction = vi.fn();
    render(<JudgmentPanel judgmentPoint={mockJP} onClose={vi.fn()} onAction={onAction} />);
    fireEvent.click(screen.getByText('Investigate'));
    expect(onAction).toHaveBeenCalledWith('investigate');
  });
});
