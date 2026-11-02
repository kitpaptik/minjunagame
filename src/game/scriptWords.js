/**
 * Words the story script (story/*.txt) understands.
 * Add a nickname here and you can use it in the script right away.
 */

/** 스탯 이름 -> 스탯 키. "아우라 -10", "GPA = 2.0" 처럼 쓴다. */
export const STAT_WORDS = {
    한화: 'hanwha',
    돈: 'hanwha',
    hanwha: 'hanwha',
    아우라: 'aura',
    aura: 'aura',
    Aura: 'aura',
    거북목: 'turtleNeck',
    turtleNeck: 'turtleNeck',
    우울: 'depression',
    우울함: 'depression',
    depression: 'depression',
    Depression: 'depression',
    학점: 'gpa',
    GPA: 'gpa',
    gpa: 'gpa',
};

/**
 * 미니게임 이름 -> 미니게임 id (src/minigames/index.js), and Korean names for its settings.
 * "미니게임 배드민턴 상대=김우찬 실력=0.3" -> { minigame: 'badminton', config: { opponentName: '김우찬', opponentSkill: 0.3 } }
 */
export const MINIGAME_WORDS = {
    QTE: { id: 'qte', settings: { 횟수: 'rounds', 성공: 'required' } },
    qte: { id: 'qte', settings: { 횟수: 'rounds', 성공: 'required' } },
    배드민턴: {
        id: 'badminton',
        settings: { 점수: 'winScore', 세트: 'games', 상대: 'opponentName', 실력: 'opponentSkill', 조작: 'rigged' },
    },
    재판: { id: 'trial', settings: { 판사: 'judge', 목숨: 'lives', 질문: 'questions', 제한시간: 'secondsPerQuestion' } },
    러너: { id: 'runner', settings: { 시간: 'duration' } },
    시험: { id: 'exam', settings: { 종류: 'kind', 과목: 'subject', 문제: 'tasks', 문제수: 'count' } },
};

/** "formative 수학" / "summative 기말고사" lines start an exam (src/minigames/ExamMinigame.js). */
export const EXAM_WORDS = {
    formative: 'formative',
    Formative: 'formative',
    형성평가: 'formative',
    summative: 'summative',
    Summative: 'summative',
    총괄평가: 'summative',
};

/** Settings measured in milliseconds: "시간=25초" becomes 25000. */
export const MILLISECOND_SETTINGS = new Set(['duration']);
