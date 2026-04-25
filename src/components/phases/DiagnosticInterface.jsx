// src/components/phases/DiagnosticInterface.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — AFTER
// 연습 후 자가 진단 인터페이스.
// 선택된 구간(segment)의 mappedSkills 기반으로 증상/원인/처방 표시 + 체크리스트.
// XP 결과 기록.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';

// ── 진단 셀 ────────────────────────────────────────────────────────────────
function DiagCell({ label, color, value }) {
  return (
    <div className="bg-[var(--ivps-surface2)] rounded-lg p-3 border border-[var(--ivps-border)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="inline-block w-1 h-1 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-[9.5px] uppercase tracking-[.07em] font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <div className="text-[12px] text-[var(--ivps-text1)] leading-relaxed">
        {value}
      </div>
    </div>
  );
}

// ── 체크리스트 항목 ────────────────────────────────────────────────────────
function CheckItem({ text, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-2.5 py-2.5 border-b border-[var(--ivps-border)] last:border-0 last:pb-0 text-left group transition-colors"
    >
      <div
        className={[
          'w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 border transition-all',
          checked
            ? 'bg-[#7ea890] border-[#7ea890] text-white'
            : 'border-[var(--ivps-border2)] bg-transparent group-hover:border-[#7ea890]',
        ].join(' ')}
      >
        {checked ? '✓' : ''}
      </div>
      <span
        className={[
          'text-[12px] leading-relaxed transition-colors',
          checked ? 'text-[var(--ivps-text3)] line-through' : 'text-[#c8d0dc]',
        ].join(' ')}
      >
        {text}
      </span>
    </button>
  );
}

// ── 단일 스킬 진단 패널 ────────────────────────────────────────────────────
function SkillDiagPanel({
  skill,
  segmentId,
  checks,
  onToggleCheck,
  skillIndex = 0,
  skillCount = 1,
  onPrevSkill,
  onNextSkill,
}) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const catMeta = getCategoryMeta(skill.id);
  const showSkillSwitcher = skillCount > 1 && onPrevSkill && onNextSkill;

  useEffect(() => {
    setActiveDiagIdx(0);
  }, [skill.id]);

  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = afterArr[activeDiagIdx] ?? afterArr[0];

  const checkKeys = skill.during.map((_, i) => `during_${i}`);
  const checkedCount = checkKeys.filter(k => checks.includes(k)).length;
  const total = checkKeys.length;
  const allOk = checkedCount >= total;

  return (
    <div>
      {/* 스킬 배지 + During 체크리스트 */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: `${catMeta.color}18`, color: catMeta.color }}
          >
            {skill.id}
          </span>
          <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)] truncate min-w-0">
            {skill.name}
          </span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {showSkillSwitcher && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrevSkill}
                  aria-label="이전 스킬 보기"
                  title="이전 스킬 보기"
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--ivps-border)] text-[13px] font-mono text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:bg-[var(--ivps-surface2)] transition-colors"
                >
                  &lt;
                </button>
                <span className="min-w-[32px] text-center font-mono text-[10px] text-[var(--ivps-text4)]">
                  {skillIndex + 1}/{skillCount}
                </span>
                <button
                  type="button"
                  onClick={onNextSkill}
                  aria-label="다음 스킬 보기"
                  title="다음 스킬 보기"
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--ivps-border)] text-[13px] font-mono text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:bg-[var(--ivps-surface2)] transition-colors"
                >
                  &gt;
                </button>
              </div>
            )}
            <span className="font-mono text-[10px] text-[var(--ivps-plum)]">
              {checkedCount}/{total}
            </span>
          </div>
        </div>

        {/* During 체크리스트 */}
        <div className="bg-[var(--ivps-surface)] rounded-xl border border-[var(--ivps-border)] overflow-hidden mb-3">
          <div className="px-3 py-2 border-b border-[var(--ivps-border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              During 체크리스트
            </span>
            <div className="h-1 rounded-full overflow-hidden w-20 bg-[var(--ivps-surface2)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${total > 0 ? (checkedCount / total) * 100 : 0}%`,
                  background: allOk ? '#7ea890' : '#9b7fc8',
                }}
              />
            </div>
          </div>
          <div className="px-3 py-1">
            {skill.during.map((item, i) => (
              <CheckItem
                key={i}
                text={item}
                checked={checks.includes(checkKeys[i])}
                onToggle={() => onToggleCheck(segmentId, checkKeys[i])}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 진단 케이스 탭 */}
      {afterArr.length > 1 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {afterArr.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveDiagIdx(i)}
              className={[
                'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                activeDiagIdx === i
                  ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.3)] text-[var(--ivps-rust)]'
                  : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
              ].join(' ')}
            >
              케이스 {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 증상·원인·처방 */}
      {activeDiag && (
        <div
          className="rounded-xl border overflow-hidden mb-3"
          style={{ borderColor: allOk ? 'rgba(126,168,144,.25)' : 'rgba(224,112,112,.2)' }}
        >
          <div
            className="px-3 py-2 border-b text-[10.5px] font-semibold flex items-center gap-1.5"
            style={{
              background: allOk ? 'rgba(126,168,144,.06)' : 'rgba(224,112,112,.06)',
              borderColor: allOk ? 'rgba(126,168,144,.15)' : 'rgba(224,112,112,.15)',
              color: allOk ? '#7ea890' : '#e07070',
            }}
          >
            {allOk ? '✓ 체크 완료 — 잘 되고 있습니다!' : '⚠ 트러블슈팅'}
          </div>
          <div className="grid grid-cols-3 gap-2 p-2.5">
            <DiagCell label="증상" color="#e07070" value={activeDiag.symptom} />
            <DiagCell label="원인" color="#d4a843" value={activeDiag.cause} />
            <DiagCell label="처방" color="#7ea890" value={activeDiag.prescription} />
          </div>
        </div>
      )}

      {/* 처방 드릴 강조 */}
      {!allOk && activeDiag?.prescription && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)]">
          <span className="text-[14px] flex-shrink-0">💊</span>
          <div>
            <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">
              처방 드릴
            </div>
            <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">
              {activeDiag.prescription}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 구간 난이도 마커 — hard 상태일 때만 표시 ─────────────────────────────
