import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpsDashboard } from '../src/pages/OpsDashboard';

describe('OpsDashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders metrics payload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        generatedAt: new Date().toISOString(),
        filters: { window: '24h', limit: 300 },
        previous: { window: '24h', totalReadings: 8, fallbackRatePct: 10, latencyP95: 1800 },
        report: {
          inputPath: '/tmp/metrics.log',
          totalReadings: 10,
          fallbackRatePct: 12.5,
          latency: { sampleSize: 10, p50: 820, p95: 2400 },
          byFailureStage: { none: 8, parse: 2 },
          byFallbackReason: { none: 8, anthropic_parse_error: 2 },
          byQuestionType: { career: 5, binary: 5 },
          byDomainTag: { general: 7, career: 3 },
          byReadingKind: { general_reading: 6, overall_fortune: 4 },
          byFortunePeriod: { none: 6, week: 2, month: 2 }
        },
        status: {
          ok: true,
          issues: [],
          thresholds: {
            fallbackRateWarnPct: 15,
            fallbackRateCriticalPct: 25,
            p95WarnMs: 3500,
            p95CriticalMs: 5000
          }
        }
      })
    } as Response);

    render(<OpsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('운영 지표 대시보드')).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(screen.getByText('Fallback Rate')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('P95 지연')).toBeInTheDocument();
    expect(screen.getByText('Top Fallback Reasons')).toBeInTheDocument();
    expect(screen.getByText('Domain Tag')).toBeInTheDocument();
  });

  it('renders error state when api fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    render(<OpsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/운영 지표를 불러오지 못했습니다/)).toBeInTheDocument();
    });
  });
});
