import { useState } from 'react';
import { usePractice } from '../../context/PracticeContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'library',   icon: '📚', label: '연습 라이브러리' },
  { id: 'cockpit',   icon: '🚀', label: '연습 콕핏' },
];

// ── 설정 패널 ──────────────────────────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const { grapeBpmIncrement, settings } = usePractice();

  return (
    <div className="mx-2.5 mb-2.5 rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--ivps-border)]">
        <span className="text-[11px] font-semibold text-[var(--ivps-text2)] uppercase tracking-wider">
          설정
        </span>
        <button
          onClick={onClose}
          className="text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)] text-[13px] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 설정 항목: 포도송이 체크 BPM 증가량 */}
      <div className="px-3.5 py-3">
        <div className="text-[10px] text-[var(--ivps-text3)] mb-1 leading-tight">
          🍇 포도송이 체크
        </div>
        <div className="text-[9.5px] text-[var(--ivps-text4)] mb-2 leading-relaxed">
          포도 하나 체크할 때마다 BPM이 증가합니다.
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-[var(--ivps-text3)] flex-1">
            체크당 BPM 증가량
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => settings.setGrapeBpmIncrement(grapeBpmIncrement - 1)}
              disabled={grapeBpmIncrement <= 0}
              className="w-6 h-6 rounded border border-[var(--ivps-border2)] bg-[var(--ivps-surface2)] text-[var(--ivps-text3)] text-[13px] flex items-center justify-center hover:bg-[#222b3d] disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-[12px] text-[var(--ivps-text1)]">
              {grapeBpmIncrement}
            </span>
            <button
              onClick={() => settings.setGrapeBpmIncrement(grapeBpmIncrement + 1)}
              disabled={grapeBpmIncrement >= 20}
              className="w-6 h-6 rounded border border-[var(--ivps-border2)] bg-[var(--ivps-surface2)] text-[var(--ivps-text3)] text-[13px] flex items-center justify-center hover:bg-[#222b3d] disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>
        </div>
        {grapeBpmIncrement === 0 && (
          <div className="mt-1.5 text-[9px] text-[var(--ivps-text4)] italic">
            0으로 설정하면 BPM이 변경되지 않습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ── LeftNav ────────────────────────────────────────────────────────────────
export function LeftNav() {
  const { screen, nav } = usePractice();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[var(--ivps-nav)] border-r border-[var(--ivps-border)] transition-theme duration-250">

      {/* 로고 */}
      <div className="px-4 py-5 ivps-divider-b flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-[var(--ivps-gold)]">
          🎻
        </div>
        <div>
          <div className="font-serif text-[15px] font-bold text-[var(--ivps-text1)] tracking-wide">
            IVPS
          </div>
          <div className="font-mono text-[10px] text-[var(--ivps-text4)] uppercase tracking-widest">
            V4.0
          </div>
        </div>
      </div>

      {/* 네비 버튼 */}
      <nav className="flex-1 p-2.5">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => nav.navigate(id)}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1',
              'text-[12.5px] font-sans text-left border-l-2',
              'ivps-nav-btn',
              screen === id ? 'active' : '',
            ].join(' ')}
          >
            <span className="text-sm w-4 text-center">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* 설정 패널 (펼쳐질 때) */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      {/* 설정 버튼 */}
      <div className="px-2.5 pb-2">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className={[
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] border transition-colors',
            settingsOpen
              ? 'bg-[var(--ivps-surface)] border-[var(--ivps-border2)] text-[var(--ivps-text2)]'
              : 'border-transparent text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)] hover:bg-[var(--ivps-surface)]',
          ].join(' ')}
        >
          <span className="text-[13px]">⚙</span>
          설정
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="px-4 py-3 ivps-divider-t text-[10px] text-[var(--ivps-text4)] leading-relaxed font-mono">
        지능형 바이올린<br />연습 시뮬레이터
      </div>
    </aside>
  );
}
