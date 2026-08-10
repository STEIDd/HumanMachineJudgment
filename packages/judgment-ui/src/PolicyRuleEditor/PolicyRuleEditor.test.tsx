import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PolicyRuleEditor } from './PolicyRuleEditor';

const emptyRule = {
  condition: {},
};

describe('PolicyRuleEditor', () => {
  it('renders all form fields', () => {
    render(<PolicyRuleEditor rule={emptyRule} onChange={vi.fn()} />);
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Hard Triggers')).toBeInTheDocument();
    expect(screen.getByText('Intervention Level')).toBeInTheDocument();
    expect(screen.getByText('Authority Override')).toBeInTheDocument();
    expect(screen.getByLabelText('Min')).toBeInTheDocument();
    expect(screen.getByLabelText('Max')).toBeInTheDocument();
  });

  it('updates rule on category change', () => {
    const onChange = vi.fn();
    render(<PolicyRuleEditor rule={emptyRule} onChange={onChange} />);
    fireEvent.click(screen.getByText('method'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: expect.objectContaining({
          categories: ['method'],
        }),
      }),
    );
  });

  it('updates rule on materiality range change', () => {
    const onChange = vi.fn();
    render(<PolicyRuleEditor rule={emptyRule} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Min'), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: expect.objectContaining({
          materialityRange: expect.objectContaining({ min: 5 }),
        }),
      }),
    );
  });
});
