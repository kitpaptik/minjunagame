/**
 * Single-slot save in localStorage (persists inside the Electron app too).
 * All access is wrapped so a blocked/corrupt storage never crashes the game.
 */
const SAVE_KEY = 'minjoon.save.v1';

export default {
    save(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
        } catch (err) {
            console.warn('[Save] Could not write save:', err);
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.warn('[Save] Could not read save:', err);
            return null;
        }
    },

    exists() {
        return this.load() !== null;
    },

    clear() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // Nothing to clear if storage is unavailable.
        }
    },
};
