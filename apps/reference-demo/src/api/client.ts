/**
 * Typed fetch wrapper for the Judgment Points reference server API.
 *
 * Covers all 19 backend endpoints (health, judgment-point CRUD, lifecycle
 * transitions, sub-resources, events, and policies).
 */

import type {
  AddAlternativeRequest,
  AddArtifactRequest,
  CreateCandidateRequest,
  DelegateRequest,
  DismissRequest,
  InvestigateRequest,
  JudgmentEventResponse,
  JudgmentPointResponse,
  ListParams,
  MarkStaleRequest,
  PaginatedResult,
  PaginationParams,
  PolicyRequest,
  PolicyResponse,
  PromoteRequest,
  ReopenRequest,
  ResolveRequest,
} from './types';

// ---------------------------------------------------------------------------
// Base URL from environment (Vite injects VITE_* vars at build time)
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Query-string helpers
// ---------------------------------------------------------------------------

function buildQueryString(params: Record<string, string | string[] | number | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class JudgmentApiClient {
  private apiBase: string;

  constructor(baseUrl: string = BASE_URL as string) {
    // Strip trailing slash to avoid double-slash in paths
    this.apiBase = `${baseUrl.replace(/\/+$/, '')}/api/v1`;
  }

  /**
   * Generic request helper.  Sends JSON, reads JSON, throws `ApiError` on
   * non-2xx responses.
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    return res.json() as Promise<T>;
  }

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  async health(): Promise<{ status: string }> {
    // Health endpoint has no /api/v1 prefix
    const baseUrl = this.apiBase.replace(/\/api\/v1$/, '');
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    return res.json() as Promise<{ status: string }>;
  }

  // -----------------------------------------------------------------------
  // Judgment Points CRUD
  // -----------------------------------------------------------------------

  async createCandidate(
    projectId: string,
    data: CreateCandidateRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  async listJudgmentPoints(
    projectId: string,
    params?: ListParams,
  ): Promise<PaginatedResult<JudgmentPointResponse>> {
    const qs = buildQueryString({
      status: params?.status,
      category: params?.category,
      offset: params?.offset,
      limit: params?.limit,
    });
    return this.request<PaginatedResult<JudgmentPointResponse>>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points${qs}`,
    );
  }

  async getJudgmentPoint(projectId: string, id: string): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}`,
    );
  }

  // -----------------------------------------------------------------------
  // Lifecycle transitions (all PATCH)
  // -----------------------------------------------------------------------

  async promote(
    projectId: string,
    id: string,
    data: PromoteRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/promote`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async investigate(
    projectId: string,
    id: string,
    data: InvestigateRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/investigate`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async resolve(
    projectId: string,
    id: string,
    data: ResolveRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/resolve`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async delegate(
    projectId: string,
    id: string,
    data: DelegateRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/delegate`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async dismiss(
    projectId: string,
    id: string,
    data: DismissRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/dismiss`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async reopen(projectId: string, id: string, data: ReopenRequest): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/reopen`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async markStale(
    projectId: string,
    id: string,
    data: MarkStaleRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(id)}/mark-stale`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  // -----------------------------------------------------------------------
  // Sub-resources
  // -----------------------------------------------------------------------

  async addAlternative(
    projectId: string,
    pointId: string,
    data: AddAlternativeRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(pointId)}/alternatives`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  async addArtifact(
    projectId: string,
    pointId: string,
    data: AddArtifactRequest,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(pointId)}/artifacts`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  async removeArtifact(
    projectId: string,
    pointId: string,
    artifactId: string,
  ): Promise<JudgmentPointResponse> {
    return this.request<JudgmentPointResponse>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(pointId)}/artifacts/${encodeURIComponent(artifactId)}`,
      { method: 'DELETE' },
    );
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  async getPointEvents(projectId: string, pointId: string): Promise<JudgmentEventResponse[]> {
    return this.request<JudgmentEventResponse[]>(
      `/projects/${encodeURIComponent(projectId)}/judgment-points/${encodeURIComponent(pointId)}/events`,
    );
  }

  async getProjectEvents(
    projectId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<JudgmentEventResponse>> {
    const qs = buildQueryString({
      offset: params?.offset,
      limit: params?.limit,
    });
    return this.request<PaginatedResult<JudgmentEventResponse>>(
      `/projects/${encodeURIComponent(projectId)}/events${qs}`,
    );
  }

  // -----------------------------------------------------------------------
  // Policies
  // -----------------------------------------------------------------------

  async createPolicy(projectId: string, data: PolicyRequest): Promise<PolicyResponse> {
    return this.request<PolicyResponse>(`/projects/${encodeURIComponent(projectId)}/policies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPolicies(projectId: string): Promise<PolicyResponse[]> {
    return this.request<PolicyResponse[]>(`/projects/${encodeURIComponent(projectId)}/policies`);
  }

  async getPolicy(projectId: string, policyId: string): Promise<PolicyResponse> {
    return this.request<PolicyResponse>(
      `/projects/${encodeURIComponent(projectId)}/policies/${encodeURIComponent(policyId)}`,
    );
  }

  async updatePolicy(
    projectId: string,
    policyId: string,
    data: PolicyRequest,
  ): Promise<PolicyResponse> {
    return this.request<PolicyResponse>(
      `/projects/${encodeURIComponent(projectId)}/policies/${encodeURIComponent(policyId)}`,
      { method: 'PUT', body: JSON.stringify(data) },
    );
  }
}
