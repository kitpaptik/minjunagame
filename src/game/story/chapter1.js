/**
 * Chapter 1 - 8학년
 *   [돌발 미니겜] QTE -> 1.1 배드민턴 -> 1.2 Osaka (히구루마 영역 재판) -> 1.3 Graduation (러너, 교통사고)
 */
const TRIAL_QUESTIONS = [
    {
        q: '수업 시간에 몰래 폰 게임을 했다는 제보가 들어왔다.',
        options: ['전 그런 적 없습니다.', '증거 있습니까?', '...제보자가 누구죠?'],
        answer: 1,
        wrong: '거짓말과 협박은 감점이다, fella.',
    },
    {
        q: '배드민턴부에서 김우찬에게 시비를 걸었다던데.',
        options: ['시비는 제가 걸었지만, 내기는 우찬이가 제안했습니다.', '우찬이가 먼저 쳤습니다.', '기억이 안 납니다.'],
        answer: 0,
        wrong: 'Nice try, pal.',
    },
    {
        q: '점심시간에 급식실에서 새치기를 했다는 목격자가 3명이다.',
        options: ['새치기가 아니라 자리를 맡아둔 겁니다.', '그 시간에 저는 볼란드 쌤 사무실에 있었습니다.', '배고파서 그랬습니다.'],
        answer: 1,
        wrong: '기각.',
    },
    {
        q: '숙제를 3주 연속으로 안 냈다.',
        options: ['냈는데 선생님이 잃어버리셨습니다.', '강아지가 먹었습니다.', '...안 냈습니다. 대신 이번 주는 냈습니다.'],
        answer: 2,
        wrong: '너 강아지 없잖아.',
    },
    {
        q: '마지막이다. 오사카 가서 사고 안 칠 자신 있나?',
        options: ['네! 절대 안 칩니다!', '장담은 못 하지만, 노력하겠습니다.', '볼란드 쌤도 같이 가시죠.'],
        answer: 1,
        wrong: '...그 대답이 제일 불안하군.',
    },
];

