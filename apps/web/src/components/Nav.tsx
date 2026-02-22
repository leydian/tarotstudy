import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: '홈' },
  { to: '/courses', label: '코스' },
  { to: '/library', label: '카드 도감' },
  { to: '/spreads', label: '대표 스프레드' },
  { to: '/dashboard', label: '대시보드' }
];

export function Nav() {
  return (
    <header className="topbar">
      <div className="brand">
        <p className="brand-eyebrow">Tarot Study Lab</p>
        <h1>타로 학습 웹앱</h1>
      </div>
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
    </header>
  );
}
