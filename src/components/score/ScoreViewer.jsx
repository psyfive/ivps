// src/components/score/ScoreViewer.jsx
//
// v4의 핵심 기능을 React로 완전 재구현:
//   - 이미지 / PDF 파일 업로드 (드래그 앤 드롭 + 클릭)
//   - PDF 다중 페이지 변환 (pdf.js)
//   - 악보 위 드래그로 연습 세션 구간 생성
//   - 세션 클릭으로 선택 / 삭제 / 스킬 할당
//   - PDF 페이지네이션 (prev / next)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { TAXONOMY } from '../../data/taxonomy';
import { SegmentCanvas } from './SegmentCanvas';

// ─────────────────────────────────────────────────────────────────────────────
// pdf.js 동적 로드 (CDN)
// ─────────────────────────────────────────────────────────────────────────────

let pdfjsReady = false;

async function ensurePdfJs() {
  if (pdfjsReady && window.pdfjsLib) return true;
  return new Promise((resolve) => {
    if (document.getElementById('pdfjs-script')) {
      const check = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'pdfjs-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib = window['pdfjs-dist/build/pdf'];
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      pdfjsReady = true;
      resolve(true);
    };
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 파일 → pageData 변환 함수
// ─────────────────────────────────────────────────────────────────────────────

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
    await ensurePdfJs();
    if (!window.pdfjsLib) throw new Error('pdf.js 로드 실패');

    const arrayBuffer = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsArrayBuffer(file);
    });

    const pdf = await window.pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages);
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas   = document.createElement('canvas');
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pages.push({ dataUrl: canvas.toDataURL('image/png'), sessions: [] });
    }
    return { name, pages };
  }

  throw new Error('이미지 또는 PDF 파일만 지원합니다.');
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadZone — 파일 업로드 없을 때
// ─────────────────────────────────────────────────────────────────────────────

function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      className={[
        'h-full flex flex-col items-center justify-center gap-3.5 cursor-pointer',
        'transition-colors duration-150',
        dragging ? 'bg-[rgba(212,168,67,.06)]' : '',
      ].join(' ')}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) { onFile(f); e.target.value = ''; } }}
      />

      {/* 아이콘 */}
      <div className="text-5xl opacity-20">🎼</div>

      <div className="text-center">
        <div className="text-[15px] font-medium text-[var(--ivps-text2)] mb-1">
          악보를 여기에 드롭하거나
        </div>
        <div className="text-[12px] text-[var(--ivps-text3)]">
          이미지(PNG, JPG) 또는 PDF를 선택하세요
        </div>
      </div>

      <button
        className={[
          'px-4 py-2 rounded-lg text-[12.5px] font-semibold transition-all border',
          dragging
            ? 'bg-[rgba(212,168,67,.15)] border-[#d4a843] text-[var(--ivps-gold)]'
            : 'bg-gradient-to-r from-[#d4a843] to-[#b8891f] border-none text-[#0d1117]',
        ].join(' ')}
      >
        파일 선택
      </button>

      <div className="text-[10px] text-[#2a3045] font-mono">
        PNG · JPG · PDF 지원
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionLayer — 드래그 세션 생성 + 세션 rect 렌더링
// ─────────────────────────────────────────────────────────────────────────────

