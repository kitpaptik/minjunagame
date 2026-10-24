import { SETTINGS } from '../config.js';

export const COLORS = {
    panel: 0x1e1e2e,
    panelBorder: 0x5a5a8a,
    button: 0x2d3561,
    buttonHover: 0x3f4a87,
    buttonDisabled: 0x2a2a2a,
    accent: '#00e5ff',
    gold: '#ffd166',
    good: '#7bed9f',
    bad: '#ff6b81',
    text: '#ffffff',
    muted: '#9a9ab0',
};

/** Builds a Phaser text style with the game font. */
export function textStyle(size, overrides = {}) {
    return { fontFamily: SETTINGS.font, fontSize: `${size}px`, color: COLORS.text, ...overrides };
}
