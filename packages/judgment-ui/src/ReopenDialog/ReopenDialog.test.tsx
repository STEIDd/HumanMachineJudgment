import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReopenDialog } from './ReopenDialog';

describe('ReopenDialog', () => {
  it('renders question', () => {
    render(
      <ReopenDialog
        pointId="jp-1"
        question="Test question?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Test question?')).toBeInTheDocument();
  });

  it('requires reason text', () => {
    render(<ReopenDialog pointId="jp-1" question="Test?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Reopen')).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Explain why/), {
      target: { value: 'New data available' },
    });
    expect(screen.getByText('Reopen')).not.toBeDisabled();
  });

  it('calls onConfirm with reason', () => {
    const onConfirm = vi.fn();
    render(
      <ReopenDialog pointId="jp-1" question="Test?" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Explain why/), {
      target: { value: 'New data available' },
    });
    fireEvent.click(screen.getByText('Reopen'));
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'New data available' });
  });
});
