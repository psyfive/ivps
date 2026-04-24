// src/components/dashboard/DashboardView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// v3의 "오늘의 연습" (스탯 카드 + 최근 스킬 + 복습 정원) +
// v4의 "악보 갤러리" (썸네일 그리드 + 업로드)를 하나의 뷰로 통합.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useState, useMemo } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { TAXONOMY, getCategoryMeta, getSkillById } from '../../data/taxonomy';
import { fileToPageData } from '../../utils/fileToPageData';
import { SkillDetailModal } from '../library/SkillDetailModal';
import { PracticeHeatmap } from './PracticeHeatmap';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
function formatDateLong(ts) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// ── XP / 레벨 계산 ────────────────────────────────────────────────────────
function calcStats(xpLog) {
  const totalXP     = xpLog.reduce((s, e) => s + e.xp, 0);
  const level       = Math.floor(totalXP / 500) + 1;
  return { totalXP, level };
}

// ─────────────────────────────────────────────────────────────────────────────
// SymptomQuickEntry — 증상 기반 퀵 온보딩
// ─────────────────────────────────────────────────────────────────────────────
const ALL_SYMPTOMS = (() => {
  const seen = new Set();
  return TAXONOMY.flatMap(skill =>
    (skill.after ?? []).map(a => ({ symptom: a.symptom, skillId: skill.id }))
  ).filter(({ symptom }) => {
    if (seen.has(symptom)) return false;
    seen.add(symptom);
    return true;
  });
})();

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function SymptomQuickEntry({ query = '', onSelect }) {
  const randomFour = useMemo(() => pickRandom(ALL_SYMPTOMS, 4), []);
  const displayed = query.trim()
    ? ALL_SYMPTOMS.filter(s => s.symptom.includes(query.trim()))
    : randomFour;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--ivps-text3)', lineHeight: 1.55 }}>
        오늘 어떤 소리가 마음에 안 드시나요?
      </div>

      {query.trim() ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
          {displayed.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ivps-text4)', padding: '8px 0' }}>
              일치하는 증상이 없습니다.
            </div>
          ) : displayed.map((entry, i) => (
            <button
              key={i}
              onClick={() => onSelect(entry)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 8,
                border: '1px solid var(--ivps-border)',
                background: 'var(--ivps-surface2)',
                color: 'var(--ivps-text2)', fontSize: 11.5,
                textAlign: 'left', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,67,.45)';
                e.currentTarget.style.background = 'rgba(212,168,67,.06)';
                e.currentTarget.style.color = 'var(--ivps-gold)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--ivps-border)';
                e.currentTarget.style.background = 'var(--ivps-surface2)';
                e.currentTarget.style.color = 'var(--ivps-text2)';
              }}
            >
              <span>{entry.symptom}</span>
              <span style={{
                fontSize: 9, fontFamily: 'ui-monospace, monospace', fontWeight: 700,
                padding: '1px 5px', borderRadius: 4,
                background: 'var(--ivps-surface)', border: '1px solid var(--ivps-border2)',
                color: 'var(--ivps-text4)', flexShrink: 0, marginLeft: 6,
              }}>{entry.skillId}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {randomFour.map((entry, i) => (
            <button
              key={i}
              onClick={() => onSelect(entry)}
              style={{
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--ivps-border2)',
                background: 'var(--ivps-surface2)',
                color: 'var(--ivps-text2)', fontSize: 11.5, fontWeight: 500,
                textAlign: 'left', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,67,.45)';
                e.currentTarget.style.background = 'rgba(212,168,67,.06)';
                e.currentTarget.style.color = 'var(--ivps-gold)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--ivps-border2)';
                e.currentTarget.style.background = 'var(--ivps-surface2)';
                e.currentTarget.style.color = 'var(--ivps-text2)';
              }}
            >
              {entry.symptom}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--ivps-text4)', lineHeight: 1.5 }}>
        증상을 선택하면 관련 스킬을 바로 찾아드립니다.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 추천 코스 카드 (placeholder — 기능 미구현)
