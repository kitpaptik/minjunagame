/**
 * Shared game values (stats, flags, ...) stored in Phaser's global registry,
 * so every scene reads the same data.
 */
export default class GameState {
    constructor(scene) {
        this.registry = scene.registry;
    }

    /** Overwrites the given keys. */
    reset(values) {
        for (const [key, value] of Object.entries(values)) {
            this.registry.set(key, value);
        }
    }

    get(key) {
        return this.registry.get(key);
    }

    set(key, value) {
        this.registry.set(key, value);
        return value;
    }

    add(key, amount) {
        return this.set(key, (this.get(key) ?? 0) + amount);
    }

    /** Calls callback(newValue, oldValue) whenever `key` changes. Returns an unsubscribe function. */
    onChange(key, callback) {
        const event = `changedata-${key}`;
        const handler = (_parent, value, previous) => callback(value, previous);
        this.registry.events.on(event, handler);
        return () => this.registry.events.off(event, handler);
    }
}
