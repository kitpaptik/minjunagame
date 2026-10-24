import endings from '../game/endings.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('Ending');
    }

    init(data) {
        this.ending = endings[data.endingId] ?? { title: `엔딩: ${data.endingId}`, text: '', color: COLORS.text };
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(800);
        this.add.text(width / 2, height * 0.3, this.ending.title, textStyle(64, { fontStyle: 'bold', color: this.ending.color }))
            .setOrigin(0.5);
        this.add.text(width / 2, height * 0.5, this.ending.text, textStyle(28, { align: 'center', lineSpacing: 12 }))
            .setOrigin(0.5);
        new Button(this, width / 2, height * 0.78, '타이틀로', { onClick: () => this.scene.start('Title') });
    }
}
