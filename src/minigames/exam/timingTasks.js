import ExamTask, { AREA } from './ExamTask.js';
import { COLORS } from '../../ui/theme.js';

const LANE_KEYS = ['d', 'f', 'j', 'k'];
const JUDGEMENTS = [
    { within: 50, label: 'PERFECT', points: 100, color: COLORS.accent },
    { within: 90, label: 'GREAT', points: 80, color: COLORS.good },
    { within: 140, label: 'GOOD', points: 50, color: COLORS.gold },
];

/** 비트 할아버지 - 4-key rhythm game. Notes follow a 120 BPM beat and get denser. */
export class RhythmTask extends ExamTask {
    static key = 'rhythm';
    static title = '비트 할아버지';
    static howTo = '노트가 판정선에 닿는 순간 D F J K!\n박자에 맞춰 내려오고 갈수록 많아져요. 막 누르면 감점.';

    start() {
        this.hitY = AREA.bottom - 60;
        this.speed = this.scene.faster(430); // px per second
        this.lanes = LANE_KEYS.map((key, i) => AREA.cx + (i - 1.5) * 120);
        this.lanes.forEach((x, i) => {
            this.add(this.scene.add.rectangle(x, AREA.cy, 110, AREA.bottom - AREA.top, 0xffffff, 0.04));
            this.text(x, this.hitY + 40, LANE_KEYS[i].toUpperCase(), 26, { color: COLORS.muted });
        });
        this.add(this.scene.add.rectangle(AREA.cx, this.hitY, 500, 6, 0x00e5ff));
        this.lanePads = this.lanes.map((x) => this.add(this.scene.add.rectangle(x, this.hitY, 106, 26, 0xffffff, 0)));

        // Beat chart: sparse at first, then most beats, then some half-beat doubles.
        const beat = 500;
        const lead = 1500;
        this.notes = [];
        let lastLane = -1;
        for (let b = 0; b < 32; b++) {
            if (b < 10 ? b % 2 === 1 : b < 22 ? Math.random() < 0.2 : false) continue;
            const times = b >= 22 && Math.random() < 0.3 ? [b, b + 0.5] : [b];
            for (const t of times) {
                let lane;
                do lane = Phaser.Math.Between(0, 3); while (lane === lastLane && Math.random() < 0.6);
                lastLane = lane;
                this.notes.push({ lane, time: this.now + lead + t * beat, judged: false, obj: null });
            }
        }
        this.endAt = this.notes.at(-1).time + 600;
        this.points = 0;
        this.bad = 0;
        this.onKey((key) => {
            const lane = LANE_KEYS.indexOf(key);
            if (lane >= 0) this.#press(lane);
        });
    }

    update() {
        const now = this.now;
        for (const note of this.notes) {
            if (note.judged) continue;
            const y = this.hitY - ((note.time - now) / 1000) * this.speed;
            if (y < AREA.top - 20) continue;
            note.obj ??= this.add(this.scene.add.rectangle(this.lanes[note.lane], y, 100, 22, 0xffd166).setStrokeStyle(2, 0xffffff));
            note.obj.y = y;
            if (now - note.time > JUDGEMENTS.at(-1).within) this.#judge(note, null);
        }
        const judged = this.notes.filter((n) => n.judged).length;
        this.hud(`${judged} / ${this.notes.length}`);
        if (now > this.endAt) {
            const accuracy = this.points / this.notes.length;
            this.done(accuracy - this.bad * 2, `정확도 ${Math.round(accuracy)}% · 헛누름 ${this.bad}`);
        }
    }

