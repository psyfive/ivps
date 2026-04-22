import { useState, useRef, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'library',   icon: '📚', label: '연습 라이브러리' },
  { id: 'cockpit',   icon: '🚀', label: '연습 콕핏' },
];

const INSTRUMENT_GROUPS = [
  {
    label: '현악',
    items: [
      { id: 'violin',     abbr: 'Vn', emoji: '🎻', name: '바이올린',     available: true },
      { id: 'viola',      abbr: 'Va', emoji: '🎻', name: '비올라',       available: false },
      { id: 'cello',      abbr: 'Vc', emoji: '🎻', name: '첼로',         available: false },
      { id: 'contrabass', abbr: 'Cb', emoji: null,  name: '콘트라베이스', available: false },
    ],
  },
  {
    label: '목관',
    items: [
      { id: 'flute',    abbr: 'Fl', emoji: '🪈', name: '플루트',   available: false },
      { id: 'oboe',     abbr: 'Ob', emoji: null,  name: '오보에',   available: false },
      { id: 'clarinet', abbr: 'Cl', emoji: null,  name: '클라리넷', available: false },
      { id: 'bassoon',  abbr: 'Fg', emoji: null,  name: '바순',     available: false },
    ],
  },
  {
    label: '금관',
    items: [
      { id: 'horn',     abbr: 'Hr', emoji: '📯', name: '호른',   available: false },
      { id: 'trumpet',  abbr: 'Tp', emoji: '🎺', name: '트럼펫', available: false },
      { id: 'trombone', abbr: 'Tb', emoji: null,  name: '트롬본', available: false },
      { id: 'tuba',     abbr: 'Tu', emoji: null,  name: '튜바',   available: false },
    ],
  },
  {
    label: '건반',
    items: [
      { id: 'piano', abbr: 'Pf', emoji: '🎹', name: '피아노', available: false },
    ],
  },
];

const ALL_INSTRUMENTS = INSTRUMENT_GROUPS.flatMap(g => g.items);

