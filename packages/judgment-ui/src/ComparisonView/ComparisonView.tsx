import React, { useCallback, useRef } from 'react';
import styles from './ComparisonView.module.css';

export interface ComparisonAlternative {
  id: string;
  label: string;
  description: string;
  tradeoffs?: string;
}

export interface ComparisonViewProps {
  alternatives: ComparisonAlternative[];
  comparisonData?: Record<string, Record<string, string>>;
  className?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  alternatives,
  comparisonData,
  className,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const classNames = [styles['container'], className].filter(Boolean).join(' ');

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const cell = target.closest('[role="gridcell"], [role="columnheader"]') as HTMLElement | null;
    if (!cell) return;

    const row = cell.closest('[role="row"]') as HTMLElement | null;
    if (!row) return;

    const cells = Array.from(
      row.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]'),
    );
    const currentIndex = cells.indexOf(cell);
    const rows = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('[role="row"]') ?? []);
    const currentRowIndex = rows.indexOf(row);

    let nextCell: HTMLElement | null = null;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < cells.length - 1) {
          nextCell = cells[currentIndex + 1] ?? null;
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          nextCell = cells[currentIndex - 1] ?? null;
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentRowIndex < rows.length - 1) {
          const nextRow = rows[currentRowIndex + 1];
          if (nextRow) {
            const nextCells = Array.from(
              nextRow.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]'),
            );
            nextCell = nextCells[Math.min(currentIndex, nextCells.length - 1)] ?? null;
          }
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentRowIndex > 0) {
          const prevRow = rows[currentRowIndex - 1];
          if (prevRow) {
            const prevCells = Array.from(
              prevRow.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]'),
            );
            nextCell = prevCells[Math.min(currentIndex, prevCells.length - 1)] ?? null;
          }
        }
        break;
    }

    if (nextCell) {
      nextCell.focus();
    }
  }, []);

  const dimensions = comparisonData ? Object.keys(comparisonData) : null;
  const hasComparison = dimensions && dimensions.length > 0;

  return (
    <div
      className={classNames}
      role="grid"
      aria-label="Comparison of alternatives"
      ref={gridRef}
      onKeyDown={handleKeyDown}
    >
      {/* Header row */}
      <div className={styles['row']} role="row">
        {hasComparison && (
          <div className={styles['dimensionHeader']} role="columnheader" tabIndex={0}>
            Dimension
          </div>
        )}
        {alternatives.map((alt) => (
          <div key={alt.id} className={styles['columnHeader']} role="columnheader" tabIndex={0}>
            {alt.label}
          </div>
        ))}
      </div>

      {hasComparison ? (
        /* Structured comparison rows */
        dimensions.map((dimension) => (
          <div key={dimension} className={styles['row']} role="row">
            <div className={styles['dimensionCell']} role="gridcell" tabIndex={0}>
              {dimension}
            </div>
            {alternatives.map((alt) => (
              <div key={alt.id} className={styles['cell']} role="gridcell" tabIndex={0}>
                {comparisonData?.[dimension]?.[alt.id] ?? '\u2014'}
              </div>
            ))}
          </div>
        ))
      ) : (
        /* Fallback: description and tradeoffs rows */
        <>
          <div className={styles['row']} role="row">
            {alternatives.map((alt) => (
              <div key={alt.id} className={styles['cell']} role="gridcell" tabIndex={0}>
                <div className={styles['cellLabel']}>Description</div>
                <div className={styles['cellContent']}>{alt.description}</div>
              </div>
            ))}
          </div>
          <div className={styles['row']} role="row">
            {alternatives.map((alt) => (
              <div key={alt.id} className={styles['cell']} role="gridcell" tabIndex={0}>
                <div className={styles['cellLabel']}>Tradeoffs</div>
                <div className={styles['cellContent']}>{alt.tradeoffs ?? '\u2014'}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
