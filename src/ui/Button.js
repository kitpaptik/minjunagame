import { PALETTE, INK, RADIUS, textStyle } from './theme.js';

const VARIANTS = {
    primary: { fill: PALETTE.brand, hover: PALETTE.brandHover, ink: INK.white },
    secondary: { fill: PALETTE.secondary, hover: PALETTE.secondaryHover, ink: INK.white },
    success: { fill: PALETTE.good, hover: PALETTE.goodHover, ink: INK.white },
    danger: { fill: PALETTE.bad, hover: PALETTE.badHover, ink: INK.white },
    ghost: { fill: PALETTE.chat, hover: PALETTE.raised, ink: INK.text, alpha: 0 },
};

/**
 * Chat-app style button: flat fill, small radius, darker on hover.
 * A disabled button still reacts to clicks with a shake, so "this button doesn't work" can be a joke.
 *
 * options: width, height, fontSize, variant ('primary' | 'secondary' | 'success' | 'danger' | 'ghost'),
 *          align ('center' | 'left'), onClick, onDisabledClick, disabled
 */
export default class Button extends Phaser.GameObjects.Container {
    constructor(scene, x, y, label, {
        width = 320,
        height = 44,
        fontSize = 16,
        variant = 'secondary',
        align = 'center',
        onClick = null,
        onDisabledClick = null,
        disabled = false,
    } = {}) {
        super(scene, x, y);
        this.w = width;
        this.h = height;
        this.style = VARIANTS[variant] ?? VARIANTS.secondary;
        this.onClick = onClick;
        this.onDisabledClick = onDisabledClick;
        this.hovered = false;

        this.bg = scene.add.graphics();
        const left = align === 'left';
        this.label = scene.add.text(left ? -width / 2 + 16 : 0, 0, label, textStyle(fontSize, { weight: 500, color: this.style.ink }))
            .setOrigin(left ? 0 : 0.5, 0.5);
        this.hit = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
        this.add([this.bg, this.label, this.hit]);
        this.setSize(width, height);

        this.hit.on('pointerover', () => this.#setHover(true));
        this.hit.on('pointerout', () => this.#setHover(false));
        this.hit.on('pointerdown', () => this.press());

        this.setDisabled(disabled);
        scene.add.existing(this);
    }

    #setHover(on) {
        this.hovered = on;
        this.#draw();
    }

    #draw() {
        const { fill, hover, alpha = 1 } = this.style;
        const active = this.hovered && !this.disabled;
        this.bg.clear()
            .fillStyle(active ? hover : fill, active ? 1 : alpha)
            .fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, RADIUS.button);
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
        this.setAlpha(disabled ? 0.5 : 1);
        this.hit.input.cursor = disabled ? 'not-allowed' : 'pointer';
        this.#draw();
        return this;
    }

    /** Freezes the button once a choice is made: the picked one takes the brand fill, the rest fade. */
    lock(selected) {
        this.hit.disableInteractive();
        this.hovered = false;
        if (selected) {
            this.style = VARIANTS.primary;
            this.label.setColor(this.style.ink);
        }
        this.setAlpha(selected ? 1 : 0.4);
        this.#draw();
        return this;
    }

    shake() {
        if (this.shaking) return;
        this.shaking = true;
        const startX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: startX + 8,
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
