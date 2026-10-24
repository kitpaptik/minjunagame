import Entity from '../Entity.js';
import { resolveTexture } from '../textures.js';
import { toColor } from '../utils.js';

export function createSpawn(scene) {
    return {
        /** Decoration with no physics (backgrounds, scenery). */
        image: (key) => new Entity(scene.add.image(0, 0, resolveTexture(scene, key))),

        /** Animated actor. Call .physics() to make it move/collide. */
        character: (key) => new Entity(scene.add.sprite(0, 0, resolveTexture(scene, key))),

        /** Generic world object. Call .physics() to make it move/collide. */
        object: (key) => new Entity(scene.add.sprite(0, 0, resolveTexture(scene, key))),

        /** Fills the whole view with a solid color, or stretches an image texture over it. */
        background: (keyOrColor) => {
            const { width, height } = scene.scale;
            const isTexture = typeof keyOrColor === 'string' && scene.textures.exists(keyOrColor);
            const obj = isTexture
                ? scene.add.image(width / 2, height / 2, keyOrColor).setDisplaySize(width, height)
                : scene.add.rectangle(width / 2, height / 2, width, height, toColor(keyOrColor));
            return new Entity(obj.setScrollFactor(0).setDepth(-1000));
        },
    };
}
