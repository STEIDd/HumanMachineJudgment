import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlternativeCard } from './AlternativeCard';

describe('AlternativeCard', () => {
  it('renders label and description', () => {
    render(<AlternativeCard id="alt-1" label="Option A" description="First option description" />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('First option description')).toBeInTheDocument();
  });

  it('shows selected badge when isSelected', () => {
    render(<AlternativeCard id="alt-1" label="Option A" description="Desc" isSelected />);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('renders tradeoffs when provided', () => {
    render(
      <AlternativeCard id="alt-1" label="Option A" description="Desc" tradeoffs="Some tradeoffs" />,
    );
    expect(screen.getByText(/Some tradeoffs/)).toBeInTheDocument();
  });

  it('renders source when provided', () => {
    render(
      <AlternativeCard id="alt-1" label="Option A" description="Desc" source="Expert review" />,
    );
    expect(screen.getByText(/Expert review/)).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<AlternativeCard id="alt-1" label="Option A" description="Desc" />);
    expect(screen.getByLabelText('Alternative: Option A')).toBeInTheDocument();
  });
});
