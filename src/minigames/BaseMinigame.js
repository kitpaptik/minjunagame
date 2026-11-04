import { createApi } from '../engine/createApi.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, textStyle, card } from '../ui/theme.js';

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
        const { width, height } = this.view;
        this.add.rectangle(width / 2, height / 2, width, height, PALETTE.floating, this.gloom * 0.35).setDepth(900);
    }

    #gloomNote() {
        if (this.gloom < 0.2) return '';
        const percent = Math.round(this.gloom * GLOOM_STRENGTH * 100);
        return `Depression ${Math.round(this.gloom * 100)}%, 집중이 잘 안 된다 (난이도 +${percent}%)`;
    }

    /** How-to card over the minigame: title, rules, the Depression penalty if any, and a start button. */
    showIntro() {
        const { width, height } = this.view;
        const { title, howTo } = this.info;
        const cardWidth = 720;
        const intro = this.add.container(0, 0).setDepth(1000);
        const titleText = this.add.text(width / 2, 0, title, textStyle(26, { weight: 700, color: INK.strong })).setOrigin(0.5, 0);
        const body = this.add.text(width / 2, 0, howTo, textStyle(16, {
            align: 'center', lineSpacing: 8, wordWrap: { width: cardWidth - 80, useAdvancedWrap: true },
        })).setOrigin(0.5, 0);
        const gloom = this.add.text(width / 2, 0, this.#gloomNote(), textStyle(14, { weight: 500, color: INK.warn })).setOrigin(0.5, 0);
        const cardHeight = 32 + titleText.height + 16 + body.height + (gloom.text ? 16 + gloom.height : 0) + 32 + 44 + 28;
        const top = height / 2 - cardHeight / 2;
        titleText.setY(top + 32);
        body.setY(titleText.y + titleText.height + 16);
        gloom.setY(body.y + body.height + 16);
        const start = () => {
            if (!intro.active) return;
            intro.destroy(true);
            this.startGame();
        };
        const button = new Button(this, width / 2, top + cardHeight - 28 - 22, '시작  (SPACE)', { width: 240, variant: 'primary', onClick: start });
        intro.add([...card(this, width / 2, height / 2, cardWidth, cardHeight, { backdrop: true }), titleText, body, gloom, button]);
        this.input.keyboard.once('keydown-SPACE', start);
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

        const { width, height } = this.view;
        const label = result.label ?? (result.success ? '성공!' : '실패...');
        const text = this.add.text(width / 2, height / 2, label, textStyle(36, {
            weight: 700,
            color: result.success ? INK.good : INK.bad,
        })).setOrigin(0.5).setDepth(2001);
        this.add.container(0, 0, card(this, width / 2, height / 2, Math.max(420, text.width + 96), 120, { backdrop: true }))
            .setDepth(2000);

        this.time.delayedCall(1400, () => {
            this.scene.stop();
            this.scene.wake('Story', { minigameResult: result });
        });
    }
}
