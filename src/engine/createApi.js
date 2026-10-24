import GameState from './GameState.js';
import { createLifetime } from './utils.js';
import { makeRect, makeCircle } from './textures.js';
import { createSpawn } from './api/spawn.js';
import { createInput } from './api/input.js';
import { createRules } from './api/rules.js';
import { createCamera } from './api/camera.js';
import { createSound } from './api/sound.js';
import { createUi } from './api/ui.js';

/**
 * Builds the beginner-friendly API object that level scripts receive:
 *   export default function level({ spawn, rules, input, ui, camera, sound, draw, state, game }) { ... }
 *
 * Everything is bound to one run of `gameScene`; listeners are cleaned up automatically on restart.
 */
export function createApi(gameScene, uiScene) {
    const lifetime = createLifetime(gameScene);
    const state = new GameState(gameScene);

    return {
        spawn: createSpawn(gameScene),
        input: createInput(gameScene, lifetime),
        rules: createRules(gameScene),
        camera: createCamera(gameScene),
        sound: createSound(gameScene),
        ui: createUi(uiScene, state, lifetime),

        draw: {
            rect: (key, width, height, color) => makeRect(gameScene, key, width, height, color),
            circle: (key, radius, color) => makeCircle(gameScene, key, radius, color),
        },

        state: {
            get: (key) => state.get(key),
            set: (key, value) => state.set(key, value),
            add: (key, amount) => state.add(key, amount),
            onChange: (key, callback) => lifetime.add(state.onChange(key, callback)),
        },

        game: {
            /** Runs fn(time, delta) every frame. */
            onUpdate: (fn) => lifetime.onUpdate(fn),
            /** Runs fn once after `ms` milliseconds. */
            after: (ms, fn) => gameScene.time.delayedCall(ms, fn),
            /** Runs fn every `ms` milliseconds. */
            every: (ms, fn) => gameScene.time.addEvent({ delay: ms, loop: true, callback: fn }),
            /** Resizes the playable world (physics bounds + camera bounds). */
            worldSize: (width, height) => {
                gameScene.physics.world.setBounds(0, 0, width, height);
                gameScene.cameras.main.setBounds(0, 0, width, height);
            },
            random: (min, max) => Phaser.Math.Between(min, max),
            pause: () => gameScene.physics.pause(),
            resume: () => gameScene.physics.resume(),
            restartLevel: () => gameScene.scene.restart(),
            over: () => gameScene.endRun(),
        },
    };
}
