// src/components/phases/before/RecommendedSkillList.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 2단계: 선택된 증상에 대한 추천 스킬 Top-N (기본 노출).
// 카드를 탭하면 해당 구간에 즉시 매핑된다. 각 카드는 "왜 추천되는지"를
// 매칭된 진단 증상 한 줄로 보여줘 사용자의 선택을 돕는다.
// ─────────────────────────────────────────────────────────────────────────────
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../../data/taxonomy';
import { setSkillDragData } from '../../../utils/skillDrag';

export function RecommendedSkillList({ recs, onMap }) {
  if (!recs || recs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ivps-border2)] px-3 py-4 text-center text-[10.5px] text-[var(--ivps-text4)]">
        이 증상에 대한 추천 스킬이 없습니다. 아래 “전체 스킬 검색”을 이용하세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {recs.map(rec => {
        const skill = getSkillById(rec.skillId);
        if (!skill) return null;
        const meta = getCategoryMeta(skill.id);
        const displayName = getSkillDisplayName(skill);
        const reason = rec.matchedSymptoms?.[0] ?? skill.corePrinciple ?? '';
        return (
          <button
            key={rec.skillId}
            type="button"
            draggable
            onDragStart={event => setSkillDragData(event, rec.skillId)}
            onClick={() => onMap(rec.skillId)}
            className="group flex items-start gap-2 w-full text-left rounded-lg border p-2.5 transition-all hover:shadow-[0_0_0_1px_var(--ivps-gold-border)] select-none cursor-pointer"
            style={{ background: `${meta.color}08`, borderColor: `${meta.color}28` }}
            title={`${displayName} 매핑`}
          >
            <span
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors"
              style={{ background: `${meta.color}1c`, color: meta.color }}
            >
              ＋
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[8.5px] px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: `${meta.color}16`, color: meta.color }}>
                  {skill.id}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--ivps-text1)] leading-tight whitespace-normal break-words">
                  {displayName}
                </span>
              </div>
              {reason && (
                <div className="mt-1 text-[10px] text-[var(--ivps-text4)] leading-[1.4] line-clamp-2">
                  <span className="text-[var(--ivps-text3)]">관련 증상 · </span>{reason}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
