/**
 * Minjun's persistent character stats (spec: "MINJOON CHARACTER STAT - 이거 계속 끌고 가는거").
 *
 * goodWhen: which direction is good for the player (used to color +/- popups).
 */
export const STAT_DEFS = {
    hanwha: {
        label: '한화',
        min: 0,
        max: Infinity,
        goodWhen: 'up',
        format: (v) => `₩${Math.round(v).toLocaleString('ko-KR')}`,
    },
    aura: { label: 'Aura', min: -100, max: 100, goodWhen: 'up', format: (v) => `${Math.round(v)}` },
    turtleNeck: { label: '거북목', min: 0, max: 100, goodWhen: 'down', format: (v) => `${Math.round(v)}/100` },
    depression: { label: 'Depression', min: 0, max: 100, goodWhen: 'down', unit: '%', format: (v) => `${Math.round(v)}%` },
    gpa: { label: 'GPA', min: 0, max: 4, goodWhen: 'up', format: (v) => (v == null ? '-' : v.toFixed(1)) },
};

export const STAT_KEYS = Object.keys(STAT_DEFS);

/** 난이도: 시작 스탯을 정한다. 'normal' matches the spec defaults (한화 5,000 / aura -50 / 거북목 0). */
export const DIFFICULTIES = {
    easy: {
        label: '쉬움',
        description: '돈 많고 아우라도 덜 구림',
        stats: { hanwha: 10000, aura: -30, turtleNeck: 0, depression: 0, gpa: null },
    },
    normal: {
        label: '보통',
        description: '기획서 기본값',
        stats: { hanwha: 5000, aura: -50, turtleNeck: 0, depression: 0, gpa: null },
    },
    hard: {
        label: '어려움',
        description: '이미 거북목 진행 중',
        stats: { hanwha: 2000, aura: -80, turtleNeck: 30, depression: 30, gpa: null },
    },
};

/** What one point does on the stat upgrade screen (spec: 스텟 강화가능: Aura, Depression, 한화, 거북목). */
export const UPGRADE_OPTIONS = [
    { key: 'aura', amount: 10, text: 'Aura +10' },
    { key: 'depression', amount: -10, text: 'Depression -10%' },
    { key: 'hanwha', amount: 1000, text: '한화 +1,000' },
    { key: 'turtleNeck', amount: -10, text: '거북목 -10' },
];

export function clampStat(key, value) {
    const def = STAT_DEFS[key];
    if (!def || value == null) return value;
    return Math.min(def.max, Math.max(def.min, value));
}

export function formatStat(key, value) {
    return STAT_DEFS[key]?.format(value) ?? String(value);
}

/** Returns true when a change of `delta` to `key` is good for the player. */
export function isGoodChange(key, delta) {
    return (STAT_DEFS[key]?.goodWhen === 'down') === delta < 0;
}

/** Ending triggered by stats alone, or null. Checked after every stat change. */
export function deathCheck(stats) {
    if (stats.turtleNeck >= STAT_DEFS.turtleNeck.max) return 'turtleNeck';
    return null;
}
