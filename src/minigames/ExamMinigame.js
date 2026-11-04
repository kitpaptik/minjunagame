import BaseMinigame from './BaseMinigame.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, textStyle, card } from '../ui/theme.js';
import { EXAM_TASKS, EXAM_TASK_WORDS, GPA_BY_GRADE, gradeFor } from './exam/index.js';

/** Above the Depression darkening (depth 900) so cards and the report stay readable. */
const UI_DEPTH = 950;
const KIND_LABEL = { formative: 'Formative', summative: 'Summative' };
const DEFAULT_COUNT = { formative: 2, summative: 5 };

/**
 * 시험 - a formative (short quiz) or summative (big exam) made of skill-test questions
 * (src/minigames/exam). The average score becomes an IB-style grade 1..7, which moves GPA.
 *
 * config: {
 *   kind = 'formative' | 'summative',
 *   subject = '',             // shown in the title: "수학 Formative"
 *   tasks = '에임,비트',       // which questions (ids or Korean names); random if omitted
 *   count,                    // how many random questions (default: formative 2, summative 5)
 * }
 */
export default class ExamMinigame extends BaseMinigame {
    constructor() {
        super('ExamMinigame');
    }

    get kind() {
        return this.config.kind === 'summative' ? 'summative' : 'formative';
    }

    get info() {
        const names = this.tasks.map((Task, i) => `${i + 1}. ${Task.title}${i % 4 === 3 ? '\n' : '   '}`).join('').trim();
        const weight = this.kind === 'summative' ? 'GPA에 크게 반영 (최대 ±0.3)' : 'GPA에 조금 반영 (최대 ±0.1)';
        return {
            title: `${this.config.subject ?? ''} ${KIND_LABEL[this.kind]}`.trim(),
            howTo: `문제 ${this.tasks.length}개\n${names}\n\n평균 점수로 1~7등급 → ${weight}`,
        };
    }

    create() {
        const { width, height } = this.view;
        this.tasks = this.#pickTasks();
        this.results = [];
        this.current = null;

        this.add.rectangle(width / 2, height / 2, width, height, PALETTE.chat);
        this.add.rectangle(0, 0, width, 100, PALETTE.sidebar).setOrigin(0);
        this.add.rectangle(0, 99, width, 1, PALETTE.rail).setOrigin(0);
        this.add.text(40, 50, this.info.title, textStyle(22, { weight: 700, color: INK.strong })).setOrigin(0, 0.5);
        this.questionText = this.add.text(width / 2, 50, '', textStyle(18, { weight: 500, color: INK.muted })).setOrigin(0.5);
        this.taskHud = this.add.text(width - 40, 50, '', textStyle(18, { weight: 700, color: INK.brand })).setOrigin(1, 0.5);

        super.create();
    }

    /** Called by ExamTask.hud(). */
    setTaskHud(text) {
        this.taskHud.setText(text);
    }

    startGame() {
        this.#showCard(0);
    }

    update(_time, deltaMs) {
        if (this.current && !this.current.finished) this.current.update(Math.min(deltaMs, 50) / 1000, this.time.now);
    }

    #pickTasks() {
        const wanted = typeof this.config.tasks === 'string'
            ? this.config.tasks.split(',').map((s) => s.trim()).filter(Boolean)
            : this.config.tasks ?? [];
        const chosen = wanted.map((name) => EXAM_TASKS[EXAM_TASK_WORDS[name] ?? name]).filter(Boolean);
        if (chosen.length) return chosen;

