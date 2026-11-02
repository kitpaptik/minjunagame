import { createApi } from '../engine/createApi.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

/** How much harder minigames get at Depression 100% (0.4 = 40% less time / 40% faster). */
const GLOOM_STRENGTH = 0.4;

/**
 * Base class for every minigame scene.
 *
 * Lifecycle: StoryScene launches the minigame and sleeps -> showIntro() -> startGame()
 * -> finish({ success, score }) -> result banner -> StoryScene wakes with the result.
 *
 * Subclasses implement:
 *   get info()  -> { title, howTo }
 *   startGame() -> begins play after the intro screen
 *
 * `this.api` gives physics-style minigames the QuickEngine helpers (spawn, rules, input, ...).
 *
 * Depression makes every minigame harder: `this.gloom` is 0 (Depression 0%) .. 1 (100%),
 * and subclasses run their tuning numbers through shorter() / faster().
 */
export default class BaseMinigame extends Phaser.Scene {
    init(data) {
        this.config = data?.config ?? {};
        this.difficulty = this.registry.get('difficulty') ?? 'normal';
        this.gloom = Phaser.Math.Clamp((this.registry.get('depression') ?? 0) / 100, 0, 1);
        this.finished = false;
    }

    create() {
        this.api = createApi(this, this);
        this.#addGloomOverlay();
        this.showIntro();
    }

    get info() {
        return { title: this.scene.key, howTo: '' };
    }

    /** Picks a value by difficulty: this.byDifficulty({ easy: 1600, normal: 1200, hard: 900 }) */
    byDifficulty(values) {
        return values[this.difficulty] ?? values.normal;
    }

    /** Time limits and reaction windows shrink with Depression (up to -strength at 100%). */
    shorter(value, strength = GLOOM_STRENGTH) {
        return value * (1 - this.gloom * strength);
    }

    /** Speeds and opponent skill grow with Depression (up to +strength at 100%). */
    faster(value, strength = GLOOM_STRENGTH) {
        return value * (1 + this.gloom * strength);
    }

    /** Darkens the screen the more depressed Minjun is, so the extra difficulty is visible. */
    #addGloomOverlay() {
        if (this.gloom < 0.2) return;
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a14, this.gloom * 0.35).setDepth(900);
    }

    #gloomNote() {
        if (this.gloom < 0.2) return '';
        const percent = Math.round(this.gloom * GLOOM_STRENGTH * 100);
        return `\n\nDepression ${Math.round(this.gloom * 100)}% - 집중이 잘 안 된다... (난이도 +${percent}%)`;
    }

    showIntro() {
        const { width, height } = this.scale;
        const { title, howTo } = this.info;
        const intro = this.add.container(0, 0).setDepth(1000);
        intro.add([
            this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85),
            this.add.text(width / 2, height * 0.3, title, textStyle(56, { fontStyle: 'bold', color: COLORS.gold })).setOrigin(0.5),
            this.add.text(width / 2, height * 0.48, howTo + this.#gloomNote(), textStyle(26, { align: 'center', lineSpacing: 10 }))
                .setOrigin(0.5),
        ]);
        const start = () => {
            intro.destroy(true);
            this.startGame();
        };
        intro.add(new Button(this, width / 2, height * 0.72, '시작 (SPACE)', { onClick: start }));
        this.input.keyboard.once('keydown-SPACE', () => intro.active && start());
    }

    startGame() {
        throw new Error(`${this.scene.key} must implement startGame()`);
    }

    /** Called by createApi's game.over(). */
    endRun() {
        this.finish({ success: false });
    }

    /**
     * Ends the minigame, shows the result, then hands control back to the story.
     * result: { success, score?, label?, add? } - label overrides the default 성공!/실패... banner,
     * add ({ gpa: 0.2 }) is applied to the stats by the story once it wakes up.
     */
    finish(result) {
        if (this.finished) return;
        this.finished = true;
        this.time.removeAllEvents();

        const { width, height } = this.scale;
        const label = result.label ?? (result.success ? '성공!' : '실패...');
        this.add.rectangle(width / 2, height / 2, width, 200, 0x000000, 0.8).setDepth(2000);
        this.add.text(width / 2, height / 2, label, textStyle(72, {
            fontStyle: 'bold',
            color: result.success ? COLORS.good : COLORS.bad,
        })).setOrigin(0.5).setDepth(2001);

        this.time.delayedCall(1400, () => {
            this.scene.stop();
            this.scene.wake('Story', { minigameResult: result });
        });
    }
}
