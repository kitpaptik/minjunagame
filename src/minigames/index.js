import QteMinigame from './QteMinigame.js';
import BadmintonMinigame from './BadmintonMinigame.js';
import TrialMinigame from './TrialMinigame.js';
import RunnerMinigame from './RunnerMinigame.js';
import ExamMinigame from './ExamMinigame.js';

/** Every minigame scene class. Registered with Phaser in main.js. */
export const MINIGAME_SCENES = [QteMinigame, BadmintonMinigame, TrialMinigame, RunnerMinigame, ExamMinigame];

/** Story id -> Phaser scene key. Story steps use `{ minigame: 'qte' }`. */
export default {
    qte: 'QteMinigame',
    badminton: 'BadmintonMinigame',
    trial: 'TrialMinigame',
    runner: 'RunnerMinigame',
    exam: 'ExamMinigame',
};
