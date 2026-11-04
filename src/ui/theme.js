/* Hallmark · redesign: full · scope: app (canvas game) · brand: Discord look, no marks (spec 2026-11-04)
 * signature: the story as a chat channel - lines pile up as messages, places are channels, chapters are servers
 * critique: every colour below is from .hallmark/brand-spec.md; nothing outside this file names a colour or a face */
import { SETTINGS, RENDER_SCALE } from '../config.js';

/** Surface ramp and signals, as Phaser numbers (fills). */
export const PALETTE = {
    rail: 0x1e1f22,        // server rail, deepest
    sidebar: 0x2b2d31,     // channel list, stats panel, modal footers
    chat: 0x313338,        // chat area, cards
    panel: 0x232428,       // user panel, inputs on sidebar
    floating: 0x111214,    // backdrops
    raised: 0x41434a,      // hover and the selected channel
    input: 0x383a40,       // message input
    secondary: 0x4e5058,   // secondary button
    brand: 0x5865f2,       // primary action, current selection
    brandHover: 0x4752c4,
    secondaryHover: 0x6d6f78,
    goodHover: 0x248045,
    badHover: 0xda373c,
    good: 0x23a55a,
    bad: 0xf23f43,
    warn: 0xf0b232,
    white: 0xffffff,
};

/** The same tokens as CSS strings (text colours). */
export const INK = {
    strong: '#ebedef',     // headings, names
    text: '#dbdee1',       // body
    muted: '#949ba4',      // timestamps, labels, narration
    faint: '#80848e',
    brand: '#5865f2',
    good: '#23a55a',
    bad: '#f23f43',
    warn: '#f0b232',
    white: '#ffffff',
    floating: '#111214',
};

/**
 * Speaker colours, like chat roles: the name's ink and the avatar's fill.
 * Minjun is the brand colour; everyone else is hashed onto the rest, so a character keeps one colour all game.
 */
const ROLES = [
    { ink: INK.warn, fill: PALETTE.warn },
    { ink: INK.good, fill: PALETTE.good },
    { ink: INK.bad, fill: PALETTE.bad },
    { ink: INK.strong, fill: PALETTE.secondary },
];
export function role(name) {
    if (name === '민준') return { ink: INK.brand, fill: PALETTE.brand };
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return ROLES[hash % ROLES.length];
}

/** Older names kept so minigames read the new tokens without each one changing. */
export const COLORS = {
    panel: PALETTE.chat,
    panelBorder: PALETTE.raised,
    button: PALETTE.secondary,
    buttonHover: PALETTE.raised,
    buttonDisabled: PALETTE.secondary,
    accent: INK.brand,
    gold: INK.warn,
    good: INK.good,
    bad: INK.bad,
    text: INK.text,
    muted: INK.muted,
};

export const RADIUS = { button: 4, card: 8 };

/** Builds a Phaser text style with the game font. weight: 400 | 500 | 700. */
export function textStyle(size, overrides = {}) {
    const { weight, ...rest } = overrides;
    const fontStyle = rest.fontStyle ?? (weight ? String(weight) : undefined);
    return {
        fontFamily: SETTINGS.font,
        fontSize: `${size}px`,
        color: INK.text,
        resolution: RENDER_SCALE, // text textures match the canvas, so zoomed text stays sharp
        ...rest,
        ...(fontStyle && { fontStyle }),
    };
}

/** A filled rounded rectangle centred on (x, y). Returns the Graphics so it can be redrawn. */
export function roundedRect(scene, x, y, width, height, color, radius = RADIUS.card, alpha = 1) {
    const g = scene.add.graphics({ x, y });
    g.fillStyle(color, alpha).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    return g;
}

/**
 * A modal card: rounded chat-coloured panel, optionally over a backdrop that swallows clicks.
 * Returns the objects so callers can put them in a container.
 */
export function card(scene, x, y, width, height, { backdrop = false, backdropWidth } = {}) {
    const objects = [];
    if (backdrop) {
        const w = backdropWidth ?? scene.view.width;
        objects.push(scene.add.rectangle(0, 0, w, scene.view.height, PALETTE.floating, 0.8).setOrigin(0).setInteractive());
    }
    objects.push(roundedRect(scene, x, y, width, height, PALETTE.chat, RADIUS.card));
    return objects;
}