function SessionLayer({ sessions, activeSessionId, onAdd, onSelect, onOpenPicker }) {
  const overlayRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState(null); // {x,y,w,h} in %
  const startRef = useRef(null);

  const getRelPt = useCallback((e) => {
    const el = overlayRef.current;
    if (!el) return null;
    const r  = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((cy - r.top) / r.height) * 100)),
    };
  }, []);

  const onPointerDown = useCallback(e => {
    if (e.target.closest('[data-session-rect]')) return;
    e.preventDefault();
    const pt = getRelPt(e);
    if (!pt) return;
    setDrawing(true);
    startRef.current = pt;
    setPreview({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }, [getRelPt]);

  const onPointerMove = useCallback(e => {
    if (!drawing || !startRef.current) return;
    e.preventDefault();
    const cur = getRelPt(e);
    if (!cur) return;
    setPreview({
      x: Math.min(startRef.current.x, cur.x),
      y: Math.min(startRef.current.y, cur.y),
      w: Math.abs(cur.x - startRef.current.x),
      h: Math.abs(cur.y - startRef.current.y),
    });
  }, [drawing, getRelPt]);

  const onPointerUp = useCallback(e => {
    if (!drawing) return;
    setDrawing(false);
    setPreview(null);

    const cur = getRelPt(e);
    if (!cur || !startRef.current) return;

    const dx = Math.abs(cur.x - startRef.current.x);
    const dy = Math.abs(cur.y - startRef.current.y);
    if (dx < 2 || dy < 1) { startRef.current = null; return; }

    const rect = {
      x: Math.min(startRef.current.x, cur.x),
      y: Math.min(startRef.current.y, cur.y),
      w: dx, h: dy,
    };
    startRef.current = null;
    onAdd(rect);
  }, [drawing, getRelPt, onAdd]);

  useEffect(() => {
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);
    return () => {
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair touch-none"
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
    >
      {/* 기존 세션 rect들 */}
      {sessions.map((sess, idx) => {
        const { x, y, w, h } = sess.rect;
        const isActive = sess.id === activeSessionId;
        const skillCount = sess.skills.length;

        return (
          <div
            key={sess.id}
            data-session-rect
            className={[
              'absolute rounded-sm cursor-pointer transition-all duration-100',
              'border',
              isActive
                ? 'border-[rgba(239,68,68,0.85)] bg-[rgba(239,68,68,0.18)] shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                : 'border-[rgba(239,68,68,0.55)] bg-[rgba(239,68,68,0.10)] hover:bg-[rgba(239,68,68,0.2)]',
            ].join(' ')}
            style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
            onClick={e => { e.stopPropagation(); onSelect(sess.id); }}
          >
            {/* 번호 버블 */}
            <button
              data-session-rect
              className={[
                'absolute -top-3.5 -right-3.5 w-7 h-7 rounded-full',
                'bg-[var(--ivps-surface)] border-2 border-[#0d1117]',
                'text-white text-[13px] font-bold leading-none',
                'flex items-center justify-center',
                'shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
                'transition-all duration-150 z-10',
                'hover:bg-[#d4a843] hover:scale-110',
              ].join(' ')}
              onClick={e => { e.stopPropagation(); onOpenPicker(sess.id); }}
              title="스킬 설정"
            >
              {skillCount > 0 ? skillCount : '+'}
            </button>

            {/* 스킬 라벨 */}
            {skillCount > 0 && (
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2
                  bg-[rgba(19,23,32,0.9)] text-[var(--ivps-gold)] text-[9px] font-mono
                  px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none
                  border border-[var(--ivps-border2)]"
              >
                {sess.skills
                  .slice(0, 2)
                  .map(id => TAXONOMY.find(t => t.id === id)?.id ?? id)
                  .join(' · ')}
                {sess.skills.length > 2 && ` +${sess.skills.length - 2}`}
              </div>
            )}

            {/* 순서 번호 */}
            <div className="absolute top-0.5 left-1 text-[9px] font-mono text-[rgba(239,68,68,0.7)] pointer-events-none">
              {idx + 1}
            </div>
          </div>
        );
      })}

      {/* 드래그 미리보기 */}
      {drawing && preview && (
        <div
          className="absolute border-2 border-dashed border-[rgba(212,168,67,0.7)] bg-[rgba(212,168,67,0.07)] rounded-sm pointer-events-none"
          style={{ left: `${preview.x}%`, top: `${preview.y}%`, width: `${preview.w}%`, height: `${preview.h}%` }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreToolbar
// ─────────────────────────────────────────────────────────────────────────────

function ScoreToolbar({ score, onReplace, onRename, onDelete }) {
  return (
    <div className="h-9 flex items-center gap-2 px-3.5 bg-[var(--ivps-nav)] border-b border-[var(--ivps-border)] flex-shrink-0">
      <span className="font-mono text-[10px] text-[var(--ivps-text4)] uppercase tracking-wider">SCORE</span>
      <div className="w-px h-3.5 bg-[var(--ivps-surface2)]" />
      <span
        className="text-[12px] text-[var(--ivps-text3)] truncate max-w-[180px]"
        title={score?.name}
      >
        {score?.name ?? '악보 없음'}
      </span>
      <div className="flex-1" />

      {score && (
        <>
          <button
            onClick={onRename}
            className="px-2 py-1 text-[10.5px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] rounded transition-colors"
          >
            이름
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-[10.5px] text-[var(--ivps-rust)] hover:bg-[rgba(224,112,112,.08)] rounded transition-colors"
          >
            삭제
          </button>
        </>
      )}
      <button
        onClick={onReplace}
        className="px-2 py-1 text-[10.5px] bg-[var(--ivps-surface2)] border border-[var(--ivps-border2)] text-[var(--ivps-text2)] hover:bg-[#222b3d] rounded transition-colors"
      >
        ↑ 교체
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PdfPager — PDF 페이지 넘기기
// ─────────────────────────────────────────────────────────────────────────────

function PdfPager({ score, onChangePage }) {
  const { pageData, currentPageIndex } = score;
  if (!pageData || pageData.length <= 1) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-[rgba(8,11,16,0.85)] border border-[var(--ivps-border2)] backdrop-blur-sm shadow-lg">
      <button
        onClick={() => onChangePage(-1)}
        disabled={currentPageIndex === 0}
        className="text-[var(--ivps-text2)] hover:text-[var(--ivps-text1)] disabled:opacity-30 text-lg leading-none transition-colors"
      >
        ◀
      </button>
      <span className="font-mono text-[12px] text-[var(--ivps-text2)]">
        {currentPageIndex + 1} / {pageData.length}
      </span>
      <button
        onClick={() => onChangePage(1)}
        disabled={currentPageIndex === pageData.length - 1}
        className="text-[var(--ivps-text2)] hover:text-[var(--ivps-text1)] disabled:opacity-30 text-lg leading-none transition-colors"
      >
        ▶
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadingOverlay — PDF 변환 중
// ─────────────────────────────────────────────────────────────────────────────

function LoadingOverlay({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[rgba(13,17,23,0.85)] backdrop-blur-sm">
      <div className="text-3xl mb-4 animate-bounce">📄</div>
      <div className="text-[14px] text-[var(--ivps-text1)] font-medium mb-2">
        PDF 변환 중...
      </div>
      <div className="text-[12px] text-[var(--ivps-text3)] mb-4">
        {total > 0 ? `${current} / ${total} 페이지` : '처리 중'}
      </div>
      <div className="w-48 h-1.5 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#d4a843] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkillPickerModal
// ─────────────────────────────────────────────────────────────────────────────

function SkillPickerModal({ sessionId, session, onClose }) {
  const { session: sessionActs } = usePractice();
  const assigned = session?.skills ?? [];

  const toggleSkill = useCallback((skillId) => {
    if (assigned.includes(skillId)) {
      sessionActs.removeSkill(sessionId, skillId);
    } else {
      sessionActs.assignSkill(sessionId, skillId);
    }
  }, [sessionId, assigned, sessionActs]);

  // 카테고리 그룹
  const cats = [...new Set(TAXONOMY.map(t => t.id.charAt(0)))];
  const [activeCat, setActiveCat] = useState('전체');

  const filtered = activeCat === '전체'
    ? TAXONOMY
    : TAXONOMY.filter(t => t.id.startsWith(activeCat));

  const CAT_LABEL = { A: '왼손', B: '오른손', C: '음악성', D: '장비' };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.7)]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--ivps-surface)] border border-[var(--ivps-border2)] rounded-xl w-[480px] max-h-[72vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-[var(--ivps-border)] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-[var(--ivps-text1)]">스킬 할당</div>
            <div className="text-[11px] text-[var(--ivps-text3)] mt-0.5">
              {assigned.length}개 선택됨
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] hover:bg-[var(--ivps-surface2)] transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* 카테고리 필터 */}
        <div className="px-4 py-2 border-b border-[var(--ivps-border)] flex gap-1.5 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setActiveCat('전체')}
            className={[
              'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
              activeCat === '전체'
                ? 'bg-[rgba(212,168,67,.12)] border-[#d4a843] text-[var(--ivps-gold)]'
                : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
            ].join(' ')}
          >
            전체
          </button>
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
                activeCat === c
                  ? 'bg-[rgba(212,168,67,.12)] border-[#d4a843] text-[var(--ivps-gold)]'
                  : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
              ].join(' ')}
            >
              {CAT_LABEL[c] ?? c}
            </button>
          ))}
        </div>

        {/* 스킬 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
          {filtered.map(sk => {
            const sel = assigned.includes(sk.id);
            return (
              <button
                key={sk.id}
                onClick={() => toggleSkill(sk.id)}
                className={[
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                  sel
                    ? 'bg-[rgba(212,168,67,.08)] border-[rgba(212,168,67,.3)]'
                    : 'bg-[var(--ivps-bg)] border-[var(--ivps-border)] hover:border-[var(--ivps-border2)]',
                ].join(' ')}
              >
                {/* 체크박스 */}
                <div
                  className={[
                    'w-4.5 h-4.5 rounded border flex items-center justify-center text-[10px] flex-shrink-0 transition-all',
                    sel
                      ? 'bg-[#d4a843] border-[#d4a843] text-[#0d1117]'
                      : 'bg-transparent border-[var(--ivps-border2)]',
                  ].join(' ')}
                  style={{ width: '18px', height: '18px' }}
                >
                  {sel ? '✓' : ''}
                </div>

                {/* 스킬 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[10px] text-[var(--ivps-gold)]">{sk.id}</span>
                    <span className="text-[12.5px] font-medium text-[var(--ivps-text1)]">{sk.name}</span>
                    <span className="text-[10px] text-[var(--ivps-text3)] ml-auto flex-shrink-0">Lv.{sk.level}</span>
                  </div>
                  <div className="text-[11px] text-[var(--ivps-text3)] truncate">
                    {sk.corePrinciple.slice(0, 55)}…
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-[var(--ivps-border)] flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#d4a843] to-[#b8891f] rounded-lg text-[#0d1117] text-[13px] font-semibold"
          >
            완료 ({assigned.length}개 선택)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreViewer — 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function ScoreViewer({ phase }) {
  const {
    activeScore,
    activeSessionId,
    pickerSessionId,
    isSelectingSegment,
    selectedSegmentId,
    addingToSegmentId,
    tempSegments,
    score: scoreActs,
    session: sessionActs,
    segment: segmentActs,
    nav,
  } = usePractice();

  const [loading, setLoading] = useState({ active: false, current: 0, total: 0 });
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── 파일 처리 ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    setLoading({ active: true, current: 0, total: 0 });
    try {
      const { name, pages } = await fileToPageData(file, (cur, total) => {
        setLoading({ active: true, current: cur, total });
      });
      scoreActs.addScore(name, pages);
    } catch (err) {
      alert(err.message || '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading({ active: false, current: 0, total: 0 });
    }
  }, [scoreActs]);

  // 전역 드래그 앤 드롭
  useEffect(() => {
    const onDragOver = e => { e.preventDefault(); setGlobalDragOver(true); };
    const onDragLeave = e => { if (!e.relatedTarget) setGlobalDragOver(false); };
    const onDrop = e => {
      e.preventDefault();
      setGlobalDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  // ── 핸들러 ──────────────────────────────────────────────────────────────
  const handleRenameScore = useCallback(() => {
    if (!activeScore) return;
    const n = prompt('악보 이름 변경:', activeScore.name);
    if (n?.trim()) scoreActs.renameScore(activeScore.id, n.trim());
  }, [activeScore, scoreActs]);

  const handleDeleteScore = useCallback(() => {
    if (!activeScore) return;
    if (window.confirm('이 악보와 모든 세션을 삭제할까요?')) {
      scoreActs.deleteScore(activeScore.id);
    }
  }, [activeScore, scoreActs]);

  const handleAddSession = useCallback(rect => {
    sessionActs.addSession(rect);
  }, [sessionActs]);


  // ── 파생 값 ─────────────────────────────────────────────────────────────
  const hasScore   = !!activeScore?.dataUrl;
  const sessions   = activeScore?.sessions ?? [];
  const segments   = activeScore?.segments ?? [];
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;
  const pickerSession = sessions.find(s => s.id === pickerSessionId) ?? null;

  const isBefore = phase === 'before';
  const isDuring = phase === 'during';
  const isAfter  = phase === 'after';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 툴바 */}
      <ScoreToolbar
        score={activeScore}
        onReplace={() => fileInputRef.current?.click()}
        onRename={handleRenameScore}
        onDelete={handleDeleteScore}
      />

      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) { handleFile(f); e.target.value = ''; } }}
      />

      {/* 메인 뷰 */}
      <div className="flex-1 relative overflow-auto bg-[#1a1f2e]">
        {loading.active && (
          <LoadingOverlay current={loading.current} total={loading.total} />
        )}

        {/* 전역 드래그 오버레이 */}
        {globalDragOver && !loading.active && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(212,168,67,.05)] border-2 border-dashed border-[#d4a843] pointer-events-none">
            <div className="text-[var(--ivps-gold)] text-[15px] font-medium">악보 파일을 드롭하세요</div>
          </div>
        )}

        {/* ── 악보 없음: 업로드 영역 ── */}
        {!hasScore && !loading.active && (
          <UploadZone onFile={handleFile} />
        )}

        {/* ── 악보 있음 ── */}
        {hasScore && (
          <div className="relative min-h-full flex items-start justify-center">
            {/* 악보 이미지 */}
            <img
              src={activeScore.dataUrl}
              alt={activeScore.name}
              className="max-w-full h-auto select-none block"
              draggable={false}
              style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
            />

            {/* Before 단계: 시각적 구간 캔버스 오버레이 */}
            {isBefore && (
              <>
                <SegmentCanvas
                  segments={segments}
                  tempSegments={tempSegments}
                  isSelectingMode={isSelectingSegment}
                  selectedSegmentId={selectedSegmentId}
                  currentPageIndex={activeScore?.currentPageIndex ?? 0}
                  onSegmentCreate={segmentActs.addTempSegment}
                  onSegmentSelect={segmentActs.selectSegment}
                  onSegmentDelete={segmentActs.deleteSegment}
                  onTempDelete={segmentActs.deleteTempSegment}
                  onSegmentUpdate={segmentActs.updateSegmentCoord}
                />

                {/* 악보 위 오버레이 버튼 */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
                  {!isSelectingSegment ? (
                    selectedSegmentId ? (
                      /* 구간이 선택된 상태 → "구간 추가" 버튼 */
                      <button
                        onClick={() => segmentActs.startAddToSegment(selectedSegmentId)}
                        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border backdrop-blur-sm transition-all bg-[rgba(212,168,67,0.12)] border-[rgba(212,168,67,0.5)] text-[#d4a843] hover:bg-[rgba(212,168,67,0.22)] hover:border-[rgba(212,168,67,0.75)] shadow-lg"
                      >
                        <span className="text-[14px] leading-none">＋</span>
                        구간 추가
                      </button>
                    ) : (
                      /* 구간 미선택 상태 → 기본 "구간 설정" 버튼 */
                      <button
                        onClick={segmentActs.toggleSegmentMode}
                        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border backdrop-blur-sm transition-all bg-[rgba(13,17,23,0.72)] border-[rgba(155,127,200,0.35)] text-[#9b7fc8] hover:bg-[rgba(155,127,200,0.15)] hover:border-[rgba(155,127,200,0.6)] shadow-lg"
                      >
                        <span className="text-[14px] leading-none">＋</span>
                        구간 설정
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        onClick={segmentActs.commitTempSegments}
                        className={[
                          'pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border backdrop-blur-sm transition-all shadow-lg',
                          tempSegments.length > 0
                            ? addingToSegmentId
                              ? 'bg-[rgba(212,168,67,0.22)] border-[rgba(212,168,67,0.7)] text-[#d4a843] hover:bg-[rgba(212,168,67,0.32)]'
                              : 'bg-[rgba(155,127,200,0.25)] border-[rgba(155,127,200,0.7)] text-[#c4a8ff] hover:bg-[rgba(155,127,200,0.35)]'
                            : 'bg-[rgba(13,17,23,0.72)] border-[rgba(155,127,200,0.35)] text-[#9b7fc8] hover:bg-[rgba(155,127,200,0.12)]',
                        ].join(' ')}
                      >
                        <span className="text-[13px] leading-none">✓</span>
                        {tempSegments.length > 0
                          ? addingToSegmentId
                            ? `박스 추가 확정 (${tempSegments.length}개)`
                            : `구간 확정 (${tempSegments.length}개)`
                          : addingToSegmentId
                            ? '추가 종료'
                            : '구간 설정 종료'}
                      </button>
                      <div className="pointer-events-none px-2 py-1 rounded text-[10px] bg-[rgba(13,17,23,0.65)] backdrop-blur-sm"
                        style={{ color: addingToSegmentId ? 'rgba(212,168,67,0.85)' : 'rgba(155,127,200,0.85)' }}
                      >
                        {tempSegments.length === 0
                          ? addingToSegmentId
                            ? '악보 위를 드래그하여 이 구간에 박스 추가'
                            : '악보 위를 드래그 · 페이지를 넘겨서 계속 추가 가능'
                          : (() => {
                              const pages = [...new Set(tempSegments.map(t => t.coordinates.pageIndex + 1))].sort();
                              return pages.length > 1
                                ? `${tempSegments.length}개 박스 (${pages.join(', ')}페이지) · 확정하면 구간에 추가`
                                : addingToSegmentId
                                  ? `${tempSegments.length}개 박스 · 확정하면 이 구간에 추가됨`
                                  : `${tempSegments.length}개 박스 · 다른 페이지에도 추가 가능`;
                            })()}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* During 단계: 드래그로 세션 생성 */}
            {isDuring && (
              <SessionLayer
                sessions={sessions}
                activeSessionId={activeSessionId}
                onAdd={handleAddSession}
                onSelect={sessionActs.selectSession}
                onOpenPicker={sessionActs.openPicker}
              />
            )}

            {/* After 단계: 세션만 표시 (클릭 가능, 드래그 불가) */}
            {isAfter && sessions.length > 0 && (
              <div className="absolute inset-0">
                {sessions.map((sess, idx) => {
                  const { x, y, w, h } = sess.rect;
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      className={[
                        'absolute rounded-sm cursor-pointer border transition-all',
                        isActive
                          ? 'border-[rgba(126,168,144,0.85)] bg-[rgba(126,168,144,0.18)]'
                          : 'border-[rgba(126,168,144,0.45)] bg-[rgba(126,168,144,0.08)] hover:bg-[rgba(126,168,144,0.15)]',
                      ].join(' ')}
                      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
                      onClick={() => sessionActs.selectSession(sess.id)}
                    >
                      <div className="absolute -top-3.5 -left-1 text-[9px] font-mono bg-[rgba(126,168,144,0.9)] text-[#0d1117] px-1 rounded">
                        {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PDF 페이지네이션 */}
            {activeScore.pageData?.length > 1 && (
              <PdfPager score={activeScore} onChangePage={scoreActs.changePage} />
            )}
          </div>
        )}
      </div>

      {/* 하단 힌트 푸터 */}
      {hasScore && (
        <div className={[
          'h-11 flex items-center px-4 gap-3 flex-shrink-0',
          'bg-[var(--ivps-nav)] border-t border-[var(--ivps-border)]',
        ].join(' ')}>
          {/* During: 힌트 + 세션 카운트 */}
          {isDuring && (
            <>
              <button
                onClick={() => nav.setPhase('before')}
                className="text-[11.5px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors flex items-center gap-1"
              >
                ← Before
              </button>
              <div className="flex-1 text-center">
                <span className="text-[11px] text-[var(--ivps-text4)]">
                  {hasScore
                    ? sessions.length === 0
                      ? '악보 위를 드래그하여 연습 구간을 지정하세요'
                      : `${sessions.length}개 세션 설정됨 · 드래그로 추가`
                    : '먼저 악보를 업로드하세요'}
                </span>
              </div>
              <button
                onClick={() => nav.setPhase('after')}
                className="px-3 py-1.5 bg-gradient-to-r from-[#d4a843] to-[#b8891f] rounded-md text-[#0d1117] text-[11.5px] font-semibold"
              >
                완료 → After
              </button>
            </>
          )}

          {/* After: 힌트 */}
          {isAfter && (
            <>
              <button
                onClick={() => nav.setPhase('during')}
                className="text-[11.5px] text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)] transition-colors"
              >
                ← 다시 연습
              </button>
              <div className="flex-1 text-center text-[11px] text-[var(--ivps-text4)]">
                구간을 클릭해 자기 평가를 기록하세요
              </div>
            </>
          )}

          {/* Before: 상태 힌트 (버튼은 악보 위 오버레이로 이동) */}
          {isBefore && (
            <div className="flex w-full items-center justify-center gap-2">
              {segments.length > 0 && (
                <span className={[
                  'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
                  isSelectingSegment ? 'bg-[#9b7fc8] animate-pulse' : 'bg-[#7ea890]',
                ].join(' ')} />
              )}
              <div className="text-[11px] text-[var(--ivps-text4)]">
                {isSelectingSegment
                  ? tempSegments.length > 0
                    ? `${tempSegments.length}개 대기 · 악보 위 버튼으로 확정`
                    : '악보 위 버튼으로 구간을 그리세요'
                  : segments.length === 0
                  ? '악보 왼쪽 상단 버튼으로 구간을 설정하세요'
                  : `${segments.length}개 구간 확정됨 · 우측 패널에서 스킬 매핑`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SkillPicker 모달 */}
      {pickerSessionId && (
        <SkillPickerModal
          sessionId={pickerSessionId}
          session={pickerSession}
          onClose={sessionActs.closePicker}
        />
      )}

      {/* During 단계: 선택된 세션 인라인 정보 바 */}
      {isDuring && activeSession && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--ivps-surface)] border-t border-[var(--ivps-border)] flex-shrink-0">
          <span className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-wider font-mono">선택됨</span>
          <div className="flex gap-1.5 flex-wrap flex-1">
            {activeSession.skills.length === 0 ? (
              <span className="text-[11px] text-[var(--ivps-text4)]">스킬 없음 — 말풍선(+)으로 추가</span>
            ) : (
              activeSession.skills.map(id => {
                const sk = TAXONOMY.find(t => t.id === id);
                return sk ? (
                  <span
                    key={id}
                    className="px-2 py-0.5 bg-[rgba(212,168,67,.1)] border border-[rgba(212,168,67,.25)] rounded-full text-[10.5px] text-[var(--ivps-gold)]"
                  >
                    {sk.id} {sk.name}
                  </span>
                ) : null;
              })
            )}
          </div>
          <button
            onClick={() => sessionActs.openPicker(activeSession.id)}
            className="text-[11px] text-[var(--ivps-gold)] hover:underline"
          >
            스킬 변경
          </button>
          <button
            onClick={() => sessionActs.deleteSession(activeSession.id)}
            className="text-[11px] text-[var(--ivps-rust)] hover:underline"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
