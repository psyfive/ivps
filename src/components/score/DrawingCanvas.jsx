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
//   text     — 텍스트 입력 (클릭→입력→외부클릭으로 확정, 클릭으로 재편집)
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback, useState } from 'react';
import { usePractice } from '../../context/PracticeContext';

const BOWING_SIZE = 0.0024;      // canvas width 대비 보잉 기호 크기
const FONT_SIZE_MAP = { 1: 14, 2: 22, 3: 32 }; // drawingFontSize → px
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
    return;
  }

  if (tool === 'text') {
    const cx = points[0].x * w;
    const cy = points[0].y * h;
    const fontSize = FONT_SIZE_MAP[strokeWidth] ?? 22;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(stroke.text ?? '', cx, cy);
  }
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function DrawingCanvas({ currentPageIndex }) {
  const {
    activeScore,
    drawingMode,
    drawingTool,
    drawingColor,
    drawingFontSize,
    drawing,
  } = usePractice();

  const canvasRef       = useRef(null);
  const activeStrokeRef = useRef(null);
  const strokesRef      = useRef([]);
  const isErasingRef    = useRef(false);
  const [textInput, setTextInput] = useState(null); // { x, y, pageIdx, prefill }

  // ── 텍스트 입력 동기 ref ────────────────────────────────────────────────────
  // pointerdown이 blur보다 먼저 실행되므로 React 상태 대신 ref로 즉시 참조
  const textInputRef         = useRef(null);   // textInput 상태의 즉시 동기 미러
  const currentInputValueRef = useRef('');     // onChange로 추적하는 현재 입력값
  const transitioningRef     = useRef(false);  // 텍스트→텍스트 전환 시 blur commit 억제

  // 상태와 ref를 함께 업데이트하는 동기 래퍼
  const setTextInputSync = useCallback((val) => {
    textInputRef.current = val;
    setTextInput(val);
  }, []);

  // 항상 최신 strokes를 ref에 동기화 (이벤트 핸들러 stale closure 방지)
  const strokes = (activeScore?.drawings ?? []).filter(d => d.pageIndex === currentPageIndex);
  strokesRef.current = strokes;

  // props → ref 미러링
  const drawingModeRef     = useRef(drawingMode);
  const drawingToolRef     = useRef(drawingTool);
  const drawingColorRef    = useRef(drawingColor);
  const drawingFontSizeRef = useRef(drawingFontSize);
  const pageIdxRef         = useRef(currentPageIndex);
  const drawingActsRef     = useRef(drawing);
  const activeScoreRef     = useRef(activeScore);

  useEffect(() => { drawingModeRef.current     = drawingMode; },      [drawingMode]);
  useEffect(() => { drawingToolRef.current     = drawingTool; },      [drawingTool]);
  useEffect(() => { drawingColorRef.current    = drawingColor; },     [drawingColor]);
  useEffect(() => { drawingFontSizeRef.current = drawingFontSize; },  [drawingFontSize]);
  useEffect(() => { pageIdxRef.current         = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { drawingActsRef.current     = drawing; },          [drawing]);
  useEffect(() => { activeScoreRef.current     = activeScore; },      [activeScore]);

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

  // ── 텍스트 스트로크 바운딩박스 히트 테스트 ─────────────────────────
  // measureText()로 실제 텍스트 너비를 계산해 정확한 클릭 감지
  const findNearestTextStroke = useCallback((pt, pageIdx, canvasEl) => {
    const allDrawings = activeScoreRef.current?.drawings ?? [];
    const textStrokes = allDrawings.filter(d => d.pageIndex === pageIdx && d.tool === 'text');
    if (textStrokes.length === 0 || !canvasEl) return null;
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;
    const ptPx = { x: pt.x * w, y: pt.y * h };
    const pad = 6;
    for (const stroke of textStrokes) {
      const ax = stroke.points[0].x * w;
      const ay = stroke.points[0].y * h;
      const fontSize = FONT_SIZE_MAP[stroke.strokeWidth] ?? 22;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(stroke.text ?? '').width;
      if (
        ptPx.x >= ax - pad &&
        ptPx.x <= ax + textWidth + pad &&
        ptPx.y >= ay - fontSize - pad &&
        ptPx.y <= ay + pad
      ) {
        return stroke;
      }
    }
    return null;
  }, []);

  // ── 텍스트 확정 ──────────────────────────────────────────────────
  // textInputRef 기반 — blur/Enter/전환 모두 이 함수로 처리
  const commitText = useCallback((value) => {
    const ti = textInputRef.current;
    if (!ti) return;
    if (value.trim()) {
      drawingActsRef.current.addStroke({
        id: uid(),
        tool: 'text',
        color: drawingColorRef.current,
        strokeWidth: drawingFontSizeRef.current,
        points: [{ x: ti.x, y: ti.y }],
        text: value.trim(),
        pageIndex: ti.pageIdx,
      });
    }
    textInputRef.current = null;
    setTextInput(null);
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
      eraseNear(pt, pageIdx, acts);
      return;
    }

    if (tool === 'text') {
      const el           = canvasRef.current;
      const existingText = findNearestTextStroke(pt, pageIdx, el);
      const currentTi    = textInputRef.current;

      if (existingText) {
        if (currentTi) {
          // 다른 텍스트 클릭: 현재 입력 먼저 커밋 후 클릭 대상 편집
          const val = currentInputValueRef.current;
          if (val.trim()) {
            acts.addStroke({
              id: uid(),
              tool: 'text',
              color: drawingColorRef.current,
              strokeWidth: drawingFontSizeRef.current,
              points: [{ x: currentTi.x, y: currentTi.y }],
              text: val.trim(),
              pageIndex: currentTi.pageIdx,
            });
          }
          transitioningRef.current = true; // 뒤따라오는 blur가 재커밋하지 않도록
        }
        acts.removeStroke(existingText.id);
        currentInputValueRef.current = existingText.text ?? '';
        setTextInputSync({
          x: existingText.points[0].x,
          y: existingText.points[0].y,
          pageIdx,
          prefill: existingText.text ?? '',
        });
        return;
      }

      // 빈 공간 클릭
      if (currentTi) {
        // 입력창이 열린 상태에서 빈 곳 클릭 → blur가 커밋 처리하도록 위임
        return;
      }

      // 새 텍스트 입력창 열기
      currentInputValueRef.current = '';
      setTextInputSync({ x: pt.x, y: pt.y, pageIdx, prefill: '' });
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
  }, [getRelPt, eraseNear, findNearestTextStroke, setTextInputSync]);

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
    : drawingTool === 'text'   ? 'text'
    : 'crosshair';

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: drawingMode ? 'auto' : 'none', zIndex: 10 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor, touchAction: 'none', pointerEvents: 'auto' }}
        onPointerDown={onPointerDown}
      />
      {textInput && (
        <input
          autoFocus
          defaultValue={textInput.prefill ?? ''}
          style={{
            position: 'absolute',
            left: `${textInput.x * 100}%`,
            top: `${textInput.y * 100}%`,
            transform: 'translate(0, -50%)',
            zIndex: 20,
            background: 'rgba(0,0,0,0.55)',
            color: drawingColor,
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: FONT_SIZE_MAP[drawingFontSize] ?? 22,
            fontWeight: 'bold',
            outline: 'none',
            minWidth: 80,
          }}
          onChange={(e) => { currentInputValueRef.current = e.target.value; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText(currentInputValueRef.current);
            if (e.key === 'Escape') { textInputRef.current = null; setTextInput(null); }
          }}
          onBlur={() => {
            if (transitioningRef.current) { transitioningRef.current = false; return; }
            commitText(currentInputValueRef.current);
          }}
        />
      )}
    </div>
  );
}
