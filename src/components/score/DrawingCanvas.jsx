// src/components/score/DrawingCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 악보 위 투명 캔버스 오버레이 — 필기/보잉 기호 드로잉
//
// 좌표계: 모든 포인트는 0~1 정규화 (canvas width/height 기준)
// 도구:
//   pen      — 자유 드로잉
//   downBow  — 활 내림 ∏ 스탬프
//   upBow    — 활 올림 ∨ 스탬프
//   eraser   — 가장 가까운 스트로크 삭제
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';

const BOWING_SIZE = 0.0008;      // canvas width 대비 보잉 기호 크기
const ERASER_THRESHOLD_PX = 28;  // 지우개 감지 픽셀 반경

function drawStroke(ctx, stroke, w, h) {
  const { tool, color, strokeWidth = 2, points } = stroke;
  if (!points || points.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'pen') {
    if (points.length < 2) return;
    ctx.lineWidth = Math.max(1.5, strokeWidth * w / 900);
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();
    return;
  }

  if (tool === 'highlighter') {
    if (points.length < 2) return;
    ctx.globalAlpha = 0.38;
    ctx.lineCap = 'square';
    ctx.lineWidth = Math.max(6, strokeWidth * w / 600);
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    return;
  }

  if (tool === 'downBow' || tool === 'upBow') {
    const cx = points[0].x * w;
    const cy = points[0].y * h;
    const sz = BOWING_SIZE * w;
    ctx.lineWidth = Math.max(1.5, 2.2 * w / 900);
    ctx.beginPath();
    if (tool === 'downBow') {
      // ∏: 상단 가로 바 + 두 수직 다리
      ctx.moveTo(cx - sz, cy);
      ctx.lineTo(cx + sz, cy);
      ctx.moveTo(cx - sz, cy);
      ctx.lineTo(cx - sz, cy + sz * 1.3);
      ctx.moveTo(cx + sz, cy);
      ctx.lineTo(cx + sz, cy + sz * 1.3);
    } else {
      // ∨: V 모양
      ctx.moveTo(cx - sz, cy - sz * 0.5);
      ctx.lineTo(cx, cy + sz * 0.8);
      ctx.lineTo(cx + sz, cy - sz * 0.5);
    }
    ctx.stroke();
  }
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function DrawingCanvas({ currentPageIndex }) {
  const {
    activeScore,
    drawingMode,
    drawingTool,
    drawingColor,
    drawing,
  } = usePractice();

  const canvasRef       = useRef(null);
  const activeStrokeRef = useRef(null);
  const strokesRef      = useRef([]);
  const isErasingRef    = useRef(false);

  // 항상 최신 strokes를 ref에 동기화 (이벤트 핸들러 stale closure 방지)
  const strokes = (activeScore?.drawings ?? []).filter(d => d.pageIndex === currentPageIndex);
  strokesRef.current = strokes;

  // props → ref 미러링
  const drawingModeRef    = useRef(drawingMode);
  const drawingToolRef    = useRef(drawingTool);
  const drawingColorRef   = useRef(drawingColor);
  const pageIdxRef        = useRef(currentPageIndex);
  const drawingActsRef    = useRef(drawing);
  const activeScoreRef    = useRef(activeScore);

  useEffect(() => { drawingModeRef.current  = drawingMode; },      [drawingMode]);
  useEffect(() => { drawingToolRef.current  = drawingTool; },      [drawingTool]);
  useEffect(() => { drawingColorRef.current = drawingColor; },     [drawingColor]);
  useEffect(() => { pageIdxRef.current      = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { drawingActsRef.current  = drawing; },          [drawing]);
  useEffect(() => { activeScoreRef.current  = activeScore; },      [activeScore]);

  // ── 캔버스 렌더 ──────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const w = el.width;
    const h = el.height;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, w, h);
    }
    if (activeStrokeRef.current) {
      drawStroke(ctx, activeStrokeRef.current, w, h);
    }
  }, []);

  // 캔버스 사이즈를 표시 사이즈에 동기화
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        el.width  = Math.round(r.width);
        el.height = Math.round(r.height);
        redraw();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [redraw]);

  // strokes 변경 시 재렌더
  useEffect(() => { redraw(); }, [strokes, redraw]);

  // ── 좌표 변환 ────────────────────────────────────────────────────
  const getRelPt = useCallback((e) => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height)),
    };
  }, []);

  // ── 지우개 히트 테스트 + 삭제 ──────────────────────────────────────
  const eraseNear = useCallback((pt, pageIdx, acts) => {
    const allDrawings  = activeScoreRef.current?.drawings ?? [];
    const pageDrawings = allDrawings.filter(d => d.pageIndex === pageIdx);
    const el = canvasRef.current;
    if (!el) return false;
    const w = el.width;
    const h = el.height;
    let nearest = null;
    let nearestDist = Infinity;
    for (const stroke of pageDrawings) {
      for (const p of stroke.points) {
        const dx   = (p.x - pt.x) * w;
        const dy   = (p.y - pt.y) * h;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) { nearestDist = dist; nearest = stroke; }
      }
    }
    if (nearest && nearestDist < ERASER_THRESHOLD_PX) {
      acts.removeStroke(nearest.id);
      return true;
    }
    return false;
  }, []);

  // ── 포인터 이벤트 ────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (!drawingModeRef.current) return;
    e.preventDefault();
    const pt      = getRelPt(e);
    if (!pt) return;
    const tool    = drawingToolRef.current;
    const color   = drawingColorRef.current;
    const pageIdx = pageIdxRef.current;
    const acts    = drawingActsRef.current;

    if (tool === 'eraser') {
      isErasingRef.current = true;
      const erased = eraseNear(pt, pageIdx, acts);
      if (!erased) { /* 첫 클릭에 아무것도 없어도 드래그 허용 */ }
      return;
    }

    if (tool === 'downBow' || tool === 'upBow') {
      acts.addStroke({ id: uid(), tool, color, strokeWidth: 2.5, points: [pt], pageIndex: pageIdx });
      return;
    }

    // pen: 스트로크 시작
    activeStrokeRef.current = {
      id: uid(),
      tool: 'pen',
      color,
      strokeWidth: 2,
      points: [pt],
      pageIndex: pageIdx,
    };
  }, [getRelPt]);

  const onPointerMove = useCallback((e) => {
    if (!drawingModeRef.current) return;
    e.preventDefault();
    const pt = getRelPt(e);
    if (!pt) return;

    // 지우개 드래그 중
    if (isErasingRef.current && drawingToolRef.current === 'eraser') {
      eraseNear(pt, pageIdxRef.current, drawingActsRef.current);
      return;
    }

    if (!activeStrokeRef.current) return;
    activeStrokeRef.current = {
      ...activeStrokeRef.current,
      points: [...activeStrokeRef.current.points, pt],
    };
    redraw();
  }, [getRelPt, redraw, eraseNear]);

  const onPointerUp = useCallback(() => {
    isErasingRef.current = false;
    if (!drawingModeRef.current || !activeStrokeRef.current) return;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (stroke.points.length >= 2) {
      drawingActsRef.current.addStroke(stroke);
    }
    redraw();
  }, [redraw]);

  useEffect(() => {
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup',   onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup',   onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const cursor = !drawingMode ? 'default'
    : drawingTool === 'eraser' ? 'cell'
    : 'crosshair';

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: drawingMode ? 'auto' : 'none',
        cursor,
        zIndex: 10,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
    />
  );
}
