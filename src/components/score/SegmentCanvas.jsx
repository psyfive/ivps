// src/components/score/SegmentCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Before Phase 시각적 구간 오버레이
//
// 크로스 페이지 구간 지원:
//   • 각 coordinates 항목에 pageIndex 포함
//   • currentPageIndex와 일치하는 rect만 렌더링/인터랙션
//   • 드래그 완료 시 pageIndex를 coordinates에 자동 포함
//   • 구간 설정 모드(isSelectingMode) 중 페이지 전환해도 tempSegments 유지
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback } from 'react';

const PALETTE = {
  unmapped: { fill: 'rgba(155,127,200,0.15)', stroke: '#9b7fc8', text: '#9b7fc8' },
  mapped:   { fill: 'rgba(126,168,144,0.22)', stroke: '#7ea890', text: '#7ea890' },
  selected: { fill: 'rgba(212,168,67,0.15)',  stroke: '#d4a843', text: '#d4a843' },
  pending:  { fill: 'rgba(155,127,200,0.07)', stroke: '#9b7fc8', text: '#9b7fc8' },
};

function segColor(seg, isSelected) {
  if (isSelected) return PALETTE.selected;
  return seg.mappedSkills.length > 0 ? PALETTE.mapped : PALETTE.unmapped;
}

function drawRect(ctx, px, py, pw, ph, col, dashed, lineWidth) {
  ctx.fillStyle = col.fill;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = col.stroke;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.strokeRect(px, py, pw, ph);
  ctx.setLineDash([]);
}

