import ExamTask, { AREA, scale } from './ExamTask.js';
import { COLORS } from '../../ui/theme.js';

/** 에임 도장 - click 15 targets as fast as possible. They shrink, and later ones move. */
export class AimTask extends ExamTask {
    static key = 'aim';
    static title = '에임 도장';
    static howTo = '과녁 15개를 최대한 빨리 클릭!\n과녁은 갈수록 작아지고 움직여요. 빗나가면 감점.';

    start() {
        this.total = 15;
        this.hits = 0;
        this.misses = 0;
        this.startedAt = this.now;
        this.target = this.add(this.scene.add.circle(0, 0, 40, 0xff6b81).setStrokeStyle(6, 0xffffff));
        this.dot = this.add(this.scene.add.circle(0, 0, 8, 0xffffff));
        this.onPointer('pointerdown', (p) => this.#click(p));
        this.after(20000, () => this.#finish());
        this.#place();
    }

    #place() {
        this.hud(`${this.hits + 1} / ${this.total}`);
        const t = this.hits / (this.total - 1);
        this.radius = this.scene.shorter(46 - 26 * t, 0.3);
        const r = this.radius;
        this.target.setRadius(r).setPosition(
            Phaser.Math.Between(AREA.left + r, AREA.right - r),
            Phaser.Math.Between(AREA.top + r, AREA.bottom - r),
        );
        const speed = this.hits >= 7 ? this.scene.faster(90 + (this.hits - 7) * 30) : 0;
        const angle = Math.random() * Math.PI * 2;
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    }

    update(dt) {
        const r = this.radius;
        const t = this.target;
        t.x += this.velocity.x * dt;
        t.y += this.velocity.y * dt;
        if (t.x < AREA.left + r || t.x > AREA.right - r) this.velocity.x *= -1;
        if (t.y < AREA.top + r || t.y > AREA.bottom - r) this.velocity.y *= -1;
        this.dot.setPosition(t.x, t.y);
    }

    #click(p) {
        if (Phaser.Math.Distance.Between(p.x, p.y, this.target.x, this.target.y) <= this.radius) {
            this.hits += 1;
            this.flash(this.target.x, this.target.y, '명중', COLORS.good, 20);
            if (this.hits >= this.total) this.#finish();
            else this.#place();
        } else {
            this.misses += 1;
            this.flash(p.x, p.y, '빗나감', COLORS.bad, 18);
        }
    }

    #finish() {
        const seconds = (this.now - this.startedAt) / 1000;
        const perTarget = seconds / Math.max(1, this.hits);
        const speedScore = scale(perTarget, 1.4, 0.55) * (this.hits / this.total);
        this.done(speedScore - this.misses * 3, `${this.hits}개 명중 · ${seconds.toFixed(1)}초 · 빗나감 ${this.misses}`);
    }
}

/** 파리 잡기 - keep the cursor on a wandering fly. Score is the share of time on target. */
export class FlyTask extends ExamTask {
    static key = 'fly';
    static title = '파리 잡기';
    static howTo = '파리 위에 마우스 커서를 계속 올려두세요.\n12초 동안 파리 위에 머문 비율로 채점해요.';

    start() {
        this.duration = 12000;
        this.elapsed = 0;
        this.onTarget = 0;
        this.seed = Math.random() * 1000;
        this.radius = 38;
        this.zone = this.add(this.scene.add.circle(AREA.cx, AREA.cy, this.radius, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.5));
        this.fly = this.add(this.scene.add.text(AREA.cx, AREA.cy, '🪰', { fontSize: '40px' }).setOrigin(0.5));
        this.percent = this.text(AREA.cx, AREA.bottom - 10, '', 24, { color: COLORS.muted });
    }

    update(dt) {
        this.elapsed += dt * 1000;
        const progress = this.elapsed / this.duration;
        const e = (this.elapsed / 1000) * this.scene.faster(0.9 * (1 + progress * 0.6)) + this.seed;
        const x = AREA.cx + Math.sin(e * 1.3) * 430 + Math.sin(e * 3.1 + 1) * 110 + Math.sin(e * 5.7) * 25;
        const y = AREA.cy + Math.sin(e * 1.7 + 2) * 160 + Math.sin(e * 2.9) * 60 + Math.cos(e * 6.3) * 18;
        this.fly.setPosition(x, y);
        this.zone.setPosition(x, y);

        const p = this.scene.input.activePointer;
        const on = Phaser.Math.Distance.Between(p.x, p.y, x, y) <= this.radius;
        if (on) this.onTarget += dt * 1000;
        this.zone.setFillStyle(on ? 0x2ecc71 : 0xffffff, on ? 0.35 : 0.12);

        const pct = Math.round((this.onTarget / this.elapsed) * 100);
        this.percent.setText(`파리 위 ${pct}%`);
        this.hud(`${Math.max(0, (this.duration - this.elapsed) / 1000).toFixed(1)}초`);
        if (this.elapsed >= this.duration) this.done(scale(pct, 15, 85), `파리 위 ${pct}%`);
    }
}

