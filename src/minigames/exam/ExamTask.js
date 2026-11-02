import { COLORS, textStyle } from '../../ui/theme.js';

/** Play area below the exam header bar. */
export const AREA = { left: 60, right: 1220, top: 130, bottom: 700, cx: 640, cy: 415 };

/**
 * One exam question (a short skill test) inside ExamMinigame.
 *
 * Subclasses set static key/title/howTo, build themselves in start(), may use update(dt, now),
 * and call this.done(score 0..100, detail) exactly once. Everything created through
 * add()/after()/on() is cleaned up automatically when the task ends.
 */
export default class ExamTask {
    static key = '';
    static title = '';
    static howTo = '';

    constructor(scene, onDone) {
        this.scene = scene;
        this.onDone = onDone;
        this.objects = [];
        this.timers = [];
        this.offs = [];
        this.finished = false;
    }

    start() {}

    update(_dt, _now) {}

    // ---- Helpers for subclasses ------------------------------------------

    get now() {
        return this.scene.time.now;
    }

    add(obj) {
        this.objects.push(obj);
        return obj;
    }

    text(x, y, str, size = 26, style = {}) {
        return this.add(this.scene.add.text(x, y, str, textStyle(size, { align: 'center', ...style })).setOrigin(0.5));
    }

    after(ms, fn) {
        const timer = this.scene.time.delayedCall(ms, () => {
            if (!this.finished) fn();
        });
        this.timers.push(timer);
        return timer;
    }

    on(emitter, event, fn) {
        emitter.on(event, fn);
        this.offs.push(() => emitter.off(event, fn));
    }

    /** fn(key, event) with key lowercased: 'a', ' ', 'arrowleft', ... Held-key repeats are ignored. */
    onKey(fn) {
        this.on(this.scene.input.keyboard, 'keydown', (event) => {
            if (!event.repeat) fn(event.key.toLowerCase(), event);
        });
    }

    onPointer(event, fn) {
        this.on(this.scene.input, event, fn);
    }

    hud(text) {
        this.scene.setTaskHud(text);
    }

    /** Quick floating feedback text ("PERFECT", "+1", ...). */
    flash(x, y, str, color = COLORS.text, size = 26) {
        const t = this.scene.add.text(x, y, str, textStyle(size, { fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 4 }))
            .setOrigin(0.5).setDepth(50);
        this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    }

    done(score, detail = '') {
        if (this.finished) return;
        this.finished = true;
        this.timers.forEach((t) => t.remove(false));
        this.offs.forEach((off) => off());
        this.objects.forEach((o) => o.destroy());
        this.onDone({ score: Math.round(Phaser.Math.Clamp(score, 0, 100)), detail });
    }
}

/** Maps a measurement onto 0..100: `best` (or better) scores 100, `worst` (or worse) scores 0. */
export function scale(value, worst, best) {
    return Phaser.Math.Clamp(((value - worst) / (best - worst)) * 100, 0, 100);
}
