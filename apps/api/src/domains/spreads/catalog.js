export function buildSpreadCatalog(baseSpreads, targetCount = 100) {
  const normalizedTarget = Number.isFinite(targetCount)
    ? Math.max(baseSpreads.length, Math.floor(targetCount))
    : baseSpreads.length;
  if (baseSpreads.length >= normalizedTarget) return baseSpreads;

  const out = [...baseSpreads];
  const usedIds = new Set(out.map((item) => item.id));
  const domainThemes = getDomainNameThemes();
  const domainThemeIndex = {
    relationship: 0,
    career: 0,
    study: 0,
    finance: 0,
    health: 0,
    life: 0,
    general: 0
  };
  const perSpreadVariantCount = new Map();

  while (out.length < normalizedTarget) {
    for (const spread of baseSpreads) {
      if (out.length >= normalizedTarget) break;
      const sourceCount = (perSpreadVariantCount.get(spread.id) || 0) + 1;
      perSpreadVariantCount.set(spread.id, sourceCount);
      const id = `${spread.id}-extended-${String(sourceCount).padStart(2, '0')}`;
      if (usedIds.has(id)) continue;

      const domain = inferSpreadDomain(spread);
      const themePool = domainThemes[domain] || domainThemes.general;
      const themeCursor = domainThemeIndex[domain] % themePool.length;
      const theme = themePool[themeCursor];
      domainThemeIndex[domain] += 1;

      usedIds.add(id);
      out.push({
        ...spread,
        id,
        name: `${spread.name} · ${theme}`,
        purpose: `${spread.purpose} ${theme} 포인트를 중심으로 확장한 동형 배열 연습용 스프레드입니다.`
      });
    }
  }

  return out;
}

function getDomainNameThemes() {
  return {
    relationship: [
      '관계 온도 조율',
      '대화 리듬 정돈',
      '감정 균형 회복',
      '신뢰 재정렬',
      '갈등 완화 포인트',
      '관계 거리감 점검',
      '재접점 타이밍'
    ],
    career: [
      '업무 우선순위 정렬',
      '커리어 방향 점검',
      '프로젝트 추진력 강화',
      '협업 조율 전략',
      '성과 가시화 설계',
      '전환 타이밍 점검',
      '실행 병목 해소'
    ],
    study: [
      '학습 루틴 안정화',
      '시험 대비 압축 플랜',
      '오답 복기 최적화',
      '집중력 회복 설계',
      '과목 우선순위 조정',
      '합격 흐름 점검',
      '실전 감각 보강'
    ],
    finance: [
      '지출 균형 점검',
      '수입 흐름 안정화',
      '예산 재배치 전략',
      '리스크 완화 설계',
      '저축 페이스 조정',
      '재무 습관 리셋',
      '현금흐름 정렬'
    ],
    health: [
      '컨디션 리듬 회복',
      '에너지 관리 최적화',
      '휴식-활동 균형',
      '생활 패턴 정돈',
      '회복 루틴 강화',
      '몸신호 점검 플랜',
      '건강 습관 고정'
    ],
    life: [
      '생활 흐름 재정렬',
      '장기 방향성 점검',
      '일상 루틴 다듬기',
      '우선순위 간소화',
      '변화 적응 설계',
      '관계-일상 균형',
      '전환기 안정화'
    ],
    general: [
      '핵심 흐름 점검',
      '실행 우선 정리',
      '리스크 완화 설계',
      '선택지 명료화',
      '타이밍 재점검',
      '균형 운영 전략',
      '다음 수 한 수'
    ]
  };
}

function inferSpreadDomain(spread) {
  const source = [
    spread.id,
    spread.name,
    spread.purpose,
    ...(Array.isArray(spread.whenToUse) ? spread.whenToUse : [])
  ].join(' ').toLowerCase();

  if (/(연애|관계|재회|갈등|대화|friend|family|relationship)/.test(source)) return 'relationship';
  if (/(커리어|업무|이직|직장|면접|팀|리더십|project|career|job|startup|business|product|customer)/.test(source)) return 'career';
  if (/(시험|공부|학습|합격|과목|study|exam|routine|subject)/.test(source)) return 'study';
  if (/(재정|지출|수입|저축|투자|debt|savings|finance|money)/.test(source)) return 'finance';
  if (/(건강|운동|수면|영양|detox|health|workout|nutrition|burnout|stress)/.test(source)) return 'health';
  if (/(연간|월간|주간|일별|life|travel|move|relocation|direction)/.test(source)) return 'life';
  return 'general';
}
