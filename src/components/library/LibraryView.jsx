import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_META,
  SKILL_GROUPS,
  getCategoryMeta,
  getSkillDisplayName,
} from '../../data/taxonomy';
import { SkillDetailModal } from './SkillDetailModal';

const CAT_TABS = [
  { code: 'ALL', label: '전체' },
  ...Object.entries(CATEGORY_META).map(([code, meta]) => ({
    code,
    label: meta.label.replace(/^[A-D]\. /, ''),
  })),
];

function getCategoryFromSkill(skill) {
  return skill?.category || skill?.id?.charAt(0) || 'A';
}

function splitLines(value) {
  return String(value ?? '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function emptyAfterRow() {
  return { symptom: '', cause: '', prescription: '' };
}

function toEditorForm(skill) {
  const category = getCategoryFromSkill(skill);
  const firstGroup = SKILL_GROUPS.find(group => group.category === category)?.id ?? 'A-1';
  return {
    category,
    groupId: skill?.groupId ?? firstGroup,
    name: skill?.name ?? '',
    corePrinciple: skill?.corePrinciple ?? '',
    before: skill?.before ?? '',
    duringText: Array.isArray(skill?.during) ? skill.during.join('\n') : '',
    afterRows: Array.isArray(skill?.after) && skill.after.length > 0
      ? skill.after.map(row => ({
          symptom: row?.symptom ?? '',
          cause: row?.cause ?? '',
          prescription: row?.prescription ?? '',
        }))
      : [emptyAfterRow()],
  };
}

function formToPayload(form) {
  return {
    category: form.category,
    groupId: form.groupId,
    name: form.name.trim(),
    corePrinciple: form.corePrinciple.trim(),
    before: splitLines(form.before).join('\n'),
    during: splitLines(form.duringText),
    after: form.afterRows
      .map(row => ({
        symptom: row.symptom.trim(),
        cause: row.cause.trim(),
        prescription: row.prescription.trim(),
      }))
      .filter(row => row.symptom || row.cause || row.prescription),
    resources: [],
  };
}

function SkillCard({ skill, onSelect }) {
  const meta = getCategoryMeta(skill.id);
  const displayName = getSkillDisplayName(skill);

  return (
    <button
      onClick={() => onSelect(skill.id)}
      className="w-full text-left rounded-[11px] p-[18px] border transition-all duration-150 ivps-skill-card"
    >
      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
        <span
          className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {skill.id}
        </span>
        {skill.isCustom && (
          <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[rgba(212,168,67,.13)] text-[var(--ivps-gold)] border border-[rgba(212,168,67,.25)]">
            내 스킬
          </span>
        )}
        {skill.storage === 'local' && (
          <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[rgba(126,168,144,.12)] text-[#7ea890] border border-[rgba(126,168,144,.25)]">
            로컬 저장
          </span>
        )}
      </div>

      <div className="font-serif text-[17px] font-semibold text-[var(--ivps-text1)] mt-2 mb-1 leading-tight">
        {displayName}
      </div>

      <span
        className="inline-block text-[11px] px-2 py-0.5 rounded mb-2.5"
        style={{ background: `${meta.color}12`, color: meta.color }}
      >
        {SKILL_GROUPS.find(g => g.id === skill.groupId)?.name ?? skill.groupId}
      </span>

      <p
        className="text-[11.5px] text-[#5a6678] leading-[1.6]"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {skill.corePrinciple}
      </p>
    </button>
  );
}

function GroupChip({ group, active, onClick }) {
  const meta = CATEGORY_META[group.category] ?? CATEGORY_META.A;
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap',
        active
          ? 'font-semibold'
          : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:border-[var(--ivps-border2)] hover:text-[var(--ivps-text2)]',
      ].join(' ')}
      style={active ? {
        background: `${meta.color}15`,
        borderColor: `${meta.color}55`,
        color: meta.color,
      } : {}}
    >
      {group.id} {group.name}
    </button>
  );
}

