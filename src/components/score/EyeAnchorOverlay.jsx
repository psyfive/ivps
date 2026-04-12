// src/components/score/EyeAnchorOverlay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// During Phase — Eye-Anchor Transparent Overlay
//
// 악보 위에 스킬 체크포인트를 극저투명도(30% 미만)로 겹쳐 표시.
// 연주자의 시선 이동(좌→우)을 방해하지 않으면서 '잔상'처럼 뇌에 인지되도록 설계.
//
// 선택된 구간:
//   - during[0] : 22% opacity, gold — 핵심 키워드, 4초 pulse 애니메이션
//   - during[1~2]: 12% opacity, purple
// 미선택 구간:
//   - 스킬명: 6% opacity, neutral — 수동적 존재감
// ─────────────────────────────────────────────────────────────────────────────
import { getSkillById, getCategoryMeta } from '../../data/taxonomy';

// ── CSS keyframe 주입 (한 번만) ────────────────────────────────────────────
const STYLE_ID = 'eye-anchor-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes eye-anchor-pulse {
      0%, 100% { opacity: 0.15; }
      50%       { opacity: 0.24; }
    }
    @keyframes eye-anchor-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .eye-anchor-pulse {
      animation: eye-anchor-pulse 4s ease-in-out infinite;
    }
    .eye-anchor-fadein {
      animation: eye-anchor-fade-in 1.2s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// ── 좌표 → CSS 위치 변환 ───────────────────────────────────────────────────
function coordToStyle(coord) {
  return {
    position: 'absolute',
    left:   `${coord.x      * 100}%`,
    top:    `${coord.y      * 100}%`,
    width:  `${coord.width  * 100}%`,
    height: `${coord.height * 100}%`,
    pointerEvents: 'none',
    overflow: 'hidden',
  };
}

// ── 선택된 구간 박스 ──────────────────────────────────────────────────────
function SelectedBox({ coord }) {
  const skills = coord._skills;
  const checkpoints = skills.flatMap(sk => sk.during ?? []);
  if (checkpoints.length === 0) return null;

  const rowCount  = checkpoints.length;
  const padV = 0.08; // 상하 여백 (박스 높이 비율)
  const rowH = (1 - padV * 2) / Math.max(rowCount, 1);

  return (
    <div style={coordToStyle(coord)} className="eye-anchor-fadein">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          padding: `${padV * 100}% 4%`,
        }}
      >
        {checkpoints.map((text, i) => {
          const isKey = i === 0;
          const catMeta = skills[0] ? getCategoryMeta(skills[0].id) : null;
          const baseColor = isKey
            ? '#d4a843'
            : catMeta?.color ?? '#9b7fc8';

          return (
            <div
              key={i}
              className={isKey ? 'eye-anchor-pulse' : undefined}
              style={{
                color: baseColor,
                fontSize: 'clamp(8px, 1.3vw, 13px)',
                fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
                fontWeight: isKey ? 600 : 400,
                letterSpacing: isKey ? '0.04em' : '0.02em',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mixBlendMode: 'screen',
                // opacity는 pulse 클래스 또는 인라인
                opacity: isKey ? undefined : 0.12,
                userSelect: 'none',
              }}
            >
              {isKey ? '◈\u2009' : '·\u2009'}{text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 미선택 구간 박스 ──────────────────────────────────────────────────────
function PassiveBox({ coord }) {
  const skills = coord._skills;
  if (skills.length === 0) return null;

  return (
    <div style={coordToStyle(coord)}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          padding: '8% 5%',
        }}
      >
        {skills.map(sk => {
          const catMeta = getCategoryMeta(sk.id);
          return (
            <div
              key={sk.id}
              style={{
                color: catMeta?.color ?? '#888',
                opacity: 0.07,
                fontSize: 'clamp(7px, 1vw, 11px)',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 500,
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mixBlendMode: 'screen',
                userSelect: 'none',
              }}
            >
              {sk.id} {sk.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export function EyeAnchorOverlay({ segments, selectedSegmentId, currentPageIndex }) {
  if (!segments || segments.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 6, pointerEvents: 'none' }}
    >
      {segments.map(seg => {
        const isSelected = seg.id === selectedSegmentId;
        const skills = (seg.mappedSkills ?? [])
          .map(id => getSkillById(id))
          .filter(Boolean);

        // 현재 페이지에 해당하는 좌표만
        const pageCoords = (seg.coordinates ?? [])
          .filter(c => c.pageIndex === currentPageIndex)
          .map(c => ({ ...c, _skills: skills }));

        if (pageCoords.length === 0) return null;

        return pageCoords.map((coord, ci) =>
          isSelected
            ? <SelectedBox key={`${seg.id}-${ci}`} coord={coord} />
            : <PassiveBox  key={`${seg.id}-${ci}`} coord={coord} />
        );
      })}
    </div>
  );
}
