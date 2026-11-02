import BaseMinigame from './BaseMinigame.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

/**
 * 1.2 Osaka - 히구루마 영역(재판). The judge accuses, Minjun picks a defense.
 * Wrong answers or running out of time cost a life; lose all lives and the verdict is guilty.
 *
 * config: {
 *   judge = '볼란드',
 *   lives = 3,
 *   secondsPerQuestion = 12 (scaled by difficulty),
 *   questions: [{ q, options: [...], answer: index, wrong?: '판사의 반응' }],
 * }
 */
export default class TrialMinigame extends BaseMinigame {
    constructor() {
        super('TrialMinigame');
    }

    get info() {
        return {
            title: '영역전개: 주복사사',
            howTo: `${this.config.judge ?? '판사'}의 기소에 맞서 변론하라.\n`
                + `${this.config.lives ?? 3}번 틀리면 유죄 - 여행 금지.\n숫자키 1~3 또는 클릭으로 선택.`,
        };
    }

    create() {
        const { width, height } = this.scale;
        this.judge = this.config.judge ?? '판사';
        this.questions = this.config.questions ?? [];
        this.lives = this.config.lives ?? 3;
        this.seconds = this.shorter((this.config.secondsPerQuestion ?? 12) * this.byDifficulty({ easy: 1.4, normal: 1, hard: 0.7 }));
        this.index = -1;
        this.answered = null;
        this.buttons = [];

        this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f24);
        // Judge's bench
        this.add.rectangle(width / 2, 150, 520, 120, 0x3b2350).setStrokeStyle(4, 0x8e6bbf);
        this.add.text(width / 2, 130, `⚖ 판사 ${this.judge}`, textStyle(30, { fontStyle: 'bold', color: COLORS.gold }))
            .setOrigin(0.5);
        this.add.text(width / 2, 172, '주문: 피고인의 변론을 듣는다', textStyle(18, { color: COLORS.muted })).setOrigin(0.5);

        this.livesText = this.add.text(40, 40, '', textStyle(28, { color: COLORS.bad }));
        this.progressText = this.add.text(width - 40, 40, '', textStyle(22, { color: COLORS.muted })).setOrigin(1, 0);
        this.accusation = this.add.text(width / 2, 280, '', textStyle(28, {
            align: 'center',
            wordWrap: { width: 980, useAdvancedWrap: true },
        })).setOrigin(0.5);
        this.reaction = this.add.text(width / 2, 345, '', textStyle(22, { color: COLORS.bad, fontStyle: 'italic' }))
            .setOrigin(0.5);
        this.timerBar = this.add.rectangle(width / 2 - 400, 680, 800, 12, 0x8e6bbf).setOrigin(0, 0.5);

        this.#renderLives();
        super.create();
    }

    startGame() {
        const onKey = (event) => {
            const n = Number(event.key);
            if (n >= 1 && n <= this.buttons.length) this.buttons[n - 1].press();
        };
        this.input.keyboard.on('keydown', onKey);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off('keydown', onKey));
        this.#nextQuestion();
    }

    #renderLives() {
        this.livesText.setText(`변론 기회 ${'♥'.repeat(Math.max(0, this.lives))}`);
    }

    #nextQuestion() {
        this.index += 1;
        if (this.index >= this.questions.length) {
            this.finish({ success: true, label: '무죄!' });
            return;
        }
        const { width } = this.scale;
        const question = this.questions[this.index];
        this.progressText.setText(`기소 ${this.index + 1}/${this.questions.length}`);
        this.accusation.setText(`${this.judge}: "${question.q}"`);
        this.reaction.setText('');

        this.buttons = question.options.map((label, i) =>
            new Button(this, width / 2, 430 + i * 76, `${i + 1}. ${label}`, {
                width: 860,
                height: 62,
                fontSize: 22,
                onClick: () => this.#answer(i),
            }));

        this.timerBar.width = 800;
        this.timerTween = this.tweens.add({
            targets: this.timerBar,
            width: 0,
            duration: this.seconds * 1000,
            onComplete: () => this.#answer(-1),
        });
    }

    #answer(choice) {
        if (this.answered === this.index) return;
        this.answered = this.index;
        this.timerTween?.stop();
        this.buttons.forEach((b) => b.destroy());
        this.buttons = [];

        const question = this.questions[this.index];
        if (choice === question.answer) {
            this.reaction.setColor(COLORS.good).setText('...인정한다. 다음.');
        } else {
            this.lives -= 1;
            this.#renderLives();
            this.cameras.main.shake(200, 0.012);
            const line = choice === -1 ? '침묵은 유죄의 증거다.' : (question.wrong ?? '기각.');
            this.reaction.setColor(COLORS.bad).setText(line);
            if (this.lives <= 0) {
                this.time.delayedCall(1200, () => this.finish({ success: false, label: '유죄 - 몰수' }));
                return;
            }
        }
        this.time.delayedCall(1300, () => this.#nextQuestion());
    }
}
