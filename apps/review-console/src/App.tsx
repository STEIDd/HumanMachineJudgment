import { useCallback, useEffect, useState } from 'react';

interface JudgmentAlternative {
  id: string;
  label: string;
  description?: string;
}

interface JudgmentPoint {
  id: string;
  status: string;
  category: string;
  question: string;
  context?: string;
  alternatives?: JudgmentAlternative[];
  resolution?: {
    selectedAlternativeId: string;
    rationale: string;
    resolvedAt?: string;
    resolvedBy?: string;
  };
  materiality?: {
    score: number;
    interventionLevel?: string;
  };
  authority?: {
    mode: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface JudgmentEvent {
  id: string;
  eventType: string;
  timestamp: string;
  actorId: string;
  actorType: string;
}

const API_BASE = '/api/v1';

async function fetchPoints(projectId: string): Promise<JudgmentPoint[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/judgment-points`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function fetchEvents(projectId: string, pointId: string): Promise<JudgmentEvent[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/judgment-points/${pointId}/events`);
  if (!res.ok) return [];
  return await res.json();
}

async function patchAction(
  projectId: string,
  pointId: string,
  action: string,
  body: Record<string, unknown> = {},
): Promise<JudgmentPoint | null> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/judgment-points/${pointId}/${action}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return null;
  return await res.json();
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#111827',
  surface: '#1f2937',
  border: '#374151',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
} as const;

const STATUS_COLORS: Record<string, string> = {
  candidate: '#6b7280',
  pending: '#d97706',
  investigating: '#2563eb',
  delegated: '#7c3aed',
  resolved: '#059669',
  dismissed: '#9ca3af',
  stale: '#dc2626',
  reopened: '#ea580c',
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: STATUS_COLORS[status] || '#6b7280',
      }}
    >
      {status}
    </span>
  );
}

