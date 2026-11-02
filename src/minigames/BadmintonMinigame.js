import BaseMinigame from './BaseMinigame.js';
import { COLORS, textStyle } from '../ui/theme.js';

// ---- Court projection ------------------------------------------------------
// Court space: x -1..1 (sideline to sideline), z 0 (Minjun's baseline) .. 1 (opponent's baseline),
// h = height above the floor. The net is at z = 0.5. Seen from behind Minjun, like table tennis games.
const HORIZON_Y = 110;
const NEAR_Y = 690;
const HALF_WIDTH = 500;
const DEPTH = 1.7;
const HEIGHT_PX = 300;
const NET_Z = 0.5;
const NET_H = 0.32;

const RACKET_RADIUS = 78; // screen px within which Minjun's racket meets the shuttle

/** Shot shapes: how far, how high and how fast (seconds) the shuttle flies. */
const SHOTS = {
    clear: { arc: 0.9, duration: 1.25, label: '클리어' },
    drop: { arc: 0.45, duration: 1.0, label: '드롭' },
    smash: { arc: 0.25, duration: 0.55, label: '스매시!' },
};

/**
 * 1.1 배드민턴 - 3D-view badminton, best of 3 games like a real match.
 *
 * The racket follows the mouse; touch the shuttle with it to hit back.
 * Swing up fast = smash (needs a high contact or it hits the net), swing down = drop, otherwise clear.
 * Sideways racket speed aims the shot - aim at the lines to beat the opponent, but too far is out.
 *
 * config: {
 *   winScore = 11,         // points per game (win by 2, capped at winScore + 4)
 *   games = 3,             // best of N
 *   opponentName = '상대',
 *   opponentSkill = 0.8,   // 0..1. Above ~0.6 the opponent is better than Minjun.
 *   rigged = false,        // the opponent never misses (김우찬 match)
 * }
 */
export default class BadmintonMinigame extends BaseMinigame {
    constructor() {
        super('BadmintonMinigame');
    }

    get info() {
        const games = this.config.games ?? 3;
        return {
            title: `배드민턴 vs ${this.config.opponentName ?? '상대'}`,
            howTo: `마우스로 라켓을 움직여 셔틀콕에 대면 친다.\n`
                + `위로 빠르게 휘두르면 스매시(높은 데서 쳐야 함), 아래로 휘두르면 드롭.\n`
                + `옆으로 휘두르면 방향 조절 - 라인 끝을 노려라, 너무 멀면 아웃!\n`
                + `${this.config.winScore ?? 11}점 ${games}판 ${Math.ceil(games / 2)}선승.`,
        };
    }

    create() {
        const { width, height } = this.scale;
        this.cx = width / 2;
        this.winScore = this.config.winScore ?? 11;
        this.gamesToWin = Math.ceil((this.config.games ?? 3) / 2);
        this.rigged = Boolean(this.config.rigged);
        this.skill = Phaser.Math.Clamp(this.faster(this.config.opponentSkill ?? 0.8, 0.25), 0, 1);
        this.opponentName = this.config.opponentName ?? '상대';

        this.points = { player: 0, opponent: 0 };
        this.games = { player: 0, opponent: 0 };
        this.gameNumber = 1;
        this.shot = null;           // current flight: { from, to, arc, duration, t, by, type, netT, out }
        this.state = 'idle';        // idle | serve-player | rally | dead
        this.rallySpeed = 1;
        this.opponentX = 0;
        this.opponentTargetX = 0;
        this.pointerTrail = [];

        this.add.rectangle(width / 2, height / 2, width, height, 0x3d6b4a);
        this.#drawCourt();
        this.opponent = this.#makeOpponent();
        this.shadow = this.add.ellipse(0, 0, 24, 9, 0x000000, 0.35).setDepth(2).setVisible(false);
        this.shuttle = this.add.container(0, 0).setDepth(6).setVisible(false);
        this.shuttle.add([
            this.add.triangle(0, -9, -8, 0, 8, 0, 0, -14, 0xf5f5f5).setStrokeStyle(1, 0x999999),
            this.add.circle(0, 0, 6, 0xffffff).setStrokeStyle(2, 0xcc3333),
        ]);
        this.racket = this.#makeRacket();

        this.scoreText = this.add.text(width / 2, 34, '', textStyle(30, { fontStyle: 'bold' })).setOrigin(0.5).setDepth(20);
        this.gamesText = this.add.text(width / 2, 72, '', textStyle(20, { color: COLORS.muted })).setOrigin(0.5).setDepth(20);
        this.callText = this.add.text(width / 2, 200, '', textStyle(44, {
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 6,
        })).setOrigin(0.5).setDepth(20);
        this.#renderScore();

        const onDown = () => this.state === 'serve-player' && this.#playerServe();
        this.input.on('pointerdown', onDown);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointerdown', onDown));

        super.create();
    }

