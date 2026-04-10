// src/components/phases/DiagnosticInterface.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — AFTER
// 연습 후 자가 진단 인터페이스.
// 세션 클릭 → 해당 세션 스킬의 증상/원인/처방 표시 + 체크리스트.
// XP 결과 기록.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta } from '../../data/taxonomyData';

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
function SkillDiagPanel({ skill, sessionId, checks, onToggleCheck }) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const catMeta = getCategoryMeta(skill.id);

  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = afterArr[activeDiagIdx] ?? afterArr[0];

  // 체크리스트 키 = during 항목 인덱스
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
          <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)]">
            {skill.name}
          </span>
          <span className="ml-auto font-mono text-[10px] text-[var(--ivps-plum)]">
            {checkedCount}/{total}
          </span>
        </div>

        {/* During 체크리스트 */}
        <div className="bg-[var(--ivps-surface)] rounded-xl border border-[var(--ivps-border)] overflow-hidden mb-3">
          <div className="px-3 py-2 border-b border-[var(--ivps-border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              During 체크리스트
            </span>
            <div
              className="h-1 rounded-full overflow-hidden w-20 bg-[var(--ivps-surface2)]"
            >
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
                onToggle={() => onToggleCheck(sessionId, checkKeys[i])}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 진단 케이스 탭 (여러 개일 때) */}
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
            {allOk ? '✓ 체크 완료 — 잘 되고 있습니다!' : `⚠ 트러블슈팅`}
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

// ── XP 결과 기록 ──────────────────────────────────────────────────────────
function XpLogger({ sessionId, skills }) {
  const { xp, nav } = usePractice();
  const [logged, setLogged] = useState(false);

  const handleLog = useCallback((result) => {
    skills.forEach(skillId => xp.logXp(skillId, result));
    setLogged(true);
  }, [skills, xp]);

  const XP_MAP = { success: 30, ok: 15, hard: 5 };
  const LABELS = [
    { result: 'success', label: '🎯 성공적', xp: XP_MAP.success, color: '#7ea890' },
    { result: 'ok',      label: '😐 보통',   xp: XP_MAP.ok,      color: '#d4a843' },
    { result: 'hard',    label: '😣 어려웠음', xp: XP_MAP.hard,   color: '#e07070' },
  ];

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: 'rgba(212,168,67,.05)',
        borderColor: 'rgba(212,168,67,.18)',
      }}
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
            style={{
              background: `${color}12`,
              borderColor: `${color}30`,
              color,
            }}
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
    activeSession,
    activeScore,
    session: sessionActs,
    nav,
  } = usePractice();

  // 선택된 세션이 있으면 그걸 우선, 없으면 activeSkill로 단독 진단
  const sessions = activeScore?.sessions ?? [];
  const session  = activeSession;

  // 세션의 스킬들
  const sessionSkills = (session?.skills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  // 세션도 없고 activeSkill도 없는 경우
  const hasContent = session || activeSkill;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-[38px] opacity-20">🔍</div>
        <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
          악보 위의 빨간 구간을 클릭하면<br />해당 세션의 자가 평가를 할 수 있어요.
          {sessions.length === 0 && (
            <>
              <br />
              <span className="text-[11px] text-[var(--ivps-text4)]">
                During 탭에서 구간을 먼저 설정하세요.
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => nav.setPhase('during')}
          className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
        >
          ← During으로 돌아가기
        </button>
      </div>
    );
  }

  // ── 세션 선택 시 세션 기반 진단 ─────────────────────────────────────
  if (session) {
    const checks = session.checks ?? [];

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 세션 헤더 */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-[var(--ivps-border)]">
          <div className="flex items-center justify-between">
            <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              ✓ 자가 평가
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => nav.setPhase('during')}
                className="text-[10px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
              >
                ← 다시 연습
              </button>
              <button
                onClick={() => sessionActs.deleteSession(session.id)}
                className="text-[10px] text-[var(--ivps-rust)] hover:underline transition-colors"
              >
                세션 삭제
              </button>
            </div>
          </div>
          {/* 할당 스킬 태그 */}
          <div className="flex gap-1.5 flex-wrap mt-2">
            {sessionSkills.length === 0 ? (
              <span className="text-[11px] text-[var(--ivps-text4)]">스킬 없음</span>
            ) : (
              sessionSkills.map(sk => {
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
          {/* 스킬별 진단 패널 */}
          {sessionSkills.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-[var(--ivps-text4)]">
              이 세션에 할당된 스킬이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {sessionSkills.map((sk, idx) => (
                <div key={sk.id}>
                  {idx > 0 && <div className="h-px bg-[var(--ivps-surface2)] mb-6" />}
                  <SkillDiagPanel
                    skill={sk}
                    sessionId={session.id}
                    checks={checks}
                    onToggleCheck={sessionActs.toggleCheck}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 통계 요약 */}
          <div className="grid grid-cols-2 gap-2.5 mt-5">
            {[
              {
                label: '완성 체크',
                value: `${session.checks?.length ?? 0}`,
                color: '#9b7fc8',
              },
              {
                label: '할당 스킬',
                value: `${session.skills?.length ?? 0}개`,
                color: '#d4a843',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--ivps-surface)] rounded-lg p-3 border border-[var(--ivps-border)]">
                <div className="text-[9.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] mb-1.5">
                  {label}
                </div>
                <div
                  className="font-mono text-[22px] font-semibold leading-none"
                  style={{ color }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* XP 기록 */}
          {sessionSkills.length > 0 && (
            <div className="mt-4">
              <XpLogger
                sessionId={session.id}
                skills={session.skills}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 세션 없음: activeSkill 단독 진단 ──────────────────────────────────
  const skill  = activeSkill;
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

        {/* 스킬 헤더 */}
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

        {/* 케이스 탭 */}
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

        {/* 진단 그리드 */}
        {activeDiag && (
          <div
            className="rounded-xl border overflow-hidden mb-4"
            style={{ borderColor: 'rgba(224,112,112,.2)' }}
          >
            <div
              className="px-3 py-2 border-b text-[10.5px] font-semibold text-[var(--ivps-rust)]"
              style={{
                background: 'rgba(224,112,112,.06)',
                borderColor: 'rgba(224,112,112,.15)',
              }}
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

        {/* 처방 강조 */}
        {activeDiag?.prescription && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)] mb-4">
            <span className="text-[14px] flex-shrink-0">💊</span>
            <div>
              <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">처방 드릴</div>
              <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">{activeDiag.prescription}</div>
            </div>
          </div>
        )}

        {/* XP 기록 */}
        <XpLogger sessionId={null} skills={[skill.id]} />
      </div>
    </div>
  );
}
