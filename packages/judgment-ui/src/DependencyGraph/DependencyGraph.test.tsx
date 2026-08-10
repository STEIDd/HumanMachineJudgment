import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';

const mockNodes = [
  { id: 'n1', label: 'Node 1', status: 'pending' },
  { id: 'n2', label: 'Node 2', status: 'resolved' },
  { id: 'n3', label: 'Node 3', status: 'investigating', isStale: true },
];

const mockEdges = [
  { from: 'n1', to: 'n2' },
  { from: 'n1', to: 'n3' },
];

describe('DependencyGraph', () => {
  it('renders SVG element', () => {
    const { container } = render(<DependencyGraph nodes={mockNodes} edges={mockEdges} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correct number of nodes', () => {
    render(<DependencyGraph nodes={mockNodes} edges={mockEdges} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders edges', () => {
    const { container } = render(<DependencyGraph nodes={mockNodes} edges={mockEdges} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('calls onNodeClick when node clicked', () => {
    const onClick = vi.fn();
    render(<DependencyGraph nodes={mockNodes} edges={mockEdges} onNodeClick={onClick} />);
    fireEvent.click(screen.getByLabelText(/Node: Node 1/));
    expect(onClick).toHaveBeenCalledWith('n1');
  });
});