// ─────────────────────────────────────────────────────────────────────────────
export function SegmentCanvas({
  segments,          // Segment[]   확정 구간 (coordinates: [{pageIndex,x,y,w,h},...])
  tempSegments,      // TempSeg[]   미확정 버퍼 (coordinates: {pageIndex,x,y,w,h} 단일)
  isSelectingMode,   // bool
  selectedSegmentId, // string | null
  currentPageIndex,  // number — 현재 표시 중인 페이지
  onSegmentCreate,   // ({pageIndex,x,y,width,height}) => void
  onSegmentSelect,   // (id | null) => void
  onSegmentDelete,   // (id) => void — 구간 전체 삭제
  onTempDelete,      // (id) => void — 미확정 rect 개별 삭제
}) {
  const containerRef    = useRef(null);
  const canvasRef       = useRef(null);

  const segmentsRef     = useRef(segments);
  const tempSegmentsRef = useRef(tempSegments);
  const isSelectingRef  = useRef(isSelectingMode);
  const selectedIdRef   = useRef(selectedSegmentId);
  const pageIdxRef      = useRef(currentPageIndex);
  const onCreateRef     = useRef(onSegmentCreate);
  const onSelectRef     = useRef(onSegmentSelect);
  const onDeleteRef     = useRef(onSegmentDelete);
  const onTempDelRef    = useRef(onTempDelete);

  useEffect(() => { segmentsRef.current     = segments; },        [segments]);
  useEffect(() => { tempSegmentsRef.current = tempSegments; },    [tempSegments]);
  useEffect(() => { isSelectingRef.current  = isSelectingMode; }, [isSelectingMode]);
  useEffect(() => { selectedIdRef.current   = selectedSegmentId; },[selectedSegmentId]);
  useEffect(() => { pageIdxRef.current      = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { onCreateRef.current     = onSegmentCreate; },  [onSegmentCreate]);
  useEffect(() => { onSelectRef.current     = onSegmentSelect; },  [onSegmentSelect]);
  useEffect(() => { onDeleteRef.current     = onSegmentDelete; },  [onSegmentDelete]);
  useEffect(() => { onTempDelRef.current    = onTempDelete; },     [onTempDelete]);

  const dragRef = useRef(null);
  const rafRef  = useRef(null);

  // ── Canvas 크기 ──────────────────────────────────────────────────────────
  const applySize = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(width  * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const W    = canvas.width  / dpr;
    const H    = canvas.height / dpr;
    const ctx  = canvas.getContext('2d');
    const segs  = segmentsRef.current;
    const temps = tempSegmentsRef.current;
    const selId = selectedIdRef.current;
    const curPage = pageIdxRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── 확정된 구간 — 현재 페이지의 rect만 표시 ──
    segs.forEach((seg, globalIdx) => {
      const pageRects = seg.coordinates.filter(c => c.pageIndex === curPage);
      if (pageRects.length === 0) return;

      const col        = segColor(seg, seg.id === selId);
      const isSelected = seg.id === selId;

      pageRects.forEach(({ x, y, width: rw, height: rh }, rectIdx) => {
        const px = x * W, py = y * H, pw = rw * W, ph = rh * H;

        drawRect(ctx, px, py, pw, ph, col, false, isSelected ? 2.5 : 1.5);

        // 구간 번호 배지 (전역 인덱스 — 페이지가 달라도 일관된 번호)
        const BADGE_W = 36, BADGE_H = 17;
        ctx.fillStyle = 'rgba(13,17,23,0.65)';
        ctx.fillRect(px, py, BADGE_W, BADGE_H);
        ctx.fillStyle = col.text;
        ctx.font = 'bold 10px ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.textAlign    = 'left';
        ctx.fillText(`${globalIdx + 1}구간`, px + 4, py + 3);

        // 스킬 수 배지 — 첫 rect에만
        if (rectIdx === 0 && seg.mappedSkills.length > 0) {
          const label = `× ${seg.mappedSkills.length}스킬`;
          const BADGE_H2 = 17;
          ctx.fillStyle = 'rgba(13,17,23,0.55)';
          ctx.fillRect(px, py + ph - BADGE_H2, 52, BADGE_H2);
          ctx.fillStyle = col.text;
          ctx.font = '9px ui-monospace, monospace';
          ctx.textBaseline = 'bottom';
          ctx.fillText(label, px + 4, py + ph - 3);
        }

        // 삭제 × — 각 rect (클릭 시 구간 전체 삭제)
        const DX = px + pw - 18, DY = py + 1, DS = 17;
        ctx.fillStyle = 'rgba(224,112,112,0.75)';
        ctx.fillRect(DX, DY, DS, DS);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign    = 'center';
        ctx.fillText('×', DX + DS / 2, DY + DS / 2);
      });
    });

    // ── 미확정 구간 — 현재 페이지의 temp rect만 표시 ──
    temps.forEach((seg, globalIdx) => {
      if (seg.coordinates.pageIndex !== curPage) return;
      const { x, y, width: rw, height: rh } = seg.coordinates;
      const px = x * W, py = y * H, pw = rw * W, ph = rh * H;
      const col = PALETTE.pending;

      drawRect(ctx, px, py, pw, ph, col, true, 1.5);

      const BADGE_W = 42, BADGE_H = 17;
      ctx.fillStyle = 'rgba(13,17,23,0.55)';
      ctx.fillRect(px, py, BADGE_W, BADGE_H);
      ctx.fillStyle = col.text;
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'left';
      ctx.fillText(`대기 ${globalIdx + 1}`, px + 4, py + 3);

      const DX = px + pw - 18, DY = py + 1, DS = 17;
      ctx.fillStyle = 'rgba(155,127,200,0.55)';
      ctx.fillRect(DX, DY, DS, DS);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('×', DX + DS / 2, DY + DS / 2);
    });

    // ── 드래그 미리보기 ──
    const drag = dragRef.current;
    if (drag && isSelectingRef.current) {
      const x = Math.min(drag.startX, drag.currentX);
      const y = Math.min(drag.startY, drag.currentY);
      const w = Math.abs(drag.currentX - drag.startX);
      const h = Math.abs(drag.currentY - drag.startY);

      ctx.fillStyle = 'rgba(155,127,200,0.10)';
      ctx.fillRect(x * W, y * H, w * W, h * H);
      ctx.strokeStyle = '#9b7fc8';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x * W, y * H, w * W, h * H);
      ctx.setLineDash([]);

      if (w > 0.05 && h > 0.03) {
        const label = `${(w * 100).toFixed(0)}% × ${(h * 100).toFixed(0)}%`;
        const lx = x * W + 4, ly = (y + h) * H - 18;
        ctx.fillStyle = 'rgba(13,17,23,0.6)';
        ctx.fillRect(lx - 2, ly - 2, label.length * 6.2 + 6, 15);
        ctx.fillStyle = '#9b7fc8';
        ctx.font = '9px ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.textAlign    = 'left';
        ctx.fillText(label, lx, ly);
      }
    }

    ctx.restore();
  }, []);

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => { applySize(); draw(); });
    ro.observe(container);
    applySize();
    draw();
    return () => ro.disconnect();
  }, [applySize, draw]);

  useEffect(() => {
    draw();
  }, [segments, tempSegments, isSelectingMode, selectedSegmentId, currentPageIndex, draw]);

  // ── 좌표 유틸 ─────────────────────────────────────────────────────────────
  const toRel = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      rx: (clientX - rect.left) / rect.width,
      ry: (clientY - rect.top)  / rect.height,
    };
  };

  // × 히트 테스트 — 확정 구간 (현재 페이지 rect만 검사)
  const hitDeleteCommitted = (rx, ry, seg) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const px = rx * W, py = ry * H;
    const curPage = pageIdxRef.current;
    return seg.coordinates.some(({ pageIndex, x, y, width: rw, height: rh }) => {
      if (pageIndex !== curPage) return false;
      const DX = (x + rw) * W - 18, DY = y * H + 1, DS = 17;
      return px >= DX && px <= DX + DS && py >= DY && py <= DY + DS;
    });
  };

  // × 히트 테스트 — 미확정 구간 (단일 rect, 현재 페이지만)
  const hitDeleteTemp = (rx, ry, seg) => {
    if (seg.coordinates.pageIndex !== pageIdxRef.current) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const { x, y, width: rw, height: rh } = seg.coordinates;
    const DX = (x + rw) * W - 18, DY = y * H + 1, DS = 17;
    const px = rx * W, py = ry * H;
    return px >= DX && px <= DX + DS && py >= DY && py <= DY + DS;
  };

  // 바디 히트 테스트 — 확정 구간 (현재 페이지 rect만)
  const hitSegment = (rx, ry) => {
    const curPage = pageIdxRef.current;
    return segmentsRef.current.find(seg =>
      seg.coordinates.some(({ pageIndex, x, y, width: rw, height: rh }) =>
        pageIndex === curPage &&
        rx >= x && rx <= x + rw && ry >= y && ry <= y + rh
      )
    ) ?? null;
  };

  // ── Pointer Events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const { rx, ry } = toRel(e.clientX, e.clientY);

    for (const seg of tempSegmentsRef.current) {
      if (hitDeleteTemp(rx, ry, seg)) { onTempDelRef.current(seg.id); return; }
    }
    for (const seg of segmentsRef.current) {
      if (hitDeleteCommitted(rx, ry, seg)) { onDeleteRef.current(seg.id); return; }
    }

    if (!isSelectingRef.current) {
      onSelectRef.current(hitSegment(rx, ry)?.id ?? null);
      return;
    }

    dragRef.current = { startX: rx, startY: ry, currentX: rx, currentY: ry };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { rx, ry } = toRel(e.clientX, e.clientY);
    dragRef.current.currentX = Math.max(0, Math.min(1, rx));
    dragRef.current.currentY = Math.max(0, Math.min(1, ry));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    const x = Math.min(drag.startX, drag.currentX);
    const y = Math.min(drag.startY, drag.currentY);
    const w = Math.abs(drag.currentX - drag.startX);
    const h = Math.abs(drag.currentY - drag.startY);

    if (w > 0.03 && h > 0.02) {
      // pageIndex를 coordinates에 포함하여 크로스 페이지 구간 지원
      onCreateRef.current({ pageIndex: pageIdxRef.current, x, y, width: w, height: h });
    }
    draw();
  }, [draw]);

  const handlePointerCancel = useCallback(() => {
    dragRef.current = null;
    draw();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none',
          pointerEvents: 'auto',
          cursor: isSelectingMode ? 'crosshair' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}
