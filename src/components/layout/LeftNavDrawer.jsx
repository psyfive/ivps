import { LeftNav } from './LeftNav';

export function LeftNavDrawer({ open, onClose }) {
  return (
    <>
      {/* 딤 오버레이 — 클릭 시 드로어 닫기 */}
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

      {/* 드로어 패널 — 항상 DOM에 유지, CSS translate로 슬라이드 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <LeftNav onClose={onClose} />
      </div>
    </>
  );
}
