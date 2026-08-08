import React from 'react';
import styles from './ProjectJudgmentsView.module.css';
import { JudgmentCard } from '../JudgmentCard';

interface JudgmentCardData {
  id: string;
  status: string;
  category: string;
  question: string;
  materiality: { score: number; interventionLevel?: string };
  authority?: { mode: string };
  resolution?: { selectedAlternativeId: string; rationale: string };
  updatedAt: string;
}

export interface ProjectJudgmentsViewProps {
  judgmentPoints: JudgmentCardData[];
  filters?: {
    status?: string[];
    category?: string[];
    interventionLevel?: string[];
    materialityRange?: [number, number];
  };
  onFiltersChange?: (filters: ProjectJudgmentsViewProps['filters']) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSelect?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  'candidate',
  'pending',
  'investigating',
  'resolved',
  'delegated',
  'stale',
  'reopened',
  'dismissed',
];
const CATEGORY_OPTIONS = [
  'assumption',
  'method',
  'framing',
  'parameter',
  'boundary',
  'validation',
  'interpretation',
  'scope',
];
const INTERVENTION_OPTIONS = ['trace', 'disclose', 'pause', 'require-investigation'];
const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Updated' },
  { value: 'materiality', label: 'Materiality' },
  { value: 'status', label: 'Status' },
  { value: 'category', label: 'Category' },
];

export const ProjectJudgmentsView: React.FC<ProjectJudgmentsViewProps> = ({
  judgmentPoints,
  filters,
  onFiltersChange,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  onSortChange,
  totalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
  onSelect,
  onAction,
  className,
}) => {
  const classNames = [styles['view'], className].filter(Boolean).join(' ');
  const total = totalCount ?? judgmentPoints.length;
  const totalPages = Math.ceil(total / pageSize);

  const handleFilterToggle = (type: 'status' | 'category' | 'interventionLevel', value: string) => {
    if (!onFiltersChange) return;
    const current = filters?.[type] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [type]: updated.length > 0 ? updated : undefined });
  };

  if (judgmentPoints.length === 0) {
    return (
      <div className={classNames}>
        <div className={styles['emptyState']} data-testid="empty-state">
          <h3 className={styles['emptyHeading']}>No Judgment Points have been created yet.</h3>
          <p className={styles['emptyText']}>
            Judgment points will appear here as they are detected during agent workflows. Each point
            represents a decision requiring human judgment or review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames}>
      {/* Filter Bar */}
      <div className={styles['filterBar']} data-testid="filter-bar">
        <div className={styles['filterGroup']}>
          <label className={styles['filterLabel']}>Status</label>
          <div className={styles['filterOptions']}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={[
                  styles['filterChip'],
                  (filters?.status || []).includes(s) ? styles['filterChipActive'] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleFilterToggle('status', s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className={styles['filterGroup']}>
          <label className={styles['filterLabel']}>Category</label>
          <div className={styles['filterOptions']}>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={[
                  styles['filterChip'],
                  (filters?.category || []).includes(c) ? styles['filterChipActive'] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleFilterToggle('category', c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className={styles['filterGroup']}>
          <label className={styles['filterLabel']}>Intervention Level</label>
          <div className={styles['filterOptions']}>
            {INTERVENTION_OPTIONS.map((il) => (
              <button
                key={il}
                type="button"
                className={[
                  styles['filterChip'],
                  (filters?.interventionLevel || []).includes(il) ? styles['filterChipActive'] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleFilterToggle('interventionLevel', il)}
              >
                {il}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className={styles['sortBar']} data-testid="sort-controls">
        <label htmlFor="sort-select" className={styles['sortLabel']}>
          Sort by
        </label>
        <select
          id="sort-select"
          className={styles['sortSelect']}
          value={sortBy}
          onChange={(e) => onSortChange?.(e.target.value, sortOrder)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles['sortOrderButton']}
          onClick={() => onSortChange?.(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort order: ${sortOrder}`}
        >
          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Card List */}
      <div className={styles['cardList']}>
        {judgmentPoints.map((jp) => (
          <JudgmentCard
            key={jp.id}
            judgmentPoint={jp}
            onSelect={onSelect}
            onAction={onAction ? (id, action) => onAction(id, action) : undefined}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className={styles['pagination']} data-testid="pagination">
        <button
          type="button"
          className={styles['pageButton']}
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          Previous
        </button>
        <span className={styles['pageIndicator']}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={styles['pageButton']}
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
