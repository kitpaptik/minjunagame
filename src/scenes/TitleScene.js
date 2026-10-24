import { SETTINGS } from '../config.js';
import SaveManager from '../engine/SaveManager.js';
import Stats from '../game/Stats.js';
import { DIFFICULTIES } from '../game/statDefs.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('Title');
    }

    create() {
        const { width, height } = this.scale;
        this.add.text(width / 2, height * 0.24, SETTINGS.title, textStyle(96, { fontStyle: 'bold', color: COLORS.accent }))
            .setOrigin(0.5);
        this.add.text(width / 2, height * 0.24 + 80, SETTINGS.subtitle, textStyle(28, { color: COLORS.muted }))
            .setOrigin(0.5);

        this.menu = this.add.container(0, 0);
        this.#showMainMenu();
    }

    #setButtons(specs) {
        this.menu.removeAll(true);
        const { width } = this.scale;
        specs.forEach((spec, i) => {
            const button = new Button(this, width / 2, 380 + i * 84, spec.label, spec);
            this.menu.add(button);
        });
    }

    #showMainMenu() {
        const save = SaveManager.load();
        const buttons = [
            { label: '새 게임', onClick: () => this.#showDifficulty() },
            { label: '이어하기', disabled: !save, onClick: () => this.#continue(save) },
        ];
        // Inside the desktop app (Electron) a quit button makes sense; in a browser tab it doesn't.
        if (window.desktop?.isApp) buttons.push({ label: '종료', onClick: () => window.close() });
        this.#setButtons(buttons);
    }

    #showDifficulty() {
        this.#setButtons([
            ...Object.entries(DIFFICULTIES).map(([key, d]) => ({
                label: `${d.label}  ·  ${d.description}`,
                width: 560,
                fontSize: 24,
                onClick: () => this.#newGame(key),
            })),
            { label: '← 뒤로', width: 560, fontSize: 22, onClick: () => this.#showMainMenu() },
        ]);
    }

    #newGame(difficulty) {
        SaveManager.clear();
        this.registry.set('difficulty', difficulty);
        new Stats(this).load(DIFFICULTIES[difficulty].stats);
        this.scene.start('Story', { chapterId: SETTINGS.firstChapter });
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
