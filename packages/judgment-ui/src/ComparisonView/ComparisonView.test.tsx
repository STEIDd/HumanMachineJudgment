import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonView } from './ComparisonView';
import type { ComparisonAlternative } from './ComparisonView';

const alternatives: ComparisonAlternative[] = [
  {
    id: 'a1',
    label: 'Option Alpha',
    description: 'Alpha description',
    tradeoffs: 'Alpha tradeoffs',
  },
  {
    id: 'a2',
    label: 'Option Beta',
    description: 'Beta description',
    tradeoffs: 'Beta tradeoffs',
  },
  {
    id: 'a3',
    label: 'Option Gamma',
    description: 'Gamma description',
  },
];

const comparisonData: Record<string, Record<string, string>> = {
  Cost: { a1: 'Low', a2: 'Medium', a3: 'High' },
  Speed: { a1: 'Fast', a2: 'Slow', a3: 'Medium' },
};

describe('ComparisonView', () => {
  it('renders multiple alternatives as columns', () => {
    render(<ComparisonView alternatives={alternatives} />);

    expect(screen.getByText('Option Alpha')).toBeInTheDocument();
    expect(screen.getByText('Option Beta')).toBeInTheDocument();
    expect(screen.getByText('Option Gamma')).toBeInTheDocument();
  });

  it('shows comparison data in rows when provided', () => {
    render(<ComparisonView alternatives={alternatives} comparisonData={comparisonData} />);

    // Dimension labels
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Speed')).toBeInTheDocument();

    // Values (Medium appears in both Cost/a2 and Speed/a3)
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getAllByText('Medium')).toHaveLength(2);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
  });

  it('falls back to description/tradeoffs view when no comparisonData', () => {
    render(<ComparisonView alternatives={alternatives} />);

    expect(screen.getByText('Alpha description')).toBeInTheDocument();
    expect(screen.getByText('Beta description')).toBeInTheDocument();
    expect(screen.getByText('Gamma description')).toBeInTheDocument();
    expect(screen.getByText('Alpha tradeoffs')).toBeInTheDocument();
    expect(screen.getByText('Beta tradeoffs')).toBeInTheDocument();
  });

  it('shows em dash for missing tradeoffs in fallback view', () => {
    render(<ComparisonView alternatives={alternatives} />);

    // Gamma has no tradeoffs, should show em dash
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('has correct grid role structure', () => {
    render(<ComparisonView alternatives={alternatives} comparisonData={comparisonData} />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
  });

  it('shows Dimension header when comparisonData is provided', () => {
    render(<ComparisonView alternatives={alternatives} comparisonData={comparisonData} />);

    expect(screen.getByText('Dimension')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ComparisonView alternatives={alternatives} className="my-grid" />,
    );
    expect(container.firstChild).toHaveClass('my-grid');
  });

  it('shows em dash for missing comparison values', () => {
    const partialData: Record<string, Record<string, string>> = {
      Cost: { a1: 'Low' },
    };
    render(<ComparisonView alternatives={alternatives} comparisonData={partialData} />);

    // a2 and a3 missing from Cost -> should show em dashes
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
