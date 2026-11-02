import { parseStory, ScriptError } from '../../engine/StoryScript.js';
import { STAT_WORDS, MINIGAME_WORDS, EXAM_WORDS, MILLISECOND_SETTINGS } from '../scriptWords.js';
import minigames from '../../minigames/index.js';
import endings from '../endings.js';

/**
 * Chapters are written as plain text in /story (grammar: story/README.md).
 * story/chapters.txt lists the chapter files in play order; the first one starts a new game.
 */
export const STORY_DIR = 'story/';
export const CHAPTER_LIST = `${STORY_DIR}chapters.txt`;

const WORDS = { stats: STAT_WORDS, minigames: MINIGAME_WORDS, exams: EXAM_WORDS, millisecondSettings: MILLISECOND_SETTINGS };

/** Parsed chapters keyed by id. Filled by buildChapters() during Preload. */
const chapters = {};
export default chapters;

/** Chapter ids in play order (from story/chapters.txt). */
export const chapterOrder = [];

/** Chapter ids listed in chapters.txt (one file name per line, ".txt" optional). */
export function readChapterList(text) {
    return text.split(/\r?\n/)
        .map((line) => line.trim().replace(/\.txt$/, ''))
        .filter((line) => line && !line.startsWith('//'));
}

/**
 * Parses every chapter script and checks references between them.
 * @param {string[]} ids
 * @param {(id: string) => string | undefined} getText  script source, undefined if the file failed to load
 * @returns {string[]} error messages (empty when everything is fine)
 */
export function buildChapters(ids, getText) {
    const errors = [];
    chapterOrder.splice(0, chapterOrder.length, ...ids);
    for (const key of Object.keys(chapters)) delete chapters[key];

    for (const id of ids) {
        const file = `${STORY_DIR}${id}.txt`;
        const source = getText(id);
        if (source === undefined) {
            errors.push(`${file} 파일을 찾을 수 없습니다. (chapters.txt에 적힌 이름과 파일 이름이 같은지 확인)`);
            continue;
        }
        try {
            chapters[id] = parseStory(source, { file, id, words: WORDS });
        } catch (err) {
            if (!(err instanceof ScriptError)) throw err;
            errors.push(err.message);
        }
    }

    for (const chapter of Object.values(chapters)) errors.push(...checkReferences(chapter));
    return errors;
}

/** Minigames, endings and next chapters must exist; catching this at load beats crashing mid-story. */
function checkReferences(chapter) {
    const errors = [];
    const where = (node) => `${STORY_DIR}${chapter.id}.txt "# ${node}" 장면`;
    const visit = (node, steps) => {
        for (const step of steps) {
            if (step.minigame && !minigames[step.minigame]) {
                errors.push(`${where(node)}: 미니게임 "${step.minigame}"이(가) 없습니다. (${Object.keys(MINIGAME_WORDS).join(', ')})`);
            }
            if (step.ending && !endings[step.ending]) {
                errors.push(`${where(node)}: 엔딩 "${step.ending}"이(가) 없습니다. (${Object.keys(endings).join(', ')})`);
            }
            if (step.chapterEnd && !chapterOrder.includes(step.chapterEnd)) {
                errors.push(`${where(node)}: 다음 챕터 "${step.chapterEnd}"이(가) chapters.txt에 없습니다.`);
            }
            step.choice?.forEach((option) => option.reply && visit(node, option.reply));
        }
    };
    for (const [node, steps] of Object.entries(chapter.nodes)) visit(node, steps);
    return errors;
}
