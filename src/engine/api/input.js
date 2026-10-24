import { asArray } from '../utils.js';

/** Key names are Phaser KeyCodes names: 'A', 'SPACE', 'LEFT', 'ENTER', 'SHIFT', ... */
export function createInput(scene, lifetime) {
    const keyboard = scene.input.keyboard;
    const keyCache = new Map();

    function getKey(name) {
        const upper = name.toUpperCase();
        if (keyCache.has(upper)) return keyCache.get(upper);
        const code = Phaser.Input.Keyboard.KeyCodes[upper];
        if (code === undefined) {
            console.warn(`[QuickEngine] Unknown key "${name}"`);
            keyCache.set(upper, null);
            return null;
        }
        const key = keyboard.addKey(code);
        keyCache.set(upper, key);
        return key;
    }

    const getKeys = (names) => asArray(names).map(getKey).filter(Boolean);

    return {
        /** True while any of the keys is held. Use inside game.onUpdate(). */
        isDown: (names) => getKeys(names).some((k) => k.isDown),

        /** Runs `action` every frame while any of the keys is held. */
        whileHeld: (names, action) => {
            const keys = getKeys(names);
            lifetime.onUpdate(() => {
                if (keys.some((k) => k.isDown)) action();
            });
        },

        /** Runs `action` once per key press. */
        onTap: (names, action) => {
            for (const key of getKeys(names)) {
                key.on('down', action);
                lifetime.add(() => key.off('down', action));
            }
        },

        /** Runs `action` when a key is released. 'ANY' matches every key. */
        onRelease: (names, action) => {
            for (const name of asArray(names)) {
                if (name.toUpperCase() === 'ANY') {
                    keyboard.on('keyup', action);
                    lifetime.add(() => keyboard.off('keyup', action));
                    continue;
                }
                const key = getKey(name);
                if (!key) continue;
                key.on('up', action);
                lifetime.add(() => key.off('up', action));
            }
        },

        /** Runs `action({ x, y, screenX, screenY })` on mouse click / touch. */
        onPointerDown: (action) => {
            const handler = (p) => action({ x: p.worldX, y: p.worldY, screenX: p.x, screenY: p.y });
            scene.input.on('pointerdown', handler);
            lifetime.add(() => scene.input.off('pointerdown', handler));
        },
    };
}
