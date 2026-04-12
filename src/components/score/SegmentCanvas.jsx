// src/components/score/SegmentCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Before Phase 시각적 구간 오버레이
//
// 크로스 페이지 구간 지원:
//   • 각 coordinates 항목에 pageIndex 포함
//   • currentPageIndex와 일치하는 rect만 렌더링/인터랙션
//   • 드래그 완료 시 pageIndex를 coordinates에 자동 포함
//   • 구간 설정 모드(isSelectingMode) 중 페이지 전환해도 tempSegments 유지
//
// 구간 편집 지원 (v2):
//   • 선택된 구간 → 드래그로 이동, 모서리/가장자리 핸들로 크기 조정
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback } from 'react';

const PALETTE = {
  unmapped: { fill: 'rgba(155,127,200,0.15)', stroke: '#9b7fc8', text: '#9b7fc8' },
  mapped:   { fill: 'rgba(126,168,144,0.22)', stroke: '#7ea890', text: '#7ea890' },
  selected: { fill: 'rgba(212,168,67,0.15)',  stroke: '#d4a843', text: '#d4a843' },
  pending:  { fill: 'rgba(155,127,200,0.07)', stroke: '#9b7fc8', text: '#9b7fc8' },
};

const HANDLE_SIZE = 7;   // 핸들 그리기 크기 (px)
const HANDLE_HIT  = 12;  // 핸들 클릭 감지 반경 (px)
const MIN_W = 0.03;
const MIN_H = 0.02;

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

// 선택된 구간의 8개 크기조정 핸들 그리기
function drawHandles(ctx, px, py, pw, ph, col) {
  const HS = HANDLE_SIZE;
  const half = HS / 2;
  const positions = [
    [px - half,        py - half],
    [px + pw / 2 - half, py - half],
    [px + pw - half,   py - half],
    [px - half,        py + ph / 2 - half],
    [px + pw - half,   py + ph / 2 - half],
    [px - half,        py + ph - half],
    [px + pw / 2 - half, py + ph - half],
    [px + pw - half,   py + ph - half],
  ];
  positions.forEach(([hx, hy]) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(hx, hy, HS, HS);
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(hx, hy, HS, HS);
  });
}

// 포인터 위치(px)와 rect(px)로부터 편집 모드 결정
// 반환: 'move' | 'nw-resize' | 'ne-resize' | 'sw-resize' | 'se-resize'
//       | 'n-resize' | 's-resize' | 'e-resize' | 'w-resize' | null
function getEditMode(ptx, pty, px, py, pw, ph) {
  const H = HANDLE_HIT;
  if (ptx < px - H || ptx > px + pw + H || pty < py - H || pty > py + ph + H) return null;

  const nearLeft   = ptx < px + H;
  const nearRight  = ptx > px + pw - H;
  const nearTop    = pty < py + H;
  const nearBottom = pty > py + ph - H;

  if (nearLeft  && nearTop)    return 'nw-resize';
  if (nearRight && nearTop)    return 'ne-resize';
  if (nearLeft  && nearBottom) return 'sw-resize';
  if (nearRight && nearBottom) return 'se-resize';
  if (nearLeft)                return 'w-resize';
  if (nearRight)               return 'e-resize';
  if (nearTop)                 return 'n-resize';
  if (nearBottom)              return 's-resize';

  if (ptx >= px && ptx <= px + pw && pty >= py && pty <= py + ph) return 'move';
  return null;
}

