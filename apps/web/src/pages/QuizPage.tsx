import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { QuizPayload } from '../types';
import { useProgressStore } from '../state/progress';

export function QuizPage() {
  const { lessonId } = useParams();
  const [level, setLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const markLessonCompleted = useProgressStore((s) => s.markLessonCompleted);
  const addQuizResult = useProgressStore((s) => s.addQuizResult);

  const generateMutation = useMutation({
    mutationFn: () => api.generateQuiz({ lessonId: lessonId as string, level, count: 7 }),
    onSuccess: (data) => {
      setQuiz(data);
      setAnswers({});
    }
  });

  const gradeMutation = useMutation({
    mutationFn: () => api.gradeQuiz({ questions: quiz?.questions ?? [], answers }),
    onSuccess: (result) => {
      if (!lessonId) return;
      markLessonCompleted(lessonId);
      addQuizResult(lessonId, result.percent, result.weakCards.map((card) => card.id));
    }
  });

  useEffect(() => {
    if (lessonId) {
      generateMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, level]);

  const unanswered = useMemo(
    () => (quiz?.questions ?? []).filter((q) => !answers[q.id]).length,
    [quiz?.questions, answers]
  );

  if (!lessonId) return <p>잘못된 접근입니다.</p>;

  return (
    <section className="stack">
      <article className="panel">
        <div className="row between">
          <h2>레슨 퀴즈</h2>
          <select value={level} onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 난이도</option>
            <option value="intermediate">중급 난이도</option>
          </select>
        </div>
        <p>문항 수: {quiz?.questions.length ?? 0} / 미응답: {unanswered}</p>
      </article>

      {generateMutation.isPending && <p>퀴즈 생성 중...</p>}
      {generateMutation.isError && <p>퀴즈를 생성하지 못했습니다.</p>}

      {quiz?.questions.map((question, idx) => (
        <article className="panel" key={question.id}>
          <h3>{idx + 1}. {question.stem}</h3>
          <div className="stack">
            {question.choices.map((choice) => (
              <label key={choice.id} className="choice">
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === choice.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
        </article>
      ))}

      {!!quiz && (
        <button
          className="btn primary"
          disabled={unanswered > 0 || gradeMutation.isPending}
          onClick={() => gradeMutation.mutate()}
        >
          {gradeMutation.isPending ? '채점 중...' : '채점하기'}
        </button>
      )}

      {gradeMutation.data && (
        <article className="panel">
          <h3>결과: {gradeMutation.data.score}/{gradeMutation.data.total} ({gradeMutation.data.percent}%)</h3>
          {gradeMutation.data.details.map((detail) => (
            <div key={detail.questionId} className="result-item">
              <p><strong>{detail.correct ? '정답' : '오답'}</strong> · 정답: {detail.correctAnswer}</p>
              <p>{detail.explanation}</p>
            </div>
          ))}
          <div className="hero-actions">
            <Link className="btn" to="/dashboard">대시보드 보기</Link>
            <button className="btn primary" onClick={() => generateMutation.mutate()}>다시 풀기</button>
          </div>
        </article>
      )}
    </section>
  );
}
