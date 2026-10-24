import BaseMinigame from './BaseMinigame.js';
import { COLORS, textStyle } from '../ui/theme.js';

const PADDLE_W = 18;
const PADDLE_H = 120;
const SHUTTLE_R = 10;
const PLAYER_SPEED = 620;

/**
 * 1.1 배드민턴 - Ping Pong 2D style rally.
 * Mouse or W/S/↑/↓ moves Minjun's racket (left). First to `winScore` wins.
 *
 * config: {
 *   winScore = 3,
 *   opponentName = '상대',
 *   opponentSkill = 0.5,   // 0..1, how fast/accurate the AI is
 *   rigged = false,        // AI never misses (김우찬 match)
 * }
 */
export default class BadmintonMinigame extends BaseMinigame {
    constructor() {
        super('BadmintonMinigame');
    }

    get info() {
        return {
            title: `배드민턴 vs ${this.config.opponentName ?? '상대'}`,
            howTo: `마우스 또는 W/S(↑/↓)로 라켓을 움직여라.\n먼저 ${this.config.winScore ?? 3}점을 내면 승리!`,
        };
    }

    create() {
        const { width, height } = this.scale;
        this.winScore = this.config.winScore ?? 3;
        this.skill = Phaser.Math.Clamp(this.config.opponentSkill ?? 0.5, 0, 1);
        this.rigged = Boolean(this.config.rigged);
        this.score = { player: 0, opponent: 0 };
        this.playing = false;

        this.top = 110;
        this.bottom = height - 30;

        // Court
        this.add.rectangle(width / 2, (this.top + this.bottom) / 2, width - 60, this.bottom - this.top, 0x2e7d4f)
            .setStrokeStyle(4, 0xffffff);
        for (let y = this.top + 10; y < this.bottom; y += 30) {
            this.add.rectangle(width / 2, y, 6, 16, 0xffffff, 0.8);
        }

        this.player = this.add.rectangle(70, height / 2, PADDLE_W, PADDLE_H, 0x00e5ff);
        this.opponent = this.add.rectangle(width - 70, height / 2, PADDLE_W, PADDLE_H, 0xff6b81);
        this.shuttle = this.add.circle(width / 2, height / 2, SHUTTLE_R, 0xffffff);
        this.velocity = new Phaser.Math.Vector2();

        this.add.text(70, 40, '민준', textStyle(24, { color: COLORS.accent })).setOrigin(0, 0.5);
        this.add.text(width - 70, 40, this.config.opponentName ?? '상대', textStyle(24, { color: COLORS.bad }))
            .setOrigin(1, 0.5);
        this.scoreText = this.add.text(width / 2, 40, '', textStyle(40, { fontStyle: 'bold' })).setOrigin(0.5);
        this.#renderScore();

        this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN');
        this.pointerY = null;
        const onPointerMove = (p) => {
            this.pointerY = p.y;
        };
        this.input.on('pointermove', onPointerMove);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointermove', onPointerMove));

        super.create();
    }

    startGame() {
        this.playing = true;
        this.#serve(Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
    }

    update(_time, deltaMs) {
        if (!this.playing) return;
        const dt = Math.min(deltaMs, 50) / 1000;
        this.#movePlayer(dt);
        this.#moveOpponent(dt);
        this.#moveShuttle(dt);
    }

    // ---- Movement ----------------------------------------------------------

