/**
 * Central game settings. Change values here instead of inside scenes.
 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/**
 * The canvas is drawn this many times larger than the 1280x720 layout, and every scene's camera zooms in to match.
 * Without it the browser stretches a 1280px canvas over a Retina or large screen and all text goes soft.
 * Scenes keep laying out in 1280x720 (use `this.view`, never `this.view`); pointers go through viewPoint().
 */
const screenPixels = (window.screen?.width ?? GAME_WIDTH) * (window.devicePixelRatio || 1);
export const RENDER_SCALE = Math.min(3, Math.max(1, Math.ceil((screenPixels / GAME_WIDTH) * 2) / 2));

/** A pointer's position in layout (1280x720) coordinates. */
export function viewPoint(pointer) {
    return { x: pointer.x / RENDER_SCALE, y: pointer.y / RENDER_SCALE };
}

export const SETTINGS = {
    title: 'MINJOON',
    subtitle: '민준이의 중학교 생존기',
    font: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    gravity: 600,
    debugPhysics: false,
    backgroundColor: '#1e1f22',
    /** Milliseconds per character for the dialogue typewriter effect. */
    textSpeed: 28,
};
