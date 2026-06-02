import { describe, it, expect } from 'vitest';
import { computeBreakpoints } from '../hooks/useBreakpoint';

describe('computeBreakpoints', () => {
  it('모바일 (< 768px): isMobileOnly=true, 나머지 false', () => {
    const bp = computeBreakpoints({ tablet: false, tabletLg: false, desktop: false });
    expect(bp.isMobileOnly).toBe(true);
    expect(bp.isTablet).toBe(false);
    expect(bp.isTabletOnly).toBe(false);
    expect(bp.isTabletLg).toBe(false);
    expect(bp.isTabletLgOnly).toBe(false);
    expect(bp.isDesktop).toBe(false);
  });

  it('태블릿 portrait (768–1023px): isTabletOnly=true', () => {
    const bp = computeBreakpoints({ tablet: true, tabletLg: false, desktop: false });
    expect(bp.isMobileOnly).toBe(false);
    expect(bp.isTablet).toBe(true);
    expect(bp.isTabletOnly).toBe(true);
    expect(bp.isTabletLg).toBe(false);
    expect(bp.isTabletLgOnly).toBe(false);
    expect(bp.isDesktop).toBe(false);
  });

  it('태블릿 landscape (1024–1279px): isTabletLgOnly=true', () => {
    const bp = computeBreakpoints({ tablet: true, tabletLg: true, desktop: false });
    expect(bp.isMobileOnly).toBe(false);
    expect(bp.isTablet).toBe(true);
    expect(bp.isTabletOnly).toBe(false);
    expect(bp.isTabletLg).toBe(true);
    expect(bp.isTabletLgOnly).toBe(true);
    expect(bp.isDesktop).toBe(false);
  });

  it('데스크탑 (>= 1280px): isDesktop=true', () => {
    const bp = computeBreakpoints({ tablet: true, tabletLg: true, desktop: true });
    expect(bp.isMobileOnly).toBe(false);
    expect(bp.isTablet).toBe(true);
    expect(bp.isTabletOnly).toBe(false);
    expect(bp.isTabletLg).toBe(true);
    expect(bp.isTabletLgOnly).toBe(false);
    expect(bp.isDesktop).toBe(true);
  });
});
