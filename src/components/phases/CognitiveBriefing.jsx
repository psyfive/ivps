// src/components/phases/CognitiveBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — BEFORE  (v3.2)
//
// 두 탭 구조:
//   "준비" — Skill Cart(오늘의 스킬 장바구니) + Section Manager(마디별 스킬 매핑)
//   "상세" — 선택된 스킬의 핵심 원리·감각 가이드·체크포인트 미리보기
//
// Skill Cart: 오늘 연습에 쓸 Taxonomy 스킬들의 전역 목록
// Section  : { id, range:[startBar,endBar], activeSkillId, p2_data }
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { getCategoryMeta, TAXONOMY, getSkillById } from '../../data/taxonomy';

// ════════════════════════════════════════════════════════════════════════════
// 1. Skill Cart Picker — 인라인 검색창
// ════════════════════════════════════════════════════════════════════════════
const CAT_FILTERS = ['전체', 'A', 'B', 'C', 'D'];

function CartPicker({ cartIds, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('전체');

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return TAXONOMY.filter(s => {
      if (cartIds.includes(s.id)) return false;
      if (catFilter !== '전체' && !s.id.startsWith(catFilter)) return false;
      return !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [query, catFilter, cartIds]);

  return (
    <div className="rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden mb-3">
      {/* 검색 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ivps-border)]">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="스킬 검색..."
          className="flex-1 bg-transparent text-[12.5px] text-[var(--ivps-text1)] placeholder-[var(--ivps-text4)] outline-none"
        />
        <button
          onClick={onClose}
          className="text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)] text-[12px] transition-colors"
        >✕</button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-[var(--ivps-border)]">
        {CAT_FILTERS.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={[
              'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
              catFilter === c
                ? 'bg-[rgba(212,168,67,.2)] text-[var(--ivps-gold)]'
                : 'text-[var(--ivps-text3)] hover:text-[var(--ivps-text2)]',
            ].join(' ')}
          >{c}</button>
        ))}
      </div>

      {/* 결과 목록 */}
      <div className="max-h-[160px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="px-3 py-4 text-[11.5px] text-[var(--ivps-text4)] text-center">
            검색 결과 없음
          </div>
        ) : results.map(s => {
          const meta = getCategoryMeta(s.id);
          return (
            <button
              key={s.id}
              onClick={() => { onAdd(s.id); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--ivps-surface2)] transition-colors text-left"
            >
              <span
                className="font-mono text-[9.5px] px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: `${meta.color}18`, color: meta.color }}
              >{s.id}</span>
              <span className="text-[12px] text-[var(--ivps-text2)] truncate">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Section Row — 마디 구간 한 줄
// ════════════════════════════════════════════════════════════════════════════
function SectionRow({ section, cartSkills, onDelete, onAssign }) {
  const assigned = section.activeSkillId ? getSkillById(section.activeSkillId) : null;
  const assignedMeta = assigned ? getCategoryMeta(assigned.id) : null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ivps-surface)] border border-[var(--ivps-border)] mb-1.5">
      {/* 마디 범위 */}
      <span className="font-mono text-[10px] text-[var(--ivps-text3)] flex-shrink-0 w-14 leading-tight">
        {section.range[0]}~{section.range[1]}<br />
        <span className="text-[9px] opacity-60">마디</span>
      </span>

      {/* 스킬 드롭다운 */}
      <select
        value={section.activeSkillId ?? ''}
        onChange={e => {
          const id = e.target.value || null;
          const sk = id ? getSkillById(id) : null;
          onAssign(section.id, id, sk?.during ?? []);
        }}
        className="flex-1 min-w-0 bg-transparent text-[11.5px] outline-none cursor-pointer truncate"
        style={{ color: assignedMeta?.color ?? 'var(--ivps-text3)' }}
      >
        <option value="">— 스킬 선택 —</option>
        {cartSkills.map(s => (
          <option key={s.id} value={s.id}>{s.id} {s.name}</option>
        ))}
      </select>

      {/* 삭제 */}
      <button
        onClick={() => onDelete(section.id)}
        className="text-[11px] text-[var(--ivps-text4)] hover:text-[#e07070] transition-colors flex-shrink-0"
      >✕</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Add Section Form — 마디 범위 입력 + 겹침 처리
// ════════════════════════════════════════════════════════════════════════════
function AddSectionForm({ existingSections, onAdd, onClose }) {
  const [startBar, setStartBar] = useState('');
  const [endBar, setEndBar]   = useState('');
  const [error, setError]     = useState('');
  const [overlapSec, setOverlapSec] = useState(null); // 겹치는 기존 섹션

  const resetError = () => { setError(''); setOverlapSec(null); };

  const findOverlap = (s, e) =>
    existingSections.find(sec => sec.range[0] <= e && sec.range[1] >= s) ?? null;

  const handleSubmit = () => {
    const s = parseInt(startBar, 10);
    const e = parseInt(endBar, 10);
    if (!s || s < 1)  { setError('시작 마디를 입력하세요.'); return; }
    if (!e || e < s)  { setError('종료 마디는 시작 이상이어야 합니다.'); return; }

    const overlap = findOverlap(s, e);
    if (overlap && !overlapSec) { setOverlapSec(overlap); return; }

    onAdd([s, e], overlapSec?.id ?? null);
    onClose();
  };

  return (
    <div className="px-3 pt-3 pb-2.5 rounded-xl bg-[var(--ivps-surface)] border border-[var(--ivps-border2)] mb-2">
      <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold mb-2">
        새 구간 추가
      </div>

      {/* 마디 입력 */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number" min="1"
          value={startBar}
          onChange={e => { setStartBar(e.target.value); resetError(); }}
          placeholder="시작"
          className="w-16 bg-[var(--ivps-bg)] border border-[var(--ivps-border2)] rounded px-2 py-1 text-[12px] text-[var(--ivps-text1)] outline-none text-center"
        />
        <span className="text-[var(--ivps-text4)] text-[11px]">~</span>
        <input
          type="number" min="1"
          value={endBar}
          onChange={e => { setEndBar(e.target.value); resetError(); }}
          placeholder="종료"
          className="w-16 bg-[var(--ivps-bg)] border border-[var(--ivps-border2)] rounded px-2 py-1 text-[12px] text-[var(--ivps-text1)] outline-none text-center"
        />
        <span className="text-[11px] text-[var(--ivps-text3)]">마디</span>
      </div>

      {/* 유효성 오류 */}
      {error && (
        <div className="text-[11px] text-[#e07070] mb-2">{error}</div>
      )}

      {/* 겹침 경고 */}
      {overlapSec && (
        <div className="text-[11px] text-[#d4a843] mb-2 leading-relaxed">
          ⚠️ 마디 {overlapSec.range[0]}~{overlapSec.range[1]}과 겹칩니다.
          기존 구간을 삭제하고 추가하시겠습니까?
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-2">
        {overlapSec ? (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 py-1.5 rounded bg-[rgba(212,168,67,.15)] border border-[rgba(212,168,67,.3)] text-[var(--ivps-gold)] text-[11.5px] transition-colors hover:bg-[rgba(212,168,67,.22)]"
            >덮어쓰기</button>
            <button
              onClick={resetError}
              className="flex-1 py-1.5 rounded bg-[var(--ivps-surface2)] border border-[var(--ivps-border)] text-[var(--ivps-text3)] text-[11.5px] transition-colors"
            >취소</button>
          </>
        ) : (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 py-1.5 rounded bg-[rgba(126,168,144,.15)] border border-[rgba(126,168,144,.3)] text-[#7ea890] text-[11.5px] transition-colors hover:bg-[rgba(126,168,144,.22)]"
            >추가</button>
            <button
              onClick={onClose}
              className="flex-1 py-1.5 rounded bg-[var(--ivps-surface2)] border border-[var(--ivps-border)] text-[var(--ivps-text3)] text-[11.5px] transition-colors"
            >닫기</button>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. 상세 탭 — 기존 스킬 Briefing (보존)
// ════════════════════════════════════════════════════════════════════════════
function BriefingCard({ dotColor, label, children }) {
  return (
    <div
      className="rounded-[11px] p-4 mb-3 border"
      style={{ background: `${dotColor}09`, borderColor: `${dotColor}22` }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[.07em] mb-3 flex items-center gap-1.5"
        style={{ color: dotColor }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        {label}
      </div>
      {children}
    </div>
  );
}

function SkillDetail({ skill }) {
  const [checkpointOpen, setCheckpointOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(false);
  const meta = getCategoryMeta(skill.id);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-5">
      {/* 헤더 */}
      <div className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10.5px] mb-1 flex items-center gap-1.5" style={{ color: meta.color }}>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: `${meta.color}18`, color: meta.color }}>{skill.id}</span>
              <span className="text-[var(--ivps-text3)]">{skill.groupId}</span>
            </div>
            <h2 className="font-serif text-[20px] font-bold text-[var(--ivps-text1)] leading-tight">
              {skill.name}
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-[10px] text-[var(--ivps-text3)] mb-1">Lv.{skill.level}</div>
            <div className="h-1 w-14 bg-[var(--ivps-surface2)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round((skill.xp / skill.maxXp) * 100)}%`, background: meta.color }} />
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 원리 */}
      <BriefingCard label="핵심 원리" dotColor="#d4a843">
        <p className="text-[13.5px] text-[var(--ivps-text1)] leading-[1.75]">{skill.corePrinciple}</p>
      </BriefingCard>

      {/* 연습 전 감각 가이드 */}
      {skill.before && (
        <BriefingCard label="연습 전 — 감각 가이드" dotColor="#7ea890">
          <p className="text-[13px] text-[#8a96a8] leading-[1.8]">{skill.before}</p>
        </BriefingCard>
      )}

      {/* During 미리보기 */}
      <div className="rounded-[11px] border border-[rgba(155,127,200,.15)] mb-3 overflow-hidden"
        style={{ background: 'rgba(155,127,200,.04)' }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setCheckpointOpen(v => !v)}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[var(--ivps-plum)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8] flex-shrink-0" />
            During 체크포인트 미리보기
          </div>
          <span className="text-[var(--ivps-text3)] text-[12px] transition-transform duration-200"
            style={{ transform: checkpointOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
        {checkpointOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {skill.during.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(155,127,200,.07)', border: '1px solid rgba(155,127,200,.12)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0"
                  style={{ background: 'rgba(155,127,200,.18)', color: '#9b7fc8' }}>{i + 1}</span>
                <span className="text-[13px] text-[var(--ivps-text1)]">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* After 진단 미리보기 */}
      {skill.after?.length > 0 && (
        <div className="rounded-[11px] border border-[rgba(224,112,112,.15)] mb-3 overflow-hidden"
          style={{ background: 'rgba(224,112,112,.04)' }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setDiagOpen(v => !v)}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[.07em] flex items-center gap-1.5 text-[var(--ivps-rust)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e07070] flex-shrink-0" />
              After 진단 케이스 ({skill.after.length}개)
            </div>
            <span className="text-[var(--ivps-text3)] text-[12px] transition-transform duration-200"
              style={{ transform: diagOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>
          {diagOpen && (
            <div className="px-4 pb-4">
              {skill.after.map((a, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-[rgba(224,112,112,.1)] last:border-0">
                  <span className="font-mono text-[9.5px] text-[var(--ivps-rust)] mt-0.5 flex-shrink-0 w-10">증상{skill.after.length > 1 ? i + 1 : ''}</span>
                  <span className="text-[11.5px] text-[#6a7688] leading-relaxed">{a.symptom}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 5. CognitiveBriefing — 메인 컴포넌트
// ════════════════════════════════════════════════════════════════════════════
export function CognitiveBriefing() {
  const { activeScore, activeSkill, skillCart, nav, cart, before } = usePractice();

  const [tab, setTab] = useState('setup'); // 'setup' | 'detail'
  const [cartPickerOpen, setCartPickerOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const sections  = activeScore?.sections ?? [];
  const cartSkills = skillCart.map(id => getSkillById(id)).filter(Boolean);

  // 상세 탭 대상 스킬: activeSkill 우선
  const detailSkill = activeSkill;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── 탭 헤더 ── */}
      <div className="flex-shrink-0 flex border-b border-[var(--ivps-border)] px-5 pt-4 pb-0 gap-4">
        {[
          { id: 'setup',  label: '준비', sub: '스킬 · 구간' },
          { id: 'detail', label: '상세', sub: '스킬 내용' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'pb-2.5 text-left border-b-2 transition-colors',
              tab === t.id
                ? 'border-[#7ea890] text-[var(--ivps-text1)]'
                : 'border-transparent text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)]',
            ].join(' ')}
          >
            <div className="text-[12.5px] font-semibold">{t.label}</div>
            <div className="text-[9.5px] opacity-60">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB: 준비 (Skill Cart + Sections)
      ══════════════════════════════════ */}
      {tab === 'setup' && (
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3">

          {/* ── SKILL CART ── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d4a843]" />
                Skill Cart — 오늘의 스킬
              </div>
              <button
                onClick={() => setCartPickerOpen(v => !v)}
                className="text-[10.5px] text-[var(--ivps-gold)] border border-[rgba(212,168,67,.3)] px-2 py-0.5 rounded hover:bg-[rgba(212,168,67,.08)] transition-colors font-mono"
              >+ 추가</button>
            </div>

            {/* Cart 스킬 피커 */}
            {cartPickerOpen && (
              <CartPicker
                cartIds={skillCart}
                onAdd={cart.addToCart}
                onClose={() => setCartPickerOpen(false)}
              />
            )}

            {/* Cart 스킬 Pills */}
            {cartSkills.length === 0 ? (
              <div className="text-[11.5px] text-[var(--ivps-text4)] text-center py-4 rounded-lg border border-dashed border-[var(--ivps-border2)]">
                + 추가를 눌러 오늘 연습할 스킬을 등록하세요
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {cartSkills.map(s => {
                  const meta = getCategoryMeta(s.id);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full border text-[11px]"
                      style={{ background: `${meta.color}10`, borderColor: `${meta.color}30`, color: meta.color }}
                    >
                      <span className="font-mono text-[10px]">{s.id}</span>
                      <span className="text-[var(--ivps-text2)] max-w-[70px] truncate">{s.name}</span>
                      <button
                        onClick={() => cart.removeFromCart(s.id)}
                        className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity text-[10px]"
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECTIONS ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-[var(--ivps-text3)] uppercase tracking-[.07em] font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9b7fc8]" />
                구간별 스킬 매핑
              </div>
              <button
                onClick={() => setAddSectionOpen(v => !v)}
                className="text-[10.5px] text-[var(--ivps-plum)] border border-[rgba(155,127,200,.3)] px-2 py-0.5 rounded hover:bg-[rgba(155,127,200,.08)] transition-colors font-mono"
              >+ 구간 추가</button>
            </div>

            {/* Add Section Form */}
            {addSectionOpen && (
              <AddSectionForm
                existingSections={sections}
                onAdd={(range, replaceId) => {
                  before.addSection(range, replaceId);
                  setAddSectionOpen(false);
                }}
                onClose={() => setAddSectionOpen(false)}
              />
            )}

            {/* Cart 비어있으면 섹션 안내 */}
            {cartSkills.length === 0 && sections.length === 0 && (
              <div className="text-[11px] text-[var(--ivps-text4)] text-center py-3">
                스킬 Cart를 먼저 채운 뒤 구간을 추가하세요.
              </div>
            )}

            {/* Section 목록 */}
            {sections.length > 0 ? (
              <>
                {[...sections]
                  .sort((a, b) => a.range[0] - b.range[0])
                  .map(sec => (
                    <SectionRow
                      key={sec.id}
                      section={sec}
                      cartSkills={cartSkills}
                      onDelete={before.deleteSection}
                      onAssign={before.assignSectionSkill}
                    />
                  ))}
              </>
            ) : cartSkills.length > 0 && !addSectionOpen && (
              <div className="text-[11px] text-[var(--ivps-text4)] text-center py-4 rounded-lg border border-dashed border-[var(--ivps-border2)]">
                마디 범위를 추가해 스킬을 매핑하세요
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: 상세 (Skill Detail)
      ══════════════════════════════════ */}
      {tab === 'detail' && (
        detailSkill ? (
          <SkillDetail skill={detailSkill} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
            <div className="text-[38px] opacity-20">🎛</div>
            <div className="text-[13px] text-[var(--ivps-text3)] leading-relaxed">
              스킬 라이브러리에서<br />연습할 기술을 선택해주세요.
            </div>
            <button
              onClick={() => nav.navigate('library')}
              className="px-4 py-2 bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.3)] rounded-lg text-[var(--ivps-gold)] text-[12.5px] hover:bg-[rgba(212,168,67,.14)] transition-colors"
            >스킬 라이브러리 가기</button>
          </div>
        )
      )}

      {/* ── 하단 CTA ── */}
      <div className="px-5 pb-5 pt-3 flex-shrink-0">
        <button
          onClick={() => nav.setPhase('during')}
          className="w-full py-3 rounded-xl text-[#0d1117] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7ea890,#5a8070)' }}
        >
          연습 시작 — During ›
        </button>
      </div>
    </div>
  );
}
