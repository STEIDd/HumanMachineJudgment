import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResolutionForm } from './ResolutionForm';

const mockAlternatives = [
  { id: 'alt-1', label: 'Option A', description: 'First option' },
  { id: 'alt-2', label: 'Option B', description: 'Second option' },
];

describe('ResolutionForm', () => {
  it('renders radio buttons for alternatives', () => {
    render(
      <ResolutionForm alternatives={mockAlternatives} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('enables submit when required fields filled', () => {
    render(
      <ResolutionForm alternatives={mockAlternatives} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    const submitBtn = screen.getByText('Submit');
    expect(submitBtn).toBeDisabled();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.change(screen.getByPlaceholderText(/Explain the reasoning/), {
      target: { value: 'This is a valid rationale for selection' },
    });
    expect(submitBtn).not.toBeDisabled();
  });

  it('shows confirmation step before submission', () => {
    render(
      <ResolutionForm alternatives={mockAlternatives} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.change(screen.getByPlaceholderText(/Explain the reasoning/), {
      target: { value: 'This is a valid rationale for selection' },
    });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Confirm Resolution')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data', () => {
    const onSubmit = vi.fn();
    render(
      <ResolutionForm alternatives={mockAlternatives} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.change(screen.getByPlaceholderText(/Explain the reasoning/), {
      target: { value: 'This is a valid rationale for selection' },
    });
    fireEvent.click(screen.getByText('Submit'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(onSubmit).toHaveBeenCalledWith({
      selectedAlternativeId: 'alt-1',
      rationale: 'This is a valid rationale for selection',
      conditions: undefined,
      validationRequirements: undefined,
    });
  });

  it('calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ResolutionForm alternatives={mockAlternatives} onSubmit={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
