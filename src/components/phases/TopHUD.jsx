// src/components/phases/TopHUD.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During Phase 전용 — 화면 최상단 가로형 HUD 바
//
// 구간 탭 → 해당 구간에 매핑된 스킬의 during 체크리스트 3개를 3줄로 표시.
// 스킬이 여러 개인 경우 < > 버튼으로 수동 전환, AUTO 모드 시 22초마다 자동 전환.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';

const AUTO_INTERVAL_MS = 22_000;

// ── 소형 컨트롤 버튼 ──────────────────────────────────────────────────────
function Btn({ onClick, children, active, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'flex items-center justify-center rounded-md border text-[11px] font-semibold transition-all select-none flex-shrink-0',
        active
          ? 'bg-[rgba(155,127,200,.2)] border-[rgba(155,127,200,.45)] text-[#9b7fc8]'
          : 'bg-[rgba(255,255,255,.05)] border-[rgba(255,255,255,.1)] text-[rgba(255,255,255,.55)] hover:bg-[rgba(255,255,255,.1)] hover:text-white',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
      style={{ height: 26, minWidth: 26, paddingLeft: 8, paddingRight: 8 }}
    >
      {children}
    </button>
  );
}

// ── 체크 원형 아이콘 ──────────────────────────────────────────────────────
function CheckCircle({ done, index, color }) {
  return (
    <span
      className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-150"
      style={
        done
          ? { background: color, color: '#fff' }
          : {
              background: 'rgba(255,255,255,.07)',
              color: 'rgba(255,255,255,.3)',
              border: '1px solid rgba(255,255,255,.12)',
            }
      }
    >
      {done ? '✓' : index + 1}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function TopHUD() {
  const {
    phase,
    activeScore,
    selectedSegmentId,
    selectedSegment,
    segment: segmentActs,
  } = usePractice();

  const [skillIdx, setSkillIdx]   = useState(0);
  const [autoMode, setAutoMode]   = useState(false);
  const autoTimerRef              = useRef(null);

  // 구간 바뀌면 스킬 인덱스 리셋
  useEffect(() => { setSkillIdx(0); }, [selectedSegmentId]);

  // 현재 선택 구간의 스킬 목록
  const skills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  const multiSkill = skills.length > 1;

  // ── 다음 스킬로 전진 ────────────────────────────────────────────────
  const advanceSkill = useCallback(() => {
    setSkillIdx(prev => (prev + 1) % Math.max(skills.length, 1));
  }, [skills.length]);

  // ── AUTO 타이머 관리 ────────────────────────────────────────────────
  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const startAutoTimer = useCallback(() => {
    clearAutoTimer();
    autoTimerRef.current = setInterval(advanceSkill, AUTO_INTERVAL_MS);
  }, [advanceSkill]);

  useEffect(() => {
    if (autoMode && multiSkill) {
      startAutoTimer();
    } else {
      clearAutoTimer();
    }
    return clearAutoTimer;
  }, [autoMode, multiSkill, startAutoTimer]);

  // ── 수동 스킬 전환 (AUTO 켜져 있으면 타이머 리셋) ───────────────────
  const goSkill = useCallback((idx) => {
    setSkillIdx(idx);
    if (autoMode && multiSkill) startAutoTimer();
  }, [autoMode, multiSkill, startAutoTimer]);

  // During 이외 단계에서는 렌더하지 않음
  if (phase !== 'during') return null;

  const skill   = skills[skillIdx] ?? null;
  const catMeta = skill ? getCategoryMeta(skill.id) : null;
  const color   = catMeta?.color ?? '#9b7fc8';
  const items   = skill?.during ?? [];
  const checks  = selectedSegment?.checks ?? [];

  // 구간 번호 계산
  const segments  = activeScore?.segments ?? [];
  const segNumber = segments.findIndex(s => s.id === selectedSegmentId) + 1;

  const makeKey = (itemIdx) => `${skill?.id ?? 'none'}_${itemIdx}`;
  const isDone  = (itemIdx) => checks.includes(makeKey(itemIdx));
  const toggle  = (itemIdx) => {
    if (!selectedSegmentId || !skill) return;
    segmentActs.toggleSegmentCheck(selectedSegmentId, makeKey(itemIdx));
  };

  // ── 구간 미선택 플레이스홀더 ──────────────────────────────────────
  if (!selectedSegmentId || !selectedSegment) {
    return (
      <div
        className="flex-shrink-0 flex items-center justify-center px-4"
        style={{
          height: 48,
          background: 'rgba(13,17,23,0.88)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="font-mono text-[11px] text-[rgba(255,255,255,.25)]">
          악보 위 구간 박스를 탭하여 연습 목표를 로드하세요
        </span>
      </div>
    );
  }

  // ── 스킬 미매핑 구간 ────────────────────────────────────────────────
  if (skills.length === 0) {
    return (
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{
          height: 48,
          background: 'rgba(13,17,23,0.88)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: 'rgba(155,127,200,.15)', color: '#9b7fc8' }}
        >
          {segNumber > 0 ? `${segNumber}구간` : '구간 선택됨'}
        </span>
        <span className="text-[11px] text-[rgba(255,255,255,.3)]">
          이 구간에 매핑된 스킬이 없습니다 — Before 단계에서 스킬을 추가하세요
        </span>
      </div>
    );
  }

  // ── 메인 HUD ──────────────────────────────────────────────────────
  return (
    <div
      className="flex-shrink-0 flex items-stretch gap-0 px-0"
      style={{
        minHeight: 76,
        background: 'linear-gradient(180deg, rgba(10,14,20,0.97) 0%, rgba(13,17,23,0.88) 100%)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* ── 왼쪽: 구간번호(1줄) + 스킬ID·이름(2줄) ── */}
      <div
        className="flex flex-col justify-center gap-1 px-4 py-2 flex-shrink-0"
        style={{
          minWidth: 100,
          maxWidth: 120,
          borderRight: '1px solid rgba(255,255,255,.07)',
        }}
      >
        {/* 줄 1 — 구간 번호 */}
        <span
          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded self-start leading-none"
          style={{ background: `${color}1a`, color }}
        >
          {segNumber > 0 ? `${segNumber}구간` : '구간'}
        </span>

        {/* 줄 2 — 스킬 ID + 스킬명 */}
        <div className="flex flex-col gap-[2px]">
          <span
            className="font-mono text-[9px] leading-none"
            style={{ color: `${color}99` }}
          >
            {skill.id}
          </span>
          <span
            className="text-[11.5px] font-semibold leading-tight"
            style={{ color: 'rgba(255,255,255,.88)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {skill.name}
          </span>
        </div>
      </div>

      {/* ── 가운데: 체크리스트 3줄 ── */}
      <div className="flex flex-col justify-center gap-[6px] px-4 py-2 flex-1 min-w-0">
        {items.map((text, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="flex items-center gap-2 text-left w-full group"
          >
            <CheckCircle done={isDone(i)} index={i} color={color} />
            <span
              className={[
                'text-[11.5px] leading-snug transition-colors duration-150',
                isDone(i)
                  ? 'line-through text-[rgba(255,255,255,.25)]'
                  : i === 0
                    ? 'font-semibold text-[rgba(255,255,255,.9)] group-hover:text-white'
                    : 'text-[rgba(255,255,255,.62)] group-hover:text-[rgba(255,255,255,.85)]',
              ].join(' ')}
            >
              {text}
            </span>
          </button>
        ))}
      </div>

      {/* ── 오른쪽: 스킬 네비게이션 컨트롤 (다중 스킬일 때만) ── */}
      {multiSkill && (
        <div
          className="flex flex-col justify-center items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderLeft: '1px solid rgba(255,255,255,.07)', minWidth: 80 }}
        >
          {/* < 현재/전체 > */}
          <div className="flex items-center gap-1">
            <Btn onClick={() => goSkill((skillIdx - 1 + skills.length) % skills.length)} title="이전 스킬">
              ‹
            </Btn>
            <span className="font-mono text-[10px] text-[rgba(255,255,255,.3)] w-8 text-center select-none">
              {skillIdx + 1}/{skills.length}
            </span>
            <Btn onClick={() => goSkill((skillIdx + 1) % skills.length)} title="다음 스킬">
              ›
            </Btn>
          </div>

          {/* AUTO 토글 */}
          <Btn
            onClick={() => setAutoMode(m => !m)}
            active={autoMode}
            title={autoMode ? `AUTO 켜짐 · ${AUTO_INTERVAL_MS / 1000}초마다 자동 전환` : 'AUTO 모드 켜기'}
          >
            ⏱ AUTO
          </Btn>

          {/* 스킬 점 인디케이터 */}
          <div className="flex gap-[5px] items-center">
            {skills.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => goSkill(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width:  i === skillIdx ? 10 : 5,
                  height: 5,
                  background: i === skillIdx ? color : 'rgba(255,255,255,.18)',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
