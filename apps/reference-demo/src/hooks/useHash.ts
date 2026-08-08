import { useState, useEffect, useCallback } from 'react';

/**
 * Simple hash-based routing hook. Tracks `window.location.hash` and
 * re-renders on every `hashchange` event.
 */
export function useHash(): [string, (hash: string) => void] {
  const [hash, setHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((newHash: string) => {
    window.location.hash = newHash;
  }, []);

  return [hash, navigate];
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

interface RouteDefinition {
  pattern: string;
  paramNames: string[];
  regex: RegExp;
}

const ROUTE_DEFINITIONS: RouteDefinition[] = [
  defineRoute('/project/:id/point/:pointId'),
  defineRoute('/project/:id'),
  defineRoute('/policies/:projectId'),
  defineRoute('/thermal-model'),
  defineRoute('/components'),
  defineRoute('/'),
];

function defineRoute(pattern: string): RouteDefinition {
  const paramNames: string[] = [];
  const regexSource = pattern.replace(/:([^/]+)/g, (_match, paramName: string) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  return {
    pattern,
    paramNames,
    regex: new RegExp(`^${regexSource}$`),
  };
}

export interface ParsedRoute {
  path: string;
  params: Record<string, string>;
}

/**
 * Parse a hash string (e.g. `#/project/test123/point/abc`) into a
 * route path pattern and extracted parameters.
 */
export function parseRoute(hash: string): ParsedRoute {
  // Strip leading '#'
  const pathname = hash.startsWith('#') ? hash.slice(1) : hash;
  // Normalise: ensure leading slash, strip trailing slash (unless root)
  const normalised = pathname === '' ? '/' : pathname.replace(/\/$/, '') || '/';

  for (const route of ROUTE_DEFINITIONS) {
    const match = normalised.match(route.regex);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, index) => {
        const value = match[index + 1];
        if (value !== undefined) {
          params[name] = value;
        }
      });
      return { path: route.pattern, params };
    }
  }

  // Fallback: no match -> return the raw path with empty params
  return { path: normalised, params: {} };
}
