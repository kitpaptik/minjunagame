import { toRGB } from '../utils.js';

export function createCamera(scene) {
    const cam = scene.cameras.main;
    const api = {
        follow: (entity, { smoothness = 0 } = {}) => {
            cam.startFollow(entity.raw, true, 1 - smoothness, 1 - smoothness);
            return api;
        },
        stopFollowing: () => {
            cam.stopFollow();
            return api;
        },
        centerOn: (x, y) => {
            cam.centerOn(x, y);
            return api;
        },
        setBounds: (x, y, w, h) => {
            cam.setBounds(x, y, w, h);
            return api;
        },
        zoomTo: (scale, duration = 0) => {
            cam.zoomTo(scale, duration);
            return api;
        },
        shake: (intensity = 0.05, duration = 200) => {
            cam.shake(duration, intensity);
            return api;
        },
        flash: (color = '#ffffff', duration = 200) => {
            const { r, g, b } = toRGB(color);
            cam.flash(duration, r, g, b);
            return api;
        },
        panTo: (x, y, duration = 1000, onComplete = null) => {
            cam.pan(x, y, duration, 'Linear', false, (_cam, progress) => {
                if (progress === 1) onComplete?.();
            });
            return api;
        },
    };
    return api;
}
