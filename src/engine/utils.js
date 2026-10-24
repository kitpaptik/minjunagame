/** Converts '#ff8800', 'ff8800' or 0xff8800 into a Phaser color integer. */
export function toColor(value) {
    if (typeof value === 'number') return value;
    const parsed = parseInt(String(value).replace('#', ''), 16);
    if (Number.isNaN(parsed)) {
        console.warn(`[QuickEngine] Invalid color "${value}", using white.`);
        return 0xffffff;
    }
    return parsed;
}

/** Splits a color into { r, g, b } channels (0-255). */
export function toRGB(value) {
    const c = toColor(value);
    return { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
}

export function asArray(value) {
    return Array.isArray(value) ? value : [value];
}

/** Returns { x, y } from either a number (same on both axes) or an { x, y } object. */
export function toXY(value, fallback = 0) {
    if (typeof value === 'number') return { x: value, y: value };
    return { x: value?.x ?? fallback, y: value?.y ?? fallback };
}

/**
 * Collects cleanup functions for one scene run and calls them all on SHUTDOWN.
 * Scene event emitters survive scene restarts, so any listener added to
 * scene.events must be removed here or it will fire twice after a restart.
 */
export function createLifetime(scene) {
    const disposers = [];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        disposers.splice(0).forEach((dispose) => dispose());
    });
    return {
        add(dispose) {
            disposers.push(dispose);
        },
        onUpdate(fn) {
            scene.events.on(Phaser.Scenes.Events.UPDATE, fn);
            disposers.push(() => scene.events.off(Phaser.Scenes.Events.UPDATE, fn));
        },
    };
}
