export const courses = [
  {
    id: 'course-1',
    title: '타로의 문턱에서: 바보의 여정 시작하기',
    description: '타로의 기본 철학과 메이저 아르카나의 흐름을 이해합니다.',
    level: '초급',
    lessons: [
      { id: 'c1-l1', title: '0. 광대(The Fool) - 무한한 가능성', cardId: 'm00' },
      { id: 'c1-l2', title: '1. 마법사(The Magician) - 창조의 힘', cardId: 'm01' },
      { id: 'c1-l3', title: '2. 고위 여사제(The High Priestess) - 내면의 직관', cardId: 'm02' }
    ]
  },
  {
    id: 'course-2',
    title: '현실과 조화: 여황제부터 연인까지',
    description: '물질적 풍요와 권위, 그리고 인간관계의 선택을 다룹니다.',
    level: '초중급',
    lessons: [
      { id: 'c2-l1', title: '3. 여황제(The Empress) - 풍요와 모성', cardId: 'm03' },
      { id: 'c2-l2', title: '4. 황제(The Emperor) - 질서와 권위', cardId: 'm04' },
      { id: 'c2-l3', title: '5. 교황(The Hierophant) - 전통과 믿음', cardId: 'm05' },
      { id: 'c2-l4', title: '6. 연인(The Lovers) - 선택과 조화', cardId: 'm06' }
    ]
  }
];

export const getCourseById = (id) => courses.find(c => c.id === id);
