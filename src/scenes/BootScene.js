import { makeMissingTexture } from '../engine/textures.js';

/** First scene: prepares engine-level resources that must exist before anything else loads. */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        makeMissingTexture(this);
        this.scene.start('Preload');
    }
}
