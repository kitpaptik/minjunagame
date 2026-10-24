import { createApi } from '../engine/createApi.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

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
 */
export default class BaseMinigame extends Phaser.Scene {
    init(data) {
        this.config = data?.config ?? {};
        this.difficulty = this.registry.get('difficulty') ?? 'normal';
        this.finished = false;
    }

    create() {
        this.api = createApi(this, this);
        this.showIntro();
    }

    get info() {
        return { title: this.scene.key, howTo: '' };
    }

    /** Picks a value by difficulty: this.byDifficulty({ easy: 1600, normal: 1200, hard: 900 }) */
    byDifficulty(values) {
        return values[this.difficulty] ?? values.normal;
    }

    showIntro() {
        const { width, height } = this.scale;
        const { title, howTo } = this.info;
        const intro = this.add.container(0, 0).setDepth(1000);
        intro.add([
            this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85),
            this.add.text(width / 2, height * 0.3, title, textStyle(56, { fontStyle: 'bold', color: COLORS.gold })).setOrigin(0.5),
            this.add.text(width / 2, height * 0.48, howTo, textStyle(26, { align: 'center', lineSpacing: 10 })).setOrigin(0.5),
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
     * result: { success, score?, label? } - label overrides the default 성공!/실패... banner.
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