    startGame() {
        this.#nextRally('player');
    }

    // ---- Drawing -----------------------------------------------------------

    project(x, z, h = 0) {
        const s = 1 / (1 + z * DEPTH);
        return { x: this.cx + x * HALF_WIDTH * s, y: HORIZON_Y + (NEAR_Y - HORIZON_Y) * s - h * HEIGHT_PX * s, s };
    }

    #drawCourt() {
        const g = this.add.graphics().setDepth(1);
        const quad = (x0, z0, x1, z1, color) => {
            const a = this.project(x0, z0);
            const b = this.project(x1, z0);
            const c = this.project(x1, z1);
            const d = this.project(x0, z1);
            g.fillStyle(color).fillPoints([a, b, c, d], true);
        };
        const line = (x0, z0, x1, z1, w = 4) => {
            const a = this.project(x0, z0);
            const b = this.project(x1, z1);
            g.lineStyle(w, 0xffffff).lineBetween(a.x, a.y, b.x, b.y);
        };
        quad(-1.25, -0.08, 1.25, 1.08, 0x2a5236);   // floor around the court
        quad(-1, 0, 1, 1, 0x2e7d4f);                // court
        [[-1, 0, -1, 1], [1, 0, 1, 1], [-1, 0, 1, 0], [-1, 1, 1, 1], [0, 0, 0, 0.42], [0, 0.58, 0, 1]]
            .forEach(([x0, z0, x1, z1]) => line(x0, z0, x1, z1));
        line(-1, 0.42, 1, 0.42, 3); // short service lines
        line(-1, 0.58, 1, 0.58, 3);

