import { SETTINGS } from '../config.js';
import { COLORS, textStyle } from './theme.js';

/** Bottom-of-screen dialogue window with a speaker name plate and typewriter text. */
export default class DialogueBox extends Phaser.GameObjects.Container {
    constructor(scene) {
        const { width, height } = scene.scale;
        const boxWidth = width - 80;
        const boxHeight = 190;
        super(scene, width / 2, height - boxHeight / 2 - 24);

        const bg = scene.add.rectangle(0, 0, boxWidth, boxHeight, COLORS.panel, 0.94).setStrokeStyle(3, COLORS.panelBorder);
        this.namePlate = scene.add.rectangle(-boxWidth / 2 + 110, -boxHeight / 2 - 4, 200, 44, COLORS.button)
            .setStrokeStyle(2, COLORS.panelBorder);
        this.nameText = scene.add.text(this.namePlate.x, this.namePlate.y, '', textStyle(22, { fontStyle: 'bold' }))
            .setOrigin(0.5);
        this.body = scene.add.text(-boxWidth / 2 + 32, -boxHeight / 2 + 36, '', textStyle(26, {
            lineSpacing: 10,
            wordWrap: { width: boxWidth - 64, useAdvancedWrap: true },
        }));
        this.hint = scene.add.text(boxWidth / 2 - 24, boxHeight / 2 - 16, '▼', textStyle(20, { color: COLORS.accent }))
            .setOrigin(1, 1);
        scene.tweens.add({ targets: this.hint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

        this.add([bg, this.namePlate, this.nameText, this.body, this.hint]);
        this.setDepth(100);
        scene.add.existing(this);

        this.fullText = '';
        this.typingEvent = null;
    }

    get isTyping() {
        return this.typingEvent !== null;
    }

    /** Shows a line. speaker = null for narration. */
    show(speaker, text) {
        this.setVisible(true);
        const narration = !speaker;
        this.namePlate.setVisible(!narration);
        this.nameText.setVisible(!narration).setText(speaker ?? '');
        this.body.setColor(narration ? '#d0d0e8' : COLORS.text).setFontStyle(narration ? 'italic' : 'normal');
        this.hint.setVisible(false);

        this.fullText = text;
        let shown = 0;
        this.body.setText('');
        this.typingEvent?.remove();
        this.typingEvent = this.scene.time.addEvent({
            delay: SETTINGS.textSpeed,
            repeat: text.length - 1,
            callback: () => {
                shown += 1;
                this.body.setText(text.slice(0, shown));
                if (shown >= text.length) this.finishTyping();
            },
        });
    }

    finishTyping() {
        this.typingEvent?.remove();
        this.typingEvent = null;
        this.body.setText(this.fullText);
        this.hint.setVisible(true);
    }
}
