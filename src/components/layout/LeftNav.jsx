import { usePractice } from '../../context/PracticeContext';

// NAV_ITEMS가 파일 내부에 정의되어 있지 않다면 아래 주석을 해제하거나 
// 기존 파일에 있는 NAV_ITEMS 정의를 유지해 주세요.
const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'library', icon: '📚', label: '연습 라이브러리' },
  { id: 'cockpit', icon: '🚀', label: '연습 콕핏' },
];

export function LeftNav() {
  const { screen, nav } = usePractice();

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[var(--ivps-nav)] border-r border-[var(--ivps-border)] transition-theme duration-250">
      
      {/* 로고 영역 — ivps-divider-b(하단 구분선) 스타일 사용 */}
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

      {/* 네비 버튼 영역 — ivps-nav-btn(버튼 스타일) 및 active 로직 유지 */}
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

      {/* 하단 정보 영역 — ivps-divider-t(상단 구분선) 스타일 사용 */}
      <div className="px-4 py-3.5 ivps-divider-t text-[10px] text-[var(--ivps-text4)] leading-relaxed font-mono">
        지능형 바이올린<br />연습 시뮬레이터
      </div>
    </aside>
  );
}