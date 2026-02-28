import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Sparkles, Moon, Menu, X } from 'lucide-react';
import { Home } from './pages/Home';
import { Cards } from './pages/Cards';
import { TarotMastery } from './pages/TarotMastery';
import './styles/theme.css';
import styles from './App.module.css';

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <Moon size={20} className={styles.logoIcon} />
          Arcana
        </Link>

        {/* 데스크탑 네비 */}
        <nav className={styles.desktopNav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <LayoutDashboard size={16} />
            대시보드
          </NavLink>
          <NavLink
            to="/cards"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <BookOpen size={16} />
            카드 도서관
          </NavLink>
          <NavLink
            to="/mastery"
            className={({ isActive }) =>
              isActive
                ? `${styles.navLinkPrimary} ${styles.active}`
                : styles.navLinkPrimary
            }
          >
            <Sparkles size={16} />
            아르카나 성소
          </NavLink>
        </nav>

        {/* 햄버거 버튼 */}
        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 모바일 네비 */}
      <nav className={mobileOpen ? `${styles.mobileNav} ${styles.mobileNavOpen}` : styles.mobileNav}>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? `${styles.mobileNavLink} ${styles.active}` : styles.mobileNavLink
          }
          onClick={() => setMobileOpen(false)}
        >
          <LayoutDashboard size={16} />
          대시보드
        </NavLink>
        <NavLink
          to="/cards"
          className={({ isActive }) =>
            isActive ? `${styles.mobileNavLink} ${styles.active}` : styles.mobileNavLink
          }
          onClick={() => setMobileOpen(false)}
        >
          <BookOpen size={16} />
          카드 도서관
        </NavLink>
        <NavLink
          to="/mastery"
          className={({ isActive }) =>
            isActive ? `${styles.mobileNavLink} ${styles.active}` : styles.mobileNavLink
          }
          onClick={() => setMobileOpen(false)}
        >
          <Sparkles size={16} />
          아르카나 성소
        </NavLink>
      </nav>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/mastery" element={<TarotMastery />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerDivider} />
        <p className={styles.footerText}>
          All card images are from the <strong>Rider-Waite-Smith Tarot (1909)</strong>, which is in the <strong>Public Domain</strong>.<br />
          Images provided by{' '}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          .
        </p>
        <p className={styles.footerText}>&copy; 2026 Tarot Study Web App. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
