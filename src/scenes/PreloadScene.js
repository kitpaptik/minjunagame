import { SETTINGS } from '../config.js';
import manifest from '../game/assets.js';
import { queueAssets, finalizeAssets } from '../engine/AssetLoader.js';

/** Loads every asset from src/game/assets.js and shows a progress bar. */
export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('Preload');
    }

    preload() {
        const { width, height } = this.scale;
        const barWidth = width * 0.5;
        const x = (width - barWidth) / 2;
        const y = height / 2;

        this.add.rectangle(width / 2, y, barWidth + 4, 24).setStrokeStyle(2, 0xffffff);
        const bar = this.add.rectangle(x, y, 1, 18, 0x00ffff).setOrigin(0, 0.5);
        this.add.text(width / 2, y - 40, 'Loading...', { fontFamily: SETTINGS.font, fontSize: '20px' }).setOrigin(0.5);
        this.load.on(Phaser.Loader.Events.PROGRESS, (p) => {
            bar.width = Math.max(1, barWidth * p);
        });

        this.failedAssets = queueAssets(this, manifest);
    }

    create() {
        finalizeAssets(this, manifest, this.failedAssets);
        this.scene.start('Title');
    }
}
