function safeIsoToTs(value) {
  const ts = new Date(String(value || '')).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function summarize(text = '', max = 140) {
  const line = String(text || '').replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max).trimEnd()}...`;
}

function inferPriorityFromScore(percent) {
  if (percent < 50) return 'high';
  if (percent < 70) return 'medium';
  return 'low';
}

export function buildNextActions({
  userId,
  snapshot,
  courses = [],
  lessonsByCourse = {}
}) {
  const completedSet = new Set(snapshot?.completedLessons || []);
  const orderedCourses = [...courses].sort((a, b) => (a.stageOrder ?? 99) - (b.stageOrder ?? 99) || (a.order ?? 99) - (b.order ?? 99));
  const actions = [];

  let nextLessonAction = null;
  for (const course of orderedCourses) {
    const lessons = lessonsByCourse[course.id] || [];
    const next = lessons.find((lesson) => !completedSet.has(lesson.id));
    if (next) {
      nextLessonAction = {
        id: `next-lesson:${course.id}:${next.id}`,
        type: 'next_lesson',
        title: `다음 추천 레슨: ${next.title}`,
        description: `${course.stage || course.track} 단계에서 다음 학습입니다.`,
        href: `/courses/${course.id}/lessons/${next.id}`,
        priority: 'high',
        reason: '완주율을 높이려면 다음 1개 레슨의 즉시 진입이 가장 중요합니다.'
      };
      break;
    }
  }
  if (nextLessonAction) actions.push(nextLessonAction);

  const recentQuiz = [...(snapshot?.quizHistory || [])]
    .sort((a, b) => safeIsoToTs(b.date) - safeIsoToTs(a.date))
    .slice(0, 5);
  for (const item of recentQuiz) {
    if (typeof item.percent === 'number' && item.percent < 70) {
      actions.push({
        id: `quiz-review:${item.lessonId}`,
        type: 'quiz_review',
        title: `${item.lessonId} 복습 우선`,
        description: `최근 퀴즈 ${item.percent}%로 약점 보완이 필요합니다.`,
        href: `/quiz/${item.lessonId}`,
        priority: inferPriorityFromScore(item.percent),
        reason: '저점수 레슨의 즉시 복습은 완주 전 이탈을 줄입니다.'
      });
    }
  }

  const pendingSpread = (snapshot?.spreadHistory || []).find((row) => !row.outcome);
  if (pendingSpread) {
    actions.push({
      id: `spread-review:${pendingSpread.id}`,
      type: 'spread_review',
      title: `${pendingSpread.variantName || pendingSpread.spreadName} 복기 저장`,
      description: '미복기 기록 1건이 있습니다. 판정과 메모를 남겨 학습 루프를 닫아주세요.',
      href: '/spreads',
      priority: 'medium',
      reason: '복기 저장률이 높을수록 재방문과 정확도 개선이 빨라집니다.'
    });
  }

  const latestActivityTs = [
    ...(snapshot?.quizHistory || []).map((row) => safeIsoToTs(row.date)),
    ...(snapshot?.spreadHistory || []).map((row) => safeIsoToTs(row.reviewedAt || row.drawnAt)),
    safeIsoToTs(snapshot?.updatedAt)
  ].sort((a, b) => b - a)[0] || 0;
  const idleDays = latestActivityTs > 0 ? (Date.now() - latestActivityTs) / (24 * 60 * 60 * 1000) : 999;
  if (idleDays >= 3) {
    actions.push({
      id: 'resume-routine',
      type: 'routine_resume',
      title: '학습 루틴 재시작',
      description: `${Math.floor(idleDays)}일 비활성 상태입니다. 3분 모드로 가볍게 재시작하세요.`,
      href: '/spreads',
      priority: 'high',
      reason: '3일 이상 공백 이후 재진입 허들이 급격히 높아집니다.'
    });
  }

  const priorityRank = { high: 3, medium: 2, low: 1 };
  const dedup = new Map();
  for (const action of actions) {
    if (!dedup.has(action.id)) dedup.set(action.id, action);
  }

  return {
    userId,
    generatedAt: new Date().toISOString(),
    actions: [...dedup.values()]
      .sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))
      .slice(0, 6)
  };
}

export function buildReviewInbox({ snapshot, spreadId = '', limit = 20 }) {
  const cap = Math.max(1, Math.min(100, Number(limit) || 20));
  const rows = (snapshot?.spreadHistory || [])
    .filter((row) => !row.outcome)
    .filter((row) => !spreadId || row.spreadId === spreadId)
    .sort((a, b) => safeIsoToTs(b.drawnAt) - safeIsoToTs(a.drawnAt))
    .slice(0, cap)
    .map((row) => ({
      id: row.id,
      spreadId: row.spreadId,
      spreadName: row.spreadName,
      variantName: row.variantName,
      context: row.context,
      drawnAt: row.drawnAt,
      summaryPreview: summarize(row.summary, 180),
      suggestedAction: '판정(맞음/부분/다름) 1개 선택 + 복기 메모 1줄'
    }));

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    items: rows
  };
}

function inWindow(ts, windowMs) {
  if (!ts) return false;
  return Date.now() - ts <= windowMs;
}

export function buildLearningFunnel({ progressRows = [], window = '7d' }) {
  const windowMs = window === '30d' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const rows = Array.isArray(progressRows) ? progressRows : [];

  const activeUsers = rows.filter(({ snapshot }) => {
    const latest = [
      ...(snapshot?.quizHistory || []).map((row) => safeIsoToTs(row.date)),
      ...(snapshot?.spreadHistory || []).map((row) => safeIsoToTs(row.reviewedAt || row.drawnAt)),
      safeIsoToTs(snapshot?.updatedAt)
    ].sort((a, b) => b - a)[0] || 0;
    return inWindow(latest, windowMs);
  });

  const stepCounts = {
    active_users: activeUsers.length,
    lesson_completed: activeUsers.filter(({ snapshot }) => (snapshot?.completedLessons || []).length > 0).length,
    quiz_attempted: activeUsers.filter(({ snapshot }) => (snapshot?.quizHistory || []).length > 0).length,
    spread_drawn: activeUsers.filter(({ snapshot }) => (snapshot?.spreadHistory || []).length > 0).length,
    spread_reviewed: activeUsers.filter(({ snapshot }) => (snapshot?.spreadHistory || []).some((row) => Boolean(row.outcome))).length
  };

  const ordered = [
    ['active_users', '활성 사용자'],
    ['lesson_completed', '레슨 완료'],
    ['quiz_attempted', '퀴즈 시도'],
    ['spread_drawn', '스프레드 드로우'],
    ['spread_reviewed', '스프레드 복기 저장']
  ];

  const steps = ordered.map(([id, label], idx) => {
    const count = stepCounts[id] || 0;
    const prev = idx === 0 ? count : (stepCounts[ordered[idx - 1][0]] || 0);
    const conversionFromPrev = prev > 0 ? Number(((count / prev) * 100).toFixed(1)) : 0;
    return { id, label, users: count, conversionFromPrev };
  });

  return {
    generatedAt: new Date().toISOString(),
    window,
    users: stepCounts.active_users,
    steps
  };
}
