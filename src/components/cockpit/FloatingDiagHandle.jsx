// src/components/cockpit/FloatingDiagHandle.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During 전체화면 모드에서 악보 우측 하단에 띄워두는 진단 핸들 아이콘.
// 터치 시 AfterBottomSheet를 열어줌. 애니메이션 없음(연습 집중 방해 방지).
// ─────────────────────────────────────────────────────────────────────────────

export function FloatingDiagHandle({ onClick, skillLabel }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.96]"
      style={{
        background: 'rgba(155,127,200,0.16)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(155,127,200,0.36)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
      }}
      aria-label="진단/처방 보기"
    >
      <span className="text-[15px] leading-none">💊</span>
      {skillLabel && (
        <span
          className="text-[10px] font-mono font-semibold"
          style={{ color: 'rgba(155,127,200,0.85)' }}
        >
          {skillLabel}
        </span>
      )}
    </button>
  );
}
