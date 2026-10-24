/** Chainable wrapper around a HUD text object. */
export default class UiElement {
    constructor(textObject) {
        this.raw = textObject;
    }

    at(x, y) {
        this.raw.setPosition(x, y);
        return this;
    }

    style({ size = '16px', color = '#ffffff', bold = false, font = 'Arial' } = {}) {
        this.raw.setStyle({ fontFamily: font, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' });
        return this;
    }

    setText(text) {
        this.raw.setText(text);
        return this;
    }

    onClick(callback) {
        this.raw.setInteractive({ useHandCursor: true });
        this.raw.on('pointerdown', callback);
        return this;
    }

    hide() {
        this.raw.setVisible(false);
        return this;
    }

    show() {
        this.raw.setVisible(true);
        return this;
    }

    destroy() {
        this.raw.destroy();
    }
}
