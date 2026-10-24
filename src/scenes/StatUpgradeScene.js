import Stats from '../game/Stats.js';
import { UPGRADE_OPTIONS } from '../game/statDefs.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

/**
 * Overlay launched by StoryScene for `{ upgrade: N }` steps.
 * Each click spends one point immediately; emits 'upgrade-done' on the Story scene when finished.
 */
export default class StatUpgradeScene extends Phaser.Scene {
    constructor() {
        super('StatUpgrade');
    }

    init(data) {
        this.points = data.points ?? 1;
    }

    create() {
        const { width, height } = this.scale;
        const stats = new Stats(this);

        // Dim everything below the stats bar and its +/- popups so changes stay visible while spending points.
        const dimTop = 100;
        this.add.rectangle(width / 2, (dimTop + height) / 2, width, height - dimTop, 0x000000, 0.75).setInteractive();
        this.add.rectangle(width / 2, height / 2 + 20, 760, 520, COLORS.panel).setStrokeStyle(3, COLORS.panelBorder);
        this.add.text(width / 2, 150, '스탯 강화', textStyle(44, { fontStyle: 'bold', color: COLORS.accent })).setOrigin(0.5);
        const pointsText = this.add.text(width / 2, 205, '', textStyle(24, { color: COLORS.gold })).setOrigin(0.5);

        const buttons = UPGRADE_OPTIONS.map((opt, i) =>
            new Button(this, width / 2, 280 + i * 80, opt.text, {
                width: 480,
                onClick: () => {
                    if (this.points <= 0) return;
                    stats.apply({ add: { [opt.key]: opt.amount } });
                    this.points -= 1;
                    refresh();
                },
            }));

        const done = new Button(this, width / 2, 610, '완료', {
            width: 240,
            onClick: () => this.#finish(),
            disabled: true,
        });

        const refresh = () => {
            pointsText.setText(`남은 포인트: ${this.points}`);
            buttons.forEach((b) => b.setDisabled(this.points <= 0));
            done.setDisabled(this.points > 0);
        };
        refresh();
    }

    #finish() {
        this.scene.get('Story').events.emit('upgrade-done');
        this.scene.stop();
    }
}
