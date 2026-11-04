import chapters, { chapterOrder } from '../game/story/index.js';
import Stats from '../game/Stats.js';
import { STAT_DEFS, DIFFICULTIES, formatStat } from '../game/statDefs.js';
import SaveManager from '../engine/SaveManager.js';
import minigames from '../minigames/index.js';
import { rollRandomEvent } from '../game/randomEvents.js';
import ChatFeed from '../ui/ChatFeed.js';
import Sidebar from '../ui/Sidebar.js';
import StatsPanel from '../ui/StatsPanel.js';
import { SHELL } from '../ui/shell.js';
import { PALETTE, INK, RADIUS, textStyle } from '../ui/theme.js';

/** Returned by a step to end the current run (scene is switching away). */
const STOP = Symbol('stop');
const DEFAULT_PLACE = { name: '', bg: '#2b3a55' };

/**
 * Runs chapter scripts from /story (parsed into steps by src/engine/StoryScript.js).
 * The story is shown as a chat channel: lines are messages, places are channels, chapters are servers.
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
        const { width, height } = this.view;
        this.stats = new Stats(this);
        this.chapter = chapters[this.chapterId];

        this.add.rectangle(0, 0, width, height, PALETTE.chat).setOrigin(0);
        this.feed = new ChatFeed(this);
        this.sidebar = new Sidebar(this, {
            chapters: chapterOrder.map((id) => chapters[id]).filter(Boolean),
            currentChapter: this.chapter ?? { id: this.chapterId, title: this.chapterId ?? '' },
            difficultyLabel: DIFFICULTIES[this.registry.get('difficulty')]?.label ?? '보통',
        });
        this.#buildChannelHeader();
        new StatsPanel(this);
        this.#setPlace(this.place);

        this.#bindInput();

        if (!this.chapter) {
            this.#showError(`챕터 "${this.chapterId}"가 story/chapters.txt에 없습니다.`);
            return;
        }
        this.#run(this.startNode ?? this.chapter.start, this.startIndex);
    }

    /** Top bar of the chat column: the current channel, and how to leave. */
    #buildChannelHeader() {
        const width = SHELL.chatRight - SHELL.chatLeft;
        this.add.rectangle(SHELL.chatLeft, 0, width, SHELL.headerHeight, PALETTE.chat).setOrigin(0).setDepth(30);
        this.add.rectangle(SHELL.chatLeft, SHELL.headerHeight - 1, width, 1, PALETTE.rail).setOrigin(0).setDepth(30);
        this.add.text(SHELL.chatLeft + 16, 24, '#', textStyle(22, { color: INK.faint })).setOrigin(0, 0.5).setDepth(31);
        this.channelText = this.add.text(SHELL.chatLeft + 38, 24, '', textStyle(16, { weight: 700, color: INK.strong }))
            .setOrigin(0, 0.5).setDepth(31);
        this.add.text(SHELL.chatRight - 16, 24, 'ESC 누르면 타이틀로', textStyle(13, { color: INK.muted }))
            .setOrigin(1, 0.5).setDepth(31);
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
        if (this.feed.isTyping) {
            this.feed.finishTyping();
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
                const surprise = await this.#maybeSurprise(steps[i]);
                if (!this.alive || surprise === STOP) return;
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

    /**
     * Before a story line, maybe interrupt with a random QTE / formative / summative (src/game/randomEvents.js).
     * Chapters opt out with "돌발 끔" in their script header.
     */
    async #maybeSurprise(step) {
        if (step.text === undefined || this.chapter.randomEvents === false) return undefined;
        this.linesInChapter = (this.linesInChapter ?? 0) + 1;
        this.linesSinceSurprise = (this.linesSinceSurprise ?? 0) + 1;
        const event = rollRandomEvent(this.linesSinceSurprise, this.linesInChapter);
        if (!event) return undefined;
        this.linesSinceSurprise = 0;
        const result = await this.#execAll(event);
        return result === STOP ? STOP : undefined; // a surprise never moves the story elsewhere
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
            this.feed.say(step.say ?? null, step.text);
            await this.#waitForAdvance();
            return undefined;
        }
        if (step.system !== undefined) {
            this.feed.system(step.system, step.tone);
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
        this.channelText.setText(this.sidebar.setPlace(place.name));
    }

    async #titleCard(title, sub) {
        this.feed.divider(title, sub);
        await this.#waitForAdvance();
        return undefined;
    }

    #choose(options) {
        return new Promise((resolve) => {
            let picked = false;
            const pick = async (option, index) => {
                if (picked) return;
                picked = true;
                buttons.forEach((b, i) => b.lock(i === index));
                this.input.keyboard.off('keydown', onKey);

                const add = { ...option.add };
                if (option.cost) add.hanwha = (add.hanwha ?? 0) - option.cost;
                const jump = Object.keys(add).length ? this.#applyStats({ add }) : undefined;
                if (jump === STOP || !this.alive) return resolve(STOP);
                const replyJump = option.reply ? await this.#execAll(option.reply) : undefined;
                resolve(replyJump ?? option.next);
            };

            const buttons = this.feed.choices(options.map((option, i) => {
                const lockReason = this.#lockReason(option);
                const cost = option.cost ? `  (${formatStat('hanwha', option.cost)})` : '';
                return {
                    label: `${i + 1}. ${option.label}${cost}`,
                    locked: lockReason !== null,
                    onClick: () => pick(option, i),
                    onDisabledClick: () => lockReason && this.feed.warn(lockReason),
                };
            }));

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

    /** Full-screen picture over a dark backdrop, like an image viewer, with the caption under it. */
    async #showCg(key, caption) {
        const { width, height } = this.view;
        const layer = this.add.container(0, 0).setDepth(300).setAlpha(0);
        layer.add(this.add.rectangle(width / 2, height / 2, width, height, PALETTE.floating, 0.88));
        if (this.textures.exists(key)) {
            const img = this.add.image(width / 2, height / 2 - 20, key);
            img.setScale(Math.min((width - 160) / img.width, (height - 200) / img.height, 1));
            layer.add(img);
        } else {
            // Placeholder until the real picture is added to src/game/assets.js.
            layer.add([
                this.add.graphics({ x: width / 2, y: height / 2 - 20 })
                    .fillStyle(PALETTE.chat).fillRoundedRect(-320, -200, 640, 400, RADIUS.card),
                this.add.text(width / 2, height / 2 - 20, `이미지 자리: ${key}`, textStyle(18, { color: INK.muted })).setOrigin(0.5),
            ]);
        }
        if (caption) {
            layer.add(this.add.text(width / 2, height - 70, caption, textStyle(18, { weight: 500, color: INK.strong })).setOrigin(0.5));
        }
        this.tweens.add({ targets: layer, alpha: 1, duration: 300 });
        await this.#waitForAdvance();
        layer.destroy(true);
        return undefined;
    }

    #applyStats({ add, set }) {
        this.stats.apply({ add, set });
        const death = this.stats.deathEnding();
        return death ? this.#ending(death) : undefined;
    }

    #upgrade(points) {
        this.feed.setHint('스탯 강화 중');
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
        // A branch is a scene name to jump to, or (in random events) a list of steps to run right here.
        const branch = result.success ? step.win : step.lose;
        if (Array.isArray(branch)) return this.#execAll(branch);
        return branch ?? undefined;
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
        this.add.text(SHELL.chatLeft + 16, SHELL.headerHeight + 16, `스토리 오류:\n${message}`, textStyle(16, {
            color: INK.bad,
            backgroundColor: INK.floating,
            padding: { x: 12, y: 10 },
            wordWrap: { width: SHELL.chatRight - SHELL.chatLeft - 32, useAdvancedWrap: true },
        })).setDepth(1000);
    }
}
