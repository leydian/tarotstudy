import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { HomePage } from './pages/HomePage';
import { CoursesPage } from './pages/CoursesPage';
import { LessonPage } from './pages/LessonPage';
import { LibraryPage } from './pages/LibraryPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { QuizPage } from './pages/QuizPage';
import { DashboardPage } from './pages/DashboardPage';
import { SpreadsPage } from './pages/SpreadsPage';

export function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/spreads" element={<SpreadsPage />} />
          <Route path="/cards/:cardId" element={<CardDetailPage />} />
          <Route path="/quiz/:lessonId" element={<QuizPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<p>페이지를 찾을 수 없습니다.</p>} />
        </Routes>
      </main>
    </div>
  );
}
