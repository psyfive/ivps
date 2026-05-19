import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';
import { FOCUS_CATEGORY_META, getFocusItems, pickRandomFocusIndexes } from '../../utils/duringFocusItems';

const EDGE_GAP = 10;

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function pickTopCoordinateForPage(segment, pageIndex) {
  return (segment?.coordinates ?? [])
    .filter(coord => coord.pageIndex === pageIndex)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))[0] ?? null;
}

function getClampedPosition(position, frameSize, bubbleSize) {
  if (!frameSize.width || !frameSize.height) return position;
  const halfW = (bubbleSize.width / 2 + EDGE_GAP) / frameSize.width;
  const halfH = (bubbleSize.height / 2 + EDGE_GAP) / frameSize.height;
  return {
    x: clamp(position.x, halfW, 1 - halfW),
    y: clamp(position.y, halfH, 1 - halfH),
  };
}

function getAutoPosition(coord, frameSize, bubbleSize) {
  const raw = {
    x: coord.x + coord.width / 2,
    y: coord.y,
  };

  if (!frameSize.width || !frameSize.height || !bubbleSize.width || !bubbleSize.height) {
    return {
      x: clamp(raw.x, 0.08, 0.92),
      y: clamp(raw.y - 0.08, 0.08, 0.92),
    };
  }

  return getClampedPosition({
    x: raw.x,
    y: raw.y - ((bubbleSize.height / 2 + EDGE_GAP) / frameSize.height),
  }, frameSize, bubbleSize);
}

function BubbleButton({ children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={event => event.stopPropagation()}
      disabled={disabled}
      title={title}
      className="ivps-hud-btn min-h-7 min-w-7 rounded-md px-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
    >
      {children}
    </button>
  );
}

