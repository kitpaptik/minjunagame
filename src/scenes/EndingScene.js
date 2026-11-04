import endings from '../game/endings.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, textStyle, card } from '../ui/theme.js';

const CARD_WIDTH = 560;

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('Ending');
    }

    init(data) {
        this.ending = endings[data.endingId] ?? { title: `엔딩: ${data.endingId}`, text: '', color: INK.strong };
    }

    create() {
        const { width, height } = this.view;
        this.cameras.main.fadeIn(800);
        this.add.rectangle(0, 0, width, height, PALETTE.rail).setOrigin(0);

        const body = this.add.text(width / 2, 0, this.ending.text, textStyle(16, {
            align: 'center', lineSpacing: 8, wordWrap: { width: CARD_WIDTH - 80, useAdvancedWrap: true },
        })).setOrigin(0.5, 0).setDepth(1);
        const cardHeight = 32 + 40 + 20 + body.height + 32 + 44 + 32;
        const top = height / 2 - cardHeight / 2;
        card(this, width / 2, height / 2, CARD_WIDTH, cardHeight);
        this.add.text(width / 2, top + 32, this.ending.title, textStyle(28, { weight: 700, color: this.ending.color }))
            .setOrigin(0.5, 0);
        body.setY(top + 92);
        new Button(this, width / 2, top + cardHeight - 32 - 22, '타이틀로', {
            width: 240,
            variant: 'primary',
            onClick: () => this.scene.start('Title'),
        });
    }
}
