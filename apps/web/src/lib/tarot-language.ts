export type TarotReadabilityMode = 'quick' | 'detail' | 'cardCompact' | 'cardNormal';

const HARD_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/실행 여지가 열려 있는 구간입니다/g, '지금은 해볼 만한 타이밍이에요'],
  [/지금은 흐름을 살려 실행해보실 수 있는 구간입니다/g, '지금은 해볼 타이밍이에요'],
  [/지금은 흐름을 살려 실행해보실 수 있는 구간이에요/g, '지금은 해볼 타이밍이에요'],
  [/종합하면/g, '한번 모아보면'],
  [/지금 장면에서 보면\s*한번 모아보면/g, '한번 모아보면'],
  [/오늘의 테마는\s*"?([^"]+)"?\s*신호를 무리 없이 이어가는 운영입니다/g, '오늘 포인트는 $1 흐름을 무리 없이 이어가는 거예요'],
  [/핵심 변수와 즉시 대응을 기준으로 읽으실 때 판단이 가장 선명해집니다/g, '중요한 포인트 하나를 잡고 바로 반응을 보면 가장 정확해요'],
  [/감정 반응보다 기준 문장을 먼저 고정하는 편이 정확합니다/g, '감정이 먼저 튀기 전에 기준 한 줄을 먼저 잡는 편이 더 정확해요'],
  [/재점검 기준은 실행 후 체감 변화 1개입니다/g, '확인할 건 실행 후 느낌 변화 한 가지면 충분해요'],
  [/기준이 개선되지 않으면 강도를 더 낮추는 쪽으로 조정하세요/g, '느낌이 안 좋아지면 세기를 한 단계 더 낮춰봐요'],
  [/결론을 내리기보다 확인 질문 1개만 먼저 건네보세요/g, '결론부터 내리지 말고 확인 질문 하나만 먼저 보내보세요'],
  [/지속 가능한/g, '오래 갈 수 있는'],
  [/파급효과/g, '이어질 영향'],
  [/재정리/g, '다시 정리'],
  [/핵심 흐름은 결론은/g, '결론은'],
  [/결정 세기가 결정됩니다/g, '결정 세기가 갈려요'],
  [/정비를 먼저 두는 편/g, '먼저 정리하는 편'],
  [/정비를 먼저 두시는 편/g, '먼저 정리하는 편']
];

const SIMPLE_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/핵심 변수/g, '중요한 포인트'],
  [/변수/g, '포인트'],
  [/즉시 대응/g, '바로 대응'],
  [/판단/g, '결정'],
  [/해석/g, '뜻풀이'],
  [/국면/g, '상황'],
  [/전개/g, '흐름'],
  [/기준점/g, '기준'],
  [/정렬/g, '정리'],
  [/운영/g, '진행'],
  [/강도/g, '세기'],
  [/단정/g, '확정'],
  [/관찰/g, '확인'],
  [/체감/g, '느낌'],
  [/리스크/g, '위험'],
  [/소모/g, '에너지 빠짐'],
  [/보류하세요/g, '잠깐 멈춰요'],
  [/안정적입니다/g, '안전해요'],
  [/안정됩니다/g, '안정돼요'],
  [/유지 시/g, '유지하면']
];

const GRAMMAR_FIXES: Array<[RegExp, string]> = [
  [/진행는/g, '진행은'],
  [/영향를/g, '영향을'],
  [/흐름를/g, '흐름을'],
  [/뜻풀이 중심을 잡아줍니다/g, '뜻풀이 중심을 잡아줘요']
];

export function normalizeTarotKorean(text: string) {
  let out = String(text || '');
  for (const [pattern, replace] of HARD_PHRASE_REPLACEMENTS) out = out.replace(pattern, replace);
  for (const [pattern, replace] of SIMPLE_WORD_REPLACEMENTS) out = out.replace(pattern, replace);
  for (const [pattern, replace] of GRAMMAR_FIXES) out = out.replace(pattern, replace);
  out = out
    .replace(/입니다\./g, '이에요.')
    .replace(/습니다\./g, '어요.')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

export function limitTarotSentenceDensity(text: string, mode: TarotReadabilityMode) {
  const sentences = String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const maxByMode: Record<TarotReadabilityMode, number> = {
    quick: 3,
    detail: 4,
    cardCompact: 3,
    cardNormal: 4
  };
  return sentences.slice(0, maxByMode[mode]).join(' ').trim();
}

export function diversifyTarotOpening(text: string) {
  const out = String(text || '').trim();
  if (!out) return out;
  const variants: Array<[RegExp, string[]]> = [
    [/^지금 장면에서 보면\s*/g, ['지금 장면에서 보면 ', '이 카드 흐름에서 보면 ', '이 자리에서 보면 ']],
    [/^핵심만 말하면\s*/g, ['핵심만 말하면 ', '핵심만 짚으면 ', '중요한 부분만 말하면 ']],
    [/^쉽게 말하면\s*/g, ['쉽게 말하면 ', '일상말로 풀면 ', '짧게 말하면 ']]
  ];
  let next = out;
  for (const [pattern, choices] of variants) {
    if (!pattern.test(next)) continue;
    pattern.lastIndex = 0;
    const seed = [...next].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const picked = choices[seed % choices.length];
    next = next.replace(pattern, picked);
  }
  return next;
}