/** 볼 피하기 - dodge balls flying in from the edges for up to 20 seconds. One hit ends it. */
export class DodgeTask extends ExamTask {
    static key = 'dodge';
    static title = '볼 피하기';
    static howTo = 'WASD·방향키 또는 마우스로 움직여 날아오는 공을 피하세요.\n한 번 맞으면 끝! 20초 버티면 만점.';

    start() {
        this.duration = 20000;
        this.elapsed = 0;
        this.balls = [];
        this.box = { left: 200, right: 1080, top: AREA.top + 20, bottom: AREA.bottom - 10 };
        const b = this.box;
        this.add(this.scene.add.rectangle((b.left + b.right) / 2, (b.top + b.bottom) / 2, b.right - b.left, b.bottom - b.top)
            .setStrokeStyle(3, 0x5a5a8a));
        this.player = this.add(this.scene.add.circle(AREA.cx, AREA.cy, 14, 0x00e5ff).setStrokeStyle(3, 0xffffff));
        this.keys = this.scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        this.lastPointer = { x: this.scene.input.activePointer.x, y: this.scene.input.activePointer.y };
        this.followPointer = false;
        this.#spawnLoop();
    }

    #spawnLoop() {
        const progress = this.elapsed / this.duration;
        this.after(this.scene.shorter(650 - 380 * progress), () => {
            this.#spawn();
            this.#spawnLoop();
        });
    }

    #spawn() {
        const b = this.box;
        const side = Phaser.Math.Between(0, 3);
        const x = side === 0 ? b.left : side === 1 ? b.right : Phaser.Math.Between(b.left, b.right);
        const y = side === 2 ? b.top : side === 3 ? b.bottom : Phaser.Math.Between(b.top, b.bottom);
        const aim = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y) + Phaser.Math.FloatBetween(-0.25, 0.25);
        const speed = this.scene.faster(200 + 260 * (this.elapsed / this.duration) + Math.random() * 60);
        const ball = this.add(this.scene.add.circle(x, y, 10, 0xff6b81));
        this.balls.push({ obj: ball, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed });
    }

    update(dt) {
        this.elapsed += dt * 1000;
        this.#movePlayer(dt);

        const b = this.box;
        for (const ball of this.balls) {
            ball.obj.x += ball.vx * dt;
            ball.obj.y += ball.vy * dt;
            if (Phaser.Math.Distance.Between(ball.obj.x, ball.obj.y, this.player.x, this.player.y) < 22) {
                const seconds = this.elapsed / 1000;
                this.scene.cameras.main.shake(200, 0.012);
                this.done(scale(seconds, 2, 20), `${seconds.toFixed(1)}초 생존`);
                return;
            }
        }
        this.balls = this.balls.filter((ball) => {
            const inside = ball.obj.x > b.left - 30 && ball.obj.x < b.right + 30 && ball.obj.y > b.top - 30 && ball.obj.y < b.bottom + 30;
            if (!inside) ball.obj.destroy();
            return inside;
        });

        this.hud(`${(this.elapsed / 1000).toFixed(1)} / 20초`);
        if (this.elapsed >= this.duration) this.done(100, '20초 생존 (만점)');
    }

    #movePlayer(dt) {
        const k = this.keys;
        const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        const p = this.scene.input.activePointer;
        if (p.x !== this.lastPointer.x || p.y !== this.lastPointer.y) {
            this.followPointer = true;
            this.lastPointer = { x: p.x, y: p.y };
        }
        if (dx || dy) {
            this.followPointer = false;
            const len = Math.hypot(dx, dy);
            this.player.x += (dx / len) * 380 * dt;
            this.player.y += (dy / len) * 380 * dt;
        } else if (this.followPointer) {
            const step = Math.min(1, dt * 12);
            this.player.x += (p.x - this.player.x) * step;
            this.player.y += (p.y - this.player.y) * step;
        }
        const b = this.box;
        this.player.x = Phaser.Math.Clamp(this.player.x, b.left + 14, b.right - 14);
        this.player.y = Phaser.Math.Clamp(this.player.y, b.top + 14, b.bottom - 14);
    }
}