// ─────────────────────────────────────────────────────────────────────────────
const COURSE_STUBS = [
  { cat: 'A', label: '왼손 테크닉 기초', desc: '기초 셋업·음정·스케일', color: '#7ea890' },
  { cat: 'B', label: '보잉 톤 클리닉',   desc: '활 그립·톤·스피카토',  color: '#d4a843' },
  { cat: 'C', label: '음악성 심화',       desc: '프레이징·리듬·호흡',  color: '#9b7fc8' },
];

function CourseCardsSection() {
  return (
    <div className="flex flex-col gap-2">
      {COURSE_STUBS.map(c => (
        <div
          key={c.cat}
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl border"
          style={{
            background: `${c.color}08`,
            borderColor: `${c.color}22`,
          }}
        >
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0"
            style={{ background: `${c.color}18`, color: c.color }}
          >
            {c.cat}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-[var(--ivps-text1)] truncate">{c.label}</div>
            <div className="text-[10.5px] text-[var(--ivps-text4)] mt-0.5">{c.desc}</div>
          </div>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'var(--ivps-surface2)',
              border: '1px solid var(--ivps-border)',
              color: 'var(--ivps-text4)',
            }}
          >
            준비 중
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 최근 세션 패널
// ─────────────────────────────────────────────────────────────────────────────
function RecentSessionRow({ session, onResume }) {
  const skillCount = session.skillIds?.length ?? 0;
  const meta = skillCount > 0 ? getCategoryMeta(session.skillIds[0]) : null;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] mb-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-[var(--ivps-text1)] truncate">{session.scoreName}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-[var(--ivps-text4)]">{formatDate(session.date)}</span>
          {skillCount > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${meta?.color ?? '#888'}15`, color: meta?.color ?? '#888' }}
            >
              {skillCount}스킬
            </span>
          )}
          {session.xpGained > 0 && (
            <span className="text-[9px] font-mono text-[var(--ivps-gold)]">+{session.xpGained}XP</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onResume(session.scoreId)}
        className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all"
        style={{
          background: 'rgba(212,168,67,.12)',
          border: '1px solid rgba(212,168,67,.25)',
          color: '#d4a843',
        }}
      >
        이어서 ›
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreRailCard — 가로 레일 악보 카드
// ─────────────────────────────────────────────────────────────────────────────
function ScoreRailCard({ score, onOpen, onRename, onDelete }) {
  const segmentCount = score.segments?.length ?? score.sessions?.length ?? 0;
  const pageCount    = score.pageData?.length ?? 1;

  return (
    <div
      className="group relative flex-shrink-0 w-[148px] rounded-xl border overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        borderColor: 'var(--ivps-border)',
        background: 'var(--ivps-surface2)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--ivps-gold-border)';
        e.currentTarget.style.background = 'var(--ivps-surface)';
        e.currentTarget.style.boxShadow = '0 4px 20px var(--ivps-gold-bg)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--ivps-border)';
        e.currentTarget.style.background = 'var(--ivps-surface2)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => onOpen(score.id)}
    >
      {/* 썸네일 */}
      <div className="h-[96px] overflow-hidden relative" style={{ background: 'var(--ivps-surface2)' }}>
        <img
          src={score.dataUrl}
          alt={score.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          draggable={false}
        />
        {/* 그라디언트 오버레이 */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(100,70,30,.45) 100%)' }}
        />
        {/* 상단 배지들 */}
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
          {pageCount > 1 && (
            <span className="bg-[rgba(212,168,67,.85)] text-[#0d1117] text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full">
              {pageCount}p
            </span>
          )}
          {segmentCount > 0 && (
            <span className="bg-[rgba(155,127,200,.85)] text-white text-[8px] font-mono px-1.5 py-0.5 rounded-full">
              {segmentCount}구간
            </span>
          )}
        </div>
      </div>

      {/* 정보 */}
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="text-[11.5px] font-semibold text-[var(--ivps-text1)] truncate leading-tight" title={score.name}>
          {score.name}
        </div>
        <div className="text-[9.5px] font-mono text-[var(--ivps-text4)] mt-0.5">
          {formatDate(score.uploadedAt)}
        </div>
      </div>

      {/* 호버 액션 */}
      <div
        className="absolute inset-0 flex items-end justify-center gap-2 pb-2.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(100,70,30,.75) 100%)' }}
      >
        <button
          onClick={e => { e.stopPropagation(); onRename(score.id); }}
          className="flex-1 py-1 text-[9.5px] rounded-md transition-colors pointer-events-auto"
          style={{
            color: 'var(--ivps-text2)',
            background: 'var(--ivps-surface)',
            border: '1px solid var(--ivps-border2)',
          }}
        >
          이름
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(score.id); }}
          className="flex-1 py-1 text-[9.5px] rounded-md transition-colors pointer-events-auto"
          style={{
            color: 'var(--ivps-rust)',
            background: 'var(--ivps-rust-bg)',
            border: '1px solid var(--ivps-rust-border)',
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreSection — 최상단 악보 업로드/갤러리 섹션
// ─────────────────────────────────────────────────────────────────────────────
function ScoreSection({ scores, onOpen, onRename, onDelete, onUpload }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  }, [onUpload]);

  // ── 빈 상태: 히어로 업로드 존 ─────────────────────────────────────
  if (scores.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onUpload(null)}
        className="relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 mb-7"
        style={{
          border: `2px dashed ${dragOver ? 'var(--ivps-gold-border)' : 'var(--ivps-border2)'}`,
          background: dragOver ? 'var(--ivps-gold-bg)' : 'var(--ivps-surface)',
          transform: dragOver ? 'scale(1.005)' : 'scale(1)',
        }}
      >
        {/* 배경 음표 데코 */}
        <div
          className="absolute top-4 right-8 text-[80px] leading-none select-none pointer-events-none"
          style={{ color: 'rgba(212,168,67,.06)', fontFamily: 'serif' }}
        >
          𝄞
        </div>
        <div
          className="absolute bottom-4 left-10 text-[48px] leading-none select-none pointer-events-none"
          style={{ color: 'rgba(155,127,200,.05)', fontFamily: 'serif' }}
        >
          𝄢
        </div>

        <div className="flex flex-col items-center justify-center py-14 px-8 text-center relative z-10">
          {/* 아이콘 */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all"
            style={{
              background: dragOver ? 'rgba(212,168,67,.18)' : 'rgba(212,168,67,.1)',
              border: '1.5px solid rgba(212,168,67,.3)',
              boxShadow: dragOver ? '0 0 28px rgba(212,168,67,.2)' : '0 0 0 rgba(212,168,67,0)',
            }}
          >
            <span className="text-[28px] leading-none">
              {dragOver ? '⬇' : '🎼'}
            </span>
          </div>

          <h2 className="font-serif text-[19px] font-bold text-[var(--ivps-text1)] mb-2 leading-snug">
            {dragOver ? '파일을 놓아 업로드' : '악보를 업로드해 연습을 시작하세요'}
          </h2>
          <p className="text-[12px] text-[var(--ivps-text3)] mb-7 max-w-[380px] leading-relaxed">
            악보 이미지나 PDF를 업로드하면<br />
            구간 설정 → 스킬 매핑 → 3단계 연습 분석이 모두 시작됩니다.
          </p>

          <div
            className="px-5 py-2.5 rounded-xl text-[#0d1117] text-[13px] font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #d4a843 0%, #b8891f 100%)',
              boxShadow: '0 4px 16px rgba(212,168,67,.3)',
            }}
          >
            + 악보 업로드
          </div>

          <div className="flex items-center gap-2 mt-4">
            {['PNG', 'JPG', 'PDF', 'WebP'].map(fmt => (
              <span
                key={fmt}
                className="text-[9px] font-mono tracking-wider"
                style={{
                  color: 'var(--ivps-text4)',
                  background: 'var(--ivps-surface2)',
                  border: '1px solid var(--ivps-border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 악보 있음: 가로 스크롤 레일 ──────────────────────────────────────
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="mb-7 rounded-2xl border transition-all duration-200 overflow-hidden"
      style={{
        borderColor: dragOver ? 'var(--ivps-gold-border)' : 'var(--ivps-border)',
        background: dragOver ? 'var(--ivps-gold-bg)' : 'var(--ivps-surface)',
        boxShadow: dragOver ? '0 0 0 2px var(--ivps-gold-bg)' : 'none',
      }}
    >
      {/* 레일 헤더 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px]">🎼</span>
          <span className="text-[11px] text-[var(--ivps-text2)] font-semibold tracking-[.03em]">
            악보 라이브러리
          </span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
            style={{
              color: 'rgba(212,168,67,.7)',
              background: 'rgba(212,168,67,.08)',
              border: '1px solid rgba(212,168,67,.15)',
            }}
          >
            {scores.length}개
          </span>
        </div>

        <button
          onClick={() => onUpload(null)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(212,168,67,.15) 0%, rgba(212,168,67,.08) 100%)',
            border: '1px solid rgba(212,168,67,.3)',
            color: '#d4a843',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,168,67,.15) 0%, rgba(212,168,67,.08) 100%)'}
        >
          <span className="text-[13px] leading-none">+</span>
          악보 추가
        </button>
      </div>

      {/* 드래그 힌트 배너 */}
      {dragOver && (
        <div
          className="mx-5 mb-3 py-2 rounded-lg text-center text-[11px] font-semibold"
          style={{
            background: 'rgba(212,168,67,.1)',
            border: '1.5px dashed rgba(212,168,67,.5)',
            color: '#d4a843',
          }}
        >
          ⬇ 파일을 여기에 놓아 업로드
        </div>
      )}

      {/* 가로 스크롤 레일 */}
      <div
        className="flex gap-3 px-5 pb-4 overflow-x-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ivps-border) transparent' }}
      >
        {scores.map(sc => (
          <ScoreRailCard
            key={sc.id}
            score={sc}
            onOpen={onOpen}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}

        {/* 새 악보 추가 카드 */}
        <div
          onClick={() => onUpload(null)}
          className="flex-shrink-0 w-[148px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          style={{ height: 148, borderColor: 'var(--ivps-border2)', color: 'var(--ivps-text4)' }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--ivps-gold-border)';
            e.currentTarget.style.color = 'var(--ivps-gold)';
            e.currentTarget.style.background = 'var(--ivps-gold-bg)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--ivps-border2)';
            e.currentTarget.style.color = 'var(--ivps-text4)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span className="text-[24px] leading-none">+</span>
          <span className="text-[11px] font-medium">새 악보</span>
          <span className="text-[9px] font-mono" style={{ opacity: 0.5 }}>PNG · JPG · PDF</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold">
        {title}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — 다크 패널 래퍼
// ─────────────────────────────────────────────────────────────────────────────
function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`bg-[var(--ivps-surface)] border border-[var(--ivps-border)] rounded-[10px] p-4 ${className}`}>
      <SectionHeader title={title} action={action} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardView — 메인
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardView() {
  const {
    scores,
    xpLog,
    practiceSessions,
    nav,
    score: scoreActs,
  } = usePractice();

  const fileInputRef = useRef(null);
  const [symptomQuery,   setSymptomQuery]   = useState('');
  const [symptomSkillId, setSymptomSkillId] = useState(null);
  const symptomSkill = symptomSkillId ? getSkillById(symptomSkillId) : null;

  const { totalXP, level } = calcStats(xpLog);
  const today = formatDateLong(Date.now());
  const recentSessions = practiceSessions.slice(0, 5);

  // ── 악보 업로드 핸들러 ────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('파일 용량이 50MB를 초과합니다.\n50MB 이하의 악보만 업로드할 수 있습니다.');
      return;
    }
    try {
      const { name, pages } = await fileToPageData(file);
      scoreActs.addScore(name, pages);
    } catch (err) {
      alert(err.message || '파일 처리 중 오류가 발생했습니다.');
    }
  }, [scoreActs]);

  const handleFileChange = useCallback(e => {
    const f = e.target.files[0];
    if (f) { handleFile(f); e.target.value = ''; }
  }, [handleFile]);

  const handleScoreUpload = useCallback((fileOrNull) => {
    if (fileOrNull) handleFile(fileOrNull);
    else fileInputRef.current?.click();
  }, [handleFile]);

  const handleOpen = useCallback(id => {
    scoreActs.setActiveScore(id);
  }, [scoreActs]);

  const handleRename = useCallback(id => {
    const sc = scores.find(s => s.id === id);
    if (!sc) return;
    const n = prompt('악보 이름 변경:', sc.name);
    if (n?.trim()) scoreActs.renameScore(id, n.trim());
  }, [scores, scoreActs]);

  const handleDelete = useCallback(id => {
    if (window.confirm('이 악보와 모든 세션을 삭제할까요?')) {
      scoreActs.deleteScore(id);
    }
  }, [scoreActs]);

  const handleResume = useCallback(scoreId => {
    scoreActs.setActiveScore(scoreId);
  }, [scoreActs]);

  const handleSymptomSelect = useCallback(({ skillId }) => {
    setSymptomSkillId(skillId);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="px-7 py-6 max-w-[900px]">

        {/* ── 페이지 헤더 ── */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-[22px] font-bold text-[var(--ivps-text1)] mb-0.5">
              오늘의 연습
            </h1>
            <div className="text-[11.5px] text-[var(--ivps-text3)]">{today}</div>
          </div>
          <span
            className="font-mono text-[11px] px-2.5 py-1 rounded-lg"
            style={{
              background: 'rgba(212,168,67,.08)',
              border: '1px solid rgba(212,168,67,.18)',
              color: '#d4a843',
            }}
          >
            Lv.{level} · {totalXP} XP
          </span>
        </div>

        {/* ── 악보 섹션 ── */}
        <ScoreSection
          scores={scores}
          onOpen={handleOpen}
          onRename={handleRename}
          onDelete={handleDelete}
          onUpload={handleScoreUpload}
        />

        {/* ── 2열: 추천 코스 | 증상 퀵 진입 ── */}
        <div className="grid grid-cols-2 gap-4 mb-5">

          {/* 추천 연습 코스 (placeholder) */}
          <Panel
            title="🗺 추천 연습 코스"
            action={
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--ivps-surface2)',
                  border: '1px solid var(--ivps-border)',
                  color: 'var(--ivps-text4)',
                }}
              >
                Beta
              </span>
            }
          >
            <CourseCardsSection />
          </Panel>

          {/* 오늘의 증상 — 퀵 온보딩 */}
          <Panel
            title="🩺 오늘의 증상"
            action={
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none" style={{ color: 'var(--ivps-text4)' }}>🔍</span>
                <input
                  type="text"
                  value={symptomQuery}
                  onChange={e => setSymptomQuery(e.target.value)}
                  placeholder="증상 검색…"
                  className="pl-6 pr-3 py-1 rounded-lg border bg-[var(--ivps-surface2)] text-[11px] outline-none w-28 transition-colors"
                  style={{
                    color: 'var(--ivps-text1)',
                    borderColor: 'var(--ivps-border)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(212,168,67,.4)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--ivps-border)'; }}
                />
              </div>
            }
          >
            <SymptomQuickEntry query={symptomQuery} onSelect={handleSymptomSelect} />
          </Panel>
        </div>

        {/* ── 하단 2열: 히트맵(좌) + 최근 세션(우) ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">

          {/* 좌하단: 100일 10×10 히트맵 */}
          <Panel title="🗓 100일 연습 기록">
            <PracticeHeatmap practiceSessions={practiceSessions} xpLog={xpLog} />
          </Panel>

          {/* 우하단: 최근 연습 세션 */}
          <Panel
            title="🕐 최근 연습 세션"
            action={
              <span className="text-[10px] font-mono text-[var(--ivps-text4)]">
                {practiceSessions.length}회
              </span>
            }
          >
            {recentSessions.length === 0 ? (
              <div className="text-center py-5 text-[12px] text-[var(--ivps-text4)]">
                아직 세션 기록이 없어요.<br />
                <button
                  onClick={() => nav.navigate('library')}
                  className="mt-2 text-[var(--ivps-gold)] hover:underline"
                >
                  연습 시작하기 →
                </button>
              </div>
            ) : (
              <div>
                {recentSessions.map(s => (
                  <RecentSessionRow key={s.id} session={s} onResume={handleResume} />
                ))}
              </div>
            )}
          </Panel>
        </div>

      </div>

      {symptomSkill && (
        <SkillDetailModal
          skill={symptomSkill}
          onClose={() => setSymptomSkillId(null)}
          onStartPractice={id => { nav.goSkillPractice(id); setSymptomSkillId(null); }}
        />
      )}
    </div>
  );
}
