import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from './dependency-graph.js';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it('adds and retrieves direct dependencies', () => {
    graph.addDependency('A', 'B');
    graph.addDependency('A', 'C');

    expect(graph.getDownstream('A')).toContain('B');
    expect(graph.getDownstream('A')).toContain('C');
    expect(graph.getUpstream('B')).toContain('A');
    expect(graph.getUpstream('C')).toContain('A');
  });

  it('removes a dependency', () => {
    graph.addDependency('A', 'B');
    graph.removeDependency('A', 'B');

    expect(graph.getDownstream('A')).toHaveLength(0);
    expect(graph.getUpstream('B')).toHaveLength(0);
  });

  it('computes transitive dependents', () => {
    graph.addDependency('A', 'B');
    graph.addDependency('B', 'C');
    graph.addDependency('B', 'D');
    graph.addDependency('C', 'E');

    const deps = graph.getTransitiveDependents('A');
    expect(deps).toContain('B');
    expect(deps).toContain('C');
    expect(deps).toContain('D');
    expect(deps).toContain('E');
    expect(deps).toHaveLength(4);
  });

  it('returns empty for node with no dependents', () => {
    graph.addDependency('A', 'B');
    expect(graph.getTransitiveDependents('B')).toHaveLength(0);
  });

  it('returns empty for unknown node', () => {
    expect(graph.getDownstream('unknown')).toHaveLength(0);
    expect(graph.getUpstream('unknown')).toHaveLength(0);
  });

  describe('cycle detection', () => {
    it('detects self-cycle', () => {
      expect(graph.wouldCreateCycle('A', 'A')).toBe(true);
    });

    it('detects simple cycle', () => {
      graph.addDependency('A', 'B');
      expect(graph.wouldCreateCycle('B', 'A')).toBe(true);
    });

    it('detects transitive cycle', () => {
      graph.addDependency('A', 'B');
      graph.addDependency('B', 'C');
      expect(graph.wouldCreateCycle('C', 'A')).toBe(true);
    });

    it('does not flag non-cycles', () => {
      graph.addDependency('A', 'B');
      expect(graph.wouldCreateCycle('A', 'C')).toBe(false);
    });
  });

  it('removes a point and all its edges', () => {
    graph.addDependency('A', 'B');
    graph.addDependency('B', 'C');
    graph.removePoint('B');

    expect(graph.getDownstream('A')).toHaveLength(0);
    expect(graph.getUpstream('C')).toHaveLength(0);
    expect(graph.getDownstream('B')).toHaveLength(0);
  });
});
