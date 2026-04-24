// src/components/score/DrawingCanvas.jsx
// Transparent score overlay for pen, bowing marks, eraser, and editable text.
// Coordinates are normalized to 0..1 against the canvas box.
import { useRef, useEffect, useCallback, useState } from 'react';
import { usePractice } from '../../context/PracticeContext';

const BOWING_SIZE = 0.0024;
const FONT_SIZE_MAP = { 1: 14, 2: 22, 3: 32 };
const ERASER_THRESHOLD_PX = 28;
const TEXT_HIT_PAD_PX = 10;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

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
      ctx.moveTo(cx - sz, cy);
      ctx.lineTo(cx + sz, cy);
      ctx.moveTo(cx - sz, cy);
      ctx.lineTo(cx - sz, cy + sz * 1.3);
      ctx.moveTo(cx + sz, cy);
      ctx.lineTo(cx + sz, cy + sz * 1.3);
    } else {
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

  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const strokesRef = useRef([]);
  const isErasingRef = useRef(false);
  const textDragRef = useRef(null);
  const suppressBlurRef = useRef(false);
  const [textInput, setTextInput] = useState(null);

  const textInputRef = useRef(null);
  const currentInputValueRef = useRef('');
  const transitioningRef = useRef(false);

  const setTextInputSync = useCallback((val) => {
    textInputRef.current = val;
    setTextInput(val);
  }, []);

  const editingTextId = textInput?.id ?? null;
  const strokes = (activeScore?.drawings ?? []).filter(
    d => d.pageIndex === currentPageIndex && d.id !== editingTextId
  );
  strokesRef.current = strokes;

  const drawingModeRef = useRef(drawingMode);
  const drawingToolRef = useRef(drawingTool);
  const drawingColorRef = useRef(drawingColor);
  const drawingFontSizeRef = useRef(drawingFontSize);
  const pageIdxRef = useRef(currentPageIndex);
  const drawingActsRef = useRef(drawing);
  const activeScoreRef = useRef(activeScore);

  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);
  useEffect(() => { drawingToolRef.current = drawingTool; }, [drawingTool]);
  useEffect(() => { drawingColorRef.current = drawingColor; }, [drawingColor]);
  useEffect(() => { drawingFontSizeRef.current = drawingFontSize; }, [drawingFontSize]);
  useEffect(() => { pageIdxRef.current = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { drawingActsRef.current = drawing; }, [drawing]);
  useEffect(() => { activeScoreRef.current = activeScore; }, [activeScore]);

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

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        el.width = Math.round(r.width);
        el.height = Math.round(r.height);
        redraw();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [strokes, editingTextId, redraw]);

  const getRelPt = useCallback((e) => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  }, []);

  const eraseNear = useCallback((pt, pageIdx, acts) => {
    const allDrawings = activeScoreRef.current?.drawings ?? [];
    const pageDrawings = allDrawings.filter(d => d.pageIndex === pageIdx);
    const el = canvasRef.current;
    if (!el) return false;
    const w = el.width;
    const h = el.height;
    let nearest = null;
    let nearestDist = Infinity;
    for (const stroke of pageDrawings) {
      for (const p of stroke.points) {
        const dx = (p.x - pt.x) * w;
        const dy = (p.y - pt.y) * h;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = stroke;
        }
      }
    }
    if (nearest && nearestDist < ERASER_THRESHOLD_PX) {
      acts.removeStroke(nearest.id);
      return true;
    }
    return false;
  }, []);

  const findNearestTextStroke = useCallback((pt, pageIdx, canvasEl) => {
    const allDrawings = activeScoreRef.current?.drawings ?? [];
    const textStrokes = allDrawings.filter(d => d.pageIndex === pageIdx && d.tool === 'text');
    if (textStrokes.length === 0 || !canvasEl) return null;
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;
    const ptPx = { x: pt.x * w, y: pt.y * h };

    for (let i = textStrokes.length - 1; i >= 0; i--) {
      const stroke = textStrokes[i];
      const ax = stroke.points[0].x * w;
      const ay = stroke.points[0].y * h;
      const fontSize = FONT_SIZE_MAP[stroke.strokeWidth] ?? 22;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = Math.max(ctx.measureText(stroke.text ?? '').width, 40);
      if (
        ptPx.x >= ax - TEXT_HIT_PAD_PX &&
        ptPx.x <= ax + textWidth + TEXT_HIT_PAD_PX &&
        ptPx.y >= ay - fontSize - TEXT_HIT_PAD_PX &&
        ptPx.y <= ay + TEXT_HIT_PAD_PX
      ) {
        return stroke;
      }
    }
    return null;
  }, []);

  const clearTextInput = useCallback(() => {
    textInputRef.current = null;
    setTextInput(null);
  }, []);

  const commitText = useCallback((value) => {
    const ti = textInputRef.current;
    if (!ti) return;
    const text = value.trim();
    const acts = drawingActsRef.current;

    if (!text) {
      if (ti.id) acts.removeStroke(ti.id);
      clearTextInput();
      return;
    }

    const patch = {
      tool: 'text',
      color: ti.color ?? drawingColorRef.current,
      strokeWidth: ti.strokeWidth ?? drawingFontSizeRef.current,
      points: [{ x: ti.x, y: ti.y }],
      text,
      pageIndex: ti.pageIdx,
    };

    if (ti.id) {
      acts.updateStroke(ti.id, patch);
    } else {
      acts.addStroke({ id: uid(), ...patch });
    }
    clearTextInput();
  }, [clearTextInput]);

  const openTextEditor = useCallback((stroke, pageIdx) => {
    currentInputValueRef.current = stroke.text ?? '';
    setTextInputSync({
      id: stroke.id,
      editKey: stroke.id,
      x: stroke.points[0].x,
      y: stroke.points[0].y,
      pageIdx,
      prefill: stroke.text ?? '',
      color: stroke.color,
      strokeWidth: stroke.strokeWidth,
    });
  }, [setTextInputSync]);

  const openNewTextEditor = useCallback((pt, pageIdx) => {
    currentInputValueRef.current = '';
    setTextInputSync({
      id: null,
      editKey: uid(),
      x: pt.x,
      y: pt.y,
      pageIdx,
      prefill: '',
      color: drawingColorRef.current,
      strokeWidth: drawingFontSizeRef.current,
    });
  }, [setTextInputSync]);

  const cancelText = useCallback(() => {
    clearTextInput();
    currentInputValueRef.current = '';
  }, [clearTextInput]);

  const startTextDrag = useCallback((e) => {
    const ti = textInputRef.current;
    const el = canvasRef.current;
    if (!ti || !el) return;
    e.preventDefault();
    e.stopPropagation();
    suppressBlurRef.current = true;
    textDragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: ti.x,
      startY: ti.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerDown = useCallback((e) => {
    if (!drawingModeRef.current) return;
    e.preventDefault();
    const pt = getRelPt(e);
    if (!pt) return;
    const tool = drawingToolRef.current;
    const color = drawingColorRef.current;
    const pageIdx = pageIdxRef.current;
    const acts = drawingActsRef.current;

    if (tool === 'eraser') {
      isErasingRef.current = true;
      eraseNear(pt, pageIdx, acts);
      return;
    }

    if (tool === 'text') {
      const el = canvasRef.current;
      const existingText = findNearestTextStroke(pt, pageIdx, el);
      const currentTi = textInputRef.current;

      if (existingText) {
        if (currentTi && currentTi.id !== existingText.id) {
          transitioningRef.current = true;
          commitText(currentInputValueRef.current);
        }
        openTextEditor(existingText, pageIdx);
        return;
      }

      if (currentTi) {
        commitText(currentInputValueRef.current);
        return;
      }

      openNewTextEditor(pt, pageIdx);
      return;
    }

    if (tool === 'downBow' || tool === 'upBow') {
      acts.addStroke({ id: uid(), tool, color, strokeWidth: 2.5, points: [pt], pageIndex: pageIdx });
      return;
    }

    activeStrokeRef.current = {
      id: uid(),
      tool: 'pen',
      color,
      strokeWidth: 2,
      points: [pt],
      pageIndex: pageIdx,
    };
  }, [
    getRelPt,
    eraseNear,
    findNearestTextStroke,
    commitText,
    openTextEditor,
    openNewTextEditor,
  ]);

  const onPointerMove = useCallback((e) => {
    const drag = textDragRef.current;
    if (drag) {
      const el = canvasRef.current;
      const ti = textInputRef.current;
      if (!el || !ti) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const next = {
        ...ti,
        x: clamp01(drag.startX + (e.clientX - drag.startClientX) / r.width),
        y: clamp01(drag.startY + (e.clientY - drag.startClientY) / r.height),
      };
      setTextInputSync(next);
      return;
    }

    if (!drawingModeRef.current) return;
    e.preventDefault();
    const pt = getRelPt(e);
    if (!pt) return;

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
  }, [getRelPt, redraw, eraseNear, setTextInputSync]);

  const onPointerUp = useCallback((e) => {
    if (textDragRef.current) {
      textDragRef.current = null;
      e?.preventDefault?.();
      requestAnimationFrame(() => {
        suppressBlurRef.current = false;
        inputRef.current?.focus();
      });
      return;
    }

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
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const cursor = !drawingMode ? 'default'
    : drawingTool === 'eraser' ? 'cell'
    : drawingTool === 'text' ? 'text'
    : 'crosshair';

  const activeFontSize = textInput
    ? (FONT_SIZE_MAP[textInput.strokeWidth] ?? 22)
    : (FONT_SIZE_MAP[drawingFontSize] ?? 22);

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: drawingMode ? 'auto' : 'none', zIndex: 10 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor, touchAction: 'none', pointerEvents: drawingMode ? 'auto' : 'none' }}
        onPointerDown={onPointerDown}
      />
      {textInput && (
        <div
          key={textInput.editKey}
          className="absolute flex items-center"
          style={{
            left: `${textInput.x * 100}%`,
            top: `${textInput.y * 100}%`,
            transform: 'translate(0, -50%)',
            zIndex: 20,
            touchAction: 'none',
          }}
        >
          <button
            type="button"
            aria-label="텍스트 상자 이동"
            className="absolute flex h-7 w-7 items-center justify-center rounded border"
            style={{
              left: -32,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(13,17,23,0.72)',
              borderColor: 'rgba(255,255,255,0.32)',
              cursor: 'grab',
              touchAction: 'none',
            }}
            onPointerDown={startTextDrag}
          >
            <span className="flex flex-col gap-[3px]" aria-hidden="true">
              <span className="block h-[2px] w-3 rounded bg-white/80" />
              <span className="block h-[2px] w-3 rounded bg-white/80" />
              <span className="block h-[2px] w-3 rounded bg-white/80" />
            </span>
          </button>
          <input
            ref={inputRef}
            autoFocus
            defaultValue={textInput.prefill ?? ''}
            style={{
              background: 'rgba(0,0,0,0.55)',
              color: textInput.color ?? drawingColor,
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: activeFontSize,
              fontWeight: 'bold',
              outline: 'none',
              minWidth: 80,
            }}
            onChange={(e) => { currentInputValueRef.current = e.target.value; }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText(currentInputValueRef.current);
              if (e.key === 'Escape') cancelText();
            }}
            onBlur={() => {
              if (transitioningRef.current) {
                transitioningRef.current = false;
                return;
              }
              if (suppressBlurRef.current) return;
              commitText(currentInputValueRef.current);
            }}
          />
        </div>
      )}
    </div>
  );
}
