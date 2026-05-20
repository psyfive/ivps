// src/components/phases/DiagnosticInterface.jsx
import { useState, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../data/taxonomy';
import { requestNativeFullscreen } from '../../utils/nativeFullscreen';

function DiagCell({ label, color, value }) {
  return (
    <div className="bg-[var(--ivps-surface2)] rounded-lg p-3 border border-[var(--ivps-border)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9.5px] uppercase tracking-[.07em] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="text-[12px] text-[var(--ivps-text1)] leading-relaxed">{value}</div>
    </div>
  );
}

function SkillDiagPanel({
  skill,
  skillIndex = 0,
  skillCount = 1,
  onPrevSkill,
  onNextSkill,
}) {
  const [activeDiagIdx, setActiveDiagIdx] = useState(0);
  const catMeta = getCategoryMeta(skill.id);
  const displayName = getSkillDisplayName(skill);
  const showSkillSwitcher = skillCount > 1 && onPrevSkill && onNextSkill;

  useEffect(() => {
    setActiveDiagIdx(0);
  }, [skill.id]);

  const afterArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = afterArr[activeDiagIdx] ?? afterArr[0];

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: `${catMeta.color}18`, color: catMeta.color }}
          >
            {skill.id}
          </span>
          <span className="font-serif text-[14px] font-semibold text-[var(--ivps-text1)] truncate min-w-0">
            {displayName}
          </span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {showSkillSwitcher && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrevSkill}
                  aria-label="Previous skill"
                  title="Previous skill"
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
                  aria-label="Next skill"
                  title="Next skill"
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--ivps-border)] text-[13px] font-mono text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:bg-[var(--ivps-surface2)] transition-colors"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
              Case {i + 1}
            </button>
          ))}
        </div>
      )}

      {activeDiag && (
        <div
          className="rounded-xl border overflow-hidden mb-3"
          style={{ borderColor: 'rgba(224,112,112,.2)' }}
        >
          <div
            className="px-3 py-2 border-b text-[10.5px] font-semibold flex items-center gap-1.5"
            style={{
              background: 'rgba(224,112,112,.06)',
              borderColor: 'rgba(224,112,112,.15)',
              color: '#e07070',
            }}
          >
            {'\uC9C4\uB2E8 \uD3EC\uC778\uD2B8'}
          </div>
          <div className="grid grid-cols-3 gap-2 p-2.5">
            <DiagCell label={'\uC99D\uC0C1'} color="#e07070" value={activeDiag.symptom} />
            <DiagCell label={'\uC6D0\uC778'} color="#d4a843" value={activeDiag.cause} />
            <DiagCell label={'\uCC98\uBC29'} color="#7ea890" value={activeDiag.prescription} />
          </div>
        </div>
      )}

      {activeDiag?.prescription && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)]">
          <span className="text-[14px] flex-shrink-0">!</span>
          <div>
            <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">
              {'\uCC98\uBC29 \uD3EC\uCEE4\uC2A4'}
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

export function DifficultyMarker({ segment, segmentActs }) {
  if (!segment || segment.difficulty !== 'hard') return null;

  return (
    <div
      className="rounded-xl border p-3.5 flex items-center justify-between gap-3"
      style={{ background: 'rgba(224,112,112,0.06)', borderColor: 'rgba(224,112,112,0.25)' }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[.07em] mb-0.5" style={{ color: '#e07070' }}>
          {'\uC5B4\uB824\uC6B4 \uAD6C\uAC04\uC73C\uB85C \uD45C\uC2DC\uB428'}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--ivps-text4)' }}>
          {'\uB2E4\uC74C \uC5F0\uC2B5\uC5D0\uC11C \uBE68\uAC04 \uB450\uB974\uB85C \uAC15\uC870\uD569\uB2C8\uB2E4.'}
        </div>
      </div>
      <button
        onClick={() => segmentActs.setSegmentDifficulty(segment.id, null)}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all hover:scale-[1.02]"
        style={{ background: 'rgba(126,168,144,0.1)', borderColor: 'rgba(126,168,144,0.3)', color: '#7ea890' }}
      >
        {'\uD574\uC81C'}
      </button>
    </div>
  );
}

