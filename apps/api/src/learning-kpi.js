export function buildLearningKpi({ progressRows = [], courses = [], lessonsByCourse = {}, spreadTelemetryStats = null } = {}) {
  const rows = Array.isArray(progressRows) ? progressRows : [];
  const totalUsers = rows.length;

  const lessonIdsByStage = new Map();
  for (const course of courses || []) {
    const stage = course.stage || '기타';
    if (!lessonIdsByStage.has(stage)) lessonIdsByStage.set(stage, []);
    const bucket = lessonIdsByStage.get(stage);
    const lessons = lessonsByCourse[course.id] || [];
    for (const lesson of lessons) bucket.push(lesson.id);
  }

  const totalLessons = Object.values(lessonsByCourse || {}).flat().length || 1;
  const completionRates = rows.map(({ snapshot }) => {
    const completed = new Set(snapshot.completedLessons || []);
    return Math.min(100, Math.round((completed.size / totalLessons) * 100));
  });
  const courseCompletionRate = completionRates.length
    ? Math.round(completionRates.reduce((acc, item) => acc + item, 0) / completionRates.length)
    : 0;

  const stageOrder = ['기초 입문', '입문 실전', '입문 심화', '중급 코어', '중급 심화', '고급 운영', '전문가 랩'];
  const userCompletedSets = rows.map(({ snapshot }) => new Set(snapshot.completedLessons || []));

  const stageResults = stageOrder
    .filter((stage) => lessonIdsByStage.has(stage))
    .map((stage) => {
      const stageLessons = lessonIdsByStage.get(stage) || [];
      const stageTotal = stageLessons.length || 1;
      const totalDoneRate = userCompletedSets.reduce((acc, completedSet) => {
        const doneCount = stageLessons.filter((id) => completedSet.has(id)).length;
        return acc + (doneCount / stageTotal) * 100;
      }, 0);
      return {
        stage,
        rate: userCompletedSets.length ? Math.round(totalDoneRate / userCompletedSets.length) : 0
      };
    });

  const stageDropoff = stageResults.map((result, index) => {
    const prevRate = index > 0 ? stageResults[index - 1].rate : result.rate;
    return {
      stage: result.stage,
      completionRate: result.rate,
      dropoffFromPrev: Math.max(0, prevRate - result.rate)
    };
  });

  const convertedUsers = rows.filter(({ snapshot }) => {
    const hasQuiz = (snapshot.quizHistory || []).length > 0;
    const hasSpread = (snapshot.spreadHistory || []).length > 0;
    return hasQuiz && hasSpread;
  }).length;
  const quizToSpreadConversion = totalUsers ? Math.round((convertedUsers / totalUsers) * 100) : 0;

  const weeklyRetention = totalUsers
    ? Math.round((rows.filter(({ snapshot }) => {
      const dates = [
        ...(snapshot.quizHistory || []).map((item) => item.date),
        ...(snapshot.spreadHistory || []).map((item) => item.reviewedAt || item.drawnAt)
      ].filter(Boolean);
      if (!dates.length) return false;
      const latest = dates
        .map((date) => new Date(date).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0];
      if (!latest) return false;
      return Date.now() - latest <= 7 * 24 * 60 * 60 * 1000;
    }).length / totalUsers) * 100)
    : 0;

  return {
    users: totalUsers,
    courseCompletionRate,
    quizToSpreadConversion,
    weeklyRetention,
    stageDropoff,
    telemetry: {
      spreadEvents: spreadTelemetryStats?.totalEvents || 0,
      spreadReviewSaved: spreadTelemetryStats?.byType?.spread_review_saved || 0,
      spreadDrawn: spreadTelemetryStats?.byType?.spread_drawn || 0
    },
    generatedAt: new Date().toISOString()
  };
}
