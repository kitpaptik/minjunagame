/**
 * Turns a plain-text story script (story/*.txt, grammar: story/README.md) into the
 * step objects StoryScene runs. Every mistake is reported with its file and line number.
 *
 *   # day1
 *   장소 교실 #2b3a55
 *   민준: 안녕!
 *   선택
 *     - 나대기 (아우라 -10) → day2
 */

export class ScriptError extends Error {
    constructor(file, line, message) {
        super(line ? `${file} ${line}번째 줄: ${message}` : `${file}: ${message}`);
        this.file = file;
        this.line = line;
    }
}

const ARROW = String.raw`(?:→|->|=>)`;
const NUMBER = String.raw`[+-]?\d[\d,]*(?:\.\d+)?`;

const RULES = {
    node: /^#\s*(.+?)\s*$/,
    questionSet: /^질문\s*목록\s*[:：]?\s*(\S+)$/,
    narration: /^>\s?(.*)$/,
    place: /^장소\s+(.+?)(?:\s+(#[0-9a-fA-F]{6}))?$/,
    title: /^타이틀\s+(.+?)(?:\s*\/\s*(.+))?$/,
    choice: /^선택(?:지)?\s*[:：]?$/,
    bullet: /^[-*•]\s*(.+)$/,
    minigame: /^미니게임\s+(\S+)\s*(.*)$/,
    exam: /^(\S+)\s+([^\s=]+)\s*(.*)$/,
    win: new RegExp(String.raw`^(?:이기면|성공하면)\s*${ARROW}?\s*(\S+)$`),
    lose: new RegExp(String.raw`^(?:지면|실패하면)\s*${ARROW}?\s*(\S+)$`),
    both: new RegExp(String.raw`^(?:결과\s*상관없이\s*)?${ARROW}\s*(\S+)$`),
    picture: /^(?:그림|CG)\s+(\S+)(?:\s*\/\s*(.+))?$/,
    upgrade: /^(?:스탯\s*)?강화(?:\s+(\d+))?(?:\s*포인트)?$/,
    goto: new RegExp(String.raw`^(?:${ARROW}|이동)\s*(\S+)$`),
    chapterEnd: new RegExp(String.raw`^챕터\s*끝(?:\s*${ARROW}\s*(\S+))?$`),
    ending: /^엔딩\s+(\S+)$/,
    say: /^([^\s:：>#\-*•[(][^:：]{0,9}?)\s*[:：]\s*(.+)$/,
    statPrefix: /^스탯\s*[:：]?\s*/,
    statChange: new RegExp(String.raw`([^\s,+=\-\d][^\s,+=\-]*)\s*(=|(?=[+-]))\s*(${NUMBER})`, 'g'),
    nextAtEnd: new RegExp(String.raw`\s*${ARROW}\s*(\S+)\s*$`),
    locked: /^(?:잠김|막힘|안\s*눌림)\s*[:：]?\s*(.*)$/,
    requires: /^(\S+)\s*([+-]?\d+(?:\.\d+)?)\s*이상$/,
    cost: /^(?:비용|한화)\s*(\d[\d,]*)\s*(?:원)?$/,
    question: /^(?:\?|질문\s*[:：]?)\s*(.+)$/,
    answerMark: /\s*\(정답\)\s*$/,
    wrong: /^틀리면\s*[:：]?\s*(.+)$/,
};

/**
 * @param {string} source  script text
 * @param {object} options
 * @param {string} options.file      file name for error messages
 * @param {string} options.id        chapter id
 * @param {object} options.words     { stats, minigames, exams, millisecondSettings } from src/game/scriptWords.js
 * @returns {{ id, title, subtitle, start, nodes }}
 */
export function parseStory(source, { file, id, words }) {
    return new StoryParser(source, file, words).parse(id);
}

class StoryParser {
    constructor(source, file, words) {
        this.file = file;
        this.words = words;
        this.pos = 0;
        this.lines = source.split(/\r?\n/)
            .map((raw, i) => ({ no: i + 1, indent: indentOf(raw), text: raw.trim() }))
            .filter((line) => line.text && !line.text.startsWith('//'));
    }

    parse(id) {
        const chapter = { id, title: id, subtitle: '', start: null, nodes: {} };
        this.questionSets = {};
        this.refs = []; // node names used by →, checked once every node is known

        this.#parseHeader(chapter);
        while (this.#peek()) {
            const line = this.#next();
            const name = line.text.match(RULES.node)[1];
            const set = name.match(RULES.questionSet);
            if (set) {
                this.questionSets[set[1]] = this.#parseQuestions(line, set[1]);
                continue;
            }
            if (chapter.nodes[name]) this.#fail(line, `장면 "${name}"이(가) 두 번 나옵니다.`);
            chapter.start ??= name;
            chapter.nodes[name] = this.#parseBlock(-1);
        }

        if (!chapter.start) this.#fail(null, '장면이 하나도 없습니다. "# 장면이름" 줄로 시작하세요.');
        for (const { line, node } of this.refs) {
            if (!chapter.nodes[node]) this.#fail(line, `"${node}" 장면이 없습니다. (# ${node} 줄이 있는지 확인)`);
        }
        this.#resolveQuestionSets(chapter);
        return chapter;
    }

    // ---- Structure ---------------------------------------------------------

    #parseHeader(chapter) {
        while (this.#peek() && !this.#isNode(this.#peek())) {
            const line = this.#next();
            const m = line.text.match(/^(제목|부제)\s+(.+)$/);
            if (!m) this.#fail(line, '첫 장면(# 이름) 전에는 "제목 ..."과 "부제 ..."만 쓸 수 있습니다.');
            chapter[m[1] === '제목' ? 'title' : 'subtitle'] = m[2];
        }
    }

    /** Reads every line indented deeper than `parentIndent`, up to the next "# 장면". */
    #parseBlock(parentIndent) {
        const steps = [];
        while (this.#peek() && !this.#isNode(this.#peek()) && this.#peek().indent > parentIndent) {
            steps.push(...this.#parseStep(this.#next()));
        }
        return steps;
    }

    #parseStep(line) {
        const t = line.text;
        let m;

        if ((m = t.match(RULES.narration))) return [{ text: m[1] }];
        if ((m = t.match(RULES.place))) return [m[2] ? { scene: m[1], bg: m[2] } : { scene: m[1] }];
        if ((m = t.match(RULES.title))) return [{ title: m[1], sub: m[2] ?? '' }];
        if (RULES.choice.test(t)) return [{ choice: this.#parseOptions(line) }];
        if ((m = t.match(RULES.minigame))) return [this.#parseMinigame(line, m[1], m[2])];
        if ((m = t.match(RULES.exam)) && this.words.exams?.[m[1]]) {
            return [this.#parseMinigame(line, '시험', `종류=${this.words.exams[m[1]]} 과목="${m[2]}" ${m[3]}`)];
        }
        if ((m = t.match(RULES.picture))) return [{ cg: m[1], caption: m[2] }];
        if ((m = t.match(RULES.upgrade))) return [{ upgrade: Number(m[1] ?? 3) }];
        if ((m = t.match(RULES.chapterEnd))) return [{ chapterEnd: m[1] ?? null }];
        if ((m = t.match(RULES.ending))) return [{ ending: m[1] }];
        if ((m = t.match(RULES.goto))) return [{ goto: this.#ref(line, m[1]) }];
        if (RULES.bullet.test(t)) this.#fail(line, '"- " 선택지는 "선택" 줄 바로 아래에 들여써서 적어야 합니다.');

        const stats = this.#parseStats(t.replace(RULES.statPrefix, ''));
        if (stats) return Object.entries(stats).map(([kind, values]) => ({ [kind]: values }));

        if ((m = t.match(RULES.say))) return [{ say: m[1], text: m[2] }];
        return [{ text: t }];
    }

    #parseOptions(choiceLine) {
        const options = [];
        while (this.#peek() && !this.#isNode(this.#peek()) && this.#peek().indent > choiceLine.indent) {
            const line = this.#next();
            const m = line.text.match(RULES.bullet);
            if (!m) this.#fail(line, '선택지는 "- 버튼 이름" 형식으로 적어야 합니다.');
            const option = this.#parseOption(line, m[1]);
            const reply = this.#parseBlock(line.indent);
            if (reply.length) option.reply = reply;
            options.push(option);
        }
        if (!options.length) this.#fail(choiceLine, '"선택" 아래에 "- 버튼 이름" 줄이 하나도 없습니다.');
        return options;
    }

    /** "나대기 (아우라 -10) [아우라 0 이상] [비용 3000] [잠김: 메시지] → 다음장면" */
    #parseOption(line, text) {
        const option = {};
        let rest = text;

        rest = rest.replace(RULES.nextAtEnd, (_, node) => {
            option.next = this.#ref(line, node);
            return '';
        });
        rest = rest.replace(/\[([^\]]*)\]/g, (_, inner) => {
            this.#parseCondition(line, inner.trim(), option);
            return '';
        });
        rest = rest.replace(/\(([^)]*)\)/g, (whole, inner) => {
            const stats = this.#parseStats(inner);
            if (!stats) return whole; // ordinary parentheses in the button text
            if (stats.set) this.#fail(line, '선택지 괄호 안에서는 "=" 대신 +/- 로 적어주세요.');
            option.add = { ...option.add, ...stats.add };
            return '';
        });

        option.label = rest.trim();
        if (!option.label) this.#fail(line, '선택지 버튼 이름이 비어 있습니다.');
        return option;
    }

    #parseCondition(line, text, option) {
        let m;
        if ((m = text.match(RULES.locked))) {
            option.disabled = m[1] || true;
        } else if ((m = text.match(RULES.cost))) {
            option.cost = toNumber(m[1]);
        } else if ((m = text.match(RULES.requires))) {
            const key = this.#statKey(line, m[1]);
            option.requires = { ...option.requires, [key]: Number(m[2]) };
        } else {
            this.#fail(line, `[${text}]을(를) 이해하지 못했습니다. 예: [잠김: 메시지], [아우라 0 이상], [비용 3000]`);
        }
    }

    /** "미니게임 배드민턴 상대=김우찬 실력=0.3" + following "이기면 → 장면" / "지면 → 장면" lines. */
    #parseMinigame(line, name, settingsText) {
        const known = this.words.minigames[name];
        const step = { minigame: known?.id ?? name, config: {} };

        for (const [, rawKey, rawValue] of settingsText.matchAll(/([^\s=]+)\s*=\s*("[^"]*"|\S+)/g)) {
            const key = known?.settings[rawKey] ?? rawKey;
            step.config[key] = this.#settingValue(key, rawValue);
        }
        const leftover = settingsText.replace(/([^\s=]+)\s*=\s*("[^"]*"|\S+)/g, '').trim();
        if (leftover) this.#fail(line, `"${leftover}"을(를) 이해하지 못했습니다. 설정은 "이름=값" 형식으로 적어주세요.`);

        // Result lines may be indented under the minigame or written right after it.
        while (this.#peek() && !this.#isNode(this.#peek()) && this.#peek().indent >= line.indent) {
            const t = this.#peek().text;
            let m;
            if ((m = t.match(RULES.win))) step.win = this.#ref(this.#next(), m[1]);
            else if ((m = t.match(RULES.lose))) step.lose = this.#ref(this.#next(), m[1]);
            else if (this.#peek().indent > line.indent && (m = t.match(RULES.both))) {
                const node = this.#ref(this.#next(), m[1]);
                step.win = node;
                step.lose = node;
            } else break;
        }
        return step;
    }

    #settingValue(key, raw) {
        const value = raw.replace(/^"(.*)"$/, '$1');
        if (/^(true|예|네|켜기)$/.test(value)) return true;
        if (/^(false|아니오|끄기)$/.test(value)) return false;
        const seconds = value.match(/^(\d+(?:\.\d+)?)초$/);
        if (seconds) return Number(seconds[1]) * (this.words.millisecondSettings.has(key) ? 1000 : 1);
        if (new RegExp(`^${NUMBER}$`).test(value)) return toNumber(value);
        return value;
    }

    /** "아우라 -10, 우울 +5" -> { add: {...} }, "GPA = 2.0" -> { set: {...} }; null if the text isn't only stats. */
    #parseStats(text) {
        const result = {};
        let found = false;
        const leftover = text.replace(RULES.statChange, (whole, name, op, value) => {
            const key = this.words.stats[name];
            if (!key) return whole;
            found = true;
            const kind = op === '=' ? 'set' : 'add';
            result[kind] = { ...result[kind], [key]: toNumber(value) };
            return '';
        });
        if (!found || leftover.replace(/[\s,]|그리고/g, '') !== '') return null;
        return result;
    }

    #parseQuestions(header, setName) {
        const questions = [];
        let current = null;
        while (this.#peek() && !this.#isNode(this.#peek())) {
            const line = this.#next();
            let m;
            if ((m = line.text.match(RULES.question))) {
                current = { q: m[1], options: [], answer: -1, wrong: '', line };
                questions.push(current);
            } else if (!current) {
                this.#fail(line, '질문 목록은 "? 질문 내용" 줄로 시작해야 합니다.');
            } else if ((m = line.text.match(RULES.wrong))) {
                current.wrong = m[1];
            } else if ((m = line.text.match(RULES.bullet))) {
                const isAnswer = line.text.startsWith('*') || RULES.answerMark.test(m[1]);
                if (isAnswer) current.answer = current.options.length;
                current.options.push(m[1].replace(RULES.answerMark, ''));
            } else {
                this.#fail(line, '질문 목록에는 "? 질문", "- 보기", "* 정답", "틀리면: 대사"만 쓸 수 있습니다.');
            }
        }
        if (!questions.length) this.#fail(header, `질문 목록 "${setName}"이(가) 비어 있습니다.`);
        for (const q of questions) {
            if (q.options.length < 2) this.#fail(q.line, '보기가 2개 이상 있어야 합니다.');
            if (q.answer < 0) this.#fail(q.line, '정답 보기가 없습니다. 정답 앞에 "-" 대신 "*"를 붙이세요.');
            delete q.line;
        }
        return questions;
    }

    /** A minigame setting naming a question set ("질문=볼란드재판") gets the actual questions. */
    #resolveQuestionSets(chapter) {
        const visit = (steps) => {
            for (const step of steps) {
                if (step.config) {
                    for (const [key, value] of Object.entries(step.config)) {
                        if (typeof value === 'string' && this.questionSets[value]) step.config[key] = this.questionSets[value];
                    }
                }
                step.choice?.forEach((option) => option.reply && visit(option.reply));
            }
        };
        Object.values(chapter.nodes).forEach(visit);
    }

    // ---- Helpers -----------------------------------------------------------

    #statKey(line, name) {
        const key = this.words.stats[name];
        if (!key) this.#fail(line, `"${name}"은(는) 스탯 이름이 아닙니다. (${Object.keys(this.words.stats).join(', ')})`);
        return key;
    }

    #ref(line, node) {
        this.refs.push({ line, node });
        return node;
    }

    #isNode(line) {
        return RULES.node.test(line.text);
    }

    #peek() {
        return this.lines[this.pos];
    }

    #next() {
        return this.lines[this.pos++];
    }

    #fail(line, message) {
        throw new ScriptError(this.file, line?.no, message);
    }
}

function indentOf(raw) {
    let n = 0;
    for (const ch of raw) {
        if (ch === ' ') n += 1;
        else if (ch === '\t') n += 4;
        else break;
    }
    return n;
}

function toNumber(text) {
    return Number(String(text).replace(/,/g, ''));
}
