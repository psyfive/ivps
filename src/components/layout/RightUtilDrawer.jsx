import { RightUtilPanel } from './RightUtilPanel';

// 항상 DOM에 마운트 유지 (CSS translate로 숨김) → 오디오 컨텍스트 보존
export function RightUtilDrawer({ open, onClose }) {
  return (
    <>
      {/* 딤 오버레이 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.52)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 280ms ease',
        }}
      />

      {/* 드로어 패널 — 항상 마운트, translate로만 숨김 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <RightUtilPanel />
      </div>
    </>
  );
}