export function DifficultyMarker({ segment, segmentActs }) {
  if (!segment || segment.difficulty !== 'hard') return null;

  return (
    <div
      className="rounded-xl border p-3.5 flex items-center justify-between gap-3"
      style={{ background: 'rgba(224,112,112,0.06)', borderColor: 'rgba(224,112,112,0.25)' }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[.07em] mb-0.5" style={{ color: '#e07070' }}>
          ⚠ 어려운 구간으로 표시됨
        </div>
        <div className="text-[11px]" style={{ color: 'var(--ivps-text4)' }}>
          다음 연습 시 빨간 테두리로 강조됩니다.
        </div>
      </div>
      <button
        onClick={() => segmentActs.setSegmentDifficulty(segment.id, null)}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all hover:scale-[1.02]"
        style={{ background: 'rgba(126,168,144,0.1)', borderColor: 'rgba(126,168,144,0.3)', color: '#7ea890' }}
      >
        ✓ 해결했어요
      </button>
    </div>
  );
}

// ── XP 결과 기록 ──────────────────────────────────────────────────────────
function XpLogger({ skills = [], scoreId, segmentId, onHardResult }) {
  const { xp, nav } = usePractice();
  const [logged, setLogged] = useState(false);
  const skillKey = skills.join('|');

  useEffect(() => {
    setLogged(false);
  }, [skillKey, scoreId, segmentId]);

  const handleLog = useCallback((result) => {
    skills.forEach(skillId => xp.logXp(skillId, result, scoreId, segmentId));
    if (result === 'hard') onHardResult?.();
    setLogged(true);
  }, [skills, xp, scoreId, segmentId, onHardResult]);

  const XP_MAP = { success: 30, ok: 15, hard: 5 };
  const LABELS = [
    { result: 'success', label: '🎯 성공적', xp: XP_MAP.success, color: '#7ea890' },
    { result: 'ok',      label: '😐 보통',   xp: XP_MAP.ok,      color: '#d4a843' },
    { result: 'hard',    label: '😣 어려웠음', xp: XP_MAP.hard,   color: '#e07070' },
  ];

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'rgba(212,168,67,.05)', borderColor: 'rgba(212,168,67,.18)' }}
    >
      <div className="text-[10.5px] text-[var(--ivps-gold)] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5">
        🏆 연습 결과 기록
        {logged && (
          <span className="ml-auto text-[var(--ivps-moss)] font-normal">✓ 기록됨</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LABELS.map(({ result, label, xp: xpVal, color }) => (
          <button
            key={result}
            onClick={() => handleLog(result)}
            disabled={logged}
            className={[
              'py-2.5 rounded-lg text-[11.5px] font-medium border transition-all',
              logged ? 'opacity-40 cursor-default' : 'hover:scale-[1.02]',
            ].join(' ')}
            style={{ background: `${color}12`, borderColor: `${color}30`, color }}
          >
            {label}
            <div className="text-[9px] opacity-70 mt-0.5">+{xpVal} XP</div>
          </button>
        ))}
      </div>
      {logged && (
        <div className="mt-3 text-center">
          <button
            onClick={() => nav.setPhase('before')}
            className="text-[11px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
          >
            다음 스킬 연습하기 →
          </button>
        </div>
      )}
    </div>
  );
}

