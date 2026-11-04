/**
 * Surprise events that can interrupt the story between any two lines: a QTE, a formative or a summative.
 * StoryScene rolls once per story line (only in chapters that allow it; a script turns them off with "돌발 끔").
 *
 * Tune the feel here: `chance` is per story line, `minGap` is how many lines must pass between two events.
 */
export const RANDOM_EVENT_RULES = {
    minGap: 8,        // story lines between surprises
    firstAfter: 5,    // no surprise in a chapter's first few lines
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SUBJECTS = ['수학', '과학', '영어', '사회', '국어', '체육', '음악', '미술'];

export const RANDOM_EVENTS = [
    {
        id: 'qte',
        chance: 0.05,
        steps: () => [
            { system: '돌발 상황!', tone: 'bad' },
            pick([
                { say: '선생님', text: '민준아? 거기서 뭐 하니?' },
                { say: '선생님', text: '방금 폰 소리 누구야?' },
                { text: '복도 끝에서 볼란드 쌤이 이쪽으로 걸어온다.' },
                { text: '뒤에서 발소리가 다가온다.' },
            ]),
            {
                minigame: 'qte',
                config: { rounds: 6, required: 4 },
                win: [
                    { text: '번개 같은 손놀림으로 폰을 숨겼다. 들키지 않았다.' },
                    { add: { aura: 5, depression: -5 } },
                ],
                lose: [
                    { say: '선생님', text: '폰 압수. 방과 후에 교무실로 와.' },
                    { add: { depression: 10, aura: -5 } },
                ],
            },
        ],
    },
    {
        id: 'formative',
        chance: 0.03,
        steps: () => {
            const subject = pick(SUBJECTS);
            return [
                { system: `갑자기 ${subject} formative`, tone: 'warn' },
                { say: `${subject} 쌤`, text: pick(['자, 책 덮고. 오늘 formative 본다.', '공지 안 했는데, 그냥 지금 본다.', '성적에 조금 들어간다. 쫄지 마.']) },
                { minigame: 'exam', config: { kind: 'formative', subject } },
            ];
        },
    },
    {
        id: 'summative',
        chance: 0.012,
        steps: () => {
            const subject = pick(SUBJECTS);
            return [
                { system: `${subject} summative`, tone: 'bad' },
                { say: `${subject} 쌤`, text: pick(['오늘 summative 있는 거 다들 알지?', '휴대폰 앞에 내고. summative 시작한다.']) },
                { say: '민준', text: pick(['(...오늘이었어?)', '(아무것도 안 했는데...)', '(망했다.)']) },
                {
                    minigame: 'exam',
                    config: { kind: 'summative', subject },
                    win: [{ say: '민준', text: '(생각보다... 잘 본 것 같다?)' }],
                    lose: [{ say: '민준', text: '(엄마한테 뭐라고 하지...)' }, { add: { depression: 5 } }],
                },
            ];
        },
    },
];

/** Rolls for a surprise. Returns the event's steps, or null. */
export function rollRandomEvent(linesSinceLast, linesInChapter) {
    if (linesInChapter < RANDOM_EVENT_RULES.firstAfter || linesSinceLast < RANDOM_EVENT_RULES.minGap) return null;
    for (const event of RANDOM_EVENTS) {
        if (Math.random() < event.chance) return event.steps();
    }
    return null;
}
