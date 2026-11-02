import BaseMinigame from './BaseMinigame.js';
import { COLORS, textStyle } from '../ui/theme.js';

const KEY_POOL = ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'SPACE'];

/** Turns a KeyboardEvent into our key names ('A', 'SPACE'). */
function keyName(event) {
    if (event.code === 'Space') return 'SPACE';
    if (event.code?.startsWith('Key')) return event.code.slice(3);
    return event.key.toUpperCase();
}

/**
 * Quick time event: press the key on screen before the timer runs out.
 * config: { rounds = 6, required = 4 }. Time window depends on difficulty.
 */
export default class QteMinigame extends BaseMinigame {
    constructor() {
        super('QteMinigame');
    }

    get info() {
        return {
            title: '돌발 QTE',
            howTo: '화면에 뜨는 키를 시간 안에 눌러라!\n틀린 키를 누르거나 시간이 지나면 실패.',
        };
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x1b1b2f);

        this.rounds = this.config.rounds ?? 6;
        this.required = this.config.required ?? Math.ceil(this.rounds * 0.66);
        this.windowMs = this.shorter(this.byDifficulty({ easy: 1700, normal: 1250, hard: 900 }));
        this.round = 0;
        this.hits = 0;

        this.scoreText = this.add.text(width / 2, 90, '', textStyle(28, { color: COLORS.gold })).setOrigin(0.5);
        this.keyBox = this.add.rectangle(width / 2, height / 2, 260, 180, 0x2d3561).setStrokeStyle(6, 0xffffff);
        this.keyText = this.add.text(width / 2, height / 2, '', textStyle(84, { fontStyle: 'bold' })).setOrigin(0.5);
        this.timerBar = this.add.rectangle(width / 2 - 300, height / 2 + 150, 600, 18, 0x00e5ff).setOrigin(0, 0.5);
        this.#setVisible(false);
        this.#updateScore();

        super.create();
    }

    startGame() {
        const onKey = (event) => this.#onKey(event);
        this.input.keyboard.on('keydown', onKey);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off('keydown', onKey));
        this.#nextRound();
    }

    #setVisible(visible) {
        [this.keyBox, this.keyText, this.timerBar].forEach((o) => o.setVisible(visible));
    }

    #updateScore() {
        this.scoreText.setText(`성공 ${this.hits} / 목표 ${this.required}   (라운드 ${this.round}/${this.rounds})`);
    }

    #nextRound() {
        if (this.round >= this.rounds) {
            this.finish({ success: this.hits >= this.required, score: this.hits });
            return;
        }
        this.round += 1;
        this.#updateScore();

        // Short random pause so the player can't just rhythm-tap.
        this.#setVisible(false);
        this.waiting = false;
        this.time.delayedCall(Phaser.Math.Between(250, 700), () => {
            this.target = Phaser.Utils.Array.GetRandom(KEY_POOL);
            this.keyText.setText(this.target);
            this.keyBox.setFillStyle(0x2d3561);
            this.timerBar.width = 600;
            this.#setVisible(true);
            this.waiting = true;
            this.timerTween = this.tweens.add({
                targets: this.timerBar,
                width: 0,
                duration: this.windowMs,
                onComplete: () => this.#resolve(false),
            });
        });
    }

    #onKey(event) {
        if (!this.waiting || this.finished) return;
        this.#resolve(keyName(event) === this.target);
    }

    #resolve(hit) {
        if (!this.waiting) return;
        this.waiting = false;
        this.timerTween?.stop();
        if (hit) {
            this.hits += 1;
            this.keyBox.setFillStyle(0x2e8b57);
        } else {
            this.keyBox.setFillStyle(0xb33939);
            this.cameras.main.shake(150, 0.01);
        }
        this.#updateScore();
        this.time.delayedCall(300, () => this.#nextRound());
    }
}
