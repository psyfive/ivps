// src/components/layout/ThemeToggle.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 화면 좌측 하단 고정 위치의 라이트/다크 모드 전환 버튼.
// 비즈니스 로직과 완전히 분리된 순수 UI 컴포넌트.
// ─────────────────────────────────────────────────────────────────────────────
import { useThemeContext } from '../../context/ThemeContext';

// ── 아이콘 SVG ─────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeToggle
// ─────────────────────────────────────────────────────────────────────────────
export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      className="ivps-theme-toggle"
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드' : '다크 모드'}
    >
      {/* 현재 모드 아이콘 */}
      <span
        className="ivps-theme-toggle-icon"
        style={{ color: isDark ? 'var(--ivps-gold)' : 'var(--ivps-amber)' }}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>

      {/* 토글 트랙 */}
      <div className="ivps-theme-toggle-track" aria-hidden="true">
        <div className="ivps-theme-toggle-knob" />
      </div>

      {/* 레이블 */}
      <span className="ivps-theme-toggle-label">
        {isDark ? 'LIGHT' : 'DARK'}
      </span>
    </button>
  );
}