function PointRow({ point, onSelect }: { point: JudgmentPoint; onSelect: (id: string) => void }) {
  return (
    <tr
      onClick={() => onSelect(point.id)}
      style={{
        cursor: 'pointer',
        borderBottom: `1px solid ${COLORS.surface}`,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(point.id);
      }}
    >
      <td style={{ padding: '8px 12px' }}>
        <StatusBadge status={point.status} />
      </td>
      <td
        style={{
          padding: '8px 12px',
          color: COLORS.textSecondary,
          fontSize: '13px',
        }}
      >
        {point.category}
      </td>
      <td style={{ padding: '8px 12px' }}>{point.question}</td>
      <td
        style={{
          padding: '8px 12px',
          color: COLORS.textMuted,
          fontSize: '13px',
        }}
      >
        {point.materiality?.interventionLevel || '-'}
      </td>
      <td
        style={{
          padding: '8px 12px',
          color: COLORS.textMuted,
          fontSize: '13px',
        }}
      >
        {point.id.slice(0, 8)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Resolution form
// ---------------------------------------------------------------------------

function ResolveForm({
  alternatives,
  onSubmit,
  onCancel,
}: {
  alternatives: JudgmentAlternative[];
  onSubmit: (altId: string, rationale: string) => void;
  onCancel: () => void;
}) {
  const [selectedAlt, setSelectedAlt] = useState(alternatives[0]?.id || '');
  const [rationale, setRationale] = useState('');

  return (
    <div
      style={{
        padding: '16px',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '6px',
        marginTop: '12px',
      }}
    >
      <h4
        style={{
          margin: '0 0 12px',
          fontSize: '13px',
          color: COLORS.textSecondary,
        }}
      >
        Resolve Judgment Point
      </h4>
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: COLORS.textSecondary,
            marginBottom: '4px',
          }}
        >
          Selected alternative
        </label>
        <select
          value={selectedAlt}
          onChange={(e) => setSelectedAlt(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            color: COLORS.textPrimary,
            fontSize: '13px',
          }}
        >
          {alternatives.map((alt) => (
            <option key={alt.id} value={alt.id}>
              {alt.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: COLORS.textSecondary,
            marginBottom: '4px',
          }}
        >
          Rationale
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            color: COLORS.textPrimary,
            fontSize: '13px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          placeholder="Why is this the right choice?"
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onSubmit(selectedAlt, rationale)}
          disabled={!rationale.trim()}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: 'none',
            background: rationale.trim() ? '#059669' : COLORS.border,
            color: '#fff',
            fontSize: '13px',
            cursor: rationale.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Resolve
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: `1px solid ${COLORS.border}`,
            background: 'none',
            color: COLORS.textSecondary,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dismiss form
// ---------------------------------------------------------------------------

function DismissForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div
      style={{
        padding: '16px',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '6px',
        marginTop: '12px',
      }}
    >
      <h4
        style={{
          margin: '0 0 12px',
          fontSize: '13px',
          color: COLORS.textSecondary,
        }}
      >
        Dismiss Judgment Point
      </h4>
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: COLORS.textSecondary,
            marginBottom: '4px',
          }}
        >
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            color: COLORS.textPrimary,
            fontSize: '13px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          placeholder="Why is this not relevant?"
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onSubmit(reason)}
          disabled={!reason.trim()}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: 'none',
            background: reason.trim() ? '#dc2626' : COLORS.border,
            color: '#fff',
            fontSize: '13px',
            cursor: reason.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Dismiss
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: `1px solid ${COLORS.border}`,
            background: 'none',
            color: COLORS.textSecondary,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event timeline
// ---------------------------------------------------------------------------

function EventTimeline({ events }: { events: JudgmentEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div style={{ marginTop: '16px' }}>
      <h3
        style={{
          color: COLORS.textSecondary,
          fontSize: '13px',
          margin: '0 0 8px',
        }}
      >
        Timeline
      </h3>
      <div>
        {events.map((evt, i) => (
          <div
            key={evt.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '8px 0',
              borderLeft: `2px solid ${COLORS.border}`,
              paddingLeft: '12px',
              marginLeft: '4px',
              borderBottom: i < events.length - 1 ? 'none' : undefined,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: COLORS.textSecondary,
                marginTop: '4px',
                marginLeft: '-17px',
                flexShrink: 0,
              }}
            />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{evt.eventType}</span>
              <span
                style={{
                  color: COLORS.textMuted,
                  fontSize: '12px',
                  marginLeft: '8px',
                }}
              >
                by {evt.actorId}
              </span>
              <div
                style={{
                  color: COLORS.textMuted,
                  fontSize: '11px',
                  marginTop: '2px',
                }}
              >
                {new Date(evt.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Point detail
// ---------------------------------------------------------------------------

function PointDetail({
  point,
  projectId,
  onBack,
  onUpdate,
}: {
  point: JudgmentPoint;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}) {
  const [events, setEvents] = useState<JudgmentEvent[]>([]);
  const [showResolve, setShowResolve] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && point.id) {
      fetchEvents(projectId, point.id).then(setEvents);
    }
  }, [projectId, point.id]);

  const canResolve = ['investigating', 'delegated'].includes(point.status);
  const canDismiss = ['candidate', 'pending', 'investigating', 'reopened'].includes(point.status);
  const canReopen = ['resolved', 'dismissed', 'stale'].includes(point.status);
  const canPromote = point.status === 'candidate';
  const canInvestigate = ['pending', 'reopened'].includes(point.status);

  const handleAction = async (action: string, body: Record<string, unknown> = {}) => {
    setActionError(null);
    const result = await patchAction(projectId, point.id, action, body);
    if (result) {
      onUpdate();
    } else {
      setActionError(`Failed to ${action}`);
    }
  };

  const btnStyle = (color: string) => ({
    padding: '6px 14px',
    borderRadius: '4px',
    border: `1px solid ${color}`,
    background: 'none',
    color,
    fontSize: '13px',
    cursor: 'pointer' as const,
  });

  return (
    <div style={{ maxWidth: '700px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textSecondary,
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        Back
      </button>

      <h2 style={{ margin: '0 0 8px' }}>{point.question}</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <StatusBadge status={point.status} />
        <span style={{ color: COLORS.textSecondary }}>{point.category}</span>
        {point.authority && (
          <span style={{ color: COLORS.textMuted }}>{point.authority.mode} authority</span>
        )}
        <span style={{ color: COLORS.textMuted }}>ID: {point.id}</span>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {canPromote && (
          <button onClick={() => handleAction('promote')} style={btnStyle('#d97706')}>
            Promote
          </button>
        )}
        {canInvestigate && (
          <button onClick={() => handleAction('investigate')} style={btnStyle('#2563eb')}>
            Investigate
          </button>
        )}
        {canResolve && (
          <button
            onClick={() => {
              setShowResolve(true);
              setShowDismiss(false);
            }}
            style={btnStyle('#059669')}
          >
            Resolve
          </button>
        )}
        {canDismiss && (
          <button
            onClick={() => {
              setShowDismiss(true);
              setShowResolve(false);
            }}
            style={btnStyle('#dc2626')}
          >
            Dismiss
          </button>
        )}
        {canReopen && (
          <button
            onClick={() => handleAction('reopen', { reason: 'Reopened from console' })}
            style={btnStyle('#ea580c')}
          >
            Reopen
          </button>
        )}
      </div>

      {actionError && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px' }}>{actionError}</p>
      )}

      {/* Inline forms */}
      {showResolve && point.alternatives && (
        <ResolveForm
          alternatives={point.alternatives}
          onSubmit={(altId, rationale) => {
            handleAction('resolve', {
              selectedAlternativeId: altId,
              rationale,
            });
            setShowResolve(false);
          }}
          onCancel={() => setShowResolve(false)}
        />
      )}

      {showDismiss && (
        <DismissForm
          onSubmit={(reason) => {
            handleAction('dismiss', { reason });
            setShowDismiss(false);
          }}
          onCancel={() => setShowDismiss(false)}
        />
      )}

      {/* Context */}
      {point.context && (
        <div style={{ marginTop: '16px' }}>
          <h3
            style={{
              color: COLORS.textSecondary,
              fontSize: '13px',
              margin: '0 0 4px',
            }}
          >
            Context
          </h3>
          <p style={{ margin: 0, color: COLORS.textPrimary }}>{point.context}</p>
        </div>
      )}

      {/* Alternatives */}
      {point.alternatives && point.alternatives.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3
            style={{
              color: COLORS.textSecondary,
              fontSize: '13px',
              margin: '0 0 8px',
            }}
          >
            Alternatives
          </h3>
          {point.alternatives.map((alt) => {
            const isSelected = point.resolution?.selectedAlternativeId === alt.id;
            return (
              <div
                key={alt.id}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${isSelected ? '#059669' : COLORS.border}`,
                  borderRadius: '4px',
                  marginBottom: '4px',
                  backgroundColor: isSelected ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                }}
              >
                <strong>
                  {alt.label}
                  {isSelected && (
                    <span
                      style={{
                        color: '#059669',
                        fontWeight: 400,
                        marginLeft: '8px',
                        fontSize: '12px',
                      }}
                    >
                      selected
                    </span>
                  )}
                </strong>
                {alt.description && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: COLORS.textSecondary,
                      fontSize: '13px',
                    }}
                  >
                    {alt.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution */}
      {point.resolution && (
        <div style={{ marginTop: '16px' }}>
          <h3
            style={{
              color: COLORS.textSecondary,
              fontSize: '13px',
              margin: '0 0 4px',
            }}
          >
            Resolution
          </h3>
          <p style={{ margin: 0, color: COLORS.textPrimary }}>{point.resolution.rationale}</p>
          {point.resolution.resolvedBy && (
            <p
              style={{
                margin: '4px 0 0',
                color: COLORS.textMuted,
                fontSize: '12px',
              }}
            >
              Resolved by {point.resolution.resolvedBy}
              {point.resolution.resolvedAt &&
                ` at ${new Date(point.resolution.resolvedAt).toLocaleString()}`}
            </p>
          )}
        </div>
      )}

      {/* Materiality */}
      {point.materiality && (
        <div style={{ marginTop: '16px' }}>
          <h3
            style={{
              color: COLORS.textSecondary,
              fontSize: '13px',
              margin: '0 0 4px',
            }}
          >
            Materiality
          </h3>
          <p style={{ margin: 0 }}>
            Score: {point.materiality.score}
            {point.materiality.interventionLevel && ` (${point.materiality.interventionLevel})`}
          </p>
        </div>
      )}

      {/* Timeline */}
      <EventTimeline events={events} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const [points, setPoints] = useState<JudgmentPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((data) => {
        setProjectId(data.project_id || '');
      })
      .catch(() => {});
  }, []);

  const loadPoints = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const pts = await fetchPoints(projectId);
    setPoints(pts);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  const filteredPoints = filter === 'all' ? points : points.filter((p) => p.status === filter);

  const selectedPoint = points.find((p) => p.id === selectedId);

  const statusCounts: Record<string, number> = {};
  for (const p of points) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        color: COLORS.textPrimary,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '14px',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '12px 24px',
          borderBottom: `1px solid ${COLORS.surface}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>HMJ Review Console</h1>
        <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>
          {projectId ? `Project: ${projectId.slice(0, 8)}` : 'No project'}
        </span>
      </header>

      {/* Content */}
      <main style={{ padding: '24px' }}>
        {selectedPoint ? (
          <PointDetail
            point={selectedPoint}
            projectId={projectId}
            onBack={() => setSelectedId(null)}
            onUpdate={loadPoints}
          />
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '15px' }}>
                Judgment Points ({filteredPoints.length}
                {filter !== 'all' ? ` ${filter}` : ''})
              </h2>
              <button
                onClick={loadPoints}
                style={{
                  background: 'none',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textSecondary,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Refresh
              </button>
            </div>

            {/* Status filter bar */}
            {points.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${filter === 'all' ? COLORS.textSecondary : COLORS.border}`,
                    background: filter === 'all' ? COLORS.surface : 'none',
                    color: filter === 'all' ? COLORS.textPrimary : COLORS.textMuted,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  All ({points.length})
                </button>
                {Object.entries(statusCounts).map(([s, count]) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: '2px 10px',
                      borderRadius: '4px',
                      border: `1px solid ${filter === s ? STATUS_COLORS[s] || COLORS.textSecondary : COLORS.border}`,
                      background: filter === s ? COLORS.surface : 'none',
                      color:
                        filter === s ? STATUS_COLORS[s] || COLORS.textPrimary : COLORS.textMuted,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {s} ({count})
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p style={{ color: COLORS.textMuted }}>Loading...</p>
            ) : filteredPoints.length === 0 ? (
              <p
                style={{
                  color: COLORS.textMuted,
                  textAlign: 'center',
                  padding: '48px 0',
                }}
              >
                {points.length === 0 ? 'No judgment points.' : 'No matching judgment points.'}
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid ${COLORS.surface}`,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {['Status', 'Category', 'Question', 'Level', 'ID'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          color: COLORS.textSecondary,
                          fontWeight: 500,
                          fontSize: '12px',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPoints.map((p) => (
                    <PointRow key={p.id} point={p} onSelect={setSelectedId} />
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  );
}
