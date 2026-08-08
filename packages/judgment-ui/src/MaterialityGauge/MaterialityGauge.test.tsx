import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialityGauge } from './MaterialityGauge';

const defaultDimensions = {
  methodologicalDiscretion: 2,
  downstreamInfluence: 3,
  uncertainty: 1,
  consequence: 2,
  reversibility: 1,
  accountabilityRequirement: 3,
};

describe('MaterialityGauge', () => {
  it('renders score display', () => {
    render(<MaterialityGauge score={12} dimensions={defaultDimensions} />);
    expect(screen.getByText('12/18')).toBeInTheDocument();
  });

  it('renders all dimension labels', () => {
    render(<MaterialityGauge score={12} dimensions={defaultDimensions} />);
    expect(screen.getByText('Methodological Discretion')).toBeInTheDocument();
    expect(screen.getByText('Downstream Influence')).toBeInTheDocument();
    expect(screen.getByText('Uncertainty')).toBeInTheDocument();
    expect(screen.getByText('Consequence')).toBeInTheDocument();
    expect(screen.getByText('Reversibility')).toBeInTheDocument();
    expect(screen.getByText('Accountability Requirement')).toBeInTheDocument();
  });

  it('renders intervention level when provided', () => {
    render(
      <MaterialityGauge score={12} dimensions={defaultDimensions} interventionLevel="pause" />,
    );
    expect(screen.getByText('Intervention: pause')).toBeInTheDocument();
  });

  it('renders hard trigger when provided', () => {
    render(
      <MaterialityGauge score={12} dimensions={defaultDimensions} hardTrigger="safety-critical" />,
    );
    expect(screen.getByText('Hard Trigger: safety-critical')).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<MaterialityGauge score={12} dimensions={defaultDimensions} />);
    expect(screen.getByLabelText('Materiality score: 12 out of 18')).toBeInTheDocument();
  });

  it('renders detector confidence when provided', () => {
    render(
      <MaterialityGauge score={12} dimensions={defaultDimensions} detectorConfidence={0.87} />,
    );
    expect(screen.getByText('Detector Confidence: 87%')).toBeInTheDocument();
  });

  it('does not render detector confidence when not provided', () => {
    const { container } = render(<MaterialityGauge score={12} dimensions={defaultDimensions} />);
    expect(container.textContent).not.toContain('Detector Confidence');
  });

  it('does not render hard trigger when not provided', () => {
    const { container } = render(<MaterialityGauge score={12} dimensions={defaultDimensions} />);
    expect(container.textContent).not.toContain('Hard Trigger');
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <MaterialityGauge score={12} dimensions={defaultDimensions} className="custom-class" />,
    );
    const gauge = container.firstChild as HTMLElement;
    expect(gauge.className).toContain('custom-class');
  });
});