// ── DiagnosticInterface (메인) ─────────────────────────────────────────────
export function DiagnosticInterface() {
  const {
    activeSkill,
    activeScore,
    selectedSegmentId,
    selectedSegment,
    segment: segmentActs,
    nav,
    ui,
  } = usePractice();

  const segments = activeScore?.segments ?? [];
  const segmentIndex = segments.findIndex(s => s.id === selectedSegmentId);

  const segmentSkills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  const hasContent = selectedSegment || activeSkill;
  const returnToDuring = useCallback(() => {
    ui.setPracticeFullscreen(true);
    requestNativeFullscreen();
    nav.setPhase('during');
  }, [nav, ui]);

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-[38px] opacity-20">🔍</div>
        <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
          During 단계에서 구간을 선택하면<br />해당 구간의 자가 평가를 할 수 있어요.
          {segments.length === 0 && (
            <>
              <br />
              <span className="text-[11px] text-[var(--ivps-text4)]">
                Before 탭에서 구간을 먼저 설정하세요.
              </span>
            </>
          )}
        </div>
        <button
          onClick={returnToDuring}
          className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
        >
          ← During으로 돌아가기
        </button>
      </div>
    );
  }

  // ── 구간 선택 시: segment 기반 진단 ────────────────────────────────
  if (selectedSegment) {
    const checks = selectedSegment.checks ?? [];

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 구간 헤더 */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-[var(--ivps-border)]">
          <div className="flex items-center justify-between">
            <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              ✓ 자가 평가 · {segmentIndex + 1}구간
            </div>
            <button
              onClick={returnToDuring}
              className="text-[10px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
            >
              ← 다시 연습
            </button>
          </div>
          {/* 매핑 스킬 태그 */}
          <div className="flex gap-1.5 flex-wrap mt-2">
            {segmentSkills.length === 0 ? (
              <span className="text-[11px] text-[var(--ivps-text4)]">스킬 없음</span>
            ) : (
              segmentSkills.map(sk => {
                const meta = getCategoryMeta(sk.id);
                return (
                  <span
                    key={sk.id}
                    className="px-2 py-0.5 rounded-full text-[10.5px] border"
                    style={{ background: `${meta.color}10`, borderColor: `${meta.color}25`, color: meta.color }}
                  >
                    {sk.id} {sk.name}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* 스크롤 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {segmentSkills.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-[var(--ivps-text4)]">
              이 구간에 매핑된 스킬이 없습니다.<br />
              <span className="text-[11px]">Before 탭에서 구간에 스킬을 매핑하세요.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {segmentSkills.map((sk, idx) => (
                <div key={sk.id}>
                  {idx > 0 && <div className="h-px bg-[var(--ivps-surface2)] mb-6" />}
                  <SkillDiagPanel
                    skill={sk}
                    segmentId={selectedSegment.id}
                    checks={checks}
                    onToggleCheck={segmentActs.toggleSegmentCheck}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 통계 요약 */}
          <div className="grid grid-cols-2 gap-2.5 mt-5">
            {[
              { label: '완성 체크', value: `${checks.length}`, color: '#9b7fc8' },
              { label: '매핑 스킬', value: `${selectedSegment.mappedSkills?.length ?? 0}개`, color: '#d4a843' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--ivps-surface)] rounded-lg p-3 border border-[var(--ivps-border)]">
                <div className="text-[9.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] mb-1.5">
                  {label}
                </div>
                <div className="font-mono text-[22px] font-semibold leading-none" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* XP 기록 + 난이도 마커 */}
          {segmentSkills.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <XpLogger
                skills={selectedSegment.mappedSkills}
                scoreId={activeScore?.id ?? null}
                segmentId={selectedSegmentId}
                onHardResult={() => segmentActs.setSegmentDifficulty(selectedSegment.id, 'hard')}
              />
              <DifficultyMarker segment={selectedSegment} segmentActs={segmentActs} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 구간 없음: activeSkill 단독 진단 ──────────────────────────────────
  const skill = activeSkill;
  const diagArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const activeDiag = diagArr[activeDiagIdx];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
          자가 진단 · 증상·원인·처방
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: `${getCategoryMeta(skill.id).color}18`,
              color: getCategoryMeta(skill.id).color,
            }}
          >
            {skill.id}
          </span>
          <span className="font-serif text-[16px] font-semibold text-[var(--ivps-text1)]">
            {skill.name}
          </span>
        </div>

        {diagArr.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {diagArr.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveDiagIdx(i)}
                className={[
                  'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                  activeDiagIdx === i
                    ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.3)] text-[var(--ivps-rust)]'
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)]',
                ].join(' ')}
              >
                케이스 {i + 1}
              </button>
            ))}
          </div>
        )}

        {activeDiag && (
          <div
            className="rounded-xl border overflow-hidden mb-4"
            style={{ borderColor: 'rgba(224,112,112,.2)' }}
          >
            <div
              className="px-3 py-2 border-b text-[10.5px] font-semibold text-[var(--ivps-rust)]"
              style={{ background: 'rgba(224,112,112,.06)', borderColor: 'rgba(224,112,112,.15)' }}
            >
              ⚠ 트러블슈팅
            </div>
            <div className="grid grid-cols-3 gap-2 p-2.5">
              <DiagCell label="증상" color="#e07070" value={activeDiag.symptom} />
              <DiagCell label="원인" color="#d4a843" value={activeDiag.cause} />
              <DiagCell label="처방" color="#7ea890" value={activeDiag.prescription} />
            </div>
          </div>
        )}

        {activeDiag?.prescription && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)] mb-4">
            <span className="text-[14px] flex-shrink-0">💊</span>
            <div>
              <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">처방 드릴</div>
              <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">{activeDiag.prescription}</div>
            </div>
          </div>
        )}

        <XpLogger skills={[skill.id]} scoreId={null} segmentId={null} />
      </div>
    </div>
  );
}

