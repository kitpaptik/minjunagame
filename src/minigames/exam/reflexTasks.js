import ExamTask, { AREA, scale } from './ExamTask.js';
import { COLORS } from '../../ui/theme.js';

/** 초록불 다다닥 - reaction time. 5 tries, average. Pressing early is a false start. */
export class ReactionTask extends ExamTask {
    static key = 'reaction';
    static title = '초록불 다다닥';
    static howTo = '빨간불이 초록불로 바뀌는 순간 클릭 또는 SPACE!\n미리 누르면 부정출발, 다시 해요.';

    start() {
        this.rounds = 5;
        this.times = [];
        this.light = this.add(this.scene.add.circle(AREA.cx, AREA.cy - 30, 130, 0xb33939));
        this.label = this.text(AREA.cx, AREA.cy + 170, '', 30);
        this.onKey((key) => key === ' ' && this.#press());
        this.onPointer('pointerdown', () => this.#press());
        this.#next();
    }

    #next() {
        if (this.times.length >= this.rounds) {
            const avg = Math.round(this.times.reduce((a, b) => a + b, 0) / this.times.length);
            this.done(scale(avg, this.scene.shorter(480, 0.25), 200), `평균 ${avg}ms`);
            return;
        }
        this.hud(`${this.times.length + 1} / ${this.rounds}`);
        this.state = 'wait';
        this.light.setFillStyle(0xb33939);
        this.label.setText('기다려...').setColor(COLORS.text);
        this.goTimer = this.after(1000 + Math.random() * 2200, () => {
            this.state = 'go';
            this.goAt = performance.now();
            this.light.setFillStyle(0x2ecc71);
            this.label.setText('지금!');
        });
    }

    #press() {
        if (this.state === 'wait') {
            this.state = 'foul';
            this.goTimer.remove(false);
            this.label.setText('부정출발! 다시').setColor(COLORS.bad);
            this.scene.cameras.main.shake(120, 0.008);
            this.after(900, () => this.#next());
        } else if (this.state === 'go') {
            this.state = 'rest';
            const ms = Math.round(performance.now() - this.goAt);
            this.times.push(ms);
            this.label.setText(`${ms}ms`).setColor(COLORS.accent);
            this.after(700, () => this.#next());
        }
    }
}

const SKILL_KEYS = ['Q', 'W', 'E', 'R', 'D', 'F'];

/** 스킬콤 QWER - press the shown skill keys; later prompts are 2-3 key combos. */
export class SkillComboTask extends ExamTask {
    static key = 'qwer';
    static title = '스킬콤 QWER';
    static howTo = '화면에 뜬 스킬 키를 순서대로 바로 누르세요!\n후반엔 2~3개 콤보. 틀리면 감점.';

    start() {
        this.rounds = 10;
        this.round = 0;
        this.perKey = [];
        this.mistakes = 0;
        this.boxes = [];
        this.onKey((key) => this.#press(key.toUpperCase()));
        this.#next();
    }

    #next() {
        this.boxes.forEach((b) => b.destroy());
        this.boxes = [];
        if (this.round >= this.rounds) {
            const avg = Math.round(this.perKey.reduce((a, b) => a + b, 0) / this.perKey.length);
            this.done(scale(avg, this.scene.shorter(1000, 0.3), 320) - this.mistakes * 4, `키당 ${avg}ms · 실수 ${this.mistakes}`);
            return;
        }
        this.round += 1;
        this.hud(`${this.round} / ${this.rounds}`);
        const length = this.round <= 4 ? 1 : this.round <= 7 ? 2 : 3;
        this.combo = [];
        while (this.combo.length < length) {
            const key = Phaser.Utils.Array.GetRandom(SKILL_KEYS);
            if (key !== this.combo.at(-1)) this.combo.push(key);
        }
        this.progress = 0;
        this.ready = false;
        this.after(350 + Math.random() * 500, () => {
            this.combo.forEach((key, i) => {
                const x = AREA.cx + (i - (this.combo.length - 1) / 2) * 150;
                const box = this.add(this.scene.add.rectangle(x, AREA.cy, 120, 120, 0x2d3561).setStrokeStyle(5, 0xffffff));
                const label = this.text(x, AREA.cy, key, 64, { fontStyle: 'bold' });
                this.boxes.push(box, label);
            });
            this.shownAt = performance.now();
            this.ready = true;
        });
    }

    #press(key) {
        if (!this.ready) return;
        if (key !== this.combo[this.progress]) {
            if (SKILL_KEYS.includes(key)) {
                this.mistakes += 1;
                this.flash(AREA.cx, AREA.cy - 110, '틀림!', COLORS.bad);
            }
            return;
        }
        this.boxes[this.progress * 2].setFillStyle(0x2e8b57);
        this.progress += 1;
        if (this.progress === this.combo.length) {
            this.ready = false;
            this.perKey.push((performance.now() - this.shownAt) / this.combo.length);
            this.after(250, () => this.#next());
        }
    }
}

/** 손가락 불나게 - mash SPACE/click for 5 seconds, measured in clicks per second. */
export class MashTask extends ExamTask {
    static key = 'mash';
    static title = '손가락 불나게';
    static howTo = '5초 동안 SPACE 또는 클릭을 최대한 많이!\n첫 입력부터 시간이 흘러요.';

    start() {
        this.duration = 5000;
        this.count = 0;
        this.startedAt = null;
        this.counter = this.text(AREA.cx, AREA.cy - 40, '0', 120, { fontStyle: 'bold', color: COLORS.gold });
        this.timeText = this.text(AREA.cx, AREA.cy + 90, '아무 때나 시작!', 28, { color: COLORS.muted });
        this.onKey((key) => key === ' ' && this.#tap());
        this.onPointer('pointerdown', () => this.#tap());
        this.hud('');
    }

    #tap() {
        if (this.startedAt === null) {
            this.startedAt = this.now;
            this.after(this.duration, () => {
                const cps = this.count / (this.duration / 1000);
                this.done(scale(cps, 3, this.scene.faster(9.5, 0.2)), `${cps.toFixed(1)} CPS`);
            });
        }
        this.count += 1;
        this.counter.setText(String(this.count));
        this.counter.setScale(1.15);
        this.scene.tweens.add({ targets: this.counter, scale: 1, duration: 80 });
    }

    update() {
        if (this.startedAt === null) return;
        const left = Math.max(0, this.duration - (this.now - this.startedAt)) / 1000;
        this.timeText.setText(`${left.toFixed(1)}초`);
    }
}

const COLOR_WORDS = [
    { name: '빨강', color: '#ff4d4d' },
    { name: '파랑', color: '#4d8dff' },
    { name: '초록', color: '#3ddc84' },
    { name: '노랑', color: '#ffd23d' },
];

/** 색깔 헷갈림 - Stroop test: answer the ink color, not the word. */
export class StroopTask extends ExamTask {
    static key = 'stroop';
    static title = '색깔 헷갈림';
    static howTo = '글자 뜻 말고 글자 "색깔"을 고르세요. (숫자키 1~4)\n예) 파란색으로 쓴 "빨강" → 파랑';

    start() {
        this.rounds = 12;
        this.round = 0;
        this.correct = 0;
        this.limit = this.scene.shorter(2200);
        this.word = this.text(AREA.cx, AREA.cy - 90, '', 110, { fontStyle: 'bold' });
        COLOR_WORDS.forEach((c, i) => {
            const x = AREA.cx + (i - 1.5) * 220;
            const button = this.add(this.scene.add.rectangle(x, AREA.cy + 140, 190, 80, 0x2d3561).setStrokeStyle(3, 0x5a5a8a)
                .setInteractive({ useHandCursor: true }));
            button.on('pointerdown', () => this.#answer(i));
            this.text(x, AREA.cy + 140, `${i + 1}. ${c.name}`, 28);
        });
        this.onKey((key) => {
            const n = Number(key);
            if (n >= 1 && n <= 4) this.#answer(n - 1);
        });
        this.#next();
    }

    #next() {
        if (this.round >= this.rounds) {
            this.done((this.correct / this.rounds) * 100, `${this.correct} / ${this.rounds} 정답`);
            return;
        }
        this.round += 1;
        this.hud(`${this.round} / ${this.rounds}`);
        this.ink = Phaser.Math.Between(0, 3);
        let wordIndex = this.ink;
        if (Math.random() < 0.75) while (wordIndex === this.ink) wordIndex = Phaser.Math.Between(0, 3);
        this.word.setText(COLOR_WORDS[wordIndex].name).setColor(COLOR_WORDS[this.ink].color);
        this.open = true;
        this.timeout = this.after(this.limit, () => this.#answer(-1));
    }

    #answer(i) {
        if (!this.open) return;
        this.open = false;
        this.timeout.remove(false);
        const right = i === this.ink;
        if (right) this.correct += 1;
        this.flash(AREA.cx, AREA.cy + 30, right ? 'O' : i < 0 ? '시간 초과' : 'X', right ? COLORS.good : COLORS.bad, 40);
        this.word.setText('');
        this.after(300, () => this.#next());
    }
}

const GRID_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/** 단기 기억 - repeat the flashed cell sequence; it grows by one each time. One mistake ends it. */
export class MemoryTask extends ExamTask {
    static key = 'memory';
    static title = '단기 기억';
    static howTo = '깜빡인 칸의 순서 그대로 누르세요. (클릭 또는 숫자패드 7 8 9 / 4 5 6 / 1 2 3)\n맞출수록 한 칸씩 길어지고, 한 번 틀리면 끝!';

    start() {
        this.sequence = [];
        this.best = 2;
        this.cells = [];
        for (let i = 0; i < 9; i++) {
            const x = AREA.cx + ((i % 3) - 1) * 150;
            const y = AREA.cy + (Math.floor(i / 3) - 1) * 150;
            const cell = this.add(this.scene.add.rectangle(x, y, 130, 130, 0x2d3561).setStrokeStyle(3, 0x5a5a8a)
                .setInteractive({ useHandCursor: true }));
            cell.on('pointerdown', () => this.#input(i));
            this.cells.push(cell);
        }
        this.status = this.text(AREA.cx, AREA.top + 10, '', 26, { color: COLORS.muted });
        this.onKey((key) => {
            const i = GRID_KEYS.indexOf(key);
            if (i >= 0) this.#input(i);
        });
        for (let i = 0; i < 3; i++) this.#grow();
        this.#show();
    }

    #grow() {
        let next;
        do next = Phaser.Math.Between(0, 8); while (next === this.sequence.at(-1));
        this.sequence.push(next);
    }

    #show() {
        this.accepting = false;
        this.hud(`${this.sequence.length}칸`);
        this.status.setText('잘 보세요');
        const on = this.scene.shorter(480);
        const gap = 160;
        this.sequence.forEach((cell, i) => {
            this.after(500 + i * (on + gap), () => this.#light(cell, on));
        });
        this.after(500 + this.sequence.length * (on + gap), () => {
            this.status.setText('따라 누르세요');
            this.position = 0;
            this.accepting = true;
        });
    }

    #light(i, ms, color = 0x00e5ff) {
        this.cells[i].setFillStyle(color);
        this.after(ms, () => this.cells[i].setFillStyle(0x2d3561));
    }

    #input(i) {
        if (!this.accepting) return;
        if (i !== this.sequence[this.position]) {
            this.accepting = false;
            this.#light(i, 400, 0xb33939);
            this.after(600, () => this.done(scale(this.best, 2, 9), `최고 ${this.best}칸`));
            return;
        }
        this.#light(i, 150, 0x2ecc71);
        this.position += 1;
        if (this.position === this.sequence.length) {
            this.accepting = false;
            this.best = this.sequence.length;
            if (this.best >= 9) {
                this.after(400, () => this.done(100, '최고 9칸 (만점)'));
                return;
            }
            this.#grow();
            this.after(600, () => this.#show());
        }
    }
}
