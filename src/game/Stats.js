import GameState from '../engine/GameState.js';
import { STAT_KEYS, clampStat, deathCheck } from './statDefs.js';

/** Stat access for scenes: clamped changes, snapshots for saving, and death checks. */
export default class Stats {
    constructor(scene) {
        this.state = new GameState(scene);
    }

    get(key) {
        return this.state.get(key);
    }

    snapshot() {
        return Object.fromEntries(STAT_KEYS.map((k) => [k, this.state.get(k)]));
    }

    load(values) {
        this.state.reset(values);
    }

    /**
     * Applies relative changes ({ aura: -10 }) and absolute sets ({ gpa: 2.0 }).
     * Returns the list of actual changes as [{ key, delta, value }].
     */
    apply({ add = {}, set = {} } = {}) {
        const changes = [];
        for (const [key, amount] of Object.entries(add)) {
            const before = this.state.get(key) ?? 0;
            const after = clampStat(key, before + amount);
            this.state.set(key, after);
            if (after !== before) changes.push({ key, delta: after - before, value: after });
        }
        for (const [key, value] of Object.entries(set)) {
            const after = clampStat(key, value);
            this.state.set(key, after);
            changes.push({ key, delta: null, value: after });
        }
        return changes;
    }

    /** Ending id if the current stats kill Minjun, else null. */
    deathEnding() {
        return deathCheck(this.snapshot());
    }

    onChange(key, callback) {
        return this.state.onChange(key, callback);
    }
}
