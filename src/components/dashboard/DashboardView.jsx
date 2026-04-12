// src/components/dashboard/DashboardView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// v3의 "오늘의 연습" (스탯 카드 + 최근 스킬 + 복습 정원) +
// v4의 "악보 갤러리" (썸네일 그리드 + 업로드)를 하나의 뷰로 통합.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { TAXONOMY, getCategoryMeta } from '../../data/taxonomy';
import { PracticeHeatmap } from './PracticeHeatmap';

// ── 파일 → pageData 변환 (ScoreViewer와 동일한 로직, 공통 util로 이동 가능) ──
async function fileToPageData(file, onProgress) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
  const isPDF   = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  if (isImage) {
    const dataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    return { name, pages: [{ dataUrl, sessions: [] }] };
  }

  if (isPDF) {
    // pdf.js CDN 동적 로드
    if (!window.pdfjsLib) {
      await new Promise(res => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        s.onload = () => {
          window.pdfjsLib = window['pdfjs-dist/build/pdf'];
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          res();
        };
        document.head.appendChild(s);
      });
    }
    const ab = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument(new Uint8Array(ab)).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages);
      const pg = await pdf.getPage(i);
      const vp = pg.getViewport({ scale: 1.5 });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      pages.push({ dataUrl: cv.toDataURL('image/png'), sessions: [] });
    }
    return { name, pages };
  }

  throw new Error('이미지 또는 PDF 파일만 지원합니다.');
}

