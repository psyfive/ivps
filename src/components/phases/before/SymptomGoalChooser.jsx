// src/components/phases/before/SymptomGoalChooser.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 1단계: 증상/목표 선택 칩.
// 100개 스킬을 훑는 대신, 사용자가 "이 구간의 문제"를 먼저 고르도록 유도한다.
// 선택된 증상은 RecommendedSkillList의 추천 풀을 결정한다.
// ─────────────────────────────────────────────────────────────────────────────

export function SymptomGoalChooser({ categories, active, onPick }) {
  return (
    <div>
      <div className="text-[10.5px] text-[var(--ivps-text3)] leading-relaxed mb-2">
        이 구간에서 가장 거슬리는 문제는 무엇인가요?
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map(category => {
          const isActive = active === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onPick(isActive ? null : category.id)}
              title={category.hint}
              className={[
                'px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all text-left',
                isActive
                  ? 'bg-[var(--ivps-gold-bg)] border-[var(--ivps-gold-border)] text-[var(--ivps-gold)]'
                  : 'bg-[var(--ivps-surface2)] border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:border-[var(--ivps-plum-border)]',
              ].join(' ')}
              aria-pressed={isActive}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
