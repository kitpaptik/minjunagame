/**
 * Prologue - 7학년 (Chapter 0)
 * Spec: "choice 몇개있는 스토리만 보여주는 느낌". Every choice leads to the same fate.
 */
const SEHA_FATE = [
    { text: '...그날 이후, 세 가지 소문이 동시에 퍼졌다.' },
    { text: '민준이는 세하의 따까리이자, 혼자 노는 찐따이자, 게이라는 소문.' },
    { say: '민준', text: '(...뭘 골랐든 결과는 똑같았을 거야.)' },
    { add: { aura: -15, depression: 10 } },
    { goto: 'day1_end' },
];

export default {
    id: 'prologue',
    title: 'Prologue',
    subtitle: '7학년',
    start: 'day1',
    nodes: {
        day1: [
            { scene: '교실', bg: '#2b3a55' },
            { title: 'Day 1', sub: '7학년, 전학 첫날' },
            { text: '7학년 2학기. 민준이는 새 학교로 전학을 왔다.' },
            { say: '선생님', text: '자, 오늘 전학 온 친구야. 간단하게 자기소개 해볼까?' },
            { say: '민준', text: '(첫인상이 제일 중요하다... 어떻게 하지?)' },
            {
                choice: [
                    { label: '조용히 있기', disabled: '...몸이 말을 듣지 않는다.' },
                    {
                        label: '나대기',
                        add: { aura: -10 },
                        reply: [
                            { say: '민준', text: '안녕! 나 민준인데, 오늘부터 이 반 내가 접수한다!' },
                            { text: '교실에 정적이 흘렀다. 누군가 작게 "아..." 하고 탄식했다.' },
                        ],
                    },
                ],
            },
            { scene: '쉬는 시간 · 교실 뒤', bg: '#3a2b45' },
            { text: '쉬는 시간. 교실 뒤쪽에 덩치 큰 애 하나가 다리를 꼬고 앉아 있다.' },
            { say: '세하', text: '...뭘 봐.' },
            { say: '민준', text: '(저 녀석... 겁나 쌔 보인다.)' },
            {
                choice: [
                    { label: '세하 따까리 되기', reply: [{ say: '민준', text: '혹시... 매점 가실 때 제가 들어드려도 될까요?' }], next: 'seha_fate' },
                    { label: '혼자 찐따 되기', reply: [{ say: '민준', text: '(...그냥 엎드려서 자는 척 하자.)' }], next: 'seha_fate' },
                    { label: '게이 되기', reply: [{ say: '민준', text: '...너 좀 멋있다.' }, { say: '세하', text: '?' }], next: 'seha_fate' },
                ],
            },
        ],

        seha_fate: SEHA_FATE,

        day1_end: [
            { scene: '집', bg: '#1f2a33' },
            { text: '파란만장한 첫날이 끝났다. 내일을 위해 정신을 가다듬자.' },
            { upgrade: 3 },
            { goto: 'day2' },
        ],

        day2: [
            { scene: '복도', bg: '#2b4a45' },
            { title: 'Day 2', sub: '사랑, 그리고 정학' },
            { text: '아침 복도. 창문 너머로 햇살이 쏟아지는 순간—' },
            { say: '민준', text: '(...저 애는 누구지? 심장이 이상하다.)' },
            { text: '엘리아였다. 민준이는 첫눈에 반했다.' },
            {
                choice: [
                    {
                        label: '고백하기',
                        add: { depression: 15, aura: -10 },
                        reply: [
                            { say: '민준', text: '저기... 나랑 사귈래?' },
                            { say: '엘리아', text: '어...? 미안. 근데 너 누구야?' },
                            { text: '차였다. 이름도 모르는 사람에게.' },
                        ],
                    },
                ],
            },
            { scene: '교실', bg: '#2b3a55' },
            { say: '민준', text: '아 진짜 XX... 이게 말이 되냐고 XXX...' },
            { say: '선생님', text: '민준! 방금 뭐라고 했니?' },
            { say: '선생님', text: '지금 당장 볼란드 쌤한테 가.' },
            { scene: '볼란드 쌤 사무실', bg: '#4a2b2b' },
            { say: '볼란드', text: 'So. You know why you\'re here, fella?' },
            {
                choice: [
                    {
                        label: '변명하기',
                        reply: [
                            { say: '민준', text: '그게... 혼잣말이었고요, 사실 욕이 아니라 감탄사...' },
                            { say: '볼란드', text: 'Nice try, pal.' },
                        ],
                    },
                    {
                        label: '자백하기',
                        reply: [
                            { say: '민준', text: '...네. 제가 했습니다.' },
                            { say: '볼란드', text: 'I appreciate the honesty, fella. Still.' },
                        ],
                    },
                ],
            },
            { say: '볼란드', text: 'You\'re suspended. 정학이야.' },
            { add: { depression: 10 } },
            { scene: '집 · 밤', bg: '#141a24' },
            { text: '집에 돌아온 민준이는 방에 틀어박혀 혼자 울었다.' },
            { say: '엄마', text: '정학?! 전학 온 지 이틀 만에?! 너 당장 나가!!' },
            { text: '민준이는 집에서 쫓겨났다. 현관 앞에 쭈그려 앉아 폰만 바라본다.' },
            { add: { depression: 10, turtleNeck: 5 } },
            { set: { gpa: 2.0 } },
            { chapterEnd: 'chapter1' },
        ],
    },
};
