import { SETTINGS } from '../config.js';
import SaveManager from '../engine/SaveManager.js';
import Stats from '../game/Stats.js';
import { DIFFICULTIES } from '../game/statDefs.js';
import { chapterOrder } from '../game/story/index.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, textStyle, card } from '../ui/theme.js';

const CARD_WIDTH = 480;
const BUTTON_WIDTH = CARD_WIDTH - 64;

/** Start screen: one card with the game name, then either the main menu or the difficulty list. */
export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('Title');
    }

    create() {
        const { width, height } = this.view;
        this.add.rectangle(0, 0, width, height, PALETTE.rail).setOrigin(0);
        this.menu = this.add.container(0, 0);
        this.#showMainMenu();
    }

    #showMainMenu() {
        const save = SaveManager.load();
        const specs = [
            { label: '새 게임', variant: 'primary', onClick: () => this.#showDifficulty() },
            { label: '이어하기', disabled: !save, onClick: () => this.#continue(save) },
        ];
        // Inside the desktop app (Electron) a quit button makes sense; in a browser tab it doesn't.
        if (window.desktop?.isApp) specs.push({ label: '종료', variant: 'ghost', onClick: () => window.close() });
        this.#fill(specs.map((spec) => ({ ...spec, height: 44 })), 56, save ? null : '저장된 게임이 없어요');
    }

    #showDifficulty() {
        const rows = Object.entries(DIFFICULTIES).map(([key, d]) => ({
            label: d.label,
            description: d.description,
            align: 'left',
            height: 52,
            onClick: () => this.#newGame(key),
        }));
        rows.push({ label: '뒤로', variant: 'ghost', height: 40, onClick: () => this.#showMainMenu() });
        this.#fill(rows, 60);
    }

    /** Draws the card sized to its content: the game name, then a column of buttons, then an optional note. */
    #fill(specs, step, note = null) {
        this.menu.removeAll(true);
        const { width, height } = this.view;
        const header = 112;
        const cardHeight = 40 + header + specs.length * step + (note ? 28 : 0) + 24;
        const top = height / 2 - cardHeight / 2;
        this.menu.add([
            ...card(this, width / 2, height / 2, CARD_WIDTH, cardHeight),
            this.add.text(width / 2, top + 40, SETTINGS.title, textStyle(32, { weight: 700, color: INK.strong })).setOrigin(0.5, 0),
            this.add.text(width / 2, top + 90, SETTINGS.subtitle, textStyle(15, { color: INK.muted })).setOrigin(0.5, 0),
        ]);
        if (note) {
            this.menu.add(this.add.text(width / 2, top + cardHeight - 40, note, textStyle(13, { color: INK.muted })).setOrigin(0.5));
        }
        specs.forEach((spec, i) => {
            const y = top + 40 + header + step / 2 + i * step;
            const button = new Button(this, width / 2, y, spec.label, { width: BUTTON_WIDTH, ...spec });
            this.menu.add(button);
            if (spec.description) {
                this.menu.add(this.add.text(width / 2 + BUTTON_WIDTH / 2 - 16, y, spec.description, textStyle(13, { color: INK.text }))
                    .setOrigin(1, 0.5));
            }
        });
    }

    #newGame(difficulty) {
        SaveManager.clear();
        this.registry.set('difficulty', difficulty);
        new Stats(this).load(DIFFICULTIES[difficulty].stats);
        this.scene.start('Story', { chapterId: chapterOrder[0] });
    }

    #continue(save) {
        this.registry.set('difficulty', save.difficulty ?? 'normal');
        new Stats(this).load(save.stats);
        this.scene.start('Story', {
            chapterId: save.chapterId,
            nodeId: save.nodeId,
            index: save.index,
            place: save.place,
        });
    }
}
