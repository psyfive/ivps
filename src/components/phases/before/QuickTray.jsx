// src/components/phases/before/QuickTray.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Quick Tray — 악보를 넘어 유지되는 빠른 매핑 목록 (기존 ScoreQuickTray 이동).
// ─────────────────────────────────────────────────────────────────────────────
import { getSkillById, getCategoryMeta, getSkillDisplayName } from '../../../data/taxonomy';
import { setSkillDragData } from '../../../utils/skillDrag';

export function QuickTray({ quickTraySkillIds, selectedSegmentId, onTapMap, onRemove }) {
  const skills = (quickTraySkillIds ?? []).map(id => getSkillById(id)).filter(Boolean);

  return (
    <div className="mt-2 pt-2 border-t border-[var(--ivps-border)]">
      <div className="text-[9.5px] uppercase tracking-[.07em] text-[var(--ivps-gold)] mb-1.5 flex items-center gap-1">
        <span>★</span> Quick Tray
      </div>
      {skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--ivps-border2)] px-3 py-2 text-center text-[10.5px] text-[var(--ivps-text4)]">
          전체 스킬 검색의 ☆를 켜면 여기에 저장됩니다.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {skills.map(s => {
            const meta = getCategoryMeta(s.id);
            const isDisabled = !selectedSegmentId;
            const displayName = getSkillDisplayName(s);
            return (
              <div
                key={s.id}
                draggable
                onDragStart={event => setSkillDragData(event, s.id)}
                className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-full border text-[10px] transition-opacity select-none ${isDisabled ? 'cursor-grab hover:opacity-90' : 'cursor-pointer hover:opacity-90'}`}
                style={{ background: `${meta.color}10`, borderColor: `${meta.color}30`, color: meta.color }}
                title={isDisabled ? `${displayName} - 구간으로 드래그하거나 먼저 구간을 선택하세요` : `${displayName} 매핑`}
                onClick={() => { if (!isDisabled) onTapMap(s.id); }}
              >
                <span className="text-[11px] text-[var(--ivps-text2)] max-w-[116px] leading-[1.25] whitespace-normal break-words">{displayName}</span>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onRemove(s.id); }}
                  className="ml-0.5 w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity text-[10px]"
                  title="Quick Tray에서 제거"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
