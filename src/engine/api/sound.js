const warned = new Set();

function hasAudio(scene, key) {
    if (scene.cache.audio.exists(key)) return true;
    if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[QuickEngine] Sound "${key}" not loaded. Add it to src/game/assets.js.`);
    }
    return false;
}

export function createSound(scene) {
    function playOnce(key, config) {
        const sfx = scene.sound.add(key, config);
        sfx.once(Phaser.Sound.Events.COMPLETE, () => sfx.destroy());
        sfx.play();
    }

    return {
        /** Starts looping background music (only one copy per key). */
        bgm: (key, { volume = 0.5, loop = true } = {}) => {
            if (!hasAudio(scene, key)) return null;
            const existing = scene.sound.get(key);
            if (existing) return existing;
            const music = scene.sound.add(key, { volume, loop });
            music.play();
            return music;
        },

        /**
         * Returns a reusable sound effect.
         * trigger({ volume, speed, pan: -1..1, echo: { delay: seconds, feedback: 0..1 } })
         */
        load: (key) => ({
            trigger: ({ volume = 1, speed = 1, pan = 0, echo = null } = {}) => {
                if (!hasAudio(scene, key)) return;
                playOnce(key, { volume, rate: speed, pan });
                if (!echo) return;
                // Echo = a few quieter, delayed repeats.
                const delayMs = (echo.delay ?? 0.3) * 1000;
                const feedback = echo.feedback ?? 0.4;
                for (let i = 1, v = volume * feedback; i <= 3 && v > 0.02; i++, v *= feedback) {
                    const repeatVolume = v;
                    scene.time.delayedCall(delayMs * i, () => playOnce(key, { volume: repeatVolume, rate: speed, pan }));
                }
            },
        }),

        stopAll: () => scene.sound.stopAll(),
    };
}
