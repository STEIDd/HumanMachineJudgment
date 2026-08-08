import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed, type ActivityItem } from './ActivityFeed';

const items: ActivityItem[] = [
  {
    id: 'act-1',
    eventType: 'created',
    timestamp: '2025-01-10T10:00:00Z',
    pointQuestion: 'Should we use database X or database Y for the new service?',
    actor: { id: 'agent-1', type: 'agent' },
  },
  {
    id: 'act-2',
    eventType: 'investigation-started',
    timestamp: '2025-01-11T12:00:00Z',
    pointQuestion:
      'What authentication method should we adopt for the external API integration layer?',
    actor: { id: 'user-1', type: 'human' },
  },
  {
    id: 'act-3',
    eventType: 'resolved',
    timestamp: '2025-01-12T15:30:00Z',
    pointQuestion: 'Short question?',
  },
];

describe('ActivityFeed', () => {
  it('renders activity items', () => {
    render(<ActivityFeed items={items} />);

    expect(screen.getAllByTestId(/^activity-item-/)).toHaveLength(3);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Investigation Started')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('truncates question text longer than 60 chars', () => {
    render(<ActivityFeed items={items} />);

    // The second item has a question longer than 60 chars
    const longQuestion =
      'What authentication method should we adopt for the external API integration layer?';
    // Should not find the full question text
    expect(screen.queryByText(longQuestion)).not.toBeInTheDocument();

    // Should find truncated version (first 60 chars + ellipsis)
    const truncated = longQuestion.slice(0, 60).trimEnd() + '\u2026';
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('does not truncate short question text', () => {
    render(<ActivityFeed items={items} />);

    expect(screen.getByText('Short question?')).toBeInTheDocument();
  });

  it('respects maxItems', () => {
    render(<ActivityFeed items={items} maxItems={2} />);

    expect(screen.getAllByTestId(/^activity-item-/)).toHaveLength(2);
  });

  it('defaults to showing 10 items', () => {
    const manyItems: ActivityItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `item-${i}`,
      eventType: 'created',
      timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    }));

    render(<ActivityFeed items={manyItems} />);

    expect(screen.getAllByTestId(/^activity-item-/)).toHaveLength(10);
  });

  it('has correct aria-label', () => {
    render(<ActivityFeed items={items} />);

    expect(screen.getByLabelText('Recent activity')).toBeInTheDocument();
  });

  it('shows actor info when present', () => {
    render(<ActivityFeed items={items} />);

    const actors = screen.getAllByTestId('activity-actor');
    expect(actors).toHaveLength(2);
    expect(screen.getByText('agent: agent-1')).toBeInTheDocument();
    expect(screen.getByText('human: user-1')).toBeInTheDocument();
  });

  it('does not show actor when not provided', () => {
    const noActorItems: ActivityItem[] = [
      { id: 'na-1', eventType: 'created', timestamp: '2025-01-01T00:00:00Z' },
    ];
    render(<ActivityFeed items={noActorItems} />);

    expect(screen.queryByTestId('activity-actor')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ActivityFeed items={items} className="my-feed" />);
    expect(container.firstChild).toHaveClass('my-feed');
  });
});
