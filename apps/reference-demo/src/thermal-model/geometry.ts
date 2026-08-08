/**
 * Heat sink geometry definitions and helper functions.
 *
 * Default geometry represents a straight-fin aluminum heat sink with
 * realistic dimensions suitable for a 50W processor module.
 */

import type { HeatSinkGeometry } from './types';

/**
 * Compute fin spacing given the geometry.
 * spacing = (baseWidth - finCount * finThickness) / (finCount - 1)
 */
export function computeFinSpacing(geometry: HeatSinkGeometry): number {
  if (geometry.finCount <= 1) {
    return geometry.baseWidth - geometry.finCount * geometry.finThickness;
  }
  return (geometry.baseWidth - geometry.finCount * geometry.finThickness) / (geometry.finCount - 1);
}

/**
 * Compute the base plate area (top surface).
 */
export function computeBaseArea(geometry: HeatSinkGeometry): number {
  return geometry.baseWidth * geometry.baseLength;
}

/**
 * Compute the surface area of a single fin (both sides).
 * A_fin = 2 * finHeight * baseLength
 */
export function computeFinArea(geometry: HeatSinkGeometry): number {
  return 2 * geometry.finHeight * geometry.baseLength;
}

/**
 * Compute the total fin surface area for all fins.
 */
export function computeTotalFinArea(geometry: HeatSinkGeometry): number {
  return computeFinArea(geometry) * geometry.finCount;
}

/**
 * Compute the exposed (unfinned) base area between fins.
 * This is the base area not covered by fin roots.
 */
export function computeExposedBaseArea(geometry: HeatSinkGeometry): number {
  const totalFinRootArea = geometry.finCount * geometry.finThickness * geometry.baseLength;
  return computeBaseArea(geometry) - totalFinRootArea;
}

/**
 * Default heat sink geometry: straight-fin design, realistic dimensions.
 *
 * - 100mm x 100mm base
 * - 5mm base thickness
 * - 30mm fin height
 * - 2mm fin thickness
 * - 12 fins
 */
export const DEFAULT_HEAT_SINK: HeatSinkGeometry = {
  baseWidth: 0.1, // 100 mm
  baseLength: 0.1, // 100 mm
  baseThickness: 0.005, // 5 mm
  finHeight: 0.03, // 30 mm
  finThickness: 0.002, // 2 mm
  finCount: 12,
  finSpacing: 0, // placeholder, computed below
};

// Compute the actual fin spacing for the default geometry
DEFAULT_HEAT_SINK.finSpacing = computeFinSpacing(DEFAULT_HEAT_SINK);