function XpLogger({ skills = [], scoreId, segmentId, onHardResult }) {
  const { xp } = usePractice();
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

  const labels = [
    { result: 'success', label: '\uC131\uACF5', xp: 30, color: '#7ea890' },
    { result: 'ok', label: '\uBCF4\uD1B5', xp: 15, color: '#d4a843' },
    { result: 'hard', label: '\uC5B4\uB824\uC6C0', xp: 5, color: '#e07070' },
  ];

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'rgba(212,168,67,.05)', borderColor: 'rgba(212,168,67,.18)' }}
    >
      <div className="text-[10.5px] text-[var(--ivps-gold)] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5">
        {'\uC5F0\uC2B5 \uACB0\uACFC \uAE30\uB85D'}
        {logged && (
          <span className="ml-auto text-[var(--ivps-moss)] font-normal">{'\uAE30\uB85D\uB428'}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {labels.map(({ result, label, xp: xpVal, color }) => (
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
    </div>
  );
}

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
  const [activeSkillDiagIdx, setActiveSkillDiagIdx] = useState(0);

  const segments = activeScore?.segments ?? [];
  const segmentIndex = segments.findIndex(s => s.id === selectedSegmentId);
  const segmentSkills = (selectedSegment?.mappedSkills ?? [])
    .map(id => getSkillById(id))
    .filter(Boolean);

  useEffect(() => {
    setActiveSkillDiagIdx(0);
  }, [selectedSegmentId]);

  const returnToDuring = useCallback(() => {
    ui.setPracticeFullscreen(true);
    requestNativeFullscreen();
    nav.setPhase('during');
  }, [nav, ui]);

  if (!selectedSegment && !activeSkill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-[38px] opacity-20">-</div>
        <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
          {'During \uB2E8\uACC4\uC5D0\uC11C \uAD6C\uAC04\uC744 \uC120\uD0DD\uD558\uBA74'}
          <br />
          {'\uD574\uB2F9 \uAD6C\uAC04\uC758 \uC790\uAC00 \uD3C9\uAC00\uB97C \uBCFC \uC218 \uC788\uC5B4\uC694.'}
        </div>
        <button
          onClick={returnToDuring}
          className="px-4 py-2 bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded-lg text-[var(--ivps-text2)] text-[12px] hover:bg-[#222b3d] transition-colors"
        >
          {'During\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
        </button>
      </div>
    );
  }

  if (selectedSegment) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-[var(--ivps-border)]">
          <div className="flex items-center justify-between">
            <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
              {'\uC790\uAC00 \uD3C9\uAC00'} · {segmentIndex + 1}{'\uAD6C\uAC04'}
            </div>
            <button
              onClick={returnToDuring}
              className="text-[10px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
            >
              {'\uB2E4\uC2DC \uC5F0\uC2B5'}
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {segmentSkills.length === 0 ? (
              <span className="text-[11px] text-[var(--ivps-text4)]">{'\uC2A4\uD0AC \uC5C6\uC74C'}</span>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {segmentSkills.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-[var(--ivps-text4)]">
              {'\uC774 \uAD6C\uAC04\uC5D0 \uB9E4\uD551\uB41C \uC2A4\uD0AC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {segmentSkills.map((sk, idx) => (
                <div key={sk.id}>
                  {idx > 0 && <div className="h-px bg-[var(--ivps-surface2)] mb-6" />}
                  <SkillDiagPanel skill={sk} />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 mt-5">
            <div className="bg-[var(--ivps-surface)] rounded-lg p-3 border border-[var(--ivps-border)]">
              <div className="text-[9.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] mb-1.5">
                {'\uB9E4\uD551 \uC2A4\uD0AC'}
              </div>
              <div className="font-mono text-[22px] font-semibold leading-none" style={{ color: '#d4a843' }}>
                {selectedSegment.mappedSkills?.length ?? 0}
              </div>
            </div>
          </div>

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

  const skill = activeSkill;
  const diagArr = Array.isArray(skill.after) ? skill.after : [skill.after];
  const activeDiag = diagArr[activeSkillDiagIdx] ?? diagArr[0];
  const displayName = getSkillDisplayName(skill);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="text-[10.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold">
          {'\uC790\uAC00 \uC9C4\uB2E8'}
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
            {displayName}
          </span>
        </div>

        {diagArr.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {diagArr.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSkillDiagIdx(i)}
                className={[
                  'px-2.5 py-1 rounded-full border text-[10.5px] transition-colors',
                  activeSkillDiagIdx === i
                    ? 'bg-[rgba(224,112,112,.12)] border-[rgba(224,112,112,.3)] text-[var(--ivps-rust)]'
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)]',
                ].join(' ')}
              >
                Case {i + 1}
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
              {'\uC9C4\uB2E8 \uD3EC\uC778\uD2B8'}
            </div>
            <div className="grid grid-cols-3 gap-2 p-2.5">
              <DiagCell label={'\uC99D\uC0C1'} color="#e07070" value={activeDiag.symptom} />
              <DiagCell label={'\uC6D0\uC778'} color="#d4a843" value={activeDiag.cause} />
              <DiagCell label={'\uCC98\uBC29'} color="#7ea890" value={activeDiag.prescription} />
            </div>
          </div>
        )}

        {activeDiag?.prescription && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.15)] mb-4">
            <span className="text-[14px] flex-shrink-0">!</span>
            <div>
              <div className="text-[10px] text-[var(--ivps-gold)] font-semibold uppercase tracking-wide mb-1">
                {'\uCC98\uBC29 \uD3EC\uCEE4\uC2A4'}
              </div>
              <div className="text-[12px] text-[var(--ivps-gold)] leading-relaxed">{activeDiag.prescription}</div>
            </div>
          </div>
        )}

        <XpLogger skills={[skill.id]} scoreId={null} segmentId={null} />
      </div>
    </div>
  );
}

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
        <div className="text-[32px] opacity-20">-</div>
        <div className="text-[12px] text-[var(--ivps-text3)] leading-relaxed">
          {'During \uB2E8\uACC4\uC5D0\uC11C \uAD6C\uAC04\uC744 \uC120\uD0DD\uD558\uBA74'}
          <br />
          {'\uC9C4\uB2E8/\uCC98\uBC29\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
        </div>
      </div>
    );
  }

  return (
    <>
      {segmentSkills.length === 0 ? (
        <div className="text-center py-8 text-[12px] text-[var(--ivps-text4)]">
          {'\uC774 \uAD6C\uAC04\uC5D0 \uB9E4\uD551\uB41C \uC2A4\uD0AC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
        </div>
      ) : (
        <SkillDiagPanel
          skill={activeSkill}
          skillIndex={safeSkillIdx}
          skillCount={skillCount}
          onPrevSkill={handlePrevSkill}
          onNextSkill={handleNextSkill}
        />
      )}

      <div className="grid grid-cols-1 gap-2.5 mt-5">
        <div className="bg-[var(--ivps-surface)] rounded-lg p-3 border border-[var(--ivps-border)]">
          <div className="text-[9.5px] text-[var(--ivps-text3)] uppercase tracking-[.07em] mb-1.5">
            {'\uB9E4\uD551 \uC2A4\uD0AC'}
          </div>
          <div className="font-mono text-[22px] font-semibold leading-none" style={{ color: '#d4a843' }}>
            {selectedSegment.mappedSkills?.length ?? 0}
          </div>
        </div>
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
