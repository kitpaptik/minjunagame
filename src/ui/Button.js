import { COLORS, textStyle } from './theme.js';

/**
 * Rectangle button with hover feedback.
 * A disabled button still reacts to clicks with a shake, so "this button doesn't work" can be a joke.
 */
export default class Button extends Phaser.GameObjects.Container {
    constructor(scene, x, y, label, {
        width = 420,
        height = 64,
        fontSize = 26,
        onClick = null,
        onDisabledClick = null,
        disabled = false,
    } = {}) {
        super(scene, x, y);
        this.disabled = disabled;
        this.onClick = onClick;
        this.onDisabledClick = onDisabledClick;

        this.bg = scene.add.rectangle(0, 0, width, height, disabled ? COLORS.buttonDisabled : COLORS.button)
            .setStrokeStyle(2, COLORS.panelBorder);
        this.label = scene.add.text(0, 0, label, textStyle(fontSize, { color: disabled ? COLORS.muted : COLORS.text }))
            .setOrigin(0.5);
        this.add([this.bg, this.label]);
        this.setSize(width, height);

        this.bg.setInteractive({ useHandCursor: !disabled });
        this.bg.on('pointerover', () => !this.disabled && this.bg.setFillStyle(COLORS.buttonHover));
        this.bg.on('pointerout', () => !this.disabled && this.bg.setFillStyle(COLORS.button));
        this.bg.on('pointerdown', () => this.press());

        scene.add.existing(this);
    }

    press() {
        if (this.disabled) {
            this.shake();
            this.onDisabledClick?.(this);
            return;
        }
        this.onClick?.();
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        this.bg.setFillStyle(disabled ? COLORS.buttonDisabled : COLORS.button);
        this.label.setColor(disabled ? COLORS.muted : COLORS.text);
        return this;
    }

    shake() {
        if (this.shaking) return;
        this.shaking = true;
        const startX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: startX + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.x = startX;
                this.shaking = false;
            },
        });
    }
}
