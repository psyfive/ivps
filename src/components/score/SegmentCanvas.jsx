// src/components/score/SegmentCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Before Phase 시각적 구간 오버레이
//
// • Canvas 기반 렌더링 (window.devicePixelRatio 고해상도 대응)
// • Pointer Events API — 마우스/터치/펜 통합 (touch-action: none)
// • ResizeObserver — 컨테이너 리사이즈 시 자동 리드로잉
// • 드래그 중 실시간 점선 미리보기, 완료 시 tempSegments에 추가
// • 구간 클릭 → 선택 / 우상단 × 버튼 → 삭제
// • 확정 전(temp) 구간: 반투명 점선 / 확정 후 구간: 실선
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback } from 'react';

// ── 색상 팔레트 ───────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export function SegmentCanvas({
  segments,          // Segment[]  — 확정된 구간
  tempSegments,      // Segment[]  — 버퍼(미확정) 구간
  isSelectingMode,   // bool — 드래그로 구간 생성 활성
  selectedSegmentId, // string | null
  onSegmentCreate,   // (coordinates: {x,y,width,height}) => void — 드래그 완료
  onSegmentSelect,   // (id: string | null) => void — 확정 구간 클릭
  onSegmentDelete,   // (id: string) => void — 확정 구간 × 클릭
  onTempDelete,      // (id: string) => void — 미확정 구간 × 클릭
}) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  // prop → ref (ResizeObserver 콜백·Pointer 핸들러에서 최신값 참조)
  const segmentsRef        = useRef(segments);
  const tempSegmentsRef    = useRef(tempSegments);
  const isSelectingRef     = useRef(isSelectingMode);
  const selectedIdRef      = useRef(selectedSegmentId);
  const onCreateRef        = useRef(onSegmentCreate);
  const onSelectRef        = useRef(onSegmentSelect);
  const onDeleteRef        = useRef(onSegmentDelete);
  const onTempDeleteRef    = useRef(onTempDelete);

  useEffect(() => { segmentsRef.current     = segments; },        [segments]);
  useEffect(() => { tempSegmentsRef.current = tempSegments; },    [tempSegments]);
  useEffect(() => { isSelectingRef.current  = isSelectingMode; }, [isSelectingMode]);
  useEffect(() => { selectedIdRef.current   = selectedSegmentId; },[selectedSegmentId]);
  useEffect(() => { onCreateRef.current     = onSegmentCreate; },  [onSegmentCreate]);
  useEffect(() => { onSelectRef.current     = onSegmentSelect; },  [onSegmentSelect]);
  useEffect(() => { onDeleteRef.current     = onSegmentDelete; },  [onSegmentDelete]);
  useEffect(() => { onTempDeleteRef.current = onTempDelete; },     [onTempDelete]);

  // 드래그 상태 (ref → RAF 중 재렌더링 없이 접근)
  const dragRef = useRef(null); // {startX, startY, currentX, currentY} 0~1
  const rafRef  = useRef(null);

  // ── Canvas 크기 설정 ─────────────────────────────────────────────────────
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
    const segs = segmentsRef.current;
    const temps = tempSegmentsRef.current;
    const selId = selectedIdRef.current;
    const selecting = isSelectingRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── 확정된 구간 ──
    segs.forEach((seg, i) => {
      const { x, y, width: rw, height: rh } = seg.coordinates;
      const px = x * W, py = y * H, pw = rw * W, ph = rh * H;
      const col = segColor(seg, seg.id === selId);

      ctx.fillStyle = col.fill;
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = col.stroke;
      ctx.lineWidth   = seg.id === selId ? 2.5 : 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(px, py, pw, ph);

      // 구간 번호 배지 (좌상단)
      const BADGE_W = 36, BADGE_H = 17;
      ctx.fillStyle = 'rgba(13,17,23,0.65)';
      ctx.fillRect(px, py, BADGE_W, BADGE_H);
      ctx.fillStyle = col.text;
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'left';
      ctx.fillText(`${i + 1}구간`, px + 4, py + 3);

      // 매핑된 스킬 배지 (좌하단)
      if (seg.mappedSkills.length > 0) {
        const label = `× ${seg.mappedSkills.length}스킬`;
        ctx.fillStyle = 'rgba(13,17,23,0.55)';
        ctx.fillRect(px, py + ph - BADGE_H, 52, BADGE_H);
        ctx.fillStyle = col.text;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, px + 4, py + ph - 3);
      }

      // 삭제 핸들 × (우상단 17×17)
      const DX = px + pw - 18, DY = py + 1, DS = 17;
      ctx.fillStyle = 'rgba(224,112,112,0.75)';
      ctx.fillRect(DX, DY, DS, DS);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('×', DX + DS / 2, DY + DS / 2);
    });

    // ── 미확정(temp) 구간 ──
    temps.forEach((seg, i) => {
      const { x, y, width: rw, height: rh } = seg.coordinates;
      const px = x * W, py = y * H, pw = rw * W, ph = rh * H;
      const col = PALETTE.pending;

      ctx.fillStyle = col.fill;
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = col.stroke;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(px, py, pw, ph);
      ctx.setLineDash([]);

      // "대기" 배지 (좌상단)
      const BADGE_W = 42, BADGE_H = 17;
      ctx.fillStyle = 'rgba(13,17,23,0.55)';
      ctx.fillRect(px, py, BADGE_W, BADGE_H);
      ctx.fillStyle = col.text;
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'left';
      ctx.fillText(`대기 ${i + 1}`, px + 4, py + 3);

      // 삭제 핸들 × (우상단)
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
    if (drag && selecting) {
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
  }, []); // 항상 ref에서 최신값 읽으므로 의존성 불필요

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

  // prop 변화 시 리드로잉
  useEffect(() => {
    draw();
  }, [segments, tempSegments, isSelectingMode, selectedSegmentId, draw]);

  // ── 좌표 유틸 ─────────────────────────────────────────────────────────────
  const toRel = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      rx: (clientX - rect.left) / rect.width,
      ry: (clientY - rect.top)  / rect.height,
    };
  };

  // × 핸들 히트 테스트 (17×17 px, 우상단)
  const hitDelete = (rx, ry, seg) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const { x, y, width: rw, height: rh } = seg.coordinates;
    const DX = (x + rw) * W - 18, DY = y * H + 1, DS = 17;
    const px = rx * W, py = ry * H;
    return px >= DX && px <= DX + DS && py >= DY && py <= DY + DS;
  };

  // 확정 구간 바디 히트 테스트
  const hitSegment = (rx, ry) =>
    segmentsRef.current.find(seg => {
      const { x, y, width: rw, height: rh } = seg.coordinates;
      return rx >= x && rx <= x + rw && ry >= y && ry <= y + rh;
    }) ?? null;

  // ── Pointer Events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const { rx, ry } = toRel(e.clientX, e.clientY);

    // 미확정 구간 × 핸들 클릭 → 개별 삭제
    for (const seg of tempSegmentsRef.current) {
      if (hitDelete(rx, ry, seg)) {
        onTempDeleteRef.current(seg.id);
        return;
      }
    }

    // 확정 구간 × 핸들 클릭 → 삭제
    for (const seg of segmentsRef.current) {
      if (hitDelete(rx, ry, seg)) {
        onDeleteRef.current(seg.id);
        return;
      }
    }

    // 선택 모드 아닐 때: 확정 구간 클릭 → 선택/해제
    if (!isSelectingRef.current) {
      const hit = hitSegment(rx, ry);
      onSelectRef.current(hit?.id ?? null);
      return;
    }

    // 드래그 시작
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

  const handlePointerUp = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    const x = Math.min(drag.startX, drag.currentX);
    const y = Math.min(drag.startY, drag.currentY);
    const w = Math.abs(drag.currentX - drag.startX);
    const h = Math.abs(drag.currentY - drag.startY);

    // 최소 크기(3%) 이상일 때만 임시 구간 추가
    if (w > 0.03 && h > 0.02) {
      onCreateRef.current({ x, y, width: w, height: h });
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
