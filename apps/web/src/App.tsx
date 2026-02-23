import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { RouteFallback } from './components/RouteFallback';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const CoursesPage = lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const LessonPage = lazy(() => import('./pages/LessonPage').then((m) => ({ default: m.LessonPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const CardDetailPage = lazy(() => import('./pages/CardDetailPage').then((m) => ({ default: m.CardDetailPage })));
const QuizPage = lazy(() => import('./pages/QuizPage').then((m) => ({ default: m.QuizPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SpreadsPage = lazy(() => import('./pages/SpreadsPage').then((m) => ({ default: m.SpreadsPage })));
const ChatSpreadPage = lazy(() => import('./pages/ChatSpreadPage').then((m) => ({ default: m.ChatSpreadPage })));

const routePreloaders = [
  () => import('./pages/HomePage'),
  () => import('./pages/CoursesPage'),
  () => import('./pages/LessonPage'),
  () => import('./pages/LibraryPage'),
  () => import('./pages/CardDetailPage'),
  () => import('./pages/QuizPage'),
  () => import('./pages/DashboardPage'),
  () => import('./pages/SpreadsPage'),
  () => import('./pages/ChatSpreadPage')
];

export function App() {
  useEffect(() => {
    const preload = () => {
      for (const loader of routePreloaders) {
        void loader().catch(() => {});
      }
    };
    const browser = globalThis as Window & typeof globalThis;

    if ('requestIdleCallback' in browser) {
      const idleId = (browser as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(preload);
      return () => {
        if ('cancelIdleCallback' in browser) {
          (browser as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
        }
      };
    }

    const timer = globalThis.setTimeout(preload, 400);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return (
    <div className="app-root">
      <div className="ambient-orb orb-a" aria-hidden="true" />
      <div className="ambient-orb orb-b" aria-hidden="true" />
      <div className="ambient-orb orb-c" aria-hidden="true" />
      <div className="app-shell">
        <Nav />
        <main className="content page-stage">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/spreads" element={<SpreadsPage />} />
              <Route path="/chat" element={<ChatSpreadPage />} />
              <Route path="/cards/:cardId" element={<CardDetailPage />} />
              <Route path="/quiz/:lessonId" element={<QuizPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<p>페이지를 찾을 수 없습니다.</p>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
