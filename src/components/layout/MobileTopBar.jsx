import { usePractice } from '../../context/PracticeContext';

export function MobileTopBar({ onNavOpen, onUtilOpen }) {
  const { screen } = usePractice();

  return (
    <header
      className="h-12 flex-shrink-0 flex items-center px-3 border-b"
      style={{ background: 'var(--ivps-nav)', borderColor: 'var(--ivps-border)', zIndex: 30 }}
    >
      {/* 햄버거 버튼 */}
      <button
        onClick={onNavOpen}
        aria-label="네비게이션 열기"
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--ivps-text2)' }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect width="18" height="2" rx="1" fill="currentColor" />
          <rect y="6" width="18" height="2" rx="1" fill="currentColor" />
          <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* 브랜드 */}
      <span className="flex-1 text-center font-serif text-[16px] font-bold" style={{ color: 'var(--ivps-text1)' }}>
        Opus
      </span>

      {/* 유틸리티 버튼 (Cockpit 화면에서만) */}
      {screen === 'cockpit' ? (
        <button
          onClick={onUtilOpen}
          aria-label="유틸리티 패널 열기"
          className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--ivps-text2)' }}
        >
          <span className="text-[18px] leading-none">🔊</span>
        </button>
      ) : (
        <div className="w-10" />
      )}
    </header>
  );
}
