import chapters from '../game/story/index.js';
import Stats from '../game/Stats.js';
import { STAT_DEFS, formatStat } from '../game/statDefs.js';
import SaveManager from '../engine/SaveManager.js';
import { toColor } from '../engine/utils.js';
import minigames from '../minigames/index.js';
import DialogueBox from '../ui/DialogueBox.js';
import StatsBar from '../ui/StatsBar.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

/** Returned by a step to end the current run (scene is switching away). */
const STOP = Symbol('stop');
const DEFAULT_PLACE = { name: '', bg: '#2b3a55' };

/**
 * Runs chapter scripts from /story (parsed into steps by src/engine/StoryScript.js).
 * Autosaves before every top-level step so "이어하기" resumes exactly there.
 */
export default class StoryScene extends Phaser.Scene {
    constructor() {
        super('Story');
    }

    init(data) {
        this.chapterId = data.chapterId;
        this.startNode = data.nodeId ?? null;
        this.startIndex = data.index ?? 0;
        this.place = data.place ?? DEFAULT_PLACE;
    }

    create() {
        const { width, height } = this.scale;
        this.stats = new Stats(this);
        this.chapter = chapters[this.chapterId];

        this.bg = this.add.rectangle(width / 2, height / 2, width, height, toColor(this.place.bg));
        this.placeText = this.add.text(40, 70, this.place.name, textStyle(20, { color: COLORS.muted }));
        this.add.text(width - 24, 70, 'ESC: 타이틀', textStyle(16, { color: COLORS.muted })).setOrigin(1, 0);
        new StatsBar(this);
        this.dialogue = new DialogueBox(this).setVisible(false);

        this.#bindInput();

        if (!this.chapter) {
            this.#showError(`챕터 "${this.chapterId}"가 story/chapters.txt에 없습니다.`);
            return;
        }
        this.#run(this.startNode ?? this.chapter.start, this.startIndex);
    }

    // ---- Input -------------------------------------------------------------

    #bindInput() {
        this.advanceResolver = null;
        const advance = () => this.#advance();
        const toTitle = () => this.scene.start('Title');
        this.input.on('pointerdown', advance);
        this.input.keyboard.on('keydown-SPACE', advance);
        this.input.keyboard.on('keydown-ENTER', advance);
        this.input.keyboard.on('keydown-ESC', toTitle);