// 드래그 델타(상대 좌표 단위)와 원본 coord로부터 새 coord 계산
function applyEditDrag(mode, origCoord, dx, dy) {
  const { x, y, width: w, height: h } = origCoord;

  switch (mode) {
    case 'move':
      return {
        x: Math.max(0, Math.min(1 - w, x + dx)),
        y: Math.max(0, Math.min(1 - h, y + dy)),
        width: w, height: h,
      };
    case 'nw-resize': {
      const nw = Math.max(MIN_W, w - dx);
      const nh = Math.max(MIN_H, h - dy);
      return { x: x + w - nw, y: y + h - nh, width: nw, height: nh };
    }
    case 'ne-resize': {
      const nw = Math.max(MIN_W, w + dx);
      const nh = Math.max(MIN_H, h - dy);
      return { x, y: y + h - nh, width: nw, height: nh };
    }
    case 'sw-resize': {
      const nw = Math.max(MIN_W, w - dx);
      const nh = Math.max(MIN_H, h + dy);
      return { x: x + w - nw, y, width: nw, height: nh };
    }
    case 'se-resize':
      return { x, y, width: Math.max(MIN_W, w + dx), height: Math.max(MIN_H, h + dy) };
    case 'w-resize': {
      const nw = Math.max(MIN_W, w - dx);
      return { x: x + w - nw, y, width: nw, height: h };
    }
    case 'e-resize':
      return { x, y, width: Math.max(MIN_W, w + dx), height: h };
    case 'n-resize': {
      const nh = Math.max(MIN_H, h - dy);
      return { x, y: y + h - nh, width: w, height: nh };
    }
    case 's-resize':
      return { x, y, width: w, height: Math.max(MIN_H, h + dy) };
    default:
      return origCoord;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function SegmentCanvas({
  segments,          // Segment[]   확정 구간 (coordinates: [{pageIndex,x,y,width,height},...])
  tempSegments,      // TempSeg[]   미확정 버퍼 (coordinates: {pageIndex,x,y,width,height} 단일)
  isSelectingMode,   // bool
  selectedSegmentId, // string | null
  currentPageIndex,  // number — 현재 표시 중인 페이지
  onSegmentCreate,   // ({pageIndex,x,y,width,height}) => void
  onSegmentSelect,   // (id | null) => void
  onSegmentDelete,   // (id) => void — 구간 전체 삭제
  onTempDelete,      // (id) => void — 미확정 rect 개별 삭제
  onSegmentUpdate,   // (segmentId, pageIndex, {x,y,width,height}) => void — 구간 이동/크기조정
  readOnly,          // bool — 삭제/편집 UI 숨김, 선택만 허용
}) {
  const containerRef    = useRef(null);
  const canvasRef       = useRef(null);

  const segmentsRef     = useRef(segments);
  const tempSegmentsRef = useRef(tempSegments);
  const isSelectingRef  = useRef(isSelectingMode);
  const selectedIdRef   = useRef(selectedSegmentId);
  const readOnlyRef     = useRef(readOnly);
  const pageIdxRef      = useRef(currentPageIndex);
  const onCreateRef     = useRef(onSegmentCreate);
  const onSelectRef     = useRef(onSegmentSelect);
  const onDeleteRef     = useRef(onSegmentDelete);
  const onTempDelRef    = useRef(onTempDelete);
  const onUpdateRef     = useRef(onSegmentUpdate);

  useEffect(() => { segmentsRef.current     = segments; },        [segments]);
  useEffect(() => { tempSegmentsRef.current = tempSegments; },    [tempSegments]);
  useEffect(() => { isSelectingRef.current  = isSelectingMode; }, [isSelectingMode]);
  useEffect(() => { selectedIdRef.current   = selectedSegmentId; },[selectedSegmentId]);
  useEffect(() => { readOnlyRef.current     = readOnly; },         [readOnly]);
  useEffect(() => { pageIdxRef.current      = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { onCreateRef.current     = onSegmentCreate; },  [onSegmentCreate]);
  useEffect(() => { onSelectRef.current     = onSegmentSelect; },  [onSegmentSelect]);
  useEffect(() => { onDeleteRef.current     = onSegmentDelete; },  [onSegmentDelete]);
  useEffect(() => { onTempDelRef.current    = onTempDelete; },     [onTempDelete]);
  useEffect(() => { onUpdateRef.current     = onSegmentUpdate; },  [onSegmentUpdate]);

  const dragRef     = useRef(null); // 신규 박스 드래그
  const editDragRef = useRef(null); // 기존 구간 이동/크기조정 드래그
  const rafRef      = useRef(null);

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
    const segs    = segmentsRef.current;
    const temps   = tempSegmentsRef.current;
    const selId   = selectedIdRef.current;
    const curPage = pageIdxRef.current;
    const editDrag  = editDragRef.current;
    const isReadOnly = readOnlyRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── 확정된 구간 — 현재 페이지의 rect만 표시 ──
    segs.forEach((seg, globalIdx) => {
      const pageRects = seg.coordinates.filter(c => c.pageIndex === curPage);
      if (pageRects.length === 0) return;

      const isSelected = seg.id === selId;
      const col = segColor(seg, isSelected);

      pageRects.forEach(({ x, y, width: rw, height: rh, pageIndex }, rectIdx) => {
        // 편집 드래그 중이면 previewCoord 사용
        let drawX = x, drawY = y, drawW = rw, drawH = rh;
        if (editDrag && editDrag.segmentId === seg.id && editDrag.pageIndex === pageIndex) {
          drawX = editDrag.previewCoord.x;
          drawY = editDrag.previewCoord.y;
          drawW = editDrag.previewCoord.width;
          drawH = editDrag.previewCoord.height;
        }

        const px = drawX * W, py = drawY * H, pw = drawW * W, ph = drawH * H;

        drawRect(ctx, px, py, pw, ph, col, false, isSelected ? 2.5 : 1.5);

        // 구간 번호 배지
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

        // 삭제 × — readOnly 모드에서는 숨김
        if (!isReadOnly) {
          const DX = px + pw - 18, DY = py + 1, DS = 17;
          ctx.fillStyle = 'rgba(224,112,112,0.75)';
          ctx.fillRect(DX, DY, DS, DS);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textBaseline = 'middle';
          ctx.textAlign    = 'center';
          ctx.fillText('×', DX + DS / 2, DY + DS / 2);
        }

        // 선택된 구간에 크기조정 핸들 표시 (구간 설정 모드 OFF + readOnly 아닐 때만)
        if (isSelected && !isSelectingRef.current && !isReadOnly) {
          drawHandles(ctx, px, py, pw, ph, col);
        }
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

    // ── 신규 박스 드래그 미리보기 ──
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

  const getDims = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { W: 1, H: 1 };
    const dpr = window.devicePixelRatio || 1;
    return { W: canvas.width / dpr, H: canvas.height / dpr };
  };

  // × 히트 테스트 — 확정 구간 (현재 페이지 rect만 검사)
  const hitDeleteCommitted = (rx, ry, seg) => {
    const { W, H } = getDims();
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
    const { W, H } = getDims();
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

  // 선택된 구간에서 현재 페이지 coord를 찾아 편집 모드 반환
  const getSelectedSegEditMode = (rx, ry) => {
    const selId = selectedIdRef.current;
    if (!selId) return null;
    const seg = segmentsRef.current.find(s => s.id === selId);
    if (!seg) return null;
    const curPage = pageIdxRef.current;
    const coord = seg.coordinates.find(c => c.pageIndex === curPage);
    if (!coord) return null;

    const { W, H } = getDims();
    const ptx = rx * W, pty = ry * H;
    const px = coord.x * W, py = coord.y * H, pw = coord.width * W, ph = coord.height * H;
    const mode = getEditMode(ptx, pty, px, py, pw, ph);
    if (!mode) return null;
    return { seg, coord, mode };
  };

  // 호버 커서 업데이트
  const updateHoverCursor = useCallback((rx, ry) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isSelectingRef.current) {
      canvas.style.cursor = 'crosshair';
      return;
    }

    const result = getSelectedSegEditMode(rx, ry);
    if (result) {
      canvas.style.cursor = result.mode;
      return;
    }
    canvas.style.cursor = hitSegment(rx, ry) ? 'pointer' : 'default';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer Events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const { rx, ry } = toRel(e.clientX, e.clientY);

    // readOnly가 아닐 때만 × 버튼 히트 테스트
    if (!readOnlyRef.current) {
      for (const seg of tempSegmentsRef.current) {
        if (hitDeleteTemp(rx, ry, seg)) { onTempDelRef.current(seg.id); return; }
      }
      for (const seg of segmentsRef.current) {
        if (hitDeleteCommitted(rx, ry, seg)) { onDeleteRef.current(seg.id); return; }
      }
    }

    if (!isSelectingRef.current) {
      // readOnly가 아닐 때만 편집 모드 진입
      const result = !readOnlyRef.current ? getSelectedSegEditMode(rx, ry) : null;
      if (result) {
        editDragRef.current = {
          segmentId:   result.seg.id,
          pageIndex:   result.coord.pageIndex,
          mode:        result.mode,
          startRx:     rx,
          startRy:     ry,
          origCoord:   {
            x: result.coord.x,
            y: result.coord.y,
            width: result.coord.width,
            height: result.coord.height,
          },
          previewCoord: {
            x: result.coord.x,
            y: result.coord.y,
            width: result.coord.width,
            height: result.coord.height,
          },
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 일반 클릭: 구간 선택
      onSelectRef.current(hitSegment(rx, ry)?.id ?? null);
      return;
    }

    // 구간 설정 모드: 신규 박스 드래그
    dragRef.current = { startX: rx, startY: ry, currentX: rx, currentY: ry };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerMove = useCallback((e) => {
    const { rx, ry } = toRel(e.clientX, e.clientY);

    // 편집 드래그 중
    if (editDragRef.current) {
      const ed = editDragRef.current;
      const dx = rx - ed.startRx;
      const dy = ry - ed.startRy;
      ed.previewCoord = applyEditDrag(ed.mode, ed.origCoord, dx, dy);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // 신규 박스 드래그 중
    if (dragRef.current) {
      dragRef.current.currentX = Math.max(0, Math.min(1, rx));
      dragRef.current.currentY = Math.max(0, Math.min(1, ry));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // 호버 커서 업데이트
    updateHoverCursor(rx, ry);
  }, [draw, updateHoverCursor]);

  const handlePointerUp = useCallback((e) => {
    // 편집 드래그 완료 → 상태 업데이트
    if (editDragRef.current) {
      const ed = editDragRef.current;
      onUpdateRef.current?.(ed.segmentId, ed.pageIndex, ed.previewCoord);
      editDragRef.current = null;
      // 커서 복원
      const { rx, ry } = toRel(e.clientX, e.clientY);
      updateHoverCursor(rx, ry);
      draw();
      return;
    }

    // 신규 박스 드래그 완료
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    const x = Math.min(drag.startX, drag.currentX);
    const y = Math.min(drag.startY, drag.currentY);
    const w = Math.abs(drag.currentX - drag.startX);
    const h = Math.abs(drag.currentY - drag.startY);

    if (w > 0.03 && h > 0.02) {
      onCreateRef.current({ pageIndex: pageIdxRef.current, x, y, width: w, height: h });
    }
    draw();
  }, [draw, updateHoverCursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerCancel = useCallback(() => {
    editDragRef.current = null;
    dragRef.current = null;
    draw();
  }, [draw]);

  // ── 커서 스타일 (동적 관리) ───────────────────────────────────────────────
  // isSelectingMode 변경 시 기본 커서 리셋
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = isSelectingMode ? 'crosshair' : 'default';
  }, [isSelectingMode]);

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
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}
