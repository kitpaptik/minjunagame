import { makeRect, makeCircle, makeMissingTexture } from './textures.js';

/**
 * Loads everything declared in an asset manifest (see src/game/assets.js).
 *
 * Supported entry types:
 *   { type: 'image',       key, url, fallback? }
 *   { type: 'spritesheet', key, url, frameWidth, frameHeight, fallback? }
 *   { type: 'audio',       key, url }
 *   { type: 'rect',        key, width, height, color }   // generated, no file needed
 *   { type: 'circle',      key, radius, color }          // generated, no file needed
 *
 * `fallback` is an optional { width, height } for the placeholder used if the file fails to load.
 */
const FILE_LOADERS = {
    image: (load, a) => load.image(a.key, a.url),
    spritesheet: (load, a) => load.spritesheet(a.key, a.url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight }),
    audio: (load, a) => load.audio(a.key, a.url),
};

const GENERATORS = {
    rect: (scene, a) => makeRect(scene, a.key, a.width, a.height, a.color),
    circle: (scene, a) => makeCircle(scene, a.key, a.radius, a.color),
};

/** Call from a scene's preload(). Queues every file-based asset. */
export function queueAssets(scene, manifest) {
    const failed = new Set();
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file) => {
        failed.add(file.key);
        console.warn(`[QuickEngine] Failed to load ${file.type} "${file.key}" from ${file.url}`);
    });

    for (const asset of manifest) {
        const loader = FILE_LOADERS[asset.type];
        if (loader) loader(scene.load, asset);
        else if (!GENERATORS[asset.type]) console.warn(`[QuickEngine] Unknown asset type "${asset.type}" for "${asset.key}"`);
    }
    return failed;
}

/** Call from create(). Generates shape textures and placeholders for images that failed. */
export function finalizeAssets(scene, manifest, failed) {
    for (const asset of manifest) {
        const generate = GENERATORS[asset.type];
        if (generate) {
            generate(scene, asset);
        } else if (failed.has(asset.key) && asset.type !== 'audio') {
            const { width = 32, height = 32 } = asset.fallback ?? {
                width: asset.frameWidth,
                height: asset.frameHeight,
            };
            makeMissingTexture(scene, asset.key, width, height);
        }
    }
}
