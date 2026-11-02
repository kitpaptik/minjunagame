import { ReactionTask, SkillComboTask, MashTask, StroopTask, MemoryTask } from './reflexTasks.js';
import { AimTask, FlyTask, DodgeTask } from './aimTasks.js';
import { RhythmTask, SmiteTask, LastHitTask, StunTask } from './timingTasks.js';

/** Every exam question type, keyed by id. Order = order shown in docs. */
export const EXAM_TASKS = Object.fromEntries([
    ReactionTask, AimTask, FlyTask, RhythmTask, SmiteTask, LastHitTask,
    StunTask, SkillComboTask, StroopTask, MemoryTask, DodgeTask, MashTask,
].map((Task) => [Task.key, Task]));

/** Short Korean names usable in story scripts: "summative 기말고사 문제=에임,강타,기억". */
export const EXAM_TASK_WORDS = {
    초록불: 'reaction',
    반응속도: 'reaction',
    에임: 'aim',
    파리: 'fly',
    비트: 'rhythm',
    리듬: 'rhythm',
    강타: 'smite',
    막타: 'lasthit',
    기절: 'stun',
    스킬콤: 'qwer',
    QWER: 'qwer',
    색깔: 'stroop',
    기억: 'memory',
    피하기: 'dodge',
    연타: 'mash',
};

/**
 * IB-style grade (1..7) from an average score, and what it does to GPA.
 * Summatives move GPA much more than formatives.
 */
export const GRADE_CUTOFFS = [90, 78, 65, 52, 40, 25]; // 7, 6, 5, 4, 3, 2 (below = 1)
export const GPA_BY_GRADE = {
    formative: { 7: 0.1, 6: 0.1, 5: 0, 4: 0, 3: -0.1, 2: -0.1, 1: -0.2 },
    summative: { 7: 0.3, 6: 0.2, 5: 0.1, 4: 0, 3: -0.1, 2: -0.2, 1: -0.3 },
};

export function gradeFor(average) {
    const i = GRADE_CUTOFFS.findIndex((cut) => average >= cut);
    return i === -1 ? 1 : 7 - i;
}
