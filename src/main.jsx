import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css' // 테마 색상 정의서
import { ThemeProvider } from './context/ThemeContext' // 테마 기능 연결 (추가)
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {/* 가이드에 있던 PracticeProvider는 현재 프로젝트 구조에 따라 
        필요할 때 나중에 추가하면 됩니다. 지금은 ThemeProvider만 감싸줄게요! 
      */}
      <App />
    </ThemeProvider>
  </StrictMode>,
)