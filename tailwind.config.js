// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['IBM Plex Sans', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono:  ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        // v3 다크 팔레트 확장
        brand: {
          bg:      '#0d1117',
          surface: '#131720',
          nav:     '#080b10',
          border:  '#1a2035',
          border2: '#2a3048',
          gold:    '#d4a843',
          'gold-dim': '#b8891f',
          green:   '#7ea890',
          purple:  '#9b7fc8',
          blue:    '#6b90b8',
          text1:   '#e8e2d6',
          text2:   '#8896ae',
          text3:   '#4a5568',
          text4:   '#3d4455',
          dim:     '#2a3045',
        },
      },
    },
  },
  plugins: [],
};