import BaseMinigame from './BaseMinigame.js';
import { COLORS, textStyle } from '../ui/theme.js';

const LANES = [440, 640, 840];
const PLAYER_Y = 600;

/**
 * 1.3 Graduation - Subway Surfers style 3-lane runner.
 * Survive until the timer ends... then stones fill all three lanes (spec: 결국엔 교통사고 엔딩).
 * Either way the result is a crash; `success` says whether Minjun made it to the final wave.
 *
 * config: { duration = 25000 (ms) }
 */
export default class RunnerMinigame extends BaseMinigame {
    constructor() {
        super('RunnerMinigame');
    }

    get info() {
        return {
            title: '졸업식 가는 길',
            howTo: '←/→ 또는 A/D로 차선을 바꿔 장애물을 피해라.\n끝까지 버티면 졸업식에 도착할 수 있다...!',
        };
    }

    create() {
        const { width, height } = this.scale;
        this.duration = (this.config.duration ?? 25000) * this.byDifficulty({ easy: 0.8, normal: 1, hard: 1.2 });
        this.elapsed = 0;
        this.distance = 0;
        this.lane = 1;
        this.obstacles = [];
        this.playing = false;
        this.finalWave = false;

        this.add.rectangle(width / 2, height / 2, width, height, 0x2f6b3a); // grass
        this.add.rectangle(width / 2, height / 2, 640, height, 0x3a3a44);   // road
        this.dashes = [];
        for (const x of [540, 740]) {
            for (let y = -40; y < height + 80; y += 80) {
                this.dashes.push(this.add.rectangle(x, y, 8, 40, 0xffffff, 0.7));
            }
        }

        this.player = this.add.rectangle(LANES[this.lane], PLAYER_Y, 64, 100, 0x00e5ff).setStrokeStyle(3, 0xffffff);
        this.playerLabel = this.add.text(this.player.x, PLAYER_Y + 70, '민준', textStyle(18, { color: COLORS.accent }))
            .setOrigin(0.5);

        this.distanceText = this.add.text(40, 40, '', textStyle(28, { color: COLORS.gold }));
        this.progressBar = this.add.rectangle(40, 90, 0, 12, 0x00e5ff).setOrigin(0, 0.5);
        this.add.rectangle(40, 90, 300, 12).setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff);
        this.add.text(350, 90, '🎓', textStyle(22)).setOrigin(0, 0.5);

        super.create();
    }

    startGame() {
        const move = (dir) => this.#changeLane(dir);
        const handlers = {
            'keydown-LEFT': () => move(-1),
            'keydown-A': () => move(-1),
            'keydown-RIGHT': () => move(1),
            'keydown-D': () => move(1),
        };
        for (const [event, fn] of Object.entries(handlers)) this.input.keyboard.on(event, fn);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [event, fn] of Object.entries(handlers)) this.input.keyboard.off(event, fn);
        });

        this.playing = true;
        this.#scheduleSpawn();
    }

    update(_time, deltaMs) {
        if (!this.playing) return;
        const dt = Math.min(deltaMs, 50) / 1000;
        this.elapsed += deltaMs;
        const progress = Math.min(1, this.elapsed / this.duration);
        const speed = 420 + 480 * progress;

        this.distance += speed * dt / 40;
        this.distanceText.setText(`${Math.floor(this.distance)} m`);
        this.progressBar.width = 300 * progress;

        for (const dash of this.dashes) {
            dash.y += speed * dt;
            if (dash.y > this.scale.height + 40) dash.y -= 80 * Math.ceil((this.scale.height + 120) / 80);
        }

        const playerBounds = this.player.getBounds();
        for (const ob of this.obstacles) {
            ob.y += speed * dt;
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, ob.getBounds())) {
                this.#crash();
                return;
            }
        }
        this.obstacles = this.obstacles.filter((ob) => {
            if (ob.y < this.scale.height + 120) return true;
            ob.destroy();
            return false;
        });

        if (progress >= 1 && !this.finalWave) this.#spawnFinalWave();
    }

    #changeLane(dir) {
        if (!this.playing) return;
        const next = Phaser.Math.Clamp(this.lane + dir, 0, LANES.length - 1);
        if (next === this.lane) return;
        this.lane = next;
        this.tweens.add({ targets: [this.player, this.playerLabel], x: LANES[next], duration: 110 });
    }

    #scheduleSpawn() {
        const progress = Math.min(1, this.elapsed / this.duration);
        const delay = Phaser.Math.Linear(950, 480, progress);
        this.spawnTimer = this.time.delayedCall(delay, () => {
            if (!this.playing || this.finalWave) return;
            this.#spawnRow(progress > 0.4 && Math.random() < 0.45 ? 2 : 1);
            this.#scheduleSpawn();
        });
    }

    /** Spawns obstacles in `count` random lanes (never all three, so it is always dodgeable). */
    #spawnRow(count) {
        const lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, count);
        for (const lane of lanes) {
            const isCar = Math.random() < 0.5;
            const ob = isCar
                ? this.add.rectangle(LANES[lane], -90, 90, 150, 0xd63031).setStrokeStyle(3, 0xffeaa7)
                : this.add.rectangle(LANES[lane], -60, 110, 70, 0x7f8c8d).setStrokeStyle(3, 0x2d3436);
            this.obstacles.push(ob);
        }
    }

    #spawnFinalWave() {
        this.finalWave = true;
        this.spawnTimer?.remove();
        this.time.delayedCall(900, () => {
            for (const x of LANES) {
                this.obstacles.push(this.add.rectangle(x, -80, 150, 110, 0x636e72).setStrokeStyle(4, 0x2d3436));
            }
            const warn = this.add.text(this.scale.width / 2, 220, '!!!', textStyle(96, { fontStyle: 'bold', color: COLORS.bad }))
                .setOrigin(0.5);
            this.tweens.add({ targets: warn, alpha: 0, duration: 250, yoyo: true, repeat: 3 });
        });
    }

    #crash() {
        this.playing = false;
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(300, 255, 40, 40);
        this.finish({
            success: this.finalWave,
            score: Math.floor(this.distance),
            label: this.finalWave ? '쾅!!!' : '쾅!',
        });
    }
}
