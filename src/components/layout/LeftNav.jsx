// src/components/layout/LeftNav.jsx
import { usePractice } from '../../context/PracticeContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: '대시보드' },
  { id: 'library',   icon: '📚', label: '스킬 라이브러리' },
  { id: 'cockpit',   icon: '🎛',  label: '연습 조종석' },
];

export function LeftNav() {
  const { screen, nav } = usePractice();

  return (
    <aside className="w-[220px] bg-[#080b10] border-r border-[#1a2035] flex flex-col flex-shrink-0">
      {/* 로고 */}
      <div className="px-4 py-5 border-b border-[#1a2035] flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] bg-[#d4a843] rounded-lg flex items-center justify-center text-base flex-shrink-0">
          🎻
        </div>
        <div>
          <div className="font-serif text-[15px] font-bold text-[#e8e2d6] tracking-wide">
            IVPS
          </div>
          <div className="font-mono text-[10px] text-[#3d4455] uppercase tracking-widest">
            V4.0
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-2.5">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => nav.navigate(id)}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1',
              'text-[12.5px] font-sans text-left transition-all duration-150',
              'border-l-2',
              screen === id
                ? 'bg-[rgba(212,168,67,.1)] text-[#d4a843] border-[#d4a843] font-medium'
                : 'text-[#4a5568] border-transparent hover:bg-[rgba(255,255,255,.04)] hover:text-[#8896ae]',
            ].join(' ')}
          >
            <span className="text-sm w-4 text-center">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-3.5 border-t border-[#1a2035] text-[10px] text-[#2a3045] leading-relaxed">
        지능형 바이올린<br />연습 시뮬레이터
      </div>
    </aside>
  );
}