        const count = this.config.count ?? DEFAULT_COUNT[this.kind];
        return Phaser.Utils.Array.Shuffle(Object.values(EXAM_TASKS)).slice(0, count);
    }

    /** "문제 2. 에임 도장" card with the how-to, waits for SPACE or a click. */
    #showCard(index) {
        if (index >= this.tasks.length) {
            this.#showReport();
            return;
        }
        const Task = this.tasks[index];
        const { width, height } = this.view;
        this.questionText.setText(`문제 ${index + 1} / ${this.tasks.length}`);
        this.setTaskHud('');

        const panel = this.add.container(0, 0).setDepth(UI_DEPTH);
        const title = this.add.text(width / 2, 0, `문제 ${index + 1}. ${Task.title}`, textStyle(26, { weight: 700, color: INK.strong }))
            .setOrigin(0.5, 0);
        const howTo = this.add.text(width / 2, 0, Task.howTo, textStyle(16, { align: 'center', lineSpacing: 8 })).setOrigin(0.5, 0);
        const cardHeight = 36 + title.height + 20 + howTo.height + 36 + 44 + 32;
        const top = height / 2 + 30 - cardHeight / 2;
        title.setY(top + 36);
        howTo.setY(title.y + title.height + 20);
        panel.add([...card(this, width / 2, height / 2 + 30, 760, cardHeight, { backdrop: true }), title, howTo]);
        let started = false;
        const begin = () => {
            if (started) return;
            started = true;
            this.input.keyboard.off('keydown-SPACE', begin);
            panel.destroy(true);
            // Small delay so the click/SPACE that closed the card doesn't count as the first input.
            this.time.delayedCall(200, () => {
                this.current = new Task(this, (result) => this.#onTaskDone(Task, result, index));
                this.current.start();
            });
        };
        panel.add(new Button(this, width / 2, top + cardHeight - 32 - 22, '시작  (SPACE)', { width: 240, variant: 'primary', onClick: begin }));
        this.input.keyboard.on('keydown-SPACE', begin);
    }

    #onTaskDone(Task, result, index) {
        this.results.push({ title: Task.title, ...result });
        this.current = null;
        const { width, height } = this.view;
        const color = result.score >= 65 ? INK.good : result.score >= 40 ? INK.warn : INK.bad;
        const banner = this.add.container(0, 0).setDepth(UI_DEPTH);
        banner.add([
            ...card(this, width / 2, height / 2, 460, 160, { backdrop: true }),
            this.add.text(width / 2, height / 2 - 20, `${result.score}점`, textStyle(44, { weight: 700, color })).setOrigin(0.5),
            this.add.text(width / 2, height / 2 + 40, result.detail, textStyle(15, { color: INK.muted })).setOrigin(0.5),
        ]);
        this.time.delayedCall(1500, () => {
            banner.destroy(true);
            this.#showCard(index + 1);
        });
    }

    /** Report card: every question's score, the grade, and the GPA change. */
    #showReport() {
        const { width, height } = this.view;
        const average = this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length;
        const grade = gradeFor(average);
        const gpa = GPA_BY_GRADE[this.kind][grade];
        const gpaText = gpa === 0 ? 'GPA 변화 없음' : `GPA ${gpa > 0 ? '+' : ''}${gpa.toFixed(1)}`;
        this.questionText.setText('성적표');
        this.setTaskHud('');

        const rowHeight = Math.min(44, 280 / this.results.length);
        const cardHeight = 100 + this.results.length * rowHeight + 190;
        const top = height / 2 + 40 - cardHeight / 2;
        const report = this.add.container(0, 0).setDepth(UI_DEPTH);
        report.add(card(this, width / 2, height / 2 + 40, 900, cardHeight, { backdrop: true }));
        report.add(this.add.text(width / 2, top + 48, `${this.info.title} 성적표`, textStyle(24, { weight: 700, color: INK.strong })).setOrigin(0.5));
        this.results.forEach((r, i) => {
            const y = top + 100 + rowHeight / 2 + i * rowHeight;
            report.add([
                this.add.text(240, y, `${i + 1}. ${r.title}`, textStyle(17, { color: INK.text })).setOrigin(0, 0.5),
                this.add.text(700, y, r.detail, textStyle(14, { color: INK.muted })).setOrigin(0.5),
                this.add.text(1040, y, `${r.score}점`, textStyle(17, { weight: 700, color: INK.strong })).setOrigin(1, 0.5),
            ]);
        });
        const gradeColor = grade >= 6 ? INK.good : grade >= 4 ? INK.warn : INK.bad;
        report.add([
            this.add.text(width / 2, top + cardHeight - 160, `평균 ${Math.round(average)}점`, textStyle(16, { color: INK.muted })).setOrigin(0.5),
            this.add.text(width / 2, top + cardHeight - 104, `${grade} / 7`, textStyle(52, { weight: 700, color: gradeColor })).setOrigin(0.5),
            this.add.text(width / 2, top + cardHeight - 40, `${gpaText}.  SPACE나 클릭으로 계속`, textStyle(15, { color: INK.muted })).setOrigin(0.5),
        ]);

        const close = () => {
            this.input.keyboard.off('keydown-SPACE', close);
            this.input.off('pointerdown', close);
            report.destroy(true);
            this.finish({
                success: grade >= 4,
                score: grade,
                label: `${grade}등급, ${gpaText}`,
                add: gpa ? { gpa } : undefined,
            });
        };
        this.time.delayedCall(600, () => {
            this.input.keyboard.on('keydown-SPACE', close);
            this.input.on('pointerdown', close);
        });
    }
}