export default {
    id: 'chapter1',
    title: 'Chapter 1',
    subtitle: '8학년',
    start: 'intro',
    nodes: {
        // ---- [돌발 미니겜] ---------------------------------------------------
        intro: [
            { scene: '교실 · 수업 중', bg: '#2b3a55' },
            { title: 'Chapter 1', sub: '8학년' },
            { text: '8학년이 되었다. 수업 시간, 민준이는 책상 밑에서 몰래 게임을 하고 있다.' },
            { say: '민준', text: '(조금만... 이번 판만 깨고...)' },
            { text: '그때, 뒤에서 발소리가 다가온다.' },
            { say: '선생님', text: '민준아? 거기서 뭐 하니?' },
            { text: '[돌발 미니겜] 화면에 뜨는 키를 제때 눌러서 폰을 숨겨라!' },
            { minigame: 'qte', config: { rounds: 6, required: 4 }, win: 'hide_success', lose: 'hide_fail' },
        ],

        hide_success: [
            { text: '민준이는 번개 같은 손놀림으로 폰을 필통 속에 숨겼다.' },
            { say: '선생님', text: '...내가 잘못 봤나.' },
            { add: { aura: 10, depression: -5 } },
            { goto: 'badminton_intro' },
        ],

        hide_fail: [
            { say: '선생님', text: '폰 압수. 방과 후에 교무실로 와.' },
            { text: '민준이의 폰은 일주일 동안 교무실 서랍에 갇혔다.' },
            { add: { depression: 10, aura: -5, gpa: -0.1 } },
            { goto: 'badminton_intro' },
        ],

        // ---- 1.1 배드민턴 ----------------------------------------------------
        badminton_intro: [
            { scene: '체육관', bg: '#2b4a35' },
            { title: '1.1', sub: '배드민턴' },
            { text: '배드민턴부 입단 테스트 날. 민준이는 라켓을 꽉 쥐었다.' },
            { say: '코치', text: '민준? 한번 쳐봐. 3점 먼저.' },
            {
                minigame: 'badminton',
                config: { winScore: 3, opponentSkill: 0.3, opponentName: '입단 테스트' },
                win: 'tryout_win',
                lose: 'tryout_lose',
            },
        ],

        tryout_win: [
            { say: '코치', text: '...생각보다 하네? 합격.' },
            { add: { aura: 10, gpa: 0.1 } },
            { goto: 'team' },
        ],

        tryout_lose: [
            { say: '코치', text: '음... 인원이 모자라니까 그냥 붙여줄게.' },
            { add: { depression: 5 } },
            { goto: 'team' },
        ],

        team: [
            { text: '그렇게 민준이는 겨우겨우 배드민턴부에 들어갔다.' },
            { text: '그리고 들어오자마자 깝치기 시작했다.' },
            { say: '민준', text: '야 김우찬, 너 나랑 한 판 뜰래?' },
            { say: '김우찬', text: '...지는 사람 무릎 꿇기. 콜?' },
            {
                choice: [
                    { label: '콜!' },
                    { label: '도망가기', disabled: '이미 너무 깝쳤다. 체육관 전체가 보고 있다.' },
                ],
            },
            {
                minigame: 'badminton',
                config: { winScore: 3, opponentSkill: 1, rigged: true, opponentName: '김우찬' },
                win: 'kneel',
                lose: 'kneel',
            },
        ],

        kneel: [
            { text: '처참하게 발렸다.' },
            { say: '김우찬', text: '약속은 약속이지?' },
            { cg: 'kneel_photo', caption: '벌칙: 무릎 꿇기' },
            { add: { aura: -20, depression: 10 } },
            { text: '그래도 민준이는 포기하지 않았다. 몇 주 뒤, KISAC 대회.' },
            { scene: 'KISAC 경기장', bg: '#2b3f5a' },
            { say: '민준', text: '(이번엔... 진짜 보여준다.)' },
            {
                minigame: 'badminton',
                config: { winScore: 5, opponentSkill: 0.75, opponentName: 'KISAC 1라운드' },
                win: 'kisac_win',
                lose: 'kisac_lose',
            },
        ],

        kisac_win: [
            { text: '1라운드는 기적적으로 이겼다!' },
            { text: '...하지만 2라운드 상대는 작년 우승자였다.' },
            { add: { aura: 5 } },
            { goto: 'kisac_out' },
        ],

        kisac_lose: [
            { text: '1라운드 탈락.' },
            { add: { depression: 10 } },
            { goto: 'kisac_out' },
        ],

        kisac_out: [
            { text: '광탈. 민준이의 배드민턴 커리어는 그렇게 끝났다.' },
            { goto: 'osaka' },
        ],

        // ---- 1.2 Osaka -------------------------------------------------------
        osaka: [
            { scene: '교실', bg: '#2b3a55' },
            { title: '1.2', sub: 'Osaka' },
            { text: '8학년의 꽃, 오사카 수학여행. 그런데 출발 일주일 전...' },
            { say: '볼란드', text: 'Minjun. My office. Now.' },
            { scene: '볼란드 쌤 사무실', bg: '#4a2b2b' },
            { say: '볼란드', text: 'There\'s been some... reports about you, fella.' },
            { text: '볼란드 쌤이 천천히 손을 모은다. 방 안의 공기가 무거워진다.' },
            { say: '볼란드', text: '영역전개.' },
            {
                choice: [
                    { label: '혼자 변론하기', next: 'trial_solo' },
                    {
                        label: '변호사 고용하기',
                        cost: 3000,
                        reply: [{ text: '변호사(라는 이름의 7학년 후배)가 옆에 섰다. 변론 기회 +1.' }],
                        next: 'trial_lawyer',
                    },
                    {
                        label: '볼란드 쌤 설득하기',
                        requires: { aura: 0 },
                        reply: [
                            { say: '민준', text: '쌤. 저 이번엔 진짜 달라졌습니다.' },
                            { say: '볼란드', text: '...Fine. You\'ve got some aura, kid. 영역 해제.' },
                        ],
                        next: 'osaka_go',
                    },
                ],
            },
        ],

        trial_solo: [
            {
                minigame: 'trial',
                config: { judge: '볼란드', lives: 3, questions: TRIAL_QUESTIONS },
                win: 'osaka_go',
                lose: 'osaka_cancel',
            },
        ],

        trial_lawyer: [
            {
                minigame: 'trial',
                config: { judge: '볼란드', lives: 4, questions: TRIAL_QUESTIONS },
                win: 'osaka_go',
                lose: 'osaka_cancel',
            },
        ],

        osaka_go: [
            { say: '볼란드', text: 'Not guilty. Enjoy Osaka, fella.' },
            { scene: '오사카 · 도톤보리', bg: '#5a3b2b' },
            { text: '민준이는 오사카에 갔다! 타코야키를 먹고, 글리코상 앞에서 사진을 찍었다.' },
            { add: { depression: -15, aura: 10, hanwha: -2000, gpa: 0.2 } },
            { goto: 'graduation' },
        ],

        osaka_cancel: [
            { say: '볼란드', text: 'Alright fella, you\'re not going to Osaka.' },
            { say: '민준', text: '...네?' },
            { say: '볼란드', text: 'Yup, that\'s it pal. Your travel is canceled.' },
            { scene: '텅 빈 교실', bg: '#252a35' },
            { text: '모두가 오사카로 떠난 일주일. 민준이는 텅 빈 교실에서 혼자 자습을 했다.' },
            { add: { depression: 20, aura: -10, gpa: -0.3 } },
            { goto: 'graduation' },
        ],

        // ---- 1.3 Graduation --------------------------------------------------
        graduation: [
            { scene: '집 · 아침', bg: '#3a3a2b' },
            { title: '1.3', sub: 'Graduation' },
            { text: '8학년 졸업식 날 아침. 알람이 울리지 않았다.' },
            { say: '민준', text: '아 망했다!! 졸업식 10분 남았는데!!' },
            { minigame: 'runner', config: { duration: 25000 }, win: 'crash_final', lose: 'crash_early' },
        ],

        crash_final: [
            { text: '졸업식장이 눈앞에 보였다. 그 순간— 세 차선 전부에 돌이 쏟아졌다.' },
            { goto: 'accident' },
        ],

        crash_early: [
            { text: '졸업식장까지 절반도 못 가서였다.' },
            { goto: 'accident' },
        ],

        accident: [
            { scene: '병원', bg: '#4b5b6b' },
            { text: '교통사고였다.' },
            { text: '민준이는 졸업식 대신 병원 침대 위에서 8학년을 마쳤다.' },
            { text: '깁스한 다리를 올려놓고, 목을 쭉 뺀 채 하루 종일 폰만 본다.' },
            { add: { turtleNeck: 15, depression: 10 } },
            { say: '엄마', text: '...그래도 살아서 다행이다.' },
            { chapterEnd: null },
        ],
    },
};
