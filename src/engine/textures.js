import { toColor } from './utils.js';

export const MISSING_TEXTURE = '__missing';

function paint(scene, key, width, height, drawFn) {
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ add: false }, false);
    drawFn(g);
    g.generateTexture(key, width, height);
    g.destroy();
    return key;
}

export function makeRect(scene, key, width, height, color = '#ffffff') {
    return paint(scene, key, width, height, (g) => {
        g.fillStyle(toColor(color), 1);
        g.fillRect(0, 0, width, height);
    });
}

export function makeCircle(scene, key, radius, color = '#ffffff') {
    return paint(scene, key, radius * 2, radius * 2, (g) => {
        g.fillStyle(toColor(color), 1);
        g.fillCircle(radius, radius, radius);
    });
}

/** Magenta/black checkerboard shown wherever an image failed to load or was never defined. */
export function makeMissingTexture(scene, key = MISSING_TEXTURE, width = 32, height = 32) {
    const cell = 8;
    return paint(scene, key, width, height, (g) => {
        for (let y = 0; y < height; y += cell) {
            for (let x = 0; x < width; x += cell) {
                g.fillStyle((x + y) / cell % 2 === 0 ? 0xff00ff : 0x000000, 1);
                g.fillRect(x, y, cell, cell);
            }
        }
    });
}

/** Returns `key` if the texture exists, otherwise warns once and returns the missing-texture key. */
const warned = new Set();
export function resolveTexture(scene, key) {
    if (scene.textures.exists(key)) return key;
    if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[QuickEngine] Texture "${key}" not found. Add it to src/game/assets.js.`);
    }
    return MISSING_TEXTURE;
}
