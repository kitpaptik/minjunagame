import Stats from '../game/Stats.js';
import { STAT_DEFS, STAT_KEYS, formatStat, isGoodChange } from '../game/statDefs.js';
import { PALETTE, INK, textStyle } from './theme.js';
import { SHELL } from './shell.js';

const BAR_WIDTH = SHELL.panelWidth - 32;

/** Bar colour per stat: brand for the good-when-high ones, warning colours as the bad ones climb. */
function barColor(key, value) {
    if (key === 'turtleNeck') return value >= 80 ? PALETTE.bad : PALETTE.warn;
    if (key === 'depression') return value >= 60 ? PALETTE.bad : value >= 30 ? PALETTE.warn : PALETTE.good;
    if (key === 'gpa') return PALETTE.good;
    return PALETTE.brand;
}

/**
 * Right panel of the chat shell, where a member list would be: Minjun's stats, live.
 * Each change pops a "+10" beside the value in the good or bad colour.
 */
export default class StatsPanel {
    constructor(scene) {
        this.scene = scene;
        this.stats = new Stats(scene);
        const { height } = scene.view;
        const left = SHELL.chatRight;

        scene.add.rectangle(left, 0, SHELL.panelWidth, height, PALETTE.sidebar).setOrigin(0).setDepth(40);
        scene.add.text(left + 16, 24, '스탯', textStyle(16, { weight: 700, color: INK.strong })).setOrigin(0, 0.5).setDepth(41);
        scene.add.rectangle(left, SHELL.headerHeight - 1, SHELL.panelWidth, 1, PALETTE.rail).setOrigin(0).setDepth(41);

        this.rows = {};
        STAT_KEYS.forEach((key, i) => {
            const def = STAT_DEFS[key];
            const y = SHELL.headerHeight + 24 + i * 74;
            const label = scene.add.text(left + 16, y, def.label, textStyle(13, { weight: 500, color: INK.muted })).setDepth(41);
            const value = scene.add.text(left + 16, y + 20, '', textStyle(18, { weight: 700, color: INK.strong })).setDepth(41);
            const hasBar = Number.isFinite(def.max);
            let track = null;
            let fill = null;
            if (hasBar) {
                track = scene.add.graphics({ x: left + 16, y: y + 50 }).setDepth(41)
                    .fillStyle(PALETTE.rail).fillRoundedRect(0, 0, BAR_WIDTH, 6, 3);
                fill = scene.add.graphics({ x: left + 16, y: y + 50 }).setDepth(42);
            }
            this.rows[key] = { label, value, track, fill };

            this.#render(key, this.stats.get(key));
            const off = this.stats.onChange(key, (v, prev) => {
                this.#render(key, v);
                if (typeof prev === 'number' && typeof v === 'number' && v !== prev) this.#popup(key, v - prev);
            });
            scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
        });
    }

    #render(key, value) {
        const row = this.rows[key];
        row.value.setText(formatStat(key, value));
        if (key === 'turtleNeck') row.value.setColor(value >= 80 ? INK.bad : INK.strong);
        if (!row.fill) return;
        const def = STAT_DEFS[key];
        const share = value == null ? 0 : Phaser.Math.Clamp((value - def.min) / (def.max - def.min), 0, 1);
        row.fill.clear();
        if (share > 0) row.fill.fillStyle(barColor(key, value)).fillRoundedRect(0, 0, Math.max(6, BAR_WIDTH * share), 6, 3);
    }

    /** One badge per stat: a new change replaces the old badge instead of stacking on it. */
    #popup(key, delta) {
        const row = this.rows[key];
        row.popup?.destroy();
        const anchor = row.value;
        const sign = delta > 0 ? '+' : '';
        const amount = key === 'hanwha' ? Math.round(delta).toLocaleString('ko-KR') : Math.round(delta * 10) / 10;
        const good = isGoodChange(key, delta);
        const text = `${sign}${amount}${STAT_DEFS[key].unit ?? ''}`;
        const popup = this.scene.add.text(anchor.x + anchor.width + 10, anchor.y + 2, text, textStyle(15, {
            weight: 700,
            color: INK.white,
            backgroundColor: good ? INK.good : INK.bad,
            padding: { x: 6, y: 2 },
        })).setDepth(60);
        row.popup = popup;
        this.scene.tweens.add({ targets: popup, alpha: 0, delay: 1400, duration: 500, onComplete: () => popup.destroy() });
    }
}
