import { useState, useEffect } from 'react';

const QUERIES = {
  tablet: '(min-width: 768px)',
  tabletLg: '(min-width: 1024px)',
  desktop: '(min-width: 1280px)',
};

export function computeBreakpoints(matches) {
  return {
    isTablet: matches.tablet,
    isTabletLg: matches.tabletLg,
    isDesktop: matches.desktop,
    isMobileOnly: !matches.tablet,
    isTabletOnly: matches.tablet && !matches.tabletLg,
    isTabletLgOnly: matches.tabletLg && !matches.desktop,
  };
}

function readMatches() {
  if (typeof window === 'undefined') {
    return { tablet: false, tabletLg: false, desktop: false };
  }
  return {
    tablet: window.matchMedia(QUERIES.tablet).matches,
    tabletLg: window.matchMedia(QUERIES.tabletLg).matches,
    desktop: window.matchMedia(QUERIES.desktop).matches,
  };
}

export function useBreakpoint() {
  const [matches, setMatches] = useState(readMatches);

  useEffect(() => {
    const cleanups = Object.entries(QUERIES).map(([, query]) => {
      const mql = window.matchMedia(query);
      const handler = () => setMatches(readMatches());
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    });
    return () => cleanups.forEach(fn => fn());
  }, []);

  return computeBreakpoints(matches);
}