function CustomSkillEditor({
  skill,
  canSave,
  authConfigured,
  storageMode,
  onClose,
  onSave,
  saving,
  error,
}) {
  const [form, setForm] = useState(() => toEditorForm(skill));

  useEffect(() => {
    setForm(toEditorForm(skill));
  }, [skill]);

  const categoryGroups = SKILL_GROUPS.filter(group => group.category === form.category);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateCategory = (category) => {
    const firstGroup = SKILL_GROUPS.find(group => group.category === category)?.id ?? 'A-1';
    setForm(prev => ({ ...prev, category, groupId: firstGroup }));
  };

  const updateAfterRow = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      afterRows: prev.afterRows.map((row, i) => i === index ? { ...row, [key]: value } : row),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    const payload = formToPayload(form);
    if (!payload.name) return;
    await onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,.72)' }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[640px] max-h-[88vh] overflow-hidden flex flex-col rounded-[14px] border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--ivps-border)] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[22px] font-bold text-[var(--ivps-text1)]">
              {skill ? '내 스킬 편집' : '내 스킬 만들기'}
            </h2>
            <p className="text-[12px] text-[var(--ivps-text3)] mt-1">
              {storageMode === 'remote'
                ? '계정에 저장되는 개인 taxonomy skill입니다.'
                : '현재 브라우저에 저장되는 개인 taxonomy skill입니다.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:bg-[var(--ivps-surface2)]"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {storageMode === 'local' && (
            <div className="rounded-[10px] border border-[rgba(212,168,67,.28)] bg-[rgba(212,168,67,.08)] px-4 py-3 text-[12.5px] text-[var(--ivps-text2)] leading-relaxed">
              {authConfigured
                ? '로그인하지 않은 상태라 이 스킬은 현재 브라우저에 저장됩니다.'
                : 'Supabase 환경 변수가 없어 이 스킬은 현재 브라우저에 저장됩니다.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
              카테고리
              <select
                value={form.category}
                onChange={event => updateCategory(event.target.value)}
                disabled={Boolean(skill)}
                className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none disabled:opacity-60"
              >
                {Object.entries(CATEGORY_META).map(([code, meta]) => (
                  <option key={code} value={code}>{meta.label}</option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
              중분류
              <select
                value={form.groupId}
                onChange={event => updateForm('groupId', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none"
              >
                {categoryGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.id} {group.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
            스킬명
            <input
              value={form.name}
              onChange={event => updateForm('name', event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none"
              placeholder="예: 포지션 이동 전 손 모양 준비"
            />
          </label>

          <label className="block text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
            스킬 정의
            <textarea
              value={form.corePrinciple}
              onChange={event => updateForm('corePrinciple', event.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none resize-none leading-relaxed"
            />
          </label>

          <label className="block text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
            Before 줄 목록
            <textarea
              value={form.before}
              onChange={event => updateForm('before', event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none resize-none leading-relaxed"
              placeholder="한 줄에 하나씩 입력"
            />
          </label>

          <label className="block text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
            During 체크리스트
            <textarea
              value={form.duringText}
              onChange={event => updateForm('duringText', event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[13px] text-[var(--ivps-text1)] outline-none resize-none leading-relaxed"
              placeholder="[모양 확인] 같은 접두사를 붙여도 됩니다."
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-[var(--ivps-text3)] uppercase tracking-[.06em]">
                After 증상 / 원인 / 처방
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, afterRows: [...prev.afterRows, emptyAfterRow()] }))}
                className="text-[11px] px-2.5 py-1 rounded border border-[var(--ivps-border)] text-[var(--ivps-text2)] hover:bg-[var(--ivps-surface2)]"
              >
                행 추가
              </button>
            </div>
            <div className="space-y-2.5">
              {form.afterRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  {['symptom', 'cause', 'prescription'].map(key => (
                    <input
                      key={key}
                      value={row[key]}
                      onChange={event => updateAfterRow(index, key, event.target.value)}
                      className="rounded-lg border border-[var(--ivps-border)] bg-[var(--ivps-bg)] px-3 py-2 text-[12px] text-[var(--ivps-text1)] outline-none min-w-0"
                      placeholder={{ symptom: '증상', cause: '원인', prescription: '처방' }[key]}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      afterRows: prev.afterRows.length <= 1
                        ? [emptyAfterRow()]
                        : prev.afterRows.filter((_, i) => i !== index),
                    }))}
                    className="w-8 rounded-lg border border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:text-[var(--ivps-text1)] hover:bg-[var(--ivps-surface2)]"
                    title="행 삭제"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[rgba(224,112,112,.35)] bg-[rgba(224,112,112,.08)] px-3 py-2 text-[12px] text-[#e07070]">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--ivps-border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--ivps-border)] text-[12px] text-[var(--ivps-text2)] hover:bg-[var(--ivps-surface2)]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSave || saving || !form.name.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#d4a843] to-[#b8891f] text-[#0d1117] text-[12px] font-semibold disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LibraryView() {
  const {
    selectedSkill,
    skill: skillActs,
    nav,
    symptomFilter,
    taxonomy,
    customSkill,
    customSkillStatus,
    customSkillError,
  } = usePractice();
  const auth = useAuth();
  const allSkills = taxonomy?.allSkills ?? [];

  const [activeCat, setActiveCat] = useState('ALL');
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [query, setQuery] = useState('');
  const [editorSkill, setEditorSkill] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState(null);

  const customSkillStorageMode = auth.configured && auth.user ? 'remote' : 'local';
  const editorStorageMode = editorSkill?.storage === 'local' ? 'local' : customSkillStorageMode;
  const savingCustomSkill = customSkillStatus === 'saving';

  const visibleGroups = useMemo(() =>
    activeCat === 'ALL'
      ? SKILL_GROUPS
      : SKILL_GROUPS.filter(g => g.category === activeCat),
  [activeCat]);

  const handleCatChange = useCallback(code => {
    setActiveCat(code);
    setActiveGroup('ALL');
  }, []);

  useEffect(() => {
    if (symptomFilter) {
      setActiveCat('ALL');
      setActiveGroup('ALL');
    }
  }, [symptomFilter]);

  const filteredSkills = useMemo(() => {
    let list = allSkills;

    if (symptomFilter) {
      list = list.filter(s =>
        s.after?.some(a =>
          symptomFilter.keywords.some(kw => String(a.symptom ?? '').includes(kw))
        )
      );
    } else {
      if (activeCat !== 'ALL') {
        list = list.filter(s => s.id.startsWith(activeCat));
      }
      if (activeGroup !== 'ALL') {
        list = list.filter(s => s.groupId === activeGroup);
      }
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        getSkillDisplayName(s).toLowerCase().includes(q) ||
        String(s.corePrinciple ?? '').toLowerCase().includes(q) ||
        String(s.sourceGroupId ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCat, activeGroup, allSkills, query, symptomFilter]);

  const openCreateEditor = () => {
    setEditorSkill(null);
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (skill) => {
    setEditorSkill(skill);
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleSaveCustomSkill = async (payload) => {
    setEditorError(null);
    const result = editorSkill
      ? await customSkill.update(editorSkill.id, payload)
      : await customSkill.create(payload);

    if (result?.error) {
      setEditorError(result.error);
      return;
    }

    setEditorOpen(false);
    setEditorSkill(null);
    if (result?.data?.id) skillActs.openSkillModal(result.data.id);
  };

  const handleDeleteCustomSkill = async (skill) => {
    if (!skill?.isCustom) return;
    const ok = window.confirm('이 내 스킬을 삭제할까요? 매핑된 구간에서도 제거됩니다.');
    if (!ok) return;
    const result = await customSkill.remove(skill.id);
    if (result?.error) {
      setEditorError(result.error);
      return;
    }
    skillActs.closeSkillModal();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-7 pt-6 pb-4 flex-shrink-0 border-b border-[var(--ivps-border)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-serif text-[24px] font-bold text-[var(--ivps-text1)] leading-tight">
              스킬 라이브러리
            </h1>
            <p className="text-[12px] text-[var(--ivps-text3)] mt-1">
              연습할 기술을 선택하세요 · {allSkills.length}개 스킬
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openCreateEditor}
              className="px-3.5 py-2 rounded-lg border border-[rgba(212,168,67,.35)] bg-[rgba(212,168,67,.09)] text-[var(--ivps-gold)] text-[12px] font-semibold hover:bg-[rgba(212,168,67,.14)] transition-colors"
            >
              내 스킬 만들기
            </button>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ivps-text4)] text-[13px] pointer-events-none">
                ?
              </span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="스킬 검색..."
                className="pl-8 pr-4 py-2 rounded-lg border bg-[var(--ivps-surface)] text-[12.5px] text-[var(--ivps-text1)] placeholder-[#3d4455] outline-none border-[var(--ivps-border)] focus:border-[rgba(212,168,67,.4)] transition-colors w-52"
              />
            </div>
          </div>
        </div>

        {symptomFilter && (
          <div
            className="flex items-center justify-between px-3.5 py-2 rounded-lg mb-3"
            style={{
              background: 'rgba(212,168,67,.07)',
              border: '1px solid rgba(212,168,67,.28)',
            }}
          >
            <span className="text-[12px]" style={{ color: 'var(--ivps-gold)' }}>
              증상: <strong>{symptomFilter.label}</strong> 관련 스킬
            </span>
            <button
              onClick={() => skillActs.setSymptomFilter(null)}
              className="text-[11px] transition-colors text-[var(--ivps-text4)] hover:text-[var(--ivps-gold)]"
            >
              해제
            </button>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {CAT_TABS.map(({ code, label }) => {
            const isActive = activeCat === code;
            const meta = code !== 'ALL' ? CATEGORY_META[code] : null;
            return (
              <button
                key={code}
                onClick={() => handleCatChange(code)}
                className={[
                  'px-3.5 py-1.5 rounded-full border text-[12px] font-medium transition-all',
                  isActive
                    ? ''
                    : 'bg-transparent border-[var(--ivps-border)] text-[var(--ivps-text3)] hover:border-[var(--ivps-border2)] hover:text-[var(--ivps-text2)]',
                ].join(' ')}
                style={isActive && meta ? {
                  background: `${meta.color}14`,
                  borderColor: `${meta.color}50`,
                  color: meta.color,
                } : isActive ? {
                  background: 'rgba(212,168,67,.12)',
                  borderColor: 'rgba(212,168,67,.4)',
                  color: '#d4a843',
                } : {}}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleGroups.length > 0 && (
        <div className="px-7 py-3 border-b border-[var(--ivps-border)] flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <GroupChip
              group={{ id: 'ALL', name: '전체 그룹', category: activeCat === 'ALL' ? 'A' : activeCat }}
              active={activeGroup === 'ALL'}
              onClick={() => setActiveGroup('ALL')}
            />
            {visibleGroups.map(g => (
              <GroupChip
                key={g.id}
                group={g}
                active={activeGroup === g.id}
                onClick={() => setActiveGroup(g.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-7 py-5">
        <div className="text-[10px] text-[var(--ivps-text4)] font-mono mb-4">
          {filteredSkills.length}개 스킬
          {query && ` · "${query}" 검색 결과`}
        </div>

        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-[36px] opacity-20">?</div>
            <div className="text-[13px] text-[var(--ivps-text4)] text-center leading-relaxed">
              검색 결과가 없습니다.<br />
              <button
                onClick={() => { setQuery(''); setActiveCat('ALL'); setActiveGroup('ALL'); }}
                className="mt-2 text-[var(--ivps-gold)] hover:underline text-[12px]"
              >
                필터 초기화
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {filteredSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onSelect={skillActs.openSkillModal}
              />
            ))}
          </div>
        )}
      </div>

      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={skillActs.closeSkillModal}
          onStartPractice={id => nav.goSkillPractice(id)}
          onEdit={selectedSkill.isCustom ? openEditEditor : null}
          onDelete={selectedSkill.isCustom ? handleDeleteCustomSkill : null}
        />
      )}

      {editorOpen && (
        <CustomSkillEditor
          skill={editorSkill}
          canSave
          authConfigured={auth.configured}
          storageMode={editorStorageMode}
          onClose={() => { setEditorOpen(false); setEditorSkill(null); }}
          onSave={handleSaveCustomSkill}
          saving={savingCustomSkill}
          error={editorError || customSkillError}
        />
      )}
    </div>
  );
}
