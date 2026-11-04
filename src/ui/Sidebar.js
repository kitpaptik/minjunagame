import { PALETTE, INK, RADIUS, role, textStyle } from './theme.js';
import { SHELL, channelName } from './shell.js';

/**
 * Left side of the chat shell: a rail of chapter icons, the chapter's channel list (one channel per place
 * visited, the current one highlighted) and Minjun's profile at the bottom.
 */
export default class Sidebar {
    constructor(scene, { chapters, currentChapter, difficultyLabel }) {
        this.scene = scene;
        const { height } = scene.view;
        this.channels = [];

        // Server rail: one round icon per chapter, the current one squared off in the brand colour.
        scene.add.rectangle(0, 0, SHELL.railWidth, height, PALETTE.rail).setOrigin(0).setDepth(40);
        chapters.forEach((chapter, i) => {
            const y = 36 + i * 56;
            const current = chapter.id === currentChapter.id;
            scene.add.graphics({ x: SHELL.railWidth / 2, y }).setDepth(41)
                .fillStyle(current ? PALETTE.brand : PALETTE.chat)
                .fillRoundedRect(-24, -24, 48, 48, current ? 16 : 24);
            const glyph = chapter.title.match(/\d+/)?.[0] ?? [...chapter.title][0];
            scene.add.text(SHELL.railWidth / 2, y, glyph, textStyle(16, { weight: 700, color: current ? INK.white : INK.text }))
                .setOrigin(0.5).setDepth(42);
            if (current) {
                scene.add.graphics().setDepth(42).fillStyle(PALETTE.white).fillRoundedRect(-4, y - 20, 8, 40, 4);
            }
        });

        // Channel list
        const left = SHELL.railWidth;
        scene.add.rectangle(left, 0, SHELL.sidebarWidth, height, PALETTE.sidebar).setOrigin(0).setDepth(40);
        const title = scene.add.text(left + 16, 24, currentChapter.title, textStyle(16, { weight: 700, color: INK.strong }))
            .setOrigin(0, 0.5).setDepth(41);
        if (currentChapter.subtitle) {
            scene.add.text(left + 16 + title.width + 8, 24, currentChapter.subtitle, textStyle(14, { color: INK.muted }))
                .setOrigin(0, 0.5).setDepth(41);
        }
        scene.add.rectangle(left, SHELL.headerHeight - 1, SHELL.sidebarWidth, 1, PALETTE.rail).setOrigin(0).setDepth(41);
        scene.add.text(left + 16, SHELL.headerHeight + 18, '장소', textStyle(13, { weight: 500, color: INK.muted })).setDepth(41);

        // Profile
        const panelY = height - 52;
        scene.add.rectangle(left, panelY, SHELL.sidebarWidth, 52, PALETTE.panel).setOrigin(0).setDepth(40);
        scene.add.circle(left + 24, panelY + 26, 16, role('민준').fill).setDepth(41);
        scene.add.text(left + 24, panelY + 26, '민', textStyle(13, { weight: 700, color: INK.white })).setOrigin(0.5).setDepth(42);
        scene.add.text(left + 48, panelY + 17, '민준', textStyle(14, { weight: 500, color: INK.strong })).setOrigin(0, 0.5).setDepth(41);
        scene.add.text(left + 48, panelY + 35, `난이도 ${difficultyLabel}`, textStyle(12, { color: INK.muted })).setOrigin(0, 0.5).setDepth(41);
    }

    /** Highlights the place's channel, adding it to the list the first time it is visited. */
    setPlace(place) {
        if (!place) return '';
        const name = channelName(place);
        let channel = this.channels.find((c) => c.name === name);
        if (!channel) {
            const y = SHELL.headerHeight + 52 + this.channels.length * 36;
            const x = SHELL.railWidth + 8;
            const width = SHELL.sidebarWidth - 16;
            const bg = this.scene.add.graphics({ x, y }).setDepth(41);
            const hash = this.scene.add.text(x + 10, y + 16, '#', textStyle(18, { color: INK.faint })).setOrigin(0, 0.5).setDepth(42);
            const label = this.scene.add.text(x + 30, y + 16, name, textStyle(15, { weight: 500, color: INK.muted }))
                .setOrigin(0, 0.5).setDepth(42);
            // Long place names end in an ellipsis instead of running under the stats panel.
            while (label.width > width - 40 && label.text.length > 1) label.setText(`${label.text.slice(0, -2)}…`);
            channel = { name, bg, hash, label, width };
            this.channels.push(channel);
        }
        for (const c of this.channels) {
            const current = c === channel;
            c.bg.clear();
            if (current) c.bg.fillStyle(PALETTE.raised).fillRoundedRect(0, 0, c.width, 32, RADIUS.button);
            c.label.setColor(current ? INK.white : INK.muted);
        }
        return name;
    }
}
