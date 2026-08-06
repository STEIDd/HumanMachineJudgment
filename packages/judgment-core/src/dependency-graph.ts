/**
 * In-memory dependency graph for tracking relationships between judgment points.
 *
 * An edge from A to B means "B depends on A" (A is upstream, B is downstream).
 * When A changes, B may become stale.
 */
export class DependencyGraph {
  /** Maps a point ID to the set of IDs that depend on it (downstream). */
  private readonly downstream = new Map<string, Set<string>>();
  /** Maps a point ID to the set of IDs it depends on (upstream). */
  private readonly upstream = new Map<string, Set<string>>();

  /**
   * Add a dependency edge: downstream depends on upstream.
   */
  addDependency(upstreamId: string, downstreamId: string): void {
    let downSet = this.downstream.get(upstreamId);
    if (downSet == null) {
      downSet = new Set();
      this.downstream.set(upstreamId, downSet);
    }
    downSet.add(downstreamId);

    let upSet = this.upstream.get(downstreamId);
    if (upSet == null) {
      upSet = new Set();
      this.upstream.set(downstreamId, upSet);
    }
    upSet.add(upstreamId);
  }

  /**
   * Remove a dependency edge.
   */
  removeDependency(upstreamId: string, downstreamId: string): void {
    this.downstream.get(upstreamId)?.delete(downstreamId);
    this.upstream.get(downstreamId)?.delete(upstreamId);
  }

  /**
   * Get the direct upstream dependencies of a point.
   */
  getUpstream(pointId: string): readonly string[] {
    return Array.from(this.upstream.get(pointId) ?? []);
  }

  /**
   * Get the direct downstream dependents of a point.
   */
  getDownstream(pointId: string): readonly string[] {
    return Array.from(this.downstream.get(pointId) ?? []);
  }

  /**
   * Get all transitive downstream dependents of a point (BFS).
   */
  getTransitiveDependents(pointId: string): readonly string[] {
    const visited = new Set<string>();
    const queue: string[] = [...(this.downstream.get(pointId) ?? [])];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current == null || visited.has(current)) continue;
      visited.add(current);

      for (const next of this.downstream.get(current) ?? []) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Check whether adding a dependency from upstream to downstream would create a cycle.
   */
  wouldCreateCycle(upstreamId: string, downstreamId: string): boolean {
    if (upstreamId === downstreamId) return true;

    // Would create cycle if downstreamId can transitively reach upstreamId.
    const visited = new Set<string>();
    const queue: string[] = [...(this.downstream.get(downstreamId) ?? [])];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current == null) continue;
      if (current === upstreamId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of this.downstream.get(current) ?? []) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }

    return false;
  }

  /**
   * Remove all edges associated with a point.
   */
  removePoint(pointId: string): void {
    // Remove from downstream neighbors' upstream sets.
    for (const downId of this.downstream.get(pointId) ?? []) {
      this.upstream.get(downId)?.delete(pointId);
    }
    // Remove from upstream neighbors' downstream sets.
    for (const upId of this.upstream.get(pointId) ?? []) {
      this.downstream.get(upId)?.delete(pointId);
    }
    this.downstream.delete(pointId);
    this.upstream.delete(pointId);
  }
}