// ── DiagnosticContent — AfterBottomSheet 재사용용 ─────────────────────────
export function DiagnosticContent() {
  const {
    activeScore,
    selectedSegmentId,
    selectedSegment,
    segment: segmentActs,
  } = usePractice();

  const mappedSkillIds = selectedSegment?.mappedSkills ?? [];
  const mappedSkillKey = mappedSkillIds.join('|');
  const [activeSkillIdx, setActiveSkillIdx] = useState(0);

  useEffect(() => {
    setActiveSkillIdx(0);
  }, [selectedSegmentId, mappedSkillKey]);

  const segmentSkills = mappedSkillIds
    .map(id => getSkillById(id))
    .filter(Boolean);
  const skillCount = segmentSkills.length;
  const safeSkillIdx = skillCount > 0 && activeSkillIdx < skillCount ? activeSkillIdx : 0;
  const activeSkill = segmentSkills[safeSkillIdx] ?? null;
  const xpTargetSkillIds = activeSkill ? [activeSkill.id] : [];

  const handlePrevSkill = useCallback(() => {
    setActiveSkillIdx(idx => {
      if (skillCount <= 0) return 0;
      const safeIdx = idx < skillCount ? idx : 0;
      return (safeIdx - 1 + skillCount) % skillCount;
    });
  }, [skillCount]);

  const handleNextSkill = useCallback(() => {
    setActiveSkillIdx(idx => {
      if (skillCount <= 0) return 0;
      const safeIdx = idx < skillCount ? idx : 0;
      return (safeIdx + 1) % skillCount;
    });
  }, [skillCount]);

  if (!selectedSegment) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="text-[32px] opacity-20">🔍</div>
        <div className="text-[12px] text-[var(--ivps-text3)] leading-relaxed">
          During 단계에서 구간을 선택하면<br />진단/처방을 확인할 수 있습니다.
        </div>
      </div>
    );
  }

  const checks = selectedSegment.checks ?? [];

  return (
    <>
      {segmentSkills.length === 0 ? (
        <div className="text-center py-8 text-[12px] text-[var(--ivps-text4)]">
          이 구간에 매핑된 스킬이 없습니다.
        </div>
      ) : (
        <SkillDiagPanel
          skill={activeSkill}
          segmentId={selectedSegment.id}
          checks={checks}
          onToggleCheck={segmentActs.toggleSegmentCheck}
          skillIndex={safeSkillIdx}
          skillCount={skillCount}
          onPrevSkill={handlePrevSkill}
          onNextSkill={handleNextSkill}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        {[
          { label: '완성 체크', value: `${checks.length}`, color: '#9b7fc8' },
          { label: '매핑 스킬', value: `${selectedSegment.mappedSkills?.length ?? 0}개`, color: '#d4a843' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--ivps-surface)] rounded-lg p-3 border border-[var(--ivps-border)]">
            <div className="text-[9.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] mb-1.5">{label}</div>
            <div className="font-mono text-[22px] font-semibold leading-none" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {segmentSkills.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <XpLogger
            skills={xpTargetSkillIds}
            scoreId={activeScore?.id ?? null}
            segmentId={selectedSegmentId}
            onHardResult={() => segmentActs.setSegmentDifficulty(selectedSegment.id, 'hard')}
          />
          <DifficultyMarker segment={selectedSegment} segmentActs={segmentActs} />
        </div>
      )}
    </>
  );
}
