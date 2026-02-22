import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { QuizPayload } from '../types';
import { useProgressStore } from '../state/progress';

type QuizMode = 'guided' | 'exam' | 'auto';

function answerKey(questionId: string, stepId: 'step-1' | 'step-2') {
  return `${questionId}:${stepId}`;
}

export function QuizPage() {
  const { lessonId } = useParams();
  const [level, setLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [quizMode, setQuizMode] = useState<QuizMode>('guided');
  const [instantFeedback, setInstantFeedback] = useState(true);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const markLessonCompleted = useProgressStore((s) => s.markLessonCompleted);
  const addQuizResult = useProgressStore((s) => s.addQuizResult);
  const quizHistory = useProgressStore((s) => s.quizHistory);

  const recentAccuracy = useMemo(() => {
    if (!quizHistory.length) return null;
    const recent = quizHistory.slice(0, 5);
    const sum = recent.reduce((acc, item) => acc + item.percent, 0);
    return Math.round(sum / recent.length);
  }, [quizHistory]);

  const generateMutation = useMutation({
    mutationFn: () => api.generateQuiz({
      lessonId: lessonId as string,
      level,
      count: 7,
      quizMode,
      recentAccuracy
    }),
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
  }, [lessonId, level, quizMode]);

  const unanswered = useMemo(() => {
    return (quiz?.questions ?? []).reduce((acc, question) => {
      const step1Missing = !answers[answerKey(question.id, 'step-1')];
      const step2Missing = !answers[answerKey(question.id, 'step-2')];
      return acc + (step1Missing ? 1 : 0) + (step2Missing ? 1 : 0);
    }, 0);
  }, [answers, quiz?.questions]);

  if (!lessonId) return <p>잘못된 접근입니다.</p>;

  return (
    <section className="stack">
      <article className="panel">
        <div className="row between">
          <h2>레슨 퀴즈</h2>
          <div className="filters">
            <select value={level} onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate')}>
              <option value="beginner">입문 난이도</option>
              <option value="intermediate">중급 난이도</option>
            </select>
            <select value={quizMode} onChange={(e) => setQuizMode(e.target.value as QuizMode)}>
              <option value="guided">입문(힌트 있음)</option>
              <option value="exam">실전(힌트 없음)</option>
              <option value="auto">자동(적응형)</option>
            </select>
          </div>
        </div>
        <div className="review-checks">
          <label className="review-check-item">
            <input
              type="checkbox"
              checked={instantFeedback}
              onChange={(e) => setInstantFeedback(e.target.checked)}
            />
            <span>문항별 즉시 피드백</span>
          </label>
        </div>
        <p>문항 수: {quiz?.questions.length ?? 0} / 미응답(2단계 합계): {unanswered}</p>
        {quiz?.policy && (
          <p className="sub">
            현재 정책: 보기 {quiz.policy.choiceCount}개 · 힌트 {quiz.policy.hintsEnabled ? 'ON' : 'OFF'}
            {quiz.policy.lowAccuracy ? ' · 최근 정확도 낮아 보조 모드 적용' : ''}
          </p>
        )}
      </article>

      {generateMutation.isPending && <p>퀴즈 생성 중...</p>}
      {generateMutation.isError && <p>퀴즈를 생성하지 못했습니다.</p>}

      {quiz?.questions.map((question, idx) => (
        <article className="panel" key={question.id}>
          <h3>{idx + 1}. {question.stem}</h3>
          <div className="quiz-question-head">
            {question.cardImageUrl && (
              <img
                className="quiz-card-thumb"
                src={question.cardImageUrl}
                alt={question.cardNameKo || 'quiz-card'}
                loading="lazy"
              />
            )}
            <div className="stack">
              <div className="chip-wrap">
                {question.contextTag && <span className="badge">{question.contextTag}</span>}
                {question.cardNameKo && <span className="badge">{question.cardNameKo}</span>}
                {question.arcanaLabel && <span className="badge">{question.arcanaLabel}</span>}
                {question.orientationHint && <span className="badge">{question.orientationHint}</span>}
              </div>
              {!!question.keywordCue?.length && (
                <div className="chip-wrap">
                  {question.keywordCue.map((keyword) => (
                    <span key={keyword} className="evidence-chip">{keyword}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {quiz.policy?.hintsEnabled && question.hint && <p className="sub">{question.hint}</p>}

          {question.steps.map((step, stepIndex) => {
            const key = answerKey(question.id, step.id);
            const selectedId = answers[key];
            const selectedChoice = step.choices.find((choice) => choice.id === selectedId);
            const stepLocked = step.id === 'step-2' && !answers[answerKey(question.id, 'step-1')];
            const immediateState = instantFeedback && selectedChoice
              ? (selectedChoice.correct ? '정답' : '다시 점검')
              : null;

            return (
              <div key={step.id} className="stack">
                <h4>{step.title}</h4>
                <p>{step.stem}</p>
                <div className="stack">
                  {step.choices.map((choice) => (
                    <label key={choice.id} className="choice">
                      <input
                        type="radio"
                        name={key}
                        disabled={stepLocked}
                        checked={selectedId === choice.id}
                        onChange={() => setAnswers((prev) => ({ ...prev, [key]: choice.id }))}
                      />
                      <span>{choice.text}</span>
                    </label>
                  ))}
                </div>
                {stepLocked && <p className="sub">2단계는 1단계 선택 후 열립니다.</p>}
                {immediateState && <p className="sub">{immediateState}</p>}
                {instantFeedback && selectedChoice && !selectedChoice.correct && (
                  <p className="sub">힌트: 카드 근거 1개와 실행 문장 연결 여부를 다시 보세요.</p>
                )}
                {stepIndex === 0 && <hr className="soft-divider" />}
              </div>
            );
          })}
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

      {!!quiz && (
        <article className="mobile-sticky-actions">
          <button
            className="btn primary"
            disabled={unanswered > 0 || gradeMutation.isPending}
            onClick={() => gradeMutation.mutate()}
          >
            {gradeMutation.isPending ? '채점 중...' : '채점하기'}
          </button>
          <button className="btn" onClick={() => generateMutation.mutate()}>다시 생성</button>
        </article>
      )}

      {gradeMutation.data && (
        <article className="panel">
          <h3>결과: {gradeMutation.data.score}/{gradeMutation.data.total} ({gradeMutation.data.percent}%)</h3>
          {gradeMutation.data.details.map((detail) => (
            <div key={detail.questionId} className="result-item">
              <p>
                <strong>{detail.correct ? '정답' : detail.score > 0 ? '부분 정답' : '오답'}</strong>
                {' '}· 1단계 {detail.step1Correct ? '정답' : '오답'}
                {' '}· 2단계 {detail.step2Correct ? '정답' : '오답'}
              </p>
              <p>정답(1단계): {detail.correctAnswer.step1}</p>
              <p>정답(2단계): {detail.correctAnswer.step2}</p>
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