    #movePlayer(dt) {
        const k = this.keys;
        let dir = 0;
        if (k.W.isDown || k.UP.isDown) dir -= 1;
        if (k.S.isDown || k.DOWN.isDown) dir += 1;
        if (dir !== 0) {
            this.pointerY = null; // keyboard takes over until the mouse moves again
            this.player.y += dir * PLAYER_SPEED * dt;
        } else if (this.pointerY !== null) {
            this.player.y = Phaser.Math.Linear(this.player.y, this.pointerY, Math.min(1, dt * 18));
        }
        this.player.y = this.#clampPaddle(this.player.y);
    }

    #moveOpponent(dt) {
        if (this.rigged) {
            this.opponent.y = this.#clampPaddle(this.shuttle.y);
            return;
        }
        // Track the shuttle only when it is coming toward the AI; drift to center otherwise.
        const incoming = this.velocity.x > 0;
        const target = incoming ? this.shuttle.y + this.aimError : this.scale.height / 2;
        const maxSpeed = 220 + 480 * this.skill;
        const step = Phaser.Math.Clamp(target - this.opponent.y, -maxSpeed * dt, maxSpeed * dt);
        this.opponent.y = this.#clampPaddle(this.opponent.y + step);
    }

    #moveShuttle(dt) {
        const s = this.shuttle;
        const prevX = s.x;
        s.x += this.velocity.x * dt;
        s.y += this.velocity.y * dt;

        if (s.y - SHUTTLE_R < this.top || s.y + SHUTTLE_R > this.bottom) {
            s.y = Phaser.Math.Clamp(s.y, this.top + SHUTTLE_R, this.bottom - SHUTTLE_R);
            this.velocity.y *= -1;
        }

        if (this.velocity.x < 0 && this.#hits(this.player, prevX, 1)) this.#returnShot(this.player, 1);
        if (this.velocity.x > 0 && this.#hits(this.opponent, prevX, -1)) this.#returnShot(this.opponent, -1);

        if (s.x < 0) this.#point('opponent');
        else if (s.x > this.scale.width) this.#point('player');
    }

    /**
     * True if the shuttle crossed the racket's front face this frame.
     * Checking the crossing (not just overlap) keeps fast shots from tunneling through.
     * `facing` is +1 for the left racket (face on its right side), -1 for the right one.
     */
    #hits(paddle, prevX, facing) {
        const s = this.shuttle;
        const face = paddle.x + facing * (PADDLE_W / 2 + SHUTTLE_R);
        const back = paddle.x - facing * (PADDLE_W / 2 + SHUTTLE_R);
        const crossed = facing > 0 ? prevX >= face && s.x <= face : prevX <= face && s.x >= face;
        const inside = facing > 0 ? s.x <= face && s.x >= back : s.x >= face && s.x <= back;
        return (crossed || inside) && Math.abs(s.y - paddle.y) < PADDLE_H / 2 + SHUTTLE_R;
    }

    /** Bounces the shuttle off a racket; hitting near the edge gives a steeper angle. */
    #returnShot(paddle, direction) {
        const offset = (this.shuttle.y - paddle.y) / (PADDLE_H / 2);
        const speed = Math.min(this.velocity.length() * (this.rigged ? 1.12 : 1.05), 1400);
        const angle = offset * Phaser.Math.DegToRad(50);
        this.velocity.set(Math.cos(angle) * speed * direction, Math.sin(angle) * speed);
        this.shuttle.x = paddle.x + direction * (PADDLE_W / 2 + SHUTTLE_R + 1);
        this.#rollAimError();
    }

    #rollAimError() {
        const spread = (1 - this.skill) * 140;
        this.aimError = Phaser.Math.FloatBetween(-spread, spread);
    }

    // ---- Scoring -----------------------------------------------------------

    #point(winner) {
        this.score[winner] += 1;
        this.#renderScore();
        this.cameras.main.flash(150, winner === 'player' ? 0 : 255, winner === 'player' ? 200 : 60, 80);

        if (this.score[winner] >= this.winScore) {
            this.playing = false;
            this.finish({ success: winner === 'player', score: this.score.player });
            return;
        }
        this.#serve(winner === 'player' ? 1 : -1);
    }

    #serve(direction) {
        const { width, height } = this.scale;
        this.shuttle.setPosition(width / 2, height / 2);
        this.velocity.set(0, 0);
        this.#rollAimError();
        this.time.delayedCall(700, () => {
            const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
            this.velocity.set(Math.cos(angle) * 430 * direction, Math.sin(angle) * 430);
        });
    }

    #renderScore() {
        this.scoreText.setText(`${this.score.player} : ${this.score.opponent}`);
    }

    #clampPaddle(y) {
        return Phaser.Math.Clamp(y, this.top + PADDLE_H / 2, this.bottom - PADDLE_H / 2);
    }
}