        this.alive = true;
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.alive = false;
            this.advanceResolver = null;
            this.input.off('pointerdown', advance);
            this.input.keyboard.off('keydown-SPACE', advance);
            this.input.keyboard.off('keydown-ENTER', advance);
            this.input.keyboard.off('keydown-ESC', toTitle);
        });
    }

    #advance() {
        if (this.dialogue.isTyping) {
            this.dialogue.finishTyping();
            return;
        }
        const resolve = this.advanceResolver;
        this.advanceResolver = null;
        resolve?.();
    }

    #waitForAdvance() {
        return new Promise((resolve) => {
            this.advanceResolver = resolve;
        });
    }

    // ---- Script runner -----------------------------------------------------

    async #run(nodeId, index) {
        try {
            let steps = this.#node(nodeId);
            let i = index;
            while (this.alive) {
                if (i >= steps.length) {
                    throw new Error(`노드 "${nodeId}"가 goto/chapterEnd/ending 없이 끝났습니다.`);
                }
                this.#save(nodeId, i);
                const result = await this.#exec(steps[i]);
                i += 1;
                if (!this.alive || result === STOP) return;
                if (typeof result === 'string') {
                    nodeId = result;
                    steps = this.#node(nodeId);
                    i = 0;
                }
            }
        } catch (err) {
            console.error(err);
            if (this.alive) this.#showError(err.message);
        }
    }

    #node(nodeId) {
        const steps = this.chapter.nodes[nodeId];
        if (!steps) throw new Error(`${this.chapterId}에 노드 "${nodeId}"가 없습니다.`);
        return steps;
    }

    /** Runs a list of steps (used for choice replies). Returns the first jump/STOP it hits. */
    async #execAll(steps) {
        for (const step of steps) {
            const result = await this.#exec(step);
            if (!this.alive) return STOP;
            if (result) return result;
        }
        return undefined;
    }

    /** Executes one step. Returns a node id to jump to, STOP, or undefined to continue. */
    async #exec(step) {
        if (step.scene !== undefined) {
            this.#setPlace({ name: step.scene, bg: step.bg ?? this.place.bg });
            return undefined;
        }
        if (step.title !== undefined) return this.#titleCard(step.title, step.sub);
        if (step.text !== undefined) {
            this.dialogue.show(step.say ?? null, step.text);
            await this.#waitForAdvance();
            return undefined;
        }
        if (step.choice) return this.#choose(step.choice);
        if (step.cg) return this.#showCg(step.cg, step.caption);
        if (step.add || step.set) return this.#applyStats(step);
        if (step.upgrade) return this.#upgrade(step.upgrade);
        if (step.minigame) return this.#minigame(step);
        if (step.goto) return step.goto;
        if ('chapterEnd' in step) return this.#endChapter(step.chapterEnd);
        if (step.ending) return this.#ending(step.ending);
        throw new Error(`알 수 없는 스텝: ${JSON.stringify(step)}`);
    }

    // ---- Step handlers -----------------------------------------------------

    #setPlace(place) {
        this.place = place;
        this.placeText.setText(place.name);
        this.bg.setFillStyle(toColor(place.bg));
    }

    async #titleCard(title, sub) {
        const { width, height } = this.scale;
        this.dialogue.setVisible(false);
        const card = this.add.container(0, 0).setDepth(300).setAlpha(0);
        card.add([
            this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9),
            this.add.text(width / 2, height / 2 - 20, title, textStyle(64, { fontStyle: 'bold', color: COLORS.accent }))
                .setOrigin(0.5),
            this.add.text(width / 2, height / 2 + 50, sub ?? '', textStyle(26, { color: COLORS.muted })).setOrigin(0.5),
        ]);
        this.tweens.add({ targets: card, alpha: 1, duration: 400 });
        await this.#waitForAdvance();
        this.tweens.add({ targets: card, alpha: 0, duration: 300, onComplete: () => card.destroy() });
        return undefined;
    }

    #choose(options) {
        const { width } = this.scale;
        const spacing = 84;
        const top = 300 - ((options.length - 1) * spacing) / 2;
        this.dialogue.hint.setVisible(false);

        return new Promise((resolve) => {
            let picked = false;
            const pick = async (option) => {
                if (picked) return;
                picked = true;
                buttons.forEach((b) => b.destroy());
                this.input.keyboard.off('keydown', onKey);

                const add = { ...option.add };
                if (option.cost) add.hanwha = (add.hanwha ?? 0) - option.cost;
                const jump = Object.keys(add).length ? this.#applyStats({ add }) : undefined;
                if (jump === STOP || !this.alive) return resolve(STOP);
                const replyJump = option.reply ? await this.#execAll(option.reply) : undefined;
                resolve(replyJump ?? option.next);
            };

            const buttons = options.map((option, i) => {
                const lockReason = this.#lockReason(option);
                const cost = option.cost ? `  (${formatStat('hanwha', option.cost)})` : '';
                return new Button(this, width / 2, top + i * spacing, `${i + 1}. ${option.label}${cost}`, {
                    width: 620,
                    height: 66,
                    disabled: lockReason !== null,
                    onClick: () => pick(option),
                    onDisabledClick: (button) => lockReason && this.#toast(lockReason, button.y + 46),
                }).setDepth(150);
            });

            // Number keys 1-9 pick a choice.
            const onKey = (event) => {
                const n = Number(event.key);
                if (n >= 1 && n <= options.length) buttons[n - 1].press();
            };
            this.input.keyboard.on('keydown', onKey);
        });
    }

    /** Why a choice can't be picked (string, may be empty), or null if it can. */
    #lockReason(option) {
        if (option.disabled) return typeof option.disabled === 'string' ? option.disabled : '';
        for (const [key, min] of Object.entries(option.requires ?? {})) {
            if ((this.stats.get(key) ?? 0) < min) return `${STAT_DEFS[key].label} 부족 (필요: ${formatStat(key, min)})`;
        }
        if (option.cost && this.stats.get('hanwha') < option.cost) {
            return `한화 부족 (필요: ${formatStat('hanwha', option.cost)})`;
        }
        return null;
    }

    async #showCg(key, caption) {
        const { width, height } = this.scale;
        this.dialogue.setVisible(false);
        const layer = this.add.container(0, 0).setDepth(300).setAlpha(0);
        layer.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85));
        if (this.textures.exists(key)) {
            const img = this.add.image(width / 2, height / 2 - 20, key);
            img.setScale(Math.min((width - 160) / img.width, (height - 200) / img.height, 1));
            layer.add(img);
        } else {
            // Placeholder until the real picture is added to src/game/assets.js.
            layer.add([
                this.add.rectangle(width / 2, height / 2 - 20, 640, 400, 0x333344).setStrokeStyle(3, COLORS.panelBorder),
                this.add.text(width / 2, height / 2 - 20, `[이미지: ${key}]`, textStyle(26, { color: COLORS.muted })).setOrigin(0.5),
            ]);
        }
        if (caption) {
            layer.add(this.add.text(width / 2, height - 60, caption, textStyle(24)).setOrigin(0.5));
        }
        this.tweens.add({ targets: layer, alpha: 1, duration: 300 });
        await this.#waitForAdvance();
        layer.destroy(true);
        return undefined;
    }

    #toast(message, y) {
        const text = this.add.text(this.scale.width / 2, y, message, textStyle(20, { color: COLORS.bad }))
            .setOrigin(0.5).setDepth(160);
        this.tweens.add({ targets: text, alpha: 0, delay: 900, duration: 500, onComplete: () => text.destroy() });
    }

    #applyStats({ add, set }) {
        this.stats.apply({ add, set });
        const death = this.stats.deathEnding();
        return death ? this.#ending(death) : undefined;
    }

    #upgrade(points) {
        this.dialogue.setVisible(false);
        return new Promise((resolve) => {
            this.events.once('upgrade-done', () => resolve(undefined));
            this.scene.launch('StatUpgrade', { points });
        });
    }

    async #minigame(step) {
        const sceneKey = minigames[step.minigame];
        if (!sceneKey) throw new Error(`미니게임 "${step.minigame}"가 src/minigames/index.js에 없습니다.`);

        const result = await new Promise((resolve) => {
            this.events.once(Phaser.Scenes.Events.WAKE, (_sys, data) => resolve(data?.minigameResult ?? { success: false }));
            this.scene.launch(sceneKey, { config: step.config ?? {} });
            this.scene.sleep();
        });

        if (result.add) this.stats.apply({ add: result.add });
        const death = this.stats.deathEnding();
        if (death) return this.#ending(death);
        return (result.success ? step.win : step.lose) ?? undefined;
    }

    #endChapter(nextChapterId) {
        if (nextChapterId) {
            SaveManager.save({
                chapterId: nextChapterId,
                nodeId: null,
                index: 0,
                place: DEFAULT_PLACE,
                stats: this.stats.snapshot(),
                difficulty: this.registry.get('difficulty'),
            });
        }
        this.scene.start('ChapterEnd', { chapterId: this.chapterId, next: nextChapterId });
        return STOP;
    }

    #ending(endingId) {
        SaveManager.clear();
        this.scene.start('Ending', { endingId });
        return STOP;
    }

    #save(nodeId, index) {
        SaveManager.save({
            chapterId: this.chapterId,
            nodeId,
            index,
            place: this.place,
            stats: this.stats.snapshot(),
            difficulty: this.registry.get('difficulty'),
        });
    }

    #showError(message) {
        this.add.text(40, 120, `스토리 오류:\n${message}`, textStyle(20, {
            color: COLORS.bad,
            backgroundColor: '#000000cc',
            padding: { x: 12, y: 10 },
            wordWrap: { width: this.scale.width - 80, useAdvancedWrap: true },
        })).setDepth(1000);
    }
}
