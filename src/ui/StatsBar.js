import Stats from '../game/Stats.js';
import { STAT_DEFS, STAT_KEYS, formatStat, isGoodChange } from '../game/statDefs.js';
import { COLORS, textStyle } from './theme.js';

/** Top HUD strip that live-updates Minjun's stats and pops "+10" style change indicators. */
export default class StatsBar extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        const { width } = scene.scale;
        this.stats = new Stats(scene);

        this.add(scene.add.rectangle(width / 2, 26, width, 52, 0x000000, 0.55));

        const slotWidth = width / STAT_KEYS.length;
        this.valueTexts = {};
        STAT_KEYS.forEach((key, i) => {
            const x = slotWidth * i + slotWidth / 2;
            const label = scene.add.text(x, 26, `${STAT_DEFS[key].label} `, textStyle(18, { color: COLORS.muted }))
                .setOrigin(1, 0.5);
            const value = scene.add.text(x, 26, '', textStyle(20, { fontStyle: 'bold' })).setOrigin(0, 0.5);
            this.valueTexts[key] = value;
            this.add([label, value]);

            this.#render(key, this.stats.get(key));
            const off = this.stats.onChange(key, (v, prev) => {
                this.#render(key, v);
                if (typeof prev === 'number' && typeof v === 'number' && v !== prev) this.#popup(key, v - prev);
            });
            this.once(Phaser.GameObjects.Events.DESTROY, off);
        });

        this.setDepth(200);
        scene.add.existing(this);
    }

    #render(key, value) {
        const text = this.valueTexts[key];
        text.setText(formatStat(key, value));
        // Warn when 거북목 gets close to the 100 death line.
        if (key === 'turtleNeck') text.setColor(value >= 80 ? COLORS.bad : COLORS.text);
    }

    #popup(key, delta) {
        const anchor = this.valueTexts[key];
        const sign = delta > 0 ? '+' : '';
        const amount = key === 'hanwha' ? Math.round(delta).toLocaleString('ko-KR') : Math.round(delta * 10) / 10;
        const popup = this.scene.add.text(anchor.x + 20, anchor.y + 22, `${sign}${amount}${STAT_DEFS[key].unit ?? ''}`, textStyle(22, {
            fontStyle: 'bold',
            color: isGoodChange(key, delta) ? COLORS.good : COLORS.bad,
            stroke: '#000000',
            strokeThickness: 4,
        })).setOrigin(0.5).setDepth(250);
        this.scene.tweens.add({
            targets: popup,
            y: popup.y + 30,
            alpha: 0,
            delay: 600,
            duration: 900,
            onComplete: () => popup.destroy(),
        });
    }
}