        // Net: posts, mesh and white tape, drawn above far-side objects and below near-side ones.
        const net = this.add.graphics().setDepth(5);
        const l0 = this.project(-1.08, NET_Z, 0);
        const r0 = this.project(1.08, NET_Z, 0);
        const lt = this.project(-1.08, NET_Z, NET_H);
        const rt = this.project(1.08, NET_Z, NET_H);
        net.fillStyle(0x111111, 0.45).fillPoints([lt, rt, r0, l0], true);
        net.lineStyle(1, 0xdddddd, 0.35);
        for (let i = 1; i < 24; i++) {
            const x = Phaser.Math.Linear(lt.x, rt.x, i / 24);
            net.lineBetween(x, lt.y, x, l0.y);
        }
        for (let i = 1; i < 5; i++) {
            const y = Phaser.Math.Linear(lt.y, l0.y, i / 5);
            net.lineBetween(lt.x, y, rt.x, y);
        }
        net.lineStyle(5, 0xffffff).lineBetween(lt.x, lt.y, rt.x, rt.y);
        net.lineStyle(5, 0x888888).lineBetween(l0.x, l0.y, lt.x, lt.y).lineBetween(r0.x, r0.y, rt.x, rt.y);
    }

    #makeOpponent() {
        const c = this.add.container(0, 0).setDepth(3);
        c.add([
            this.add.rectangle(0, -40, 34, 60, 0xff6b81),
            this.add.circle(0, -84, 15, 0xf1c27d),
            this.add.rectangle(-6, 4, 10, 30, 0x333344),
            this.add.rectangle(6, 4, 10, 30, 0x333344),
            this.add.line(0, 0, 18, -60, 34, -96, 0xdddddd).setLineWidth(3).setOrigin(0),
            this.add.ellipse(36, -104, 22, 28).setStrokeStyle(3, 0xdddddd),
            this.add.text(0, -118, this.config.opponentName ?? '상대', textStyle(16, { color: COLORS.bad })).setOrigin(0.5),
        ]);
        return c;
    }

    #makeRacket() {
        const c = this.add.container(this.cx, NEAR_Y - 120).setDepth(10);
        c.add([
            this.add.rectangle(0, 70, 12, 70, 0x8d6e63).setStrokeStyle(2, 0x4e342e),
            this.add.ellipse(0, 0, RACKET_RADIUS * 1.4, RACKET_RADIUS * 1.8, 0xffffff, 0.12).setStrokeStyle(5, 0x00e5ff),
        ]);
        return c;
    }

    #renderScore() {
        this.scoreText.setText(`민준 ${this.points.player} : ${this.points.opponent} ${this.opponentName}`);
        this.gamesText.setText(`GAME ${this.gameNumber}   ·   게임 스코어 ${this.games.player} - ${this.games.opponent}`);
    }

    #call(text, color = COLORS.text) {
        this.callText.setText(text).setColor(color).setAlpha(1);
        this.tweens.killTweensOf(this.callText);
        this.tweens.add({ targets: this.callText, alpha: 0, delay: 700, duration: 400 });
    }

    // ---- Frame update ------------------------------------------------------

    update(time, deltaMs) {
        const dt = Math.min(deltaMs, 50) / 1000;
        this.#moveRacket(time);
        this.#moveOpponent(dt);
        if (this.state === 'serve-player') this.#placeServeShuttle();
        if (this.state === 'rally' && this.shot) this.#flyShuttle(dt);
    }

    #moveRacket(time) {
        const p = this.input.activePointer;
        this.racket.setPosition(p.x, Math.max(p.y, HORIZON_Y + 200));
        this.pointerTrail.push({ x: this.racket.x, y: this.racket.y, t: time });
        while (this.pointerTrail.length > 2 && time - this.pointerTrail[0].t > 120) this.pointerTrail.shift();
    }

    /** Racket speed over the last ~120ms in px/s. */
    #racketVelocity() {
        const a = this.pointerTrail[0];
        const b = this.pointerTrail.at(-1);
        const dt = Math.max(16, b.t - a.t) / 1000;
        return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    }

    #moveOpponent(dt) {
        const speed = this.faster(0.7 + 1.3 * this.skill, 0.2) * (this.rigged ? 2 : 1);
        const step = Phaser.Math.Clamp(this.opponentTargetX - this.opponentX, -speed * dt, speed * dt);
        this.opponentX = Phaser.Math.Clamp(this.opponentX + step, -1.1, 1.1);
        const pos = this.project(this.opponentX, 0.96);
        this.opponent.setPosition(pos.x, pos.y).setScale(pos.s * 1.6);
    }

    #flyShuttle(dt) {
        const shot = this.shot;
        shot.t += dt / shot.duration;
        const pos = this.#shotPosition(shot, Math.min(shot.t, 1));
        this.#drawShuttle(pos);

        // Net cord: the shot was too low to clear the net.
        if (shot.netT !== null && shot.t >= shot.netT) {
            this.#endRally(shot.by === 'player' ? 'opponent' : 'player', '네트!');
            return;
        }
        if (shot.by === 'opponent' && pos.z < NET_Z && this.#racketTouches(pos)) {
            this.#playerHit(pos);
            return;
        }
        if (shot.by === 'player' && shot.aiHitT !== null && shot.t >= shot.aiHitT) {
            this.#opponentHit(pos);
            return;
        }
        if (shot.t >= 1) {
            const winner = shot.out ? (shot.by === 'player' ? 'opponent' : 'player') : shot.by;
            this.#endRally(winner, shot.out ? '아웃!' : '인!');
        }
    }

    #drawShuttle(pos) {
        const screen = this.project(pos.x, pos.z, pos.h);
        const ground = this.project(pos.x, pos.z, 0);
        this.shuttle.setVisible(true).setPosition(screen.x, screen.y).setScale(0.6 + screen.s * 1.1)
            .setDepth(pos.z > NET_Z ? 4 : 6);
        this.shadow.setVisible(true).setPosition(ground.x, ground.y).setScale(ground.s * 1.4);
    }

    #racketTouches(pos) {
        if (pos.h > 1.1) return false;
        const screen = this.project(pos.x, pos.z, pos.h);
        return Phaser.Math.Distance.Between(screen.x, screen.y, this.racket.x, this.racket.y) < RACKET_RADIUS;
    }

    // ---- Shots -------------------------------------------------------------

    #shotPosition(shot, t) {
        return {
            x: Phaser.Math.Linear(shot.from.x, shot.to.x, t),
            z: Phaser.Math.Linear(shot.from.z, shot.to.z, t),
            h: Phaser.Math.Linear(shot.from.h, 0, t) + shot.arc * 4 * t * (1 - t),
        };
    }

    /** Starts a flight. Works out in advance whether it clips the net and whether it lands out. */
    #launch(by, type, from, to, durationScale = 1) {
        const spec = SHOTS[type];
        const shot = {
            by, type, from, to, t: 0, arc: spec.arc,
            duration: spec.duration * durationScale * this.rallySpeed,
            out: Math.abs(to.x) > 1 || to.z < 0 || to.z > 1,
            netT: null,
            aiHitT: null,
        };
        const tNet = (NET_Z - from.z) / (to.z - from.z);
        if (tNet > 0 && tNet < 1 && this.#shotPosition(shot, tNet).h < NET_H) shot.netT = tNet;
        this.shot = shot;
        this.state = 'rally';
        this.rallySpeed = Math.max(0.6, this.rallySpeed * 0.97);
        if (by === 'player') this.#planOpponent(shot);
        else this.opponentTargetX = Phaser.Math.Clamp(-to.x * 0.3, -0.5, 0.5); // recover toward the middle
    }

    #playerServe() {
        const from = this.#serveSpot();
        this.#launch('player', 'clear', from, { x: Phaser.Math.FloatBetween(-0.6, 0.6), z: Phaser.Math.FloatBetween(0.8, 0.95) });
    }

    #placeServeShuttle() {
        this.#drawShuttle(this.#serveSpot());
    }

    /** Where the shuttle hangs before Minjun serves: just above the racket. */
    #serveSpot() {
        const s = 1 / (1 + 0.12 * DEPTH);
        const x = Phaser.Math.Clamp((this.racket.x - this.cx) / (HALF_WIDTH * s), -0.9, 0.9);
        return { x, z: 0.12, h: 0.55 };
    }

    #playerHit(pos) {
        const { vx, vy } = this.#racketVelocity();
        const type = vy < -700 ? 'smash' : vy > 350 ? 'drop' : 'clear';
        const screen = this.project(pos.x, pos.z, pos.h);
        const offset = (screen.x - this.racket.x) / RACKET_RADIUS; // where on the racket face it landed
        const aimX = pos.x * 0.3 + vx / 1500 + offset * 0.35 + Phaser.Math.FloatBetween(-0.1, 0.1);
        const depth = { clear: [0.84, 0.98], drop: [0.56, 0.68], smash: [0.62, 0.86] }[type];
        this.#launch('player', type, pos, { x: aimX, z: Phaser.Math.FloatBetween(...depth) });
        this.#call(SHOTS[type].label, COLORS.accent);
        this.tweens.add({ targets: this.racket, angle: { from: -25, to: 0 }, duration: 160 });
    }

    /** Decides when (and whether) the opponent will reach Minjun's shot. */
    #planOpponent(shot) {
        const land = shot.to;
        const reactDelay = (0.4 - 0.3 * this.skill) * (this.rigged ? 0 : 1);
        this.time.delayedCall(reactDelay * 1000, () => {
            this.opponentTargetX = Phaser.Math.Clamp(land.x, -1.05, 1.05);
        });
        if (shot.netT !== null) return;
        if (shot.out && !this.rigged && Math.random() < 0.9) return; // lets it fly out

        // Opponent meets the shuttle near the end of its flight if it can get there in time.
        const hitT = 0.82;
        const contact = this.#shotPosition(shot, hitT);
        const timeAvailable = shot.duration * hitT - reactDelay;
        const speed = this.faster(0.7 + 1.3 * this.skill, 0.2);
        const reach = 0.22 + 0.25 * this.skill;
        const canReach = Math.abs(contact.x - this.opponentX) - reach <= speed * timeAvailable;
        const smashSaved = shot.type !== 'smash' || Math.random() < 0.3 + 0.6 * this.skill;
        if (this.rigged || (canReach && smashSaved)) shot.aiHitT = hitT;
    }

    #opponentHit(pos) {
        const roll = Math.random();
        const type = pos.h > 0.5 && roll < 0.3 ? 'smash' : roll < 0.55 ? 'drop' : 'clear';
        // Aim away from Minjun's racket. Weaker opponents aim worse and sometimes hit out.
        const s = 1 / (1 + 0.2 * DEPTH);
        const playerX = Phaser.Math.Clamp((this.racket.x - this.cx) / (HALF_WIDTH * s), -1, 1);
        let x = Math.random() < 0.4 + 0.5 * this.skill
            ? -Math.sign(playerX || 1) * Phaser.Math.FloatBetween(0.45, 0.92)
            : Phaser.Math.FloatBetween(-0.8, 0.8);
        if (!this.rigged && Math.random() < (1 - this.skill) * 0.12) x = Math.sign(x || 1) * 1.15;
        const depth = { clear: [0.03, 0.14], drop: [0.3, 0.42], smash: [0.08, 0.3] }[type];
        const quicker = this.shorter(1, 0.3) * (this.rigged ? 0.9 : 1);
        this.#launch('opponent', type, pos, { x, z: Phaser.Math.FloatBetween(...depth) }, quicker);
    }

    // ---- Points, games, match ----------------------------------------------

    #endRally(winner, reason) {
        if (this.state === 'dead') return;
        this.state = 'dead';
        this.shot = null;
        this.points[winner] += 1;
        this.#renderScore();
        this.#call(`${reason} ${winner === 'player' ? '민준 득점' : `${this.opponentName} 득점`}`,
            winner === 'player' ? COLORS.good : COLORS.bad);
        this.cameras.main.flash(120, winner === 'player' ? 0 : 255, winner === 'player' ? 200 : 60, 80);

        const p = this.points.player;
        const o = this.points.opponent;
        const cap = this.winScore + 4;
        const gameOver = (Math.max(p, o) >= this.winScore && Math.abs(p - o) >= 2) || Math.max(p, o) >= cap;
        if (!gameOver) {
            this.time.delayedCall(1100, () => this.#nextRally(winner));
            return;
        }

        this.games[winner] += 1;
        if (this.games[winner] >= this.gamesToWin) {
            this.time.delayedCall(900, () => this.finish({
                success: winner === 'player',
                score: this.games.player,
                label: winner === 'player' ? `승리! ${this.games.player}-${this.games.opponent}` : `패배... ${this.games.player}-${this.games.opponent}`,
            }));
            return;
        }
        this.time.delayedCall(1300, () => {
            this.#call(`GAME ${this.gameNumber} → ${winner === 'player' ? '민준' : this.opponentName}`, COLORS.gold);
            this.gameNumber += 1;
            this.points = { player: 0, opponent: 0 };
            this.rallySpeed = 1;
            this.#renderScore();
            this.time.delayedCall(1500, () => this.#nextRally(winner === 'player' ? 'opponent' : 'player'));
        });
    }

    /** The rally winner serves next (the game loser serves first in a new game). */
    #nextRally(server) {
        this.rallySpeed = 1;
        this.shot = null;
        this.opponentTargetX = 0;
        if (server === 'player') {
            this.state = 'serve-player';
            this.#call('클릭해서 서브!', COLORS.accent);
            return;
        }
        this.state = 'idle';
        this.shuttle.setVisible(false);
        this.shadow.setVisible(false);
        this.time.delayedCall(800, () => {
            const from = { x: this.opponentX, z: 0.95, h: 0.6 };
            const to = { x: Phaser.Math.FloatBetween(-0.7, 0.7), z: Phaser.Math.FloatBetween(0.06, 0.25) };
            this.#launch('opponent', 'clear', from, to, this.shorter(1, 0.3));
        });
    }
}
