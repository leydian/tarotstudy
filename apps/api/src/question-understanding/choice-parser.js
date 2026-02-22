function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeOption(raw = '') {
  return String(raw || '')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[?？!.,]+$/g, '')
    .trim();
}

function parseExplicitByDelimiters(raw = '') {
  const text = String(raw || '');
  const markers = [
    /(.+?)\s*(?:\bvs\b|\bversus\b|\/|또는|혹은|\bor\b)\s*(.+)/i,
    /(.+?)\s*(?:이랑|랑|and)\s*(.+?)\s*중\s*(?:무엇|뭐|어느)\s*(?:을|를)?\s*(?:우선|고를|선택|좋|나)/i,
    /(.+?)\s*(?:와|과)\s*(.+?)\s*중\s*(?:무엇|뭐|어느)\s*(?:을|를)?\s*(?:우선|고를|선택)/i,
    /(.+?)\s*(?:중|중에|중에서)\s*(.+?)\s*(?:어떤|어느)\s*(?:게|것|쪽)/i,
    /(.+?)\s*(?:할까|갈까|살까)\s*(.+?)\s*(?:할까|갈까|살까)/i
  ];
  for (const pattern of markers) {
    const m = text.match(pattern);
    if (!m) continue;
    const left = normalizeOption(m[1]);
    const right = normalizeOption(m[2]);
    if (left && right && left !== right) {
      return { optionA: left, optionB: right };
    }
  }
  return null;
}

export function parseChoiceOptions(context = '') {
  const raw = String(context || '').trim();
  const lowered = raw.toLowerCase();
  const purchasePattern = /([\w가-힣]{2,24})(?:을|를)?\s*살까/g;
  const movePattern = /([\w가-힣]{2,24})(?:으로|로|을|를)?\s*갈까/g;
  const workPattern = /([\w가-힣]{2,24})(?:에서|로)\s*(?:일|근무|출근)/g;
  const placePattern = /([\w가-힣]{2,24})\s*에서/g;
  const actionPattern = /([\w가-힣]{1,24})\s*할까/g;

  const purchases = uniq([...raw.matchAll(purchasePattern)].map((m) => normalizeOption(m[1])));
  const moves = uniq([...raw.matchAll(movePattern)].map((m) => normalizeOption(m[1]))).filter((name) => !/(어디|여기|저기|거기|이곳|그곳)$/.test(name));
  const places = uniq([...raw.matchAll(placePattern)].map((m) => normalizeOption(m[1]))).filter((name) => !/(게|곳|데)$/.test(name));
  const workOptions = uniq([...raw.matchAll(workPattern)].map((m) => normalizeOption(m[1])));
  const actions = uniq([...raw.matchAll(actionPattern)].map((m) => normalizeOption(m[1])));

  const explicitByDelimiter = parseExplicitByDelimiters(raw);
  const explicitABPair = /A\s*안.*B\s*안|B\s*안.*A\s*안/i.test(raw);
  const isPurchaseChoice = /(살까|구매|브랜드|명품|bag|coat|wallet|buy)/i.test(lowered) && purchases.length >= 2;
  const isWorkChoice = /(일하|일할|근무|출퇴근|통근|직장|회사|오피스|사무실|출근|office|commute|job)/i.test(lowered);
  const isLocationChoice = !isPurchaseChoice && (places.length >= 2 || moves.length >= 2 || workOptions.length >= 2);

  const hasExplicitChoice = isPurchaseChoice
    || isLocationChoice
    || actions.length >= 2
    || Boolean(explicitByDelimiter)
    || explicitABPair;

  const inferredA = explicitByDelimiter?.optionA
    || (isPurchaseChoice ? purchases[0] : (moves[0] || places[0] || workOptions[0] || actions[0] || 'A안'));
  const inferredB = explicitByDelimiter?.optionB
    || (isPurchaseChoice ? purchases[1] : (moves[1] || places[1] || workOptions[1] || actions[1] || 'B안'));

  const optionA = normalizeOption(inferredA);
  const optionB = normalizeOption(inferredB);

  const mode = hasExplicitChoice && optionA !== optionB ? 'explicit_ab' : 'single';

  return {
    mode,
    hasChoice: mode !== 'single',
    optionA,
    optionB,
    isPurchaseChoice,
    isLocationChoice,
    isWorkChoice,
    choiceTypeLabel: isPurchaseChoice ? '브랜드/구매' : isLocationChoice ? '지역/거점' : isWorkChoice ? '근무지' : 'A/B',
    axes: isPurchaseChoice
      ? ['예산 압박', '즉시 만족도', '활용도', '스타일 적합성', '3개월 후 만족도']
      : isLocationChoice
        ? ['이동 거리', '정착 난이도', '생활비', '관계망/지원망', '지속 가능성']
        : isWorkChoice
          ? ['통근 시간', '교통 피로', '생활비', '성장 기회', '지속 가능성']
          : ['시간', '비용', '감정 소모', '성장 여지', '지속 가능성']
  };
}