    #press(lane) {
        this.lanePads[lane].setFillStyle(0xffffff, 0.35);
        this.after(80, () => this.lanePads[lane].setFillStyle(0xffffff, 0));
        const now = this.now;
        const candidates = this.notes.filter((n) => !n.judged && n.lane === lane && Math.abs(n.time - now) <= JUDGEMENTS.at(-1).within);
        if (!candidates.length) {
            this.bad += 1;
            return;
        }
        const note = candidates.reduce((a, b) => (Math.abs(a.time - now) < Math.abs(b.time - now) ? a : b));
        this.#judge(note, JUDGEMENTS.find((j) => Math.abs(note.time - now) <= j.within));
    }

    #judge(note, judgement) {
        note.judged = true;
        note.obj?.setVisible(false);
        const x = this.lanes[note.lane];
        if (judgement) {
            this.points += judgement.points;
            this.flash(x, this.hitY - 50, judgement.label, judgement.color, 20);
        } else {
            this.flash(x, this.hitY - 50, 'MISS', COLORS.bad, 20);
        }
    }
}

/** 기절 풀기 - stop a shrinking gauge inside the yellow zone; the pink line is a perfect stop. */
export class StunTask extends ExamTask {
    static key = 'stun';
    static title = '기절 풀기';
    static howTo = '줄어드는 게이지 끝이 노란 구간에 들어온 순간 SPACE (또는 클릭)!\n분홍 선에 가까울수록 고득점.';

    start() {
        this.rounds = 6;
        this.round = 0;
        this.scores = [];
        this.width = 700;
        this.left = AREA.cx - this.width / 2;
        this.add(this.scene.add.rectangle(AREA.cx, AREA.cy, this.width + 8, 58, 0x000000).setStrokeStyle(3, 0xffffff));
        this.gauge = this.add(this.scene.add.rectangle(this.left, AREA.cy, this.width, 30, 0x00e5ff).setOrigin(0, 0.5));
        this.zone = this.add(this.scene.add.rectangle(0, AREA.cy, 10, 50, 0xffd166, 0.55).setOrigin(0, 0.5));
        this.perfect = this.add(this.scene.add.rectangle(0, AREA.cy, 4, 66, 0xff6bd5));
        this.result = this.text(AREA.cx, AREA.cy + 110, '', 32, { fontStyle: 'bold' });
        this.onKey((key) => key === ' ' && this.#stop());
        this.onPointer('pointerdown', () => this.#stop());
        this.#next();
    }

    #next() {
        if (this.round >= this.rounds) {
            const avg = this.scores.reduce((a, b) => a + b, 0) / this.rounds;
            this.done(avg, `성공 ${this.scores.filter((s) => s > 0).length} / ${this.rounds}`);
            return;
        }
        this.round += 1;
        this.hud(`${this.round} / ${this.rounds}`);
        const t = (this.round - 1) / (this.rounds - 1);
        const zoneWidth = this.scene.shorter(120 - 60 * t, 0.3);
        this.zoneStart = Phaser.Math.Between(80, this.width - 260);
        this.zoneEnd = this.zoneStart + zoneWidth;
        this.zone.setX(this.left + this.zoneStart).setSize(zoneWidth, 50);
        this.perfect.setX(this.left + (this.zoneStart + this.zoneEnd) / 2);
        this.fill = this.width;
        this.speed = this.scene.faster(260 + 220 * t) * (0.85 + Math.random() * 0.3); // px per second
        this.result.setText('');
        this.running = false;
        this.after(400 + Math.random() * 400, () => {
            this.running = true;
        });
    }

    update(dt) {
        if (this.running) {
            this.fill -= this.speed * dt;
            if (this.fill <= 0) this.#end(0, '놓쳤다!', COLORS.bad);
        }
        this.gauge.width = Math.max(0, this.fill);
    }

    #stop() {
        if (!this.running) return;
        if (this.fill < this.zoneStart || this.fill > this.zoneEnd) {
            this.#end(0, '빗나감!', COLORS.bad);
            return;
        }
        const half = (this.zoneEnd - this.zoneStart) / 2;
        const off = Math.abs(this.fill - (this.zoneStart + half)) / half;
        this.#end(60 + 40 * (1 - off), off < 0.2 ? '완벽!' : '성공', COLORS.good);
    }

    #end(score, label, color) {
        this.running = false;
        this.scores.push(score);
        this.result.setText(label).setColor(color);
        this.after(800, () => this.#next());
    }
}
