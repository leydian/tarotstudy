import { cards } from './cards.js';

const majorIds = cards.filter((c) => c.arcana === 'major').map((c) => c.id);
const minorWands = cards.filter((c) => c.suit === 'Wands').map((c) => c.id);
const minorCups = cards.filter((c) => c.suit === 'Cups').map((c) => c.id);
const minorSwords = cards.filter((c) => c.suit === 'Swords').map((c) => c.id);
const minorPentacles = cards.filter((c) => c.suit === 'Pentacles').map((c) => c.id);

export const courses = [
  {
    id: 'beginner-core',
    track: 'beginner',
    title: '입문 코어: 메이저 아르카나 이해',
    description: '메이저 22장을 통해 타로의 기본 서사와 해석 프레임을 학습합니다.',
    level: 'beginner'
  },
  {
    id: 'intermediate-minor',
    track: 'intermediate',
    title: '중급 확장: 마이너 아르카나 비교 해석',
    description: '4개 수트와 코트 카드를 비교하며 실전 해석력을 강화합니다.',
    level: 'intermediate'
  }
];

export const lessonsByCourse = {
  'beginner-core': [
    {
      id: 'b-1',
      title: '타로 기초 문법',
      summary: '정방향/역방향, 키워드-문맥 결합법',
      cardIds: majorIds.slice(0, 7)
    },
    {
      id: 'b-2',
      title: '성장과 선택의 카드',
      summary: '연인, 전차, 힘을 중심으로 행동과 태도 해석',
      cardIds: majorIds.slice(7, 15)
    },
    {
      id: 'b-3',
      title: '전환점 읽기',
      summary: '죽음, 탑, 별 등 변곡점 카드 해석',
      cardIds: majorIds.slice(15)
    }
  ],
  'intermediate-minor': [
    {
      id: 'i-1',
      title: '완드 vs 컵',
      summary: '열정과 감정의 결을 비교하는 법',
      cardIds: [...minorWands.slice(0, 7), ...minorCups.slice(0, 7)]
    },
    {
      id: 'i-2',
      title: '소드 vs 펜타클',
      summary: '생각과 현실 자원의 긴장/균형',
      cardIds: [...minorSwords.slice(0, 7), ...minorPentacles.slice(0, 7)]
    },
    {
      id: 'i-3',
      title: '코트 카드 심화',
      summary: '페이지/나이트/퀸/킹의 역할 비교',
      cardIds: cards
        .filter((card) => ['Page', 'Knight', 'Queen', 'King'].includes(card.rank))
        .map((card) => card.id)
    }
  ]
};

export function getCourseById(courseId) {
  return courses.find((course) => course.id === courseId);
}

export function getLessonById(lessonId) {
  return Object.values(lessonsByCourse)
    .flat()
    .find((lesson) => lesson.id === lessonId);
}
