import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DelegationDialog } from './DelegationDialog';

describe('DelegationDialog', () => {
  it('renders question', () => {
    render(
      <DelegationDialog
        pointId="jp-1"
        question="Test question?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Test question?')).toBeInTheDocument();
  });

  it('shows delegation conditions', () => {
    render(
      <DelegationDialog
        pointId="jp-1"
        question="Test question?"
        delegationConditions={['Must have domain expertise', 'Must respond within 24h']}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Must have domain expertise')).toBeInTheDocument();
    expect(screen.getByText('Must respond within 24h')).toBeInTheDocument();
  });

  it('calls onConfirm with reason', () => {
    const onConfirm = vi.fn();
    render(
      <DelegationDialog pointId="jp-1" question="Test?" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Explain why/), {
      target: { value: 'Need expert input' },
    });
    fireEvent.click(screen.getByText('Delegate'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'Need expert input' });
  });

  it('closes on Escape', () => {
    const onCancel = vi.fn();
    render(
      <DelegationDialog pointId="jp-1" question="Test?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
