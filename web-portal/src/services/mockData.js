export const MOCK_USER = {
    id: 'user_12345',
    username: 'KGuardHero',
    email: 'hero@kguard.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KGuardHero', // Random avatar
};

export const MOCK_NOTICES = [
    {
        id: 1,
        title: '[공지] 서버 안정화 작업 안내',
        content: '안녕하세요, K-Guard 팀입니다. 서버 안정화를 위해 12월 24일 오전 2시부터 작업이 진행됩니다.',
        date: '2025-12-22',
        isNew: true,
    },
    {
        id: 2,
        title: '[이벤트] 크리스마스 한정 캐릭터 출시!',
        content: '신규 캐릭터 "산타 가디언"이 출시되었습니다. 지금 바로 접속해서 확인하세요!',
        date: '2025-12-20',
        isNew: true,
    },
    {
        id: 3,
        title: '[패치] v1.2.0 업데이트 노트',
        content: '버그 수정 및 UI 개선이 이루어졌습니다.',
        date: '2025-12-15',
        isNew: false,
    },
    {
        id: 4,
        title: '[안내] 랭킹 시스템 개편 예정',
        content: '다음 시즌부터 랭킹 산정 방식이 변경됩니다.',
        date: '2025-12-10',
        isNew: false,
    },
];

export const MOCK_STATS = {
    highScore: 1250400,
    rank: 154,
    totalPlayers: 15420,
    topPercent: 1.0, // Top 1%
};

export const MOCK_CHARACTERS = [
    { id: 'c1', name: 'Iron Guard', isUnlocked: true, img: 'https://via.placeholder.com/150/00f3ff/000000?text=Iron+Guard' },
    { id: 'c2', name: 'Speedster', isUnlocked: true, img: 'https://via.placeholder.com/150/ffd700/000000?text=Speedster' },
    { id: 'c3', name: 'Tanker', isUnlocked: false, unlockCondition: 'Score 500,000+', img: 'https://via.placeholder.com/150/555555/aaaaaa?text=Locked' },
    { id: 'c4', name: 'Sniper', isUnlocked: false, unlockCondition: 'Rank Top 100', img: 'https://via.placeholder.com/150/555555/aaaaaa?text=Locked' },
];
