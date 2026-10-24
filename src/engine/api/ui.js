import UiElement from '../UiElement.js';

/**
 * HUD helpers. `uiScene` is the overlay scene, so HUD never scrolls or zooms with the game camera.
 */
export function createUi(uiScene, state, lifetime) {
    const addText = (text, style) => uiScene.add.text(0, 0, text, style).setDepth(1000);

    return {
        text: (message) => new UiElement(addText(message)),

        /** A self-contained number display: counter.add(10), counter.getValue() */
        counter: (label, start = 0) => {
            let value = start;
            const el = new UiElement(addText(`${label}${value}`));
            el.add = (n) => el.setValue(value + n);
            el.subtract = (n) => el.setValue(value - n);
            el.setValue = (n) => {
                value = n;
                return el.setText(`${label}${value}`);
            };
            el.getValue = () => value;
            return el;
        },

        /** Text that always shows a GameState value, e.g. ui.stat('Score: ', 'score') */
        stat: (label, key, format = (v) => v) => {
            const el = new UiElement(addText(`${label}${format(state.get(key))}`));
            lifetime.add(state.onChange(key, (v) => el.setText(`${label}${format(v)}`)));
            return el;
        },

        button: (label, onClick = null) => {
            const el = new UiElement(addText(label, { backgroundColor: '#222222', padding: { x: 10, y: 5 } }));
            if (onClick) el.onClick(onClick);
            return el;
        },
    };
}
