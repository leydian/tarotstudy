import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

const links = [
  { to: '/', label: '홈' },
  { to: '/courses', label: '코스' },
  { to: '/library', label: '카드 도감' },
  { to: '/spreads', label: '대표 스프레드' },
  { to: '/dashboard', label: '대시보드' }
];

export function Nav() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('tarot-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('tarot-theme', theme);
  }, [theme]);

  return (
    <header className="topbar">
      <div className="brand">
        <p className="brand-eyebrow">Tarot Study Lab</p>
        <h1>타로 학습 웹앱</h1>
      </div>
      <div className="topbar-actions">
        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'on' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? '다크 테마' : '라이트 테마'}
        </button>
      </div>
    </header>
  );
}