// ── 날짜 포맷 ──────────────────────────────────────────────────────────────
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
  const xpToNext    = 500 - (totalXP % 500);
  const xpPct       = Math.round(((totalXP % 500) / 500) * 100);
  return { totalXP, level, xpToNext, xpPct };
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-[10px] px-4 py-3.5 border"
      style={{
        background: accent ? 'rgba(212,168,67,.07)' : '#131720',
        borderColor: accent ? 'rgba(212,168,67,.22)' : '#1a2035',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[.07em] mb-1.5 font-medium"
        style={{ color: accent ? '#d4a843' : '#4a5568' }}
      >
        {label}
      </div>
      <div
        className="font-serif text-[22px] font-bold leading-none mb-1"
        style={{ color: accent ? '#d4a843' : '#e8e2d6' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10.5px] text-[var(--ivps-text4)] mt-1">{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LevelBar — XP 레벨 진행 바
// ─────────────────────────────────────────────────────────────────────────────
function LevelBar({ level, xpPct, xpToNext }) {
  return (
    <div className="bg-[var(--ivps-surface)] border border-[var(--ivps-border)] rounded-[10px] px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--ivps-gold)] bg-[rgba(212,168,67,.1)] border border-[rgba(212,168,67,.2)] px-2 py-0.5 rounded">
            Lv.{level}
          </span>
          <span className="text-[11px] text-[var(--ivps-text3)]">다음 레벨까지</span>
        </div>
        <span className="font-mono text-[11px] text-[var(--ivps-text3)]">{xpToNext} XP</span>
      </div>
      <div className="h-1.5 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${xpPct}%`,
            background: 'linear-gradient(90deg,#d4a843,#b8891f)',
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecentSkillRow — 최근 연습 스킬 1행
// ─────────────────────────────────────────────────────────────────────────────
function RecentSkillRow({ skill, onStart }) {
  const meta = getCategoryMeta(skill.id);
  const pct  = Math.round((skill.xp / skill.maxXp) * 100);

  return (
    <button
      onClick={() => onStart(skill.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--ivps-surface2)] transition-colors group"
    >
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: `${meta.color}18`, color: meta.color }}
      >
        {skill.id}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[12.5px] text-[var(--ivps-text1)] truncate">{skill.name}</div>
        <div className="h-[3px] bg-[var(--ivps-surface2)] rounded-full mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: meta.color }}
          />
        </div>
      </div>
      <span className="font-mono text-[10px] text-[var(--ivps-text4)] flex-shrink-0">Lv.{skill.level}</span>
      <span className="text-[var(--ivps-text4)] text-[12px] group-hover:text-[var(--ivps-text2)] transition-colors">›</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewRow — 복습 정원 1행
// ─────────────────────────────────────────────────────────────────────────────
function ReviewRow({ skill, onStart }) {
  const meta = getCategoryMeta(skill.id);
  const pct  = Math.round((skill.xp / skill.maxXp) * 100);

  return (
    <button
      onClick={() => onStart(skill.id)}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[rgba(126,168,144,.12)] bg-[rgba(126,168,144,.05)] hover:bg-[rgba(126,168,144,.09)] transition-colors group mb-2"
    >
      <div className="text-left">
        <div className="text-[12.5px] text-[var(--ivps-text1)]">{skill.name}</div>
        <div className="text-[10.5px] text-[var(--ivps-moss)] mt-0.5">
          XP {skill.xp}/{skill.maxXp} · 복습 필요
        </div>
      </div>
      <span className="text-[var(--ivps-moss)] text-[13px]">›</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreThumb — 악보 썸네일 카드
// ─────────────────────────────────────────────────────────────────────────────
function ScoreThumb({ score, onOpen, onRename, onDelete }) {
  const sessionCount = score.sessions?.length ?? 0;
  const pageCount    = score.pageData?.length ?? 1;

  return (
    <div className="bg-[var(--ivps-surface)] border border-[var(--ivps-border)] rounded-[10px] overflow-hidden cursor-pointer group transition-all hover:border-[rgba(212,168,67,.3)] hover:bg-[#171e2c]">
      {/* 이미지 영역 */}
      <div
        className="h-[110px] bg-[var(--ivps-bg)] overflow-hidden flex items-center justify-center relative"
        onClick={() => onOpen(score.id)}
      >
        <img
          src={score.dataUrl}
          alt={score.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
        {/* 오버레이 뱃지들 */}
        <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none">
          {sessionCount > 0 && (
            <div className="self-end bg-[rgba(0,0,0,.6)] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">
              {sessionCount}개 세션
            </div>
          )}
          {pageCount > 1 && (
            <div className="self-start bg-[rgba(0,0,0,.6)] text-[var(--ivps-gold)] text-[9px] font-mono px-1.5 py-0.5 rounded-full">
              {pageCount}p
            </div>
          )}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="px-3 py-2" onClick={() => onOpen(score.id)}>
        <div className="text-[12.5px] font-medium text-[var(--ivps-text1)] truncate" title={score.name}>
          {score.name}
        </div>
        <div className="text-[10.5px] font-mono text-[var(--ivps-text4)] mt-0.5">
          {formatDate(score.uploadedAt)}
        </div>
      </div>

      {/* 호버 액션 */}
      <div className="px-2.5 pb-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onRename(score.id); }}
          className="flex-1 py-1 text-[10.5px] text-[var(--ivps-text3)] bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] rounded hover:text-[var(--ivps-text2)] transition-colors"
        >
          이름
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(score.id); }}
          className="flex-1 py-1 text-[10.5px] text-[var(--ivps-rust)] bg-[rgba(224,112,112,.06)] border border-[rgba(224,112,112,.18)] rounded hover:bg-[rgba(224,112,112,.1)] transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddScoreThumb — 새 악보 추가 카드
// ─────────────────────────────────────────────────────────────────────────────
function AddScoreThumb({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-[var(--ivps-border)] rounded-[10px] overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2 h-full min-h-[160px] text-[var(--ivps-text4)] hover:border-[rgba(212,168,67,.4)] hover:text-[var(--ivps-gold)] hover:bg-[rgba(212,168,67,.04)] transition-all"
    >
      <div className="text-[28px] leading-none opacity-70">+</div>
      <div className="text-[12.5px] font-medium">새 악보 추가</div>
      <div className="text-[10.5px] text-[#2a3045]">PNG · JPG · PDF</div>
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
    nav,
    score: scoreActs,
    skill: skillActs,
  } = usePractice();

  const fileInputRef = useRef(null);

  // ── 파생 데이터 ────────────────────────────────────────────────────
  const { totalXP, level, xpToNext, xpPct } = calcStats(xpLog);
  const today      = formatDateLong(Date.now());

  // 최근 연습 스킬 (xp > 0, xp 내림차순 4개)
  const recentSkills = [...TAXONOMY]
    .filter(s => s.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 4);

  // 복습 필요 스킬 (xp < 100, 최대 4개)
  const reviewSkills = TAXONOMY
    .filter(s => s.xp > 0 && s.xp < 100)
    .slice(0, 4);

  // 전체 세션 수
  const totalSessions = scores.reduce((s, sc) => s + (sc.sessions?.length ?? 0), 0);

  // ── 악보 업로드 핸들러 ────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
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

  // ── 악보 액션 핸들러 ──────────────────────────────────────────────
  const handleOpen = useCallback(id => {
    scoreActs.setActiveScore(id);
  }, [scoreActs]);

  const handleRename = useCallback(id => {
    const score = scores.find(s => s.id === id);
    if (!score) return;
    const n = prompt('악보 이름 변경:', score.name);
    if (n?.trim()) scoreActs.renameScore(id, n.trim());
  }, [scores, scoreActs]);

  const handleDelete = useCallback(id => {
    if (window.confirm('이 악보와 모든 세션을 삭제할까요?')) {
      scoreActs.deleteScore(id);
    }
  }, [scoreActs]);

  const handleSkillStart = useCallback(skillId => {
    nav.goSkillPractice(skillId);
  }, [nav]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="px-7 py-6 max-w-[900px]">

        {/* ── 페이지 헤더 ── */}
        <div className="mb-6">
          <h1 className="font-serif text-[24px] font-bold text-[var(--ivps-text1)] mb-1">
            오늘의 연습
          </h1>
          <div className="text-[12px] text-[var(--ivps-text3)]">{today}</div>
        </div>

        {/* ── 스탯 카드 그리드 ── */}
        <div className="grid grid-cols-3 gap-3.5 mb-4">
          <StatCard
            label="전체 레벨"
            value={`Lv. ${level}`}
            sub={`다음 레벨까지 ${xpToNext} XP`}
            accent
          />
          <StatCard
            label="누적 XP"
            value={`${totalXP} XP`}
            sub={`${xpLog.length}회 연습 기록`}
          />
          <StatCard
            label="등록 스킬"
            value={`${TAXONOMY.length}개`}
            sub={`v3.1 Taxonomy`}
          />
        </div>

        {/* ── 레벨 진행 바 ── */}
        <div className="mb-4">
          <LevelBar level={level} xpPct={xpPct} xpToNext={xpToNext} />
        </div>

        {/* ── 주간 연습 히트맵 ── */}
        <div className="mb-6">
          <Panel title="📊 주간 연습 활동">
            <PracticeHeatmap xpLog={xpLog} />
          </Panel>
        </div>

        {/* ── 중간 2열 레이아웃 ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">

          {/* 최근 연습 스킬 */}
          <Panel
            title="📝 최근 연습 스킬"
            action={
              <button
                onClick={() => nav.navigate('library')}
                className="text-[10.5px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
              >
                전체 보기 →
              </button>
            }
          >
            {recentSkills.length === 0 ? (
              <div className="text-center py-5 text-[12px] text-[var(--ivps-text4)]">
                아직 연습 기록이 없어요.<br />
                <button
                  onClick={() => nav.navigate('library')}
                  className="mt-2 text-[var(--ivps-gold)] hover:underline"
                >
                  스킬 라이브러리 가기 →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {recentSkills.map(s => (
                  <RecentSkillRow key={s.id} skill={s} onStart={handleSkillStart} />
                ))}
              </div>
            )}
          </Panel>

          {/* 복습 정원 */}
          <Panel
            title="🌱 복습 정원"
            action={
              <span className="text-[10px] text-[var(--ivps-text4)] font-mono">
                {reviewSkills.length}개 항목
              </span>
            }
          >
            {reviewSkills.length === 0 ? (
              <div className="text-center py-5 text-[12px] text-[var(--ivps-text4)]">
                복습할 항목이 없어요 🎉
              </div>
            ) : (
              <>
                {reviewSkills.map(s => (
                  <ReviewRow key={s.id} skill={s} onStart={handleSkillStart} />
                ))}
              </>
            )}
            <button
              onClick={() => nav.navigate('cockpit')}
              className="w-full mt-2 py-2 bg-[rgba(126,168,144,.08)] border border-[rgba(126,168,144,.18)] rounded-lg text-[var(--ivps-moss)] text-[12px] hover:bg-[rgba(126,168,144,.13)] transition-colors"
            >
              + 연습 시작하기
            </button>
          </Panel>
        </div>

        {/* ── 악보 갤러리 ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.08em] font-semibold">
              🎼 최근 연습한 악보
              {scores.length > 0 && (
                <span className="ml-2 font-mono text-[var(--ivps-text4)]">
                  {scores.length}개 · {totalSessions}개 세션
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-gradient-to-r from-[#d4a843] to-[#b8891f] rounded-lg text-[#0d1117] text-[11.5px] font-semibold hover:opacity-90 transition-opacity"
            >
              + 악보 업로드
            </button>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3.5">
            {scores.map(sc => (
              <ScoreThumb
                key={sc.id}
                score={sc}
                onOpen={handleOpen}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
            <AddScoreThumb onClick={() => fileInputRef.current?.click()} />
          </div>

          {scores.length === 0 && (
            <div className="text-center py-4 text-[11.5px] text-[var(--ivps-text4)]">
              악보를 업로드하면 여기에 표시됩니다.
            </div>
          )}
        </div>

      </div>{/* /max-w */}
    </div>
  );
}
