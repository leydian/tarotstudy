import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TarotMastery } from '../src/pages/TarotMastery';

const mockGetQuestionProfile = vi.fn();
const mockGetSpreads = vi.fn();
const mockGetCards = vi.fn();
const mockGetReading = vi.fn();
const mockTrackEvent = vi.fn();

vi.mock('../src/services/tarotService', () => ({
  tarotApi: {
    getQuestionProfile: (...args: unknown[]) => mockGetQuestionProfile(...args),
    getSpreads: (...args: unknown[]) => mockGetSpreads(...args),
    getCards: (...args: unknown[]) => mockGetCards(...args),
    getReading: (...args: unknown[]) => mockGetReading(...args)
  }
}));

vi.mock('../src/services/analytics', () => ({
  getAnalyticsSessionId: () => 'test-session',
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args)
}));

const sampleSpread = {
  id: 'daily',
  name: '하루 운세 (One Card)',
  description: 'daily',
  positions: [
    { id: 1, label: '오늘의 조언', x: 0, y: 0 }
  ]
};

const sampleCards = [
  {
    id: 'm01',
    name: 'The Magician',
    nameKo: '마법사',
    image: '',
    summary: '요약',
    description: '설명',
    keywords: ['시작'],
    meanings: { love: 'love', career: 'career', finance: 'finance', advice: 'advice' },
    reversed: { summary: '역요약', love: '역love', career: '역career', finance: '역finance', advice: '역advice' }
  },
  {
    id: 'c10',
    name: 'Ten of Cups',
    nameKo: '컵 10',
    image: '',
    summary: '요약',
    description: '설명',
    keywords: ['행복'],
    meanings: { love: 'love', career: 'career', finance: 'finance', advice: 'advice' },
    reversed: { summary: '역요약', love: '역love', career: '역career', finance: '역finance', advice: '역advice' }
  },
  {
    id: 's02',
    name: 'Two of Swords',
    nameKo: '검 2',
    image: '',
    summary: '요약',
    description: '설명',
    keywords: ['균형'],
    meanings: { love: 'love', career: 'career', finance: 'finance', advice: 'advice' },
    reversed: { summary: '역요약', love: '역love', career: '역career', finance: '역finance', advice: '역advice' }
  }
];

beforeEach(() => {
  mockGetQuestionProfile.mockResolvedValue({
    questionType: 'light',
    domainTag: 'general',
    riskLevel: 'low',
    readingKind: 'overall_fortune',
    fortunePeriod: 'today',
    recommendedSpreadId: 'daily',
    targetCardCount: 1
  });
  mockGetSpreads.mockResolvedValue([sampleSpread]);
  mockGetCards.mockResolvedValue(sampleCards);
  mockGetReading.mockResolvedValue({
    conclusion: '오늘 흐름은 상승입니다.',
    evidence: ['[오늘의 조언: 마법사]\n해석'],
    action: ['[운명의 지침 1] 속도 조절', '[운명의 지침 2] 우선순위 정리'],
    yesNoVerdict: 'MAYBE',
    mode: 'hybrid',
    apiUsed: 'fallback',
    fallbackUsed: true,
    report: {
      summary: '요약',
      verdict: { label: 'MAYBE', rationale: '신중 판단', recommendedOption: 'NONE' },
      fortune: {
        period: 'today',
        trendLabel: 'BALANCED',
        energy: '에너지',
        workFinance: '일',
        love: '애정',
        healthMind: '건강',
        message: '메시지'
      },
      evidence: [
        { cardId: 'm01', positionLabel: '오늘의 조언', claim: '근거1', rationale: '근거설명1', caution: '주의1' }
      ],
      counterpoints: ['변수1'],
      actions: ['행동1', '행동2']
    },
    meta: {
      questionType: 'light',
      domainTag: 'general',
      riskLevel: 'low',
      readingKind: 'overall_fortune',
      fortunePeriod: 'today',
      responseMode: 'concise',
      requestId: 'req-1',
      serverRevision: 'local',
      path: 'fallback',
      timings: { totalMs: 100 }
    }
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('TarotMastery', () => {
  it('supports quick fortune and renders result', async () => {
    render(<TarotMastery />);
    expect(screen.getByText(/어서 오세요/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '오늘 종합운세' }));

    await waitFor(() => {
      expect(mockGetQuestionProfile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('운명의 마스터 리포트')).toBeInTheDocument();
    }, { timeout: 7000 });
  });

  it('resets to input baseline', async () => {
    render(<TarotMastery />);
    const input = screen.getByPlaceholderText('운명의 도서관 사서에게 질문을 던져보세요...');
    fireEvent.change(input, { target: { value: '오늘의 종합 운세는?' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText('운명의 마스터 리포트')).toBeInTheDocument();
    }, { timeout: 7000 });

    fireEvent.click(screen.getByRole('button', { name: /새로운 질문하기/ }));
    expect(screen.getByText('새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?')).toBeInTheDocument();
  });
});
