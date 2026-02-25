import { generateReadingV3 } from './src/domains/reading/v3.js';

const dummyCards = [
  { 
    id: 'w01', nameKo: '지팡이 에이스', 
    summary: '열정적인 시작과 기회', 
    description: '구름 속의 손이 지팡이를 쥐고 있습니다. 새로운 열정이 시작됩니다.',
    meanings: { love: '불같은 사랑의 시작', career: '새로운 프로젝트 착수', finance: '금전운의 시작', advice: '지금 바로 실행하세요.' }
  },
  { 
    id: 's03', nameKo: '검 3', 
    summary: '마음의 상처와 아픔', 
    description: '심장에 세 개의 검이 꽂혀 있습니다. 슬픔이 느껴집니다.',
    meanings: { love: '이별의 아픔', career: '업무상의 큰 실망', finance: '금전적 손실', advice: '슬픔을 충분히 겪으세요.' }
  }
];

const testCases = [
  { q: "그 사람 속마음이 궁금해", cat: "연애(기본)" },
  { q: "전 애인과 재회할 수 있을까?", cat: "연애(재회)" },
  { q: "이번에 이직하는 게 맞을까?", cat: "직장(이직)" },
  { q: "비트코인 풀매수 때려도 될까?", cat: "금전(투자/현대)" },
  { q: "이번 공무원 시험 합격할까요?", cat: "학업(치환 테스트)" },
  { q: "무릎 수술 결과가 좋을까요?", cat: "건강(치환 테스트)" },
  { q: "언제쯤 내 집 마련을 할 수 있을까?", cat: "시기(언제)" },
  { q: "사과 마실까 포도 마실까?", cat: "양자택일" },
  { q: "강남, 홍대, 신촌 중 어디가 좋아?", cat: "다자택일(랭킹)" },
  { q: "너무 힘들어서 다 포기하고 싶어", cat: "감정(위로/공감)" },
  { q: "커피 마실까?", cat: "라이트(요약)" }
];

console.log("=== V5.0 ENGINE TEST REPORT ===");

testCases.forEach((t, i) => {
  const result = generateReadingV3(dummyCards, t.q);
  console.log(`[TEST ${i+1}: ${t.cat}] Q: ${t.q}`);
  
  const compass = result.conclusion.split('[운명의 나침반]')[1] || 'GENERAL READING';
  console.log(`Verdict: ${compass.trim()}`);
  
  if (t.cat.includes('치환')) {
    console.log(`Smart Context: ${result.evidence[0].split('\n')[2]}`);
  }
  if (t.cat.includes('감정')) {
    const isWarmed = result.conclusion.includes('무거우셨군요');
    console.log(`Emotional Warmth: ${isWarmed ? 'SUCCESS' : 'FAIL'}`);
  }
  console.log("-".repeat(30));
});
