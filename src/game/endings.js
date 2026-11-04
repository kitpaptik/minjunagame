import { INK } from '../ui/theme.js';

/** Ending screens, referenced by `{ ending: id }` story steps or by stat death checks. */
export default {
    turtleNeck: {
        title: '거북목 엔딩',
        text: '거북목 진행도 100.\n민준이의 목은 더 이상 앞으로 나올 수 없을 만큼 나와버렸다.',
        color: INK.bad,
    },
    dropout: {
        title: '자퇴 엔딩',
        text: '민준이는 스스로 학교를 떠났다.',
        color: INK.warn,
    },
    expelled: {
        title: '퇴학 엔딩',
        text: '민준이는 학교에서 쫓겨났다.',
        color: INK.bad,
    },
};
