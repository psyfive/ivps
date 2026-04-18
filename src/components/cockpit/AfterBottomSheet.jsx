// src/components/cockpit/AfterBottomSheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During 전체화면 모드에서 하단에서 슬라이드 업하는 After 진단/처방 시트.
// 배경 아무 곳이나 터치 or 핸들 드래그 다운으로 닫힘.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef } from 'react';
import { DiagnosticContent } from '../phases/DiagnosticInterface';
import { usePractice } from '../../context/PracticeContext';

export function AfterBottomSheet({ isOpen, onClose }) {
  const { nav } = usePractice();
  const sheetRef = useRef(null);
  const dragRef = useRef({ startY: 0, dragging: false, currentDelta: 0 });

  // ── 핸들 드래그 다운으로 닫기 ────────────────────────────────────────────
  const onDragStart = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: y, dragging: true, currentDelta: 0 };
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onDragMove = (e) => {
    if (!dragRef.current.dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, y - dragRef.current.startY);
    dragRef.current.currentDelta = delta;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
  };

  const onDragEnd = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (dragRef.current.currentDelta > 80) onClose();
  };

  return (
    // absolute inset-0 → 부모 ScoreViewer 컨테이너(position:relative)를 꽉 채움
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      {/* ── 배경 딤 — 아무 곳 터치 시 즉시 닫힘 ── */}
      <div
        className="absolute inset-0"
        onClick={isOpen ? onClose : undefined}
        style={{
          background: 'rgba(0,0,0,0.15)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 250ms',
        }}
      />

      {/* ── Bottom Sheet ── */}
      <div
        ref={sheetRef}
        className="relative flex flex-col bg-[var(--ivps-surface)]"
        style={{
          maxHeight: '62vh',
          minHeight: '42vh',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: '1px solid var(--ivps-plum-border)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 드래그 핸들 바 (이 영역에서만 드래그 감지) ── */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-[var(--ivps-plum-border)]" />
        </div>

        {/* ── 헤더 ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2 border-b border-[var(--ivps-border)]">
          <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--ivps-plum)]">
            진단 · 처방
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); nav.enterLastAfter(); }}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border text-[11px] font-semibold transition-all"
              style={{
                background: 'rgba(224,112,112,.08)',
                borderColor: 'rgba(224,112,112,.25)',
                color: '#e07070',
              }}
              title="연습 종료 — 전체 리뷰로"
            >
              ⏹ 연습종료
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[17px] text-[var(--ivps-text4)] hover:bg-[var(--ivps-surface2)] transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── 스크롤 가능한 진단 컨텐츠 ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ overscrollBehaviorY: 'contain' }}
        >
          <DiagnosticContent />
        </div>
      </div>
    </div>
  );
}
