import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cards } from './pages/Cards';
import { Home } from './pages/Home';
import { Cards } from './pages/Cards';
import { TarotMastery } from './pages/TarotMastery';
import './styles/theme.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border-gold)' }}>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>TAROT STUDY WEB APP</h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Arcane Knowledge & Tarot Mastery</p>
          <nav style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <Link to="/">대시보드</Link>
            <Link to="/cards">카드 도서관</Link>
            <Link to="/mastery" style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>아르카나 성소</Link>
          </nav>
        </header>

        <main style={{ padding: '3rem max(5vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/mastery" element={<TarotMastery />} />
          </Routes>
        </main>

        <footer style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.6, fontSize: '0.9rem' }}>
          <div style={{ marginBottom: '1rem', height: '1px', background: 'linear-gradient(to right, transparent, var(--border-gold), transparent)' }}></div>
          <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            All card images are from the <strong>Rider-Waite-Smith Tarot (1909)</strong>, which is in the <strong>Public Domain</strong>.<br/>
            Images provided by <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Wikimedia Commons</a>.
          </div>
          &copy; 2026 Tarot Study Web App. All rights reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