export function DuringChecklistBubble({ pageIndex }) {
  const {
    selectedSegmentId,
    selectedSegment,
    duringChecklistMode,
    duringChecklistBubblePositions,
    settings,
  } = usePractice();

  const bubbleRef = useRef(null);
  const dragRef = useRef(null);
  const lastDragPositionRef = useRef(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const [dragPosition, setDragPosition] = useState(null);
  const [skillIdx, setSkillIdx] = useState(0);
  const [focusByKey, setFocusByKey] = useState({});

  const topCoord = useMemo(
    () => pickTopCoordinateForPage(selectedSegment, pageIndex),
    [selectedSegment, pageIndex],
  );

  useEffect(() => {
    setSkillIdx(0);
    setDragPosition(null);
  }, [selectedSegmentId, pageIndex]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    const frame = bubble?.parentElement;
    if (!bubble || !frame) return undefined;

    const updateSizes = () => {
      const frameRect = frame.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      setFrameSize({ width: frameRect.width, height: frameRect.height });
      setBubbleSize({ width: bubbleRect.width, height: bubbleRect.height });
    };

    updateSizes();
    const ro = new ResizeObserver(updateSizes);
    ro.observe(frame);
    ro.observe(bubble);
    return () => ro.disconnect();
  }, [topCoord, selectedSegmentId, pageIndex]);

  const skills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);
  const skill = skills[skillIdx] ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const color = catMeta?.color ?? '#9b7fc8';
  const items = skill?.during ?? [];
  const focusKey = selectedSegmentId && skill ? `${selectedSegmentId}:${skill.id}` : null;
  const focusItems = getFocusItems(items, focusKey ? focusByKey[focusKey] : null);
  const canReroll = items.length > 3;
  const multiSkill = skills.length > 1;

  const storedPosition = selectedSegmentId
    ? duringChecklistBubblePositions[selectedSegmentId]?.[String(pageIndex)] ?? null
    : null;
  const autoPosition = topCoord ? getAutoPosition(topCoord, frameSize, bubbleSize) : null;
  const displayedPosition = dragPosition ?? storedPosition ?? autoPosition;

  const rerollFocus = useCallback(() => {
    if (!focusKey || items.length <= 3) return;
    setFocusByKey(prev => ({
      ...prev,
      [focusKey]: pickRandomFocusIndexes(items, prev[focusKey]),
    }));
  }, [focusKey, items]);

  const getPointerPosition = useCallback((event) => {
    const frame = bubbleRef.current?.parentElement;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }, []);

  const onPointerDown = useCallback((event) => {
    if (!selectedSegmentId || !displayedPosition) return;
    event.preventDefault();
    event.stopPropagation();
    const pointer = getPointerPosition(event);
    if (!pointer) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: pointer.x - displayedPosition.x,
      offsetY: pointer.y - displayedPosition.y,
    };
    lastDragPositionRef.current = displayedPosition;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragPosition(displayedPosition);
  }, [displayedPosition, getPointerPosition, selectedSegmentId]);

  const onPointerMove = useCallback((event) => {
    if (!dragRef.current) return;
    event.preventDefault();
    const pointer = getPointerPosition(event);
    if (!pointer) return;
    const next = getClampedPosition({
      x: pointer.x - dragRef.current.offsetX,
      y: pointer.y - dragRef.current.offsetY,
    }, frameSize, bubbleSize);
    lastDragPositionRef.current = next;
    setDragPosition(next);
  }, [bubbleSize, frameSize, getPointerPosition]);

  const finishDrag = useCallback((event) => {
    if (!dragRef.current || !selectedSegmentId) return;
    event.preventDefault();
    const next = lastDragPositionRef.current ?? dragPosition;
    dragRef.current = null;
    lastDragPositionRef.current = null;
    if (next) settings.setDuringChecklistBubblePosition(selectedSegmentId, pageIndex, next);
    setDragPosition(null);
  }, [dragPosition, pageIndex, selectedSegmentId, settings]);

  if (duringChecklistMode !== 'bubble' || !selectedSegmentId || !topCoord || !displayedPosition) {
    return null;
  }

  return (
    <div
      ref={bubbleRef}
      data-during-checklist-bubble
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className="ivps-hud-popover absolute z-30 w-[min(360px,88%)] max-h-[min(52vh,420px)] cursor-grab select-none overflow-y-auto rounded-xl px-4 py-3 active:cursor-grabbing touch-none"
      style={{
        left: `${displayedPosition.x * 100}%`,
        top: `${displayedPosition.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        boxShadow: `var(--ivps-hud-shadow), 0 0 0 1px ${color}24`,
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="flex-shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
          style={{ background: `${color}24`, color }}
        >
          {skill?.id ?? 'NO SKILL'}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--ivps-hud-text)]">
          {skill?.name ?? '\uC2A4\uD0AC \uBBF8\uB9E4\uD551'}
        </span>
        {multiSkill && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <BubbleButton
              onClick={(event) => {
                event.stopPropagation();
                setSkillIdx((skillIdx - 1 + skills.length) % skills.length);
              }}
              title="Previous skill"
            >
              {'<'}
            </BubbleButton>
            <span className="font-mono text-[10px] text-[rgba(255,255,255,.45)]">
              {skillIdx + 1}/{skills.length}
            </span>
            <BubbleButton
              onClick={(event) => {
                event.stopPropagation();
                setSkillIdx((skillIdx + 1) % skills.length);
              }}
              title="Next skill"
            >
              {'>'}
            </BubbleButton>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {focusItems.length > 0 ? (
          focusItems.map(({ index, text, category, label }) => {
            const focusMeta = FOCUS_CATEGORY_META[category] ?? FOCUS_CATEGORY_META.general;
            return (
              <div key={index} className="flex items-start gap-2.5 text-left">
                <span
                  className="mt-[1px] flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold"
                  style={{
                    background: focusMeta.bg,
                    color: focusMeta.color,
                    border: `1px solid ${focusMeta.border}`,
                  }}
                >
                  {label || 'Focus'}
                </span>
                <span className="min-w-0 whitespace-normal break-words text-[12px] leading-[1.45] text-[rgba(255,255,255,.80)]">
                  {text}
                </span>
              </div>
            );
          })
        ) : (
          <div className="px-2 pb-1 text-center text-[11px] text-[rgba(255,255,255,.55)]">
            Before에서 이 구간에 스킬을 추가하세요.
          </div>
        )}
      </div>

      {canReroll && (
        <div className="mt-2 flex justify-center">
          <BubbleButton
            onClick={(event) => {
              event.stopPropagation();
              rerollFocus();
            }}
            title="Reroll focus"
          >
            ROLL
          </BubbleButton>
        </div>
      )}
    </div>
  );
}