// ── 악기 아이콘/약어 배지 ──────────────────────────────────────────────────
function InstrumentBadge({ instrument, size = 'md' }) {
  if (instrument.emoji) {
    return (
      <span style={{ fontSize: size === 'sm' ? 13 : 17, lineHeight: 1 }}>
        {instrument.emoji}
      </span>
    );
  }
  const dim = size === 'sm' ? 20 : 26;
  return (
    <span
      style={{
        width: dim,
        height: dim,
        fontSize: size === 'sm' ? 8 : 10,
        fontFamily: 'ui-monospace, monospace',
        fontWeight: 700,
        borderRadius: 4,
        background: 'var(--ivps-border2)',
        color: 'var(--ivps-text3)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {instrument.abbr}
    </span>
  );
}

// ── 악기 선택 피커 팝업 ────────────────────────────────────────────────────
function InstrumentPicker({ onClose, activeInstrument, onSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: '100%',
        zIndex: 200,
        width: 196,
        background: 'var(--ivps-nav)',
        border: '1px solid var(--ivps-border2)',
        borderRadius: '0 12px 12px 12px',
        boxShadow: '4px 8px 24px rgba(0,0,0,0.20)',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--ivps-border)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ivps-text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          악기 선택
        </span>
        <button
          onClick={onClose}
          style={{
            fontSize: 13,
            color: 'var(--ivps-text4)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* 악기 그룹 목록 */}
      <div style={{ padding: '8px 10px 10px' }}>
        {INSTRUMENT_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 9,
                color: 'var(--ivps-text4)',
                fontFamily: 'ui-monospace, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 4,
                paddingLeft: 2,
              }}
            >
              {group.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
              }}
            >
              {group.items.map(inst => (
                <button
                  key={inst.id}
                  title={inst.name}
                  onClick={() => {
                    if (!inst.available) return;
                    onSelect(inst.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '5px 2px 4px',
                    borderRadius: 7,
                    border: activeInstrument === inst.id
                      ? '1.5px solid var(--ivps-gold)'
                      : '1px solid var(--ivps-border)',
                    background: activeInstrument === inst.id
                      ? 'rgba(160,120,20,0.12)'
                      : 'transparent',
                    cursor: inst.available ? 'pointer' : 'not-allowed',
                    opacity: inst.available ? 1 : 0.38,
                    transition: 'all 150ms',
                  }}
                >
                  <InstrumentBadge instrument={inst} size="sm" />
                  <span
                    style={{
                      fontSize: 8,
                      color: 'var(--ivps-text4)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {inst.abbr}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: 'var(--ivps-text4)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          준비 중인 악기는 곧 추가됩니다
        </div>
      </div>
    </div>
  );
}

// ── 설정 패널 ──────────────────────────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const { grapeBpmIncrement, settings } = usePractice();

  return (
    <div className="mx-2.5 mb-1 rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden">
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
              className="w-6 h-6 rounded border border-[var(--ivps-border2)] bg-[var(--ivps-surface2)] text-[var(--ivps-text3)] text-[13px] flex items-center justify-center hover:bg-[var(--ivps-surface)] disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-[12px] text-[var(--ivps-text1)]">
              {grapeBpmIncrement}
            </span>
            <button
              onClick={() => settings.setGrapeBpmIncrement(grapeBpmIncrement + 1)}
              disabled={grapeBpmIncrement >= 20}
              className="w-6 h-6 rounded border border-[var(--ivps-border2)] bg-[var(--ivps-surface2)] text-[var(--ivps-text3)] text-[13px] flex items-center justify-center hover:bg-[var(--ivps-surface)] disabled:opacity-30 transition-colors"
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

      <div className="px-3.5 py-3 border-t border-[var(--ivps-border)]">
        <div className="text-[10px] text-[var(--ivps-text3)] mb-2 leading-tight">
          🎨 화면 테마
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

// ── Special Thanks 패널 (빈 패널 — 추후 명단 추가 예정) ────────────────────
function SpecialThanksPanel({ onClose }) {
  return (
    <div className="mx-2.5 mb-1 rounded-xl border border-[var(--ivps-border2)] bg-[var(--ivps-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--ivps-border)]">
        <span className="text-[11px] font-semibold text-[var(--ivps-text2)] uppercase tracking-wider">
          Special Thanks to
        </span>
        <button
          onClick={onClose}
          className="text-[var(--ivps-text4)] hover:text-[var(--ivps-text2)] text-[13px] transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="px-3.5 py-5" />
    </div>
  );
}

// ── LeftNav ────────────────────────────────────────────────────────────────
export function LeftNav() {
  const { screen, nav, activeInstrument, settings } = usePractice();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [thanksOpen, setThanksOpen]     = useState(false);

  const currentInstrument =
    ALL_INSTRUMENTS.find(i => i.id === activeInstrument) ?? ALL_INSTRUMENTS[0];

  const closeAll = () => {
    setSettingsOpen(false);
    setPickerOpen(false);
    setThanksOpen(false);
  };

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[var(--ivps-nav)] border-r border-[var(--ivps-border)] transition-theme duration-250 relative">

      {/* 로고 */}
      <div className="px-4 py-5 ivps-divider-b flex items-center gap-2.5">
        <button
          onClick={() => {
            const next = !pickerOpen;
            closeAll();
            setPickerOpen(next);
          }}
          className={[
            'w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
            pickerOpen
              ? 'bg-[var(--ivps-gold)] ring-2 ring-[var(--ivps-gold)] ring-offset-1 ring-offset-[var(--ivps-nav)]'
              : 'bg-[var(--ivps-gold)] hover:scale-110',
          ].join(' ')}
          title="악기 선택"
        >
          <InstrumentBadge instrument={currentInstrument} />
        </button>
        <div>
          <div className="font-serif text-[15px] font-bold text-[var(--ivps-text1)] tracking-wide">
            Opus
          </div>
        </div>
      </div>

      {/* 악기 피커 팝업 */}
      {pickerOpen && (
        <InstrumentPicker
          onClose={() => setPickerOpen(false)}
          activeInstrument={activeInstrument}
          onSelect={settings.setInstrument}
        />
      )}

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

      {/* 설정 패널 */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      {/* 설정 버튼 */}
      <div className="px-2.5 pb-1">
        <button
          onClick={() => {
            const next = !settingsOpen;
            closeAll();
            setSettingsOpen(next);
          }}
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

      {/* Special Thanks to 버튼 */}
      <div className="px-2.5 pb-2">
        <button
          onClick={() => {
            const next = !thanksOpen;
            closeAll();
            setThanksOpen(next);
          }}
          className={[
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] border transition-colors',
            thanksOpen
              ? 'bg-[var(--ivps-surface)] border-[var(--ivps-border2)] text-[var(--ivps-text2)]'
              : 'border-transparent text-[var(--ivps-text4)] hover:text-[var(--ivps-text3)] hover:bg-[var(--ivps-surface)]',
          ].join(' ')}
        >
          <span className="text-[11px]">✦</span>
          Special Thanks to
        </button>
      </div>

      {/* Special Thanks 패널 */}
      {thanksOpen && (
        <SpecialThanksPanel onClose={() => setThanksOpen(false)} />
      )}
    </aside>
  );
}
