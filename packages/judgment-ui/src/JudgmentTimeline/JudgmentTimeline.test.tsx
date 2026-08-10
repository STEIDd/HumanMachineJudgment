import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JudgmentTimeline, type TimelineEvent } from './JudgmentTimeline';

const events: TimelineEvent[] = [
  {
    id: 'e1',
    type: 'created',
    timestamp: '2025-01-10T10:00:00Z',
    actor: { id: 'agent-1', type: 'agent' },
  },
  {
    id: 'e2',
    type: 'investigation-started',
    timestamp: '2025-01-11T12:00:00Z',
    actor: { id: 'user-1', type: 'human' },
    previousStatus: 'pending',
    newStatus: 'investigating',
  },
  {
    id: 'e3',
    type: 'resolved',
    timestamp: '2025-01-12T15:30:00Z',
    previousStatus: 'investigating',
    newStatus: 'resolved',
  },
];

describe('JudgmentTimeline', () => {
  it('renders events in reverse chronological order', () => {
    render(<JudgmentTimeline events={events} />);

    const items = screen.getAllByTestId(/^timeline-event-/);
    expect(items).toHaveLength(3);

    // First rendered should be the most recent (e3)
    expect(items[0]).toHaveAttribute('data-testid', 'timeline-event-e3');
    expect(items[1]).toHaveAttribute('data-testid', 'timeline-event-e2');
    expect(items[2]).toHaveAttribute('data-testid', 'timeline-event-e1');
  });

  it('shows event type formatted as readable text', () => {
    render(<JudgmentTimeline events={events} />);

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Investigation Started')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows actor info when present', () => {
    render(<JudgmentTimeline events={events} />);

    const actors = screen.getAllByTestId('event-actor');
    expect(actors.length).toBe(2);
    expect(screen.getByText('agent-1')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('shows status transitions when present', () => {
    render(<JudgmentTimeline events={events} />);

    const transitions = screen.getAllByTestId('status-transition');
    expect(transitions.length).toBe(2);

    expect(screen.getByText('pending')).toBeInTheDocument();
    // "investigating" appears twice: as e2's newStatus and e3's previousStatus
    expect(screen.getAllByText('investigating')).toHaveLength(2);
  });

  it('does not show actor when not present', () => {
    const eventsWithoutActor: TimelineEvent[] = [
      { id: 'e-solo', type: 'created', timestamp: '2025-01-10T10:00:00Z' },
    ];
    render(<JudgmentTimeline events={eventsWithoutActor} />);

    expect(screen.queryByTestId('event-actor')).not.toBeInTheDocument();
  });

  it('does not show status transition when neither status is present', () => {
    const eventsWithoutTransition: TimelineEvent[] = [
      { id: 'e-no-trans', type: 'created', timestamp: '2025-01-10T10:00:00Z' },
    ];
    render(<JudgmentTimeline events={eventsWithoutTransition} />);

    expect(screen.queryByTestId('status-transition')).not.toBeInTheDocument();
  });

  it('has timeline aria-label', () => {
    render(<JudgmentTimeline events={events} />);

    expect(screen.getByLabelText('Judgment timeline')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<JudgmentTimeline events={events} className="custom-tl" />);
    expect(container.firstChild).toHaveClass('custom-tl');
  });
});
